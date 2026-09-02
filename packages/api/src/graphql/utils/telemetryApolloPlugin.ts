import type { ApolloServerPlugin } from '@apollo/server';
import { Kind, type FieldNode, type ValueNode } from 'graphql';
import { setDomainAttributes, setRequestAttributes } from '@/utils/tracing';
import type { Context } from './authGuard';

// Root fields whose `id` argument names a horse or a session. Keep in sync
// with schema.graphql: a new root field taking `id: ID!` must be listed here
// or its entity goes untagged (`horseId` arguments are picked up by name).
const HORSE_ID_FIELDS = new Set(['horse', 'updateHorse']);
const SESSION_ID_FIELDS = new Set([
    'session',
    'updateSession',
    'deleteSession',
]);

function resolveArgument(
    field: FieldNode,
    name: string,
    variables: Record<string, unknown> | undefined
): string | undefined {
    const arg = field.arguments?.find((a) => a.name.value === name);
    if (!arg) return undefined;
    const value: ValueNode = arg.value;
    if (value.kind === Kind.VARIABLE) {
        const resolved = variables?.[value.name.value];
        return typeof resolved === 'string' ? resolved : undefined;
    }
    return value.kind === Kind.STRING ? value.value : undefined;
}

/**
 * Tags the request trace with the GraphQL operation and the horse/session it
 * targets, read from root-field arguments (not variable names, which the
 * client is free to choose). Rider and barn are tagged in buildContext.
 */
export const telemetryApolloPlugin: ApolloServerPlugin<Context> = {
    async requestDidStart() {
        return {
            async didResolveOperation({ operation, operationName, request }) {
                if (!operation) return;
                setRequestAttributes({
                    'graphql.operation.name': operationName ?? 'anonymous',
                    'graphql.operation.type': operation.operation,
                });

                const variables = request.variables as
                    | Record<string, unknown>
                    | undefined;
                for (const selection of operation.selectionSet.selections) {
                    if (selection.kind !== Kind.FIELD) continue;
                    const fieldName = selection.name.value;
                    const id = resolveArgument(selection, 'id', variables);
                    setDomainAttributes({
                        horseId:
                            resolveArgument(selection, 'horseId', variables) ??
                            (HORSE_ID_FIELDS.has(fieldName) ? id : undefined),
                        sessionId: SESSION_ID_FIELDS.has(fieldName)
                            ? id
                            : undefined,
                    });
                }
            },
        };
    },
};
