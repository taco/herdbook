import { DateTimeResolver } from 'graphql-scalars';
import type { FastifyInstance } from 'fastify';
import { setupGqlLimiters } from './utils/gqlRateLimit';
import type { GraphQLResolverMap } from './utils/resolverWrapper';
import { buildQueryResolvers } from './queryResolvers';
import { buildMutationResolvers } from './mutationResolvers';
import {
    horseFieldResolvers,
    barnFieldResolvers,
    riderFieldResolvers,
    sessionFieldResolvers,
} from './fieldResolvers';

export type { Context, RiderSafe } from './utils/authGuard';

export function createResolvers(
    app: FastifyInstance
): GraphQLResolverMap<unknown> {
    const limiters = setupGqlLimiters(app);

    return {
        DateTime: DateTimeResolver,
        Query: buildQueryResolvers(limiters),
        Mutation: buildMutationResolvers(limiters),
        Horse: horseFieldResolvers,
        Barn: barnFieldResolvers,
        Rider: riderFieldResolvers,
        Session: sessionFieldResolvers,
    } as GraphQLResolverMap<unknown>;
}
