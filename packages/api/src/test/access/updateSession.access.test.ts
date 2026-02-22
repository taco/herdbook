import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { UPDATE_SESSION } from '@/test/queries';

describe('updateSession access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('updateSession');
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

    it('allows authenticated user to update a session', async () => {
        const res = await world.userA.gql<{
            updateSession: { id: string; notes: string };
        }>(UPDATE_SESSION, {
            id: world.session.id,
            notes: 'Updated notes',
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateSession.notes).toBe('Updated notes');
    });

    // Documents current behavior: no ownership check.
    // PR #77 will add ownership enforcement and flip this to expect rejection.
    it('allows userB to update userA session (no ownership check yet)', async () => {
        const res = await world.userB.gql<{
            updateSession: { id: string; notes: string };
        }>(UPDATE_SESSION, {
            id: world.session.id,
            notes: 'Updated by B',
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateSession.notes).toBe('Updated by B');
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
