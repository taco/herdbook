---
description: Implement a GitHub issue — fetch, plan, build with dev server, pause for manual verification, iterate on feedback, then commit.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Task, Skill, AskUserQuestion
---

# /gh-issue — GitHub Issue Workflow

## Usage

- `/gh-issue <number>` — implement GitHub issue by number
- `/gh-issue <url>` — implement GitHub issue by URL

## Workflow

### 1. Fetch the issue

```bash
gh issue view <number_or_url> --json title,body,labels,comments,assignees
```

Display a summary: title, description, labels, and any relevant comments.

### 2. Explore & plan

- Use Explore agents (Sonnet) to understand the relevant code areas
- Use a Plan agent (Opus) to design the implementation
- Present the plan to the user with:
    - What files will be created/modified
        - Explain why for each and alternatives you considered
        - Highlight any potential risks to performance or security with these changes
    - Key design decisions
    - Any open questions
- **Wait for user approval before proceeding**

### 3. Start dev server

Start `pnpm dev` in the background and report the ports:

```bash
pnpm run dev
```

**Tell the user the exact port numbers** so they can open the app in their browser. Standard ports:

| Service | Port |
| ------- | ---- |
| Web     | 5173 |
| API     | 4000 |

If ports differ (check Vite and Fastify output), report the actual ports.

### 4. Build

Implement the changes following project conventions (see CLAUDE.md). After making changes:

```bash
pnpm run format
```

The dev server (Vite HMR + tsx watch) picks up changes automatically.

### 5. Pause for manual verification

**Do NOT commit yet.** Ask the user to verify the changes in their browser:

> The dev server is running on port XXXX. Please test the changes and let me know if anything needs adjustment.

Wait for user feedback.

### 6. Iterate

Apply feedback, re-format, and ask the user to verify again. Repeat until they're satisfied.

### 7. Finalize

Once the user approves:

1. Run `/preflight` to check formatting + types
2. Ask the user for final go-ahead to commit
3. Run `/commit` to create the commit

## Notes

- Never commit without explicit user approval
- Keep the dev server running throughout the session
- If the issue requires schema changes, use `/schema` skill first
- If the issue requires a new page, use `/new-page` skill for conventions
- Reference the issue number in the commit message: `fixes #<number>`
