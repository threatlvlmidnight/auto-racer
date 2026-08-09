# Implementation Plan: Multi-Ghost Contest

**Branch**: `012-multi-ghost-contest` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-multi-ghost-contest/spec.md`

## Summary

Replace the single fixed-pace `SampleGhost` opponent with a field of 7
authored rival profiles (8 cars total, including the player) for scored PvP
contests. Each rival profile resolves, at a given in-run level, into a real
`VehicleBuild` — reusing one of the four existing named-vehicle topologies
and drawing items from the existing `ITEM_POOL` through the existing
deterministic draft mechanism — so every rival runs through the exact same
`simulatePlayerLaps` pipeline the player's own build does. `resolveContest`
is extended from a two-sided (player, ghost) result to an N-car ranked
result. Test Day/Practice mode is explicitly untouched.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. Rival profiles are static authored
content bundled with the client, the same way `ITEM_POOL`, `SAMPLE_GHOST`,
and the entrant/vehicle catalog are today.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts: rival profile resolution (determinism across
repeated calls, level-scaling), the extended N-car `resolveContest`
(ranking, tie-break, zero-decorative-car invariant), and migration of every
existing single-ghost consumer/test to the new shape. Focused scene-level
checks for the minimal N-car track presentation.

**Target Platform**: Modern desktop and mobile web browsers, existing 800x450
Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: Contest resolution remains a single synchronous
precomputation before playback, same as today; extending from 2 cars to 8
multiplies existing per-lap work by a small constant factor and introduces
no new asymptotic cost. No new hardware-specific frame-rate guarantee.

**Constraints**:
- No live or non-deterministic behavior anywhere in resolution: rival build
  generation, lap simulation, and standings/tie-break all derive from
  (player build, rival roster, run level, seed) alone (Constitution
  Principle I, amended v1.3.0; Principle III).
- Every rival counts toward standings; no decorative-only car.
- Rival profile pool is identical for every player entrant (Constitution
  Principle II, Fairness) — no origin/entrant-conditioned rival roster.
- No live contact, collision, or wrecking between cars.
- Test Day/Practice mode (`011-build-test-day`) is unmodified; it keeps
  racing against `SAMPLE_GHOST`.
- The existing single fixed oval track, 800x450 canvas, and
  `Phaser.Scale.FIT` presentation are unchanged; only the number of moving
  markers and the standings/result surface grow to N cars. The richer
  procedural-track/particle presentation belongs to the separate
  `race-spectacle` feature.
- Existing credits, sponsor rules, six-stage run schedule, and 10/12-lap
  scheduling are unchanged; only what a scored PvP contest resolves
  *against* changes.

**Scale/Scope**: 7 authored rival profiles, each resolvable across the run's
two existing PvP-stage ordinals (today's only two "levels"); reuse of the 4
existing named-vehicle topologies and the 20-item `ITEM_POOL` for rival
builds; migration of `resolveContest`'s 3 existing consumers
(`ContestScene`, `contestFormatting`, `ResultScene`) and their tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Rival roster, profile resolution, and all standings are precomputed before playback; nothing in this feature introduces live input or a live opponent. Amended v1.3.0 language ("one or more recorded ghosts") is what makes this feature constitutional in the first place. |
| II. Fairness | PASS | Rival profile pool is identical across all four entrants (FR-010); no purchasable content affects roster or outcome. |
| III. Transparency & Legibility | PASS | Every rival resolves into a real, inspectable `VehicleBuild` through the same simulation code as the player — a rival's strength is always "what it has installed," never a hidden number. |
| IV. Spectation-First | PASS | An 8-car field with full standings is strictly more watchable/comparable than today's 1v1 result; the richer visual treatment is deliberately deferred to `race-spectacle` rather than blocking this feature. |
| V. Build Testing Access | PASS | Untouched — FR-011 explicitly keeps Test Day/Practice mode on the existing single fixed-pace reference. |
| VI. Async-First Architecture | PASS | All 7 rivals remain locally computed authored content, not live opponents or a live service; real async multiplayer is explicitly out of scope (Assumptions). |
| Product - 2D medium | PASS | No change to visual medium; extends existing Phaser presentation. |
| Product - mechanical parity and topology | PASS | Rival builds reuse the same four equal-capacity topologies and Fitted/Flexible/Improvised rules already binding on player builds — no new capacity or legality rule is introduced for rivals. |
| Product - theme | PASS | No new content requires new theme decisions; rival builds draw from the already-themed item catalog. |
| Development Workflow | PASS | Vertically sliced: this feature alone makes the full field visible and scoreable, independent of `race-spectacle`'s later visual polish. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model resolves rival builds through the
existing `VehicleBuild`/`simulatePlayerLaps` path with no new simulation
engine, and the extended contest result stays a pure function of (player
build, rival roster, level, seed). All principles above remain PASS; no new
gate is introduced by the Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/012-multi-ghost-contest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── multi-ghost-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── content/
│   └── rivals.ts                    (NEW) - 7 rival profiles: id, name, color,
│                                       vehicleId, level-scaling rule
├── simulation/
│   ├── types.ts                     (MODIFIED) - RivalProfile, CarResult,
│   │                                   N-car ContestResult shape
│   ├── rivals.ts                    (NEW) - resolveRivalBuild(profile, level, seed)
│   │                                   -> VehicleBuild, reusing draft.ts's
│   │                                   deterministic draw
│   └── contest.ts                   (MODIFIED) - resolveContest extended to
│                                       (playerBuild, rivalRoster, level, seed,
│                                       lapCount) -> ranked N-car result
└── scenes/
    ├── ContestScene.ts              (MODIFIED) - render N markers on the
    │                                   existing oval; minimal extension only
    ├── ResultScene.ts               (MODIFIED) - full ranked standings
    └── contestFormatting.ts         (MODIFIED) - N-car label/gap formatting

tests/
├── unit/
│   ├── rivals.test.ts               (NEW)
│   └── contest.test.ts              (MODIFIED) - N-car ranking, ties,
│                                       determinism, migrated 1v1 cases
└── integration/
    ├── run-flow.test.ts             (MODIFIED) - PvP stages resolve against
    │                                   the 8-car field
    └── result-scene.test.ts         (MODIFIED) - full standings rendering
```

**Structure Decision**: Preserve the existing single-project split. Rival
content lives under `src/content/` alongside `entrants.ts`/`sample-data.ts`;
rival build resolution is a new framework-free `src/simulation/rivals.ts`
module reusing `draft.ts`'s existing deterministic draw rather than
inventing a second selection mechanism; `contest.ts` is extended, not
replaced, so its determinism invariants continue to hold. Scene changes are
deliberately minimal (N markers, full standings) — the richer race
presentation is `race-spectacle`'s job, not this feature's.

## Delivery Order

1. Author the 7 rival profiles and `resolveRivalBuild` (profile, level,
   seed) -> `VehicleBuild`, reusing existing vehicle topologies and the
   deterministic draft draw. Test-first: determinism across repeated calls,
   level-scaling produces measurably different stats, missing-profile
   failure mode.
2. Extend `resolveContest` to accept a rival roster and level, producing a
   ranked N-car result with a documented tie-break. Test-first: full
   standings shape, zero-decorative-car invariant, determinism, migrated
   1v1 regression cases.
3. Migrate `ContestScene`, `ResultScene`, and `contestFormatting` to the new
   result shape — minimal visual extension (N markers on the existing
   oval), full standings on the result screen.
4. Confirm Test Day/Practice mode (`011-build-test-day`) compiles and
   behaves unchanged against `SAMPLE_GHOST` (FR-011) — regression only, no
   new work.
5. Run `npm test`, `npm run build`, `npm run lint` green; confirm zero
   tests silently exercise the old 1v1-only contract (SC-005).

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
