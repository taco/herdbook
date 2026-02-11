---
description: Write API integration tests using fastify.inject() — JWT token creation, GraphQL query/mutation payloads, Prisma seed/cleanup lifecycle, type-safe response parsing, error code checking.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /test-api — Write API Integration Tests

## Usage

- `/test-api <resolver or endpoint>` — write tests for the specified resolver/endpoint

## Before Writing

Read these files to match current patterns:

- `packages/api/src/loaders.test.ts` — query test with seed data, JWT auth, cleanup lifecycle
- `packages/api/src/resolvers.signup.test.ts` — mutation test with env var manipulation, error code checking
- `packages/api/src/resolvers.ratelimit.test.ts` — rate limit testing
- `packages/api/src/transcribe.test.ts` — REST endpoint with multipart file upload

## Test File Location

Co-located: `packages/api/src/<feature>.test.ts`

## Key Conventions

- **`createApiApp()`** from `@/server` to create Fastify instance
- **`fastify.inject()`** for requests — no real HTTP, no port needed
- **JWT**: `jwt.sign({ riderId }, getJwtSecretOrThrow(), { expiresIn: '1h' })`
- **Auth header**: `authorization: \`Bearer ${token}\``
- **GraphQL**: always `POST /graphql` with `{ query, variables }` payload
- **Error codes**: check `body.errors?.[0]?.extensions?.code` (e.g., `NOT_FOUND`, `UNAUTHENTICATED`)
- **Unique emails**: `test-${Date.now()}@example.com` to avoid collisions
- **Cleanup order**: delete children before parents (FK constraints)
- **Always close**: `fastify.close()` and `prisma.$disconnect()` in `afterAll`

## Running

```bash
pnpm --filter api run test              # all API tests
pnpm --filter api run test -- feature   # specific file
pnpm --filter api run test:watch        # watch mode
```
