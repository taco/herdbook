---
description: Update project documentation based on recent code changes — analyzes diffs, removes stale content, adds missing coverage, and keeps docs concise. Covers README, CLAUDE.md, design docs, skill docs, and MEMORY.md.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Task
---

# /updatedocs — Documentation Maintenance

## Usage

- `/updatedocs` — full audit of all doc targets against recent changes
- `/updatedocs <scope>` — audit a specific scope: `readme`, `claude`, `docs`, `skills`, `memory`, `roadmap`

## Philosophy

Documentation is a product. Stale docs are worse than no docs — they mislead. This skill treats docs like code: if it's wrong, fix it. If it's dead, remove it. If it's missing, add it. Brevity wins.

## Step 1: Understand What Changed

Run these to build context:

```bash
# What changed since last doc update (or recent commits)
git log --oneline -20
git diff HEAD~5 --stat
git diff HEAD~5 --name-only
```

Read the diff output carefully. Identify:

- **New files/features** — need doc coverage?
- **Deleted files** — referenced anywhere in docs?
- **Renamed/moved files** — stale paths in docs?
- **Changed patterns** — do docs describe the old way?
- **New skills** — registered in CLAUDE.md skills table?

## Step 2: Audit Each Target

Work through each doc target. For every section, ask: **is this still true?**

### Target: `README.md` (root)

**Purpose**: External-facing project overview for humans browsing the repo.

Check for:

- Tech stack accuracy (matches actual dependencies)
- Setup instructions still work
- Feature list matches what's actually built (cross-reference `docs/product-roadmap.md` "What's Built")
- Links to other docs are valid
- No internal/agent jargon — this is for people, not Claude

If no README.md exists, create one with: project description, tech stack, setup instructions, feature overview, link to roadmap.

### Target: `CLAUDE.md`

**Purpose**: Agent instructions. Every line is an instruction Claude follows.

Check for:

- Commands section matches actual `package.json` scripts
- Code style rules match actual patterns in codebase
- Backend/frontend rules match current architecture
- Skills table includes all skills in `.claude/skills/`
- Skills table doesn't list skills that were deleted
- File references point to files that exist
- No contradictions with actual codebase patterns

**Key rule**: CLAUDE.md should be prescriptive and terse. Don't add explanations — add rules.

### Target: `docs/*.md` (design docs)

**Purpose**: Architectural decisions and design specs for specific features.

For each file in `docs/`:

- Are described features still implemented as documented?
- Are "planned" or "future" items that are now complete updated?
- Are file paths and component names still accurate?
- Are phase/status markers current?
- Should any doc be marked as superseded or archived?

**Don't bloat**: Design docs capture decisions. If the decision is made and implemented, the doc can shrink. Remove speculative sections that are resolved.

### Target: `docs/product-roadmap.md`

**Purpose**: Product direction — what's built, what's next, what's deprioritized.

Check for:

- "What's Built" table reflects actual shipped features
- Features that shipped should move from "What's Next" to "What's Built"
- "Resolved Questions" captures decisions that were made
- "Open Questions" removes questions that are answered
- "Deprioritized" still reflects current priorities
- Date stamp is current

### Target: `.claude/skills/*/SKILL.md` (custom skills)

**Purpose**: Workflow guides that Claude follows when executing skills.

For each skill:

- File paths referenced in the skill still exist
- Commands listed still work (check against `package.json`)
- Example files mentioned still exist and are still good examples
- Patterns described match actual codebase patterns
- The `description` in frontmatter is accurate
- If a skill references other skills, those still exist

**Cross-reference**: Check that every skill directory has a corresponding row in `CLAUDE.md`'s skills table, and vice versa.

### Target: `.claude/projects/*/memory/MEMORY.md`

**Purpose**: Persistent session memory for Claude. Key files, patterns, conventions.

Check for:

- Key Files section — all paths still valid?
- Architecture section — still accurate?
- Pattern descriptions — still match codebase?
- Remove anything that duplicates CLAUDE.md (MEMORY.md supplements, not repeats)

## Step 3: Make Changes

For each target:

1. Read the current file
2. Identify specific stale/missing/wrong content
3. Edit surgically — don't rewrite whole docs
4. Prefer removing stale content over adding disclaimers
5. Keep the same voice and structure as the existing doc

**Principles**:

- Remove > disclaim. Don't add "Note: this may be outdated." Just fix or delete it.
- Short > long. If a section can be a single line, make it one.
- Accurate > comprehensive. Missing info is fine. Wrong info is not.
- Don't add sections for things that don't exist yet.

## Step 4: Report

After making changes, output a summary:

```
## Docs Updated

### [filename]
- Removed: [what was stale]
- Updated: [what changed]
- Added: [what was missing]

### No changes needed
- [files that were already accurate]
```

## Scope Reference

| Target      | Path                                  | Owner           | Update trigger                            |
| ----------- | ------------------------------------- | --------------- | ----------------------------------------- |
| README      | `README.md`                           | External humans | New features, setup changes               |
| CLAUDE.md   | `CLAUDE.md`                           | Claude agents   | Convention changes, new skills            |
| Design docs | `docs/*.md`                           | Engineers       | Architecture changes, completed phases    |
| Roadmap     | `docs/product-roadmap.md`             | Product         | Features shipped or reprioritized         |
| Skills      | `.claude/skills/*/SKILL.md`           | Claude agents   | File moves, pattern changes, new commands |
| Memory      | `.claude/projects/*/memory/MEMORY.md` | Claude agents   | Key file changes, new patterns            |
