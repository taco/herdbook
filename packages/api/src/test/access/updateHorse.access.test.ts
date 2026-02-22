import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { UPDATE_HORSE } from '@/test/queries';

describe('updateHorse access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('updateHorse');
    });

    afterAll(async () => {
        await world.teardown();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(UPDATE_HORSE, {
            id: world.horse.id,
            name: 'Hacked Name',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('allows authenticated user to update a horse', async () => {
        const res = await world.userA.gql<{
            updateHorse: { id: string; name: string };
        }>(UPDATE_HORSE, {
            id: world.horse.id,
            name: 'Updated Name',
        });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateHorse.name).toBe('Updated Name');
    });

    it('returns NOT_FOUND for missing horse', async () => {
        const res = await world.userA.gql(UPDATE_HORSE, {
            id: 'nonexistent-id',
            name: 'Ghost',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('NOT_FOUND');
    });
});
