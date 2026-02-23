import jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/db';
import { createLoaders } from '@/graphql/loaders';
import { getJwtSecretOrThrow } from '@/config';
import type { Context } from '@/graphql/resolvers';
import { setSentryUser } from '@/lib/sentry';

/**
 * Shared rate-limit key: rider ID from JWT, falling back to IP.
 * Used by both GraphQL and REST rate limiters.
 */
export function rateLimitKey(req: FastifyRequest): string {
    const auth = verifyToken(req.headers.authorization);
    return auth ? `rider:${auth.riderId}` : `ip:${req.ip}`;
}

export async function buildContext(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<Context> {
    const auth = request.headers.authorization;
    const context: Context = {
        rider: null,
        reply,
        loaders: createLoaders(),
    };
    if (!auth || !auth.startsWith('Bearer ')) {
        await prisma.$executeRaw`SELECT set_config('app.current_barn_id', '', false)`;
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
        if (rider) {
            setSentryUser(rider.id);
        }
        const barnId = rider?.barnId ?? '';
        await prisma.$executeRaw`SELECT set_config('app.current_barn_id', ${barnId}, false)`;
        return context;
    } catch (error) {
        // Avoid failing the whole request if auth is invalid.
        console.error('Error verifying token:', error);
        await prisma.$executeRaw`SELECT set_config('app.current_barn_id', '', false)`;
        return context;
    }
}

/**
 * Verify a JWT token and return the rider ID if valid
 * For use in REST endpoints that need simple auth checks
 */
export function verifyToken(
    authHeader: string | undefined
): { riderId: string } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, getJwtSecretOrThrow()) as {
            riderId: string;
        };
        return { riderId: payload.riderId };
    } catch {
        return null;
    }
}
