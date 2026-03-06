import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { CREATE_SESSION } from '@/test/queries';

const validSessionVars = (horseId: string) => ({
    horseId,
    date: new Date().toISOString(),
    durationMinutes: 30,
    workType: 'FLATWORK',
    notes: 'Test session',
});

describe('createSession access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('createSession');
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
        const res = await world.asAnon.gql(
            CREATE_SESSION,
            validSessionVars(world.horse.id)
        );

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('allows rider to create a session for self', async () => {
        const res = await world.userB.gql<{
            createSession: { id: string; workType: string };
        }>(CREATE_SESSION, validSessionVars(world.horse.id));

        expect(res.errors).toBeUndefined();
        expect(res.data!.createSession.id).toBeTruthy();
        expect(res.data!.createSession.workType).toBe('FLATWORK');
    });

    it('rejects rider specifying another riders id', async () => {
        const res = await world.userB.gql(CREATE_SESSION, {
            ...validSessionVars(world.horse.id),
            riderId: world.userA.riderId,
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('allows trainer to create session for another rider', async () => {
        const res = await world.userA.gql<{
            createSession: { id: string };
        }>(CREATE_SESSION, {
            ...validSessionVars(world.horse.id),
            riderId: world.userB.riderId,
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.createSession.id).toBeTruthy();
    });

    it('rejects invalid rating', async () => {
        const res = await world.userA.gql(CREATE_SESSION, {
            ...validSessionVars(world.horse.id),
            rating: 6,
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('BAD_USER_INPUT');
    });
});
