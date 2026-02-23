import * as Sentry from '@sentry/node';
import type { ApolloServerPlugin } from '@apollo/server';
import type { Context } from '@/graphql/resolvers';
import { EXPECTED_ERROR_CODES } from '@/lib/sentry';

export const sentryApolloPlugin: ApolloServerPlugin<Context> = {
    async requestDidStart() {
        return {
            async didEncounterErrors(requestContext) {
                const { request, errors } = requestContext;

                for (const error of errors) {
                    const code =
                        (error.extensions?.code as string | undefined) ?? '';
                    if (EXPECTED_ERROR_CODES.has(code)) continue;

                    Sentry.withScope((scope) => {
                        scope.setTag(
                            'graphql.operation',
                            request.operationName ?? 'unknown'
                        );
                        scope.setTag('graphql.errorCode', code || 'UNKNOWN');

                        const variables = request.variables as
                            | Record<string, unknown>
                            | undefined;
                        if (variables?.horseId) {
                            scope.setExtra(
                                'horseId',
                                variables.horseId as string
                            );
                        }
                        if (variables?.riderId) {
                            scope.setExtra(
                                'riderId',
                                variables.riderId as string
                            );
                        }

                        Sentry.captureException(error.originalError ?? error);
                    });
                }
            },
        };
    },
};
