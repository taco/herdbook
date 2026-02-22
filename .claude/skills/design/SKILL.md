---
description: Facilitated design conversation — explore a rough idea or problem, build shared understanding, then produce right-sized artifacts (issues, design docs, branches). Run before jumping to code.
allowed-tools: Bash, Read, Glob, Grep, Task, Skill, AskUserQuestion, Write, Edit
---

# /design — Facilitated Design Conversation

## Usage

- `/design <idea or problem>` — start a design conversation from a rough concept
- `/design` — open-ended; agent asks what you want to explore

## Philosophy

This is a **conversation, not a pipeline**. Every step pauses for alignment before going deeper. The agent recommends but never jumps ahead. Complexity is earned — most ideas don't need a design doc or 6 issues. The conversation itself is the value; artifacts are a byproduct of alignment.

## Conversation Flow

### Step 1: Understand the problem

- Ask clarifying questions: what's the motivation, who's affected, what does success look like
- Explore relevant code with `Glob`, `Grep`, and `Read` to understand current state
- **Pause** — summarize understanding back to the user, confirm alignment before proceeding

### Step 2: Discuss approach

- Propose a high-level approach (or 2-3 alternatives if genuinely ambiguous)
- **Make a clear recommendation with reasoning** — don't just list options
- Discuss tradeoffs, key decisions, risks
- **Pause** — agree on the approach before talking about scope

### Step 3: Recommend scope

Based on the agreed approach, recommend the right level of overhead:

| Scope level          | When                                                      | What happens next                            |
| -------------------- | --------------------------------------------------------- | -------------------------------------------- |
| **Just build it**    | Small enough for a feature branch right now               | Start working or suggest `/gh-issue`         |
| **A few issues**     | Needs to be broken into shippable slices                  | Create issues, optionally a milestone        |
| **Design doc first** | Big enough or uncertain enough to write down the approach | Write `docs/design-*.md`, then derive issues |
| **Just capture it**  | User wants to remember the idea but not act yet           | Single issue or note                         |

- **Bias toward lightweight** — default to "just build it" unless complexity is clearly there
- **Pause** — user confirms the scope level

### Step 4: Break it down (if issues or design doc)

- **For issues:** Present a list of issue titles + 1-line summaries. Nothing more until user approves the list.
- **For design doc:** Outline the sections and key questions to answer. User confirms before agent writes the full draft.
- **Pause** — user approves the breakdown

### Step 5: Create artifacts

| Scope level          | Action                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| **Just build it**    | Start working or suggest `/gh-issue`                                            |
| **A few issues**     | Invoke `/write-issue` for each agreed issue, then create with `gh issue create` |
| **Design doc first** | Write full draft to `docs/design-*.md`, then derive and create issues           |
| **Just capture it**  | Create a single issue or add to `docs/product-roadmap.md`                       |

## Key Rules

1. **Never skip a pause** — every step waits for explicit user confirmation
2. **Recommend, don't defer** — always make a clear recommendation with reasoning
3. **Lightweight by default** — bias toward "just build it" unless complexity is clearly there
4. **Explore before proposing** — read relevant code to ground recommendations in reality
5. **One step at a time** — don't present the full plan upfront; earn each step

## Design Doc Format

When writing a design doc, follow the existing format in `docs/design-*.md`:

1. **Context** — what's the problem, current state
2. **Strategic Decisions** — key choices with reasoning
3. **Issues** — derived work items
4. **Future** — things explicitly deferred
5. **Verification** — how to confirm the design worked

Reference: `docs/design-barns-multi-tenancy.md`

## After Issues Are Created

Once issues are created on GitHub, update the design doc:

1. **Link the milestone** in the Issues section heading: `## Issues ([Milestone Name](url))`
2. **Replace placeholder headings** with linked issue numbers: `### [#84](https://github.com/taco/herdbook/issues/84): Title`
3. **Audit code TODOs** — any `TODO` referencing future work must use `TODO(#N)` with the real issue number
