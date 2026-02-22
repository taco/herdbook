import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { createApiApp } from '@/server';
import { seedBarn } from '@/test/setupWorld';

function buildMultipartPayload(
    fields: Record<string, string>,
    files: Record<string, { content: Buffer; filename: string; type: string }>
): { body: Buffer; boundary: string } {
    const boundary = '----TestBoundary' + Date.now();
    const parts: Buffer[] = [];

    for (const [name, value] of Object.entries(fields)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
            )
        );
    }

    for (const [name, file] of Object.entries(files)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`
            )
        );
        parts.push(file.content);
        parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return { body: Buffer.concat(parts), boundary };
}

describe('/api/parse-session', () => {
    let fastify: FastifyInstance;
    let validToken: string;
    let testRiderId: string;
    let testBarnId: string;
    let prevOpenApiKey: string | undefined;
    const TEST_TIMEOUT_MS = 20_000;

    const testContext = JSON.stringify({
        horses: [],
        riders: [],
        currentDateTime: new Date().toISOString(),
        timezone: 'America/New_York',
    });

    beforeAll(async () => {
        prevOpenApiKey = process.env.OPENAI_API_KEY;
        fastify = await createApiApp();

        const barn = await seedBarn('parse-session-test-barn');
        testBarnId = barn.id;

        const testRider = await prisma.rider.create({
            data: {
                name: 'Parse Session Test Rider',
                email: `parse-session-test-${Date.now()}@example.com`,
                password: 'hashedpassword',
                barnId: barn.id,
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
        await prisma.barn.delete({ where: { id: testBarnId } });

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
            // Multipart with context field but no audio file
            const { body: multipartBody, boundary } = buildMultipartPayload(
                { context: testContext },
                {}
            );

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': `multipart/form-data; boundary=${boundary}`,
                    authorization: `Bearer ${validToken}`,
                },
                payload: multipartBody,
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
            // Multipart with audio file but no context field
            const { body: multipartBody, boundary } = buildMultipartPayload(
                {},
                {
                    audio: {
                        content: Buffer.from('fake-audio-data'),
                        filename: 'audio.webm',
                        type: 'audio/webm',
                    },
                }
            );

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': `multipart/form-data; boundary=${boundary}`,
                    authorization: `Bearer ${validToken}`,
                },
                payload: multipartBody,
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

            const { body: multipartBody, boundary } = buildMultipartPayload(
                { context: testContext },
                {
                    audio: {
                        content: Buffer.from('fake-audio-data'),
                        filename: 'audio.webm',
                        type: 'audio/webm',
                    },
                }
            );

            const response = await appWithoutKey.inject({
                method: 'POST',
                url: '/api/parse-session',
                headers: {
                    'content-type': `multipart/form-data; boundary=${boundary}`,
                    authorization: `Bearer ${validToken}`,
                },
                payload: multipartBody,
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body) as {
                error: string;
                details: string;
            };
            expect(body.error).toBe('Failed to parse session');
            expect(body.details).toBe(
                'Something went wrong parsing your recording. Please try again.'
            );

            await appWithoutKey.close();
        },
        TEST_TIMEOUT_MS
    );
});
