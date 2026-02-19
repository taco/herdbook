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

### 1. Check Railway status

```bash
railway status
```

If not authenticated: `railway login`

### 2. Create Neon branch

Branch name: `preview/<git-branch-name>`

Use the Neon MCP tools:

1. `list_projects` to find the project ID
2. `create_branch` with name `preview/<branch>`
3. `get_connection_string` for the new branch — this is the `DATABASE_URL`

### 3. Create Railway environment

```bash
railway environment create <branch-name> --duplicate production
```

Override variables for both services:

**API service**:

| Variable       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| `DATABASE_URL` | Neon branch connection string (with `?sslmode=require`) |
| `JWT_SECRET`   | Same as production                                      |
| `PORT`         | Railway auto-assigns                                    |

**Web service**:

| Variable       | Value                                      |
| -------------- | ------------------------------------------ |
| `VITE_API_URL` | Set after API domain is generated (step 5) |
| `PORT`         | Railway auto-assigns                       |

### 4. Run migrations against Neon branch

> **Note:** Production migrations are automatic via `packages/api/railway.toml` (`preDeployCommand`).
> This manual step is only needed for preview environments, which use dynamic Neon branches
> that don't exist in the production Railway config.

```bash
DATABASE_URL="<neon-branch-url>" pnpm --filter api run prisma:migrate:deploy
```

### 5. Deploy services

Deploy API first (web needs the API URL):

```bash
railway deploy --service api
```

Generate API domain, then set `VITE_API_URL` on web service:

```bash
railway domain --service api
railway variables set VITE_API_URL=https://<api-domain> --service web
railway deploy --service web
railway domain --service web
```

### 6. Report URLs

Display both service URLs to the user.

## Teardown

Order matters — remove Railway environment first, then Neon branch:

1. Delete Railway environment (removes services + domains)
2. Delete Neon branch using `delete_branch` MCP tool
3. Confirm both are gone

## Rollback

If deploy fails partway:

- **Neon branch created but Railway failed**: delete the Neon branch to avoid orphaned branches
- **API deployed but web failed**: check `VITE_API_URL` — most common cause is missing or wrong API domain
- **Migrations failed**: check the Neon branch connection string includes `?sslmode=require`

## Troubleshooting

| Problem             | Cause                  | Fix                                                                    |
| ------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Build fails (API)   | Missing Prisma client  | Build command must start with `prisma generate`                        |
| Build fails (Web)   | Missing `VITE_API_URL` | Set variable before deploying web service                              |
| DB connection error | SSL not enabled        | Add `?sslmode=require` to `DATABASE_URL`                               |
| DB connection slow  | Neon auto-suspend      | First request wakes compute — takes 1-2s, subsequent requests are fast |
| CORS errors         | Wrong API URL          | Verify `VITE_API_URL` matches the actual Railway API domain            |
| Stale preview       | Forgot to redeploy     | After code changes, run `railway deploy` for affected service(s)       |
