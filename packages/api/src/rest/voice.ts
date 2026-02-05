import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import type { WorkType } from '@prisma/client';
import { getJwtSecretOrThrow } from '@/config';

// Types for parse-session endpoint
export interface ParseSessionContext {
    horses: Array<{ id: string; name: string }>;
    riders: Array<{ id: string; name: string }>;
    currentDateTime: string;
}

export interface ParsedSession {
    horseId: string | null;
    riderId: string | null;
    date: string | null;
    durationMinutes: number | null;
    workType: WorkType | null;
    notes: string | null;
}

// JSON Schema for OpenAI structured output
const PARSED_SESSION_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'session',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                horseId: { type: ['string', 'null'] },
                riderId: { type: ['string', 'null'] },
                date: { type: ['string', 'null'] },
                durationMinutes: { type: ['number', 'null'] },
                workType: {
                    type: ['string', 'null'],
                    enum: [
                        'FLATWORK',
                        'JUMPING',
                        'GROUNDWORK',
                        'IN_HAND',
                        'TRAIL',
                        'OTHER',
                        null,
                    ],
                },
                notes: { type: ['string', 'null'] },
            },
            required: [
                'horseId',
                'riderId',
                'date',
                'durationMinutes',
                'workType',
                'notes',
            ],
            additionalProperties: false,
        },
    },
} as const;

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
        response_format: PARSED_SESSION_SCHEMA,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('Failed to parse transcript');
    }

    return JSON.parse(content) as ParsedSession;
}

/**
 * Register voice-related REST routes
 */
export async function registerVoiceRoutes(app: FastifyInstance): Promise<void> {
    // Whisper transcription endpoint
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

        const file = await request.file();
        if (!file || file.fieldname !== 'audio') {
            return reply.status(400).send({ error: 'No audio data provided' });
        }

        const audioBuffer = await file.toBuffer();

        try {
            const transcription = await transcribeAudio(
                audioBuffer,
                file.mimetype
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

        const parts = request.parts();
        let audioBuffer: Buffer | null = null;
        let audioMimeType = 'audio/webm';
        let context: ParseSessionContext | null = null;

        for await (const part of parts) {
            if (part.type === 'file' && part.fieldname === 'audio') {
                audioBuffer = await part.toBuffer();
                audioMimeType = part.mimetype;
            } else if (part.type === 'field' && part.fieldname === 'context') {
                context = JSON.parse(
                    part.value as string
                ) as ParseSessionContext;
            }
        }

        if (!audioBuffer) {
            return reply.status(400).send({ error: 'No audio data provided' });
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
            const parsed = await parseTranscript(transcript, context);

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
}
