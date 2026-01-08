import 'dotenv/config';
import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { createLoaders } from '@/loaders';
import { resolvers, Context } from '@/resolvers';
import { JWT_SECRET } from '@/config';
import { secureByDefaultTransformer } from '@/directives';

async function buildContext(request: FastifyRequest): Promise<Context> {
    const auth = request.headers.authorization;
    const context: Context = {
        rider: null,
        loaders: createLoaders(),
    };
    if (!auth || !auth.startsWith('Bearer ')) {
        return context;
    }

    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { riderId: string };
        const rider = await prisma.rider.findUnique({
            where: { id: payload.riderId },
            omit: { password: true },
        });
        context.rider = rider;
        return context;
    } catch (error) {
        console.error('Error verifying token:', error);
        return context;
    }
}

const typeDefs = parse(
    readFileSync(resolve(__dirname, 'schema.graphql'), 'utf8')
);

const schema = secureByDefaultTransformer(
    buildSubgraphSchema({
        typeDefs,
        resolvers: resolvers as any,
    })
);

async function start() {
    const fastify = Fastify();

    await fastify.register(cors, {
        origin: true, // Allow all origins in dev for easy iPhone access
        credentials: true,
    });

    const apollo = new ApolloServer<Context>({
        schema,
    });

    await apollo.start();

    await fastify.register(fastifyApollo(apollo), {
        context: (request: FastifyRequest) => buildContext(request),
    });

    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Server is running on http://0.0.0.0:4000/graphql');
}

start();
