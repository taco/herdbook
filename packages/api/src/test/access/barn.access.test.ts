import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/db';
import type { World } from '@/test/setupWorld';
import { setupWorld } from '@/test/setupWorld';
import { GET_BARN, UPDATE_BARN, REGENERATE_INVITE_CODE } from '@/test/queries';

describe('barn query', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('barnQuery');
        // Promote userA to trainer for inviteCode visibility tests
        await prisma.rider.update({
            where: { id: world.userA.riderId },
            data: { role: 'TRAINER' },
        });
    });

    afterAll(async () => {
        await world.teardown();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await world.asAnon.gql(GET_BARN);

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('returns barn data for authenticated rider', async () => {
        const res = await world.userB.gql<{
            barn: { id: string; name: string; createdAt: string };
        }>(GET_BARN);

        expect(res.errors).toBeUndefined();
        expect(res.data!.barn.id).toBeTruthy();
        expect(res.data!.barn.name).toContain('barnQuery');
    });

    it('returns riders list', async () => {
        const res = await world.userB.gql<{
            barn: { riders: Array<{ id: string; name: string }> };
        }>(GET_BARN);

        expect(res.errors).toBeUndefined();
        expect(res.data!.barn.riders.length).toBeGreaterThanOrEqual(2);
    });

    it('hides inviteCode from riders', async () => {
        const res = await world.userB.gql<{
            barn: { inviteCode: string | null };
        }>(GET_BARN);

        expect(res.errors).toBeUndefined();
        expect(res.data!.barn.inviteCode).toBeNull();
    });

    it('shows inviteCode to trainers', async () => {
        const res = await world.userA.gql<{
            barn: { inviteCode: string | null };
        }>(GET_BARN);

        expect(res.errors).toBeUndefined();
        expect(res.data!.barn.inviteCode).toBeTruthy();
    });
});

describe('updateBarn', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('updateBarn');
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
        const res = await world.asAnon.gql(UPDATE_BARN, {
            name: 'New Name',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects rider role', async () => {
        const res = await world.userB.gql(UPDATE_BARN, {
            name: 'Rider Rename',
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('allows trainer to rename', async () => {
        const res = await world.userA.gql<{
            updateBarn: { id: string; name: string };
        }>(UPDATE_BARN, { name: 'Renamed Barn' });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateBarn.name).toBe('Renamed Barn');
    });

    it('trims whitespace from name', async () => {
        const res = await world.userA.gql<{
            updateBarn: { name: string };
        }>(UPDATE_BARN, { name: '  Trimmed Barn  ' });

        expect(res.errors).toBeUndefined();
        expect(res.data!.updateBarn.name).toBe('Trimmed Barn');
    });

    it('rejects empty/whitespace name', async () => {
        const res = await world.userA.gql(UPDATE_BARN, { name: '   ' });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('BAD_USER_INPUT');
    });

    it('rejects name exceeding 100 characters', async () => {
        const res = await world.userA.gql(UPDATE_BARN, {
            name: 'A'.repeat(101),
        });

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('BAD_USER_INPUT');
    });
});

describe('regenerateInviteCode', () => {
    let world: World;

    beforeAll(async () => {
        world = await setupWorld('regenCode');
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
        const res = await world.asAnon.gql(REGENERATE_INVITE_CODE);

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects rider role', async () => {
        const res = await world.userB.gql(REGENERATE_INVITE_CODE);

        expect(res.errors).toBeDefined();
        expect(res.errors![0].extensions?.code).toBe('FORBIDDEN');
    });

    it('returns new code for trainer', async () => {
        const res = await world.userA.gql<{
            regenerateInviteCode: { id: string; inviteCode: string };
        }>(REGENERATE_INVITE_CODE);

        expect(res.errors).toBeUndefined();
        expect(res.data!.regenerateInviteCode.inviteCode).toBeTruthy();
        expect(res.data!.regenerateInviteCode.inviteCode).toHaveLength(8);
    });

    it('new code differs from old code', async () => {
        const first = await world.userA.gql<{
            regenerateInviteCode: { inviteCode: string };
        }>(REGENERATE_INVITE_CODE);

        const second = await world.userA.gql<{
            regenerateInviteCode: { inviteCode: string };
        }>(REGENERATE_INVITE_CODE);

        expect(first.data!.regenerateInviteCode.inviteCode).not.toBe(
            second.data!.regenerateInviteCode.inviteCode
        );
    });
});
