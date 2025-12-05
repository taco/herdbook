import 'dotenv/config';
import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { DateTimeResolver } from 'graphql-scalars';
import fastifyApollo from '@as-integrations/fastify';
import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path'


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
        horses: async () => prisma.horse.findMany(),
    },
    Mutation: {
        createHorse: async (_: unknown, args: { name: string, notes?: string }) => {
            return prisma.horse.create({
                data: {
                    name: args.name,
                    notes: args.notes,
                },
            });
        }
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
