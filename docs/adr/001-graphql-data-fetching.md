# ADR 001: GraphQL Data-Fetching Strategy

**Status:** Accepted
**Date:** 2026-03-12

## Context

The API serves a GraphQL schema over Fastify with Prisma as the data layer. Queries frequently nest related entities (e.g., `horses { sessions { rider } }`), which creates N+1 risk in field resolvers. We needed a consistent pattern that stays simple (no service layer, no ORM abstractions) while preventing N+1 regardless of how queries are composed.

## Decision

Data fetching follows a two-tier pattern:

**Top-level resolvers** (Query/Mutation) call Prisma directly, scoped by `context.rider.barnId`. They return plain Prisma rows.

**Field resolvers** use request-scoped DataLoaders exclusively — never direct Prisma. Loaders batch all `.load()` calls within a single event loop tick into one `findMany` with an `IN` clause, then distribute results back to each caller.

```
Query resolver          Field resolver          DataLoader             Prisma
─────────────           ──────────────          ──────────             ──────
horses(barnId) ──────▶  Horse.sessions ──────▶  load("A")  ─┐
                         Horse.sessions ──────▶  load("B")  ─┤  tick ends
                         Horse.sessions ──────▶  load("C")  ─┘
                                                     │
                                                     ▼
                                           findMany({ horseId: { in: ["A","B","C"] } })
                                                     │
                                                     ▼
                                           groupByKey → resolve each promise
```

### Why uniform loaders (even when N=1 today)

Some field resolvers currently only fire once per request (e.g., `Rider.barn` on a single-rider profile page). We still route them through loaders because:

1. **Consistency.** Mixed patterns (`context.loaders.X` vs `prisma.X.findMany`) force readers to understand _why_ each resolver chose its approach. Uniform loaders eliminate that question.
2. **Deduplication.** DataLoaders deduplicate by key within a request. If 5 horses share the same `barnId`, the `barn` loader makes one query, not five — even without explicit N+1 risk.
3. **Composition safety.** Query composition is controlled by the client. A resolver that's N=1 today becomes N+1 when someone adds it to a list query. Loaders make this safe by default.

### What we avoided

- **Service layer.** Resolvers call Prisma directly (or through loaders that call Prisma). No intermediate abstractions.
- **Per-loader auth/scoping.** Loaders don't filter by `barnId`. Auth is enforced at two other layers: `secureByDefaultTransformer` (schema-level, blocks unauthenticated access) and Postgres RLS (`app.current_barn_id` set per request). Loaders only see rows the DB allows.

## Alternatives considered

**Raw SQL (handwritten queries or query builder).** A single joined query could fetch parents + children in one round-trip instead of one query per loader. The app already uses `$executeRaw` for RLS setup, so raw SQL isn't off the table. Rejected because: Prisma's `findMany` returns typed results that track schema changes automatically — raw SQL returns `unknown` and silently drifts when columns are added. The loaders already reduce N queries to 1 per entity type, so the remaining win is merging loaders into joined queries, which couples unrelated entities. RLS session variables work with `$queryRaw` but are easier to accidentally bypass. If a resolver ever needs complex aggregation (counts, grouping), raw SQL is the right tool — but for FK lookups, Prisma generates essentially the same SQL.

**Prisma fluent relations (`include`/`select` at the top level).** Fetch everything in the query resolver with nested `include: { sessions: true, barn: true }` and let GraphQL pull from the pre-loaded object. Eliminates N+1 without loaders, but over-fetches — every query pays for every relation whether the client asked for it or not. Also couples the query resolver to knowledge of which nested fields exist, breaking when fields are added.

**`@defer` / query-aware field resolution.** Use GraphQL info to detect which fields were requested and build a dynamic Prisma `include`. Avoids over-fetching but adds significant complexity parsing the GraphQL AST, and doesn't compose well when field resolvers need their own logic (e.g., `Horse.summary` computing staleness).

**Service layer with repository pattern.** Wrap Prisma behind service classes that handle batching internally. Adds indirection without clear benefit — Prisma's API is already expressive, and DataLoaders handle batching at the right layer (per-request, per-field). More files, more abstractions, same Prisma calls underneath.

**No batching, accept N+1.** The dataset is small (single barn, typically <20 horses). N+1 with 20 queries is noticeable but not catastrophic. Rejected because the fix is cheap (DataLoader is ~5 lines per loader) and the cost compounds — Dashboard loads horses + sessions + activity, turning 20 into 40+ queries.

## Consequences

- Adding a new field resolver means adding a loader in `loaders.ts` first. Slightly more upfront work than a raw Prisma call.
- Loaders are request-scoped (created fresh in `buildContext`), so there's no cross-request cache to invalidate.
- `groupByKey` assumes foreign keys are non-null. If a nullable FK is added, the loader must handle `null` keys explicitly.
