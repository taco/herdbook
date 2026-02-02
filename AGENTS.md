# Herdbook Agent Instructions

## Commands
- **Dev**: `pnpm dev` (both), `pnpm dev:api`, `pnpm dev:web`
- **Build**: `pnpm build` | **Format**: `pnpm format`
- **Test (api)**: `pnpm --filter api test` | Single: `pnpm --filter api test src/path/to/file.test.ts`
- **Test (web)**: `pnpm --filter web test` | Single: `pnpm --filter web test src/path/to/file.test.tsx`
- **Test (e2e)**: `pnpm test:e2e` | With UI: `pnpm --filter e2e test:ui`
- **Prisma**: `pnpm --filter api prisma:migrate`, `prisma:generate`, `prisma:studio`

## Architecture
- **Monorepo**: pnpm workspace with `packages/api` (Fastify + Apollo + Prisma) and `packages/web` (React + Vite + Tailwind)
- **API**: GraphQL via Apollo Server, Prisma ORM with PostgreSQL. Direct-to-Prisma pattern in resolvers (no service layer).
- **Web**: React 19, React Router, Apollo Client. Shadcn UI components in `src/components/ui/`. Mobile-first only.

## Code Style
- **TypeScript**: No `any`. Explicit return types on public functions. No magic strings—use constants.
- **Abstraction**: Don't over-abstract prematurely—prefer explicit code until patterns repeat 3+ times.
- **Naming**: `PascalCase.tsx` (components), `camelCase.ts` (utils). Types: `PascalCase` (no `I` prefix).
- **Imports**: Use absolute imports (`@/components/ui/button`). Colocate tests with source files.
- **Errors (API)**: Throw `GraphQLError` with codes (`NOT_FOUND`, `UNAUTHENTICATED`). Never return `null` for errors.
- **State (Web)**: Prefer local `useState`. Context only for Auth/Theme. No Redux/Zustand.

## Testing
- **Philosophy**: High ROI only. Test connectivity, business logic, critical flows. Skip trivial UI/third-party code.
- **Frontend**: Use `getByRole`/`getByText`. Test behavior, not implementation. Mock network layer.
- **Backend**: Prefer integration tests via `fastify.inject()`. Minimize mocking; use test DB when possible.
