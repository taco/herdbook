import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { GRAPHQL_URL } from './api';
import { captureGraphQLError, GRAPHQL_OP_HEADER } from './sentry';

const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
});

const authLink = new SetContextLink(({ headers }, request) => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
            ...(request.operationName && {
                [GRAPHQL_OP_HEADER]: request.operationName,
            }),
        },
    };
});

const EXPECTED_ERROR_CODES = new Set([
    'UNAUTHENTICATED',
    'INVALID_CREDENTIALS',
    'NOT_FOUND',
    'BAD_USER_INPUT',
    'FORBIDDEN',
]);

const errorLink = new ErrorLink(({ error, result, operation }) => {
    if (result?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    if (CombinedGraphQLErrors.is(error)) {
        for (const err of error.errors) {
            const code = err.extensions?.code as string | undefined;
            if (code && EXPECTED_ERROR_CODES.has(code)) continue;
            captureGraphQLError(
                new Error(err.message),
                operation.operationName,
                { code }
            );
        }
    } else {
        captureGraphQLError(error, operation.operationName, {
            type: 'network',
        });
    }
});

export const client = new ApolloClient({
    link: authLink.concat(errorLink).concat(httpLink),
    cache: new InMemoryCache(),
});
