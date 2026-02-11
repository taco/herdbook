---
description: E2E dev loop — start infra, write/fix tests, run single tests with fast feedback, iterate, then run the full suite.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /e2e — E2E Dev Loop

## Usage

- `/e2e` — start the E2E dev environment and iterate
- `/e2e <description>` — write or fix an E2E test for the described scenario

## Workflow

### 1. Check if E2E infra is running

```bash
curl -sf http://127.0.0.1:4099 > /dev/null && echo "up" || echo "down"
curl -sf http://127.0.0.1:3099 > /dev/null && echo "up" || echo "down"
```

### 2. Start infra if needed

```bash
pnpm run test:e2e:dev
```

This starts Docker, migrates, seeds, and launches API + Web with hot reload. Leave it running in the background.

### 3. Write or fix tests

Read these files to match current patterns:

- `packages/e2e/tests/sessions.spec.ts` — most comprehensive example (login, drawer editing, field helpers, navigation)
- `packages/e2e/tests/horses.spec.ts` — CRUD flow pattern
- `packages/e2e/tests/auth.spec.ts` — login/signup flow
- `packages/e2e/tests/seedConstants.ts` — seed data constants
- `packages/e2e/tests/utils/radixHelpers.ts` — Radix select helper

Test file location: `packages/e2e/tests/<feature>.spec.ts`

### 4. Run a single test for fast feedback

```bash
pnpm --filter e2e run test --grep "<test description>"
```

With infra already running, global-setup and teardown are skipped — tests start instantly.

### 5. Iterate

Edit source or test code. The API server (tsx watch) and Web server (Vite HMR) pick up changes automatically. Re-run the single test.

### 6. Run full suite when done

```bash
pnpm --filter e2e run test
```

## Key Conventions

- **Login in `beforeEach`**: fill email + password from seed constants, click Login, assert URL is `/`
- **`exact: true`**: on `getByRole`/`getByText` when text could partially match (e.g., "Me" matching "Home")
- **`getByRole('heading', ...)`**: when page headings duplicate tab labels
- **Drawer editing**: tap `aria-label="Edit ${label}"` to open sheet, interact with dialog, close
- **Notes editing**: `aria-label="Edit Notes"`
- **Back button**: `aria-label="Go back"`
- **Radix selects**: use `selectRadixOption(page, label, option)` from `utils/radixHelpers`
- **No `data-testid`**: prefer `getByRole`, `getByLabel`, `getByText`
- **Mobile viewport**: iPhone 12 (configured in playwright.config.ts)
- **Single worker, 30s timeout**

## Route Reference

Read `packages/web/src/App.tsx` for the current route table.

## Ports

| Service  | Port | URL                                                     |
| -------- | ---- | ------------------------------------------------------- |
| Web      | 3099 | http://127.0.0.1:3099                                   |
| API      | 4099 | http://127.0.0.1:4099                                   |
| Postgres | 5433 | postgresql://postgres:test@127.0.0.1:5433/herdbook_test |
