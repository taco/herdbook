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

| Existing Infrastructure | Location                                | Relevance                         |
| ----------------------- | --------------------------------------- | --------------------------------- |
| REST endpoint pattern   | `packages/api/src/rest/voice.ts`        | Auth, rate limiting, OpenAI calls |
| Prompt registry         | `packages/api/src/rest/voicePrompts.ts` | Typed prompt variants             |
| Shared AI rate limiter  | `voice.ts` → `aiDailyLimiter` decorator | Reuse for summary/analysis        |
| OpenAI integration      | `voice.ts` → `OpenAI` client            | Same client pattern               |
| GraphQL type extensions | `schema.graphql` → `Horse` type         | Add `summary`/`analyses` fields   |

---

## Design Principles

1. **Data-grounded, not speculative** — Summaries only state what's in the sessions. Analysis recommendations are grounded in the horse's actual training history.
2. **Rider-initiated, not automatic** — AI features are triggered by the rider, not generated on page load. Respects both cost and user agency.
3. **Progressive disclosure** — Summary is always visible (collapsed). Analysis section uses collapse/expand to manage page length.
4. **Cost-conscious by default** — Use the cheapest model that produces good results for each tier. Cache aggressively. Cooldowns prevent unnecessary regeneration.
5. **Transparent metadata** — Always show what data the AI used: "Based on 14 sessions (Nov 3 – Feb 12)".

---

## Architecture

### Two-Tier Model

The feature uses two AI tiers with different models, costs, and interaction patterns:

|                   | Training Summary (Tier 1)     | "What's Next" Analysis (Tier 2)            |
| ----------------- | ----------------------------- | ------------------------------------------ |
| **Model**         | gpt-4.1-mini                  | gpt-5.2                                    |
| **Cost per call** | ~$0.002                       | ~$0.014                                    |
| **Trigger**       | Rider taps "Generate Summary" | Rider selects focus areas + taps "Analyze" |
| **Content**       | Factual training recap        | Recommendations and observations           |
| **Tone**          | Objective, reportorial        | Advisory, conversational                   |
| **Caching**       | One per horse                 | One per horse per unique focus combo       |
| **Placement**     | Inline on horse page          | Inline on horse page                       |

**Why two models?** The summary is factual extraction — a smaller model handles it well at 7x lower cost. Analysis requires reasoning about training patterns and making recommendations, which benefits from a more capable model.

### Cost Structure

Per-session token estimate: ~80 tokens (date: 4, duration: 2, workType: 3, rider: 2, notes: ~70 avg).

**Tier 1: Summary (gpt-4.1-mini -- $0.40/$1.60 per M tokens)**

| Sessions | Input tokens | Input cost | Output (~400 tok) | Total   |
| -------- | ------------ | ---------- | ----------------- | ------- |
| 10       | ~1,300       | $0.0005    | $0.0006           | $0.0011 |
| 20       | ~2,100       | $0.0008    | $0.0006           | $0.0015 |
| 30       | ~2,900       | $0.0012    | $0.0006           | $0.0018 |
| 60       | ~5,300       | $0.0021    | $0.0006           | $0.0028 |

At 20 summaries/day across all users: ~$0.04/day, ~$1.08/month

**Tier 2: Analysis (gpt-5.2 -- $1.75/$14.00 per M tokens)**

| Sessions | Input tokens | Input cost | Output (~600 tok) | Total   |
| -------- | ------------ | ---------- | ----------------- | ------- |
| 10       | ~1,300       | $0.0023    | $0.0084           | $0.0107 |
| 20       | ~2,100       | $0.0037    | $0.0084           | $0.0121 |
| 30       | ~2,900       | $0.0051    | $0.0084           | $0.0135 |
| 60       | ~5,300       | $0.0093    | $0.0084           | $0.0177 |

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

| Last session age | Cooldown      | Rationale                                  |
| ---------------- | ------------- | ------------------------------------------ |
| < 7 days         | 48 hours      | Active training -- frequent updates useful |
| 7-14 days        | 72 hours      | Moderate activity -- less urgency          |
| > 14 days        | 7 days (168h) | Idle -- data isn't changing                |

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

| Cooldown elapsed? | New sessions? | Button state                                      |
| ----------------- | ------------- | ------------------------------------------------- |
| Yes               | Yes           | Enabled — "Refresh (N new sessions)"              |
| Yes               | No            | Disabled — "Up to date"                           |
| No                | Yes           | Disabled — "Available in Xh" with stale indicator |
| No                | No            | Disabled — "Up to date"                           |

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
            sessionWindowStart
            sessionWindowEnd
            stale
            refreshAvailableAt
            generatedAt
        }
        analyses {
            id
            focusAreas
            content
            stale
            refreshAvailableAt
            generatedAt
        }
        availableFocusAreas
    }
}
```

---

## Data Model

### HorseSummary

One per horse. Upserted on each generation.

```prisma
model HorseSummary {
  id                       String   @id @default(cuid())
  horse                    Horse    @relation(fields: [horseId], references: [id], onDelete: Cascade)
  horseId                  String   @unique
  content                  String
  generatedAt              DateTime @default(now()) @db.Timestamptz(3)
  sessionCountAtGeneration Int
  latestSessionDate        DateTime @db.Timestamptz(3)
  sessionWindowStart       DateTime @db.Timestamptz(3)
  sessionWindowEnd         DateTime @db.Timestamptz(3)
  model                    String
  promptTokens             Int      @default(0)
  completionTokens         Int      @default(0)
  createdAt                DateTime @default(now()) @db.Timestamptz(3)
  updatedAt                DateTime @updatedAt @db.Timestamptz(3)
}
```

**Key fields:**

- `@unique` on `horseId` -- one summary per horse, upserted on regeneration
- `sessionCountAtGeneration` -- compared to current session count to compute `stale` flag
- `latestSessionDate` -- drives cooldown calculation (determines which cooldown tier applies)
- `sessionWindowStart` / `sessionWindowEnd` -- displayed in UI as "Based on N sessions (Dec-Feb)"
- `model` / `promptTokens` / `completionTokens` -- cost tracking and debugging

### HorseAnalysis

Multiple per horse, one per unique focus area combination.

```prisma
model HorseAnalysis {
  id                       String   @id @default(cuid())
  horse                    Horse    @relation(fields: [horseId], references: [id], onDelete: Cascade)
  horseId                  String
  focusAreas               String[]
  focusHash                String       // Deterministic hash of sorted focusAreas
  content                  String
  generatedAt              DateTime @default(now()) @db.Timestamptz(3)
  sessionCountAtGeneration Int
  latestSessionDate        DateTime @db.Timestamptz(3)
  model                    String
  promptTokens             Int      @default(0)
  completionTokens         Int      @default(0)
  createdAt                DateTime @default(now()) @db.Timestamptz(3)
  updatedAt                DateTime @updatedAt @db.Timestamptz(3)

  @@unique([horseId, focusHash])
}
```

**Key fields:**

- No `@unique` on `horseId` alone -- multiple analyses per horse (different focus combos)
- `focusHash` -- Prisma's `@@unique` does not support array fields directly. The `focusHash` is a deterministic string computed from sorted focus areas (e.g., the sorted comma-joined string `"COMPETITION_READINESS,FLATWORK"`). This enables unique constraint enforcement and efficient lookups.
- `focusAreas` as `String[]` -- preserves the original selection for display
- `latestSessionDate` -- independent cooldown calculation per analysis

### Horse Model Extension

```prisma
model Horse {
  // ... existing fields
  summary   HorseSummary?
  analyses  HorseAnalysis[]
}
```

### Data Model Outlook

These models are self-contained and don't require changes to existing `Horse`, `Session`, or `Rider` models beyond adding relations.

| Future feature      | Schema impact                                          |
| ------------------- | ------------------------------------------------------ |
| Training programs   | New `TrainingPlan` model linked to horse + analysis    |
| Goal planning       | New `Goal` model with target date, discipline, level   |
| Progress tracking   | Links between goals, plans, and sessions               |
| Per-rider summaries | Add `riderId` to HorseSummary for rider-specific views |

---

## API Design

### REST Endpoints (Generation)

Generation uses REST (not GraphQL mutations) following the voice endpoint pattern:

**`POST /api/horse-summary`**

```
Headers: Authorization: Bearer <token>
Body: { "horseId": "<id>" }

Response (200):
{
  "content": "Luna has been ridden 8 times...",
  "generatedAt": "2026-02-17T...",
  "sessionCount": 28,
  "sessionWindowStart": "2025-12-01T...",
  "sessionWindowEnd": "2026-02-17T..."
}

Error (429): { "error": "RATE_LIMITED", "message": "...", "rateLimit": { ... } }
Error (400): { "error": "COOLDOWN_ACTIVE", "refreshAvailableAt": "2026-02-19T..." }
Error (400): { "error": "NOT_STALE", "message": "No new sessions since last generation." }
Error (400): { "error": "INSUFFICIENT_SESSIONS", "message": "At least 3 sessions required." }
```

**`POST /api/horse-analysis`**

```
Headers: Authorization: Bearer <token>
Body: { "horseId": "<id>", "focusAreas": ["FLATWORK", "COMPETITION_READINESS"] }

Response (200):
{
  "id": "<cuid>",
  "focusAreas": ["FLATWORK", "COMPETITION_READINESS"],
  "content": "Based on your recent flatwork sessions...",
  "generatedAt": "2026-02-17T..."
}

Error responses: same pattern as summary
```

Both endpoints share the existing `aiDailyLimiter` decorator from voice routes, plus per-endpoint burst limiters. Pattern follows `registerVoiceRoutes` in `packages/api/src/rest/voice.ts`.

**Why REST, not GraphQL mutation?**

- Follows established pattern from voice endpoints
- Long-running AI calls are easier to handle in REST (timeouts, streaming if needed later)
- Rate limiting is simpler at the route level
- GraphQL serves cached data where it excels -- typed, composable queries

### GraphQL Extensions (Read-Only Cached Data)

```graphql
type HorseSummary {
    content: String!
    generatedAt: DateTime!
    sessionWindowStart: DateTime!
    sessionWindowEnd: DateTime!
    sessionCount: Int!
    stale: Boolean! # computed: current session count > sessionCountAtGeneration
    refreshAvailableAt: DateTime # null if refresh available now; DateTime when cooldown expires
}

type HorseAnalysis {
    id: ID!
    focusAreas: [String!]!
    content: String!
    generatedAt: DateTime!
    stale: Boolean!
    refreshAvailableAt: DateTime
}

type Horse {
    # ... existing fields
    summary: HorseSummary # nullable -- null if never generated
    analyses: [HorseAnalysis!]! # empty array if none
    availableFocusAreas: [String!]! # computed from horse's session work types + training goals
}
```

**Computed fields (resolved in GQL layer, not stored):**

- `stale` -- True when current session count > `sessionCountAtGeneration`
- `refreshAvailableAt` -- Null if refresh is available now; otherwise the DateTime when cooldown expires

`availableFocusAreas` returns the union of:

1. Work types the horse has actually done (from sessions)
2. Static training goal options (always available)

### Rate Limiting Integration

Both endpoints share the existing `aiDailyLimiter` decorator (20/day) and create per-endpoint burst limiters (2/min). This means voice parsing, summary generation, and analysis generation all draw from the same daily AI pool.

---

## UX Design

### Page Layout

Both AI sections are inline on the horse profile page, inserted between the stats row and notes:

```
Header (horse name + back/edit)
Activity heatmap (12 weeks)
Stats row (total sessions, last ride)
──────────────────────────────────
Training Summary (NEW)
  [Summary content, collapsible]
  "Based on 28 sessions (Dec-Feb)"
  [Refresh button with cooldown]
──────────────────────────────────
What's Next (NEW)
  [Focus area chips]
  [Generate / cached analysis content]
  [Saved analyses if multiple exist]
──────────────────────────────────
Notes (collapsible)
Sessions list
FAB (Log Session)
```

**Why inline for both?**

- Riders want to see context (heatmap, stats) alongside AI content
- A bottom sheet hides the data the AI is summarizing
- Tabs fragment the page
- Inline sections with collapse/expand give the best information density for mobile

### Component States

**Summary section states:**

| State                             | Display                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| < 3 sessions                      | "Log a few sessions to get an AI training summary." (muted text) |
| No summary yet (3+ sessions)      | [Generate Summary] button                                        |
| Loading                           | Skeleton lines (4-6 lines)                                       |
| Loaded (fresh)                    | Content (collapsible), metadata. Refresh disabled.               |
| Loaded (stale, cooldown active)   | Content + "Refreshes in Xh" indicator                            |
| Loaded (stale, refresh available) | Content + active Refresh button + "N new sessions" badge         |
| Error                             | Error message + Retry button (keep stale content visible)        |
| Rate limited                      | "Daily AI limit reached." with existing content visible          |

**"What's Next" section states:**

| State                    | Display                                            |
| ------------------------ | -------------------------------------------------- |
| No focus selected        | Focus area chips, prompt to select                 |
| Focus selected, no cache | [Analyze] button                                   |
| Loading                  | Skeleton                                           |
| Loaded                   | Analysis content, focus chips shown, cooldown info |
| Multiple saved           | Tabs or accordion for each saved analysis          |
| Error                    | Error message + Retry                              |
| Rate limited             | Same as summary                                    |

### Mobile UX Considerations

- **Thumb zone:** Generate/Refresh buttons are in the natural thumb reach zone (middle of page, not header)
- **Touch targets:** All buttons and chips have minimum 44x44px touch area
- **Focus area chips:** Horizontally scrollable if they overflow, with visual scroll indicator
- **Collapse behavior:** Summary shows 4-6 lines by default with "Show more" / "Show less" toggle (same pattern as Notes section)
- **Rate limit feedback:** Inline, not a modal -- keep existing content visible
- **Cooldown timer:** Uses relative time ("Refreshes in 23h") not absolute time

### Wireframe Descriptions

**Summary section (loaded state):**

```
┌──────────────────────────────────────┐
│ Training Summary               [R]  │  <- Section header + refresh icon
│--------------------------------------│
│ You've ridden Luna 8 times in the   │
│ last 3 weeks -- mostly flatwork     │
│ with two jumping sessions. Your     │
│ recent work has focused on canter...│
│                      [Show more v]   │
│--------------------------------------│
│ Based on 14 sessions - Nov 3-Feb 12 │  <- Metadata line (muted)
└──────────────────────────────────────┘
```

**"What's Next" section (focus selection):**

```
┌──────────────────────────────────────┐
│ What's Next                          │
│--------------------------------------│
│ Select focus areas:                  │
│ [Flatwork] [Jumping] [Groundwork]   │  <- Work type chips (from sessions)
│ [Competition] [Fitness]              │  <- Training goal chips (always)
│ [Behavior] [Skill progression]       │
│--------------------------------------│
│         [  Analyze  ]                │  <- Disabled until 1+ chip selected
└──────────────────────────────────────┘
```

**"What's Next" section (loaded with analysis):**

```
┌──────────────────────────────────────┐
│ What's Next                    [R]  │
│--------------------------------------│
│ [Flatwork*] [Competition*]           │  <- Selected chips highlighted
│--------------------------------------│
│ Based on your recent flatwork,       │
│ Luna has been making progress on     │
│ lateral work. In your Feb 10         │
│ session you noted stiffness to the...│
│                      [Show more v]   │
│--------------------------------------│
│ Based on 14 sessions - Feb 12       │
│ [New Analysis]                       │  <- Start fresh with new focus
└──────────────────────────────────────┘
```

---

## Prompt Design

### Summary Prompt (Tier 1: gpt-4.1-mini)

Factual, data-driven. Observes and reports without recommending.

**File:** `packages/api/src/rest/summaryPrompts.ts`

**Content areas:**

- Training frequency and consistency (sessions per week, gaps, cadence changes)
- Work type distribution and shifts over time
- Key observations from notes (recurring themes, progress markers)
- Multi-rider insights (who rides how often, different styles)
- Competition/goal observations (if mentioned in notes)
- Temporal context (recency, spacing, trajectory)

**System prompt structure:**

```
You are a training analyst for an equestrian training log app.
Summarize the recent training history for {horseName} based on the session data below.

The sessions are provided in chronological order with explicit dates.

INSTRUCTIONS:
- Be factual and concise -- only state what the data shows
- Write in second person ("You've ridden...", "Your recent sessions...")
- Note training cadence changes ("sessions were 3 days apart, then a 2-week gap")
- Pay particular attention to the most recent sessions
- Plain text only, no markdown
- Target 150-300 words
- Do NOT give recommendations or advice (that's a separate feature)

STRUCTURE your summary as:
1. Training Overview -- frequency, consistency, rider(s) involved
2. Work Distribution -- breakdown by type, any shifts in focus
3. Key Observations -- recurring themes from notes, behavioral patterns
4. Areas of Attention -- repeated concerns worth noting

SESSIONS (chronological, oldest first):
[date | workType | duration | rider | notes excerpt]
```

### Analysis Prompt (Tier 2: gpt-5.2)

Reasoning-heavy, recommendation-oriented. Grounded in session data.

**File:** `packages/api/src/rest/analysisPrompts.ts`

**Content areas:**

- Recommendations based ONLY on rider's selected focus areas
- Specific, actionable suggestions (not generic advice)
- Grounded in the horse's actual session data (references specific sessions)
- Acknowledges the horse's trajectory (improving, plateauing, regressing)
- Dynamic to work types done (no suggesting work types the horse has never done)

**System prompt structure:**

```
You are an experienced equestrian training advisor for a training log app.
Based on {horseName}'s recent training history and the rider's selected focus areas,
provide specific, actionable training recommendations.

FOCUS AREAS selected by rider: {focusAreas}
Work types this horse has done: {workTypes}

The sessions are provided in chronological order. Pay particular attention to
the most recent sessions and how training patterns have changed over time.

INSTRUCTIONS:
- Only address the requested focus areas
- Ground ALL recommendations in the actual session data
- Reference specific sessions when relevant ("In your Feb 10 session, you noted...")
- Be specific and practical -- "work on 20m circles at sitting trot" not "do more flatwork"
- Never suggest work types the horse hasn't done
- Consider training cadence, session spacing, and recent trajectory
- Consider training periodization, variety, and recovery
- Keep recommendations actionable for the next 1-2 weeks
- Plain text only, no markdown, 200-400 words
- Write in second person

STRUCTURE your analysis as:
1. Current Pattern -- what the data shows for the selected focus areas
2. What's Going Well -- positive patterns to maintain
3. Suggested Next Steps -- 2-3 specific recommendations
4. Watch For -- things to monitor based on notes

SESSIONS (chronological, oldest first):
[date | workType | duration | rider | notes excerpt]
```

### Focus Areas

**Work types** (filtered to what the horse has actually done):

- FLATWORK, JUMPING, GROUNDWORK, IN_HAND, TRAIL

Only show work types present in the horse's session history. No suggesting jump work for a horse that has never jumped.

**Training goals** (always available):

- Competition readiness
- Fitness & conditioning
- Behavior & attitude
- Skill progression

Training goals are always shown because they represent analytical lenses that apply regardless of what work types appear in the data. A rider might want "competition readiness" analysis even if they've only logged flatwork sessions.

### Prompt Registry

Both prompts follow the existing `voicePrompts.ts` pattern with versioned variants:

```typescript
// summaryPrompts.ts
export type SummaryPromptName = 'v1';
export const SUMMARY_PROMPTS: Record<SummaryPromptName, PromptVariant> = { ... };

// analysisPrompts.ts
export type AnalysisPromptName = 'v1';
export const ANALYSIS_PROMPTS: Record<AnalysisPromptName, PromptVariant> = { ... };
```

This enables A/B testing prompt versions without code changes.

---

## Implementation Context for Agents

### Key Files to Reference

| File                                          | Why                                                      |
| --------------------------------------------- | -------------------------------------------------------- |
| `packages/api/src/rest/voice.ts`              | REST endpoint pattern: auth, rate limiting, OpenAI calls |
| `packages/api/src/rest/voicePrompts.ts`       | Prompt registry pattern with typed variants              |
| `packages/api/src/server.ts`                  | Route registration pattern                               |
| `packages/api/src/middleware/auth.ts`         | `verifyToken()`, `rateLimitKey()`                        |
| `packages/api/src/config.ts`                  | `getRateLimits()` — aiBurst: 2/min, aiDaily: 20/day      |
| `packages/api/src/graphql/resolvers.ts`       | `wrapResolver()` pattern, `Horse` type resolver          |
| `packages/web/src/pages/HorseProfile.tsx`     | Integration point for summary + analysis sections        |
| `packages/web/src/components/ui/skeleton.tsx` | Loading states                                           |
| `packages/api/scripts/voiceCost.ts`           | MODEL_PRICING map, cost estimation utilities             |

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
            where: { horseId: parent.id },
        });
        if (!summary) return null;
        const currentCount = await prisma.session.count({
            where: { horseId: parent.id },
        });
        const stale = currentCount > summary.sessionCountAtGeneration;
        const cooldownHours = getRefreshCooldownHours(
            summary.latestSessionDate
        );
        const cooldownExpires = new Date(
            summary.generatedAt.getTime() + cooldownHours * 3600000
        );
        const refreshAvailableAt =
            cooldownExpires > new Date() ? cooldownExpires : null;
        return { ...summary, stale, refreshAvailableAt };
    };
}
```

### Available Components to Reuse

| Component   | Use For                            |
| ----------- | ---------------------------------- |
| `Button`    | Generate, Refresh, Analyze buttons |
| `Skeleton`  | Loading states for AI content      |
| `Separator` | Section dividers                   |
| `Badge`     | "N new sessions" stale indicator   |
| `Card`      | Summary and analysis containers    |

---

## Implementation Phases

### Phase 1: Training Summary (Tier 1, full stack)

**Scope:** Prisma model, REST endpoint, GraphQL read, frontend component

**Files to create:**

- `packages/api/src/rest/summaryPrompts.ts`
- `packages/api/src/rest/horseSummary.ts`
- `packages/web/src/components/HorseSummarySection.tsx`
- `packages/web/src/hooks/useHorseSummary.ts`

**Files to modify:**

- `packages/api/prisma/schema.prisma` (add HorseSummary model + Horse relation)
- `packages/api/src/graphql/schema.graphql` (add HorseSummary type, Horse.summary field)
- `packages/api/src/graphql/resolvers.ts` (add Horse.summary resolver with computed fields)
- `packages/api/src/server.ts` (register summary routes)
- `packages/web/src/pages/HorseProfile.tsx` (extend query, add section between stats and notes)

**Skills:** `/schema`, `/preflight`

### Phase 2: "What's Next" Analysis (Tier 2, full stack)

**Scope:** Builds on Phase 1 patterns. Adds focus area selection, multiple cached analyses per horse, inline section with chip selector.

**Files to create:**

- `packages/api/src/rest/analysisPrompts.ts`
- `packages/api/src/rest/horseAnalysis.ts`
- `packages/web/src/components/WhatsNextSection.tsx`
- `packages/web/src/hooks/useHorseAnalysis.ts`

**Files to modify:**

- `packages/api/prisma/schema.prisma` (add HorseAnalysis model)
- `packages/api/src/graphql/schema.graphql` (add HorseAnalysis type, Horse.analyses + availableFocusAreas)
- `packages/api/src/graphql/resolvers.ts` (add resolvers)
- `packages/api/src/server.ts` (register analysis routes)
- `packages/web/src/pages/HorseProfile.tsx` (add "What's Next" section below summary)

**Skills:** `/schema`, `/preflight`

### Phase 3: Polish & Iteration

- Prompt tuning based on real outputs
- UX refinement for multiple saved analyses (tabs vs accordion vs list)
- Cost monitoring (logging token usage per generation)
- Consider analysis deletion by rider

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

### 3. Inline summary + inline analysis vs. tabs vs. drawer

**Decision:** Both summary and analysis render inline on the horse profile page

**Rationale:** Riders want to see context (heatmap, stats) alongside AI content. A bottom sheet hides the data the AI is summarizing. Tabs fragment the page. Inline sections with collapse/expand give the best information density for mobile.

**Alternatives considered:**

- **Tabs (Summary | Analysis):** Hides summary behind a tap. Summary should be visible by default.
- **Analysis in bottom sheet:** Hides the session list and stats that the analysis references. Reading a multi-paragraph analysis in a sheet that covers context loses value.

### 4. Session-count invalidation vs. TTL

**Decision:** Track `sessionsAtGeneration` and compare to current count for stale detection

**Rationale:** TTL-based invalidation regenerates even when nothing has changed. Session-count invalidation only marks as stale when there's actually new data, which is more accurate and cheaper.

**Alternative considered:** TTL (regenerate every 24h). Rejected — wastes API calls when no new sessions exist.

### 5. Cooldown based on session recency

**Decision:** Sliding cooldown (48h / 72h / 7d) based on how recently the horse was ridden

**Rationale:** Active horses (ridden within the last week) benefit from more frequent re-analysis as new data comes in. An idle horse (not ridden in 2+ weeks) has no new data to analyze, so longer cooldowns prevent wasteful regeneration.

**Alternative considered:** Fixed 48h cooldown for all. Rejected because an idle horse would show an enabled refresh button that produces an identical summary (the session-count check prevents regeneration, but the UX is confusing).

### 6. Focus areas as multi-select chips (not free text)

**Decision:** Structured multi-select from predefined options

**Rationale:** Free text is subject to prompt injection and produces unpredictable cache keys. Structured options enable deterministic caching (same focus combo = same cache key) and consistent prompts. The predefined options cover the main equestrian training axes.

### 7. No rider customization in v1

**Decision:** No preferences for summary length, tone, or detail level

**Rationale:** Ship the simplest version that works. Customization adds UX complexity (settings screens, storage) for unclear benefit. Adjust the prompts based on feedback instead.

### 8. Per-horse summary vs. per-rider-per-horse

**Decision:** One summary per horse (shared across riders)

**Rationale:** In Herdbook's model, all riders in the barn see the same horse data. A shared summary is more useful ("what has this horse been doing") than a personal one ("what have I done with this horse"). Personal analytics can come later.

---

## Future Enhancements (Not in Scope)

| Enhancement          | Description                   | Why Deferred                               |
| -------------------- | ----------------------------- | ------------------------------------------ |
| Training programs    | Multi-week structured plans   | Requires goals data model (Layer 3)        |
| Goal planning        | "Prepare for May show"        | New schema + complex UX                    |
| Progress tracking    | Compare actual vs. plan       | Depends on goals + programs                |
| Streaming responses  | Show AI text as it generates  | Adds complexity; generation is fast enough |
| Rider preferences    | Customize tone, length, focus | Validate base feature first                |
| Historical summaries | Browse past summaries         | Low value; current summary is what matters |
| Export / share       | Share summary as text/image   | Wait for user request                      |

---

## Open Questions

1. **Multiple saved analyses UX** -- Tabs, accordion, or simple list? Need to see how it feels with 2-3 saved analyses per horse before deciding.
2. **First-generation UX** -- Should the first summary auto-generate on page load (if 3+ sessions), or always require an explicit button tap? Button tap is safer for cost control but adds one extra step.
3. **Analysis deletability** -- Should riders be able to delete saved analyses they no longer want? Not critical for v1 but could be added.
4. **Prompt output format** -- Plain text vs light markdown. Plain text is simpler; markdown enables bold/headers in the UI. Decide during prompt tuning.
5. **Focus area evolution** -- Will riders want custom focus areas beyond the predefined set?
6. **Cross-horse insights** -- "You've been neglecting Luna while focusing on Beau" -- valuable but architecturally different (rider-scoped, not horse-scoped).
