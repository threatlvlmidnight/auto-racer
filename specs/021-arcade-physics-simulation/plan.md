# Implementation Plan: Arcade Physics Simulation

**Branch**: `021-arcade-physics-simulation` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-arcade-physics-simulation/spec.md`

## Summary

Replace `simulatePlayerLaps`' flat-scalar lap time (a `baseLapTime` plus a
sum of per-item flat seconds deltas) with a real, deterministic point-mass
physics simulation when a track is supplied: a build resolves to four
physical stats (acceleration, top speed, braking power, cornering speed),
and lap time is computed by walking the track's actual segment sequence —
accelerating and cruising on straights, braking into and out of each
corner's own entry/apex/exit sub-phases — using closed-form kinematics
(the standard trapezoidal velocity-profile formula), never a per-tick
physics loop. This replaces `018`'s `buildTrackLean`/`trackFit` (a
build-composition-ratio hack that violated this project's own "every bonus
traces to a specific item" rule) with something that both traces to real
items and is sensitive to a track's actual shape, not a lossy aggregate
score. The legacy 2-car path and every existing `timeModifier`-only item
are byte-for-byte unaffected.

## Technical Context

**Language/Version**: TypeScript (existing project toolchain — Phaser 3,
Vite, Vitest, ESLint; no version change)

**Primary Dependencies**: None new. The kinematics involved (SUVAT/
trapezoidal velocity-profile equations) are closed-form algebra — `Math.sqrt`
and basic arithmetic — not a physics engine. Matches `018`'s own "no new
runtime dependency" precedent.

**Storage**: N/A — pure in-memory simulation, same as every existing
`src/simulation/` module.

**Testing**: Vitest, strict test-first (RED before implementation), matching
this repository's established convention for every `src/simulation/`
contract.

**Target Platform**: Existing web build (Vite + Phaser 3), no platform
change.

**Performance Goals**: A full N-car (8-car) contest resolves synchronously
within the same practical budget `018`'s `generateTrack` + `resolveContest`
already meet — each car's lap time is now `O(corners)` closed-form
kinematics per lap, not a per-tick integration, so this is not a
performance-sensitive change.

**Constraints**: Every `src/simulation/` module stays framework-free (zero
Phaser imports) — scenes only render precomputed results, matching every
prior feature's convention. No behavior change permitted to any call site
that doesn't opt into a `track` argument (FR-007/FR-008).

**Scale/Scope**: One feature; touches `src/simulation/laps.ts` (the core
rewrite), `src/simulation/tracks.ts` (removes `buildTrackLean`/`trackFit`/
`TRACK_FIT_MAX_PERCENT`, adds corner arc-length), `src/simulation/types.ts`
(new `PhysicalStats`/`ItemPhysicsContribution`/phase-breakdown types), and
`src/scenes/runPresentation.ts` (`toLegacyContestResult` gains `physics` in
its `laps` mapping, so `run.history` carries it too — `/speckit.analyze`
finding I1). `src/simulation/contest.ts` requires **zero** changes — its
existing `generateTrack`/shared-`Track` wiring, already shipped with `018`,
already puts a track exactly where `simulatePlayerLaps` needs one (research.md
Decision 7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Prepare → Contest Integrity**: PASS. Simulation stays deterministic
  and precomputed — no live input, no non-deterministic randomness during
  playback. The physics model is closed-form algebra evaluated once per
  car per lap, not a live/interactive simulation.
- **II. Fairness**: PASS. Physical stats are earned entirely through
  held items, identical mechanism to every existing item effect — no
  purchasable-content path exists in this codebase to begin with.
- **III. Transparency & Legibility**: PASS, and this is the principle this
  feature is most directly answerable to. Every physics-derived lap time
  MUST decompose into inspectable phases (FR-009) and every item's
  contribution to the four physical stats MUST be a plain, visible number
  (Research Decision 5 below) — no black-box total. This is *stricter*
  than what it replaces: `018`'s `buildTrackLean` was itself already a
  borderline case (a ratio, not a per-item number) that this feature
  corrects.
- **IV. Spectation-First**: PASS. FR-012 requires zero change to
  `013-race-spectacle`'s rendering, `pointAtProgress`, standings, or
  commentary — the track still visually renders and animates exactly as
  today; only the number driving *how fast* a car moves through it changes.
- **V. Build Testing Access**: PASS. Test Day/Practice (the legacy 2-car
  `resolveContest` overload) is explicitly unaffected (FR-011) — same
  precedent `018` already established for the same reason (no
  `seed`/`level`/track concept exists on that path). Players can still test
  builds there; they simply don't get track-aware physics feedback there,
  same as they don't get `trackFit` feedback there today.
- **VI. Async-First Architecture**: PASS. No live opponent, no matchmaking
  dependency — every rival's lap is precomputed the same way the player's
  is.

**Result**: All gates PASS. No Complexity Tracking entries required.

**Post-design re-check** (after Phase 1 — `data-model.md`/`contracts/`):
Confirmed still PASS on every principle. Notably, Principle III came out
*stronger* than the pre-design assessment predicted: Research Decision 5's
stat-level item attribution plus lap-level phase attribution gives a
concrete, testable "no unexplained remainder" contract (`Σ phases[].seconds
= totalSeconds`, contracts §3/§4) that `018`'s `trackFit` never had to
satisfy. No new violation surfaced during data-model design; no
Complexity Tracking entries added.

## Project Structure

### Documentation (this feature)

```text
specs/021-arcade-physics-simulation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── physics-simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/simulation/
├── laps.ts        # simulatePlayerLaps — core rewrite: physics-aware lap
│                  # time when a track is supplied, byte-for-byte unchanged
│                  # otherwise (FR-007/FR-008)
├── tracks.ts       # buildTrackLean/trackFit/TRACK_FIT_MAX_PERCENT removed;
│                  # new corner arc-length + apex-speed formulas added
└── types.ts        # PhysicalStats, ItemPhysicsContribution, LapPhase
                     # breakdown types; PlayerLap/LapBreakdown extended

src/scenes/
└── runPresentation.ts  # toLegacyContestResult's laps mapping gains
                         # physics, so run.history's post-race review
                         # carries it too, not just the live NCarContestResult
                         # ResultScene.ts already reads directly
                         # (/speckit.analyze finding I1)

# contest.ts requires ZERO changes — its existing generateTrack/shared-Track
# wiring already puts a track exactly where simulatePlayerLaps needs one
# (research.md Decision 7, confirmed directly against the current code).

tests/unit/
├── laps.test.ts     # new physics-path tests, alongside untouched existing
│                  # timeModifier-path tests
├── tracks.test.ts   # buildTrackLean/trackFit tests removed; new corner
│                  # arc-length tests added
└── contest.test.ts  # N-car physics wiring tests

tests/integration/
└── run-flow.test.ts  # toLegacyContestResult physics-preservation test
```

**Structure Decision**: Extends the existing `src/simulation/` module
layout in place — no new files, no new module boundary. Mirrors `018`'s
own decision to extend `tracks.ts`/`laps.ts` rather than introduce a
parallel physics module, since this is a rewrite of what `simulatePlayerLaps`
already does when given a track, not a new subsystem alongside it.

## Delivery Order

1. **Foundational** — `PhysicalStats`/`ItemPhysicsContribution`/phase types;
   corner arc-length + apex-speed formulas in `tracks.ts`; the trapezoidal
   inter-apex-span kinematics function, unit-tested in isolation against
   stock stats only (no items, no build wiring yet).
2. **US1** — Full per-lap simulation for a stock build (no physics-stat
   items) against a real generated track, proving the segment-walking
   engine produces correct, deterministic, shape-sensitive lap times.
3. **US4** — Confirm zero regression: legacy no-track path and every
   existing `timeModifier`-only item byte-for-byte unchanged. Ordered
   before US2 deliberately — the regression guard must exist before new
   behavior is layered on, mirroring `018`'s own T025-before-T026 ordering.
4. **US2** — Items carry `ItemPhysicsContribution`; build stats aggregate
   from stock + held items; the actual build-vs-track payoff.
5. **US3** — Full phase/item-attribution breakdown surfaced on
   `PlayerLap`/`LapBreakdown`.
6. **Polish** — Remove `018`'s `buildTrackLean`/`trackFit`/
   `TRACK_FIT_MAX_PERCENT` entirely, full regression, quickstart validation.
