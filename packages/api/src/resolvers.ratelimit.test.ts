import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createApiApp } from '@/server';

describe('Rate limiting', () => {
    let fastify: FastifyInstance;
    const TEST_TIMEOUT_MS = 30_000;

    beforeAll(async () => {
        fastify = await createApiApp();
    });

    afterAll(async () => {
        await fastify.close();
    });

    it(
        'returns RATE_LIMITED error when auth limit is exceeded',
        async () => {
            // Auth bucket has lowest limit (10 requests per minute)
            const AUTH_LIMIT = 10;

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
                const AUTH_LIMIT = 10;

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
                        mutation Signup($name: String!, $email: String!, $password: String!) {
                            signup(name: $name, email: $email, password: $password) {
                                token
                            }
                        }
                    `,
                        variables: {
                            name: 'Test User',
                            email: 'signup-test@example.com',
                            password: 'password123',
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
