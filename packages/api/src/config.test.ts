import { afterEach, describe, expect, it } from 'vitest';
import { getCorsOrigin, isDevelopment } from './config';

// The shared test setup forces NODE_ENV=development, so each case here mutates
// process.env at call time (both helpers read it live) and restores afterward.
const originalNodeEnv = process.env.NODE_ENV;
const originalCors = process.env.CORS_ALLOWED_ORIGINS;

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCors === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
    } else {
        process.env.CORS_ALLOWED_ORIGINS = originalCors;
    }
});

describe('isDevelopment (fail-closed dev gate)', () => {
    it('is true only for an explicit development env', () => {
        process.env.NODE_ENV = 'development';
        expect(isDevelopment()).toBe(true);
    });

    it('treats production as non-development', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopment()).toBe(false);
    });

    it('fails closed when NODE_ENV is unset', () => {
        delete process.env.NODE_ENV;
        expect(isDevelopment()).toBe(false);
    });

    it('fails closed for an unknown env value', () => {
        process.env.NODE_ENV = 'staging';
        expect(isDevelopment()).toBe(false);
    });
});

describe('getCorsOrigin (production requires an explicit allowlist)', () => {
    it('throws in production when CORS_ALLOWED_ORIGINS is unset', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.CORS_ALLOWED_ORIGINS;
        expect(() => getCorsOrigin()).toThrow(/CORS_ALLOWED_ORIGINS/);
    });

    it('does not require an allowlist in development', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.CORS_ALLOWED_ORIGINS;
        expect(() => getCorsOrigin()).not.toThrow();
    });
});
