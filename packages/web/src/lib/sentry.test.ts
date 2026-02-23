import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import { beforeSend } from './sentry';

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
    return { ...overrides } as ErrorEvent;
}

describe('beforeSend', () => {
    describe('request headers', () => {
        it('redacts sensitive header keys', () => {
            const event = makeEvent({
                request: {
                    headers: {
                        authorization: 'Bearer abc123',
                        'x-session-token': 'sess_xyz',
                        'content-type': 'application/json',
                    },
                },
            });

            const result = beforeSend(event);

            expect(result.request?.headers).toEqual({
                authorization: '[Redacted]',
                'x-session-token': '[Redacted]',
                'content-type': 'application/json',
            });
        });

        it('is case-insensitive', () => {
            const event = makeEvent({
                request: {
                    headers: {
                        Authorization: 'Bearer token',
                        PASSWORD: 'secret',
                    },
                },
            });

            const result = beforeSend(event);

            expect(result.request?.headers).toEqual({
                Authorization: '[Redacted]',
                PASSWORD: '[Redacted]',
            });
        });
    });

    describe('request data', () => {
        it('redacts sensitive data keys', () => {
            const event = makeEvent({
                request: {
                    data: {
                        password: 'hunter2',
                        credential: 'cred_abc',
                        email: 'user@example.com',
                    },
                },
            });

            const result = beforeSend(event);

            expect(result.request?.data).toEqual({
                password: '[Redacted]',
                credential: '[Redacted]',
                email: 'user@example.com',
            });
        });

        it('skips non-object data', () => {
            const event = makeEvent({
                request: { data: 'raw string body' },
            });

            const result = beforeSend(event);

            expect(result.request?.data).toBe('raw string body');
        });
    });

    describe('breadcrumbs', () => {
        it('redacts sensitive keys in breadcrumb data', () => {
            const event = makeEvent({
                breadcrumbs: [
                    {
                        data: {
                            secret: 'shh',
                            url: '/api/horses',
                        },
                    },
                    {
                        data: {
                            session_token: 'tok_123',
                            status: 200,
                        },
                    },
                ],
            });

            const result = beforeSend(event);

            expect(result.breadcrumbs?.[0]?.data).toEqual({
                secret: '[Redacted]',
                url: '/api/horses',
            });
            expect(result.breadcrumbs?.[1]?.data).toEqual({
                session_token: '[Redacted]',
                status: 200,
            });
        });

        it('skips breadcrumbs without data', () => {
            const event = makeEvent({
                breadcrumbs: [{ message: 'navigation' }],
            });

            const result = beforeSend(event);

            expect(result.breadcrumbs?.[0]?.data).toBeUndefined();
        });
    });

    describe('nested objects', () => {
        it('redacts sensitive keys inside nested objects', () => {
            const event = makeEvent({
                request: {
                    data: {
                        operationName: 'Login',
                        variables: {
                            email: 'user@example.com',
                            password: 'hunter2',
                        },
                    },
                },
            });

            const result = beforeSend(event);

            expect(result.request?.data).toEqual({
                operationName: 'Login',
                variables: {
                    email: 'user@example.com',
                    password: '[Redacted]',
                },
            });
        });

        it('redacts deeply nested sensitive keys', () => {
            const event = makeEvent({
                breadcrumbs: [
                    {
                        data: {
                            request: {
                                body: { credentials: { token: 'abc' } },
                            },
                        },
                    },
                ],
            });

            const result = beforeSend(event);

            expect(result.breadcrumbs?.[0]?.data).toEqual({
                request: {
                    body: { credentials: '[Redacted]' },
                },
            });
        });
    });

    describe('edge cases', () => {
        it('handles event with no request or breadcrumbs', () => {
            const event = makeEvent({});

            const result = beforeSend(event);

            expect(result).toEqual({});
        });

        it('preserves all non-sensitive values unchanged', () => {
            const event = makeEvent({
                request: {
                    headers: { 'x-request-id': 'abc-123' },
                    data: { name: 'Cheeto', breed: 'Quarter Horse' },
                },
                breadcrumbs: [{ data: { url: '/horses', method: 'GET' } }],
            });

            const result = beforeSend(event);

            expect(result.request?.headers).toEqual({
                'x-request-id': 'abc-123',
            });
            expect(result.request?.data).toEqual({
                name: 'Cheeto',
                breed: 'Quarter Horse',
            });
            expect(result.breadcrumbs?.[0]?.data).toEqual({
                url: '/horses',
                method: 'GET',
            });
        });
    });
});
