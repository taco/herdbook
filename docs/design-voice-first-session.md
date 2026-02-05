# Voice-First Session Entry Design Doc

## Overview

This document outlines the implementation plan for a voice-first session logging experience. The goal is to reduce friction for post-ride data capture by making voice the primary input method, with form-based editing as a review/correction layer.

**Status:** Planned
**Last updated:** 2026-02-05
**Related:** `docs/roadmap.md` (Phase 3), original design doc in Downloads

---

## Problem Statement

Logging a riding session immediately after a ride is high-friction on mobile:
- Form-heavy UI requires multiple field selections
- Small touch targets, often one-handed use
- Mental overhead of structured data entry when user just wants to "dump" thoughts
- Current voice features enhance the form but don't replace it

### What We're Solving

- **Reduce time-to-save** for post-ride session logging
- **Capture richer notes** by letting users speak naturally
- **Maintain data quality** with AI-assisted structuring and easy corrections
- **Build trust** through transparency (stored transcripts, clear AI behavior)

### What We're Not Solving

- AI training plans and recommendations (see `design-agents.md`)
- Live transcription (Whisper is batch-only)
- Offline-first recording queue (future enhancement)
- Multi-horse or multi-rider sessions

---

## Current State

The codebase already has voice infrastructure:

| Component | Location | Purpose |
|-----------|----------|---------|
| `VoiceRecordButton` | `packages/web/src/components/` | Transcribe speech → append to notes |
| `VoiceSessionButton` | `packages/web/src/components/` | Full session parsing from voice |
| `useVoiceRecording` | `packages/web/src/hooks/` | Mic access, recording state, transcription |
| `useVoiceSessionInput` | `packages/web/src/hooks/` | Session parsing with horse/rider context |
| `/api/transcribe` | `packages/api/src/server.ts` | Whisper transcription endpoint |
| `/api/parse-session` | `packages/api/src/server.ts` | GPT-4o-mini extraction endpoint |

**Current flow:** User opens form → optionally clicks voice button → fills/corrects fields → saves

**Target flow:** User opens voice screen → records → reviews AI-extracted data → saves

---

## Design Principles

1. **Voice-first, review-second** — Capture quickly, then confirm/correct in a lightweight review UI
2. **Confidence without text** — Visual feedback (timer, animation) substitutes for live transcription
3. **Progressive disclosure** — Show clean summary first, deeper editing on tap
4. **Safe defaults** — Last-used values, conservative inference, minimal AI surprise
5. **Authoritative user input** — Pre-selected values (quick picks) override AI extraction

---

## Architecture

### State Machine

```
┌─────────┐     start      ┌───────────┐     stop       ┌────────────┐
│  IDLE   │ ─────────────▶ │ RECORDING │ ─────────────▶ │ PROCESSING │
└─────────┘                └───────────┘                └────────────┘
     │                           │                            │
     │                           │ cancel                     │ success
     │                           ▼                            ▼
     │                      ┌─────────┐                 ┌──────────┐
     │                      │ (exit)  │                 │  REVIEW  │
     │                      └─────────┘                 └──────────┘
     │                                                       │
     │                           ┌───────────────────────────┤
     │                           │ save                      │ manual
     │                           ▼                           ▼
     │                      ┌─────────┐               ┌────────────┐
     └─────────────────────▶│  SAVED  │               │ EditSession│
                            └─────────┘               └────────────┘
```

### Component Structure

```
/session/voice (new route)
├── VoiceSessionCapture.tsx    # Recording UI with state machine
│   ├── QuickPicks.tsx         # Horse/Rider/WorkType chips (Phase 3)
│   ├── RecordingPanel.tsx     # Timer, animation, controls
│   └── ProcessingOverlay.tsx  # Transcribing/Structuring states
│
└── SessionReview.tsx          # Review UI after processing
    ├── SummaryRows.tsx        # Tappable field rows
    ├── NotesSection.tsx       # Expandable notes display
    ├── FieldEditSheet.tsx     # Bottom sheet for field editing
    └── TranscriptAccordion.tsx # "View transcript" (Phase 4)
```

### Data Flow

```
┌──────────────┐     audio blob      ┌─────────────────┐
│ MediaRecorder│ ─────────────────▶  │ /api/parse-session│
└──────────────┘                     └─────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
                    ▼                                               ▼
            ┌─────────────┐                               ┌──────────────┐
            │   Whisper   │                               │  GPT-4o-mini │
            │ transcribe  │                               │   extract    │
            └─────────────┘                               └──────────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ ParsedSession │
                                    │    Fields     │
                                    └───────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ SessionReview │
                                    │   Component   │
                                    └───────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │createSession  │
                                    │   mutation    │
                                    └───────────────┘
```

---

## Implementation Context for Agents

This section provides the essential patterns and references needed to execute each phase.

### Project Structure

```
packages/
├── api/                    # Fastify + Apollo GraphQL + Prisma
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── server.ts       # REST endpoints (/api/transcribe, /api/parse-session)
│   │   ├── resolvers.ts    # GraphQL resolvers
│   │   └── schema.graphql
│   └── package.json
│
├── web/                    # React + Vite + Apollo Client
│   ├── src/
│   │   ├── App.tsx         # Routes defined here
│   │   ├── pages/          # Page components (PascalCase.tsx)
│   │   ├── components/     # Reusable components
│   │   │   ├── ui/         # Shadcn primitives (don't modify)
│   │   │   └── fields/     # Form field components
│   │   ├── hooks/          # Custom hooks (camelCase.ts)
│   │   ├── context/        # React contexts (AuthContext)
│   │   └── generated/      # GraphQL codegen types
│   └── package.json
```

### Key Patterns to Follow

**Routing (App.tsx):**
```tsx
// All authenticated routes go inside PrivateLayout
<Route element={<PrivateLayout />}>
    <Route path="/sessions/voice" element={<VoiceSessionCapture />} />
    <Route path="/sessions/review" element={<SessionReview />} />
</Route>
```

**Page Component Structure:**
```tsx
// See EditSession.tsx as reference
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
// ... other imports

const MY_QUERY = gql`...`;
const MY_MUTATION = gql`...`;

export default function MyPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    // State, queries, mutations, handlers
    return (/* JSX */);
}
```

**State Machine Pattern (from useVoiceSessionInput.ts):**
```tsx
type RecordingState = 'idle' | 'recording' | 'processing';
const [state, setState] = useState<RecordingState>('idle');
```

**API Calls to REST Endpoints:**
```tsx
import { apiEndpoint } from '@/lib/api';

const response = await fetch(apiEndpoint('/api/parse-session'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ audio, mimeType, context }),
});
```

### Available UI Components (Shadcn)

Located in `packages/web/src/components/ui/`:

| Component | Use Case |
|-----------|----------|
| `Button` | Primary/secondary actions |
| `Card` | Content containers |
| `Sheet` | Bottom sheets for editing |
| `Input` | Text/number inputs |
| `Label` | Form labels |
| `Select` | Dropdowns (see SelectHorse.tsx for pattern) |
| `Separator` | Visual dividers |
| `AlertDialog` | Confirmations |
| `Skeleton` | Loading states |

### Existing Components to Reuse

| Component | Location | Reuse For |
|-----------|----------|-----------|
| `SelectHorse` | `components/fields/` | Horse picker in sheets |
| `SelectRider` | `components/fields/` | Rider picker in sheets |
| `SelectWorkType` | `components/fields/` | Work type picker in sheets |
| `ActivityCard` | `components/` | Previous session display |

### Existing Hooks to Reference

| Hook | Location | Key Exports |
|------|----------|-------------|
| `useVoiceSessionInput` | `hooks/` | `state`, `startRecording`, `stopRecording`, `error` |
| `useVoiceRecording` | `hooks/` | Similar, for notes-only transcription |
| `useAuth` | `context/AuthContext` | `token`, `rider`, `isAuthenticated` |

### GraphQL Patterns

**Queries/Mutations are defined inline:**
```tsx
const CREATE_SESSION = gql`
    mutation CreateSession(...) { ... }
`;

const [createSession, { loading }] = useMutation<
    CreateSessionMutation,
    CreateSessionMutationVariables
>(CREATE_SESSION);
```

**After codegen, types are in `@/generated/graphql`:**
```tsx
import { WorkType, CreateSessionMutation } from '@/generated/graphql';
```

**Run codegen after schema changes:**
```bash
cd packages/web && pnpm codegen
```

### Backend Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/transcribe` | POST | Whisper transcription | `{ audio: base64, mimeType }` |
| `/api/parse-session` | POST | Full session extraction | `{ audio, mimeType, context: { horses, riders, currentDateTime } }` |

Both require `Authorization: Bearer <token>` header.

### Testing Expectations

Per CLAUDE.md:
- **Don't test**: UI structure, trivial code
- **Do test**: Complex logic in hooks (if any)
- **Integration over unit**: Use `fastify.inject()` for API, `getByRole`/`getByText` for UI
- **Manual smoke test**: Primary validation method for UI features

### Commands

```bash
pnpm format          # Run after changes
pnpm dev             # Start dev servers
pnpm codegen         # Regenerate GraphQL types (from packages/web)
pnpm test            # Run tests
```

### Key Files for Each Phase

**Phase 1 (Capture Screen):**
- Create: `pages/VoiceSessionCapture.tsx`, `hooks/useRecordingStateMachine.ts`
- Modify: `App.tsx` (add route)
- Reference: `hooks/useVoiceSessionInput.ts` (recording logic)

**Phase 2 (Review Screen):**
- Create: `pages/SessionReview.tsx`, `components/review/*`
- Reference: `EditSession.tsx` (mutation pattern), `components/fields/*` (pickers)

**Phase 3 (Quick Picks):**
- Create: `components/voice/QuickPicks.tsx`
- Modify: `VoiceSessionCapture.tsx`, `api/src/server.ts` (prompt update)

**Phase 4 (Transcript):**
- Modify: `prisma/schema.prisma`, `schema.graphql`, `resolvers.ts`
- Run: `pnpm prisma migrate dev` after schema change

**Phase 5 (Polish):**
- Create: `components/voice/AudioWaveform.tsx`, `hooks/useAudioAnalyser.ts`
- Uses: Web Audio API (`AnalyserNode`)

**Phase 6 (Addendum):**
- Modify: `SessionReview.tsx`, `components/review/NotesSection.tsx`
- Reference: `useVoiceRecording.ts` (transcribe-only)

---

## Implementation Phases

### Phase 1: Voice Capture Screen (Foundation)

**Goal:** New dedicated route with recording UI and state machine

**Scope:**
- New page: `VoiceSessionCapture.tsx` at `/session/voice`
- Recording state machine: IDLE → RECORDING → PROCESSING → (success/error)
- Timer display with 3-minute default cap (hard limit: 5 minutes)
- Pulsing recording indicator (simple CSS animation, no waveform yet)
- Stop/Cancel buttons
- Reuse existing `/api/parse-session` backend
- On success: navigate to review screen with parsed data
- On error: "Try Again" and "Manual Entry" buttons

**Technical Notes:**
- Extract recording logic from `useVoiceSessionInput` into reusable state machine
- Timer implemented with `useEffect` interval
- Max duration enforced client-side (auto-stop at limit)

**Files to Create:**
```
packages/web/src/pages/VoiceSessionCapture.tsx
packages/web/src/components/voice/RecordingPanel.tsx
packages/web/src/components/voice/ProcessingOverlay.tsx
packages/web/src/hooks/useRecordingStateMachine.ts
```

**Files to Modify:**
```
packages/web/src/App.tsx  # Add route
```

**Done when:** User can record audio, see processing state, and reach review screen or error state.

---

### Phase 2: Review Screen (Summary-First)

**Goal:** Post-processing review UI with tappable field rows

**Scope:**
- New page: `SessionReview.tsx` at `/session/review`
- Settings-style rows for: Horse, Rider, Work Type, Duration, Date/Time
- Each row shows label + value + chevron (tap to edit)
- Bottom sheet pickers for each field type:
  - Horse/Rider: list with checkmark
  - Work Type: list with checkmark
  - Duration: number input
  - Date/Time: native datetime picker
- Notes section with expand/collapse (default: 4-line preview)
- "Save Session" primary button → calls `createSession` mutation
- "Edit Manually" secondary button → navigates to `/session/new` with prefilled data
- Validation: disable Save if any required field is missing

**Technical Notes:**
- Pass parsed data via React Router state or URL params
- Reuse existing picker components from EditSession where possible
- Use Shadcn Sheet component for bottom sheets

**Files to Create:**
```
packages/web/src/pages/SessionReview.tsx
packages/web/src/components/review/SummaryRow.tsx
packages/web/src/components/review/NotesSection.tsx
packages/web/src/components/review/FieldEditSheet.tsx
```

**Done when:** Complete voice-to-save flow works end-to-end.

---

### Phase 3: Quick Picks (Pre-Recording Context)

**Goal:** Reduce corrections by capturing known values before recording

**Scope:**
- Chip selectors on capture screen: Horse, Rider, Work Type
- Default to last-used values (from localStorage or `lastSessionForHorse` query)
- Chips show: pill shape, label + selected value, chevron
- Tap chip → bottom sheet selector
- Selected values passed to `/api/parse-session` as `authoritative` context
- Update LLM prompt: "User has pre-selected [Horse: Bella]. Do not override this value."

**Technical Notes:**
- Store last-used values in localStorage
- Fetch horse/rider lists on mount (already done in EditSession)
- Authoritative values skip AI extraction for those fields

**Files to Create:**
```
packages/web/src/components/voice/QuickPicks.tsx
packages/web/src/components/voice/QuickPickChip.tsx
```

**Files to Modify:**
```
packages/web/src/pages/VoiceSessionCapture.tsx  # Add QuickPicks
packages/api/src/server.ts  # Update parse-session prompt
```

**Done when:** Users can pre-select values that aren't overridden by AI.

---

### Phase 4: Transcript Persistence

**Goal:** Store transcripts for transparency and future AI features

**Scope:**
- Schema change: add optional `transcript` field to Session model
- Update `createSession` mutation to accept `transcript` parameter
- Update `updateSession` mutation to allow transcript edits
- Add "View Transcript" accordion in SessionReview
- Show transcript in session detail view (read-only)

**Schema Change:**
```prisma
model Session {
  // ... existing fields
  transcript String?  // Raw Whisper transcription
}
```

**GraphQL Change:**
```graphql
type Session {
  # ... existing fields
  transcript: String
}

input CreateSessionInput {
  # ... existing fields
  transcript: String
}
```

**Files to Modify:**
```
packages/api/prisma/schema.prisma
packages/api/src/schema.graphql
packages/api/src/resolvers.ts
packages/web/src/pages/SessionReview.tsx  # Add transcript accordion
packages/web/src/components/SessionDetailSheet.tsx  # Show transcript
```

**Done when:** Transcripts are stored and viewable.

---

### Phase 5: Polish & Confidence

**Goal:** Production-quality recording experience

**Scope:**
- Audio waveform visualization (amplitude bars via Web Audio API)
- Silence detection with subtle warning (not auto-stop in v1)
- "Extend +1:00" button appearing at T-30s from limit
- Mic permission handling:
  - Check permission on mount
  - Show explanation if denied
  - "Open Settings" button for re-enabling
- Haptic feedback on iOS (via Capacitor if available)
- VoiceOver labels for all interactive elements

**Technical Notes:**
- Waveform: use `AnalyserNode` from Web Audio API
- Silence detection: monitor audio levels, show warning after 10s of silence
- Permission check: `navigator.permissions.query({ name: 'microphone' })`

**Files to Create:**
```
packages/web/src/components/voice/AudioWaveform.tsx
packages/web/src/hooks/useAudioAnalyser.ts
packages/web/src/hooks/useMicPermission.ts
```

**Done when:** Recording feels polished and professional.

---

### Phase 6: Addendum Recording

**Goal:** Append additional voice notes during review

**Scope:**
- Mic button in notes section of SessionReview
- Tap → start recording (mini recording UI)
- Stop → transcribe → append to notes
- Confirmation: "Add to notes?" before appending

**Technical Notes:**
- Reuse recording state machine from Phase 1
- Only call `/api/transcribe` (not parse-session)
- Append with separator: `\n\n---\n\n[Addendum]\n{transcribed text}`

**Files to Modify:**
```
packages/web/src/pages/SessionReview.tsx
packages/web/src/components/review/NotesSection.tsx  # Add mic button
```

**Done when:** Users can add forgotten details without restarting.

---

## Future Enhancements (Not in Scope)

These are noted but not planned for initial implementation:

| Enhancement | Description | Why Deferred |
|-------------|-------------|--------------|
| Offline Queue | Record now, transcribe when connected | Complexity; validate online flow first |
| Structured Notes | Warm-up / Went Well / Improve / Focus sections | Schema change; validate single notes field first |
| Auto-start Setting | User preference to start recording on open | Privacy concerns; explicit start builds trust |
| Live Waveform | Real-time word display | Whisper is batch-only |
| AI Suggestions | "You mentioned Beau was stiff — add to horse notes?" | Post-MVP intelligence |

---

## Design Decisions

### 1. Separate Route vs. Modal

**Decision:** Separate route (`/session/voice`)

**Rationale:**
- Full-screen recording experience feels more intentional
- Cleaner state management (route-level, not modal-level)
- Easy to A/B test vs. existing form
- Can deep-link to voice flow

### 2. Quick Picks as Authoritative

**Decision:** User-selected values override AI extraction

**Rationale:**
- Constrained fields (horse, rider, work type) are easy to select manually
- AI errors on constrained fields are frustrating to correct
- Builds trust: "the app does what I told it"

### 3. Single Notes Field (Not Structured)

**Decision:** Keep `notes` as single String field

**Rationale:**
- Users don't naturally speak in categories (warm-up, went well, etc.)
- LLM can organize/clean notes without forcing structure
- Simpler schema, faster to ship
- Add structure as future enhancement if users request it

### 4. 3-Minute Default Recording Limit

**Decision:** Default 3 minutes, hard cap 5 minutes

**Rationale:**
- Most sessions are 30-120 seconds of speech
- Longer recordings = more Whisper cost/latency
- Prevents runaway recordings
- Simpler than "extend at T-30s" for Phase 1

### 5. No Waveform in Phase 1

**Decision:** Simple pulsing indicator, add waveform in Phase 5

**Rationale:**
- Web Audio API adds complexity
- Pulsing animation provides sufficient confidence
- Users understand "recording" without amplitude visualization
- Polish can come after core flow works

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to save (voice flow) | < 60s for typical session | Timestamp: route open → save complete |
| Completion rate | > 80% start recording → save | Events: recording_started, session_saved |
| Field correction rate | < 20% of sessions need edits | Events: field_edited_before_save |
| Error rate | < 5% transcription/parsing failures | API error logs |
| Adoption | > 50% of new sessions via voice | Compare voice vs. form session counts |

---

## Rollout Plan

1. **Development:** Build Phases 1-2 behind feature flag
2. **Internal testing:** Use voice flow for all personal session logging
3. **Soft launch:** Enable for all riders, keep form as default entry point
4. **Iteration:** Gather feedback, complete Phases 3-5
5. **Promotion:** Make voice the primary "Log Session" entry point
6. **Sunset consideration:** Evaluate if form can become voice-only with manual edit fallback

---

## Open Questions

1. **Entry point:** Button on dashboard? Replace "Log Session" fab? Separate "Quick Log" button?

2. **Review screen location:** New route or modal over capture screen? (Current plan: new route)

3. **Error recovery:** If parsing fails but transcription succeeds, should we show transcript and let user manually fill fields? (Current plan: yes)

4. **Notes formatting:** Should LLM clean up/organize notes, or preserve verbatim speech? (Current plan: clean up)

5. **Analytics:** What events do we need to track for success metrics?

---

## Appendix: Comparison with Original Design Doc

| Original Proposal | This Plan | Rationale |
|-------------------|-----------|-----------|
| 2-min default, extend at T-30s | 3-min default, hard cap 5-min | Simpler for Phase 1 |
| Structured notes (warm-up, etc.) | Single notes field | Validate core flow first |
| Waveform visualization | Pulsing indicator (Phase 1) | Reduce complexity |
| Silence auto-stop | Warning only (Phase 5) | Avoid unexpected behavior |
| "View transcript" read-only | Read-only (Phase 4) | Start simple |
| Quick picks optional | Quick picks in Phase 3 | Get core flow working first |

The original design doc is comprehensive. This plan sequences the work into shippable increments while deferring complexity that isn't essential for validating the core voice-first hypothesis.
