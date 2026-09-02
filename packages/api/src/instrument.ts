import 'dotenv/config';
import { initSentry } from '@/utils/sentry';
import { initTelemetry } from '@/telemetry';

// Sentry first so it decides whether to defer OTel setup; then the SDK
// that owns the tracer provider Sentry's error events read trace IDs from.
initSentry();
initTelemetry();
