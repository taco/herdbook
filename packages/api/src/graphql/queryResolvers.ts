import { WorkType, Prisma } from '@prisma/client';
import { prisma } from '@/db';
import { getBarnId } from './utils/authGuard';
import type { GqlLimiters } from './utils/gqlRateLimit';
import { wrapResolver } from './utils/resolverWrapper';

export function buildQueryResolvers(
    limiters: GqlLimiters
): Record<string, unknown> {
    return {
        me: wrapResolver(limiters, 'read', async (_, __, context) => {
            return context.rider!;
        }),
        barn: wrapResolver(limiters, 'read', async (_, __, context) => {
            return prisma.barn.findUniqueOrThrow({
                where: { id: context.rider!.barnId },
            });
        }),
        horses: wrapResolver(limiters, 'read', async (_, __, context) => {
            const barnId = getBarnId(context);
            return prisma.horse.findMany({
                where: { isActive: true, barnId },
            });
        }),
        riders: wrapResolver(limiters, 'read', async (_, __, context) => {
            const barnId = getBarnId(context);
            return prisma.rider.findMany({
                where: { barnId },
                omit: { password: true },
            });
        }),
        sessions: wrapResolver(limiters, 'read', async (_, args, context) => {
            const {
                limit,
                offset,
                horseId,
                riderId,
                workType,
                dateFrom,
                dateTo,
            } = args as {
                limit?: number;
                offset?: number;
                horseId?: string;
                riderId?: string;
                workType?: WorkType;
                dateFrom?: Date;
                dateTo?: Date;
            };
            const barnId = getBarnId(context);
            const where: Prisma.SessionWhereInput = {
                horse: { barnId },
                horseId,
                riderId,
                workType,
            };

            if (dateFrom || dateTo) {
                where.date = {
                    ...(dateFrom && { gte: dateFrom }),
                    ...(dateTo && { lte: dateTo }),
                };
            }

            return prisma.session.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { date: 'desc' },
            });
        }),
        horse: wrapResolver(limiters, 'read', async (_, args, context) => {
            const { id } = args as { id: string };
            const barnId = getBarnId(context);
            return prisma.horse.findFirst({
                where: { id, barnId },
            });
        }),
        lastSessionForHorse: wrapResolver(
            limiters,
            'read',
            async (_, args, context) => {
                const { horseId } = args as { horseId: string };
                const barnId = getBarnId(context);
                return prisma.session.findFirst({
                    where: {
                        horseId,
                        horse: { barnId },
                    },
                    orderBy: { date: 'desc' },
                });
            }
        ),
        session: wrapResolver(limiters, 'read', async (_, args, context) => {
            const { id } = args as { id: string };
            const barnId = getBarnId(context);
            return prisma.session.findFirst({
                where: { id, horse: { barnId } },
            });
        }),
    };
}
