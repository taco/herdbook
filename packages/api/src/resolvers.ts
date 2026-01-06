import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLError } from 'graphql';
import { WorkType } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { JWT_SECRET } from './config';

export type Context = {
    rider: Awaited<ReturnType<typeof prisma.rider.findUnique>> | null;
};

export const resolvers = {
    DateTime: DateTimeResolver,

    Query: {
        horses: () => prisma.horse.findMany(),
        riders: () => prisma.rider.findMany(),
        sessions: (_: unknown, args: { limit?: number; offset?: number }) =>
            prisma.session.findMany({
                take: args.limit,
                skip: args.offset,
                orderBy: { date: 'desc' },
            }),
        horse: (_: unknown, args: { id: string }) =>
            prisma.horse.findUnique({ where: { id: args.id } }),
        lastSessionForHorse: (_: unknown, args: { horseId: string }) =>
            prisma.session.findFirst({
                where: { horseId: args.horseId },
                orderBy: { date: 'desc' },
            }),
    },

    Mutation: {
        createHorse: (_: unknown, args: { name: string; notes?: string }) =>
            prisma.horse.create({ data: args }),
        createSession: (
            _: unknown,
            args: {
                horseId: string;
                date: Date;
                durationMinutes: number;
                workType: WorkType;
                notes?: string;
            },
            context: Context
        ) => {
            if (!context.rider) {
                throw new Error('Not authenticated');
            }
            return prisma.session.create({
                data: { ...args, riderId: context.rider.id },
            });
        },
        signup: async (
            _: unknown,
            args: { name: string; email: string; password: string },
            context: Context
        ) => {
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const rider = await prisma.rider.create({
                data: {
                    name: args.name,
                    email: args.email,
                    password: hashedPassword,
                },
            });
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, {
                expiresIn: '1h',
            });
            context.rider = rider;
            return { token, rider };
        },
        login: async (
            _: unknown,
            args: { email: string; password: string },
            context: Context
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
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, {
                expiresIn: '1h',
            });
            context.rider = rider;
            return { token, rider };
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
        horse: (parent: { horseId: string }) =>
            prisma.horse.findUnique({ where: { id: parent.horseId } }),
        rider: (parent: { riderId: string }) =>
            prisma.rider.findUnique({ where: { id: parent.riderId } }),
    },
};
