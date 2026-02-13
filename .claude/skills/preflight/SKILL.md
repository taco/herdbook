---
description: Pre-commit quality gate — runs formatting check, TypeScript typecheck, and optionally unit tests. Diagnoses and fixes common failures.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /preflight — Pre-Commit Quality Gate

## Usage

- `/preflight` — format check + typecheck
- `/preflight fix` — auto-fix formatting, then typecheck
- `/preflight full` — format check + typecheck + unit tests

## Commands

```bash
pnpm run check           # format:check && typecheck
pnpm run format          # auto-fix formatting
pnpm run typecheck       # TypeScript only
pnpm run test            # unit tests (API + web)
```

## Common Fixes

| Symptom                          | Fix                                     |
| -------------------------------- | --------------------------------------- |
| Formatting errors                | `pnpm run format`                       |
| Errors in `generated/graphql.ts` | `pnpm --filter web run codegen`         |
| Cannot find `@prisma/client`     | `pnpm --filter api run prisma:generate` |
| Stale types after schema change  | Run both generate commands above        |

## Resolver Auth Check

After checks pass, scan resolvers for missing auth:

```bash
# Find mutation resolvers missing context.rider check
grep -n "Mutation:" packages/api/src/graphql/resolvers.ts -A 5
```

Every mutation resolver (except `login` and `signup`) must have:

```typescript
if (!context.rider) {
    throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
    });
}
```

Flag any mutation missing this pattern. Also flag queries that filter by `riderId` but accept it as a client argument instead of using `context.rider.id` — this is a data ownership gap.

## Workflow

1. Run the appropriate command
2. If errors: diagnose, fix, re-run `pnpm run check`
3. Run resolver auth check (for changes touching resolvers)
4. Report result
