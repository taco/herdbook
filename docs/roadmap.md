# Herdbook Roadmap

## Guiding Principles

1. **Production thinking at small scale** — Make architecture decisions that would scale, but don't over-engineer for theoretical load. 4 riders, 3 horses.
2. **E2E testing as a first-class concern** — Tests should be easy to write and run, covering critical user paths.
3. **Demonstrable** — The end goal is a publicly accessible app that showcases full-stack depth for Principal/Staff IC interviews.

---

## Phase 1: Core Functionality

**Goal**: Herdbook can do its job — riders can sign up, log sessions, and see what others have done.

### 1.1 Signup UX

**Status**: API ready, web is stub  
**Effort**: Small (1-2 hours)

- [x] Build signup form mirroring Login structure
- [x] Wire to existing `signup` mutation
- [x] Auto-login on success (store token, redirect to dashboard)
- [x] Handle errors (duplicate email, validation)

**Done when**: A new user can create an account and land on the dashboard.

---

### 1.2 Log Session Form

**Status**: Button exists, no behavior  
**Effort**: Medium (3-4 hours)

- [x] New route: `/sessions/new`
- [x] Horse picker dropdown (fetch from `horses` query)
- [x] Display `lastSessionForHorse` context when horse selected
    - This is the core handoff value — "here's what happened last time"
- [x] Form fields: date (default today), duration, work type, notes
- [x] Submit via `createSession` mutation
- [x] Success: redirect to dashboard, session appears in feed
- [x] Error handling: display validation/server errors

**Done when**: A rider can log a session and see it appear in Recent Activity.

---

### 1.3 N+1 Query Resolution

**Status**: Known issue, not yet addressed  
**Effort**: Medium (2-3 hours)

**Problem**: Session resolvers for `horse` and `rider` do per-row DB lookups. At 100 sessions, that's 200 extra queries.

**Solution**: Introduce DataLoader pattern.

- [x] Add `dataloader` package to API
- [x] Create loaders for Horse and Rider (batch by ID)
- [x] Inject loaders into GraphQL context per-request
- [x] Update session field resolvers to use loaders
- [ ] Add basic API tests to verify batching behavior

**Done when**: Fetching 20 sessions with horse/rider data uses 3 queries (sessions + batch horses + batch riders), not 41.

**Interview angle**: Classic "tell me about a performance issue you identified and fixed" story.

---

### 1.4 JWT Secret Hardening

**Status**: Defaults to insecure value  
**Effort**: Small (30 min)

- [ ] Remove default value from config
- [ ] Fail fast on startup if `JWT_SECRET` not set in production
- [ ] Document required env vars in README
- [ ] Consider: token expiry strategy (currently 1h, no refresh)

**Done when**: API refuses to start without proper secret configured.

---

## Phase 2: Production Foundations

**Goal**: Infrastructure and practices that demonstrate production-grade thinking.

### 2.1 E2E Testing Foundation

**Status**: Complete  
**Effort**: Medium (3-4 hours)

**Tool**: Playwright (good ecosystem, runs in CI, supports mobile viewports)

- [x] Playwright setup in monorepo (`packages/e2e`)
- [x] Test database seeding strategy (Docker container per run)
- [x] Critical path tests: login, log session, view session in feed
- [x] CI integration (GitHub Actions workflow)
- [x] Document: how to run tests locally (see README)

**Done when**: PRs run E2E tests automatically; one failing test blocks merge.

**Interview angle**: "How do you approach testing?" — concrete answer with tradeoffs.

**Reference**: See `docs/design-e2e-testing.md` for architecture decisions.

---

### 2.2 Observability

**Effort**: Medium (2-3 hours)

**Why now**: Essential for debugging AI agent behavior in Phase 3.

- [ ] Structured logging (pino or similar) replacing console.log
- [ ] Request ID generation and propagation
- [ ] GraphQL operation logging (query name, duration, errors)
- [ ] Consider: where logs go (stdout for now, discuss aggregation later)

**Done when**: Every request has a traceable ID; you can see what happened from log output.

---

### 2.3 Security & Rate Limiting

**Effort**: Medium (2-3 hours)

- [ ] Rate limiting on `/graphql` for auth mutations (prevent brute force)
- [ ] CORS configuration for production (not `origin: true`)
- [ ] Evaluate: token refresh vs. longer expiry vs. sliding window
- [ ] Evaluate: move token from localStorage to httpOnly cookie (XSS mitigation)

**Done when**: Auth endpoints are rate-limited; CORS is environment-aware.

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

## Phase 4: Public Deployment

**Goal**: Herdbook is live on the internet, usable by real people, demonstrable in interviews.

### 4.1 Hosting & Infrastructure

- [ ] Choose hosting (Fly.io, Railway, or similar)
- [ ] Database hosting (managed Postgres)
- [ ] Environment configuration (secrets, env vars)
- [ ] Domain and HTTPS

### 4.2 Security Hardening

- [ ] Security review of all endpoints
- [ ] Input validation audit
- [ ] Dependency vulnerability scan
- [ ] Consider: WAF, DDoS protection

### 4.3 Operational Readiness

- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring
- [ ] Log aggregation
- [ ] Alerting for critical errors

### 4.4 User Management

- [ ] Terms of service, privacy policy
- [ ] Account deletion capability
- [ ] Data export

### 4.5 Cost Management

- [ ] LLM usage monitoring and budgets
- [ ] Database connection pooling
- [ ] Caching strategy if needed

**Done when**: You can share a URL in an interview and say "here's something I built and operate."

---

## Sequencing Rationale

**Phase 1 first** because the app can't fulfill its purpose without signup and session logging. N+1 and JWT are good "while we're in the code" fixes.

**Phase 2 before AI** because observability is essential for debugging agent behavior. E2E tests give confidence when refactoring. Security foundations are easier to add before complexity grows.

**Phase 3 before deployment** because AI features are the most interesting interview material, and you want to iterate on them locally before dealing with production concerns.

**Phase 4 last** because public deployment has a long tail of requirements (legal, operational, security) that shouldn't block learning and building.

---

## Open Questions

1. **Multi-tenancy**: Currently any authed rider sees all data. Is this intentional (small trusted barn) or should we add tenant isolation?

2. **Mobile app**: PWA is configured but not tested. Is a native-like mobile experience a goal?

3. **Offline support**: Service worker is set up. Should session logging work offline and sync later?

4. **Notifications**: Phase 3.4 mentions proactive notifications. Push notifications? Email? In-app only?
