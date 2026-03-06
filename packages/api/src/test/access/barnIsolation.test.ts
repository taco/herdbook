import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';

import { prisma } from '@/db';
import { getJwtSecretOrThrow } from '@/config';
import { createApiApp } from '@/server';
import { seedBarn } from '@/test/setupWorld';
import {
    GET_HORSES,
    GET_RIDERS,
    GET_SESSIONS,
    GET_HORSE,
    GET_SESSION,
    GET_LAST_SESSION_FOR_HORSE,
    CREATE_SESSION,
    UPDATE_HORSE,
    UPDATE_SESSION,
    DELETE_SESSION,
} from '@/test/queries';

type GqlResponse<T = Record<string, unknown>> = {
    data?: T;
    errors?: Array<{
        message: string;
        extensions?: { code?: string };
    }>;
};

function makeGql(
    fastify: FastifyInstance,
    token: string
): <T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>
) => Promise<GqlResponse<T>> {
    return async <T = Record<string, unknown>>(
        query: string,
        variables?: Record<string, unknown>
    ): Promise<GqlResponse<T>> => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            payload: { query, variables },
        });
        return JSON.parse(response.body) as GqlResponse<T>;
    };
}

describe('cross-barn isolation', () => {
    let fastify: FastifyInstance;

    // Barn A entities
    let barnAId: string;
    let riderAId: string;
    let gqlA: ReturnType<typeof makeGql>;
    let horseAId: string;
    let sessionAId: string;

    // Barn B entities
    let barnBId: string;
    let riderBId: string;
    let gqlB: ReturnType<typeof makeGql>;
    let horseBId: string;
    let sessionBId: string;

    beforeAll(async () => {
        fastify = await createApiApp();

        // Create two barns
        const barnA = await seedBarn('isolation-barn-a');
        const barnB = await seedBarn('isolation-barn-b');
        barnAId = barnA.id;
        barnBId = barnB.id;

        const hashedPassword = await bcrypt.hash('testpassword', 10);

        // Seed rider+horse+session in each barn
        const riderA = await prisma.rider.create({
            data: {
                name: 'Isolation A',
                email: `isolation-a-${Date.now()}@test.herdbook`,
                password: hashedPassword,
                barnId: barnAId,
                role: 'TRAINER',
            },
        });
        riderAId = riderA.id;
        const tokenA = jwt.sign({ riderId: riderA.id }, getJwtSecretOrThrow(), {
            expiresIn: '1h',
        });
        gqlA = makeGql(fastify, tokenA);

        const riderB = await prisma.rider.create({
            data: {
                name: 'Isolation B',
                email: `isolation-b-${Date.now()}@test.herdbook`,
                password: hashedPassword,
                barnId: barnBId,
                role: 'TRAINER',
            },
        });
        riderBId = riderB.id;
        const tokenB = jwt.sign({ riderId: riderB.id }, getJwtSecretOrThrow(), {
            expiresIn: '1h',
        });
        gqlB = makeGql(fastify, tokenB);

        const horseA = await prisma.horse.create({
            data: { name: 'isolation-horse-a', barnId: barnAId },
        });
        horseAId = horseA.id;

        const horseB = await prisma.horse.create({
            data: { name: 'isolation-horse-b', barnId: barnBId },
        });
        horseBId = horseB.id;

        const sessionA = await prisma.session.create({
            data: {
                horseId: horseAId,
                riderId: riderAId,
                date: new Date(),
                durationMinutes: 30,
                workType: 'FLATWORK',
                notes: 'barn A session',
            },
        });
        sessionAId = sessionA.id;

        const sessionB = await prisma.session.create({
            data: {
                horseId: horseBId,
                riderId: riderBId,
                date: new Date(),
                durationMinutes: 30,
                workType: 'FLATWORK',
                notes: 'barn B session',
            },
        });
        sessionBId = sessionB.id;
    });

    afterAll(async () => {
        await prisma.session.deleteMany({
            where: { riderId: { in: [riderAId, riderBId] } },
        });
        await prisma.horse.deleteMany({
            where: { id: { in: [horseAId, horseBId] } },
        });
        await prisma.rider.deleteMany({
            where: { id: { in: [riderAId, riderBId] } },
        });
        await prisma.barn.deleteMany({
            where: { id: { in: [barnAId, barnBId] } },
        });
        await fastify.close();
        await prisma.$disconnect();
    });

    // ── List isolation ────────────────────────────────────────────────

    it('horses list excludes other barn', async () => {
        const res = await gqlA<{ horses: Array<{ id: string }> }>(GET_HORSES);
        const ids = res.data!.horses.map((h) => h.id);
        expect(ids).toContain(horseAId);
        expect(ids).not.toContain(horseBId);
    });

    it('riders list excludes other barn', async () => {
        const res = await gqlA<{ riders: Array<{ id: string }> }>(GET_RIDERS);
        const ids = res.data!.riders.map((r) => r.id);
        expect(ids).toContain(riderAId);
        expect(ids).not.toContain(riderBId);
    });

    it('sessions list excludes other barn', async () => {
        const res = await gqlA<{ sessions: Array<{ id: string }> }>(
            GET_SESSIONS,
            { limit: 100 }
        );
        const ids = res.data!.sessions.map((s) => s.id);
        expect(ids).toContain(sessionAId);
        expect(ids).not.toContain(sessionBId);
    });

    // ── Lookup isolation ──────────────────────────────────────────────

    it('horse lookup returns null for other barn', async () => {
        const res = await gqlA<{ horse: { id: string } | null }>(GET_HORSE, {
            id: horseBId,
        });
        expect(res.errors).toBeUndefined();
        expect(res.data!.horse).toBeNull();
    });

    it('session lookup returns null for other barn', async () => {
        const res = await gqlA<{ session: { id: string } | null }>(
            GET_SESSION,
            { id: sessionBId }
        );
        expect(res.errors).toBeUndefined();
        expect(res.data!.session).toBeNull();
    });

    it('lastSessionForHorse returns null for other barn', async () => {
        const res = await gqlA<{
            lastSessionForHorse: { id: string } | null;
        }>(GET_LAST_SESSION_FOR_HORSE, { horseId: horseBId });
        expect(res.errors).toBeUndefined();
        expect(res.data!.lastSessionForHorse).toBeNull();
    });

    // ── Mutation isolation ────────────────────────────────────────────

    it('updateHorse rejects cross-barn horse', async () => {
        const res = await gqlA(UPDATE_HORSE, {
            id: horseBId,
            name: 'hacked',
        });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });

    it('createSession rejects cross-barn horse', async () => {
        const res = await gqlA(CREATE_SESSION, {
            horseId: horseBId,
            date: new Date().toISOString(),
            durationMinutes: 30,
            workType: 'FLATWORK',
            notes: 'cross-barn attempt',
        });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });

    it('updateSession rejects cross-barn session', async () => {
        const res = await gqlA(UPDATE_SESSION, {
            id: sessionBId,
            notes: 'hacked',
        });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });

    it('deleteSession rejects cross-barn session', async () => {
        const res = await gqlA(DELETE_SESSION, { id: sessionBId });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });
});
