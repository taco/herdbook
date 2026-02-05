import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { createApiApp } from '@/server';

describe('/api/parse-session', () => {
    let fastify: FastifyInstance;
    let validToken: string;
    let testRiderId: string;
    let prevOpenApiKey: string | undefined;
    const TEST_TIMEOUT_MS = 20_000;

    beforeAll(async () => {
        prevOpenApiKey = process.env.OPENAI_API_KEY;
        fastify = await createApiApp();

        const testRider = await prisma.rider.create({
            data: {
                name: 'Parse Session Test Rider',
                email: `parse-session-test-${Date.now()}@example.com`,
                password: 'hashedpassword',
            },
        });
        testRiderId = testRider.id;

        validToken = jwt.sign(
            { riderId: testRiderId },
            process.env.JWT_SECRET || 'api-test-jwt-secret'
        );
    });

    afterAll(async () => {
        await prisma.rider.delete({ where: { id: testRiderId } });

        if (prevOpenApiKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        } else {
            process.env.OPENAI_API_KEY = prevOpenApiKey;
        }

        await fastify.close();
        await prisma.$disconnect();
    });

    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-openai-key';
    });

    it(
        'returns 401 without authorization header',
        async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': 'application/json',
                },
                payload: {
                    audio: 'base64audiodata',
                    context: {
                        horses: [],
                        riders: [],
                        currentDateTime: new Date().toISOString(),
                    },
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('Unauthorized');
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 401 with invalid JWT token',
        async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Bearer invalidtoken',
                },
                payload: {
                    audio: 'base64audiodata',
                    context: {
                        horses: [],
                        riders: [],
                        currentDateTime: new Date().toISOString(),
                    },
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('Invalid token');
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 400 when audio data is missing',
        async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${validToken}`,
                },
                payload: {
                    context: {
                        horses: [],
                        riders: [],
                        currentDateTime: new Date().toISOString(),
                    },
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('No audio data provided');
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 400 when context is missing',
        async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${validToken}`,
                },
                payload: {
                    audio: 'base64audiodata',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('No context provided');
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 500 when OPENAI_API_KEY is not configured',
        async () => {
            delete process.env.OPENAI_API_KEY;
            const appWithoutKey = await createApiApp();

            const response = await appWithoutKey.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${validToken}`,
                },
                payload: {
                    audio: 'base64audiodata',
                    context: {
                        horses: [],
                        riders: [],
                        currentDateTime: new Date().toISOString(),
                    },
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body) as {
                error: string;
                details: string;
            };
            expect(body.error).toBe('Failed to parse session');
            expect(body.details).toBe('OpenAI API key not configured');

            await appWithoutKey.close();
        },
        TEST_TIMEOUT_MS
    );
});
