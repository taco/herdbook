import { GraphQLError } from 'graphql';
import { RiderRole, type Prisma } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import type { Loaders } from '../loaders';

export type RiderSafe = Prisma.RiderGetPayload<{ omit: { password: true } }>;

export type Context = {
    rider: RiderSafe | null;
    loaders: Loaders;
    reply: FastifyReply;
};

/** Extract barnId from authenticated context. Throws UNAUTHENTICATED if no rider. */
export function getBarnId(context: Context): string {
    if (!context.rider) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    return context.rider.barnId;
}

/** Guard: throws FORBIDDEN unless the authenticated rider has TRAINER role. */
export function requireTrainer(context: Context): void {
    if (!context.rider || context.rider.role !== RiderRole.TRAINER) {
        throw new GraphQLError('Only trainers can perform this action', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
}

/** Guard: throws FORBIDDEN unless the rider is the resource owner or a TRAINER. */
export function requireOwnerOrTrainer(context: Context, ownerId: string): void {
    if (!context.rider) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    if (
        context.rider.role !== RiderRole.TRAINER &&
        context.rider.id !== ownerId
    ) {
        throw new GraphQLError('You can only modify your own sessions', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
}
