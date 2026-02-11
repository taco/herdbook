---
description: Deploy a preview branch to Railway with Neon database branching. Manages services, environment variables, and deployment status.
context: fork
allowed-tools: Bash, Read, Glob, Grep, mcp__Railway__check-railway-status, mcp__Railway__create-project-and-link, mcp__Railway__create-environment, mcp__Railway__deploy, mcp__Railway__generate-domain, mcp__Railway__get-logs, mcp__Railway__link-environment, mcp__Railway__link-service, mcp__Railway__list-deployments, mcp__Railway__list-projects, mcp__Railway__list-services, mcp__Railway__list-variables, mcp__Railway__set-variables, mcp__Neon__list_projects, mcp__Neon__create_branch, mcp__Neon__get_connection_string, mcp__Neon__delete_branch, mcp__Neon__run_sql, mcp__Neon__describe_project
---

# /deploy-preview — Deploy Preview Branch

## Usage

- `/deploy-preview` — deploy current branch as preview
- `/deploy-preview status` — check deployment status
- `/deploy-preview logs` — view logs
- `/deploy-preview teardown` — remove preview environment + Neon branch

## Steps

1. **Check Railway status** — verify CLI authenticated
2. **Create Neon branch** — branch from main DB, named `preview/<branch>`
3. **Create Railway environment** — duplicate production settings, override `DATABASE_URL` with Neon branch connection string
4. **Deploy services** — two services: `api` (Fastify) and `web` (Vite React)
5. **Run migrations** — against the Neon branch
6. **Generate domains** — public URLs for both services

### Environment Variables

**API**: `DATABASE_URL` (Neon branch), `JWT_SECRET`, `PORT` (auto)
**Web**: `VITE_API_URL` (deployed API URL), `PORT` (auto)

## Teardown

1. Delete the Railway environment
2. Delete the Neon database branch

## Troubleshooting

- **Build fails**: API build is `prisma:generate && tsc && tsc-alias`, Web is `tsc && vite build`
- **DB connection errors**: Neon branches auto-suspend — first request may be slow
- **CORS errors**: Check `VITE_API_URL` points to correct API domain
