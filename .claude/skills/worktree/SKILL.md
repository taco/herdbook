---
description: Create and manage git worktrees for parallel development. Handles env symlinks, dependency installation, Prisma generation, and dynamic port allocation.
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# /worktree — Git Worktree Management

## Usage

- `/worktree <issue-number>` — preflight checks, fetch issue, create worktree, output launch command
- `/worktree list` — list active worktrees
- `/worktree remove <path>` — remove a worktree
- `/worktree done` — clean up the current worktree and return to main

## Creating a Worktree from an Issue

### 1. Preflight checks

Verify the repo is ready before creating a worktree:

1. **Check we're on main:**

    ```bash
    git branch --show-current
    ```

    If not on `main`, halt and tell the user.

2. **Check working tree is clean:**

    ```bash
    git status --porcelain
    ```

    If there are uncommitted changes, ask the user: proceed anyway or halt?

3. **Sync with origin:**

    ```bash
    git fetch origin main
    ```

    Compare local and remote:

    ```bash
    git rev-list --left-right --count main...origin/main
    ```

    - If local is behind, run `git pull` to catch up.
    - If local is ahead, warn the user (unpushed commits) and ask whether to proceed or halt.

### 2. Fetch the issue

```bash
gh issue view <number> --json title,body,labels,comments,assignees
```

Display a brief summary (title + labels). Use the title and labels to derive names:

- Slugify the title (lowercase, hyphens, max ~40 chars): e.g. "Add horse filtering" → `add-horse-filtering`
- Branch prefix from labels: `fix/` if bug label, `feat/` otherwise
- Branch: `feat/<slug>` or `fix/<slug>`
- Path: `../herdbook-<slug>`

### 3. Create worktree

```bash
./worktree-setup.sh ../herdbook-<slug> feat/<slug>
```

The script symlinks env files, SSL certs, and Claude settings from the main worktree, then runs `pnpm install` and `prisma generate`.

### 4. Store tracking state

```bash
WORKTREE=$(cd ../herdbook-<slug> && pwd)
printf "ISSUE=<issue_number>\nWORKTREE=%s\n" "$WORKTREE" > .state
```

### 5. Output the launch command

Print a single clean line the user can triple-click to copy:

```
cd ../herdbook-<slug> && claude
```

**Stop here.** Do not continue with implementation. The user will launch a new Claude session in the worktree and use `/gh-issue <number>` there.

## Done — Clean Up Current Worktree

When the user runs `/worktree done`:

1. **Read the current worktree path:**

    ```bash
    grep '^WORKTREE=' .state | cut -d= -f2-
    ```

    If `.state` is missing or has no `WORKTREE` value, tell the user there's no active worktree to clean up.

2. **Kill any running dev servers** in that worktree (check for node processes on the worktree's ports).

3. **Remove the worktree:**

    ```bash
    git worktree remove <path>
    git worktree prune
    ```

    If it fails due to uncommitted changes, warn the user and ask whether to force-remove.

4. **Clear tracking files:**

    ```bash
    rm -f .state
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
