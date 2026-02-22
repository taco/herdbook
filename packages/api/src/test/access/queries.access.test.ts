import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import {
    GET_HORSES,
    GET_RIDERS,
    GET_SESSIONS,
    GET_HORSE,
    GET_SESSION,
} from '@/test/queries';

describe('read queries access', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('queries');
    });

    afterAll(async () => {
        await world.teardown();
    });

    // ── Unauthenticated ──────────────────────────────────────────────

    it('horses rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_HORSES);
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('riders rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_RIDERS);
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('sessions rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_SESSIONS, { limit: 5 });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('horse rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_HORSE, { id: world.horse.id });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('session rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_SESSION, {
            id: world.session.id,
        });
        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    // ── Authenticated ────────────────────────────────────────────────

    it('horses returns data for authenticated user', async () => {
        const res = await world.userA.gql<{
            horses: Array<{ id: string; name: string }>;
        }>(GET_HORSES);

        expect(res.errors).toBeUndefined();
        expect(Array.isArray(res.data!.horses)).toBe(true);
    });

    it('riders returns data for authenticated user', async () => {
        const res = await world.userA.gql<{
            riders: Array<{ id: string; name: string }>;
        }>(GET_RIDERS);

        expect(res.errors).toBeUndefined();
        expect(Array.isArray(res.data!.riders)).toBe(true);
    });

    it('sessions returns data for authenticated user', async () => {
        const res = await world.userA.gql<{
            sessions: Array<{ id: string }>;
        }>(GET_SESSIONS, { limit: 5 });

        expect(res.errors).toBeUndefined();
        expect(Array.isArray(res.data!.sessions)).toBe(true);
    });

    it('horse returns data for authenticated user', async () => {
        const res = await world.userA.gql<{
            horse: { id: string; name: string } | null;
        }>(GET_HORSE, { id: world.horse.id });

        expect(res.errors).toBeUndefined();
        expect(res.data!.horse).toBeDefined();
        expect(res.data!.horse!.id).toBe(world.horse.id);
    });

    // TODO(#85): sessions query is unscoped — will be barn-scoped
    it('sessions returns other riders data (unscoped query)', async () => {
        const res = await world.userB.gql<{
            sessions: Array<{ id: string }>;
        }>(GET_SESSIONS, { limit: 100 });

        expect(res.errors).toBeUndefined();
        // userB can see userA's seed session
        const ids = res.data!.sessions.map((s) => s.id);
        expect(ids).toContain(world.session.id);
    });

    it('session returns data for authenticated user', async () => {
        const res = await world.userA.gql<{
            session: { id: string } | null;
        }>(GET_SESSION, { id: world.session.id });

        expect(res.errors).toBeUndefined();
        expect(res.data!.session).toBeDefined();
        expect(res.data!.session!.id).toBe(world.session.id);
    });
});
