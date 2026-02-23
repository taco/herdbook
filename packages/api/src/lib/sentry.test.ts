import { describe, it, expect } from 'vitest';
import type { ErrorEvent, Breadcrumb } from '@sentry/node';
import {
    beforeSend,
    redactSensitiveValues,
    EXPECTED_ERROR_CODES,
} from './sentry';

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
    return { ...overrides } as ErrorEvent;
}

describe('beforeSend', () => {
    it('redacts Authorization header', () => {
        const event = makeEvent({
            request: {
                headers: { authorization: 'Bearer abc123', host: 'localhost' },
            },
        });
        const result = beforeSend(event);
        expect(result.request?.headers?.authorization).toBe('[Redacted]');
        expect(result.request?.headers?.host).toBe('localhost');
    });

    it('redacts headers case-insensitively', () => {
        const event = makeEvent({
            request: {
                headers: { Authorization: 'Bearer xyz' } as Record<
                    string,
                    string
                >,
            },
        });
        const result = beforeSend(event);
        expect(result.request?.headers?.Authorization).toBe('[Redacted]');
    });

    it('redacts password in request body', () => {
        const event = makeEvent({
            request: {
                data: { email: 'a@b.com', password: 'secret' },
            },
        });
        const result = beforeSend(event);
        const data = result.request?.data as Record<string, unknown>;
        expect(data.password).toBe('[Redacted]');
        expect(data.email).toBe('a@b.com');
    });

    it('redacts credential fields in request body', () => {
        const event = makeEvent({
            request: { data: { credential: 'x', name: 'ok' } },
        });
        const result = beforeSend(event);
        const data = result.request?.data as Record<string, unknown>;
        expect(data.credential).toBe('[Redacted]');
        expect(data.name).toBe('ok');
    });

    it('redacts server-specific keys: database_url, api_key, openai, connection_string', () => {
        const event = makeEvent({
            request: {
                data: {
                    database_url: 'postgres://...',
                    api_key: 'sk-123',
                    openai_key: 'sk-456',
                    connection_string: 'host=...',
                    safe_field: 'keep',
                },
            },
        });
        const result = beforeSend(event);
        const data = result.request?.data as Record<string, unknown>;
        expect(data.database_url).toBe('[Redacted]');
        expect(data.api_key).toBe('[Redacted]');
        expect(data.openai_key).toBe('[Redacted]');
        expect(data.connection_string).toBe('[Redacted]');
        expect(data.safe_field).toBe('keep');
    });

    it('redacts nested objects in request data', () => {
        const event = makeEvent({
            request: {
                data: {
                    variables: { password: 'nested-secret', name: 'ok' },
                },
            },
        });
        const result = beforeSend(event);
        const vars = (result.request?.data as Record<string, unknown>)
            .variables as Record<string, unknown>;
        expect(vars.password).toBe('[Redacted]');
        expect(vars.name).toBe('ok');
    });

    it('redacts deeply nested sensitive keys', () => {
        const event = makeEvent({
            request: {
                data: {
                    level1: { level2: { secret_value: 'deep', ok: true } },
                },
            },
        });
        const result = beforeSend(event);
        const deep = (
            (result.request?.data as Record<string, unknown>).level1 as Record<
                string,
                unknown
            >
        ).level2 as Record<string, unknown>;
        expect(deep.secret_value).toBe('[Redacted]');
        expect(deep.ok).toBe(true);
    });

    it('redacts breadcrumb data', () => {
        const breadcrumbs: Breadcrumb[] = [
            { data: { authorization: 'Bearer xyz', url: '/api' } },
            { data: { token: 'abc', method: 'POST' } },
        ];
        const event = makeEvent({ breadcrumbs });
        const result = beforeSend(event);
        expect(result.breadcrumbs![0].data?.authorization).toBe('[Redacted]');
        expect(result.breadcrumbs![0].data?.url).toBe('/api');
        expect(result.breadcrumbs![1].data?.token).toBe('[Redacted]');
        expect(result.breadcrumbs![1].data?.method).toBe('POST');
    });

    it('redacts sensitive keys in event.extra', () => {
        const event = makeEvent({
            extra: { session_token: 'abc', horseId: '123' },
        });
        const result = beforeSend(event);
        expect(result.extra?.session_token).toBe('[Redacted]');
        expect(result.extra?.horseId).toBe('123');
    });

    it('preserves non-sensitive values unchanged', () => {
        const event = makeEvent({
            request: {
                headers: { 'content-type': 'application/json', host: 'x' },
                data: { query: 'mutation { ... }', name: 'test' },
            },
        });
        const result = beforeSend(event);
        expect(result.request?.headers?.['content-type']).toBe(
            'application/json'
        );
        expect(result.request?.headers?.host).toBe('x');
        const data = result.request?.data as Record<string, unknown>;
        expect(data.query).toBe('mutation { ... }');
        expect(data.name).toBe('test');
    });

    it('passes through non-object request data', () => {
        const event = makeEvent({
            request: { data: 'raw string body' },
        });
        const result = beforeSend(event);
        expect(result.request?.data).toBe('raw string body');
    });

    it('redacts sensitive keys inside arrays', () => {
        const event = makeEvent({
            request: {
                data: {
                    users: [
                        { name: 'Alice', password: 'secret1' },
                        { name: 'Bob', password: 'secret2' },
                    ],
                },
            },
        });
        const result = beforeSend(event);
        const users = (result.request?.data as Record<string, unknown>)
            .users as Record<string, unknown>[];
        expect(users[0].password).toBe('[Redacted]');
        expect(users[0].name).toBe('Alice');
        expect(users[1].password).toBe('[Redacted]');
        expect(users[1].name).toBe('Bob');
    });

    it('handles empty/missing event fields safely', () => {
        expect(beforeSend(makeEvent())).toEqual({});
        expect(beforeSend(makeEvent({ request: {} }))).toEqual({ request: {} });
        expect(beforeSend(makeEvent({ breadcrumbs: [] }))).toEqual({
            breadcrumbs: [],
        });
    });
});

describe('redactSensitiveValues', () => {
    it('returns undefined for undefined input', () => {
        expect(redactSensitiveValues(undefined)).toBeUndefined();
    });
});

describe('EXPECTED_ERROR_CODES', () => {
    it('contains all expected codes', () => {
        const expected = [
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
        ];
        for (const code of expected) {
            expect(EXPECTED_ERROR_CODES.has(code)).toBe(true);
        }
    });

    it('does not contain unexpected codes', () => {
        expect(EXPECTED_ERROR_CODES.has('INTERNAL_SERVER_ERROR')).toBe(false);
        expect(EXPECTED_ERROR_CODES.has('UNKNOWN')).toBe(false);
        expect(EXPECTED_ERROR_CODES.has('')).toBe(false);
    });
});
