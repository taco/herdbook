# Herdbook

A full-stack application built with GraphQL, React, and TypeScript.

## Overview

Herdbook is a monorepo containing:

- **API**: A GraphQL API server built with Apollo Server and Fastify
- **Web**: A React frontend application built with Vite and Apollo Client

## Tech Stack

### API (`packages/api`)

- [Apollo Server](https://www.apollographql.com/docs/apollo-server/) - GraphQL server
- [Fastify](https://www.fastify.io/) - Web framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [PostgreSQL](https://www.postgresql.org/) - Database
- [TypeScript](https://www.typescriptlang.org/) - Type safety

### Web (`packages/web`)

- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Apollo Client](https://www.apollographql.com/docs/react/) - GraphQL client
- [TypeScript](https://www.typescriptlang.org/) - Type safety

### Tooling

- [pnpm](https://pnpm.io/) - Package manager
- [Concurrently](https://github.com/open-cli-tools/concurrently) - Run multiple commands

## Prerequisites

- [Node.js](https://nodejs.org/) (see `.node-version` for required version)
- [pnpm](https://pnpm.io/) (v10.4.0+)
- [PostgreSQL](https://www.postgresql.org/) database

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd herdbook
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:
    - Create a `.env` file in `packages/api/` with your database connection:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/herdbook"
    JWT_SECRET="change-me"
    JWT_EXPIRATION="1h"
    ```

4. Set up the database:

```bash
cd packages/api
pnpm prisma:generate
pnpm prisma:migrate
```

## Development

### Run both API and Web together:

```bash
pnpm dev
```

### Run individually:

```bash
# API only (runs on http://localhost:4000)
pnpm dev:api

# Web only (runs on http://localhost:5173)
pnpm dev:web
```

The API GraphQL playground will be available at `http://localhost:4000/graphql`.

## Building

### Build all packages:

```bash
pnpm build
```

### Build individually:

```bash
pnpm build:api
pnpm build:web
```

## Project Structure

```
herdbook/
├── packages/
│   ├── api/              # GraphQL API server
│   │   ├── prisma/       # Prisma schema and migrations
│   │   └── src/
│   │       ├── schema.graphql
│   │       ├── resolvers.ts
│   │       └── index.ts  # Server entry point
│   ├── web/              # React frontend
│   │   └── src/
│   │       ├── pages/    # Route components
│   │       ├── components/
│   │       └── main.tsx  # Entry point
│   └── e2e/              # End-to-end tests (Playwright)
│       └── tests/
├── docs/                 # Design docs and roadmap
├── package.json          # Root package.json with workspace scripts
└── pnpm-workspace.yaml   # pnpm workspace configuration
```

## Available Scripts

### Root level:

- `pnpm dev` - Run both API and Web in development mode
- `pnpm dev:api` - Run only the API server
- `pnpm dev:web` - Run only the web app
- `pnpm build` - Build all packages
- `pnpm build:api` - Build only the API
- `pnpm build:web` - Build only the web app
- `pnpm test:e2e` - Run E2E tests

### API package (`packages/api`):

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio

### Web package (`packages/web`):

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### E2E package (`packages/e2e`):

- `pnpm test` - Run E2E tests (starts test DB automatically)
- `pnpm test:ui` - Run tests with Playwright UI

## Testing

### Unit/Integration Tests

```bash
# API tests
pnpm --filter api test

# Web tests
pnpm --filter web test
```

### E2E Tests

E2E tests use Playwright and run against an isolated Docker Postgres instance.

```bash
# From root - runs full E2E suite
pnpm test:e2e

# With Playwright UI for debugging
pnpm --filter e2e test:ui
```

**Prerequisites**: Docker must be running. The test suite automatically:

1. Spins up a test Postgres container (port 5433)
2. Runs migrations and seeds test data
3. Starts API and web servers
4. Runs Playwright tests
5. Tears down the container

## Environment Variables

### API (`packages/api/.env`)

- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Secret for signing JWTs (required in production)
- `JWT_EXPIRATION` - JWT token expiration (default: `1h`)
- `PORT` - Server port (default: 4000)

### Web (`packages/web/.env`)

- `VITE_API_URL` - GraphQL API URL (default: `http://localhost:4000/graphql`)

## License

Private project
