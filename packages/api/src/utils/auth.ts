import jwt from 'jsonwebtoken';
import type { FastifyRequest } from 'fastify';
import { getJwtSecretOrThrow } from '@/config';

/** Verify a Bearer JWT and return the rider ID, or null if invalid. */
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

/**
 * Rate-limit key: rider ID from JWT, falling back to IP.
 * Used by both GraphQL and REST rate limiters.
 */
export function rateLimitKey(req: FastifyRequest): string {
    const auth = verifyToken(req.headers.authorization);
    return auth ? `rider:${auth.riderId}` : `ip:${req.ip}`;
}
