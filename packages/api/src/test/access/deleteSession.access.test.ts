import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { DELETE_SESSION } from '@/test/queries';

describe('deleteSession access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('deleteSession');
        // Promote userA to trainer
        await prisma.rider.update({
            where: { id: world.userA.riderId },
            data: { role: 'TRAINER' },
        });
    });

    afterAll(async () => {
        await world.teardown();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(DELETE_SESSION, {
            id: world.session.id,
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('returns NOT_FOUND for missing session', async () => {
        const res = await world.userA.gql(DELETE_SESSION, {
            id: 'nonexistent-id',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });

    it('rejects rider deleting another riders session', async () => {
        // world.session is owned by userA; userB is a rider
        const session = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userA.riderId,
                date: new Date(),
                durationMinutes: 30,
                workType: 'FLATWORK',
                notes: 'owned by A, attempted delete by B',
            },
        });

        const res = await world.userB.gql(DELETE_SESSION, {
            id: session.id,
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('allows owner to delete their session', async () => {
        // Create a session owned by userB so they can delete it
        const session = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userB.riderId,
                date: new Date(),
                durationMinutes: 20,
                workType: 'GROUNDWORK',
                notes: 'to be deleted by owner',
            },
        });

        const res = await world.userB.gql<{ deleteSession: boolean }>(
            DELETE_SESSION,
            { id: session.id }
        );

        expect(res.errors).toBeUndefined();
        expect(res.data!.deleteSession).toBe(true);
    });

    it('allows trainer to delete any session', async () => {
        // Create a session owned by userB for trainer (userA) to delete
        const session = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userB.riderId,
                date: new Date(),
                durationMinutes: 25,
                workType: 'TRAIL',
                notes: 'to be deleted by trainer',
            },
        });

        const res = await world.userA.gql<{ deleteSession: boolean }>(
            DELETE_SESSION,
            { id: session.id }
        );

        expect(res.errors).toBeUndefined();
        expect(res.data!.deleteSession).toBe(true);
    });
});
