import {
    context,
    diag,
    DiagConsoleLogger,
    DiagLogLevel,
    propagation,
    trace,
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
    defaultResource,
    resourceFromAttributes,
} from '@opentelemetry/resources';
import {
    BatchSpanProcessor,
    type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { SentryContextManager } from '@sentry/node';
import { SentryPropagator } from '@sentry/opentelemetry';
import { getHoneycombApiKey } from '@/config';

/**
 * OpenTelemetry tracing for the API, exported to Honeycomb. Traces only: no
 * metrics or logs signals.
 *
 * This module must be imported before the app, HTTP stack, Prisma, or the
 * OpenAI client so auto-instrumentation can patch them (see instrument.ts).
 *
 * Gated on HONEYCOMB_API_KEY: without it nothing is registered, no exporter
 * is created, and no network calls are made. Sentry stays errors-only; its
 * context manager and propagator are wired in here so error events still
 * carry the trace ID of the request they happened in.
 */

const SERVICE_NAME = 'herdbook-api';
// Incubating semconv attribute; see the note in utils/tracing.ts.
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';
const HONEYCOMB_TRACES_URL = 'https://api.honeycomb.io/v1/traces';

let provider: NodeTracerProvider | null = null;
let unregisterInstrumentations: (() => void) | null = null;

export interface TelemetryOptions {
    /**
     * Replaces the Honeycomb exporter. The only testing seam: integration
     * tests pass an in-memory processor and assert on captured spans.
     */
    spanProcessor?: SpanProcessor;
}

function isHealthCheck(url: string | undefined): boolean {
    return url?.startsWith('/health') ?? false;
}

function buildSpanProcessor(
    options: TelemetryOptions,
    apiKey: string | undefined
): SpanProcessor | null {
    if (options.spanProcessor) return options.spanProcessor;
    if (!apiKey) return null;
    return new BatchSpanProcessor(
        new OTLPTraceExporter({
            url: HONEYCOMB_TRACES_URL,
            headers: { 'x-honeycomb-team': apiKey },
        })
    );
}

/**
 * Start tracing. Returns false when telemetry is disabled (no
 * HONEYCOMB_API_KEY and no override) or already running.
 */
export function initTelemetry(options: TelemetryOptions = {}): boolean {
    if (provider) return false;

    const apiKey = getHoneycombApiKey();
    const spanProcessor = buildSpanProcessor(options, apiKey);
    if (!spanProcessor) return false;

    try {
        // Surface exporter failures in server logs; the default diag logger is silent.
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

        provider = new NodeTracerProvider({
            resource: defaultResource().merge(
                resourceFromAttributes({
                    [ATTR_SERVICE_NAME]: SERVICE_NAME,
                    [ATTR_SERVICE_VERSION]: process.env.RAILWAY_GIT_COMMIT_SHA,
                    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV,
                })
            ),
            spanProcessors: [spanProcessor],
        });
        provider.register({
            contextManager: new SentryContextManager(),
            propagator: new SentryPropagator(),
        });

        unregisterInstrumentations = registerInstrumentations({
            instrumentations: [
                new HttpInstrumentation({
                    ignoreIncomingRequestHook: (req) => isHealthCheck(req.url),
                }),
                new FastifyOtelInstrumentation({
                    registerOnInitialization: true,
                    ignorePaths: ({ url }) => isHealthCheck(url),
                }),
                new GraphQLInstrumentation({
                    // Resolver spans two levels deep: the root field and its
                    // direct children. Deeper than that is DataLoader noise.
                    depth: 2,
                    ignoreTrivialResolveSpans: true,
                    mergeItems: true,
                }),
                // Prisma 7 traces natively; skip raw `pg` instrumentation so
                // each query yields one span, not two.
                new PrismaInstrumentation(),
            ],
        });
    } catch (error) {
        // Observability must never take down the product.
        console.error('[telemetry] Failed to start OpenTelemetry:', error);
        provider = null;
        return false;
    }

    if (!options.spanProcessor) {
        console.log('[telemetry] Exporting traces to Honeycomb');
        process.once('SIGTERM', () => {
            void shutdownTelemetry();
        });
    }
    return true;
}

/** Flush pending spans and unregister tracing. Safe to call when not started. */
export async function shutdownTelemetry(): Promise<void> {
    if (!provider) return;
    const running = provider;
    provider = null;
    unregisterInstrumentations?.();
    unregisterInstrumentations = null;
    try {
        await running.shutdown();
    } catch (error) {
        console.error('[telemetry] Failed to shut down OpenTelemetry:', error);
    }
    // Release the API globals so a later initTelemetry() in the same
    // process (tests) can register again.
    trace.disable();
    context.disable();
    propagation.disable();
}
