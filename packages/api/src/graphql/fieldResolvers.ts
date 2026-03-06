import { RiderRole } from '@prisma/client';
import { prisma } from '@/db';
import { getSummaryStatus } from '@/utils/summaryStatus';
import { getWeeklyActivity } from '@/utils/weeklyActivity';
import type { Context } from './utils/authGuard';

export const horseFieldResolvers = {
    sessions: (parent: { id: string }) =>
        prisma.session.findMany({ where: { horseId: parent.id } }),
    barn: (parent: { barnId: string }) =>
        prisma.barn.findUniqueOrThrow({ where: { id: parent.barnId } }),
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
    riders: (parent: { id: string }) =>
        prisma.rider.findMany({
            where: { barnId: parent.id },
            omit: { password: true },
        }),
};

export const riderFieldResolvers = {
    sessions: (parent: { id: string }) =>
        prisma.session.findMany({ where: { riderId: parent.id } }),
    barn: (parent: { barnId: string }) =>
        prisma.barn.findUniqueOrThrow({ where: { id: parent.barnId } }),
};

export const sessionFieldResolvers = {
    horse: (parent: { horseId: string }, _: unknown, context: Context) =>
        context.loaders.horse.load(parent.horseId),
    rider: (parent: { riderId: string }, _: unknown, context: Context) =>
        context.loaders.rider.load(parent.riderId),
    // Backwards-compat: older DB rows may have NULL notes, but GraphQL requires String!
    notes: (parent: { notes: string | null }) => parent.notes ?? '',
};
