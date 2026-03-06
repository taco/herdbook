import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { UPDATE_SESSION } from '@/test/queries';

describe('updateSession access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('updateSession');
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
        const res = await world.asAnon.gql(UPDATE_SESSION, {
            id: world.session.id,
            notes: 'Hacked notes',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('allows owner to update their session', async () => {
        const res = await world.userA.gql<{
            updateSession: { id: string; notes: string };
        }>(UPDATE_SESSION, {
            id: world.session.id,
            notes: 'Updated by owner',
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateSession.notes).toBe('Updated by owner');
    });

    it('rejects rider updating another riders session', async () => {
        const res = await world.userB.gql(UPDATE_SESSION, {
            id: world.session.id,
            notes: 'Attempted by B',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('allows trainer to update any session', async () => {
        // Create a session owned by userB
        const sessionB = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userB.riderId,
                date: new Date(),
                durationMinutes: 30,
                workType: 'FLATWORK',
                notes: 'owned by B',
            },
        });

        const res = await world.userA.gql<{
            updateSession: { id: string; notes: string };
        }>(UPDATE_SESSION, {
            id: sessionB.id,
            notes: 'Updated by trainer',
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateSession.notes).toBe('Updated by trainer');
    });

    it('returns NOT_FOUND for missing session', async () => {
        const res = await world.userA.gql(UPDATE_SESSION, {
            id: 'nonexistent-id',
            notes: 'Ghost',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });
});
