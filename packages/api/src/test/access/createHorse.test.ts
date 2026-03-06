import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { CREATE_HORSE } from '@/test/queries';

describe('createHorse access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('createHorse');
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
        const res = await world.asAnon.gql(CREATE_HORSE, {
            name: 'Anon Horse',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects rider role', async () => {
        const res = await world.userB.gql(CREATE_HORSE, {
            name: 'createHorse-rider-attempt',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('allows trainer to create a horse', async () => {
        const res = await world.userA.gql<{
            createHorse: { id: string; name: string };
        }>(CREATE_HORSE, { name: 'createHorse-new' });

        expect(res.errors).toBeUndefined();
        expect(res.data!.createHorse.id).toBeTruthy();
        expect(res.data!.createHorse.name).toBe('createHorse-new');
    });
});
