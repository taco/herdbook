import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { prisma } from '@/db';
import { createApiApp } from '@/server';

describe('Mutation.signup', () => {
    let fastify: FastifyInstance;
    let prevAllowedEmails: string | undefined;
    const createdRiderEmails: string[] = [];
    const TEST_TIMEOUT_MS = 20_000;

    beforeAll(async () => {
        prevAllowedEmails = process.env.ALLOWED_EMAILS;
        fastify = await createApiApp();
    });

    afterAll(async () => {
        if (createdRiderEmails.length > 0) {
            await prisma.rider.deleteMany({
                where: { email: { in: createdRiderEmails } },
            });
        }

        if (prevAllowedEmails === undefined) {
            delete process.env.ALLOWED_EMAILS;
        } else {
            process.env.ALLOWED_EMAILS = prevAllowedEmails;
        }

        await fastify.close();
        await prisma.$disconnect();
    });

    it(
        'rejects signup when email is not in ALLOWED_EMAILS',
        async () => {
            process.env.ALLOWED_EMAILS = 'allowed@example.com';
            const blockedEmail = `blocked-${Date.now()}@example.com`;

            const response = await fastify.inject({
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
                            rider { id name email }
                        }
                    }
                `,
                    variables: {
                        name: 'Blocked Rider',
                        email: blockedEmail,
                        password: 'somepassword',
                    },
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body) as {
                data?: unknown;
                errors?: Array<{
                    message: string;
                    extensions?: { code?: string };
                }>;
            };

            expect(body.data).toBeNull();
            expect(body.errors?.[0]?.message).toBe('Email not allowed');
            expect(body.errors?.[0]?.extensions?.code).toBe(
                'EMAIL_NOT_ALLOWED'
            );

            const created = await prisma.rider.findUnique({
                where: { email: blockedEmail },
            });
            expect(created).toBeNull();
        },
        TEST_TIMEOUT_MS
    );

    it(
        'allows signup when email is in ALLOWED_EMAILS',
        async () => {
            const allowedEmail = `allowed-${Date.now()}@example.com`;
            process.env.ALLOWED_EMAILS = allowedEmail;

            const response = await fastify.inject({
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
                            rider { id name email }
                        }
                    }
                `,
                    variables: {
                        name: 'Allowed Rider',
                        email: allowedEmail,
                        password: 'somepassword',
                    },
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body) as {
                data?: {
                    signup?: {
                        token: string;
                        rider: { id: string; name: string; email: string };
                    };
                } | null;
                errors?: Array<{
                    message: string;
                    extensions?: { code?: string };
                }>;
            };

            expect(body.errors).toBeUndefined();
            expect(body.data?.signup?.token).toBeTruthy();
            expect(body.data?.signup?.rider).toBeDefined();
            expect(body.data?.signup?.rider.email).toBe(allowedEmail);
            expect(body.data?.signup?.rider.name).toBe('Allowed Rider');

            createdRiderEmails.push(allowedEmail);

            const created = await prisma.rider.findUnique({
                where: { email: allowedEmail },
                omit: { password: true },
            });
            expect(created).not.toBeNull();
            expect(created?.email).toBe(allowedEmail);
        },
        TEST_TIMEOUT_MS
    );
});
