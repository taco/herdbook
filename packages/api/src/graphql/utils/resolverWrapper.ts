import type { GraphQLResolveInfo } from 'graphql';
import type { GraphQLFieldResolver, GraphQLScalarType } from 'graphql';
import type { Context } from './authGuard';
import { enforceRateLimit, type GqlLimiters } from './gqlRateLimit';

/** Local definition to avoid importing from @apollo/subgraph internal dist paths. */
export type GraphQLResolverMap<TContext = unknown> = Record<
    string,
    | Record<
          string,
          | GraphQLFieldResolver<unknown, TContext>
          | {
                requires?: string;
                resolve?: GraphQLFieldResolver<unknown, TContext>;
                subscribe?: GraphQLFieldResolver<unknown, TContext>;
            }
      >
    | GraphQLScalarType
    | Record<string, string | number>
>;

type ResolverFn = (
    parent: unknown,
    args: Record<string, unknown>,
    context: Context,
    info: GraphQLResolveInfo
) => Promise<unknown>;

function redactSensitive(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactSensitive);
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const redacted: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
            if (/password/i.test(key)) {
                redacted[key] = '[REDACTED]';
                continue;
            }
            redacted[key] = redactSensitive(val);
        }
        return redacted;
    }
    return value;
}

function logResolverCall(
    info: GraphQLResolveInfo,
    args: unknown,
    context: Context | undefined
): void {
    const riderId = context?.rider?.id ?? null;
    console.info(`[gql] ${info.parentType.name}.${info.fieldName}`, {
        riderId,
        args: redactSensitive(args),
    });
}

/** Wrap a resolver with rate limiting and structured logging. */
export function wrapResolver(
    limiters: GqlLimiters,
    bucket: 'read' | 'write' | 'auth',
    resolver: ResolverFn
): ResolverFn {
    return async (parent, args, context, info) => {
        await enforceRateLimit(
            limiters[bucket],
            context,
            bucket,
            `${info.parentType.name}.${info.fieldName}`
        );
        logResolverCall(info, args, context);
        return resolver(parent, args, context, info);
    };
}
