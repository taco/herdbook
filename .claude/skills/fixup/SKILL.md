---
description: Stage, fixup-commit, autosquash rebase, and force-push in one step. For temporary commits that get folded into previous work.
context: fork
disable-model-invocation: true
allowed-tools: Bash, Read
---

# /fixup — Squash into Previous Commits

## Usage

- `/fixup` — fixup and squash into the previous commit, then force-push
- `/fixup N` — fixup and squash into the Nth commit back, then force-push

Default N is 1 (the most recent commit).

## Behavior

### 1. Validate

Check there are changes to stage:

```bash
git status --porcelain
```

If clean, tell the user there's nothing to fixup.

### 2. Determine target commit

```bash
# N defaults to 1
git log --oneline -N
```

The target is the Nth commit back from HEAD. Capture its SHA:

```bash
TARGET_SHA=$(git rev-parse HEAD~$((N-1)))
```

Show the user which commit will be squashed into:

```bash
git log --oneline -1 $TARGET_SHA
```

### 3. Stage and commit

```bash
git add -A
git commit --fixup=$TARGET_SHA
```

### 4. Autosquash rebase

Use `GIT_SEQUENCE_EDITOR=true` to run the interactive rebase non-interactively:

```bash
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash HEAD~$((N+1))
```

If the rebase fails (conflicts), abort and tell the user:

```bash
git rebase --abort
```

### 5. Force-push

```bash
git push --force-with-lease
```

If the push fails (e.g., no upstream), tell the user and suggest `git push -u origin <branch>`.

## Example

```
/fixup      # squash into HEAD~0 (last commit)
/fixup 3    # squash into HEAD~2 (3rd commit back)
```
