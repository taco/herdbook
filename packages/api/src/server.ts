import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import fastifyApollo from '@as-integrations/fastify';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import jwt from 'jsonwebtoken';
import { getJwtSecretOrThrow, getCorsOrigin, isDevelopment } from '@/config';
import { createResolvers, type Context } from '@/graphql/resolvers';
import { secureByDefaultTransformer } from '@/graphql/directives';
import { buildContext } from '@/middleware/auth';
import { registerVoiceRoutes } from '@/rest/voice';
import { registerSummaryRoutes } from '@/rest/horseSummary';
import { registerHealthRoutes } from '@/rest/health';
import { prisma } from '@/db';

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

    // REST routes
    await registerHealthRoutes(app);
    await registerVoiceRoutes(app);
    await registerSummaryRoutes(app);

    // GraphQL
    const schema = secureByDefaultTransformer(
        buildSubgraphSchema({
            typeDefs: parse(readSchemaSDLOrThrow()),
            resolvers: createResolvers(app),
        })
    );

    const plugins = [];
    if (isDevelopment()) {
        const rider = await prisma.rider.findFirst({
            select: { id: true, name: true },
        });
        if (rider) {
            const devToken = jwt.sign(
                { riderId: rider.id },
                getJwtSecretOrThrow(),
                { expiresIn: '7d' }
            );
            console.log(
                `[sandbox] Dev token for ${rider.name} (expires in 7d)`
            );
            plugins.push(
                ApolloServerPluginLandingPageLocalDefault({
                    embed: {
                        initialState: {
                            sharedHeaders: {
                                Authorization: `Bearer ${devToken}`,
                            },
                        },
                    },
                })
            );
        }
    }

    const apollo = new ApolloServer<Context>({
        schema,
        plugins,
    });

    await apollo.start();

    await app.register(fastifyApollo(apollo), {
        context: (request, reply) => buildContext(request, reply),
    });

    return app;
}
