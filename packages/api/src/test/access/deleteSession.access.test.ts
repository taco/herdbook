import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { DELETE_SESSION } from '@/test/queries';

describe('deleteSession access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('deleteSession');
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

    // Documents current behavior: no ownership check.
    // PR #77 will add ownership enforcement and flip this to expect rejection.
    it('allows userB to delete userA session (no ownership check yet)', async () => {
        // Create a session owned by userA for userB to delete
        const session = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userA.riderId,
                date: new Date(),
                durationMinutes: 30,
                workType: 'FLATWORK',
                notes: 'owned by A, deleted by B',
            },
        });

        const res = await world.userB.gql<{ deleteSession: boolean }>(
            DELETE_SESSION,
            { id: session.id }
        );

        expect(res.errors).toBeUndefined();
        expect(res.data!.deleteSession).toBe(true);
    });

    it('allows authenticated user to delete a session', async () => {
        // Create a disposable session to delete
        const session = await prisma.session.create({
            data: {
                horseId: world.horse.id,
                riderId: world.userA.riderId,
                date: new Date(),
                durationMinutes: 20,
                workType: 'GROUNDWORK',
                notes: 'to be deleted',
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
