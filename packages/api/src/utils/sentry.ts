import * as Sentry from '@sentry/node';

export const SENSITIVE_KEY_PATTERN =
    /token|authorization|password|secret|credential|session|database_url|connection_string|api_key|openai/i;

export function redactSensitiveValues(
    obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    if (!obj) return obj;
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            redacted[key] = '[Redacted]';
        } else if (Array.isArray(value)) {
            redacted[key] = value.map((item) =>
                item !== null &&
                typeof item === 'object' &&
                !Array.isArray(item)
                    ? redactSensitiveValues(item as Record<string, unknown>)
                    : item
            );
        } else if (value !== null && typeof value === 'object') {
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
    if (event.extra && typeof event.extra === 'object') {
        event.extra = redactSensitiveValues(
            event.extra as Record<string, unknown>
        );
    }
    return event;
}

export const EXPECTED_ERROR_CODES = new Set([
    'UNAUTHENTICATED',
    'INVALID_CREDENTIALS',
    'NOT_FOUND',
    'BAD_USER_INPUT',
    'FORBIDDEN',
    'EMAIL_IN_USE',
    'EMAIL_NOT_ALLOWED',
    'RATE_LIMITED',
    'GRAPHQL_PARSE_FAILED',
    'GRAPHQL_VALIDATION_FAILED',
]);

export function initSentry(): void {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    const tracesSampleRate = parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'
    );

    Sentry.init({
        dsn,
        sendDefaultPii: false,
        environment: process.env.NODE_ENV ?? 'development',
        beforeSend,
        tracesSampleRate: isNaN(tracesSampleRate) ? 0 : tracesSampleRate,
    });
}

export function setSentryUser(riderId: string): void {
    Sentry.setUser({ id: riderId });
}
