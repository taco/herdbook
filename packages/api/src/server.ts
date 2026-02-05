import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { getJwtSecretOrThrow, getCorsOrigin } from '@/config';
import { createResolvers, type Context } from '@/graphql/resolvers';
import { secureByDefaultTransformer } from '@/graphql/directives';
import { buildContext } from '@/middleware/auth';
import { registerVoiceRoutes } from '@/rest/voice';

function readSchemaSDLOrThrow(): string {
    // In dev/test, this file lives next to this module in `src/graphql/`.
    const sdlPath = resolve(__dirname, 'graphql/schema.graphql');
    if (existsSync(sdlPath)) {
        return readFileSync(sdlPath, 'utf8');
    }

    // When running compiled JS (`dist/`), `schema.graphql` is still in `src/graphql/`.
    // `dist/` and `src/` are siblings under `packages/api/`.
    const fallbackPath = resolve(__dirname, '../src/graphql/schema.graphql');
    if (existsSync(fallbackPath)) {
        return readFileSync(fallbackPath, 'utf8');
    }

    throw new Error(
        `Could not find schema.graphql at ${sdlPath} or ${fallbackPath}`
    );
}

export async function createApiApp(httpsOptions?: {
    key: Buffer;
    cert: Buffer;
}): Promise<FastifyInstance> {
    // Ensure required env is present before accepting requests.
    getJwtSecretOrThrow();

    const app: FastifyInstance = httpsOptions
        ? Fastify({ https: httpsOptions })
        : Fastify();

    // Middleware
    await app.register(cors, {
        origin: getCorsOrigin(),
        credentials: true,
    });

    await app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    });

    await app.register(rateLimit, {
        global: false, // Don't apply globally, we'll use per-resolver limiters
    });

    // Health check
    app.get('/', async () => {
        return { status: 'ok' };
    });

    // REST routes
    await registerVoiceRoutes(app);

    // GraphQL
    const schema = secureByDefaultTransformer(
        buildSubgraphSchema({
            typeDefs: parse(readSchemaSDLOrThrow()),
            resolvers: createResolvers(app),
        })
    );

    const apollo = new ApolloServer<Context>({
        schema,
    });

    await apollo.start();

    await app.register(fastifyApollo(apollo), {
        context: (request, reply) => buildContext(request, reply),
    });

    return app;
}
