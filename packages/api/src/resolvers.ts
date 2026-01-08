import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLError, type GraphQLResolveInfo } from 'graphql';
import { WorkType, type Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { JWT_SECRET } from './config';
import type { Loaders } from './loaders';

const JWT_EXPIRATION = '1h';

export type RiderSafe = Prisma.RiderGetPayload<{ omit: { password: true } }>;

export type Context = {
    rider: RiderSafe | null;
    loaders: Loaders;
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

export const resolvers = {
    DateTime: DateTimeResolver,

    Query: {
        horses: (
            _: unknown,
            args: unknown,
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.horse.findMany();
        },
        riders: (
            _: unknown,
            args: unknown,
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.rider.findMany({ omit: { password: true } });
        },
        sessions: (
            _: unknown,
            args: { limit?: number; offset?: number },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.session.findMany({
                take: args.limit,
                skip: args.offset,
                orderBy: { date: 'desc' },
            });
        },
        horse: (
            _: unknown,
            args: { id: string },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.horse.findUnique({ where: { id: args.id } });
        },
        lastSessionForHorse: (
            _: unknown,
            args: { horseId: string },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.session.findFirst({
                where: { horseId: args.horseId },
                orderBy: { date: 'desc' },
            });
        },
    },

    Mutation: {
        createHorse: (
            _: unknown,
            args: { name: string; notes?: string },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            return prisma.horse.create({ data: args });
        },
        createSession: (
            _: unknown,
            args: {
                horseId: string;
                date: Date;
                durationMinutes: number;
                workType: WorkType;
                notes: string;
            },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            if (!context.rider) {
                throw new GraphQLError('No rider found');
            }
            return prisma.session.create({
                data: { ...args, riderId: context.rider.id },
            });
        },
        signup: async (
            _: unknown,
            args: { name: string; email: string; password: string },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
            const existingRider = await prisma.rider.findUnique({
                where: { email: args.email },
                omit: { password: true },
            });
            if (existingRider) {
                throw new GraphQLError('Email already in use', {
                    extensions: { code: 'EMAIL_IN_USE' },
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
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION,
            });
            const { password: _password, ...safeRider } = rider;
            context.rider = safeRider;
            return { token, rider: safeRider };
        },
        login: async (
            _: unknown,
            args: { email: string; password: string },
            context: Context,
            info: GraphQLResolveInfo
        ) => {
            logResolverCall(info, args, context);
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
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION,
            });
            const { password: _password, ...safeRider } = rider;
            context.rider = safeRider;
            return { token, rider: safeRider };
        },
    },

    // Field resolvers for relations
    Horse: {
        sessions: (parent: { id: string }) =>
            prisma.session.findMany({ where: { horseId: parent.id } }),
        activity: async (parent: { id: string }, args: { weeks?: number }) => {
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
        horse: (parent: { horseId: string }, _: unknown, context: Context) =>
            context.loaders.horse.load(parent.horseId),
        rider: (parent: { riderId: string }, _: unknown, context: Context) =>
            context.loaders.rider.load(parent.riderId),
        // Backwards-compat: older DB rows may have NULL notes, but GraphQL requires String!
        notes: (parent: { notes: string | null }) => parent.notes ?? '',
    },
};
