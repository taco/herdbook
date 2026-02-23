import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { ApolloProvider } from '@apollo/client/react';
import { client } from '@/lib/apollo';
import { AuthProvider } from '@/context/AuthContext';
import { initSentry } from '@/lib/sentry';
import App from '@/App';
import '@/index.css';

initSentry();

function SentryFallback(): React.ReactElement {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">
                Something went wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
                An unexpected error occurred. Please refresh to try again.
            </p>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
                Refresh
            </button>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Sentry.ErrorBoundary fallback={<SentryFallback />}>
            <ApolloProvider client={client}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ApolloProvider>
        </Sentry.ErrorBoundary>
    </React.StrictMode>
);
