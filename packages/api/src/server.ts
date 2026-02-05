import Fastify, {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { prisma } from '@/db';
import { createLoaders } from '@/loaders';
import { Context, createResolvers } from '@/resolvers';
import { getJwtSecretOrThrow, getCorsOrigin } from '@/config';
import { secureByDefaultTransformer } from '@/directives';

// Types for parse-session endpoint
interface ParseSessionContext {
    horses: Array<{ id: string; name: string }>;
    riders: Array<{ id: string; name: string }>;
    currentDateTime: string;
}

interface ParseSessionRequest {
    audio: string;
    mimeType?: string;
    context: ParseSessionContext;
}

const WorkTypeEnum = z.enum([
    'FLATWORK',
    'JUMPING',
    'GROUNDWORK',
    'IN_HAND',
    'TRAIL',
    'OTHER',
]);

const ParsedSessionSchema = z.object({
    horseId: z.string().nullable(),
    riderId: z.string().nullable(),
    date: z.string().nullable(),
    durationMinutes: z.number().nullable(),
    workType: WorkTypeEnum.nullable(),
    notes: z.string().nullable(),
});

type ParsedSession = z.infer<typeof ParsedSessionSchema>;

// Helper to transcribe audio using OpenAI Whisper
export async function transcribeAudio(
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<string> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const extension = mimeType.includes('mp4')
        ? 'mp4'
        : mimeType.includes('wav')
          ? 'wav'
          : 'webm';

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openaiApiKey}`,
            },
            body: formData,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text;
}

// Helper to parse transcript into structured session fields
export async function parseTranscript(
    transcript: string,
    context: ParseSessionContext
): Promise<ParsedSession> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = `You are a session parser for an equestrian training log app. Extract structured fields from the user's spoken description of a training session.

Available horses (match case-insensitively, partial matches OK):
${context.horses.map((h) => `- ID: "${h.id}", Name: "${h.name}"`).join('\n')}

Available riders (match case-insensitively, partial matches OK):
${context.riders.map((r) => `- ID: "${r.id}", Name: "${r.name}"`).join('\n')}

Current date/time: ${context.currentDateTime}

Instructions:
1. Match horse/rider names to their IDs. Use fuzzy matching (partial names, nicknames, case-insensitive).
2. Parse duration: "an hour" → 60, "45 minutes" → 45, "half an hour" → 30, "an hour and a half" → 90
3. Parse dates relative to currentDateTime: "yesterday", "last Tuesday", "this morning", etc.
4. Infer work type from context clues:
   - FLATWORK: dressage, schooling, walk/trot/canter work, arena work
   - JUMPING: jumps, fences, poles, courses
   - GROUNDWORK: lunging, long-lining, liberty work
   - IN_HAND: leading, ground manners, showmanship
   - TRAIL: hacking, trail ride, outside ride
   - OTHER: anything else or unclear
5. For notes: Remove redundant information (horse name, rider name, duration, date, work type that are captured in other fields). Clarify spoken language into clean written text. Preserve ALL detail - do not summarize or remove useful information.

Return null for any field you cannot confidently determine.`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
        ],
        response_format: zodResponseFormat(ParsedSessionSchema, 'session'),
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('Failed to parse transcript');
    }

    return ParsedSessionSchema.parse(JSON.parse(content));
}

export async function buildContext(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<Context> {
    const auth = request.headers.authorization;
    const context: Context = {
        rider: null,
        reply,
        loaders: createLoaders(),
    };
    if (!auth || !auth.startsWith('Bearer ')) {
        return context;
    }

    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, getJwtSecretOrThrow()) as {
            riderId: string;
        };
        const rider = await prisma.rider.findUnique({
            where: { id: payload.riderId },
            omit: { password: true },
        });
        context.rider = rider;
        return context;
    } catch (error) {
        // Avoid failing the whole request if auth is invalid.
        console.error('Error verifying token:', error);
        return context;
    }
}

function readSchemaSDLOrThrow(): string {
    // In dev/test, this file lives next to this module in `src/`.
    const sdlPath = resolve(__dirname, 'schema.graphql');
    if (existsSync(sdlPath)) {
        return readFileSync(sdlPath, 'utf8');
    }

    // When running compiled JS (`dist/`), `schema.graphql` is still in `src/`.
    // `dist/` and `src/` are siblings under `packages/api/`.
    const fallbackPath = resolve(__dirname, '../src/schema.graphql');
    if (existsSync(fallbackPath)) {
        return readFileSync(fallbackPath, 'utf8');
    }

    throw new Error(
        `Could not find schema.graphql at ${sdlPath} or ${fallbackPath}`
    );
}

export async function createApiApp(httpsOptions?: {
    key: Buffer;
    cert: Buffer;
}): Promise<FastifyInstance> {
    // Ensure required env is present before accepting requests.
    getJwtSecretOrThrow();

    const app: FastifyInstance = httpsOptions
        ? Fastify({ https: httpsOptions })
        : Fastify();

    await app.register(cors, {
        origin: getCorsOrigin(),
        credentials: true,
    });

    await app.register(rateLimit, {
        global: false, // Don't apply globally, we'll use per-resolver limiters
    });

    app.get('/', async () => {
        return { status: 'ok' };
    });

    // Whisper transcription endpoint (POC)
    app.post('/api/transcribe', async (request, reply) => {
        // Authenticate user
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const token = auth.slice(7);
        try {
            jwt.verify(token, getJwtSecretOrThrow());
        } catch {
            return reply.status(401).send({ error: 'Invalid token' });
        }

        const body = request.body as { audio: string; mimeType?: string };
        if (!body.audio) {
            return reply.status(400).send({ error: 'No audio data provided' });
        }

        try {
            const transcription = await transcribeAudio(
                body.audio,
                body.mimeType
            );
            return { transcription };
        } catch (error) {
            console.error('Transcription error:', error);
            return reply.status(500).send({
                error: 'Transcription failed',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Parse session from voice input
    app.post('/api/parse-session', async (request, reply) => {
        // Authenticate user
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const token = auth.slice(7);
        try {
            jwt.verify(token, getJwtSecretOrThrow());
        } catch {
            return reply.status(401).send({ error: 'Invalid token' });
        }

        const body = request.body as ParseSessionRequest;
        if (!body.audio) {
            return reply.status(400).send({ error: 'No audio data provided' });
        }
        if (!body.context) {
            return reply.status(400).send({ error: 'No context provided' });
        }

        try {
            // Step 1: Transcribe audio
            const transcript = await transcribeAudio(body.audio, body.mimeType);

            // Step 2: Parse transcript into structured fields
            const parsed = await parseTranscript(transcript, body.context);

            return {
                transcript,
                ...parsed,
            };
        } catch (error) {
            console.error('Parse session error:', error);
            return reply.status(500).send({
                error: 'Failed to parse session',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    const schema = secureByDefaultTransformer(
        buildSubgraphSchema({
            typeDefs: parse(readSchemaSDLOrThrow()),
            resolvers: createResolvers(app),
        })
    );

    const apollo = new ApolloServer<Context>({
        schema,
    });

    await apollo.start();

    await app.register(fastifyApollo(apollo), {
        context: (request: FastifyRequest, reply: FastifyReply) =>
            buildContext(request, reply),
    });

    return app;
}
