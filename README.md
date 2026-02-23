# Herdbook

[![E2E Nightly](https://github.com/taco/herdbook/actions/workflows/e2e-nightly.yml/badge.svg)](https://github.com/taco/herdbook/actions/workflows/e2e-nightly.yml)

A mobile-first training journal for equestrians. Log riding sessions by voice or form, track activity per horse, and review training patterns over time.

Deployed to production on Railway + Neon Postgres, used by real riders at a small barn. Built for phones — riders log sessions with dirty or gloved hands, so voice-first capture is a core feature, not a demo.

## Features

**AI-powered**

- **Voice session capture** — Speak naturally ("rode Luna for an hour, worked on canter transitions, she was stiff to the right"). Whisper transcribes, GPT-5.2 extracts structured fields (horse, duration, work type) and organizes the transcript into clean training notes. Horse names are resolved from context via the LLM — handles partial names and nicknames.
- **Training summaries** — AI-generated per-horse summaries that synthesize session history into workload signals, focus areas, and narrative insight. Versioned prompt registry with configurable models.

**Core loop**

- Manual session entry with form persistence and field-level voice input
- Per-horse activity heatmaps (12-week view)
- Dashboard with recent activity feed
- Horse and rider management with soft-delete
- JWT auth with invite code signup and tiered rate limiting

## Architecture Highlights

This is a pnpm monorepo with three packages: `api`, `web`, and `e2e`.

| What                   | Where                          | Why it's interesting                                                                                                                           |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice parsing pipeline | `api/src/rest/voice.ts`        | Whisper transcription → structured extraction via JSON Schema. LLM resolves horse/rider names from context, infers work type, parses duration. |
| Prompt registry        | `api/src/prompts/`             | Versioned prompt configs with model resolution from env vars. Each prompt is a typed config object, not a string.                              |
| Training summaries     | `api/src/rest/horseSummary.ts` | Computes workload signals from session history, feeds them to an LLM for narrative synthesis. Validates and caches output.                     |
| AI rate limiting       | `api/src/rest/utils/`          | Per-user burst + daily rate limiters shared across all AI endpoints. Prevents runaway costs.                                                   |
| GraphQL + DataLoader   | `api/src/graphql/`             | Schema-first GraphQL with Prisma resolvers and DataLoader for N+1 resolution.                                                                  |
| Navigation system      | `web/src/hooks/useAppNavigate` | View Transitions API for native-feeling page animations. Two layout types: tab bar and full-screen overlay.                                    |
| E2E test tiers         | `e2e/tests/`                   | Smoke (auth, nav) runs on PRs. Full regression (all features, Chrome + Safari) runs on main and nightly cron.                                  |

## Tech Stack

| Layer   | Stack                                                        |
| ------- | ------------------------------------------------------------ |
| API     | Fastify, GraphQL, Prisma, PostgreSQL (Neon), TypeScript      |
| Web     | React, Vite, Apollo Client, Tailwind + Shadcn UI, TypeScript |
| Testing | Vitest, Playwright, Docker (isolated test Postgres)          |
| Infra   | Railway (hosting), Neon (database branching), GitHub Actions |

## Project Structure

```
herdbook/
├── packages/
│   ├── api/              # GraphQL API server
│   │   ├── prisma/       # Schema and migrations
│   │   └── src/
│   │       ├── graphql/  # Schema, resolvers, loaders
│   │       ├── prompts/  # AI prompt registry (versioned)
│   │       ├── rest/     # REST endpoints (voice, summaries)
│   │       └── middleware/
│   ├── web/              # React frontend (mobile-only)
│   │   └── src/
│   │       ├── pages/
│   │       ├── layouts/  # TabLayout, FullScreenLayout
│   │       └── components/
│   └── e2e/              # Playwright tests (smoke + regression)
├── docs/                 # Design docs and product roadmap
└── scripts/              # Dev tooling
```

## Getting Started

**Prerequisites**: Node.js (see `.node-version`), pnpm 10.4+, PostgreSQL

```bash
cp .env.example .env.local    # Add your DATABASE_URL, JWT_SECRET
pnpm env:local                # Point API at local database
pnpm run init                 # Install deps + generate Prisma client
pnpm --filter api run prisma:migrate  # Run migrations
pnpm dev                      # Start API (port 4000) + Web (port 5173)
```

## Testing

```bash
pnpm run test       # Unit/integration tests (Vitest)
pnpm run test:e2e   # Full E2E suite (spins up Docker Postgres, runs Playwright)
pnpm run check      # Format check + typecheck (also runs as pre-commit hook)
```

E2E tests are split into **smoke** (fast, PR-blocking) and **regression** (full feature coverage, runs on main + nightly). Docker must be running — the test harness handles container lifecycle automatically.

## Environment Management

Environment config lives at the repo root as `.env.*` files (gitignored), symlinked into `packages/api/.env`:

```bash
pnpm env:local      # Local PostgreSQL (default)
pnpm env:neon-dev   # Neon dev branch (child of production)
pnpm env:neon-prod  # Neon production
pnpm env:status     # Check which env is active
```

| Variable       | Description                                       |
| -------------- | ------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                      |
| `JWT_SECRET`   | Secret for signing JWTs (32+ chars in production) |

## License

[MIT](LICENSE)
