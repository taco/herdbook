import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

    it('allows authenticated user to create a session', async () => {
        const res = await world.userA.gql<{
            createSession: { id: string; workType: string };
        }>(CREATE_SESSION, validSessionVars(world.horse.id));

        expect(res.errors).toBeUndefined();
        expect(res.data!.createSession.id).toBeTruthy();
        expect(res.data!.createSession.workType).toBe('FLATWORK');
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
