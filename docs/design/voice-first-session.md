# Voice-First Session Entry Design Doc

## Overview

Voice-first session logging to reduce friction for post-ride data capture. Voice is the primary input method, with form-based editing as a review/correction layer.

**Status:** Phase 1 shipped. Phases 2-6 not started.
**Last updated:** 2026-03-05

---

## Problem Statement

Logging a riding session immediately after a ride is high-friction on mobile:

- Form-heavy UI requires multiple field selections
- Small touch targets, often one-handed use
- Mental overhead of structured data entry when user just wants to "dump" thoughts

### What We're Solving

- **Reduce time-to-save** for post-ride session logging
- **Capture richer notes** by letting users speak naturally
- **Maintain data quality** with AI-assisted structuring and easy corrections
- **Build trust** through transparency (stored transcripts, clear AI behavior)

### What We're Not Solving

- Live transcription (Whisper is batch-only)
- Offline-first recording queue (future enhancement)
- Multi-horse or multi-rider sessions

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

### Data Flow

```
┌──────────────┐     audio blob      ┌─────────────────┐
│ MediaRecorder│ ─────────────────▶  │ /api/parse-session│
└──────────────┘                     └─────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
            ┌─────────────┐                               ┌──────────────┐
            │   Whisper   │                               │   GPT-5.2    │
            │ transcribe  │                               │   extract    │
            └─────────────┘                               └──────────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            ▼
                                    ┌───────────────┐
                                    │ ParsedSession │
                                    └───────────────┘
                                            ▼
                                    ┌───────────────┐
                                    │createSession  │
                                    │   mutation    │
                                    └───────────────┘
```

---

## What's Built (Phase 1)

Voice capture screen with recording UI and state machine:

- `packages/web/src/pages/VoiceSessionCapture.tsx` — dedicated route at `/sessions/voice`
- `packages/web/src/components/voice/RecordingPanel.tsx` — timer, animation, controls
- `packages/web/src/components/voice/ProcessingOverlay.tsx` — transcribing/structuring states
- `packages/web/src/hooks/useRecordingStateMachine.ts` — IDLE → RECORDING → PROCESSING state machine
- Reuses existing `/api/parse-session` backend
- On success: navigates to edit session with parsed data prefilled

---

## Remaining Phases

### Phase 2: Review Screen (Summary-First)

Post-processing review UI with tappable field rows. Settings-style rows for each extracted field, bottom sheet pickers, "Save Session" button. Currently, parsed data goes directly to the edit form instead.

### Phase 3: Quick Picks (Pre-Recording Context)

Chip selectors on capture screen (Horse, Rider, Work Type) to reduce corrections. Selected values passed to `/api/parse-session` as authoritative context that the LLM won't override.

### Phase 4: Transcript Persistence

Store transcripts for transparency. Schema change: add optional `transcript` field to Session model. "View Transcript" accordion in session detail.

### Phase 5: Polish & Confidence

Audio waveform visualization (Web Audio API), silence detection, mic permission handling, haptic feedback, VoiceOver labels.

### Phase 6: Addendum Recording

Mic button in notes section to append voice notes during review. Transcribe-only (no field extraction).

---

## Design Decisions

### 1. Separate Route vs. Modal

**Decision:** Separate route (`/sessions/voice`). Full-screen recording experience, cleaner state management, easy to deep-link.

### 2. Quick Picks as Authoritative

**Decision:** User-selected values override AI extraction. Constrained fields are easy to select manually; AI errors on them are frustrating.

### 3. Single Notes Field (Not Structured)

**Decision:** Keep `notes` as single String field. Users don't naturally speak in categories. LLM can organize without forcing structure.

### 4. 3-Minute Default Recording Limit

**Decision:** Default 3 minutes, hard cap 5 minutes. Most sessions are 30-120 seconds of speech. Prevents runaway recordings and cost.

### 5. No Waveform in Phase 1

**Decision:** Simple pulsing indicator. Web Audio API adds complexity; polish comes after core flow works.

---

## Open Questions

1. **Review screen location:** New route or modal over capture screen?
2. **Error recovery:** If parsing fails but transcription succeeds, show transcript and let user manually fill fields?
3. **Notes formatting:** Should LLM clean up/organize notes, or preserve verbatim speech? (Current: clean up)
