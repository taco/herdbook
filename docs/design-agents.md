# Herdbook Agent Architecture Design Doc

## Overview

Herdbook tracks horse training sessions for a small barn (4 riders, 3 horses). The core value is handoff context — knowing what others have done with a horse before you work with them.

This document proposes an agent architecture to address gaps in the current system and serve as a vehicle for learning agent patterns relevant to Principal/Staff IC interviews.

---

## Problem Space

### Problem 1: Context Synthesis is Manual

**Current state**: Before working with a horse, a rider opens Herdbook and scrolls through recent sessions. They mentally synthesize: "Okay, Emma did flatwork Tuesday, noted he was stiff to the right. Jake jumped him Thursday, said he was rushing."

**Pain point**: This synthesis takes time and cognitive effort. Riders may miss relevant details buried in notes. There's no summary view — just raw session logs.

**Why this matters**: The whole point of Herdbook is handoff context. If riders skip the review (because it's tedious), the app fails its core mission.

### Problem 2: No Training Continuity Across Riders

**Current state**: Each rider logs what they did. There's no shared plan for where the horse's training should go.

**Pain point**: Rider A works on canter transitions. Rider B, not knowing this, does a trail ride. Rider C goes back to canter work. Progress is inefficient because there's no coordination.

**Why this matters**: For horses preparing for a show or working through an issue, scattered training delays progress. Riders want to contribute to a shared goal, but there's no mechanism for it.

### Problem 3: No Progress Visibility

**Current state**: Session logs exist, but there's no view of "how is this horse progressing over time?"

**Pain point**: A rider might feel like their horse isn't improving, but can't see that actually, jump heights have increased steadily over 6 weeks. Or conversely, they might not notice a regression pattern.

**Why this matters**: Training is a long game. Without visibility into trends, riders can't make informed decisions about what to focus on next.

### Problem 4: Planning is Ad-Hoc

**Current state**: Riders decide what to do based on gut feel and whatever they remember from recent sessions.

**Pain point**: No structured approach to preparing for a goal (show, clinic, addressing a behavioral issue). Planning happens in riders' heads, not in the system.

**Why this matters**: Effective training requires progressive overload, variety, and strategic sequencing. Ad-hoc decisions often miss this.

---

## Why Agents Address These Problems

| Problem | Simple LLM Solution | Why Agent is Better |
|---------|---------------------|---------------------|
| Context synthesis | Summarize last 5 sessions | Works, but limited. Single inference, no iteration. |
| Training continuity | — | Requires understanding goals, comparing to actuals, suggesting adjustments. Multi-step reasoning. |
| Progress visibility | Generate a report | Could work for simple cases. Agent can dig deeper if initial analysis is inconclusive. |
| Planning | Generate a plan | Needs to gather context first, reason about gaps, handle constraints. Classic agent loop. |

The key insight: **synthesis and summarization can be single LLM calls, but planning and evaluation require gathering information, reasoning about it, and potentially iterating.** That's the agent pattern.

---

## Secondary Goal: Interview Preparation

This project serves dual purposes:
1. Make Herdbook genuinely more useful
2. Build hands-on experience with agent architecture patterns

For Principal/Staff IC interviews, demonstrating agent expertise means:
- Understanding when agents are appropriate vs. overkill
- Articulating the ReAct loop and why it works
- Discussing tool design, orchestration, failure modes
- Having opinions on testing, observability, cost management

Building a real (if small-scale) agent system provides concrete examples to draw from.

---

### Why Agents (vs. Simple LLM Calls)
A simple LLM call can summarize sessions. But training planning requires:
- Gathering information from multiple sources
- Reasoning about what's missing
- Proposing actions based on constraints (time, horse fitness, goals)
- Potentially iterating based on feedback or new information

This is the agent pattern: goal → plan → act → observe → adapt.

### Design Goals
1. Learn agent architecture patterns applicable to Principal/Staff IC interviews
2. Build something genuinely useful for Herdbook
3. Progress incrementally — each level builds on the last
4. Keep scope realistic for a learning project

### Infrastructure Decisions (Already Made)
- **Server-side orchestration**: Agent logic runs on the API server, not in the client
- **WebSocket communication**: Long-running operations stream progress to client
- **Stateless agents**: Agent processes are short-lived; state persists in Postgres

---

## Level 1: Single-Shot Plan Generator

### User Story
> "I want to get Beau ready for the May 15th show. He needs to be solid at 2'6" courses. What should my training plan look like?"

### What the Agent Does
1. Accepts a goal (show date, requirements)
2. Gathers context (recent sessions, horse profile, known issues)
3. Reasons about gaps (what's missing, what needs work)
4. Produces a structured training plan

### Agent Loop (ReAct Pattern)
```
THOUGHT: I need to understand Beau's current training state
ACTION: queryRecentSessions(horseId: "beau-123", days: 30)
OBSERVATION: [5 sessions returned - all flatwork, last jump session 3 weeks ago]

THOUGHT: Beau hasn't jumped recently. I should check his profile for any notes
ACTION: getHorseProfile(horseId: "beau-123")
OBSERVATION: { notes: "Tends to rush fences when fresh. Benefits from flatwork before jumping." }

THOUGHT: I have enough context. 6 weeks until show. He needs progressive jumping work but should stay sharp on flat. I'll create a plan.
ACTION: respond({ plan: [...] })
```

### Tools
| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `queryRecentSessions` | horseId, days | Session[] | Understand recent work |
| `getHorseProfile` | horseId | Horse | Get horse notes, known issues |
| `getCurrentDate` | none | Date | Calculate time until goal |

### Output Schema
```typescript
interface TrainingPlan {
  goal: string;
  targetDate: string;
  weeklyPlans: WeekPlan[];
  reasoning: string;  // Why this plan makes sense
}

interface WeekPlan {
  weekNumber: number;
  startDate: string;
  sessions: PlannedSession[];
  focus: string;  // "Build jumping confidence" etc.
}

interface PlannedSession {
  dayOfWeek: string;
  workType: WorkType;
  durationMinutes: number;
  focus: string;
  notes: string;
}
```

### Technical Implementation
- Single POST endpoint: `POST /api/agent/plan`
- Request: `{ horseId, goalDescription, targetDate }`
- WebSocket for progress: streams THOUGHT/ACTION/OBSERVATION as they happen
- Response: `TrainingPlan` object

### What You Learn
- ReAct loop mechanics (Reason → Act → Observe)
- Tool definition and binding (how LLM decides which tool to call)
- Structured output (constraining LLM to produce valid schema)
- Orchestration loop (who drives the cycle — your code, not the LLM)

### Termination Conditions
- Agent has gathered enough context and produced a plan (success)
- Max iterations reached (failure/timeout)
- Tool call fails repeatedly (failure)

---

## Level 2: Interactive Refinement

### User Story
> "That plan looks too aggressive — Beau was off for a week with a sore foot. Can you adjust?"

### What Changes from Level 1
The agent now operates in a **conversational loop**:
1. Generate initial plan (Level 1)
2. User provides feedback
3. Agent revises plan based on feedback
4. Repeat until user approves

### New Capabilities
- **Multi-turn context**: Agent remembers the plan it created and prior feedback
- **Feedback interpretation**: Understand what the user wants changed
- **Selective re-query**: If feedback reveals new info ("he was lame"), agent may need to query again

### Agent Loop Extension
```
[... Level 1 produces initial plan ...]

USER: "That's too much jumping in week 1, he hasn't jumped in 3 weeks"

THOUGHT: User is concerned about jumping frequency. Given his 3-week break, I should ease into jumping more gradually.
ACTION: revisePlan({ adjustment: "Reduce week 1 jumping from 2 sessions to 1, add a groundwork/poles session instead" })
OBSERVATION: [revised plan]

THOUGHT: I'll present the revised plan and ask if this addresses their concern.
ACTION: respond({ plan: revisedPlan, changesSummary: "..." })
```

### New Tools
| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `revisePlan` | currentPlan, adjustment | TrainingPlan | Modify existing plan |

### State Management
```typescript
interface ConversationState {
  sessionId: string;
  horseId: string;
  currentPlan: TrainingPlan | null;
  conversationHistory: Message[];
  queryCache: {  // Avoid re-querying unchanged data
    recentSessions?: Session[];
    horseProfile?: Horse;
  };
}
```

### Technical Implementation
- WebSocket session persists across turns
- Conversation state held in memory for session duration
- Could optionally persist to DB if user leaves and returns

### What You Learn
- Context window management (what to include, what to summarize)
- Conversation state (tracking what's been said/done)
- Incremental refinement (agent modifying its own outputs)
- User intent interpretation (what does "too aggressive" mean?)

### Termination Conditions
- User explicitly approves plan
- User abandons (WebSocket closes)
- Max turns reached (prevent infinite loops)

---

## Level 3: Plan Execution Assistant

### User Story
> "I just logged a session with Beau. Am I on track with the plan?"

### What Changes from Level 2
The agent is now **event-driven**, not user-initiated:
1. User logs a session (normal Herdbook flow)
2. System detects: this horse has an active plan
3. Agent evaluates: does this session align with the plan?
4. Agent responds: "On track" / "Falling behind" / "Ahead of schedule"

### New Capabilities
- **Stored plans**: Plans persist in database, not just session memory
- **Event triggers**: Agent invoked by system events, not just user requests
- **Comparison logic**: Evaluate actual vs. planned

### Agent Loop
```
EVENT: Session logged { horseId: "beau-123", workType: FLATWORK, duration: 45 }

THOUGHT: A session was logged. I need to check if there's an active plan for this horse.
ACTION: getActivePlan(horseId: "beau-123")
OBSERVATION: { plan: TrainingPlan, startDate: "2025-04-01" }

THOUGHT: There's a plan. I need to see what's been done since it started.
ACTION: getSessionsSince(horseId: "beau-123", since: "2025-04-01")
OBSERVATION: [3 sessions: FLATWORK, FLATWORK, FLATWORK]

THOUGHT: Plan called for 2 flatwork and 1 jumping in week 1. We're at 3 flatwork, 0 jumping. User is behind on jumping.
ACTION: respond({
  status: "BEHIND",
  message: "You're behind on jumping — the plan called for 1 jump session this week.",
  suggestion: "Consider a gymnastics session in the next 2 days."
})
```

### New Tools
| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `getActivePlan` | horseId | TrainingPlan? | Fetch stored plan |
| `getSessionsSince` | horseId, since | Session[] | Get sessions in plan period |
| `compareToPlan` | plan, actualSessions | Comparison | Structured diff |

### Data Model Extension
```typescript
// New table: training_plans
interface StoredPlan {
  id: string;
  horseId: string;
  riderId: string;  // Who created it
  plan: TrainingPlan;  // JSON blob
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  startDate: Date;
  targetDate: Date;
  createdAt: Date;
}
```

### Technical Implementation
- Plan storage: new Prisma model, new GraphQL types
- Event hook: after `createSession` mutation, check for active plan
- Agent runs async: doesn't block session creation
- Notification: could be in-app, push, or just shown next time user opens app

### What You Learn
- Event-driven agent invocation
- Persistent state across agent runs
- Evaluation/comparison reasoning
- Proactive vs. reactive agent behavior

### Termination Conditions
- Evaluation complete, response sent
- No active plan exists (no-op)
- Plan target date passed (maybe trigger "plan complete" summary)

---

## Level 4: Multi-Agent Coordination

### User Story
> "Give me a weekly report on all horses' training progress"

### What Changes from Level 3
Multiple specialized agents collaborate:
1. **Data Agent**: Gathers raw session data for all horses
2. **Analysis Agent**: Evaluates each horse's progress against goals
3. **Report Agent**: Synthesizes into human-readable summary

### Why Multi-Agent?
- **Separation of concerns**: Each agent has focused expertise
- **Reusability**: Data Agent used by both Analysis and Report
- **Testability**: Each agent can be tested independently
- **Parallelism**: Data gathering for multiple horses can happen concurrently

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                         │
│  (Decides which agent to invoke, manages handoffs)      │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌────────┐
│  Data  │  │ Analysis │  │ Report │
│ Agent  │  │  Agent   │  │ Agent  │
└────────┘  └──────────┘  └────────┘
    │             │             │
    └─────────────┴─────────────┘
                  │
           Shared State
         (Context Object)
```

### Agent Definitions

**Data Agent**
- Tools: `queryRecentSessions`, `getHorseProfile`, `getActivePlan`
- Responsibility: Fetch and structure raw data
- Output: `HorseContext` objects for each horse

**Analysis Agent**
- Tools: `compareToPlan`, `identifyPatterns`, `assessProgress`
- Responsibility: Interpret data, identify insights
- Input: `HorseContext` from Data Agent
- Output: `HorseAnalysis` with status, concerns, highlights

**Report Agent**
- Tools: None (pure generation)
- Responsibility: Synthesize analyses into readable report
- Input: `HorseAnalysis[]` from Analysis Agent
- Output: Formatted report (markdown, structured JSON, etc.)

### Orchestration Flow
```typescript
async function generateWeeklyReport(barnId: string): Promise<Report> {
  const orchestrator = new AgentOrchestrator();

  // Step 1: Gather data (can parallelize)
  const horses = await db.horse.findMany({ where: { barnId } });
  const contexts = await Promise.all(
    horses.map(h => orchestrator.invoke('data-agent', { horseId: h.id }))
  );

  // Step 2: Analyze each (can parallelize)
  const analyses = await Promise.all(
    contexts.map(ctx => orchestrator.invoke('analysis-agent', { context: ctx }))
  );

  // Step 3: Generate report
  const report = await orchestrator.invoke('report-agent', { analyses });

  return report;
}
```

### Shared State / Context Object
```typescript
interface OrchestratorContext {
  requestId: string;
  startedAt: Date;
  horses: Map<string, HorseContext>;
  analyses: Map<string, HorseAnalysis>;
  agentLogs: AgentLog[];  // Full trace of all agent actions
}
```

### What You Learn
- Agent specialization and boundaries
- Orchestration patterns (sequential, parallel, conditional)
- Inter-agent communication (shared context vs. direct handoff)
- Error handling across agents (what if one fails?)
- Tracing and observability in multi-agent systems

### Termination Conditions
- All agents complete successfully → return report
- Any agent fails → decide: retry, skip, or abort
- Timeout on overall operation

---

## Implementation Phases

### Phase 1: Foundation (Before Level 1)
- [ ] Set up Anthropic SDK in API package
- [ ] Create agent execution harness (the loop runner)
- [ ] Implement tool registry pattern
- [ ] Add WebSocket support for progress streaming
- [ ] Basic error handling and timeouts

### Phase 2: Level 1
- [ ] Define tools: `queryRecentSessions`, `getHorseProfile`, `getCurrentDate`
- [ ] Implement ReAct loop
- [ ] Create `POST /api/agent/plan` endpoint
- [ ] Wire up WebSocket progress updates
- [ ] Build minimal UI to trigger and display plan

### Phase 3: Level 2
- [ ] Add conversation state management
- [ ] Implement `revisePlan` tool
- [ ] Handle multi-turn WebSocket sessions
- [ ] Add conversation history to context

### Phase 4: Level 3
- [ ] Add `training_plans` table and Prisma model
- [ ] Implement plan CRUD in GraphQL
- [ ] Add event hook on session creation
- [ ] Build evaluation agent
- [ ] Notification/display of evaluation results

### Phase 5: Level 4
- [ ] Design orchestrator abstraction
- [ ] Implement specialized agents
- [ ] Add parallel execution support
- [ ] Build tracing/logging infrastructure
- [ ] Create report UI

---

## Open Questions

1. **LLM Selection**: Claude Sonnet for speed vs. Opus for complex reasoning? Could vary by level.

2. **Cost Management**: Each tool call = LLM inference. At what point does this matter? Probably not for 4 users.

3. **Testing**: How do you test agent behavior? Mocked tools? Recorded sessions? This is a real gap in the ecosystem.

4. **Failure Modes**: What does graceful degradation look like? "I couldn't create a plan, here's what I found..." vs. hard failure.

5. **User Trust**: How much should the agent explain its reasoning? Full ReAct trace? Summary? Configurable?

---

## Appendix: Relevant Patterns

### ReAct (Reason + Act)
The agent alternates between reasoning (THOUGHT) and acting (ACTION), observing results before deciding next step. This is the core loop for Levels 1-3.

### Tool Use
LLM is given tool definitions (name, description, parameters). It outputs structured tool calls. Your code executes tools and feeds results back. The LLM never directly accesses your database.

### Structured Output
Constrain LLM output to match a schema (TypeScript interface, JSON Schema). Prevents hallucinated fields, ensures parseable responses.

### Orchestration
Your code drives the loop, not the LLM. You decide when to stop, how to handle errors, what context to include. The LLM is a reasoning component, not the controller.

### Multi-Agent
Decompose complex tasks into specialized agents. Orchestrator manages flow. Shared context enables collaboration. Each agent can be simpler and more reliable than one monolithic agent.
