import * as Sentry from '@sentry/react';

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

export function initSentry(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
        dsn,
        sendDefaultPii: false,
        environment: import.meta.env.MODE,
        beforeSend,
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
