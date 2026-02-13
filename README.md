# Herdbook

[![E2E Nightly](https://github.com/taco/herdbook/actions/workflows/e2e-nightly.yml/badge.svg)](https://github.com/taco/herdbook/actions/workflows/e2e-nightly.yml)

A mobile-first training journal for equestrians. Log riding sessions by voice or form, track activity per horse, and review training patterns over time.

## What It Does

- Voice-to-text session logging (Whisper + GPT-4o-mini) — log rides with dirty or gloved hands
- Manual session entry with form persistence
- Per-horse activity heatmaps (12-week view)
- Dashboard with recent activity feed
- Horse and session CRUD with soft-delete
- JWT auth with email allowlist and rate limiting

## Tech Stack

### API (`packages/api`)

- [Fastify](https://www.fastify.io/) + GraphQL — web framework and API
- [Prisma](https://www.prisma.io/) — database ORM
- [PostgreSQL](https://www.postgresql.org/) — database (Neon in production)
- [TypeScript](https://www.typescriptlang.org/)

### Web (`packages/web`)

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — UI and build
- [Apollo Client](https://www.apollographql.com/docs/react/) — GraphQL client
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) — mobile-only styling
- [TypeScript](https://www.typescriptlang.org/)

### Testing

- [Vitest](https://vitest.dev/) — unit/integration tests
- [Playwright](https://playwright.dev/) — E2E tests
- [Docker](https://www.docker.com/) — isolated test Postgres

### Tooling

- [pnpm](https://pnpm.io/) workspaces — monorepo package manager

## Prerequisites

- [Node.js](https://nodejs.org/) (see `.node-version` for required version)
- [pnpm](https://pnpm.io/) (v10.4.0+)
- [PostgreSQL](https://www.postgresql.org/) database

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd herdbook
```

2. Set up environment variables (see [Environment Management](#environment-management) for details):

```bash
cp .env.example .env.local
# Edit .env.local with your local database credentials
pnpm env:local
```

3. Initialize the project:

```bash
pnpm run init
```

This installs dependencies and generates the Prisma client.

4. Set up the database:

```bash
pnpm --filter api run prisma:migrate
```

## Development

### Run both API and Web together:

```bash
pnpm dev
```

### Run individually:

```bash
# API only (runs on http://localhost:4000)
pnpm dev:api

# Web only (runs on http://localhost:5173)
pnpm dev:web
```

The API GraphQL playground will be available at `http://localhost:4000/graphql`.

## Building

### Build all packages:

```bash
pnpm build
```

### Build individually:

```bash
pnpm build:api
pnpm build:web
```

## Project Structure

```
herdbook/
├── packages/
│   ├── api/              # GraphQL API server
│   │   ├── prisma/       # Schema and migrations
│   │   └── src/
│   │       ├── graphql/  # Schema, resolvers, loaders
│   │       ├── rest/     # REST endpoints (transcribe, parse)
│   │       ├── middleware/
│   │       └── index.ts  # Server entry point
│   ├── web/              # React frontend (mobile-only)
│   │   └── src/
│   │       ├── pages/
│   │       ├── layouts/  # TabLayout, FullScreenLayout
│   │       ├── components/
│   │       └── main.tsx
│   └── e2e/              # Playwright tests
│       └── tests/
├── docs/                 # Design docs and roadmap
├── scripts/              # Dev tooling (dev server, E2E dev loop)
└── package.json          # Workspace scripts
```

## Available Scripts

### Root level:

- `pnpm run init` — install dependencies and generate Prisma client
- `pnpm run dev` — run both API and Web in development mode
- `pnpm run check` — format check + typecheck across all packages
- `pnpm run format` — auto-fix formatting with Prettier
- `pnpm run test` — unit/integration tests (API + Web)
- `pnpm run test:e2e` — E2E tests (Docker Postgres, full stack)
- `pnpm run test:e2e:dev` — E2E dev loop with hot reload
- `pnpm run env:local` / `env:neon-dev` / `env:neon-prod` — switch database environments

### API package (`packages/api`):

- `pnpm --filter api run dev` — dev server with hot reload
- `pnpm --filter api run prisma:migrate` — run database migrations
- `pnpm --filter api run prisma:generate` — generate Prisma Client
- `pnpm --filter api run prisma:studio` — open Prisma Studio

### Web package (`packages/web`):

- `pnpm --filter web run dev` — dev server
- `pnpm --filter web run codegen` — regenerate GraphQL types

## Testing

### Unit/Integration Tests

```bash
# API tests
pnpm --filter api test

# Web tests
pnpm --filter web test
```

### E2E Tests

E2E tests use Playwright and run against an isolated Docker Postgres instance. Tests are split into two tiers:

- **Smoke** (`tests/smoke/`) — critical path tests (auth, navigation). Chromium-only, parallel, fast.
- **Regression** (`tests/regression/`) — full feature tests (horses, sessions). Chrome + Safari.

```bash
# From root - runs all tests (smoke + regression)
pnpm test:e2e

# Smoke tests only
pnpm --filter e2e exec playwright test --config playwright.smoke.config.ts

# Regression tests only
pnpm --filter e2e exec playwright test --config playwright.regression.config.ts

# With Playwright UI for debugging
pnpm --filter e2e test:ui
```

**CI strategy:**

- **Pull requests** run smoke tests only (fast feedback)
- **Push to main** runs the full suite (smoke + regression)
- **Nightly cron** runs the full suite on schedule

**Prerequisites**: Docker must be running. The test suite automatically:

1. Spins up a test Postgres container (port 5433)
2. Runs migrations and seeds test data
3. Starts API and web servers
4. Runs Playwright tests
5. Tears down the container

## Environment Management

Environment configuration is managed at the **root level** with symlinks to packages. This allows easy switching between local development, Neon dev, and production databases.

### Environment Files

```
herdbook/
├── .env.local        # Local development (localhost PostgreSQL)
├── .env.neon-dev     # Neon dev branch
├── .env.neon-prod    # Neon production branch
├── .env.example      # Template for new developers
└── packages/
    └── api/.env      # Symlink → one of the root env files
```

**Note**: Neon uses database branches. The dev branch is a child of production, allowing you to test schema changes safely before applying to production.

All root `.env.*` files are gitignored. The `packages/api/.env` symlink points to whichever environment is active.

### Switching Environments

```bash
# Switch to local PostgreSQL (default)
pnpm env:local

# Switch to Neon dev branch
pnpm env:neon-dev

# Switch to Neon production branch
pnpm env:neon-prod

# Check which environment is active
pnpm env:status
```

### Required Variables

| Variable         | Description                                       | Example                                          |
| ---------------- | ------------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`   | PostgreSQL connection string                      | `postgresql://user:pass@localhost:5432/herdbook` |
| `JWT_SECRET`     | Secret for signing JWTs (32+ chars in production) | `your-secret-key`                                |
| `ALLOWED_EMAILS` | Comma-separated email whitelist                   | `user@example.com,other@example.com`             |

### Optional Variables

| Variable               | Description                       | Default    |
| ---------------------- | --------------------------------- | ---------- |
| `RATE_LIMIT_READ`      | Read requests per minute          | `120`      |
| `RATE_LIMIT_WRITE`     | Write requests per minute         | `30`       |
| `RATE_LIMIT_AUTH`      | Auth requests per minute          | `10`       |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins (production) | `*` in dev |

### Web Package

The web package has its own `.env.local` for dev conveniences (auto-login, etc.). This doesn't need environment switching since `VITE_API_URL` only changes at deploy time.

```
packages/web/.env.local   # Dev conveniences (VITE_DEV_EMAIL, etc.)
```

| Variable             | Description                       | Default |
| -------------------- | --------------------------------- | ------- |
| `VITE_API_URL`       | API base URL (required)           | -       |
| `VITE_DEV_EMAIL`     | Prefill login email (dev only)    | -       |
| `VITE_DEV_PASSWORD`  | Prefill login password (dev only) | -       |
| `VITE_DEV_AUTOLOGIN` | Auto-submit login form (dev only) | `false` |

## License

Private project
