---
description: Fetch, rebase on origin/main, resolve conflicts, push, and open a PR
allowed-tools: Bash(git checkout:*), Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(git fetch:*), Bash(git rebase:*), Bash(git diff:*), Bash(git log:*), Bash(gh pr create:*), Read, Edit
context: fork
disable-model-invocation: true
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes:

1. **Branch**: Create a new branch if on main
2. **Commit**: Stage changes and create a single commit with an appropriate message following conventional commits
3. **Fetch**: Run `git fetch origin` to get the latest remote state
4. **Rebase**: Run `git rebase origin/main` to rebase onto the latest main
5. **Resolve conflicts**: If the rebase produces conflicts:
    - Run `git status` to identify conflicting files
    - Read each conflicting file to understand the conflict markers
    - Edit each file to resolve the conflict, preserving the intent of both sides
    - Stage resolved files with `git add`
    - Run `git rebase --continue` to proceed
    - Repeat until the rebase completes
6. **Push**: Push the branch to origin. Use `--force-with-lease` if the rebase rewrote history (it almost always will)
7. **PR**: Create a pull request using `gh pr create`

If there are no conflicts, steps 1-4 and 6-7 should all be done as fast as possible in minimal messages. Only slow down if conflict resolution is needed.
