import { RiderRole } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { getSummaryStatus } from '@/utils/summaryStatus';
import { getWeeklyActivity } from '@/utils/weeklyActivity';
import type { Context } from './utils/authGuard';

const loadBarn = (barnId: string, context: Context) =>
    context.loaders.barn.load(barnId).then((b) => {
        if (!b)
            throw new GraphQLError('Barn not found', {
                extensions: { code: 'NOT_FOUND' },
            });
        return b;
    });

export const horseFieldResolvers = {
    sessions: (parent: { id: string }, _: unknown, context: Context) =>
        context.loaders.sessionsByHorseId.load(parent.id),
    barn: (parent: { barnId: string }, _: unknown, context: Context) =>
        loadBarn(parent.barnId, context),
    summary: async (parent: {
        id: string;
        summaryContent: string | null;
        summaryGeneratedAt: Date | null;
    }) => {
        if (!parent.summaryContent || !parent.summaryGeneratedAt) return null;

        const { stale, refreshAvailableAt } = await getSummaryStatus(
            parent.id,
            parent.summaryGeneratedAt
        );

        return {
            content: parent.summaryContent,
            generatedAt: parent.summaryGeneratedAt,
            stale,
            refreshAvailableAt,
        };
    },
    activity: async (parent: { id: string }, args: { weeks?: number }) =>
        getWeeklyActivity(parent.id, args.weeks ?? 4),
};

export const barnFieldResolvers = {
    inviteCode: (
        parent: { inviteCode: string },
        _: unknown,
        context: Context
    ) => (context.rider?.role === RiderRole.TRAINER ? parent.inviteCode : null),
    riders: (parent: { id: string }, _: unknown, context: Context) =>
        context.loaders.ridersByBarnId.load(parent.id),
};

export const riderFieldResolvers = {
    sessions: (parent: { id: string }, _: unknown, context: Context) =>
        context.loaders.sessionsByRiderId.load(parent.id),
    barn: (parent: { barnId: string }, _: unknown, context: Context) =>
        loadBarn(parent.barnId, context),
};

export const sessionFieldResolvers = {
    horse: (parent: { horseId: string }, _: unknown, context: Context) =>
        context.loaders.horse.load(parent.horseId),
    rider: (parent: { riderId: string }, _: unknown, context: Context) =>
        context.loaders.rider.load(parent.riderId),
    // Backwards-compat: older DB rows may have NULL notes, but GraphQL requires String!
    notes: (parent: { notes: string | null }) => parent.notes ?? '',
};
