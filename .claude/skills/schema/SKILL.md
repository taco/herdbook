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

| File                                      | Purpose                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `packages/api/prisma/schema.prisma`       | Data models                                              |
| `packages/api/src/graphql/schema.graphql` | GraphQL type definitions                                 |
| `packages/api/src/graphql/resolvers.ts`   | Resolvers                                                |
| `packages/api/src/graphql/loaders.ts`     | DataLoaders (N+1)                                        |
| `packages/web/src/generated/graphql.ts`   | Generated TS types                                       |
| `packages/api/src/test/queries.ts`        | Shared test GraphQL strings (update when schema changes) |

## Removing Fields or Models

Removal is the reverse of creation — update consumers first, then remove the source:

### Removing a field

1. **Remove from resolvers** — delete any resolver logic that reads/writes the field
2. **Remove from GraphQL schema** — delete from `schema.graphql`
3. **Regenerate frontend types** — `pnpm --filter web run codegen`
4. **Fix frontend** — remove all references to the field (queries, mutations, UI)
5. **Create migration** — `pnpm --filter api run prisma:migrate -- --name remove_<field>_from_<model>`
6. **Generate Prisma client** — `pnpm --filter api run prisma:generate`
7. **Run checks** — `pnpm run check`

### Removing a model

1. **Remove dependent resolvers** — queries, mutations, field resolvers, DataLoaders
2. **Remove from GraphQL schema** — type, Query fields, Mutation fields, Input types
3. **Fix frontend** — remove pages, routes, queries, components
4. **Remove relations** — update other Prisma models that reference this one
5. **Create migration** — drops the table
6. **Generate clients and run checks**

**Key principle**: always remove the consumers (resolvers, frontend) before removing the source (Prisma model), so that `pnpm run check` catches any remaining references at each step.

## Enum Changes

When adding enum values, update in both `schema.prisma` and `schema.graphql`, then regenerate both clients.
