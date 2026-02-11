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

## Commands

- Always use `pnpm` (not npm)
- Run `pnpm format` after making changes
- Run `pnpm check` before committing (runs format:check + typecheck)

## Tech Stack

- **Monorepo**: pnpm workspaces
- **API**: Node/Fastify, Prisma, GraphQL
- **Web**: React/Vite, Tailwind CSS (mobile-only)
- **Testing**: Vitest, React Testing Library

## Code Style

- No `any` types in TypeScript
- Explicit return types for public functions
- Files: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- Types: `PascalCase` (no `I` prefix)

## Backend (packages/api)

- Direct-to-Prisma in resolvers (no service layer)
- Throw `GraphQLError` with codes (`NOT_FOUND`, `UNAUTHENTICATED`) - don't return null
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
- Prefer `git add <file>` over `git add .`
- Do not add any co-author lines in commit messages
- The top message should be short and easy to read without losing context
- Seperate details should be order in terms for weight, most important at the top

## Testing Philosophy

- Tests are liability - only write high-ROI tests
- Integration over unit tests
- Don't test: UI structure, third-party code, trivial code
- Use `fastify.inject()` for API tests
- Use `getByRole`/`getByText` for frontend tests

## New Feature Workflow

1. Define schema (Prisma + GraphQL)
2. Implement resolvers
3. Build UI and connect
4. Manual smoke test
