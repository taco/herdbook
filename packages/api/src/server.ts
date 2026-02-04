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

import { prisma } from '@/db';
import { createLoaders } from '@/loaders';
import { Context, createResolvers } from '@/resolvers';
import { getJwtSecretOrThrow, getCorsOrigin } from '@/config';
import { secureByDefaultTransformer } from '@/directives';

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

export async function createApiApp(): Promise<FastifyInstance> {
    // Ensure required env is present before accepting requests.
    getJwtSecretOrThrow();

    const app = Fastify();

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

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return reply
                .status(500)
                .send({ error: 'OpenAI API key not configured' });
        }

        const body = request.body as { audio: string; mimeType?: string };
        if (!body.audio) {
            return reply.status(400).send({ error: 'No audio data provided' });
        }

        try {
            // Convert base64 to buffer
            const audioBuffer = Buffer.from(body.audio, 'base64');
            const mimeType = body.mimeType || 'audio/webm';
            const extension = mimeType.includes('mp4')
                ? 'mp4'
                : mimeType.includes('wav')
                  ? 'wav'
                  : 'webm';

            // Create FormData for OpenAI API
            const formData = new FormData();
            const blob = new Blob([audioBuffer], { type: mimeType });
            formData.append('file', blob, `audio.${extension}`);
            formData.append('model', 'whisper-1');
            formData.append('language', 'en');

            // Call OpenAI Whisper API
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
                console.error('OpenAI API error:', errorText);
                return reply.status(response.status).send({
                    error: 'Transcription failed',
                    details: errorText,
                });
            }

            const result = (await response.json()) as { text: string };
            return { transcription: result.text };
        } catch (error) {
            console.error('Transcription error:', error);
            return reply.status(500).send({
                error: 'Transcription failed',
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
