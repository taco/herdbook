import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';

import { prisma } from '@/db';
import { createLoaders } from '@/loaders';
import { resolvers, Context } from '@/resolvers';
import { getJwtSecretOrThrow, getCorsOrigin, getServerHost } from '@/config';
import { secureByDefaultTransformer } from '@/directives';

export async function buildContext(request: FastifyRequest): Promise<Context> {
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
        const payload = jwt.verify(token, getJwtSecretOrThrow()) as {
            riderId: string;
        };
        const rider = await prisma.rider.findUnique({
            where: { id: payload.riderId },
            omit: { password: true },
        });
        context.rider = rider;
        return context;
    } catch (error) {
        // Avoid failing the whole request if auth is invalid.
        console.error('Error verifying token:', error);
        return context;
    }
}

function readSchemaSDLOrThrow(): string {
    // In dev/test, this file lives next to this module in `src/`.
    const sdlPath = resolve(__dirname, 'schema.graphql');
    if (existsSync(sdlPath)) {
        return readFileSync(sdlPath, 'utf8');
    }

    // When running compiled JS (`dist/`), `schema.graphql` is still in `src/`.
    // `dist/` and `src/` are siblings under `packages/api/`.
    const fallbackPath = resolve(__dirname, '../src/schema.graphql');
    if (existsSync(fallbackPath)) {
        return readFileSync(fallbackPath, 'utf8');
    }

    throw new Error(
        `Could not find schema.graphql at ${sdlPath} or ${fallbackPath}`
    );
}

const typeDefs = parse(readSchemaSDLOrThrow());

export const schema = secureByDefaultTransformer(
    buildSubgraphSchema({
        typeDefs,
        resolvers: resolvers as any,
    })
);

export async function createApiApp(): Promise<FastifyInstance> {
    // Ensure required env is present before accepting requests.
    getJwtSecretOrThrow();

    const fastify = Fastify();

    await fastify.register(cors, {
        origin: getCorsOrigin(),
        credentials: true,
    });

    fastify.get('/', async () => {
        return { status: 'ok' };
    });

    const apollo = new ApolloServer<Context>({
        schema,
    });

    await apollo.start();

    await fastify.register(fastifyApollo(apollo), {
        context: (request: FastifyRequest) => buildContext(request),
    });

    return fastify;
}
