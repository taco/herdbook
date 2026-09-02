import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    vi,
} from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor,
    type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';

import { prisma } from '@/db';
import { initTelemetry, shutdownTelemetry } from '@/telemetry';
import { HERDBOOK_ATTR } from '@/utils/tracing';
import { VOICE_PARSE_PROMPTS } from '@/prompts';
import { buildMultipartPayload } from '@/test/multipart';

// Sentinels that must never appear on any span: rider content stays out of telemetry.
const { TRANSCRIPT, COMPLETION_CONTENT } = vi.hoisted(() => ({
    TRANSCRIPT: 'SENTINEL_TRANSCRIPT rode Dobbin for forty minutes of flatwork',
    COMPLETION_CONTENT: JSON.stringify({
        horseName: 'Dobbin',
        riderName: null,
        durationMinutes: 40,
        workType: 'FLATWORK',
        intensity: null,
        rating: null,
        formattedNotes: 'SENTINEL_COMPLETION',
    }),
}));

vi.mock('@/rest/utils/openai', () => ({
    getOpenAI: () => ({
        audio: {
            transcriptions: {
                create: async () => ({ text: TRANSCRIPT }),
            },
        },
        chat: {
            completions: {
                create: async () => ({
                    id: 'chatcmpl-telemetry-test',
                    model: 'gpt-test-2026-01-01',
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: COMPLETION_CONTENT,
                            },
                            finish_reason: 'stop',
                        },
                    ],
                    usage: {
                        prompt_tokens: 321,
                        completion_tokens: 45,
                        total_tokens: 366,
                    },
                }),
            },
        },
    }),
}));

function attributeValues(spans: ReadableSpan[]): string[] {
    return spans.flatMap((span) =>
        Object.values(span.attributes).map((value) => String(value))
    );
}

function findByAttribute(
    spans: ReadableSpan[],
    key: string,
    value: unknown
): ReadableSpan | undefined {
    return spans.find((span) => span.attributes[key] === value);
}

describe('OpenTelemetry tracing', () => {
    const exporter = new InMemorySpanExporter();
    let app: FastifyInstance;
    let riderId: string;
    let barnId: string;
    let horseId: string;
    let token: string;

    beforeAll(async () => {
        // The SDK must start before the app stack loads so auto-instrumentation
        // can patch it; hence the dynamic imports below.
        expect(
            initTelemetry({ spanProcessor: new SimpleSpanProcessor(exporter) })
        ).toBe(true);
        const { createApiApp } = await import('@/server');
        const { seedBarn } = await import('@/test/setupWorld');

        app = await createApiApp();

        const barn = await seedBarn('telemetry-test-barn');
        barnId = barn.id;
        const rider = await prisma.rider.create({
            data: {
                name: 'Telemetry Test Rider',
                email: `telemetry-test-${Date.now()}@example.com`,
                password: 'hashedpassword',
                barnId,
            },
        });
        riderId = rider.id;
        const horse = await prisma.horse.create({
            data: { name: 'Dobbin', barnId },
        });
        horseId = horse.id;
        token = jwt.sign({ riderId }, process.env.JWT_SECRET!);
    });

    afterAll(async () => {
        await prisma.horse.delete({ where: { id: horseId } });
        await prisma.rider.delete({ where: { id: riderId } });
        await prisma.barn.delete({ where: { id: barnId } });
        await app.close();
        await shutdownTelemetry();
        await prisma.$disconnect();
    });

    beforeEach(() => {
        exporter.reset();
    });

    it('wraps voice parse OpenAI calls in GenAI spans that carry usage but never content', async () => {
        const context = {
            horses: [{ id: horseId, name: 'Dobbin' }],
            riders: [{ id: riderId, name: 'Telemetry Test Rider' }],
            speakerName: 'Telemetry Test Rider',
        };
        const { body, boundary } = buildMultipartPayload(
            { context: JSON.stringify(context) },
            {
                audio: {
                    content: Buffer.from('fake-audio-data'),
                    filename: 'audio.webm',
                    type: 'audio/webm',
                },
            }
        );

        const response = await app.inject({
            method: 'POST',
            url: '/api/parse-session',
            headers: {
                'content-type': `multipart/form-data; boundary=${boundary}`,
                authorization: `Bearer ${token}`,
            },
            payload: body,
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({ horseId, durationMinutes: 40 });

        const spans = exporter.getFinishedSpans();

        const transcription = findByAttribute(
            spans,
            'gen_ai.operation.name',
            'transcription'
        );
        expect(transcription?.name).toBe('transcription whisper-1');
        expect(transcription?.attributes).toMatchObject({
            'gen_ai.provider.name': 'openai',
            'gen_ai.request.model': 'whisper-1',
        });

        const chat = findByAttribute(spans, 'gen_ai.operation.name', 'chat');
        const model = chat?.attributes['gen_ai.request.model'];
        expect(chat?.name).toBe(`chat ${model}`);
        expect(chat?.attributes).toMatchObject({
            'gen_ai.provider.name': 'openai',
            'gen_ai.response.model': 'gpt-test-2026-01-01',
            'gen_ai.response.id': 'chatcmpl-telemetry-test',
            'gen_ai.response.finish_reasons': ['stop'],
            'gen_ai.usage.input_tokens': 321,
            'gen_ai.usage.output_tokens': 45,
            [HERDBOOK_ATTR.PROMPT_NAME]: 'voiceParse',
            [HERDBOOK_ATTR.PROMPT_VERSION]: 'v2',
        });

        // The request is tagged with who asked, their barn, and the horse resolved.
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.RIDER_ID, riderId)
        ).toBeDefined();
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.BARN_ID, barnId)
        ).toBeDefined();
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.HORSE_ID, horseId)
        ).toBeDefined();

        // Privacy: no transcript, completion, or system prompt text anywhere.
        const systemPrompt = VOICE_PARSE_PROMPTS.v2.buildSystemPrompt(context);
        for (const value of attributeValues(spans)) {
            expect(value).not.toContain('SENTINEL_TRANSCRIPT');
            expect(value).not.toContain('SENTINEL_COMPLETION');
            expect(value).not.toContain(systemPrompt.slice(0, 80));
        }
    });

    it('tags GraphQL requests with operation, rider, barn, and horse', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/graphql',
            headers: { authorization: `Bearer ${token}` },
            payload: {
                query: 'query HorseProfile($id: ID!) { horse(id: $id) { id name } }',
                variables: { id: horseId },
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            data: { horse: { id: horseId } },
        });

        const spans = exporter.getFinishedSpans();
        expect(spans.length).toBeGreaterThan(0);
        expect(
            findByAttribute(spans, 'graphql.operation.name', 'HorseProfile')
        ).toBeDefined();
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.RIDER_ID, riderId)
        ).toBeDefined();
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.BARN_ID, barnId)
        ).toBeDefined();
        expect(
            findByAttribute(spans, HERDBOOK_ATTR.HORSE_ID, horseId)
        ).toBeDefined();
    });
});
