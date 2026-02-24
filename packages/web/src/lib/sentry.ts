import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
    useLocation,
    useNavigationType,
    createRoutesFromChildren,
    matchRoutes,
} from 'react-router-dom';

const SENSITIVE_KEY_PATTERN =
    /token|authorization|password|secret|credential|session/i;

function redactSensitiveValues(
    obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    if (!obj) return obj;
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            redacted[key] = '[Redacted]';
        } else if (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            redacted[key] = redactSensitiveValues(
                value as Record<string, unknown>
            );
        } else {
            redacted[key] = value;
        }
    }
    return redacted;
}

export function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
    if (event.request?.headers) {
        event.request.headers = redactSensitiveValues(
            event.request.headers as Record<string, unknown>
        ) as Record<string, string>;
    }
    if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = redactSensitiveValues(
            event.request.data as Record<string, unknown>
        );
    }
    if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
            if (breadcrumb.data) {
                breadcrumb.data = redactSensitiveValues(
                    breadcrumb.data as Record<string, unknown>
                );
            }
        }
    }
    return event;
}

/** Header name used to pass the GraphQL operation name to Sentry span enrichment. */
export const GRAPHQL_OP_HEADER = 'x-graphql-operation-name';

function buildTracePropagationTargets(): (string | RegExp)[] {
    const targets: (string | RegExp)[] = [/^\/graphql/, /^\/api\//];
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
        targets.push(apiUrl);
    }
    return targets;
}

export function initSentry(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) return;

    const tracesSampleRate = parseFloat(
        import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0'
    );

    Sentry.init({
        dsn,
        sendDefaultPii: false,
        environment: import.meta.env.MODE,
        beforeSend,
        integrations: [
            Sentry.reactRouterV7BrowserTracingIntegration({
                useEffect,
                useLocation,
                useNavigationType,
                createRoutesFromChildren,
                matchRoutes,
                onRequestSpanStart(span, { headers }) {
                    const opName = headers?.get?.(GRAPHQL_OP_HEADER);
                    if (opName) {
                        span.updateName(`POST /graphql (${opName})`);
                        span.setAttribute('graphql.operation', opName);
                    }
                },
            }),
        ],
        tracesSampleRate: isNaN(tracesSampleRate) ? 0 : tracesSampleRate,
        tracePropagationTargets: buildTracePropagationTargets(),
    });
}

export function setSentryUser(riderId: string | null): void {
    if (riderId) {
        Sentry.setUser({ id: riderId });
    } else {
        Sentry.setUser(null);
    }
}

export function captureGraphQLError(
    error: Error,
    operationName: string | undefined,
    extras?: Record<string, unknown>
): void {
    Sentry.withScope((scope) => {
        scope.setTag('graphql.operation', operationName ?? 'unknown');
        if (extras) {
            scope.setContext('graphql', extras);
        }
        Sentry.captureException(error);
    });
}
