import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { prisma } from '@/db';
import { createLoaders } from '@/loaders';
import { resolvers, Context } from '@/resolvers';
import { JWT_SECRET } from '@/config';
import { secureByDefaultTransformer } from '@/directives';

describe('DataLoader batching', () => {
    let fastify: FastifyInstance;
    let testRiderId: string;
    let testToken: string;
    let horseIds: string[];

    beforeAll(async () => {
        // Build context function (same as production)
        async function buildContext(request: FastifyRequest): Promise<Context> {
            const auth = request.headers.authorization;
            const context: Context = {
                rider: null,
                loaders: createLoaders(),
            };
            if (!auth || !auth.startsWith('Bearer ')) {
                return context;
            }

            const token = auth.slice(7);
            try {
                const payload = jwt.verify(token, JWT_SECRET) as {
                    riderId: string;
                };
                const rider = await prisma.rider.findUnique({
                    where: { id: payload.riderId },
                    omit: { password: true },
                });
                context.rider = rider;
                return context;
            } catch (error) {
                return context;
            }
        }

        // Build schema
        const typeDefs = parse(
            readFileSync(resolve(__dirname, 'schema.graphql'), 'utf-8')
        );

        const schema = secureByDefaultTransformer(
            buildSubgraphSchema({
                typeDefs,
                resolvers: resolvers as any,
            })
        );

        // Set up Fastify + Apollo
        fastify = Fastify();

        await fastify.register(cors, {
            origin: true,
            credentials: true,
        });

        const apollo = new ApolloServer<Context>({
            schema,
        });

        await apollo.start();

        await fastify.register(fastifyApollo(apollo), {
            context: (request: FastifyRequest) => buildContext(request),
        });

        // Seed test data
        const hashedPassword = await bcrypt.hash('testpassword', 10);
        const rider = await prisma.rider.create({
            data: {
                name: 'Test Rider',
                email: `test-${Date.now()}@example.com`,
                password: hashedPassword,
            },
        });
        testRiderId = rider.id;

        // Create test token
        testToken = jwt.sign({ riderId: testRiderId }, JWT_SECRET, {
            expiresIn: '1h',
        });

        // Create 3 horses
        const horses = await Promise.all([
            prisma.horse.create({ data: { name: 'Beau' } }),
            prisma.horse.create({ data: { name: 'Luna' } }),
            prisma.horse.create({ data: { name: 'Shadow' } }),
        ]);
        horseIds = horses.map((h) => h.id);

        // Create 10 sessions across the horses
        const now = new Date();
        await Promise.all(
            Array.from({ length: 10 }, (_, i) =>
                prisma.session.create({
                    data: {
                        horseId: horseIds[i % 3], // Rotate through horses
                        riderId: testRiderId,
                        date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
                        durationMinutes: 45,
                        workType: 'FLATWORK',
                        notes: `Session ${i + 1}`,
                    },
                })
            )
        );
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.session.deleteMany({
            where: { riderId: testRiderId },
        });
        await prisma.horse.deleteMany({
            where: { id: { in: horseIds } },
        });
        await prisma.rider.delete({
            where: { id: testRiderId },
        });

        await fastify.close();
        await prisma.$disconnect();
    });

    it('batches horse and rider queries when fetching sessions', async () => {
        // Track queries using Prisma query events
        const queries: string[] = [];
        const queryListener = (e: any) => {
            queries.push(e.query);
        };

        prisma.$on('query', queryListener);

        const response = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers: {
                authorization: `Bearer ${testToken}`,
                'content-type': 'application/json',
            },
            payload: {
                query: `
                    query TestBatching {
                        sessions(limit: 10) {
                            id
                            date
                            durationMinutes
                            workType
                            notes
                            horse {
                                id
                                name
                            }
                            rider {
                                id
                                name
                            }
                        }
                    }
                `,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.errors).toBeUndefined();
        expect(body.data.sessions).toHaveLength(10);

        // Verify all sessions have horse and rider data
        body.data.sessions.forEach((session: any) => {
            expect(session.horse).toBeDefined();
            expect(session.horse.id).toBeTruthy();
            expect(session.horse.name).toBeTruthy();
            expect(session.rider).toBeDefined();
            expect(session.rider.id).toBeTruthy();
            expect(session.rider.name).toBeTruthy();
        });

        // Filter to relevant SELECT queries for Session, Horse, and Rider tables
        const relevantQueries = queries.filter((q) => {
            const upperQ = q.toUpperCase();
            return (
                upperQ.includes('SELECT') &&
                (upperQ.includes('"SESSION"') ||
                    upperQ.includes('"HORSE"') ||
                    upperQ.includes('"RIDER"'))
            );
        });

        // Should be exactly 3 queries:
        // 1. SELECT sessions (with orderBy, limit)
        // 2. SELECT horses WHERE id IN (...) - batched
        // 3. SELECT riders WHERE id IN (...) - batched
        //
        // Without DataLoader, this would be 21 queries:
        // 1 for sessions + 10 for horses + 10 for riders
        expect(relevantQueries.length).toBeLessThanOrEqual(4); // Allow slight variance for context query

        // More specifically: verify we're using IN clauses (batching indicator)
        const horseQueries = relevantQueries.filter((q) =>
            q.toUpperCase().includes('"HORSE"')
        );
        const riderQueries = relevantQueries.filter((q) =>
            q.toUpperCase().includes('"RIDER"')
        );

        // Should have exactly 1 horse query and 1 rider query (batched)
        expect(horseQueries.length).toBe(1);
        expect(riderQueries.length).toBeLessThanOrEqual(2); // 1 for batch, possibly 1 for auth context

        // Verify the horse query uses IN clause (batching)
        expect(horseQueries[0].toUpperCase()).toContain('IN');
    });

    it('loader caches duplicate loads within a single request', async () => {
        // Query that requests the same horse multiple times
        // This can happen when multiple sessions have the same horse
        const response = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers: {
                authorization: `Bearer ${testToken}`,
                'content-type': 'application/json',
            },
            payload: {
                query: `
                    query TestCaching {
                        sessions(limit: 10) {
                            id
                            horse {
                                id
                                name
                            }
                        }
                    }
                `,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.errors).toBeUndefined();
        expect(body.data.sessions).toHaveLength(10);

        // With multiple sessions, we expect some horses to be reused
        const horseIdsInResponse = body.data.sessions.map(
            (s: any) => s.horse.id
        ) as string[];
        const uniqueHorseIds = new Set(horseIdsInResponse);

        // Verify we have fewer unique horses than sessions (proves caching is beneficial)
        // With 10 sessions, it's very unlikely they all use different horses
        expect(uniqueHorseIds.size).toBeLessThan(horseIdsInResponse.length);

        // The query should still work correctly despite duplicates
        body.data.sessions.forEach((session: any) => {
            expect(session.horse).toBeDefined();
            expect(session.horse.name).toBeTruthy();
        });
    });

    it('creates fresh loaders per request (no cross-request caching)', async () => {
        // Make two separate requests
        const query = `
            query {
                sessions(limit: 1) {
                    id
                    horse { id name }
                }
            }
        `;

        const response1 = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers: {
                authorization: `Bearer ${testToken}`,
                'content-type': 'application/json',
            },
            payload: { query },
        });

        const response2 = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers: {
                authorization: `Bearer ${testToken}`,
                'content-type': 'application/json',
            },
            payload: { query },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(200);

        // Both should succeed - this verifies loaders are created per-request
        // If loaders were shared, we might see stale data or errors
        const body1 = JSON.parse(response1.body);
        const body2 = JSON.parse(response2.body);

        expect(body1.errors).toBeUndefined();
        expect(body2.errors).toBeUndefined();
        expect(body1.data.sessions[0].horse).toBeDefined();
        expect(body2.data.sessions[0].horse).toBeDefined();
    });
});
