# Herdbook Roadmap

## Guiding Principles

1. **Production thinking at small scale** — Make architecture decisions that would scale, but don't over-engineer for theoretical load. 4 riders, 3 horses.
2. **E2E testing as a first-class concern** — Tests should be easy to write and run, covering critical user paths.
3. **Demonstrable** — The end goal is a publicly accessible app that showcases full-stack depth for Principal/Staff IC interviews.
4. **Real users first** — Deploy early to get feedback from actual riders. Polish comes after validation.

---

## Phase 1: Core Functionality ✓

**Goal**: Herdbook can do its job — riders can sign up, log sessions, and see what others have done.

**Status**: Complete

### 1.1 Signup UX ✓

- [x] Build signup form mirroring Login structure
- [x] Wire to existing `signup` mutation
- [x] Auto-login on success (store token, redirect to dashboard)
- [x] Handle errors (duplicate email, validation)

### 1.2 Log Session Form ✓

- [x] New route: `/sessions/new`
- [x] Horse picker dropdown (fetch from `horses` query)
- [x] Display `lastSessionForHorse` context when horse selected
- [x] Form fields: date, duration, work type, notes
- [x] Submit via `createSession` mutation
- [x] Success: redirect to dashboard, session appears in feed

### 1.3 N+1 Query Resolution ✓

- [x] DataLoader pattern for Horse and Rider
- [x] Batch loading in GraphQL context
- [x] Verified: 3 queries instead of 41 for 20 sessions

**Interview angle**: "Tell me about a performance issue you identified and fixed."

### 1.4 JWT Secret Hardening ✓

- [x] Fail fast if `JWT_SECRET` not set in production
- [x] Documented required env vars

---

## Phase 2: Deploy to Production

**Goal**: Get Herdbook live so real riders can use it. Minimal security hardening, seeded accounts, no public signup.

### 2.1 E2E Testing Foundation ✓

**Status**: Complete

- [x] Playwright setup in monorepo (`packages/e2e`)
- [x] Test database seeding strategy (Docker container per run)
- [x] Critical path tests: login, log session, view session in feed
- [x] CI integration (GitHub Actions workflow)

**Reference**: See `docs/design-e2e-testing.md` for architecture decisions.

---

### 2.2 Security Hardening

**Status**: Not started  
**Effort**: Small (1-2 hours)

- [x] Rate limiting on auth mutations (prevent brute force)
- [x] CORS locked to production domain (not `origin: true`)
- [x] JWT expiry → 30 days in production
- [x] Disable or remove public signup endpoint

**Done when**: Auth is rate-limited, CORS is environment-aware, tokens last 30 days.

---

### 2.3 Database Setup (Neon) ✓

**Status**: Complete
**Platform**: Neon Serverless Postgres

- [x] Connect local environment to Neon dev database
- [x] Run `pnpm prisma:migrate:deploy` against Neon dev
- [x] Verify schema matches local (tables: Horse, Rider, Session)
- [x] Test API locally with Neon dev database

**Done when**: Local API connects to Neon dev and all queries work.

---

### 2.4 Deploy API (Railway)

**Status**: Not started
**Platform**: Railway (connected to GitHub)

Environment variables to set in Railway:

- `DATABASE_URL` — Neon dev connection string (secret)
- `JWT_SECRET` — Generate new 32+ char random string (secret)
- `ALLOWED_EMAILS` — Comma-separated whitelist
- `CORS_ALLOWED_ORIGINS` — Railway web app URL (set after 2.5)
- `NODE_ENV` — `production`

Steps:

- [ ] Add `pnpm start` command to run product version of `packages/api`
- [ ] Create Railway service for API (from `packages/api`)
- [ ] Set environment variables in Railway dashboard
- [ ] Deploy and verify health endpoint responds
- [ ] Note the Railway API URL for web config

**Done when**: API is live at Railway URL, responds to GraphQL queries.

---

### 2.5 Deploy Web (Railway)

**Status**: Not started
**Platform**: Railway (connected to GitHub)

Environment variables to set in Railway:

- `VITE_API_URL` — Railway API URL from 2.4

Steps:

- [ ] Add `pnpm start` command to run product version of `packages/web`
- [ ] Create Railway service for Web (from `packages/web`)
- [ ] Set `VITE_API_URL` to API's Railway URL
- [ ] Deploy and verify app loads
- [ ] Update API's `CORS_ALLOWED_ORIGINS` with Web URL

**Done when**: Web app loads, can reach API, login form appears.

---

### 2.6 Seed Production Data

**Status**: Not started

- [ ] Create seed script for production (or use Prisma Studio against Neon)
- [ ] Seed 4 rider accounts with known passwords
- [ ] Seed 3 horses
- [ ] Verify login works end-to-end

**Done when**: All riders can log in and see the horses.

---

### 2.7 Production Cutover (Later)

**Status**: Not started

When ready to go live with real users:

- [ ] Update Railway API's `DATABASE_URL` to Neon production database
- [ ] Run migrations against Neon production
- [ ] Re-seed production data
- [ ] Custom domain setup (optional)

**Done when**: App runs against production database with real users.

---

## Phase 3: AI Integration

**Goal**: Demonstrate agentic AI patterns — not just "call LLM, return response" but true agent loops with planning, tool use, and iteration.

**Reference**: See `agent-design.md` for detailed architecture.

### 3.1 Foundation: Agent Infrastructure

**Effort**: Medium-Large (4-6 hours)

- [ ] Anthropic SDK setup in API package
- [ ] Agent execution harness (the ReAct loop runner)
- [ ] Tool registry pattern (define tools, bind to agent)
- [ ] WebSocket support for streaming agent progress to client
- [ ] Basic timeout and error handling

**Done when**: You can invoke an agent from an API endpoint and watch it think/act/observe.

---

### 3.2 Level 1: Training Plan Generator

**Effort**: Large (6-8 hours)

**User story**: "I want to get Beau ready for the May 15th show. What should my training plan look like?"

- [ ] Tools: `queryRecentSessions`, `getHorseProfile`, `getCurrentDate`
- [ ] Agent gathers context, reasons about gaps, produces structured plan
- [ ] Endpoint: `POST /api/agent/plan`
- [ ] Minimal UI to trigger and display plan
- [ ] Structured output schema for `TrainingPlan`

**Done when**: User can request a plan, watch the agent work, see a structured result.

---

### 3.3 Level 2: Interactive Refinement

**Effort**: Medium (3-4 hours)

**User story**: "That plan is too aggressive — adjust for his sore foot."

- [ ] Multi-turn conversation state
- [ ] `revisePlan` tool
- [ ] Agent interprets feedback, modifies plan
- [ ] Conversation persists across WebSocket session

**Done when**: User can have a back-and-forth with the agent to refine a plan.

---

### 3.4 Level 3: Plan Execution Assistant (Stretch)

**Effort**: Large (6-8 hours)

**User story**: "I just logged a session. Am I on track with the plan?"

- [ ] Stored plans in database (`training_plans` table)
- [ ] Event hook: after `createSession`, check for active plan
- [ ] Agent evaluates actual vs. planned
- [ ] Proactive notification: "You're behind on jumping this week"

**Done when**: System proactively tells riders if they're on/off track.

---

### 3.5 Level 4: Multi-Agent Coordination (Stretch)

**Effort**: Very Large (8-12 hours)

**User story**: "Weekly report on all horses' training progress"

- [ ] Orchestrator pattern
- [ ] Specialized agents: Data, Analysis, Report
- [ ] Parallel execution
- [ ] Tracing and observability across agents

**Done when**: Can generate a multi-horse report with visible agent coordination.

---

## Phase 4: Polish & Scale

**Goal**: Production hardening after core features are validated with real users.

### 4.1 Google SSO

**Effort**: Medium (3-4 hours)

- [ ] Google OAuth integration
- [ ] Email whitelist for authorized riders
- [ ] Migration path for seeded password accounts

**Why deferred**: Password auth works. SSO is a UX improvement, not a blocker.

---

### 4.2 Observability

**Effort**: Medium (2-3 hours)

- [ ] Structured logging (pino) replacing console.log
- [ ] Request ID generation and propagation
- [ ] GraphQL operation logging (query name, duration, errors)

**Why deferred**: Console.log is sufficient for 4 users. Add when debugging becomes painful or before scaling.

---

### 4.3 Operational Readiness

- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring
- [ ] Alerting for critical errors
- [ ] Database connection pooling (if needed)

---

### 4.4 Future Considerations

These are noted but not planned:

- **Token refresh**: Currently 30-day expiry. Add refresh tokens if users complain about re-logging.
- **httpOnly cookies**: Would mitigate XSS. localStorage is acceptable for this trust level.
- **Multi-tenancy**: Not needed for single barn. Revisit if expanding to other barns.
- **Offline support**: PWA/service worker exists but untested. Low priority.
- **Demo mode**: Read-only demo account for interviews. Add when deploying publicly.

---

## Sequencing Rationale

**Phase 1 first** because the app can't fulfill its purpose without signup and session logging.

**Phase 2 (deploy) before AI** because real users provide feedback and motivation. You'll find bugs faster with actual usage than local testing.

**Phase 3 (AI) next** because it's the most interesting interview material and benefits from production data.

**Phase 4 (polish) last** because observability, SSO, and operational tooling are improvements, not blockers. Add them when the pain justifies the effort.

---

## Resolved Questions

1. **Multi-tenancy**: Single barn, no tenant isolation needed. All authenticated riders see all data (this is intentional — shared context is the point).

2. **Public signup**: Disabled. Accounts are seeded directly. Revisit if adding Google SSO with whitelist.

3. **JWT expiry**: 30 days in production. No refresh token needed at this scale.

---

## Open Questions

1. **Notifications**: Phase 3.4 mentions proactive notifications. Push notifications? Email? In-app only?

2. **Mobile PWA**: Configured but not tested. Worth validating the install experience?

3. **LLM costs**: At what usage level does cost management matter? Probably not for 4 users, but worth monitoring.
