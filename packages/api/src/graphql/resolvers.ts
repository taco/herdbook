import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLError, type GraphQLResolveInfo } from 'graphql';
import { WorkType, Intensity, RiderRole, type Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { isDevelopment } from '@/config';
import jwt from 'jsonwebtoken';
import { prisma } from '@/db';
import { getJwtExpiration, getJwtSecretOrThrow, getRateLimits } from '@/config';
import { rateLimitKey } from '@/middleware/auth';
import { getRefreshCooldownHours } from '@/rest/utils/summaryUtils';
import type { Loaders } from './loaders';

export type RiderSafe = Prisma.RiderGetPayload<{ omit: { password: true } }>;

export type Context = {
    rider: RiderSafe | null;
    loaders: Loaders;
    reply: FastifyReply;
};

function redactSensitive(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactSensitive);
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const redacted: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
            if (/password/i.test(key)) {
                redacted[key] = '[REDACTED]';
                continue;
            }
            redacted[key] = redactSensitive(val);
        }
        return redacted;
    }
    return value;
}

function logResolverCall(
    info: GraphQLResolveInfo,
    args: unknown,
    context: Context | undefined
): void {
    // Avoid logging full context (it includes password hash on rider)
    const riderId = context?.rider?.id ?? null;
    console.info(`[gql] ${info.parentType.name}.${info.fieldName}`, {
        riderId,
        args: redactSensitive(args),
    });
}

type RateLimitResult =
    | { isAllowed: true; key: string }
    | {
          isAllowed: false;
          key: string;
          max: number;
          timeWindow: number;
          remaining: number;
          ttl: number;
          ttlInSeconds: number;
          isExceeded: boolean;
          isBanned: boolean;
      };

type Limiter = (req: any) => Promise<RateLimitResult>;

async function enforceRateLimit(
    limiter: Limiter,
    context: Context,
    bucket: string,
    resolverName: string,
    code = 'RATE_LIMITED'
): Promise<void> {
    const res = await limiter(context.reply.request);
    if (!res.isAllowed && res.isExceeded) {
        console.warn(
            `[gql:rate-limit] ${bucket} bucket exceeded for ${resolverName} — key=${res.key}, ttl=${res.ttl}s`
        );
        throw new GraphQLError('Too many requests', {
            extensions: {
                code,
                http: { status: 429 },
                rateLimit: { ttl: res.ttl, remaining: res.remaining },
            },
        });
    }
}

function requireTrainer(context: Context): void {
    if (!context.rider || context.rider.role !== RiderRole.TRAINER) {
        throw new GraphQLError('Only trainers can perform this action', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
}

function requireOwnerOrTrainer(context: Context, ownerId: string): void {
    if (!context.rider) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    if (
        context.rider.role !== RiderRole.TRAINER &&
        context.rider.id !== ownerId
    ) {
        throw new GraphQLError('You can only modify your own sessions', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
}

export const createResolvers = (app: FastifyInstance): Record<string, any> => {
    if (!app.hasDecorator('gqlRateLimiters')) {
        const rateLimits = getRateLimits();

        app.decorate('gqlRateLimiters', {
            read: app.createRateLimit({
                max: rateLimits.read,
                timeWindow: '1 minute',
                keyGenerator: rateLimitKey,
            }),

            write: app.createRateLimit({
                max: rateLimits.write,
                timeWindow: '1 minute',
                keyGenerator: rateLimitKey,
            }),

            // Auth bucket stays IP-only (no JWT to decode on login/signup)
            auth: app.createRateLimit({
                max: rateLimits.auth,
                timeWindow: '1 minute',
                keyGenerator: (req: any) => `ip:${req.ip}`,
            }),
        });
    }

    const limiters = (app as any).gqlRateLimiters as {
        read: Limiter;
        write: Limiter;
        auth: Limiter;
    };

    const wrapResolver =
        (
            bucket: 'read' | 'write' | 'auth',
            resolver: (
                parent: any,
                args: any,
                context: Context,
                info: GraphQLResolveInfo
            ) => Promise<any>
        ) =>
        async (
            parent: any,
            args: any,
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            await enforceRateLimit(
                limiters[bucket],
                context,
                bucket,
                `${info.parentType.name}.${info.fieldName}`
            );
            logResolverCall(info, args, context);
            return resolver(parent, args, context, info);
        };

    return {
        DateTime: DateTimeResolver,

        Query: {
            horses: wrapResolver('read', async () => {
                return prisma.horse.findMany({ where: { isActive: true } });
            }),
            riders: wrapResolver('read', async () => {
                return prisma.rider.findMany({ omit: { password: true } });
            }),
            sessions: wrapResolver(
                'read',
                async (
                    _,
                    args: {
                        limit?: number;
                        offset?: number;
                        horseId?: string;
                        riderId?: string;
                        workType?: WorkType;
                        dateFrom?: Date;
                        dateTo?: Date;
                    }
                ) => {
                    const where: Prisma.SessionWhereInput = {
                        horseId: args.horseId,
                        riderId: args.riderId,
                        workType: args.workType,
                    };

                    if (args.dateFrom || args.dateTo) {
                        where.date = {
                            ...(args.dateFrom && { gte: args.dateFrom }),
                            ...(args.dateTo && { lte: args.dateTo }),
                        };
                    }

                    return prisma.session.findMany({
                        where,
                        take: args.limit,
                        skip: args.offset,
                        orderBy: { date: 'desc' },
                    });
                }
            ),
            horse: wrapResolver('read', async (_, args: { id: string }) => {
                return prisma.horse.findUnique({ where: { id: args.id } });
            }),
            lastSessionForHorse: wrapResolver(
                'read',
                async (_, args: { horseId: string }) => {
                    return prisma.session.findFirst({
                        where: { horseId: args.horseId },
                        orderBy: { date: 'desc' },
                    });
                }
            ),
            session: wrapResolver('read', async (_, args: { id: string }) => {
                return prisma.session.findUnique({ where: { id: args.id } });
            }),
        },

        Mutation: {
            createHorse: wrapResolver(
                'write',
                async (_, args: { name: string; notes?: string }, context) => {
                    requireTrainer(context);
                    return prisma.horse.create({
                        data: { ...args, barnId: context.rider!.barnId },
                    });
                }
            ),
            updateHorse: wrapResolver(
                'write',
                async (
                    _,
                    args: {
                        id: string;
                        name?: string;
                        notes?: string;
                        isActive?: boolean;
                    },
                    context
                ) => {
                    requireTrainer(context);
                    const existing = await prisma.horse.findUnique({
                        where: { id: args.id },
                    });
                    if (!existing) {
                        throw new GraphQLError('Horse not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                    const updateData: {
                        name?: string;
                        notes?: string;
                        isActive?: boolean;
                    } = {};
                    if (args.name !== undefined) updateData.name = args.name;
                    if (args.notes !== undefined) updateData.notes = args.notes;
                    if (args.isActive !== undefined)
                        updateData.isActive = args.isActive;
                    return prisma.horse.update({
                        where: { id: args.id },
                        data: updateData,
                    });
                }
            ),
            createSession: wrapResolver(
                'write',
                async (
                    _,
                    args: {
                        horseId: string;
                        riderId?: string;
                        date: Date;
                        durationMinutes: number;
                        workType: WorkType;
                        intensity?: Intensity;
                        rating?: number;
                        notes: string;
                    },
                    context
                ) => {
                    if (!context.rider) {
                        throw new GraphQLError('Not authenticated', {
                            extensions: { code: 'UNAUTHENTICATED' },
                        });
                    }
                    if (
                        args.rating !== undefined &&
                        args.rating !== null &&
                        (args.rating < 1 || args.rating > 5)
                    ) {
                        throw new GraphQLError(
                            'Rating must be between 1 and 5',
                            { extensions: { code: 'BAD_USER_INPUT' } }
                        );
                    }
                    // Riders can only create sessions for themselves;
                    // trainers can specify any riderId
                    if (
                        args.riderId &&
                        args.riderId !== context.rider.id &&
                        context.rider.role !== RiderRole.TRAINER
                    ) {
                        throw new GraphQLError(
                            'You can only create sessions for yourself',
                            { extensions: { code: 'FORBIDDEN' } }
                        );
                    }
                    const { riderId: _argRiderId, ...sessionData } = args;
                    const riderId =
                        context.rider.role === RiderRole.TRAINER && args.riderId
                            ? args.riderId
                            : context.rider.id;
                    return prisma.session.create({
                        data: { ...sessionData, riderId },
                    });
                }
            ),
            updateSession: wrapResolver(
                'write',
                async (
                    _,
                    args: {
                        id: string;
                        horseId?: string;
                        riderId?: string;
                        date?: Date;
                        durationMinutes?: number;
                        workType?: WorkType;
                        intensity?: Intensity;
                        rating?: number;
                        notes?: string;
                    },
                    context
                ) => {
                    if (!context.rider) {
                        throw new GraphQLError('Not authenticated', {
                            extensions: { code: 'UNAUTHENTICATED' },
                        });
                    }
                    if (
                        args.rating !== undefined &&
                        args.rating !== null &&
                        (args.rating < 1 || args.rating > 5)
                    ) {
                        throw new GraphQLError(
                            'Rating must be between 1 and 5',
                            { extensions: { code: 'BAD_USER_INPUT' } }
                        );
                    }
                    const existing = await prisma.session.findUnique({
                        where: { id: args.id },
                    });
                    if (!existing) {
                        throw new GraphQLError('Session not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                    requireOwnerOrTrainer(context, existing.riderId);
                    // Only trainers can reassign a session to a different rider
                    if (
                        args.riderId !== undefined &&
                        args.riderId !== existing.riderId &&
                        context.rider.role !== RiderRole.TRAINER
                    ) {
                        throw new GraphQLError(
                            'Only trainers can reassign sessions',
                            { extensions: { code: 'FORBIDDEN' } }
                        );
                    }
                    const updateData: Prisma.SessionUpdateInput = {};
                    if (args.horseId !== undefined)
                        updateData.horse = { connect: { id: args.horseId } };
                    if (args.riderId !== undefined)
                        updateData.rider = { connect: { id: args.riderId } };
                    if (args.date !== undefined) updateData.date = args.date;
                    if (args.durationMinutes !== undefined)
                        updateData.durationMinutes = args.durationMinutes;
                    if (args.workType !== undefined)
                        updateData.workType = args.workType;
                    if (args.intensity !== undefined)
                        updateData.intensity = args.intensity;
                    if (args.rating !== undefined)
                        updateData.rating = args.rating;
                    if (args.notes !== undefined) updateData.notes = args.notes;
                    return prisma.session.update({
                        where: { id: args.id },
                        data: updateData,
                    });
                }
            ),
            deleteSession: wrapResolver(
                'write',
                async (_, args: { id: string }, context) => {
                    if (!context.rider) {
                        throw new GraphQLError('Not authenticated', {
                            extensions: { code: 'UNAUTHENTICATED' },
                        });
                    }
                    const existing = await prisma.session.findUnique({
                        where: { id: args.id },
                    });
                    if (!existing) {
                        throw new GraphQLError('Session not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                    requireOwnerOrTrainer(context, existing.riderId);
                    await prisma.session.delete({ where: { id: args.id } });
                    return true;
                }
            ),
            signup: wrapResolver(
                'auth',
                async (
                    _,
                    args: { name: string; email: string; password: string },
                    context
                ) => {
                    const existingRider = await prisma.rider.findUnique({
                        where: { email: args.email },
                        omit: { password: true },
                    });
                    if (existingRider) {
                        throw new GraphQLError('Email already in use', {
                            extensions: { code: 'EMAIL_IN_USE' },
                        });
                    }
                    if (
                        !process.env.ALLOWED_EMAILS?.split(',').includes(
                            args.email
                        )
                    ) {
                        throw new GraphQLError('Email not allowed', {
                            extensions: { code: 'EMAIL_NOT_ALLOWED' },
                        });
                    }
                    // TODO(#86): assign to first barn until invite code signup flow
                    const barn = await prisma.barn.findFirstOrThrow();
                    const hashedPassword = await bcrypt.hash(args.password, 10);
                    const rider = await prisma.rider.create({
                        data: {
                            name: args.name,
                            email: args.email,
                            password: hashedPassword,
                            barnId: barn.id,
                        },
                    });
                    const token = jwt.sign(
                        { riderId: rider.id },
                        getJwtSecretOrThrow(),
                        { expiresIn: getJwtExpiration() }
                    );
                    const { password: _password, ...safeRider } = rider;
                    context.rider = safeRider;
                    return { token, rider: safeRider };
                }
            ),
            login: wrapResolver(
                'auth',
                async (
                    _,
                    args: { email: string; password: string },
                    context
                ) => {
                    const rider = await prisma.rider.findUnique({
                        where: { email: args.email },
                    });
                    if (!rider) {
                        throw new GraphQLError('Invalid email or password', {
                            extensions: {
                                code: 'INVALID_CREDENTIALS',
                            },
                        });
                    }
                    const passwordMatch = await bcrypt.compare(
                        args.password,
                        rider.password
                    );
                    if (!passwordMatch) {
                        throw new GraphQLError('Invalid email or password', {
                            extensions: {
                                code: 'INVALID_CREDENTIALS',
                            },
                        });
                    }
                    const token = jwt.sign(
                        { riderId: rider.id },
                        getJwtSecretOrThrow(),
                        { expiresIn: getJwtExpiration() }
                    );
                    const { password: _password, ...safeRider } = rider;
                    context.rider = safeRider;
                    return { token, rider: safeRider };
                }
            ),
        },

        // Field resolvers for relations
        Horse: {
            sessions: (parent: { id: string }) =>
                prisma.session.findMany({ where: { horseId: parent.id } }),
            barn: (parent: { barnId: string }) =>
                prisma.barn.findUniqueOrThrow({ where: { id: parent.barnId } }),
            summary: async (parent: {
                id: string;
                summaryContent: string | null;
                summaryGeneratedAt: Date | null;
            }) => {
                if (!parent.summaryContent || !parent.summaryGeneratedAt)
                    return null;

                const newSessions = await prisma.session.count({
                    where: {
                        horseId: parent.id,
                        createdAt: { gt: parent.summaryGeneratedAt },
                    },
                });
                const stale = isDevelopment() || newSessions > 0;

                let refreshAvailableAt: Date | null = null;
                if (stale && !isDevelopment()) {
                    const latestSession = await prisma.session.findFirst({
                        where: { horseId: parent.id },
                        orderBy: { date: 'desc' },
                        select: { date: true },
                    });
                    if (latestSession) {
                        const cooldownHours = getRefreshCooldownHours(
                            latestSession.date
                        );
                        refreshAvailableAt = new Date(
                            parent.summaryGeneratedAt.getTime() +
                                cooldownHours * 60 * 60 * 1000
                        );
                    }
                }

                return {
                    content: parent.summaryContent,
                    generatedAt: parent.summaryGeneratedAt,
                    stale,
                    refreshAvailableAt,
                };
            },
            activity: async (
                parent: { id: string },
                args: { weeks?: number }
            ) => {
                const weeksToFetch = args.weeks ?? 4;
                const now = new Date();
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - weeksToFetch * 7);

                const sessions = await prisma.session.findMany({
                    where: {
                        horseId: parent.id,
                        date: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                });

                const activity = [];
                for (let i = 0; i < weeksToFetch; i++) {
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() - i * 7);
                    const weekStart = new Date(weekEnd);
                    weekStart.setDate(weekStart.getDate() - 7);

                    const count = sessions.filter((s) => {
                        const sDate = new Date(s.date);
                        return sDate > weekStart && sDate <= weekEnd;
                    }).length;

                    activity.unshift({
                        weekStart,
                        count,
                    });
                }
                return activity;
            },
        },
        Barn: {
            inviteCode: (
                parent: { inviteCode: string },
                _: unknown,
                context: Context
            ) =>
                context.rider?.role === RiderRole.TRAINER
                    ? parent.inviteCode
                    : null,
        },
        Rider: {
            sessions: (parent: { id: string }) =>
                prisma.session.findMany({ where: { riderId: parent.id } }),
            barn: (parent: { barnId: string }) =>
                prisma.barn.findUniqueOrThrow({ where: { id: parent.barnId } }),
        },
        Session: {
            horse: (
                parent: { horseId: string },
                _: unknown,
                context: Context
            ) => context.loaders.horse.load(parent.horseId),
            rider: (
                parent: { riderId: string },
                _: unknown,
                context: Context
            ) => context.loaders.rider.load(parent.riderId),
            // Backwards-compat: older DB rows may have NULL notes, but GraphQL requires String!
            notes: (parent: { notes: string | null }) => parent.notes ?? '',
        },
    };
};
