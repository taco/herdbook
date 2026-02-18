# Herdbook Product Roadmap

_February 2026_

## Guiding Principles

1. **Real users first** — Deploy early, get feedback from actual riders. Polish follows validation.
2. **Define work when it's next** — Future features stay loose. Detail comes with context.
3. **Production thinking at small scale** — Architecture that could scale, but built for 4 riders and 3 horses.
4. **AI as training companion** — Not a bolt-on demo. AI earns its place by helping riders train better.

---

## What's Built

The core loop works: **Record session (voice or manual) -> Track per horse -> View activity feed**

| Feature                                                  | Status   |
| -------------------------------------------------------- | -------- |
| Auth (login/signup, JWT, rate limiting, email allowlist) | Complete |
| Horse CRUD (create, edit, soft-delete)                   | Complete |
| Session CRUD (create, edit, delete)                      | Complete |
| Manual session entry with form persistence               | Complete |
| Voice session capture (Whisper + GPT-5.2)                | Complete |
| Field-level voice-to-text (notes)                        | Complete |
| Dashboard with recent activity feed                      | Complete |
| 12-week activity heatmaps per horse                      | Complete |
| Session detail with view/edit cascade                    | Complete |
| Mobile navigation (bottom tab bar, view transitions)     | Complete |
| Previous session context on new entry                    | Complete |
| Rider list (read-only)                                   | Complete |
| Security hardening (rate limiting, CORS, JWT expiry)     | Complete |
| E2E tests (auth, nav, horses, sessions)                  | Complete |
| Deployed to production (Railway + Neon)                  | Complete |
| N+1 resolution (DataLoader pattern)                      | Complete |
| AI horse training summaries (GPT-5-mini)                 | Complete |
| Versioned prompt registry                                | Complete |
| Unified AI rate limiting (GraphQL + REST)                | Complete |

### Differentiator

Voice-to-text session parsing is the standout feature. It solves a real problem: logging sessions at the barn with dirty or gloved hands. The AI handles fuzzy horse name matching, natural language dates ("yesterday morning"), duration parsing ("an hour and a half"), and work type inference from context.

---

## The Gap

**"I logged sessions... now what?"**

Riders can't answer basic questions:

- "How many times did I ride Luna this month?"
- "What did we work on last Tuesday?"
- "Am I riding consistently enough?"
- "What should I work on next ride?"

Data goes in but can't be meaningfully retrieved or acted on. The app is at the **retention cliff** — functional for logging, but no reason to come back and review.

---

## What's Next

The next work follows a single arc: **make logged data visible, then meaningful, then actionable.** Each layer makes the next one more valuable. AI features weave into data visibility work rather than living as a separate phase.

### Layer 1: Make the data visible

Horse profiles, session filtering, calendar view. Riders need to browse and find their data. This is the foundation everything else builds on.

- **Horse profile page redesign** — At-a-glance chips, intensity/rating fields, 14-day chart, work type mix. See [design-horse-profile-redesign.md](design-horse-profile-redesign.md).
- **Session filtering** — Filter by horse, date range, work type. Dashboard becomes write-only at 50+ sessions without this.
- **Calendar view** — Equestrians think in weeks. Show which days had sessions, for which horses. Helps riders see gaps and plan.
- **Data ownership** — Any rider can currently edit any session. Fix before more users are active.

No schema changes needed. New queries and frontend pages.

### Layer 2: Make the data meaningful

Stats, trends, and AI summaries. The app starts telling riders something they didn't already know.

- **Training stats** — Sessions per week trend, hours this month vs last, work type distribution, streak tracking.
- **~~AI session summaries~~** — Shipped. Horse profile shows AI-generated training summaries with workload signals, focus areas, and narrative insight.
- **Pagination** — API supports it, UI only shows last 20. Add infinite scroll or load-more.

### Layer 3: Make the data actionable — AI as training guide

This is where Herdbook becomes a training companion. AI features progress naturally:

**Next-ride suggestions** — _"It's been 5 days since Luna's last jump school. Based on your recent sessions, consider working on her right-lead canter before your next jumping day."_ Shows up when starting a new session or on the horse profile. Needs session history + equestrian training knowledge the LLM already has.

**Training program structure** — _"For Luna, I'd suggest 4 rides per week: 2 flatwork focusing on suppleness, 1 jumping, 1 trail or light hack for mental break."_ The AI moves from reactive to proactive, incorporating training principles like periodization, variety, and recovery.

**Goal-oriented planning** — _"You want to take Beau to the May 15th show, jumpers division. That's 4 weeks out. He hasn't done a full course at 3' in three weeks. Here's a plan that builds back to competition readiness..."_ Requires a new `goals` concept in the data model (horse, target date, description, discipline/level). AI works backward from the goal and accounts for current training state.

**Progress tracking** — After each logged session, compare actual vs plan. _"You're behind on jumping this week"_ or _"On track — good flatwork session today."_ Hooks into session creation flow.

### Later: Quality of life & growth

Driven by real user friction, not pre-planned. Some possibilities:

| Feature                            | Trigger                                  |
| ---------------------------------- | ---------------------------------------- |
| Google SSO                         | If password login becomes annoying       |
| Rider invitations                  | If adding barn members is needed         |
| Media attachments                  | If riders want photos/videos per session |
| Data export (CSV)                  | If users ask for it                      |
| Error telemetry (Sentry)           | If production debugging becomes painful  |
| Observability (structured logging) | Before scaling beyond current users      |

---

## Deprioritized (Intentionally)

- **Desktop support** — Mobile-at-the-barn is the right context
- **Offline mode** — Hard to build, most barns have cell service
- **Multi-agent orchestration** — Engineering showcase without product value at this scale
- **Agent infrastructure as a standalone milestone** — Build infra when a specific feature needs it, not ahead of time

---

## Data Model Outlook

| Layer                     | Schema changes                                                   |
| ------------------------- | ---------------------------------------------------------------- |
| 1 (data visibility)       | None — existing queries with new filters                         |
| 2 (stats + summaries)     | `summaryContent`, `summaryGeneratedAt` on Horse                  |
| 3 (suggestions, programs) | Possibly `training_plans` table to persist generated plans       |
| 3 (goal planning)         | `goals` table: horse, target date, description, discipline/level |
| 3 (progress tracking)     | Links between goals, plans, and sessions                         |

---

## Resolved Questions

1. **Multi-tenancy**: Single barn, no tenant isolation. All authenticated riders see all data (shared context is the point).
2. **Public signup**: Disabled. Accounts are seeded. Revisit if adding Google SSO with whitelist.
3. **JWT expiry**: 30 days. No refresh token needed at this scale.
4. **AI approach**: Product-first, not engineering-showcase. Build the simplest thing that works at each step. Upgrade to structured tool use / agent patterns only when prompts get too complex for a single call.

## Open Questions

1. **AI cost management** — Probably irrelevant for 4 users, but worth monitoring once summaries and suggestions are live.
2. **Plan persistence** — Should generated training plans be stored and versioned, or regenerated on demand?
3. **Goal UX** — Standalone goal entry form, or conversational ("tell the AI what you're training for")?
