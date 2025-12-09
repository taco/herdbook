import 'dotenv/config';
import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { resolvers, Context } from './resolvers';
import { JWT_SECRET } from './config';

async function buildContext(request: FastifyRequest): Promise<Context> {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return { rider: null };
    }

    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { riderId: string };
        const rider = await prisma.rider.findUnique({
            where: { id: payload.riderId },
        });
        return { rider };
    } catch (error) {
        console.error('Error verifying token:', error);
        return { rider: null };
    }
}

const typeDefs = readFileSync(resolve(__dirname, 'schema.graphql'), 'utf8');

async function start() {
    const fastify = Fastify();

    await fastify.register(cors, {
        origin: 'http://localhost:3000',
        credentials: true,
    });

    const apollo = new ApolloServer<Context>({
        typeDefs,
        resolvers,
    });

    await apollo.start();

    await fastify.register(fastifyApollo(apollo), {
        context: (request: FastifyRequest) => buildContext(request),
    });

    await fastify.listen({ port: 4000 });
    console.log('Server is running on http://localhost:4000/graphql');
}

start();
