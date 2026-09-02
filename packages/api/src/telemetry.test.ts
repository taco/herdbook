import { afterEach, describe, expect, it } from 'vitest';
import { trace, ProxyTracerProvider } from '@opentelemetry/api';
import { initTelemetry } from './telemetry';

const originalKey = process.env.HONEYCOMB_API_KEY;

afterEach(() => {
    if (originalKey === undefined) {
        delete process.env.HONEYCOMB_API_KEY;
    } else {
        process.env.HONEYCOMB_API_KEY = originalKey;
    }
});

describe('initTelemetry (off unless HONEYCOMB_API_KEY is set)', () => {
    it('does nothing without a key: no SDK, no exporter, no global tracer provider', () => {
        delete process.env.HONEYCOMB_API_KEY;
        expect(initTelemetry()).toBe(false);

        // The API's proxy provider still has no delegate, so tracer calls are no-ops.
        const provider = trace.getTracerProvider();
        expect(provider).toBeInstanceOf(ProxyTracerProvider);
        expect(
            (provider as ProxyTracerProvider).getDelegate()
        ).not.toHaveProperty('addSpanProcessor');
    });

    it('treats an empty key as unset', () => {
        process.env.HONEYCOMB_API_KEY = '';
        expect(initTelemetry()).toBe(false);
    });
});
