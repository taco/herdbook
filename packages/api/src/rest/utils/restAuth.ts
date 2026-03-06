import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '@/utils/auth';

declare module 'fastify' {
    interface FastifyRequest {
        auth?: { riderId: string };
    }
}

/**
 * Verify Bearer token and attach decoded auth to `request.auth`.
 * Returns the reply (already sent) on failure, or undefined on success.
 * Call at the top of route handlers after rate limiting.
 */
export function authenticateRequest(
    request: FastifyRequest,
    reply: FastifyReply
): FastifyReply | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Unauthorized' });
        return reply;
    }
    const auth = verifyToken(authHeader);
    if (!auth) {
        reply.status(401).send({ error: 'Invalid token' });
        return reply;
    }
    request.auth = auth;
    return undefined;
}
