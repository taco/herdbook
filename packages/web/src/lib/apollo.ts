import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { GRAPHQL_URL } from './api';

const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
});

const authLink = new SetContextLink(({ headers }, _) => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

const errorLink = new ErrorLink(({ result }) => {
    if (result?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
});

export const client = new ApolloClient({
    link: authLink.concat(errorLink).concat(httpLink),
    cache: new InMemoryCache(),
});
