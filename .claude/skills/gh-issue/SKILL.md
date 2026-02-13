---
description: Implement a GitHub issue — fetch, plan, build with dev server, pause for manual verification, iterate on feedback, then commit.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Task, Skill, AskUserQuestion
---

# /gh-issue — GitHub Issue Workflow

## Usage

- `/gh-issue <number>` — implement GitHub issue by number
- `/gh-issue <url>` — implement GitHub issue by URL

## Workflow

### 1. Preflight checks

Before anything else, verify the repo is in a clean state:

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
gh issue view <number_or_url> --json title,body,labels,comments,assignees
```

Display a summary: title, description, labels, and any relevant comments.

### 3. Create worktree

After fetching the issue, automatically set up an isolated worktree:

1. **Derive names from the issue:**
    - Slugify the issue title (lowercase, hyphens, max ~40 chars): e.g. "Add horse filtering" → `add-horse-filtering`
    - Branch prefix from labels: `fix/` if bug label, `feat/` otherwise
    - Branch: `feat/<slug>` or `fix/<slug>`
    - Path: `../herdbook-<slug>`

2. **Run worktree setup:**

    ```bash
    ./worktree-setup.sh ../herdbook-<slug> feat/<slug>
    ```

3. **Resolve and store the absolute worktree path:**

    ```bash
    WORKTREE=$(cd ../herdbook-<slug> && pwd)
    echo "$WORKTREE" > .claude/current-worktree
    ```

4. **Track the issue number** for statusline:
    ```bash
    echo -n "<issue_number>" > .claude/current-issue
    ```

**From this point on, ALL file operations (Read, Edit, Write, Glob, Grep) and ALL Bash commands MUST use absolute paths rooted at the worktree.** For Bash commands, prefix with `cd $WORKTREE &&`. For tool calls, use `$WORKTREE/packages/web/src/...` etc.

### 4. Explore & plan

- Use Explore agents (Sonnet) to understand the relevant code areas
- Use a Plan agent (Opus) to design the implementation
- Present the plan to the user with:
    - What files will be created/modified
        - Explain why for each and alternatives you considered
        - Highlight any potential risks to performance or security with these changes
    - Key design decisions
    - A **Skills** table mapping each step to the skill that will govern it (see CLAUDE.md Planning Convention)
    - Any open questions
- **Wait for user approval before proceeding**

### 5. Start dev server

Start `pnpm dev` in the background **from the worktree**:

```bash
cd $WORKTREE && pnpm run dev
```

**Tell the user the exact port numbers** so they can open the app in their browser. Ports are dynamically allocated — check Vite and Fastify output for actual values.

### 6. Build

Implement the changes following project conventions (see CLAUDE.md). After making changes:

```bash
cd $WORKTREE && pnpm run format
```

The dev server (Vite HMR + tsx watch) picks up changes automatically.

### 7. Pause for manual verification

**Do NOT commit yet.** Ask the user to verify the changes in their browser:

> The dev server is running on port XXXX. Please test the changes and let me know if anything needs adjustment.

Wait for user feedback.

### 8. Iterate

Apply feedback, re-format, and ask the user to verify again. Repeat until they're satisfied.

### 9. Finalize

Once the user approves:

1. Run `/preflight` from the worktree
2. Ask the user for final go-ahead to commit
3. Run `/commit` to create the commit (from the worktree)
4. Ask if the user wants to push and create a PR

## Notes

- Never commit without explicit user approval
- Keep the dev server running throughout the session
- If the issue requires schema changes, use `/schema` skill first
- If the issue requires a new page, use `/new-page` skill for conventions
- Reference the issue number in the commit message: `fixes #<number>`
- When done, tell the user to run `/worktree done` to clean up
