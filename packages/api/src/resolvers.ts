import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLError, type GraphQLResolveInfo } from 'graphql';
import { WorkType, type Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { getJwtExpiration, getJwtSecretOrThrow, getRateLimits } from './config';
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

type Limiter = (
    req: any
) => Promise<{ isExceeded: boolean; ttl?: number; remaining?: number }>;

async function enforceRateLimit(
    limiter: Limiter,
    context: Context,
    bucket: string,
    resolverName: string,
    code = 'RATE_LIMITED'
) {
    const res = await limiter(context.reply.request);
    if (res.isExceeded) {
        const riderId = context.rider?.id;
        const key = riderId
            ? `rider:${riderId}`
            : `ip:${context.reply.request.ip}`;

        console.warn(
            `[gql:rate-limit] ${bucket} bucket exceeded for ${resolverName} — key=${key}, ttl=${res.ttl}s`
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

export const createResolvers = (app: FastifyInstance): Record<string, any> => {
    if (!app.hasDecorator('gqlRateLimiters')) {
        const keyByUserOrIp = (req: any) => {
            // If you attach rider to req somewhere, prefer that; otherwise IP.
            // You can also key off auth header or API key if that’s how you identify callers.
            const riderId = (req as any).rider?.id;
            return riderId ? `rider:${riderId}` : `ip:${req.ip}`;
        };

        const rateLimits = getRateLimits();

        app.decorate('gqlRateLimiters', {
            // "default" bucket for common reads
            read: app.createRateLimit({
                max: rateLimits.read,
                timeWindow: '1 minute',
                keyGenerator: keyByUserOrIp,
            }),

            // Stricter bucket for writes
            write: app.createRateLimit({
                max: rateLimits.write,
                timeWindow: '1 minute',
                keyGenerator: keyByUserOrIp,
            }),

            // Very strict bucket for auth endpoints (protect login/signup)
            auth: app.createRateLimit({
                max: rateLimits.auth,
                timeWindow: '1 minute',
                keyGenerator: (req: any) => `ip:${req.ip}`, // usually IP-based is fine here
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
                async (_, args: { limit?: number; offset?: number }) => {
                    return prisma.session.findMany({
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
        },

        Mutation: {
            createHorse: wrapResolver(
                'write',
                async (_, args: { name: string; notes?: string }) => {
                    return prisma.horse.create({ data: args });
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
                    }
                ) => {
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
                        date: Date;
                        durationMinutes: number;
                        workType: WorkType;
                        notes: string;
                    },
                    context
                ) => {
                    if (!context.rider) {
                        throw new GraphQLError('No rider found');
                    }
                    return prisma.session.create({
                        data: { ...args, riderId: context.rider.id },
                    });
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
                    const hashedPassword = await bcrypt.hash(args.password, 10);
                    const rider = await prisma.rider.create({
                        data: {
                            name: args.name,
                            email: args.email,
                            password: hashedPassword,
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
        Rider: {
            sessions: (parent: { id: string }) =>
                prisma.session.findMany({ where: { riderId: parent.id } }),
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
