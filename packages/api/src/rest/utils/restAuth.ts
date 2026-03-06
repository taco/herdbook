import type { FastifyRequest } from 'fastify';
import { verifyToken } from '@/utils/auth';

/**
 * Verify Bearer token and return the decoded auth payload.
 * Throws with a 401 status code on failure, so callers never proceed unauthenticated.
 */
export function requireAuth(request: FastifyRequest): { riderId: string } {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Unauthorized');
        (err as Error & { statusCode: number }).statusCode = 401;
        throw err;
    }
    const auth = verifyToken(authHeader);
    if (!auth) {
        const err = new Error('Invalid token');
        (err as Error & { statusCode: number }).statusCode = 401;
        throw err;
    }
    return auth;
}
