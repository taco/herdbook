import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRateLimits } from '@/config';
import { rateLimitKey } from '@/middleware/auth';

export type RateLimitResult =
    | { isAllowed: true; key: string }
    | {
          isAllowed: false;
          key: string;
          max: number;
          timeWindow: number;
          remaining: number;
          ttl: number;
          ttlInSeconds: number;
          isExceeded: boolean;
          isBanned: boolean;
      };

export type Limiter = (req: FastifyRequest) => Promise<RateLimitResult>;

export type AiHandler = (
    request: FastifyRequest,
    reply: FastifyReply
) => Promise<unknown>;

interface AiLimiters {
    burst: Limiter;
    daily: Limiter;
}

/** Create burst + daily AI rate limiters, reusing the shared daily decorator. */
export function setupAiLimiters(app: FastifyInstance): AiLimiters {
    const rateLimits = getRateLimits();

    const burst: Limiter = app.createRateLimit({
        max: rateLimits.aiBurst,
        timeWindow: '1 minute',
        keyGenerator: rateLimitKey,
    });

    if (!app.hasDecorator('aiDailyLimiter')) {
        app.decorate(
            'aiDailyLimiter',
            app.createRateLimit({
                max: rateLimits.aiDaily,
                timeWindow: '1 day',
                keyGenerator: rateLimitKey,
            })
        );
    }
    const daily = (app as unknown as Record<string, Limiter>).aiDailyLimiter;

    return { burst, daily };
}

/** Wrap a handler with burst + daily rate limiting. */
export function withAiRateLimit(
    limiters: AiLimiters,
    bucket: string,
    handler: AiHandler
): AiHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const checks: Array<[string, Limiter]> = [
            ['burst', limiters.burst],
            ['daily', limiters.daily],
        ];
        for (const [name, limiter] of checks) {
            const rl = await limiter(request);
            if (!rl.isAllowed && rl.isExceeded) {
                const key = rateLimitKey(request);
                console.warn(
                    `[rest:rate-limit] ${bucket}:${name} exceeded for ${request.url} — key=${key}, ttl=${rl.ttl}s`
                );
                const message =
                    name === 'daily'
                        ? "You've reached your daily limit for AI features. Please try again tomorrow."
                        : 'Too many requests. Please wait a moment and try again.';
                return reply.status(429).send({
                    error: 'RATE_LIMITED',
                    message,
                    rateLimit: {
                        bucket: `${bucket}:${name}`,
                        ttl: rl.ttl,
                        remaining: rl.remaining,
                    },
                });
            }
        }
        return handler(request, reply);
    };
}
