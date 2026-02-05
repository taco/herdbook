import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { createApiApp } from '@/server';

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

describe('/api/transcribe', () => {
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
                name: 'Transcribe Test Rider',
                email: `transcribe-test-${Date.now()}@example.com`,
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
                url: '/api/transcribe',
                headers: {
                    'content-type': 'application/json',
                },
                payload: {
                    audio: 'base64audiodata',
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('Unauthorized');
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 401 with malformed authorization header',
        async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/transcribe',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Basic sometoken',
                },
                payload: {
                    audio: 'base64audiodata',
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
                url: '/api/transcribe',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Bearer invalidtoken',
                },
                payload: {
                    audio: 'base64audiodata',
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
            // Send a multipart request with no file field
            const { body: multipartBody, boundary } = buildMultipartPayload(
                { dummy: 'no-audio' },
                {}
            );

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/transcribe',
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
        'returns 500 when OPENAI_API_KEY is not configured',
        async () => {
            delete process.env.OPENAI_API_KEY;
            const appWithoutKey = await createApiApp();

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

            const response = await appWithoutKey.inject({
                method: 'POST',
                url: '/api/transcribe',
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
            expect(body.error).toBe('Transcription failed');
            expect(body.details).toBe('OpenAI API key not configured');

            await appWithoutKey.close();
        },
        TEST_TIMEOUT_MS
    );
});
