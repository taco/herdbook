---
description: Write a well-scoped GitHub issue — outcome-focused, verifiable, with clear acceptance criteria. Use before creating issues to ensure quality.
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, WebFetch, WebSearch
---

# SKILL: Write a Good GitHub Issue (Right-Sized, Not Noisy)

## Goal

Create a GitHub issue that is outcome-focused, scoped, and executable without becoming a design doc.

## Principles

- Lead with **why**, then **what**, then **done**.
- Keep one issue to one shippable slice.
- Make it **verifiable** with clear acceptance criteria.
- Add only constraints and sharp edges; link deep details instead of pasting.
- Explicitly state **non-goals** to prevent scope creep.

## Inputs to Gather

- Problem statement (who, what, impact).
- Goal (desired user/system outcome).
- Constraints (perf, security, compatibility, timeline).
- Links (docs, mocks, logs, prior tickets).
- Open questions (only real unknowns).

## Output Structure

### Title

`Verb + object + scope`
Example: `Add bulk export for training sessions (CSV)`

### Body Template

**Problem**

- What's missing or broken, who is impacted, evidence/links.

**Goal**

- Desired outcome; success signal.

**Non-goals**

- Out of scope items.

**Proposed approach (high level)**

- 3–6 bullets max; include key constraints.

**Acceptance criteria**

- Verifiable bullets; include meaningful edge cases.

**UX / API notes (optional)**

- Only essentials; link mocks/specs.

**Telemetry / logging (optional)**

- 1–3 bullets on what to measure.

**Open questions**

- Unresolved items only; assign an owner if possible.

**Implementation notes (optional)**

- Only sharp edges: migrations, backfills, feature flag, rollout plan.

## Acceptance Criteria Patterns

Prefer simple, testable bullets:

- "User can …"
- "System prevents …"
- "Respects permissions …"
- "Completes within X (p95) …"
- "Behind flag …, enabled for …"

Use Given/When/Then only for complex flows.

## Avoid

- Step-by-step implementation plans.
- Large schema dumps or code blocks.
- Brainstorm lists of "maybe" features.
- Multiple unrelated changes in one issue.

## Quick Quality Checklist

- Title is specific and searchable.
- The "why" is clear in 30 seconds.
- Scope is bounded with non-goals.
- Acceptance criteria are unambiguous.
- Links exist for deep context.
- Labels, priority, and owner are set (if your workflow uses them).
