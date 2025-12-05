import 'dotenv/config';
import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { DateTimeResolver } from 'graphql-scalars';
import fastifyApollo from '@as-integrations/fastify';
import { PrismaClient, WorkType } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const typeDefs = readFileSync(resolve(__dirname, 'schema.graphql'), 'utf8');

const resolvers = {
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
        createRider: (_: unknown, args: { name: string; email: string }) =>
            prisma.rider.create({ data: args }),
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

async function start() {
    const fastify = Fastify();

    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await apollo.start();

    await fastify.register(fastifyApollo(apollo));

    await fastify.listen({ port: 4000 });
    console.log('Server is running on http://localhost:4000/graphql');
}

start();
