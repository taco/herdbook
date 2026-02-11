---
description: Create and manage git worktrees for parallel development. Handles env symlinks, dependency installation, Prisma generation, and dynamic port allocation.
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# /worktree — Git Worktree Management

## Usage

- `/worktree <branch>` — create a new worktree
- `/worktree list` — list active worktrees
- `/worktree remove <path>` — remove a worktree

## Creating a Worktree

Read `worktree-setup.sh` for the full bootstrapping logic. The sequence:

```bash
./worktree-setup.sh <path> <branch-name>
cd <worktree-path>
pnpm install
pnpm --filter api exec prisma generate
```

The script symlinks env files, SSL certs, and Claude settings from the main worktree.

## Port Allocation

`scripts/dev.mjs` handles dynamic port allocation automatically. Running `pnpm run dev` in any worktree finds available ports — no manual config needed.

## Listing / Removing

```bash
git worktree list
git worktree remove <path>        # clean removal
git worktree remove --force <path> # dirty worktree
git worktree prune                 # stale entries
```

## Environment Switching

```bash
pnpm run env:local      # Local Docker Postgres
pnpm run env:neon-dev   # Neon dev database
pnpm run env:neon-prod  # Neon production database
pnpm run env:status     # Show current env
```
