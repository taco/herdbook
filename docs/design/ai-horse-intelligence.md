# AI Horse Intelligence Design Doc

## Overview

AI-powered training summaries and recommendations on horse profile pages. Two tiers: a cheap factual summary (Tier 1) and a rider-directed analysis with actionable training recommendations (Tier 2).

**Status:** Tier 1 shipped. Tier 2 not started.
**Last updated:** 2026-03-05

---

## What's Built (Tier 1: Training Summary)

Factual, data-driven summary of a horse's recent training history. Shipped end-to-end:

| Component        | Location                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| REST endpoint    | [`packages/api/src/rest/generateSummary.ts`](../../packages/api/src/rest/generateSummary.ts)                       |
| Prompt config    | [`packages/api/src/prompts/horseSummary.v1.ts`](../../packages/api/src/prompts/horseSummary.v1.ts)                 |
| Frontend section | [`packages/web/src/components/HorseSummarySection.tsx`](../../packages/web/src/components/HorseSummarySection.tsx) |
| Data hook        | [`packages/web/src/hooks/useHorseSummary.ts`](../../packages/web/src/hooks/useHorseSummary.ts)                     |
| GraphQL type     | `HorseSummary` in schema.graphql                                                                                   |

**Model:** `gpt-5-mini` (Floor tier). See [ai-guidelines.md](../ai-guidelines.md) for model tiers.

**Implementation note:** The actual implementation differs from the original design below — summary data is stored on the Horse model directly (`summaryContent`, `summaryGeneratedAt`) rather than a separate `HorseSummary` Prisma model. The GraphQL layer exposes a `HorseSummary` type with computed fields.

---

## Tier 2: "What's Next" Analysis (Not Built)

Reasoning-heavy, recommendation-oriented analysis. Rider selects focus areas, AI provides specific training recommendations grounded in session data.

### Two-Tier Model

|             | Training Summary (Tier 1)     | "What's Next" Analysis (Tier 2)            |
| ----------- | ----------------------------- | ------------------------------------------ |
| **Model**   | gpt-5-mini (Floor)            | gpt-5 or gpt-5.2 (Mid/Full)                |
| **Trigger** | Rider taps "Generate Summary" | Rider selects focus areas + taps "Analyze" |
| **Content** | Factual training recap        | Recommendations and observations           |
| **Tone**    | Objective, reportorial        | Advisory, conversational                   |
| **Caching** | One per horse                 | One per horse per unique focus combo       |

### Session Window & Temporal Context

**Window:** 30 sessions or 90 days, whichever is fewer.

- **Minimum sessions:** 3 (below this, show "Log a few more sessions")
- Sessions fed in chronological order with explicit dates
- Prompt instructs model to observe cadence, recency, work type distribution, multi-rider patterns

### Smart Refresh Cooldown

Regeneration gated by two conditions — both must be true:

1. **Cooldown elapsed** — sliding based on how recently the horse was worked (48h / 72h / 7d)
2. **New data exists** — at least one new session since last generation

### Focus Areas

**Work types** (filtered to what the horse has done): FLATWORK, JUMPING, GROUNDWORK, IN_HAND, TRAIL

**Training goals** (always available): Competition readiness, Fitness & conditioning, Behavior & attitude, Skill progression

### UX Design

Both AI sections are inline on the horse profile page between stats and notes. Collapse/expand for information density. Focus area selection via multi-select chips.

---

## Design Decisions

### 1. Two models vs. one

Use cheaper model for summaries (factual extraction), more capable model for analysis (reasoning + recommendations). 7x cost difference.

### 2. REST for generation, GraphQL for reading

Follows voice endpoint pattern. Long-running AI calls are easier in REST. GraphQL serves cached data where it excels.

### 3. Inline sections vs. tabs vs. drawer

Both summary and analysis render inline on the horse profile. Riders want to see context (heatmap, stats) alongside AI content. Tabs fragment; sheets hide context.

### 4. Session-count invalidation vs. TTL

Track sessions at generation time, compare to current count. TTL wastes API calls when nothing changed.

### 5. Focus areas as structured multi-select

Not free text. Prevents prompt injection, enables deterministic caching, consistent prompts.

### 6. One summary per horse (shared across riders)

All barn riders see the same summary. Personal analytics can come later.

---

## Open Questions

1. **Multiple saved analyses UX** — Tabs, accordion, or simple list?
2. **First-generation UX** — Auto-generate on page load (if 3+ sessions), or require explicit tap?
3. **Analysis deletability** — Should riders delete saved analyses?
4. **Cross-horse insights** — "You've been neglecting Luna while focusing on Beau" — valuable but architecturally different.
