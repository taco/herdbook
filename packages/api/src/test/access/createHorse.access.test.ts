import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { CREATE_HORSE } from '@/test/queries';

describe('createHorse access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('createHorse');
    });

    afterAll(async () => {
        await world.teardown();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(CREATE_HORSE, {
            name: 'Anon Horse',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('allows authenticated user to create a horse', async () => {
        const res = await world.userA.gql<{
            createHorse: { id: string; name: string };
        }>(CREATE_HORSE, { name: 'createHorse-new' });

        expect(res.errors).toBeUndefined();
        expect(res.data!.createHorse.id).toBeTruthy();
        expect(res.data!.createHorse.name).toBe('createHorse-new');
    });
});
