import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import OpenAI from 'openai';
import type { WorkType, Intensity } from '@prisma/client';
import { verifyToken } from '@/middleware/auth';
import {
    VOICE_PARSE_PROMPTS,
    type VoiceParseVersion,
    resolveModel,
} from '@/prompts';
import * as Sentry from '@sentry/node';
import { setupAiLimiters, withAiRateLimit } from './utils/aiRateLimit';

// Types for parse-session endpoint
export interface ParseSessionContext {
    horses: Array<{ id: string; name: string }>;
    riders: Array<{ id: string; name: string }>;
    speakerName: string;
}

/** Raw response from GPT — names, not IDs */
export interface RawParsedSession {
    horseName: string | null;
    riderName: string | null;
    durationMinutes: number | null;
    workType: WorkType | null;
    intensity?: Intensity | null;
    rating?: number | null;
    formattedNotes?: string;
}

/** Resolved response with IDs looked up from context */
export interface ParsedSession {
    horseId: string | null;
    riderId: string | null;
    durationMinutes: number | null;
    workType: WorkType | null;
    intensity?: Intensity | null;
    rating?: number | null;
    formattedNotes?: string;
}

function resolveNameToId(
    name: string | null,
    items: Array<{ id: string; name: string }>
): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();
    const match = items.find((item) => item.name.toLowerCase() === lower);
    return match?.id ?? null;
}

/**
 * Transcribe audio using OpenAI Whisper
 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string = 'audio/webm'
): Promise<string> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
    }

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

/**
 * Parse transcript into structured session fields using OpenAI
 */
export async function parseTranscript(
    transcript: string,
    context: ParseSessionContext,
    options?: { promptVersion?: VoiceParseVersion }
): Promise<{
    parsed: ParsedSession;
    raw: RawParsedSession;
    usage: OpenAI.CompletionUsage | undefined;
}> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const promptVersion = options?.promptVersion ?? 'v2';
    const promptConfig = VOICE_PARSE_PROMPTS[promptVersion];
    const model = resolveModel(promptConfig);

    const systemPrompt = promptConfig.buildSystemPrompt(context);

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
        ],
        response_format:
            promptConfig.schema as OpenAI.ChatCompletionCreateParams['response_format'],
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('Failed to parse transcript');
    }

    const raw = JSON.parse(content) as RawParsedSession;

    const parsed: ParsedSession = {
        horseId: resolveNameToId(raw.horseName, context.horses),
        riderId: resolveNameToId(raw.riderName, context.riders),
        durationMinutes: raw.durationMinutes,
        workType: raw.workType,
        intensity: raw.intensity,
        rating: raw.rating,
        formattedNotes: raw.formattedNotes,
    };

    return { parsed, raw, usage: completion.usage ?? undefined };
}

/**
 * Register voice-related REST routes
 */
export async function registerVoiceRoutes(app: FastifyInstance): Promise<void> {
    const limiters = setupAiLimiters(app);

    app.post(
        '/api/parse-session',
        withAiRateLimit(limiters, 'ai', async (request, reply) => {
            // Authenticate user
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            if (!verifyToken(authHeader)) {
                return reply.status(401).send({ error: 'Invalid token' });
            }

            const parts = request.parts();
            let audioBuffer: Buffer | null = null;
            let audioMimeType = 'audio/webm';
            let context: ParseSessionContext | null = null;

            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'audio') {
                    audioBuffer = await part.toBuffer();
                    audioMimeType = part.mimetype;
                } else if (
                    part.type === 'field' &&
                    part.fieldname === 'context'
                ) {
                    context = JSON.parse(
                        part.value as string
                    ) as ParseSessionContext;
                }
            }

            if (!audioBuffer) {
                return reply
                    .status(400)
                    .send({ error: 'No audio data provided' });
            }
            if (!context) {
                return reply.status(400).send({ error: 'No context provided' });
            }

            try {
                // Step 1: Transcribe audio
                const transcript = await transcribeAudio(
                    audioBuffer,
                    audioMimeType
                );

                // Step 2: Parse transcript into structured fields
                const { parsed } = await parseTranscript(transcript, context);

                return {
                    notes: transcript,
                    ...parsed,
                };
            } catch (error) {
                Sentry.captureException(error, {
                    tags: { 'rest.route': '/api/parse-session' },
                });
                console.error('[voice] Parse session error:', error);
                return reply.status(500).send({
                    error: 'Failed to parse session',
                    details:
                        'Something went wrong parsing your recording. Please try again.',
                });
            }
        })
    );
}
