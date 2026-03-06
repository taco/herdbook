import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { prisma } from '@/db';
import { createApiApp } from '@/server';
import { seedBarn } from '@/test/setupWorld';

const SIGNUP_MUTATION = `
    mutation Signup($name: String!, $email: String!, $password: String!, $inviteCode: String!) {
        signup(name: $name, email: $email, password: $password, inviteCode: $inviteCode) {
            token
        }
    }
`;

describe('Mutation.signup', () => {
    let fastify: FastifyInstance;
    let barnId: string;
    let inviteCode: string;
    const createdRiderEmails: string[] = [];
    const TEST_TIMEOUT_MS = 20_000;

    beforeAll(async () => {
        fastify = await createApiApp();
        const barn = await seedBarn('signup-test-barn');
        barnId = barn.id;
        inviteCode = barn.inviteCode;
    });

    afterAll(async () => {
        if (createdRiderEmails.length > 0) {
            await prisma.rider.deleteMany({
                where: { email: { in: createdRiderEmails } },
            });
        }
        await prisma.barn.delete({ where: { id: barnId } });
        await fastify.close();
        await prisma.$disconnect();
    });

    it(
        'rejects invalid invite code',
        async () => {
            const email = `bad-code-${Date.now()}@example.com`;

            const response = await fastify.inject({
                method: 'POST',
                url: '/graphql',
                headers: { 'content-type': 'application/json' },
                payload: {
                    query: SIGNUP_MUTATION,
                    variables: {
                        name: 'Bad Code Rider',
                        email,
                        password: 'somepassword',
                        inviteCode: 'INVALID',
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
            expect(body.errors?.[0]?.message).toBe('Invalid invite code');
            expect(body.errors?.[0]?.extensions?.code).toBe(
                'INVALID_INVITE_CODE'
            );

            const created = await prisma.rider.findUnique({
                where: { email },
            });
            expect(created).toBeNull();
        },
        TEST_TIMEOUT_MS
    );

    it(
        'creates rider in correct barn',
        async () => {
            const email = `valid-${Date.now()}@example.com`;

            const response = await fastify.inject({
                method: 'POST',
                url: '/graphql',
                headers: { 'content-type': 'application/json' },
                payload: {
                    query: SIGNUP_MUTATION,
                    variables: {
                        name: 'Valid Rider',
                        email,
                        password: 'somepassword',
                        inviteCode,
                    },
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body) as {
                data?: {
                    signup?: { token: string };
                } | null;
                errors?: Array<{
                    message: string;
                    extensions?: { code?: string };
                }>;
            };

            expect(body.errors).toBeUndefined();
            expect(body.data?.signup?.token).toBeTruthy();

            createdRiderEmails.push(email);

            const created = await prisma.rider.findUnique({
                where: { email },
                omit: { password: true },
            });
            expect(created).not.toBeNull();
            expect(created?.barnId).toBe(barnId);
        },
        TEST_TIMEOUT_MS
    );

    it(
        'rejects duplicate email',
        async () => {
            const email = createdRiderEmails[0]!;

            const response = await fastify.inject({
                method: 'POST',
                url: '/graphql',
                headers: { 'content-type': 'application/json' },
                payload: {
                    query: SIGNUP_MUTATION,
                    variables: {
                        name: 'Duplicate Rider',
                        email,
                        password: 'somepassword',
                        inviteCode,
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
            expect(body.errors?.[0]?.message).toBe('Email already in use');
            expect(body.errors?.[0]?.extensions?.code).toBe('EMAIL_IN_USE');
        },
        TEST_TIMEOUT_MS
    );
});
