---
description: Pre-PR code review — independently reviews all branch changes from a fresh perspective before pushing. Catches bugs, security issues, and CLAUDE.md violations.
allowed-tools: Bash, Read, Glob, Grep, Task
---

# /pre-review — Pre-PR Code Review

## Usage

- `/pre-review` — review all changes on the current branch vs main

## Purpose

Independent code review with **zero conversation context**. This skill starts fresh — it does not rely on anything discussed earlier in the session. It reviews changes as an outside reviewer would see them in a PR.

Run this **after** `/preflight` passes and **before** pushing or creating a PR.

## Workflow

### 1. Gather context

Collect everything the review agents need:

```bash
# Current branch
git branch --show-current

# Full diff against main (all commits + uncommitted)
git diff main...HEAD
git diff HEAD

# List of changed files
git diff --name-only main...HEAD
git diff --name-only HEAD

# Commit log for the branch
git log main..HEAD --oneline

# Current HEAD SHA
git rev-parse HEAD
```

Also read the root `CLAUDE.md` and any `CLAUDE.md` files in directories touched by the changes.

### 2. Summarize the change

Use a Sonnet agent to produce a 2-3 sentence summary of what the branch does, based on the diff and commit messages. This summary is passed to each review agent for context.

### 3. Launch 5 parallel review agents

Launch 5 **independent Sonnet agents**. Each agent receives:

- The full diff (commits + uncommitted)
- The change summary from step 2
- The relevant CLAUDE.md contents
- Its specific review mandate (below)

Each agent returns a list of issues with:

- File path and approximate line
- Description of the issue
- Category (bug, security, convention, schema, dependency)
- Why it was flagged

**Important:** Each agent prompt must include full context — diffs, file contents, CLAUDE.md text. Agents have no access to prior conversation. Do not tell agents to "read files" — embed the content directly in their prompts.

#### Review priorities (in order)

These match the CI code review action. All agents should weight findings accordingly:

1. Bugs and logic errors
2. Security (auth checks, barn scoping, password leaks, raw SQL, unbounded inputs)
3. Suspicious dependency additions
4. N+1 queries in nested GraphQL resolvers (use loaders, not direct Prisma)
5. `schema.prisma` ↔ `schema.graphql` out of sync
6. Migration safety (backfill ordering, FK cascades, enum changes)
7. Rate limiting coverage (new mutations/REST endpoints)
8. Web UX regressions (cache invalidation, loading states, touch targets, focus trapping)

#### Skip (CI and linters handle these)

- Formatting, style, and type hygiene
- Trivial nitpicks
- Suggestions that add complexity without clear value

Be direct. Only flag things that should change.

#### Agent assignments

a. **Bug scanner** — Read the diff line by line. Look for:

- Logic errors, off-by-one, null/undefined access
- Missing error handling at system boundaries
- Race conditions, async issues
- Incorrect variable usage, copy-paste errors
- **API-specific**: Error consistency — mutations should throw `GraphQLError`, not return null for not-found
- **Web-specific**: Apollo cache — mutations must `cache.evict()` the right fields; schema changes can silently break existing evictions
- **Web-specific**: Loading states — new pages with queries must handle `loading && !data` (first load) vs refetch
- **Web-specific**: Error display — user-facing errors should be specific, not generic "Error loading data"
- **Domain cleanup**: Flag dead code, stale mocks, misleading names, or missing cache invalidation in the same domain as the PR's changes — not just touched files, but closely related code in the same feature area. These belong in the same PR per the cleanup principle.
- Focus on new/changed code and its related domain. Ignore pre-existing issues in unrelated files.

b. **Security reviewer** — Check for:

- Missing `context.rider` auth checks in resolvers
- **Barn scoping**: Every query/mutation must filter by `barnId` from context. New resolvers that query without `barnId` in the WHERE clause are a data leak.
- Data ownership violations (user accessing others' data)
- **Password leaking**: Rider queries must use `omit: { password: true }`. One miss exposes hashes to the client.
- Secrets or credentials in committed code
- Raw SQL (`$queryRaw`/`$executeRaw`) without parameterization
- Unbounded GraphQL inputs (missing pagination limits, deep nesting)
- XSS, command injection
- **Web-specific**: Focus trapping — overlays/modals/drawers must trap focus (use dialog primitive, not raw `fixed inset-0`)

c. **CLAUDE.md compliance** — Audit against project conventions:

- Code style (no `any`, explicit return types, naming conventions)
- TODO format (`TODO(#N)` with real issue number)
- Commit message format (conventional commits: `type(scope): description`)
- Architecture rules (direct Prisma, no service layer, etc.)
- **API-specific**: New mutations must be wrapped with `wrapResolver()` for rate limiting
- **API-specific**: New REST endpoints must use `withAiRateLimit()` if they call AI services
- **Web-specific**: Touch targets must be minimum 44x44px for interactive elements
- **Web-specific**: New tab-layout pages need bottom tab bar padding (`pb-20` or safe area calc)
- Only flag violations that are **explicitly stated** in CLAUDE.md

d. **Schema & data integrity** — Check for:

- `schema.prisma` ↔ `schema.graphql` out of sync
- N+1 query risks in nested GraphQL resolvers — field resolvers should use `context.loaders.*`, not direct Prisma calls
- Missing resolver implementations for new schema fields
- Incomplete migrations or codegen
- Breaking changes to GraphQL schema (nullability changes, removed fields)
- **Migration safety**: NOT NULL constraints must come AFTER data backfill, not before
- **FK cascade behavior**: New foreign keys need explicit ON DELETE strategy — missing cascades cause orphaned rows or blocked deletes
- **Enum safety**: Adding enum values is safe; removing is a breaking change that requires coordination
- **Index coverage**: New fields used in WHERE clauses need `@@index()` in Prisma schema

e. **Test & integration reviewer** — Check for:

- Suspicious or unnecessary dependency additions in `package.json`
- Does the implementation match what the commits describe?
- Missing edge cases
- **Test coverage gaps**: New mutations should have access control tests (barn isolation, role enforcement)
- **Test coverage gaps**: New REST endpoints should have rate limit tests
- **E2E compatibility**: New tables with foreign keys must work with `TRUNCATE...CASCADE` in `resetDatabase()`
- **E2E data isolation**: Tests should use `Date.now()` suffixes for unique data, not depend on seed data that other tests mutate
- **Browser coverage**: UI changes must consider both Chromium (smoke) and WebKit/Safari (regression) viewports

### 4. Score each issue

For each issue found across all agents, launch a parallel **Sonnet agent** that scores confidence 0–100:

- **0**: False positive. Doesn't hold up to scrutiny, or is a pre-existing issue.
- **25**: Might be real but unverified. Stylistic issue not explicitly in CLAUDE.md.
- **50**: Real but minor. Nitpick or unlikely to hit in practice.
- **75**: Very likely real. Verified against code or CLAUDE.md. Will impact functionality.
- **100**: Certain. Confirmed with evidence. Will happen in practice.

Each scoring agent receives the issue description, the relevant diff section, and the CLAUDE.md contents. Always use Sonnet for scoring agents — never Haiku.

### 5. Filter and report

**Drop** issues scoring 10 or below (false positives).

**Report all issues scoring > 10** in a single table, sorted by score descending. This includes both blocking issues and cleanup opportunities — the score communicates severity.

**False positive examples** (score 0, drop entirely):

- Pre-existing issues in untouched files
- Formatting, style, and type hygiene (CI and linters handle that)
- Trivial nitpicks
- Suggestions that add complexity without clear value
- General code quality opinions not backed by CLAUDE.md
- Changes in behavior that are clearly intentional

**Cleanup items** (typically score 50–79):

Issues that are cleanup opportunities in the same domain as the change (dead code, stale mocks, missing cache clears, misleading names) should be included in the table. Domain means the feature area being changed, not just the files touched. These are not blockers but should be addressed in the same PR per the cleanup principle.

#### Output format

Always use a table with descending score, regardless of whether blocking issues exist:

```
## Pre-PR Review

Reviewed N files, M commits against main.

| # | Score | Fix? | Issue | Impact |
|---|-------|------|-------|--------|
| 1 | 85 | Yes | `file.ts:NN` — description of the issue | What breaks or what risk it creates |
| 2 | 70 | Yes | `file.ts:NN` — description of cleanup item | Why it matters |
| 3 | 45 | No | `file.ts:NN` — description of minor item | Low-probability scenario |

Fix? = recommendation. Score >= 80 always Yes. Score 50-79 Yes if it's in the same domain as the change (cleanup principle). Below 50 typically No.

**Action needed:** N issues recommended to fix. Reply with row numbers to override (e.g. "include 3" or "skip 2").
```

If no issues above 10:

```
## Pre-PR Review

No issues found. Reviewed N files, M commits against main.
Checked: bugs, security, barn scoping, rate limiting, CLAUDE.md compliance,
schema sync, migration safety, cache invalidation, test coverage, E2E compatibility.
```

### 6. Next steps

- Present the table and wait for the user to confirm or override recommendations
- User can reply with row numbers to change (e.g. "include 3" or "skip 2")
- Fix all confirmed items, re-run `/preflight`
- If any score >= 80 items were fixed, re-run `/pre-review`
- If clean: proceed to push and PR creation

## Key Rules

1. **Zero context** — every agent starts fresh. Embed all needed content in prompts.
2. **Conservative** — only flag high-confidence issues. False positives erode trust.
3. **No builds** — don't run format, typecheck, or tests. That's `/preflight`'s job.
4. **Changed code only** — don't flag pre-existing issues on unchanged lines.
5. **Evidence-based** — every issue must cite specific code or a specific CLAUDE.md rule.
