---
description: Run tests — E2E (Playwright + Docker Postgres), unit (Vitest), or full suite. Handles infrastructure setup, cleanup, and common failure diagnosis.
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# /verify — Run Tests

## Usage

- `/verify` or `/verify full` — run unit tests, then E2E
- `/verify e2e` — run all E2E tests
- `/verify e2e <filter>` — run E2E tests matching filter (e.g., `auth`, `sessions`)
- `/verify unit` — run all unit tests (API + web)
- `/verify unit api` — run only API unit tests
- `/verify unit web` — run only web unit tests

**Tip:** For iterative E2E development (write/fix tests with fast feedback), use `/e2e` instead.

## Commands

```bash
pnpm run test              # All unit tests (API + web)
pnpm --filter api run test # API only
pnpm --filter web run test # Web only
pnpm run test:e2e          # All E2E
pnpm --filter e2e run test --grep "<filter>"  # Filtered E2E
```

## E2E Infrastructure

### Ports (hardcoded)

| Service  | Port | URL                                                     |
| -------- | ---- | ------------------------------------------------------- |
| Web      | 3099 | http://127.0.0.1:3099                                   |
| API      | 4099 | http://127.0.0.1:4099                                   |
| Postgres | 5433 | postgresql://postgres:test@127.0.0.1:5433/herdbook_test |

### Docker + seed pipeline

Read `packages/e2e/global-setup.ts` for the full sequence. In short:

1. `docker compose -f docker-compose.test.yml up -d`
2. Wait for Postgres healthcheck (30 retries)
3. Prisma migrate + generate + seed

### Key config files

- `packages/e2e/playwright.config.ts` — timeouts, viewport, workers, server setup
- `packages/e2e/tests/seedConstants.ts` — test user/horse constants
- `docker-compose.test.yml` — Postgres 17 on port 5433

## Troubleshooting

### Port already in use

```bash
lsof -i :5433 && lsof -i :4099 && lsof -i :3099
kill -9 $(lsof -t -i :<port>)
```

### Stale Prisma client

```bash
pnpm --filter api run prisma:generate
```

### Database migration drift

```bash
DATABASE_URL="postgresql://postgres:test@127.0.0.1:5433/herdbook_test" \
  pnpm --filter api run prisma:migrate:deploy
```

### Docker cleanup

```bash
docker compose -f docker-compose.test.yml down -v
```
