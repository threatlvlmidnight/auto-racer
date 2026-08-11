# Implementation Plan: Track Generation

**Branch**: `018-track-generation` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-track-generation/spec.md`

## Summary

Replace `013-race-spectacle`'s hand-plotted `Track.points` catalog with a
deterministic generator: `generateTrack(seed, pvpOrdinal)` builds a
closed sequence of alternating straight and corner `TrackSegment`s using
a seeded, pure PRNG (no live/unseeded randomness), guarantees a
non-self-intersecting loop by construction (every corner turns the same
direction; turn angles sum to exactly 360°), and derives both a
renderable point path (so `013`'s existing `pointAtProgress`-based
rendering needs zero changes) and three bounded characteristic scores
(`corneringDemand`, `brakingDemand`, `powerDemand`) purely from that
segment sequence. A build's existing `installationCategory`
(power/chassis) composition is folded into an optional, additive
`track` parameter on `simulatePlayerLaps`: a new lap-level, inspectable
`trackFit` adjustment (mirroring the existing `clampAdjustment` pattern)
nudges lap time based on how well the build's power/chassis lean
matches the track's cornering-vs-power lean. Every existing call site
that doesn't pass a track is byte-for-byte unaffected.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency
— the seeded PRNG is a small (~10 line) pure function local to this
feature, not a library.

**Storage**: N/A — generated tracks are recomputed on demand from
`(seed, pvpOrdinal)`, never persisted; identical inputs always
regenerate an identical result (FR-002), so there is nothing to store.

**Testing**: Vitest. Strict test-first coverage for every changed
`src/simulation/` contract: generation determinism/closure/bounds,
characteristic-score derivation, `simulatePlayerLaps`'s new optional
track parameter (both the "omitted → unchanged" and "supplied → real
effect" cases), and `resolveContest`'s per-contest track generation.
Full regression pass confirming every pre-existing `012`/`013` test
still passes against generated tracks.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: One `generateTrack` call per resolved
contest (not per car, not per lap) — trivial cost, same order of
magnitude as today's `selectTrack` array lookup. Track-fit's per-lap
computation is O(1) per lap, same complexity class as the existing
installation/synergy folds.

**Constraints**:
- No live/unseeded randomness anywhere in generation (Constitution
  Principle I) — `generateTrack` MUST be a pure function of
  `(seed, pvpOrdinal)` only.
- Generated segment sequences MUST be structurally guaranteed
  non-degenerate — closure and simplicity come from the generation
  algorithm's own invariants (uniform turn direction, exact 360° turn
  sum, bounded per-segment minimums), not from post-hoc validation
  (FR-003).
- `simulatePlayerLaps`'s existing signature MUST remain callable exactly
  as today; the new `track` parameter MUST be optional and default to
  today's track-agnostic behavior (FR-007) — every one of the ~250
  existing calls across `laps.test.ts`, `contest.test.ts`,
  `playback.test.ts`, and every scene/practice call site stays
  unchanged.
- `013-race-spectacle`'s `pointAtProgress`, standings, and commentary
  code MUST NOT change — a generated track's derived `points` field is
  the only thing they consume, exactly as today (FR-011).
- No new authored field on `ItemDefinition` — build track-fit reuses
  the existing `installationCategory` value only (FR-006).
- Every value this feature introduces MUST be inspectable after a race
  resolves (FR-012, Constitution Principle III) — track-fit's per-lap
  effect is a new named field on the lap result, not folded silently
  into the total.
- No mechanic introduced here may vary by player entrant or purchasable
  content beyond the existing, already-legal Power/Chassis/Flex
  topology difference every entrant already has (Constitution
  Principle II; Product Constraints "mechanical parity").

**Scale/Scope**: One new module (`src/simulation/trackGeneration.ts` or
folded into the existing `src/simulation/tracks.ts` — see Project
Structure), one new pure scoring function, one widened
`simulatePlayerLaps` signature, one new `PlayerLap`/`LapBreakdown`
field, one `resolveContest` integration point (both legacy and N-car
paths), removal of the hand-authored `TRACKS` catalog and
`content/tracks.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Track generation and track-fit are both pure, deterministic, precomputed before/at contest resolution — no live input or live randomness at any point during a watched race. |
| II. Fairness | PASS | Track-fit derives only from a build's own installed items (`installationCategory`), which every entrant/vehicle can install identically regardless of purchasable content or identity; no purchasable content affects it (FR-006, FR-008). |
| III. Transparency & Legibility | PASS | Track characteristics (FR-004) and the per-lap track-fit adjustment (FR-012) are both new inspectable values, following the same attribution pattern already established for installation/synergy/tier contributions. |
| IV. Spectation-First | PASS | Generated tracks render through `013`'s existing spectation-first presentation unchanged (FR-011, US3); no regression to watchability. |
| V. Build Testing Access | PASS | Practice/Test Day reuses the same public `simulatePlayerLaps`/`generateTrack` primitives scored mode uses — no separate practice-only track logic (spec.md Assumptions). |
| VI. Async-First Architecture | PASS | No live service; generation and scoring are pure local functions. |
| Product - 2D medium | PASS | No new rendering technology — generated tracks still resolve to the same 2D point-path `Track.points` shape `013` already renders. |
| Product - mechanical parity and topology | PASS | Track-fit is a *build composition* effect (which items are installed), not a *vehicle identity* effect — every vehicle can install any legal item in any slot per existing rules; no vehicle is structurally better or worse at track-fit than the topology rules already in place allow (Product Constraints already permit differing Power/Chassis/Flex distribution). |
| Product - theme | PASS | No new vocabulary; "cornering," "braking," "power" are already the vocabulary items/installation use. |
| Development Workflow | PASS | Vertically sliced: US1 (generation+scoring) is independently testable and demoable before US2 (simulation wiring) exists; US3 is pure regression verification. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: Data model additions (`TrackSegment`,
widened `Track`, `TrackCharacteristics`, `PlayerLap.trackFit`) are all
additive/optional; no existing contract is narrowed or removed except
the hand-authored `TRACKS` catalog itself, which `013`'s own code never
depended on by *value* (only through `selectTrack`'s return type,
`Track`, which is preserved). All principles above remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/018-track-generation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── track-generation-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── simulation/
│   ├── tracks.ts                    (MODIFIED) - Track/TrackSegment/
│   │                                   TrackCharacteristics types,
│   │                                   generateTrack replaces
│   │                                   selectTrack, pointAtProgress
│   │                                   unchanged (reads derived
│   │                                   `points` exactly as today)
│   ├── laps.ts                      (MODIFIED) - simulatePlayerLaps
│   │                                   gains an optional `track`
│   │                                   parameter; folds a new
│   │                                   trackFit adjustment when
│   │                                   supplied
│   ├── contest.ts                   (MODIFIED) - both resolveContest
│   │                                   overloads generate one track
│   │                                   per contest and pass it to
│   │                                   every car's simulatePlayerLaps
│   │                                   call
│   └── types.ts                     (MODIFIED) - PlayerLap/
│                                       LapBreakdown gain an optional
│                                       trackFit field
└── content/
    └── tracks.ts                    (REMOVED) - hand-authored TRACKS
                                        catalog is fully replaced by
                                        generation

tests/
├── unit/
│   ├── tracks.test.ts               (MODIFIED) - generation
│   │                                   determinism, closure,
│   │                                   non-degeneracy, characteristic
│   │                                   score derivation
│   ├── laps.test.ts                 (MODIFIED) - track-fit fold:
│   │                                   omitted-track parity,
│   │                                   power/chassis-lean effect
│   │                                   direction, neutral-build
│   │                                   no-op
│   └── contest.test.ts              (MODIFIED) - per-contest track
│                                       generation, identical track
│                                       applied to every car
└── integration/
    └── ...                          (MODIFIED as needed) - regression
                                        confirming 012/013 presentation
                                        still passes against generated
                                        tracks
```

**Structure Decision**: Extend `src/simulation/tracks.ts` in place
rather than adding a new module — `Track`, `TrackSegment`,
`TrackCharacteristics`, and `generateTrack` are all one cohesive
"what is a track" concern, and this file is already `013`'s
established home for track logic (`pointAtProgress`, `selectTrack`).
Splitting generation into its own file would separate the segment model
from the geometry functions that consume it for no benefit.

## Delivery Order

1. **Foundational**: Define `TrackSegment`/widened `Track`/
   `TrackCharacteristics` types; implement the seeded PRNG and
   `generateTrack(seed, pvpOrdinal)` with its closure/non-degeneracy
   guarantees; implement `deriveTrackPoints` (segments → renderable
   point path) and the three characteristic-scoring functions.
   Test-first: determinism, closure, bounds, score derivation — all
   pure functions, no simulation/presentation wiring yet.
2. **US1**: Replace `selectTrack`/`TRACKS` with `generateTrack`
   throughout `013`'s consumers; remove `content/tracks.ts`. Confirm
   `013`/`012` presentation and tests pass unchanged against generated
   tracks (this also covers US3's verification goal, landing it
   alongside US1 rather than as separate work).
3. **US2**: Add the build track-fit derivation (power/chassis lean from
   `installationCategory`); widen `simulatePlayerLaps` with the
   optional `track` parameter and its `trackFit` fold; wire both
   `resolveContest` overloads to generate one track per contest and
   apply it to every car. Test-first: omitted-parameter parity first
   (must stay green throughout), then the real effect.
4. **Polish**: Full regression (`npm test`, `npm run build`,
   `npm run lint`); grep for any remaining reference to the removed
   `TRACKS`/`selectTrack`; quickstart validation in the browser.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
