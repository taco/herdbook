import { DateTimeResolver } from 'graphql-scalars';
import { WorkType } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

export const resolvers = {
    DateTime: DateTimeResolver,

    Query: {
        horses: () => prisma.horse.findMany(),
        riders: () => prisma.rider.findMany(),
        sessions: () => prisma.session.findMany(),
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
                riderId: string;
                date: Date;
                durationMinutes: number;
                workType: WorkType;
                notes?: string;
            }
        ) => prisma.session.create({ data: args }),
        signup: async (_: unknown, args: { name: string; email: string; password: string }) => {
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const rider = await prisma.rider.create({ data: { name: args.name, email: args.email, password: hashedPassword } });
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, { expiresIn: '1h' });
            return { token, rider };
        },
        login: async (_: unknown, args: { email: string; password: string }) => {
            const rider = await prisma.rider.findUnique({ where: { email: args.email } });
            if (!rider) {
                throw new Error('Invalid email or password');
            }
            const passwordMatch = await bcrypt.compare(args.password, rider.password);
            if (!passwordMatch) {
                throw new Error('Invalid email or password');
            }
            const token = jwt.sign({ riderId: rider.id }, JWT_SECRET, { expiresIn: '1h' });
            return { token, rider };
        },
    },

    // Field resolvers for relations
    Horse: {
        sessions: (parent: { id: string }) =>
            prisma.session.findMany({ where: { horseId: parent.id } }),
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
