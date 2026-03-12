import { GraphQLError } from 'graphql';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getRateLimits } from '@/config';
import { rateLimitKey } from '@/utils/auth';
import type { Limiter } from '@/rest/utils/aiRateLimit';
import type { Context } from './authGuard';

export interface GqlLimiters {
    read: Limiter;
    write: Limiter;
    auth: Limiter;
}

/** Create or retrieve read/write/auth rate limiters for GraphQL resolvers. */
export function setupGqlLimiters(app: FastifyInstance): GqlLimiters {
    if (!app.hasDecorator('gqlRateLimiters')) {
        const rateLimits = getRateLimits();

        app.decorate('gqlRateLimiters', {
            read: app.createRateLimit({
                max: rateLimits.read,
                timeWindow: '1 minute',
                keyGenerator: rateLimitKey,
            }),

            write: app.createRateLimit({
                max: rateLimits.write,
                timeWindow: '1 minute',
                keyGenerator: rateLimitKey,
            }),

            // Auth bucket stays IP-only (no JWT to decode on login/signup)
            auth: app.createRateLimit({
                max: rateLimits.auth,
                timeWindow: '1 minute',
                keyGenerator: (req: FastifyRequest) => `ip:${req.ip}`,
            }),
        });
    }

    return (app as unknown as Record<string, GqlLimiters>).gqlRateLimiters;
}

/** Throw a RATE_LIMITED GraphQLError if the limiter rejects the request. */
export async function enforceRateLimit(
    limiter: Limiter,
    context: Context,
    bucket: string,
    resolverName: string,
    code = 'RATE_LIMITED'
): Promise<void> {
    const res = await limiter(context.reply.request);
    if (!res.isAllowed && (res.isExceeded || res.isBanned)) {
        console.warn(
            `[gql:rate-limit] ${bucket} bucket exceeded for ${resolverName} — key=${res.key}, ttl=${res.ttl}s`
        );
        throw new GraphQLError('Too many requests', {
            extensions: {
                code,
                http: { status: 429 },
                rateLimit: { ttl: res.ttl, remaining: res.remaining },
            },
        });
    }
}
