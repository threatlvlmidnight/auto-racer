# Implementation Plan: Race Spectacle

**Branch**: `013-race-spectacle` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-race-spectacle/spec.md`

## Summary

Replace `ContestScene`'s bare-oval, two-car presentation with a renderer
over `012-multi-ghost-contest`'s `NCarContestResult`: a real track shape
deterministically selected from 3 hand-authored fixed tracks (no
procedural generation, to guarantee identical results across every
viewer), a live standings sidebar, the player's own board-flash cue
(unchanged from today, not extended to rivals), and a curated commentary
ticker. No playback-speed or skip control is added; instead, the single
fixed watch duration's pacing is tuned to feel satisfying (reference: The
Bazaar), which is content/tuning work, not new architecture. Every visible
fact traces back to `012`'s already-computed result — this feature adds no
new simulation contract beyond track selection.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. The 3 tracks are static authored
content bundled with the client, the same way `ITEM_POOL` and the rival
profile catalog are.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts: track selection determinism, N-car
`PlaybackSchedule`/`frameStateAt`, the shared `standingsAt` derivation
(consumed identically by both the standings sidebar and ticker
lead-change detection), and ticker curation rules. Focused scene-level
checks for the minimal N-car rendering and the player-only board-flash
cue.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: Playback remains a per-frame read of an
already-computed schedule (no new computation during playback beyond
array lookups and the shared `standingsAt` comparison); extending from 2
cars to 8 multiplies existing per-frame work by a small constant factor,
no new asymptotic cost. No new hardware-specific frame-rate guarantee.

**Constraints**:
- Track shape is fixed, authored data — never procedurally generated at
  render time — specifically to guarantee bit-identical results across
  every viewer of the same contest (Constitution Principle I/III).
- Track selection is `(runSeed + pvpStageOrdinal) mod 3` — no new
  identifier concept, reuses `012`'s existing `resolveContest` inputs.
- Zero live/non-deterministic randomness anywhere in the presentation.
- No contact/collision rendering — `012` FR-006 excludes it from
  simulation, and this feature must not reintroduce it visually.
- The player's board-flash cue is unchanged from today and is NOT extended
  to rivals; rival events surface only through the curated commentary
  ticker.
- No playback-speed or skip-to-end control of any kind.
- Inherits the existing 800x450 canvas, `Phaser.Scale.FIT`, and
  accessibility floors from `010`/`011` — no new viewport requirement.
- This feature adds no new `012-multi-ghost-contest` simulation data; all
  ticker/standings derivation happens from `NCarContestResult` plus
  playback-schedule math already in `playback.ts`'s existing pattern.

**Scale/Scope**: 3 hand-authored fixed track shapes; extension of
`playback.ts`'s existing 2-car schedule/frame functions to N (8) cars;
migration of `ContestScene` and `contestFormatting.ts`'s 2-car-specific
formatting to N-car equivalents.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Purely a renderer over `012`'s already-computed, precomputed-before-playback result; introduces no live input and no new opponent. |
| II. Fairness | PASS | Track selection and presentation are identical regardless of purchasable content; no monetization surface is touched. |
| III. Transparency & Legibility | PASS | Every visible cue/ticker line/track choice is derivable from already-computed facts (Decisions 2-6, research.md); zero live randomness anywhere in the presentation. |
| IV. Spectation-First | PASS | This feature exists specifically to make the full 8-car field watchable and legible — the direct target of this principle. |
| V. Build Testing Access | PASS | Untouched — this feature only changes `ContestScene`/`contestFormatting.ts`, never Test Day/Practice mode. |
| VI. Async-First Architecture | PASS | No live service or synchronization introduced; "canonical across every viewer" is solved by fixed authored data plus deterministic selection, not a live dependency. |
| Product - 2D medium | PASS | Extends existing 2D Phaser presentation; no medium change. |
| Product - mechanical parity and topology | PASS | Presentation-only feature; touches no capacity, slot, or item-legality rule. |
| Product - theme | PASS | Track shapes and ticker copy are new authored content within the existing 1901 motor-age vocabulary; no theme decision is reopened. |
| Development Workflow | PASS | Vertically sliced: this feature alone makes `012`'s 8-car result watchable, independent of any later feature. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model (track catalog, N-car playback
schedule, shared `standingsAt` derivation) introduces no new
outcome-affecting state and no live randomness; all principles above
remain PASS. No new gate is introduced by the Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/013-race-spectacle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── race-spectacle-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── content/
│   └── tracks.ts                    (NEW) - 3 hand-authored fixed track
│                                       shapes (closed-loop point paths)
├── simulation/
│   └── tracks.ts                    (NEW) - selectTrack(runSeed,
│                                       pvpStageOrdinal) -> Track, pure
│                                       and deterministic
├── scenes/
│   ├── playback.ts                  (MODIFIED) - PlaybackSchedule/
│   │                                   frameStateAt extended to
│   │                                   cars: CarSchedule[]; new
│   │                                   standingsAt shared derivation
│   ├── ContestScene.ts              (MODIFIED) - render the selected
│   │                                   track shape, N car markers with
│   │                                   trail/heading, live standings
│   │                                   sidebar, curated ticker; only the
│   │                                   player's board still flashes
│   └── contestFormatting.ts         (MODIFIED) - N-car standings/ticker
│                                       label formatting, replacing
│                                       leaderLabel's 2-car-only shape

tests/
├── unit/
│   ├── tracks.test.ts               (NEW) - selectTrack determinism,
│   │                                   catalog validity
│   └── playback.test.ts             (MODIFIED) - N-car schedule/frame
│                                       state, standingsAt derivation,
│                                       ticker curation rule
└── integration/
    └── result-scene.test.ts         (MODIFIED, if needed) - confirm
                                        presentation-layer changes don't
                                        alter final standings vs. 012's
                                        already-computed result
```

**Structure Decision**: Preserve the existing single-project split. Track
content lives under `src/content/` alongside other authored catalogs;
track *selection* (a pure, deterministic function) lives under
`src/simulation/` next to `012`'s own simulation code, even though a track
shape itself carries no simulation authority — this keeps every
deterministic, testable function under the same framework-free directory
regardless of whether it affects outcome or only presentation. Rendering
and formatting changes are confined to `src/scenes/`; `012-multi-ghost-
contest`'s contract is not modified by this feature.

## Delivery Order

1. Author the 3 fixed track shapes and `selectTrack(runSeed,
   pvpStageOrdinal)`. Test-first: determinism, valid closed-loop shape
   data, correct catalog-index bounds.
2. Extend `playback.ts`'s `PlaybackSchedule`/`frameStateAt` from 2 cars to
   `cars: CarSchedule[]`, and add the shared `standingsAt` derivation.
   Test-first: N-car schedule construction, live position ordering
   matches direct progress comparison (SC-003), player-only callout
   scoping.
3. Implement ticker curation (player's events always, rival "notable
   moments" only) as a pure function over `standingsAt` samples plus the
   existing `calloutEventsForLap`. Test-first: curation rule cases from
   spec.md Edge Cases.
4. Migrate `ContestScene` to render the selected track, N car
   markers/trails, the live standings sidebar, and the curated ticker;
   confirm the player's board-flash cue is unchanged and not extended to
   rivals.
5. Migrate `contestFormatting.ts`'s `leaderLabel` to an N-car standings
   label.
6. Tune the fixed watch duration/pacing formula against SC-006's
   qualitative bar (playtesting), not a new algorithm.
7. Run `npm test`, `npm run build`, `npm run lint` green; confirm zero
   discrepancy between standings-sidebar output and a direct progress
   comparison across a sample of resolved contests (SC-003/SC-004).

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
