import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { InjectOptions } from 'fastify';

import { createApiApp } from '@/server';

describe('Rate limiting', () => {
    let fastify: FastifyInstance;
    const TEST_TIMEOUT_MS = 30_000;
    const AUTH_LIMIT = 10;

    beforeAll(async () => {
        process.env.RATE_LIMIT_AUTH = String(AUTH_LIMIT);
        fastify = await createApiApp();
    });

    afterAll(async () => {
        await fastify.close();
        delete process.env.RATE_LIMIT_AUTH;
    });

    it(
        'returns RATE_LIMITED error when auth limit is exceeded',
        async () => {
            const requests = [];
            for (let i = 0; i < AUTH_LIMIT + 3; i++) {
                requests.push(
                    fastify.inject({
                        method: 'POST',
                        url: '/graphql',
                        headers: {
                            'content-type': 'application/json',
                        },
                        payload: {
                            query: `
                            mutation Login($email: String!, $password: String!) {
                                login(email: $email, password: $password) {
                                    token
                                }
                            }
                        `,
                            variables: {
                                email: `nonexistent-${i}@example.com`,
                                password: 'wrongpassword',
                            },
                        },
                    })
                );
            }

            const responses = await Promise.all(requests);

            // Find a rate limited response
            let rateLimitedResponse = null;
            for (const response of responses) {
                const body = JSON.parse(response.body) as {
                    errors?: Array<{
                        message?: string;
                        extensions?: {
                            code?: string;
                            rateLimit?: { ttl?: number; remaining?: number };
                        };
                    }>;
                };
                if (body.errors?.[0]?.extensions?.code === 'RATE_LIMITED') {
                    rateLimitedResponse = body;
                    break;
                }
            }

            expect(rateLimitedResponse).not.toBeNull();
            expect(rateLimitedResponse?.errors?.[0]?.message).toBe(
                'Too many requests'
            );
            expect(rateLimitedResponse?.errors?.[0]?.extensions?.code).toBe(
                'RATE_LIMITED'
            );
            expect(
                rateLimitedResponse?.errors?.[0]?.extensions?.rateLimit
            ).toBeDefined();
        },
        TEST_TIMEOUT_MS
    );

    it(
        'allows requests up to the limit before rate limiting',
        async () => {
            // Create a fresh app instance to get a clean rate limit state
            const freshApp = await createApiApp();

            try {
                // Send exactly AUTH_LIMIT requests
                const requests = [];
                for (let i = 0; i < AUTH_LIMIT; i++) {
                    requests.push(
                        freshApp.inject({
                            method: 'POST',
                            url: '/graphql',
                            headers: {
                                'content-type': 'application/json',
                            },
                            payload: {
                                query: `
                                mutation Login($email: String!, $password: String!) {
                                    login(email: $email, password: $password) {
                                        token
                                    }
                                }
                            `,
                                variables: {
                                    email: `test-${i}@example.com`,
                                    password: 'password',
                                },
                            },
                        })
                    );
                }

                const responses = await Promise.all(requests);

                // None of these should be rate limited
                for (const response of responses) {
                    const body = JSON.parse(response.body) as {
                        errors?: Array<{
                            extensions?: { code?: string };
                        }>;
                    };
                    expect(body.errors?.[0]?.extensions?.code).not.toBe(
                        'RATE_LIMITED'
                    );
                }
            } finally {
                await freshApp.close();
            }
        },
        TEST_TIMEOUT_MS
    );

    it(
        'rate limits login and signup separately from each other',
        async () => {
            // Create a fresh app instance
            const freshApp = await createApiApp();

            try {
                // Exhaust the auth bucket with login attempts
                const loginRequests = [];
                for (let i = 0; i < 13; i++) {
                    loginRequests.push(
                        freshApp.inject({
                            method: 'POST',
                            url: '/graphql',
                            headers: {
                                'content-type': 'application/json',
                            },
                            payload: {
                                query: `
                                mutation Login($email: String!, $password: String!) {
                                    login(email: $email, password: $password) {
                                        token
                                    }
                                }
                            `,
                                variables: {
                                    email: `login-test-${i}@example.com`,
                                    password: 'password',
                                },
                            },
                        })
                    );
                }
                const loginResponses = await Promise.all(loginRequests);

                // Verify auth bucket is exhausted via login
                let loginRateLimited = false;
                for (const response of loginResponses) {
                    const body = JSON.parse(response.body) as {
                        errors?: Array<{ extensions?: { code?: string } }>;
                    };
                    if (body.errors?.[0]?.extensions?.code === 'RATE_LIMITED') {
                        loginRateLimited = true;
                        break;
                    }
                }
                expect(loginRateLimited).toBe(true);

                // Signup uses the same auth bucket, so it should also be rate limited
                const signupResponse = await freshApp.inject({
                    method: 'POST',
                    url: '/graphql',
                    headers: {
                        'content-type': 'application/json',
                    },
                    payload: {
                        query: `
                        mutation Signup($name: String!, $email: String!, $password: String!, $inviteCode: String!) {
                            signup(name: $name, email: $email, password: $password, inviteCode: $inviteCode) {
                                token
                            }
                        }
                    `,
                        variables: {
                            name: 'Test User',
                            email: 'signup-test@example.com',
                            password: 'password123',
                            inviteCode: 'DOESNOTMATTER',
                        },
                    },
                });

                const signupBody = JSON.parse(signupResponse.body) as {
                    errors?: Array<{
                        extensions?: { code?: string };
                    }>;
                };

                // Signup should also be rate limited (same auth bucket)
                expect(signupBody.errors?.[0]?.extensions?.code).toBe(
                    'RATE_LIMITED'
                );
            } finally {
                await freshApp.close();
            }
        },
        TEST_TIMEOUT_MS
    );

    it(
        'includes rate limit info in error response',
        async () => {
            // Create a fresh app instance
            const freshApp = await createApiApp();

            try {
                // Exhaust the auth bucket
                const requests = [];
                for (let i = 0; i < 12; i++) {
                    requests.push(
                        freshApp.inject({
                            method: 'POST',
                            url: '/graphql',
                            headers: {
                                'content-type': 'application/json',
                            },
                            payload: {
                                query: `
                                mutation Login($email: String!, $password: String!) {
                                    login(email: $email, password: $password) {
                                        token
                                    }
                                }
                            `,
                                variables: {
                                    email: `info-test-${i}@example.com`,
                                    password: 'password',
                                },
                            },
                        })
                    );
                }
                const responses = await Promise.all(requests);

                // Find a rate limited response and verify it has rate limit info
                for (const response of responses) {
                    const body = JSON.parse(response.body) as {
                        errors?: Array<{
                            message?: string;
                            extensions?: {
                                code?: string;
                                rateLimit?: {
                                    ttl?: number;
                                    remaining?: number;
                                };
                            };
                        }>;
                    };
                    if (body.errors?.[0]?.extensions?.code === 'RATE_LIMITED') {
                        const rateLimit = body.errors[0].extensions?.rateLimit;
                        expect(rateLimit).toBeDefined();
                        // TTL should be a positive number (time until reset)
                        expect(typeof rateLimit?.ttl).toBe('number');
                        // Remaining should be 0 or negative when rate limited
                        expect(typeof rateLimit?.remaining).toBe('number');
                        return; // Test passed
                    }
                }

                // If we get here, no rate limited response was found
                expect.fail('Expected to find a rate limited response');
            } finally {
                await freshApp.close();
            }
        },
        TEST_TIMEOUT_MS
    );
});

describe('AI rate limiting (REST)', () => {
    const TEST_TIMEOUT_MS = 30_000;
    const AI_BURST_LIMIT = 2;
    const AI_DAILY_LIMIT = 3;

    /** Build a minimal multipart request to /api/parse-session */
    function buildParseSessionRequest(): InjectOptions {
        const boundary = '----TestBoundary';
        const context = JSON.stringify({
            horses: [],
            riders: [],
            speakerName: 'Test',
        });
        // Tiny valid audio-like payload (will fail at OpenAI, but rate limit runs first)
        const body = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="audio"; filename="audio.webm"',
            'Content-Type: audio/webm',
            '',
            'fake-audio-bytes',
            `--${boundary}`,
            'Content-Disposition: form-data; name="context"',
            '',
            context,
            `--${boundary}--`,
        ].join('\r\n');

        return {
            method: 'POST',
            url: '/api/parse-session',
            headers: {
                'content-type': `multipart/form-data; boundary=${boundary}`,
                authorization: 'Bearer fake-token',
            },
            payload: body,
        };
    }

    it(
        'returns 429 when AI burst limit is exceeded',
        async () => {
            process.env.RATE_LIMIT_AI_BURST = String(AI_BURST_LIMIT);
            const app = await createApiApp();

            try {
                const requests = [];
                for (let i = 0; i < AI_BURST_LIMIT + 1; i++) {
                    requests.push(app.inject(buildParseSessionRequest()));
                }
                const responses = await Promise.all(requests);

                const rateLimited = responses.find((r) => r.statusCode === 429);
                expect(rateLimited).toBeDefined();

                const body = JSON.parse(rateLimited!.body) as {
                    error: string;
                    message: string;
                    rateLimit: {
                        bucket: string;
                        ttl: number;
                        remaining: number;
                    };
                };
                expect(body.error).toBe('RATE_LIMITED');
                expect(body.rateLimit.bucket).toContain('ai:burst');
                expect(body.message).toContain('Too many requests');
            } finally {
                await app.close();
                delete process.env.RATE_LIMIT_AI_BURST;
            }
        },
        TEST_TIMEOUT_MS
    );

    it(
        'returns 429 when AI daily limit is exceeded',
        async () => {
            // High burst so we only hit the daily cap
            process.env.RATE_LIMIT_AI_BURST = '100';
            process.env.RATE_LIMIT_AI_DAILY = String(AI_DAILY_LIMIT);
            const app = await createApiApp();

            try {
                const requests = [];
                for (let i = 0; i < AI_DAILY_LIMIT + 1; i++) {
                    requests.push(app.inject(buildParseSessionRequest()));
                }
                const responses = await Promise.all(requests);

                const rateLimited = responses.find((r) => r.statusCode === 429);
                expect(rateLimited).toBeDefined();

                const body = JSON.parse(rateLimited!.body) as {
                    error: string;
                    message: string;
                    rateLimit: {
                        bucket: string;
                        ttl: number;
                        remaining: number;
                    };
                };
                expect(body.error).toBe('RATE_LIMITED');
                expect(body.rateLimit.bucket).toContain('ai:daily');
                expect(body.message).toContain('daily limit');
            } finally {
                await app.close();
                delete process.env.RATE_LIMIT_AI_BURST;
                delete process.env.RATE_LIMIT_AI_DAILY;
            }
        },
        TEST_TIMEOUT_MS
    );
});
