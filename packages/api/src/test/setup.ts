// Shared test bootstrap for `packages/api`.
// Keep this minimal: only env + global test hygiene.

process.env.JWT_SECRET ??= 'api-test-jwt-secret';
