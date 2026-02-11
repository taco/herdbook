---
description: Full schema change workflow — Prisma model changes through migration, codegen, GraphQL schema, and resolver updates. Guides you through the correct sequence.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /schema — Schema Change Workflow

## Usage

- `/schema` — interactive guide for any schema change
- `/schema add <model>` — add a new model
- `/schema modify <model>` — modify an existing model

## The Sequence (order matters!)

### 1. Edit Prisma Schema

**File**: `packages/api/prisma/schema.prisma`

Read the existing models for conventions (cuid IDs, Timestamptz, explicit relations, SCREAMING_SNAKE enums).

### 2. Create Migration

```bash
pnpm --filter api run prisma:migrate -- --name <descriptive_name>
```

### 3. Generate Prisma Client

```bash
pnpm --filter api run prisma:generate
```

### 4. Update GraphQL Schema

**File**: `packages/api/src/graphql/schema.graphql`

Read existing types for conventions. Mirror the Prisma model.

### 5. Update Resolvers

**File**: `packages/api/src/graphql/resolvers.ts`

Read existing resolvers for patterns. Key rules:

- Direct Prisma calls (no service layer)
- Always check `context.rider` for auth
- Throw `GraphQLError` with codes: `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN`
- For relations queried in lists, add a DataLoader (see `packages/api/src/graphql/loaders.ts`)

### 6. Regenerate Frontend Types

```bash
pnpm --filter web run codegen
```

### 7. Run Checks

```bash
pnpm run check
```

## Key Files

| File                                      | Purpose                  |
| ----------------------------------------- | ------------------------ |
| `packages/api/prisma/schema.prisma`       | Data models              |
| `packages/api/src/graphql/schema.graphql` | GraphQL type definitions |
| `packages/api/src/graphql/resolvers.ts`   | Resolvers                |
| `packages/api/src/graphql/loaders.ts`     | DataLoaders (N+1)        |
| `packages/web/src/generated/graphql.ts`   | Generated TS types       |

## Enum Changes

When adding enum values, update in both `schema.prisma` and `schema.graphql`, then regenerate both clients.
