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
- `/worktree done` — clean up the current worktree (created by `/gh-issue`)

## Creating a Worktree

Read `worktree-setup.sh` for the full bootstrapping logic. The sequence:

```bash
./worktree-setup.sh <path> <branch-name>
cd <worktree-path>
pnpm install
pnpm --filter api exec prisma generate
```

The script symlinks env files, SSL certs, and Claude settings from the main worktree.

## Done — Clean Up Current Worktree

When the user runs `/worktree done`, clean up the worktree that was created by `/gh-issue`:

1. **Read the current worktree path:**

    ```bash
    cat .claude/current-worktree
    ```

    If the file is empty or missing, tell the user there's no active worktree to clean up.

2. **Kill any running dev servers** in that worktree (check for node processes on the worktree's ports).

3. **Remove the worktree:**

    ```bash
    git worktree remove <path>
    git worktree prune
    ```

    If it fails due to uncommitted changes, warn the user and ask whether to force-remove.

4. **Clear tracking files:**

    ```bash
    echo -n > .claude/current-worktree
    echo -n > .claude/current-issue
    ```

5. **Confirm** the cleanup is complete. The user is now back in the main herdbook.

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
