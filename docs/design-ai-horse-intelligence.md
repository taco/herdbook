# AI Horse Intelligence Design Doc

## Overview

AI-powered training summaries and recommendations on horse profile pages. Two tiers: a cheap factual summary (Tier 1) and an expensive rider-directed analysis with actionable training recommendations (Tier 2).

**Status:** Planned
**Last updated:** 2026-02-17
**Related:** `docs/product-roadmap.md` (Layers 2-3), `docs/design-voice-first-session.md`

---

## Problem Statement

### What We're Solving

Riders log sessions but can't answer "what should I work on next?" The app captures data but doesn't synthesize or surface insights. From the product roadmap:

- **Layer 2 (make data meaningful):** AI session summaries -- natural language recap of training patterns, consistency, and trends per horse
- **Layer 3 (make data actionable):** Next-ride suggestions -- personalized training recommendations based on session history, work type distribution, and rider goals

This feature bridges both layers with a two-tier approach: a summary that always exists (Layer 2) and an optional analysis the rider actively requests (Layer 3).

### What We're Not Solving

- Training programs or multi-week plans (future Layer 3 feature)
- Goal-oriented planning with target dates (requires `goals` data model)
- Progress tracking against plans ("on track" / "behind")
- Real-time conversational AI (no back-and-forth chat)
- Cross-horse insights ("you're riding Luna more than Beau this month")

---

## Current State

The horse profile page (`HorseProfile.tsx`) currently shows:

```
Header (horse name + back/edit)
Activity heatmap (12 weeks)
Stats row (total sessions, last ride)
Notes (collapsible)
Sessions list (all sessions, newest first)
FAB (Log Session)
```

The page has all the data needed for AI features — session history with dates, work types, durations, and notes. The API already supports:

| Existing Infrastructure | Location | Relevance |
|---|---|---|
| REST endpoint pattern | `packages/api/src/rest/voice.ts` | Auth, rate limiting, OpenAI calls |
| Prompt registry | `packages/api/src/rest/voicePrompts.ts` | Typed prompt variants |
| Shared AI rate limiter | `voice.ts` → `aiDailyLimiter` decorator | Reuse for summary/analysis |
| OpenAI integration | `voice.ts` → `OpenAI` client | Same client pattern |
| GraphQL type extensions | `schema.graphql` → `Horse` type | Add `summary`/`analyses` fields |

---

## Design Principles

1. **Data-grounded, not speculative** — Summaries only state what's in the sessions. Analysis recommendations are grounded in the horse's actual training history.
2. **Rider-initiated, not automatic** — AI features are triggered by the rider, not generated on page load. Respects both cost and user agency.
3. **Progressive disclosure** — Summary is always visible (collapsed). Deeper analysis lives in a drawer, revealed on demand.
4. **Cost-conscious by default** — Use the cheapest model that produces good results for each tier. Cache aggressively. Cooldowns prevent unnecessary regeneration.
5. **Transparent metadata** — Always show what data the AI used: "Based on 14 sessions (Nov 3 – Feb 12)".

---

## Architecture

### Two-Tier Model

The feature uses two AI tiers with different models, costs, and interaction patterns:

| | Training Summary (Tier 1) | "What's Next" Analysis (Tier 2) |
|---|---|---|
| **Model** | gpt-4.1-mini | gpt-5.2 |
| **Cost per call** | ~$0.002 | ~$0.014 |
| **Trigger** | Rider taps "Generate Summary" | Rider selects focus areas + taps "Analyze" |
| **Content** | Factual training recap | Recommendations and observations |
| **Tone** | Objective, reportorial | Advisory, conversational |
| **Caching** | One per horse | One per horse per unique focus combo |
| **Placement** | Inline on horse page | Bottom sheet (drawer) |

**Why two models?** The summary is factual extraction — a smaller model handles it well at 7x lower cost. Analysis requires reasoning about training patterns and making recommendations, which benefits from a more capable model.

### Cost Structure

Per-session token estimate: ~80 tokens (date: 4, duration: 2, workType: 3, rider: 2, notes: ~70 avg).

**Tier 1: Summary (gpt-4.1-mini -- $0.40/$1.60 per M tokens)**

| Sessions | Input tokens | Input cost | Output (~400 tok) | Total   |
| -------- | ------------ | ---------- | ------------------ | ------- |
| 10       | ~1,300       | $0.0005    | $0.0006            | $0.0011 |
| 20       | ~2,100       | $0.0008    | $0.0006            | $0.0015 |
| 30       | ~2,900       | $0.0012    | $0.0006            | $0.0018 |
| 60       | ~5,300       | $0.0021    | $0.0006            | $0.0028 |

At 20 summaries/day across all users: ~$0.04/day, ~$1.08/month

**Tier 2: Analysis (gpt-5.2 -- $1.75/$14.00 per M tokens)**

| Sessions | Input tokens | Input cost | Output (~600 tok) | Total   |
| -------- | ------------ | ---------- | ------------------ | ------- |
| 10       | ~1,300       | $0.0023    | $0.0084            | $0.0107 |
| 20       | ~2,100       | $0.0037    | $0.0084            | $0.0121 |
| 30       | ~2,900       | $0.0051    | $0.0084            | $0.0135 |
| 60       | ~5,300       | $0.0093    | $0.0084            | $0.0177 |

At 10 analyses/day: ~$0.14/day, ~$4.05/month

**Model alternatives for Tier 2:**

| Model        | 30-session cost | Quality                                      |
| ------------ | --------------- | -------------------------------------------- |
| gpt-4.1-mini | $0.0018         | Good factual summary, weaker recommendations |
| gpt-4.1      | $0.0090         | Strong reasoning, cheaper than 5.2           |
| gpt-5.2      | $0.0135         | Best reasoning for "what to do next"         |

**Combined monthly estimate (moderate usage): ~$5/month**

The 20/day AI rate limit (shared with voice) is the practical cost ceiling.

### Session Window & Temporal Context

**Window:** 30 sessions or 90 days, whichever is fewer.

- **Maximum sessions:** 30 (keeps prompt size reasonable)
- **Maximum age:** 90 days (older sessions lose relevance for "current training")
- **Minimum sessions:** 3 (below this, show "Log a few more sessions" instead of Generate button)

The window is: `sessions WHERE horseId = :id ORDER BY date DESC LIMIT 30` filtered to `date >= NOW() - 90 days`.

Each session in the prompt includes: date, work type, duration, rider name, and notes (truncated to ~200 chars if very long).

Sessions are fed to the model in chronological order with explicit dates. The prompt instructs the model to observe:

- Training cadence and consistency ("sessions were 3 days apart in January, then a 2-week gap")
- Recency weighting ("pay particular attention to the most recent sessions")
- Work type distribution shifts over time ("transitioned from weekly groundwork to twice-weekly flatwork")
- Multi-rider patterns ("Travis rode 3x this week, Sarah rode once")

This temporal context is critical for the analysis tier. A horse that was doing weekly jump schools but stopped 3 weeks ago has a very different recommendation than one that jumped yesterday.

### Smart Refresh Cooldown

Regeneration is gated by two conditions — **both** must be true:

1. **Cooldown elapsed** — Time since last generation has passed the threshold
2. **New data exists** — At least one new session has been logged since last generation

**Cooldown tiers** based on how recently the horse was worked:

| Last session age | Cooldown | Rationale |
|---|---|---|
| < 7 days | 48 hours | Active training -- frequent updates useful |
| 7-14 days | 72 hours | Moderate activity -- less urgency |
| > 14 days | 7 days (168h) | Idle -- data isn't changing |

```
function getRefreshCooldownHours(latestSessionDate: Date): number {
    const daysSinceLastSession = daysBetween(latestSessionDate, now());
    if (daysSinceLastSession < 7)  return 48;   // Active: 48h cooldown
    if (daysSinceLastSession < 14) return 72;   // Moderate: 72h cooldown
    return 168;                                   // Idle: 7-day cooldown
}
```

**Logic:** The cooldown is computed from `generatedAt` and the most recent session date. Refresh is gated by TWO conditions -- both must be true:

1. Cooldown period has elapsed since last generation
2. At least one new session exists since last generation

If the rider hasn't added any sessions since the last generation, the refresh button stays disabled regardless of cooldown. Applies to both Tier 1 and Tier 2 independently.

**UI state mapping:**

| Cooldown elapsed? | New sessions? | Button state |
|---|---|---|
| Yes | Yes | Enabled — "Refresh (N new sessions)" |
| Yes | No | Disabled — "Up to date" |
| No | Yes | Disabled — "Available in Xh" with stale indicator |
| No | No | Disabled — "Up to date" |

### Data Flow

**Summary generation:**

```
┌──────────────┐   POST /api/horse-summary    ┌─────────────────┐
│  Frontend    │ ──────────────────────────▶  │   REST Handler  │
│  (button)    │                              │   (auth + rate) │
└──────────────┘                              └────────┬────────┘
                                                       │
                                               ┌───────▼────────┐
                                               │  Fetch sessions │
                                               │  (last 30/90d)  │
                                               └───────┬────────┘
                                                       │
                                               ┌───────▼────────┐
                                               │  gpt-4.1-mini  │
                                               │  (summary)     │
                                               └───────┬────────┘
                                                       │
                                               ┌───────▼────────┐
                                               │  Upsert to DB  │
                                               │  (HorseSummary)│
                                               └───────┬────────┘
                                                       │
                                               ┌───────▼────────┐
                                               │  Return JSON   │
                                               └────────────────┘
```

**Analysis follows the same pattern** with `POST /api/horse-analysis`, gpt-5.2, focus areas in the prompt, and `HorseAnalysis` model.

**Reading cached data** goes through GraphQL:

```graphql
query GetHorseProfile($id: ID!) {
  horse(id: $id) {
    # ... existing fields
    summary {
      content
      sessionCount
      windowStart
      windowEnd
      stale
      generatedAt
    }
  }
}
```

---

## Data Model

### HorseSummary

```prisma
model HorseSummary {
  id                String   @id @default(cuid())
  horse             Horse    @relation(fields: [horseId], references: [id])
  horseId           String   @unique  // one summary per horse
  content           String   // plain text, ~150-300 words
  sessionCount      Int      // number of sessions in window
  windowStart       DateTime @db.Timestamptz(3)  // earliest session date
  windowEnd         DateTime @db.Timestamptz(3)  // latest session date
  sessionsAtGeneration Int   // total session count when generated (for stale detection)
  model             String   @default("gpt-4.1-mini")
  promptTokens      Int      @default(0)
  completionTokens  Int      @default(0)
  createdAt         DateTime @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime @updatedAt @db.Timestamptz(3)
}
```

**Rationale:**
- `@unique` on `horseId` — one summary per horse, upserted on regeneration
- `sessionsAtGeneration` — compared to current session count to compute `stale` flag
- Token columns — cost tracking for monitoring

### HorseAnalysis

```prisma
model HorseAnalysis {
  id                String   @id @default(cuid())
  horse             Horse    @relation(fields: [horseId], references: [id])
  horseId           String
  focusAreas        String[] // e.g. ["FLATWORK", "Skill progression"]
  content           String   // plain text, ~200-400 words
  sessionCount      Int
  windowStart       DateTime @db.Timestamptz(3)
  windowEnd         DateTime @db.Timestamptz(3)
  sessionsAtGeneration Int
  model             String   @default("gpt-5.2")
  promptTokens      Int      @default(0)
  completionTokens  Int      @default(0)
  createdAt         DateTime @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime @updatedAt @db.Timestamptz(3)

  @@unique([horseId, focusAreas])  // one analysis per horse per focus combo
}
```

**Rationale:**
- No `@unique` on `horseId` alone — multiple analyses per horse (different focus combos)
- `@@unique([horseId, focusAreas])` — one cached result per unique combination
- `focusAreas` as `String[]` — flexible, ordered array; Prisma/Postgres handles array equality

### Data Model Outlook

These models are self-contained and don't require changes to existing `Horse`, `Session`, or `Rider` models beyond adding relations. If Layer 3 features (goals, training plans) are built later, analyses may gain a `goalId` foreign key, but that's not designed here.

---

## API Design

### REST Endpoints (Generation)

Generation uses REST (not GraphQL mutations) following the voice endpoint pattern:

**`POST /api/horse-summary`**

```
Headers: Authorization: Bearer <token>
Body: { "horseId": "<id>", "force": false }
Response: {
  "id": "<cuid>",
  "content": "...",
  "sessionCount": 14,
  "windowStart": "2025-11-03T...",
  "windowEnd": "2026-02-12T...",
  "stale": false,
  "generatedAt": "2026-02-17T..."
}
```

- `force: true` bypasses cooldown check (still respects rate limits)
- Returns existing cached summary if not stale and cooldown hasn't elapsed

**`POST /api/horse-analysis`**

```
Headers: Authorization: Bearer <token>
Body: { "horseId": "<id>", "focusAreas": ["FLATWORK", "Skill progression"], "force": false }
Response: {
  "id": "<cuid>",
  "content": "...",
  "focusAreas": ["FLATWORK", "Skill progression"],
  "sessionCount": 14,
  "windowStart": "2025-11-03T...",
  "windowEnd": "2026-02-12T...",
  "stale": false,
  "generatedAt": "2026-02-17T..."
}
```

**Why REST, not GraphQL mutation?**
- Follows established pattern from voice endpoints
- Long-running AI calls don't fit well in GraphQL's request/response model
- Easier to handle streaming responses if needed later
- Rate limiting is simpler at the route level

### GraphQL Extensions (Read-Only Cached Data)

```graphql
type HorseSummary {
  id: ID!
  content: String!
  sessionCount: Int!
  windowStart: DateTime!
  windowEnd: DateTime!
  stale: Boolean!        # computed: current session count > sessionsAtGeneration
  generatedAt: DateTime!
}

type HorseAnalysis {
  id: ID!
  focusAreas: [String!]!
  content: String!
  sessionCount: Int!
  windowStart: DateTime!
  windowEnd: DateTime!
  stale: Boolean!
  generatedAt: DateTime!
}

type Horse {
  # ... existing fields
  summary: HorseSummary              # nullable — null if never generated
  analyses: [HorseAnalysis!]!        # empty array if none
  availableFocusAreas: [String!]!    # computed from horse's session work types + training goals
}
```

The `stale` field is computed in the resolver by comparing `sessionsAtGeneration` to the current session count for that horse.

`availableFocusAreas` returns the union of:
1. Work types the horse has actually done (from sessions)
2. Static training goal options (always available)

### Rate Limiting Integration

Both endpoints share the existing `aiDailyLimiter` decorator (20/day) and create per-endpoint burst limiters (2/min). This means voice parsing, summary generation, and analysis generation all draw from the same daily AI pool.

---

## UX Design

### Page Layout (Option C: Inline Summary + Analysis in Drawer)

Updated horse profile page structure:

```
Header (horse name + back/edit)
Activity heatmap (12 weeks)
Stats row (total sessions, last ride)
──────────────────────────────────
AI Summary section (NEW)
  - Collapsible content (4-6 lines default)
  - "Based on N sessions (Mon-Mon)" metadata
  - Refresh button with cooldown state
──────────────────────────────────
Notes (collapsible)
──────────────────────────────────
"Get Training Recommendations" button (NEW)
──────────────────────────────────
Sessions list
FAB (Log Session)
```

**Why inline summary + drawer analysis?**
- Summary is glanceable — inline keeps it visible without interaction
- Analysis is longer and interactive (focus area selection) — a drawer provides space without cluttering the page
- Progressive disclosure: summary = passive reading, analysis = active exploration

### Component States

**Summary section states:**

| State | Display |
|---|---|
| < 3 sessions | "Log a few more sessions to unlock AI training insights." (muted text) |
| No summary yet (3+ sessions) | "Generate Summary" button with brief description |
| Loading | Skeleton lines (4-5 lines) |
| Summary loaded | Collapsible content, metadata line, refresh button |
| Summary stale | Existing content + "N new sessions" badge + enabled Refresh |
| Refresh on cooldown | Existing content + disabled Refresh with "Available in Xh" |
| Error | "Couldn't generate summary. Try again." + Retry button |
| Rate limited | "Daily AI limit reached. Try again tomorrow." |

**Analysis drawer states:**

| State | Display |
|---|---|
| Initial (no analyses) | Focus area chips + "Analyze" button (disabled until selection) |
| Loading | Skeleton content below chips |
| Analysis loaded | Content + metadata + chips showing selected focus |
| Saved analyses exist | Chip selector to switch between saved analyses |
| Stale analysis | Existing content + "N new sessions" indicator + Refresh |
| Error | Error message + Retry |
| Rate limited | Same as summary |

### Mobile UX Considerations

- **Thumb zone:** Generate/Refresh buttons are in the natural thumb reach zone (middle of page, not header)
- **Bottom sheet:** Analysis drawer uses `Sheet` with `side="bottom"`, `max-h-[85vh]` to leave header visible
- **Touch targets:** All buttons ≥ 44x44px; chips ≥ 44px height
- **Focus area chips:** Horizontal scroll if they overflow, with visual scroll indicator
- **Collapse behavior:** Summary shows 4-6 lines by default with "Show more" / "Show less" toggle (same pattern as Notes section)

### Wireframe Descriptions

**Summary section (loaded state):**
```
┌──────────────────────────────────────┐
│ 🤖 Training Summary           ↻ ⏐  │  ← Section header + refresh icon
│──────────────────────────────────────│
│ You've ridden Luna 8 times in the   │
│ last 3 weeks — mostly flatwork with │
│ two jumping sessions. Your recent   │
│ work has focused on canter...        │
│                      [Show more ▼]   │
│──────────────────────────────────────│
│ Based on 14 sessions · Nov 3–Feb 12 │  ← Metadata line (muted)
└──────────────────────────────────────┘
```

**Analysis drawer (focus selection):**
```
┌──────────────────────────────────────┐
│ What's Next for Luna          [×]   │
│──────────────────────────────────────│
│ Select focus areas:                  │
│ ┌──────┐ ┌────────┐ ┌───────────┐   │
│ │Flat  │ │Jumping │ │Groundwork │   │  ← Work type chips (from sessions)
│ └──────┘ └────────┘ └───────────┘   │
│ ┌──────────────┐ ┌─────────┐        │
│ │Competition   │ │Fitness  │        │  ← Training goal chips (always shown)
│ └──────────────┘ └─────────┘        │
│ ┌──────────┐ ┌────────────────┐     │
│ │Behavior  │ │Skill progress  │     │
│ └──────────┘ └────────────────┘     │
│──────────────────────────────────────│
│         [  Analyze  ]                │  ← Disabled until ≥1 chip selected
└──────────────────────────────────────┘
```

---

## Prompt Design

### Summary Prompt (gpt-4.1-mini)

**File:** `packages/api/src/rest/summaryPrompts.ts`

**System prompt structure:**

```
You are a training analyst for an equestrian training log app.
Summarize the recent training history for this horse based on the session data below.

INSTRUCTIONS:
- Be factual and concise — only state what the data shows
- Write in second person ("You've ridden...", "Your recent sessions...")
- Plain text only, no markdown
- Target 150-300 words
- Do NOT give recommendations or advice (that's a separate feature)

STRUCTURE your summary as:
1. Training Overview — frequency, consistency, rider(s) involved
2. Work Distribution — breakdown by type, any shifts in focus
3. Key Observations — recurring themes from notes, behavioral patterns
4. Areas of Attention — repeated concerns worth noting

SESSIONS (newest first):
[session data formatted as date | workType | duration | rider | notes excerpt]
```

### Analysis Prompt (gpt-5.2)

**File:** `packages/api/src/rest/analysisPrompts.ts`

**System prompt structure:**

```
You are an experienced equestrian training advisor for a training log app.
Based on the horse's recent training history and the rider's selected focus areas,
provide specific, actionable training recommendations.

FOCUS AREAS selected by rider: [focusAreas]

INSTRUCTIONS:
- Ground ALL recommendations in the actual session data
- Reference specific sessions when relevant ("In your Feb 10 session, you noted...")
- Be specific and practical — "work on 20m circles at sitting trot" not "do more flatwork"
- Consider training periodization, variety, and recovery
- Plain text, no markdown, 200-400 words
- Write in second person

STRUCTURE your analysis as:
1. Current Pattern — what the data shows for the selected focus areas
2. What's Going Well — positive patterns to maintain
3. Suggested Next Steps — 2-3 specific recommendations
4. Watch For — things to monitor based on notes

SESSIONS (newest first):
[session data]
```

### Focus Areas

**Work types** (filtered to what the horse has actually done):
- FLATWORK, JUMPING, GROUNDWORK, IN_HAND, TRAIL, OTHER

**Training goals** (always available):
- Competition readiness
- Fitness & conditioning
- Behavior & confidence
- Skill progression

Training goals are always shown because they represent analytical lenses that apply regardless of what work types appear in the data. A rider might want "competition readiness" analysis even if they've only logged flatwork sessions.

---

## Implementation Context for Agents

### Key Files to Reference

| File | Why |
|---|---|
| `packages/api/src/rest/voice.ts` | REST endpoint pattern: auth, rate limiting, OpenAI calls |
| `packages/api/src/rest/voicePrompts.ts` | Prompt registry pattern with typed variants |
| `packages/api/src/server.ts` | Route registration pattern |
| `packages/api/src/middleware/auth.ts` | `verifyToken()`, `rateLimitKey()` |
| `packages/api/src/config.ts` | `getRateLimits()` — aiBurst: 2/min, aiDaily: 20/day |
| `packages/api/src/graphql/resolvers.ts` | `wrapResolver()` pattern, `Horse` type resolver |
| `packages/web/src/pages/HorseProfile.tsx` | Integration point for summary section + analysis button |
| `packages/web/src/components/ui/sheet.tsx` | Shadcn Sheet for analysis drawer |
| `packages/web/src/components/ui/skeleton.tsx` | Loading states |

### Patterns to Follow

**REST endpoint registration** (from `server.ts`):
```ts
import { registerVoiceRoutes } from '@/rest/voice';
await registerVoiceRoutes(app);
// Add:
import { registerSummaryRoutes } from '@/rest/horseSummary';
await registerSummaryRoutes(app);
```

**Prompt registry** (from `voicePrompts.ts`):
```ts
export type PromptName = 'v1';
export interface PromptVariant {
    buildPrompt: (context: SummaryContext) => string;
    // no schema needed — plain text output, not JSON
}
export const PROMPTS: Record<PromptName, PromptVariant> = { ... };
```

**Rate limiting** (from `voice.ts`):
- Per-endpoint burst limiter: `app.createRateLimit({ max: 2, timeWindow: '1 minute' })`
- Shared daily limiter: reuse `app.aiDailyLimiter` decorator

**GraphQL resolver for computed fields** (new pattern):
```ts
Horse: {
    summary: async (parent) => {
        const summary = await prisma.horseSummary.findUnique({
            where: { horseId: parent.id }
        });
        if (!summary) return null;
        const currentCount = await prisma.session.count({
            where: { horseId: parent.id }
        });
        return { ...summary, stale: currentCount > summary.sessionsAtGeneration };
    }
}
```

### Available Components to Reuse

| Component | Use For |
|---|---|
| `Button` | Generate, Refresh, Analyze buttons |
| `Sheet` | Analysis bottom drawer |
| `Skeleton` | Loading states |
| `Separator` | Section dividers |
| `Badge` | "N new sessions" stale indicator |

---

## Implementation Phases

### Phase 1: `/mobile-ux` Skill

Create the design skill for mobile UX analysis. Small, self-contained.

### Phase 2: Training Summary (Full Stack)

Prisma model → REST endpoint → GraphQL read → frontend component. The summary section on the horse profile page. This is the highest-value feature and establishes all the patterns (rate limiting, caching, cooldown, stale detection) that Phase 3 reuses.

### Phase 3: "What's Next" Analysis (Full Stack)

Builds on Phase 2's patterns. Adds focus area selection, multiple cached analyses per horse, and the bottom sheet UX.

---

## Design Decisions

### 1. Two models vs. one (gpt-4.1-mini + gpt-5.2)

**Decision:** Use gpt-4.1-mini for summaries, gpt-5.2 for analysis

**Rationale:** Summaries are factual extraction — a smaller model handles this well at 7x lower cost. Analysis requires reasoning about training patterns and making specific recommendations, which benefits from a more capable model.

**Alternative considered:** Single model for both. Rejected because it either overpays for summaries or underperforms on analysis.

### 2. REST vs. GraphQL mutation for generation

**Decision:** REST endpoints for generation, GraphQL for reading cached results

**Rationale:** Follows the established voice endpoint pattern. Long-running AI calls are easier to handle in REST (timeouts, streaming if needed later). GraphQL serves cached data where it excels — typed, composable queries.

**Alternative considered:** GraphQL mutations. Rejected due to complexity of rate limiting within GraphQL and the existing REST pattern being well-proven.

### 3. Inline summary + drawer analysis vs. tabs vs. all-inline

**Decision:** Summary inline on page, analysis in bottom sheet

**Rationale:** Summary is short and glanceable — it belongs on the page. Analysis is longer, interactive (focus selection), and exploratory — a drawer provides space without cluttering the profile.

**Alternatives considered:**
- **Tabs (Summary | Analysis):** Hides summary behind a tap. Summary should be visible by default.
- **All inline:** Analysis section would make the page too long, especially with focus area selection.

### 4. Session-count invalidation vs. TTL

**Decision:** Track `sessionsAtGeneration` and compare to current count for stale detection

**Rationale:** TTL-based invalidation regenerates even when nothing has changed. Session-count invalidation only marks as stale when there's actually new data, which is more accurate and cheaper.

**Alternative considered:** TTL (regenerate every 24h). Rejected — wastes API calls when no new sessions exist.

### 5. Cooldown based on session recency

**Decision:** Cooldown tiers (48h / 72h / 7d) based on how recently the horse was worked

**Rationale:** Actively-trained horses benefit from more frequent updates. Inactive horses don't need frequent regeneration. The tiered approach adapts automatically.

**Alternative considered:** Fixed 24h cooldown. Too frequent for inactive horses, potentially too infrequent for very active ones.

### 6. No rider customization in v1

**Decision:** No preferences for summary length, tone, or detail level

**Rationale:** Ship the simplest version that works. Customization adds UX complexity (settings screens, storage) for unclear benefit. Adjust the prompts based on feedback instead.

### 7. Per-horse summary vs. per-rider-per-horse

**Decision:** One summary per horse (shared across riders)

**Rationale:** In Herdbook's model, all riders in the barn see the same horse data. A shared summary is more useful ("what has this horse been doing") than a personal one ("what have I done with this horse"). Personal analytics can come later.

---

## Future Enhancements (Not in Scope)

| Enhancement | Description | Why Deferred |
|---|---|---|
| Training programs | Multi-week structured plans | Requires goals data model (Layer 3) |
| Goal planning | "Prepare for May show" | New schema + complex UX |
| Progress tracking | Compare actual vs. plan | Depends on goals + programs |
| Streaming responses | Show AI text as it generates | Adds complexity; generation is fast enough |
| Rider preferences | Customize tone, length, focus | Validate base feature first |
| Historical summaries | Browse past summaries | Low value; current summary is what matters |
| Export / share | Share summary as text/image | Wait for user request |

---

## Open Questions

1. **Summary length:** Is 150-300 words right? May need tuning after real usage.
2. **Analysis retention:** Should old analyses be cleaned up after a period? Or kept indefinitely for reference?
3. **Focus area evolution:** Will riders want custom focus areas beyond the predefined set?
4. **Cross-horse insights:** "You've been neglecting Luna while focusing on Beau" — valuable but architecturally different (rider-scoped, not horse-scoped).
