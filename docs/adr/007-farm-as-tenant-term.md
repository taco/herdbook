# ADR 007: Farm as the Tenant Term

**Status:** Accepted
**Date:** 2026-09-04

## Context

The tenant boundary was originally named **Barn** (ADR 003). Hunter/jumper and dressage facilities, the app's target users, call themselves farms, not barns, and the first production tenant was already named "Field Hunter Farm". With the product renamed to FarmStride, keeping "Barn" as the tenant term would put the glossary, the brand, and the users' own vocabulary at odds.

"Barn" also carries a second meaning, the physical building, which made prose like "riders use the app at the barn" ambiguous about whether it referred to the tenant or the place.

## Decision

**Farm is the tenant.** A farm is one riding operation with its riders and horses. It is not a piece of land: two trainers running separate programs on the same property are two farms. One rider belongs to exactly one farm, unchanged from the Barn model.

**Code identifiers follow the glossary; the physical database does not.** The Prisma model, GraphQL type, helpers, loaders, components, and tests are renamed to Farm. The Postgres table `"Barn"`, the `barnId` columns, the `barn_isolation` row-level security policies, and the `app.current_barn_id` session variable are left untouched, with `@@map` / `@map` in the Prisma schema bridging the two names.

**"Barn" survives only as the building.** It is on the glossary's avoid list for the tenant concept, but prose may still use it for the physical place.

## Considered Options

- **Keep Barn everywhere.** Rejected: the glossary would contradict the brand and the users, and every new contributor would ask why.
- **Rename in the glossary and UI copy only.** Rejected: the codebase saying Barn while CONTEXT.md says Farm is exactly the drift a glossary exists to prevent.
- **Rename the physical database too.** Deferred: the table rename, policy renames, and the session-variable rename are the only irreversible parts, and the session variable is an untyped string contract between application code and SQL. If it drifts, RLS fails closed and every query returns empty. Nothing user-visible is gained. Revisit as its own ticket if the mapping ever becomes a maintenance burden.

## Consequences

- Two lines of `@@map` / `@map` in `schema.prisma` are the only place the Barn name remains in application code.
- Hand-written SQL, migrations, and RLS policy work must still use the physical names (`"Barn"`, `barnId`, `app.current_barn_id`).
- Docs describing the physical building ("most barns have cell service", ADR 006) keep the word "barn" deliberately.
