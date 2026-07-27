# Implementation Plan: Lap-Tick Race Simulation (No Visuals)

**Branch**: `005-lap-tick-simulation` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-lap-tick-simulation/spec.md`

## Summary

Replace the one-shot contest-resolution model (001-004: a single computed time delta) with a real lap-by-lap simulation: `LAP_COUNT` (10) discrete laps, each independently computing the player's contribution from every active item whose cooldown allows it to fire, plus flat and stacking buff effects, clamped to a minimum lap-time floor. The ghost becomes a fixed-pace control car (`lapTime` instead of `finishingTime`) with zero variance. This is purely a simulation-layer migration — no scene file changes at all, confirmed by inspection (`PrepareScene`/`ContestScene`/`ResultScene`/`resultFormatting.ts` never reference the fields being renamed) — matching the feature's explicit "no visuals" scope.

## Technical Context

Unchanged from `004-board-storage-ui` except where noted below.

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged). This feature touches **zero** Phaser code — no scene file is modified — since it's a pure `src/simulation/` migration (confirmed: no scene references `finishingTime`/`baseTime`, the two fields being renamed).

**Storage**: N/A — still no backend; item pool and ghost remain static content bundled with the client.

**Testing**: Vitest, strict TDD for `src/simulation/` — now also covering a new `laps.ts` module and a substantially rewritten `buffs.ts`, alongside modified `types.ts`/`build.ts`/`contest.ts`. No presentation-layer tests are touched (no scene changes).

**Target Platform**: Web (unchanged) — moot for this feature specifically, since nothing renders.

**Project Type**: Single-project web game client (unchanged) — this feature modifies only `src/simulation/` and `src/content/sample-data.ts`.

**Performance Goals**: Unchanged — simulating 10 laps × ~13 items is trivially fast; no new performance profile.

**Constraints**:
- All constraints from `004-board-storage-ui`'s plan carry forward unchanged (framework-free simulation core, no live multiplayer, no player input during a contest).
- New: the lap loop, cooldown-fire check, and buff-boost computation MUST all be pure functions with no hidden state across calls — any state that persists across laps (stacking buffs' cumulative boost) MUST be threaded explicitly through return values, not held in module-level mutable variables, preserving the existing "framework-free, strictly TDD'd" discipline.
- New: a minimum lap-time floor MUST be enforced per lap (FR-016) — a small positive constant, applied wherever a lap's computed time could reach zero or below.
- New: stacking-buff state MUST be keyed by each held item's position in the active-item set, not by item `id` — two duplicate-id copies of the same stacking buff (holding duplicates is permitted per `002-item-slots` Assumptions) must accumulate independently, not share one counter (research.md).

**Scale/Scope**: Unchanged solo/small-team scope. `LAP_COUNT` fixed at 10; the existing buff item becomes a flat buff (no data change needed — it already has no cooldown field); one new illustrative stacking-buff item is added to the pool; all 12 existing direct items are migrated with assigned cooldowns (mix of 1 and >1, per spec Assumptions/SC-002).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | The contest still resolves in one synchronous call with no player input surface — it now internally loops over laps, but nothing about that loop is visible or interactive to the player yet (that's the separate future visualizer feature). |
| II. Fairness | PASS | No monetization; nothing to violate. |
| III. Transparency & Legibility | PASS | The new lap-by-lap breakdown (FR-010) is a direct, concrete step toward this principle — previously a build's outcome was one opaque number; now every lap's contribution and which items fired is inspectable data, even before any UI surfaces it. |
| IV. Spectation-First | DEFERRED, not violated | Still no live/broadcast presentation — but this feature is explicitly the data-layer groundwork the deferred visualizer feature will consume (spec.md Assumptions), a meaningful step toward this non-negotiable principle rather than a neutral one. |
| V. Build Testing Access as Core | DEFERRED, not violated | Unchanged from 001-004's deferral. |
| VI. Async-First Architecture | PASS | The ghost remains a single fixed, non-live, hand-authored value — now per-lap rather than a flat total, but still fully offline and deterministic. |
| Product Constraints — Visual medium | PASS | No visual changes in this feature at all. |
| Product Constraints — Spec series | PASS | The shared baseline car and flat slot/tag mechanics are untouched; only how a final build resolves into a race outcome changes. |
| Development Workflow | PASS | A substantial but disciplined vertical slice — lap-count run-scaling and the real run/encounter structure are explicitly left to a future feature (spec.md Assumptions, `specs/DEFERRED.md`), and visuals are deliberately split into a second feature per the owner's own request. |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract confirm the lap loop, cooldown checks, and buff-boost computation are all pure functions with explicitly-threaded state (no module-level mutable variables) — determinism and order-independence hold by construction, not by extra guarding logic. Table above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/005-lap-tick-simulation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

This feature modifies only `src/simulation/` and `src/content/sample-data.ts` — no scene file changes (verified by inspection, see Summary). Existing files are marked (MODIFIED) or (unchanged); new files are marked (NEW).

```text
src/
├── simulation/
│   ├── types.ts    (MODIFIED) — SpecCar.baseTime → baseLapTime; SampleGhost.finishingTime → lapTime; OfferedItem gains cooldown?: number; new LAP_COUNT=10, MIN_LAP_TIME constants; new LapBreakdown interface; ContestResult gains laps: LapBreakdown[]
│   ├── laps.ts     (NEW) — firesOnLap(cooldown, lap), simulatePlayerLaps(build); strict TDD
│   ├── buffs.ts    (MODIFIED, substantial rewrite) — applyBuffs replaced by computeBoostsForLap(activeItems, lap, stackingState), aware of flat vs. stacking buffs; strict TDD
│   ├── build.ts    (MODIFIED) — resultingTime delegates to laps.ts's simulatePlayerLaps and sums; existing non-finite guard kept as a final defensive check alongside the new per-lap floor
│   ├── contest.ts  (MODIFIED) — resolveContest builds the full per-lap breakdown (player laps + ghost's constant lapTime), sums for playerTime/ghostTime/gap/outcome; buildTimeline unchanged (still fed by final totals, not lap-aware — out of scope here, see research.md)
│   ├── draft.ts    (unchanged) — drawItem is agnostic to cooldown/laps
│   └── slots.ts, storage.ts (unchanged) — capacity/eviction/board-storage-movement rules untouched (FR-015)
├── content/
│   └── sample-data.ts (MODIFIED) — BASELINE_CAR.baseTime → baseLapTime (60 → 6, preserving the old implied pace); SAMPLE_GHOST.finishingTime → lapTime (58.5 → 5.85, same reasoning); every direct item gains a cooldown; one new stacking-buff item added; existing buff item needs no change (already has no cooldown field, so it's a flat buff as-is)
└── (no scene files touched)

tests/
├── unit/
│   ├── laps.test.ts    (NEW) — strict TDD against src/simulation/laps.ts
│   ├── buffs.test.ts   (MODIFIED, substantial rewrite) — flat vs. stacking, multi-buff summation, per-item independent stacking state
│   ├── contest.test.ts (MODIFIED) — lap count, lap breakdown shape/sum invariants, ghost-per-lap constancy, determinism, order-independence, minimum-floor clamping
│   ├── item-pool.test.ts (MODIFIED) — every direct item has a cooldown; at least one cooldown=1 and one cooldown>1; pool includes both a flat and a stacking buff
│   └── draft.test.ts, slots.test.ts, storage.test.ts (unchanged)
└── integration/
    └── result-scene.test.ts (unchanged) — confirmed it doesn't reference the renamed fields; `ContestResult`'s existing consumed fields keep the same names/shapes
```

**Structure Decision**: The lap loop gets its own framework-free module (`src/simulation/laps.ts`), held to the same strict-TDD standard as `contest.ts`/`slots.ts`/`storage.ts`. `buffs.ts` is rewritten in place (not renamed) since it's still "the module that computes buff effects" — its contract just grows to be lap-aware. `build.ts`/`contest.ts` keep their existing names and roles (a build's resulting time; resolving a contest) even though their internals now delegate to the lap loop, preserving continuity for anything that already imports them.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
