# Herdbook Development Guidelines

## Agent Workflow

Use lead/builder/verifier pattern with cost-conscious model allocation:

### Model Tiers

- **Haiku**: Exploration, file searches, running commands, simple mechanical tasks
- **Sonnet**: Most implementation, standard code reviews, test writing
- **Opus**: Planning phase (Plan agent), security audits, complex architectural decisions

### Workflow

1. Explore with Sonnet agents
2. Plan with Opus
3. Build with Opus
4. Verify with Sonnet (Opus for security-critical)

### Planning Convention

Every plan must include a **Skills** section that maps each implementation step to the skill that governs it. If no skill applies, write "none". This makes skill usage visible and reviewable.

Example:

```
## Skills
| Step | Skill | Why |
|------|-------|-----|
| Add birthDate to Horse model | `/schema` | Prisma → migration → GraphQL → resolver → codegen |
| Build horse profile page | `/new-page` | New FullScreenLayout page with view/edit |
| Write resolver tests | `/test-api` | Integration test for new query |
| Pre-commit checks | `/preflight` | Format + typecheck |
```

## Commands

- Always use `pnpm` (not npm)
- Always use `pnpm run <script>` instead of `pnpm <script>` shorthand
- Run `pnpm run format` after making changes
- Run `pnpm run check` before committing (runs format:check + typecheck)

## Tech Stack

- **Monorepo**: pnpm workspaces
- **API**: Node/Fastify, Prisma, GraphQL
- **Web**: React/Vite, Tailwind CSS (mobile-only)
- **Testing**: Vitest, React Testing Library

## Cleanup Principle

Leave the codebase slightly better than you found it. When a change reveals nearby issues — stale mocks, dead code, misleading names, missing cache invalidation — fix them in the same PR rather than deferring. The context cost of "fix it later" (tracking issues, reloading mental state) almost always exceeds the cost of doing it now.

**Belongs in the PR:** cleanup in the same domain as your change — the files you're touching, plus closely related code in the same feature area (e.g., auth flow, data model, shared types).
**Separate PR:** unrelated refactors in files you happened to read.

## Code Style

- No `any` types in TypeScript
- Explicit return types for public functions
- Files: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- Types: `PascalCase` (no `I` prefix)
- TODOs must use `TODO(#N)` format referencing a real GitHub issue — no bare `TODO`, `FIXME`, or placeholder issue numbers

## Backend (packages/api)

- Direct-to-Prisma in resolvers (no service layer)
- Throw `GraphQLError` with codes (`NOT_FOUND`, `BAD_USER_INPUT`, `FORBIDDEN`) for data lookup failures and validation — don't return null for non-nullable fields
- Auth is handled by `secureByDefaultTransformer`, which rejects unauthenticated requests for all non-`@public` fields before resolvers run. Do not add inline `if (!context.rider)` checks — use `context.rider!` (non-null assertion) for TypeScript. Use shared helpers (`getBarnId`, `requireTrainer`, `requireOwnerOrTrainer`) for role-based guards and type narrowing.
- Update `schema.graphql` when `schema.prisma` changes
- Watch for N+1 queries in nested resolvers

## Frontend (packages/web)

- Mobile-only styling (no desktop)
- Use existing Shadcn components in `components/ui/`
- Explicit `isLoading` state (no Suspense for data)
- Local state preferred (`useState`/`useReducer`)
- Touch targets: minimum 44x44px
- **Navigation & layouts**: see [docs/design-navigation.md](docs/design-navigation.md) for layout types, sub-page overlay system, view/edit cascade, drawer-based editing, animation standards, and the new page checklist

## Security

- Every resolver checks `context.rider` unless public
- Data ownership: users only access their own data
- No secrets in code

## Git

- Conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`
    - `feat`: user-facing capability (new feature, new page, new endpoint)
    - `fix`: bug fix
    - `chore`: infrastructure, tooling, CI, dependencies, monitoring (e.g., adding Sentry)
    - `docs`: documentation only
    - `refactor`: code restructuring, no behavior change
- Prefer `git add <file>` over `git add .`
- Do not add any co-author lines in commit messages
- The top message should be short and easy to read without losing context
- Seperate details should be order in terms for weight, most important at the top

## Design Docs

- After `/design` creates issues on GitHub, update the design doc's issue headings to use real issue numbers with full links: `### [#84](https://github.com/taco/herdbook/issues/84): Title`
- Link the milestone in the Issues section heading
- Code TODOs for future work must reference the real issue: `TODO(#84)`

## Testing Philosophy

- Tests are liability - only write high-ROI tests
- Integration over unit tests
- Don't test: UI structure, third-party code, trivial code
- Use `fastify.inject()` for API tests
- Use `getByRole`/`getByText` for frontend tests

## Skills

Use these skills for common workflows. Invoke with `/skillname` or the Skill tool.

| Task                               | Skill             |
| ---------------------------------- | ----------------- |
| Mobile UX analysis for new feature | `/mobile-ux`      |
| Creating a new page                | `/new-page`       |
| Schema/model changes               | `/schema`         |
| E2E tests (dev, smoke, regression) | `/e2e`            |
| Writing web unit tests             | `/test-web`       |
| Writing API integration tests      | `/test-api`       |
| Pre-commit checks                  | `/preflight`      |
| Git worktree setup                 | `/worktree`       |
| Railway preview deploys            | `/deploy-preview` |
| Update docs after changes          | `/updatedocs`     |
| Implement a GitHub issue           | `/gh-issue`       |
| Write a well-scoped GitHub issue   | `/write-issue`    |
| Pre-PR independent code review     | `/pre-review`     |
| Fixup-squash into previous commits | `/fixup`          |
| Design conversation before coding  | `/design`         |

## New Feature Workflow

0. Design conversation (if needed) → `/design`
1. Mobile UX analysis → `/mobile-ux`
2. Define schema (Prisma + GraphQL) → `/schema`
3. Implement resolvers
4. Build UI and connect → `/new-page`
5. Write tests → `/test-api`, `/test-web`, `/e2e`
6. Pre-commit check → `/preflight`
7. Pre-PR review → `/pre-review`
8. Update docs → `/updatedocs`
