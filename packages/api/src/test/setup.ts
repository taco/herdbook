// Shared test bootstrap for `packages/api`.
// Keep this minimal: only env + global test hygiene.

process.env.JWT_SECRET ??= 'api-test-jwt-secret';

// High rate-limit defaults so tests never hit 429s.
process.env.RATE_LIMIT_READ ??= '10000';
process.env.RATE_LIMIT_WRITE ??= '10000';
process.env.RATE_LIMIT_AUTH ??= '10000';
