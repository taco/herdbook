// Shared test bootstrap for `packages/api`.
// Keep this minimal: only env + global test hygiene.

// Integration tests boot the real server via createApiApp(); run it in
// development mode so CORS/introspection use the permissive local config
// instead of requiring production env vars (see isDevelopment()).
process.env.NODE_ENV = 'development';

process.env.JWT_SECRET ??= 'api-test-jwt-secret';

// High rate-limit defaults so tests never hit 429s.
process.env.RATE_LIMIT_READ ??= '10000';
process.env.RATE_LIMIT_WRITE ??= '10000';
process.env.RATE_LIMIT_AUTH ??= '10000';
