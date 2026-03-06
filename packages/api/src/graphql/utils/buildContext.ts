import jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/db';
import { getJwtSecretOrThrow } from '@/config';
import { setSentryUser } from '@/utils/sentry';
import { createLoaders } from '../loaders';
import type { Context } from './authGuard';

/** Build the GraphQL resolver context from a Fastify request. Loads rider, creates DataLoaders, and sets RLS barn scope. */
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
