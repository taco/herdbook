# ADR 002: GraphQL Authorization Strategy

**Status:** Accepted
**Date:** 2026-03-12

## Context

GraphQL APIs expose a schema where any field can be queried if it's defined. In a multi-user app handling barn data, every new field or type is a potential data leak if the developer forgets to add an auth check. We needed an authorization model that fails closed — unauthenticated access should be impossible unless a field explicitly opts in.

## Decision

Authorization uses a **deny-all, opt-in public** pattern implemented as a schema transformer that wraps every resolver at server startup.

The transformer walks the schema and injects an auth check before each resolver. If `context.rider` is null (no valid JWT), the resolver throws `UNAUTHENTICATED` before any application code runs. Fields annotated with `@public` skip this check — currently only `login` and `signup`.

This creates a three-layer authorization model:

1. **Schema layer (transformer).** Blocks unauthenticated access to all non-`@public` fields. This is the gatekeeping layer — it answers "is this request from a logged-in user?"
2. **Database layer (Postgres RLS).** Restricts rows to the authenticated user's barn. This is the isolation layer — it answers "can this user see this row?" (See ADR 003.)
3. **Application layer (resolver guards).** Role-based checks (`requireTrainer`, `requireOwnerOrTrainer`) for specific mutations. This is the permissions layer — it answers "does this user have the right role for this action?"

Because the transformer handles authentication universally, resolvers never contain inline `if (!context.rider)` checks. They use `context.rider!` (non-null assertion) — the transformer guarantees it's present.

### Why a schema transformer instead of per-resolver checks

The transformer modifies the schema at startup, not at request time. This means:

1. **No field can be missed.** Adding a new type or field to the schema automatically inherits auth. The developer has to actively add `@public` to make something unauthenticated — there's no "forgot to add the auth middleware" failure mode.
2. **Auth is invisible to resolver authors.** Resolvers focus on data logic. Auth is a cross-cutting concern handled once.
3. **Auditable surface area.** Grepping for `@public` shows the complete unauthenticated API surface. With per-resolver checks, you'd have to grep for the _absence_ of checks.

## Alternatives considered

**Auth middleware on the Fastify layer.** Check JWT validity before the request reaches GraphQL. Simpler, but too coarse — it can't distinguish public operations (login) from protected ones without maintaining a separate allowlist that drifts from the schema.

**Per-resolver auth checks.** Each resolver starts with `if (!context.rider) throw ...`. Common in tutorials and small projects. The problem is omission — every new resolver is unprotected until someone remembers to add the check. Code review catches some, but not all. The failure mode (silently serving data to unauthenticated users) is the worst kind of security bug.

**Directive-based auth (`@auth(role: TRAINER)`).** Richer than `@public` — each field declares its required role. We considered this but it conflates two concerns: authentication (are you logged in?) and authorization (do you have the right role?). Most fields just need "logged in" — only a few mutations need role checks. The transformer handles the common case; resolver guards handle the rare case. If the role matrix grows complex, this alternative becomes more attractive.

**Third-party auth gateway (Auth0 rules, Hasura permissions).** Moves auth outside the app. Rejected because it couples auth logic to an external service, makes local development harder, and the current model is ~50 lines of code.

## Consequences

- Every new schema field is protected by default. No action required from the developer.
- Public fields require explicit `@public` annotation — a deliberate friction that makes unauthenticated endpoints visible.
- Resolvers can trust `context.rider` is non-null, simplifying their logic.
- The transformer runs at startup, not per-request, so there's no runtime performance cost beyond a function wrapper per resolver.
- Role-based authorization still lives in resolvers (via guard helpers), not in the schema. If role complexity grows, migrating to directive-based auth would be a natural evolution.
