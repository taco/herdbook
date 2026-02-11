---
description: Write web unit tests using Vitest + React Testing Library — MockedProvider for Apollo, MemoryRouter for routing, vi.mock for AuthContext, accessible selectors.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /test-web — Write Web Unit Tests

## Usage

- `/test-web <component or utility>` — write tests for the specified file

## Before Writing

Read these files to match current patterns:

- `packages/web/src/App.test.tsx` — component test with MockedProvider + MemoryRouter + AuthProvider
- `packages/web/src/pages/Login.test.tsx` — page component test with AuthContext mocking
- `packages/web/src/lib/dateUtils.test.ts` — pure utility test

## Test File Location

Co-located: `<Component>.test.tsx` or `<util>.test.ts` next to the source file.

## Key Conventions

- **Wrappers**: `MockedProvider` (Apollo) + `MemoryRouter` (routing) — see `App.test.tsx` for the pattern
- **`addTypename={false}`** on MockedProvider
- **AuthContext mocking**: `vi.mock('@/context/AuthContext', ...)` — see `Login.test.tsx`
- **Selectors**: `getByRole`, `getByLabelText`, `getByText` — no `data-testid`
- **Async data**: `waitFor(() => expect(...))` for Apollo query resolution
- **`@/` path alias**: maps to `packages/web/src/`

## Running

```bash
pnpm --filter web run test               # all web tests
pnpm --filter web run test -- ComponentName  # specific file
pnpm --filter web run test:watch         # watch mode
```
