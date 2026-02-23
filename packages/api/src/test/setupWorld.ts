import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';

import { prisma } from '@/db';
import { getJwtSecretOrThrow } from '@/config';
import { createApiApp } from '@/server';
import { generateInviteCode } from '@/utils/inviteCode';

// ── Types ────────────────────────────────────────────────────────────

type GqlResponse<T = Record<string, unknown>> = {
    data?: T;
    errors?: Array<{
        message: string;
        extensions?: { code?: string };
    }>;
};

export type Actor = {
    riderId: string;
    gql: <T = Record<string, unknown>>(
        query: string,
        variables?: Record<string, unknown>
    ) => Promise<GqlResponse<T>>;
};

export type AnonActor = {
    gql: <T = Record<string, unknown>>(
        query: string,
        variables?: Record<string, unknown>
    ) => Promise<GqlResponse<T>>;
};

export type World = {
    barnId: string;
    userA: Actor;
    userB: Actor;
    asAnon: AnonActor;
    horse: { id: string; name: string };
    session: { id: string };
    teardown: () => Promise<void>;
};

// ── Helpers ──────────────────────────────────────────────────────────

function makeGql(
    fastify: FastifyInstance,
    token?: string
): <T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>
) => Promise<GqlResponse<T>> {
    return async <T = Record<string, unknown>>(
        query: string,
        variables?: Record<string, unknown>
    ): Promise<GqlResponse<T>> => {
        const headers: Record<string, string> = {
            'content-type': 'application/json',
        };
        if (token) {
            headers.authorization = `Bearer ${token}`;
        }

        const response = await fastify.inject({
            method: 'POST',
            url: '/graphql',
            headers,
            payload: { query, variables },
        });

        return JSON.parse(response.body) as GqlResponse<T>;
    };
}

async function seedRider(
    suiteId: string,
    label: string,
    barnId: string
): Promise<{ id: string; token: string }> {
    const email = `${suiteId}-${label}-${Date.now()}@test.herdbook`;
    const hashedPassword = await bcrypt.hash('testpassword', 10);

    const rider = await prisma.rider.create({
        data: {
            name: `${suiteId} ${label}`,
            email,
            password: hashedPassword,
            barnId,
        },
    });

    const token = jwt.sign({ riderId: rider.id }, getJwtSecretOrThrow(), {
        expiresIn: '1h',
    });

    return { id: rider.id, token };
}

// ── Shared helpers ───────────────────────────────────────────────────

export async function seedBarn(
    name: string
): Promise<{ id: string; name: string }> {
    return prisma.barn.create({
        data: {
            name,
            inviteCode: generateInviteCode(),
        },
    });
}

// ── Main ─────────────────────────────────────────────────────────────

export async function setupWorld(suiteId: string): Promise<World> {
    const fastify = await createApiApp();

    const barn = await seedBarn(`${suiteId}-barn`);

    // Seed two users
    const riderA = await seedRider(suiteId, 'a', barn.id);
    const riderB = await seedRider(suiteId, 'b', barn.id);

    // Seed a horse
    const horse = await prisma.horse.create({
        data: { name: `${suiteId}-horse`, barnId: barn.id },
    });

    // Seed a session owned by userA
    const session = await prisma.session.create({
        data: {
            horseId: horse.id,
            riderId: riderA.id,
            date: new Date(),
            durationMinutes: 45,
            workType: 'FLATWORK',
            notes: `${suiteId} seed session`,
        },
    });

    const userA: Actor = {
        riderId: riderA.id,
        gql: makeGql(fastify, riderA.token),
    };

    const userB: Actor = {
        riderId: riderB.id,
        gql: makeGql(fastify, riderB.token),
    };

    const asAnon: AnonActor = {
        gql: makeGql(fastify),
    };

    async function teardown(): Promise<void> {
        // Delete sessions first (FK → horse, rider)
        await prisma.session.deleteMany({
            where: {
                riderId: { in: [riderA.id, riderB.id] },
            },
        });

        // Delete seed horse + any horses whose name starts with this suiteId
        await prisma.horse.deleteMany({
            where: {
                OR: [{ id: horse.id }, { name: { startsWith: `${suiteId}-` } }],
            },
        });

        // Delete riders
        await prisma.rider.deleteMany({
            where: {
                id: { in: [riderA.id, riderB.id] },
            },
        });

        // Delete the test barn
        await prisma.barn.delete({ where: { id: barn.id } });

        await fastify.close();
        await prisma.$disconnect();
    }

    return {
        barnId: barn.id,
        userA,
        userB,
        asAnon,
        horse: { id: horse.id, name: horse.name },
        session: { id: session.id },
        teardown,
    };
}
