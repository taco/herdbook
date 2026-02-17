# Horse Profile & Data Collection Redesign

## Context

The horse profile page today is a session list with a 12-week activity heatmap. It doesn't synthesize data or answer the three questions a trainer needs fast:

1. What's the horse doing lately? (workload, focus)
2. How's it going? (quality, soundness, recurring issues)
3. What's changing? (trends, consistency, progress)

## Strategic Decisions

### Data collection: Hybrid, not voice-only

**Current state**: Voice capture -> Whisper -> GPT extracts all 5 fields -> pre-fills manual form -> rider reviews and saves.

**Problem**: Voice is the wrong tool for categorical data. Speaking "hard ride" and hoping GPT maps it correctly is fragile and expensive when a 4-option tap is instant and reliable. Voice is great for the part humans struggle to type on phones: rich narrative about what happened.

**Decision**: Split structured vs. narrative collection:

- **Taps**: Horse, workType, duration, intensity, rating -- finite choices, fast to select
- **Voice**: Mic button on the notes field -- speak observations, GPT cleans them up
- **Full voice capture**: Stays as a "quick log" alternative, not the primary path

### Intensity: 4 levels

`LIGHT | MODERATE | HARD | VERY_HARD`

Hard schooling session != horse show or 3-hour trail ride. Very Hard events often warrant multiple days off or extra bodywork. Trainers already think in these terms.

### Structured data before AI

Build the profile page so it's useful without AI. AI summary can come later as optional context ("Trainer note" collapsible), not the core experience. Chips, charts, and trends from structured fields beat generated prose.

## Current Data Model

**Session fields today**: `date`, `durationMinutes`, `workType` (6 enum values), `notes` (free text), `riderId`, `horseId`

**What's missing for the full vision**:

| Field          | Type                 | Unlocks                                        |
| -------------- | -------------------- | ---------------------------------------------- |
| `intensity`    | Enum (4 levels)      | Workload chips, chart color, recovery tracking |
| `rating`       | Int (1-5)            | Quality trends, "how did it go"                |
| `tags`         | String[] or relation | Focus tracking, trending topics                |
| Soundness flag | Boolean or enum      | Soundness tracking                             |
| Mental state   | Enum                 | Behavioral patterns                            |

## Milestone: Issues

### Issue 1: Add `intensity` and `rating` fields to Session

- Add `intensity` (enum: LIGHT, MODERATE, HARD, VERY_HARD) and `rating` (Int, 1-5) to Prisma schema, both nullable
- Migration, GraphQL schema, resolver, codegen
- Update voice parser prompt to extract these if mentioned
- Skill: `/schema`

### Issue 2: Add intensity + rating to session form

- Intensity: 4-option tap row (L / M / H / VH) in SessionEditor
- Rating: 1-5 star/dot tap row
- Both optional -- don't block session creation
- Show on SessionDetail view
- Skill: `/new-page`, `/mobile-ux`

### Issue 3: Move voice input to notes field

- Add mic button to the notes textarea in SessionEditor
- Tap mic -> record -> Whisper transcription -> clean text inserted into notes
- Simpler than full voice flow -- no field extraction needed, just transcription + cleanup
- Keep existing VoiceSessionCapture page as alternative entry point
- Skill: `/new-page`

### Issue 4: Redesign horse profile -- at-a-glance chips + 14-day chart

- At-a-glance strip: Workload (computed from intensity or session count), Consistency (X of 7 days), Last ride
- Replace or supplement 12-week heatmap with 14-day mini-chart (bars = duration, color = intensity when available)
- Below chart: "Workdays: X/14", "Longest break: X days"
- All computed from existing data, enhanced by intensity when present
- Skill: `/new-page`, `/mobile-ux`

### Issue 5: Redesign horse profile -- work type mix + denser timeline

- Work type distribution: compact horizontal stacked bar (last 30 days)
- Denser ActivityCards: first line of notes as highlight, rider name, intensity chip
- Multi-rider chips when >1 rider in last 30 days
- Skill: `/new-page`

### Issue 6: Rating + intensity trend visualizations

- Quality trend: last 10 rides as dots/sparkline (only when data exists)
- Intensity distribution: last 14 days breakdown
- Depends on enough sessions having the new fields -- may need a "not enough data" state
- Skill: `/new-page`

## Future (not in this milestone)

- **Tags system**: Predefined + freeform tags, per-discipline defaults, tag management UI. Evaluate after intensity/rating adoption.
- **Soundness tracking**: Sensitive UX -- needs design thought. Defer.
- **Pinned themes**: Requires tags + enough data for trends. Defer.
- **AI trainer summary**: Collapsible section, no numbers the UI already shows, focus on narrative insight. Add once the page is useful without it.

## Verification (per issue)

- Schema changes: `pnpm run check`
- UI changes: Visual review on 375px mobile viewport
- Seed data with varied intensity/rating for realistic testing
