# Implementation Plan: Race Visualizer — Watchable Contest Presentation

**Branch**: `006-race-visualizer` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-race-visualizer/spec.md`

## Summary

Replace `ContestScene`'s instant resolve-and-transition with a 20-second animated race: both cars complete 10 literal loops around a simple oval, paced by a single shared time-scale derived from the slower car's total simulated time (so the winner visibly finishes early), with callouts for discrete item-firing events and a live leader/gap indicator. The core scheduling/timing math is pure and framework-free (`src/simulation/playback.ts`), matching every prior feature's "framework-free core, thin Phaser shell" pattern; `ContestScene.ts` becomes a thin per-frame renderer of that pure module's output. `005-lap-tick-simulation`'s `LapBreakdown` needs a small extension (`firedItemIds: string[]` → `firedItems: {id, contribution}[]`) to expose the per-item numbers this feature's callouts require, and the now-fully-superseded `TimelineFrame`/`buildTimeline`/`ContestResult.timeline` are removed outright (confirmed zero remaining consumers besides their own definitions and tests).

## Technical Context

Unchanged from `005-lap-tick-simulation` except where noted below.

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged). This feature is the first to use Phaser's per-frame `update(time, delta)` scene lifecycle and its `Graphics`/shape-drawing API (for the oval track and car markers) rather than static text/buttons — no new package dependency, a different part of the existing Phaser API surface (same kind of "first use of a new Phaser feature" `004-board-storage-ui` did for drag-and-drop).

**Storage**: N/A — unchanged.

**Testing**: Vitest, strict TDD for `src/simulation/` — now also covering a new `playback.ts` module, alongside modified `laps.ts`/`buffs.ts`/`contest.ts`/`types.ts`. `ContestScene.ts` itself is presentation-layer (lightly/manually tested via quickstart, per the constitution's simulation-only strict-TDD decision) — but is designed to be almost entirely mechanical (read pure output, set sprite/text properties), so nearly all of this feature's real logic is strictly tested. A new `contestFormatting.ts` (callout/leader-indicator text) follows `resultFormatting.ts`'s existing precedent: pure functions, lightly tested, extracted from the scene for testability without a Phaser canvas.

**Target Platform**: Web (unchanged).

**Project Type**: Single-project web game client (unchanged) — this feature modifies `src/simulation/` (schedule/timing math) and `src/scenes/ContestScene.ts` (rendering); `ResultScene.ts`/`resultFormatting.ts` are untouched (FR-013, confirmed by inspection — neither references `timeline` or the fields being extended).

**Performance Goals**: A 20-second animation updating two markers, a leader indicator, and occasional callouts every frame is trivial for Phaser; no new performance profile.

**Constraints**:
- All constraints from `005-lap-tick-simulation`'s plan carry forward unchanged (framework-free simulation core, no live multiplayer, no player input during a contest).
- New: all race-timing/scheduling math (shared time-scale, per-car progress, live gap, which items fired) MUST be pure functions in `src/simulation/playback.ts` — `ContestScene.ts` calls them every frame but contains no timing/scaling logic of its own, preserving the "framework-free, strictly TDD'd" boundary as this feature's animation logic grows.
- New: the shared time-scale (FR-002/FR-003) MUST be derived once per contest (`max(playerTime, ghostTime)` → 20 seconds) and applied identically to both cars — never two independently-normalized per-car scales (spec Clarifications; this was a caught bug in the spec's own first draft).
- New: `LapBreakdown.firedItemIds: string[]` becomes `firedItems: { id: string; contribution: number }[]` — computed once by `laps.ts` (which already has the necessary per-item data via `computeBoostsForLap`'s `stackingState`), not re-derived by this feature's presentation layer.
- New: `TimelineFrame`, `buildTimeline`, and `ContestResult.timeline` are removed entirely — confirmed (by search) to have no remaining consumer once this feature's `playback.ts` derives everything directly from `laps[]` instead.

**Scale/Scope**: Unchanged solo/small-team scope. One fixed oval track shape, two car markers, a leader indicator, transient item callouts. `RACE_ANIMATION_SECONDS = 20` (Clarifications). No skip control, no track variety (spec Assumptions, `specs/DEFERRED.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | `resolveContest` still runs synchronously, fully determining the outcome, *before* any animation frame renders — the animation is read-only playback of an already-fixed result; no input during it can alter anything (FR-011). |
| II. Fairness | PASS | No monetization; nothing to violate. |
| III. Transparency & Legibility | PASS | Item-firing callouts (FR-006/007) and the numeric leader/gap indicator (FR-012) are direct, concrete expressions — arguably the strongest Transparency payoff of any feature so far, since it attributes *in the moment* rather than only in a post-race summary. |
| IV. Spectation-First | **PASS — satisfied, not merely deferred** | This is the feature that actually fulfills this non-negotiable principle for the first time. `specs/DEFERRED.md`'s oldest entry (from `001-core-loop`'s own clarify session) is resolved by this feature shipping, not just advanced toward. |
| V. Build Testing Access as Core | DEFERRED, not violated | Unaffected — still open, tracked separately. |
| VI. Async-First Architecture | PASS | The ghost remains a single fixed, non-live, hand-authored value; nothing about live pacing implies a live opponent. |
| Product Constraints — Visual medium | PASS | Still Phaser 2D — this feature is the fullest use yet of the 2D medium (shapes, motion, transient UI), not a departure from it. |
| Product Constraints — Spec series | PASS | No changes to car/item mechanics, slot rules, or draft weighting — presentation only. |
| Development Workflow | PASS | Disciplined scope: single track shape, no skip control, no venue variety, no changes to `ResultScene` — all explicitly deferred or excluded per spec Assumptions/`specs/DEFERRED.md`. |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract confirm the shared time-scale, per-car progress, and live-gap computations are all pure functions of `ContestResult` alone (no hidden state, no randomness) — determinism holds by construction. `ContestScene.ts` calling these once per frame introduces no new violation surface. Table above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/006-race-visualizer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

Existing files are marked (MODIFIED) or (unchanged); new files are marked (NEW).

```text
src/
├── simulation/
│   ├── types.ts    (MODIFIED) — LapBreakdown.firedItemIds → firedItems: {id, contribution}[]; REMOVE TimelineFrame interface and ContestResult.timeline field; new RACE_ANIMATION_SECONDS constant (or defined in playback.ts, see research.md)
│   ├── laps.ts     (MODIFIED) — PlayerLap.firedItemIds → firedItems: FiredItem[]; loop computes each firing item's actual per-lap contribution (already has the data via computeBoostsForLap's stackingState — no new derivation needed)
│   ├── buffs.ts    (MODIFIED) — add exported isFlatBuff(item) pure predicate, reused by playback.ts's callout filtering
│   ├── contest.ts  (MODIFIED) — remove buildTimeline/TIMELINE_FRAME_COUNT/TimelineFrame import and the timeline field; laps mapping updated for firedItems
│   ├── playback.ts (NEW) — buildPlaybackSchedule, carProgressAt, cumulativeSimulatedTimeAt, liveGapAt, calloutEventsForLap, frameStateAt (aggregator); strict TDD
│   └── draft.ts, slots.ts, storage.ts (unchanged)
├── content/
│   └── sample-data.ts (unchanged) — no content changes needed for this feature
└── scenes/
    ├── ContestScene.ts      (MODIFIED, substantial) — builds a PlaybackSchedule once, then every update(time, delta) frame calls frameStateAt and sets marker positions/leader text/callout visibility from its output; transitions to ResultScene once RACE_ANIMATION_SECONDS elapses
    ├── contestFormatting.ts (NEW) — pure text formatters for callouts and the leader indicator, mirroring resultFormatting.ts's existing pattern (extracted for testability without a Phaser canvas)
    ├── ResultScene.ts        (unchanged) — confirmed by inspection: doesn't reference timeline or firedItemIds
    └── resultFormatting.ts   (unchanged) — confirmed by inspection: same

tests/
├── unit/
│   ├── playback.test.ts (NEW) — strict TDD against src/simulation/playback.ts
│   ├── laps.test.ts     (MODIFIED) — updated for firedItems shape
│   ├── buffs.test.ts    (MODIFIED) — adds isFlatBuff tests
│   ├── contest.test.ts  (MODIFIED) — updated for firedItems; removes the now-obsolete "retains the synthetic timeline" test
│   ├── item-pool.test.ts, draft.test.ts, slots.test.ts, storage.test.ts (unchanged)
│   └── contestFormatting.test.ts (NEW, lightly tested) — mirrors resultFormatting's own test-file precedent
└── integration/
    └── result-scene.test.ts (MODIFIED, trivial) — remove `timeline: []` from its ContestResult fixture
```

**Structure Decision**: All new race-timing math lives in `src/simulation/playback.ts`, a new framework-free module held to the same strict-TDD standard as `laps.ts`/`buffs.ts` — including a single `frameStateAt` aggregator so `ContestScene.ts` never computes timing/scaling itself, only renders whatever plain data that function returns each frame. `contestFormatting.ts` mirrors `resultFormatting.ts`'s already-established pattern of pure, lightly-tested text formatters kept separate from the Scene class.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
