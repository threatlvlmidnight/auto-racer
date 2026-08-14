# Implementation Plan: Pre-Race Setup

**Branch**: `028-pre-race-setup` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-pre-race-setup/spec.md`

## Summary

Add a dedicated car-only setup phase before every scored contest. Every car
receives a three-position Driver Aggression control; seven selected items expose
six additional three-position control families when installed. Pure simulation
code derives eligibility, aggregates same-family sources, validates selections,
and locks versioned per-car setup evidence. Canonical contest resolution applies
each car's own setup before segment physics. The setup scene previews the exact
retained track and current/prospective stats without revealing opponents or
stakes. Test Day runs the uncommitted setup against that same track. Remembered
settings are optional, championship-local, and keyed by control family.

The existing proof implementation (`PreRaceScene.ts`, `raceSetup.ts`, and the
single brake-balance result field) is treated as a prototype to migrate, not the
finished contract: planning replaces its singular setup shape with a versioned
selection set, moves evidence per car, adds universal aggression, all seven
items, generated-rival parity, exact-track Test Day, remembering, and the full
layout/accessibility surface.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: In-memory `Run` state for championship-local remembered selections;
versioned immutable setup embedded in contest/ghost evidence. No backend in this
feature.

**Testing**: Vitest. Strict test-first for pure setup domain, validation,
simulation, generated-rival parity, Test Day boundaries, and scored routing.
Pure presentation-model tests plus Phaser integration/render verification for UI.

**Target Platform**: Modern desktop and mobile web browsers, existing 800×450
logical Phaser viewport; mouse, touch, and keyboard parity.

**Project Type**: Single-project 2D browser game

**Performance Goals**: Setup derivation is linear in four vehicle slots and
adds negligible contest cost; contest playback remains at the existing target
frame rate. No per-frame setup resolution.

**Constraints**:

- No live contest input or random driver-error/crash roll.
- No opponent, field, purse, sponsor, prediction, or odds data on setup.
- Preview, Test Day, and scored contest share one authoritative generated track.
- Every car uses its own validated setup under one versioned ruleset.
- Driver Aggression always exists; item controls require installed items only.
- Same-family item effects stack into one control; no arbitrary control cap.
- Balanced is byte-for-byte legacy behavior.
- Existing dirty worktree changes from features 025/027 must be preserved.

**Scale/Scope**: One universal family; six equipment families; seven authored
items; at most five visible controls (universal plus four distinct installed
families); eight-car contests; one new setup scene; Test Day and Results updates.

## Constitution Check

*GATE: Passed before Phase 0 research; re-checked after Phase 1 design.*

| Principle | Status | Plan evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Every selection is made and locked before contest start. Playback receives immutable evidence and offers no setup input. |
| II. Fairness | PASS | Universal strength and item eligibility rules are identical for all entrants and humans. Every rival uses its own legal setup under the same resolver. No monetization is involved. |
| III. Transparency & Legibility | PASS | Signed deltas, prospective totals, source items, retained per-car evidence, and Test Day inspection expose every outcome-changing value. |
| IV. Spectation-First | PASS | Setup evidence is retained per car for Results and future broadcast explanation; playback outcome remains canonical. |
| V. Build Testing Access | PASS | Test Day consumes the current temporary setup on the exact upcoming track and returns without scored mutation. |
| VI. Async-First Architecture | PASS | Versioned locked setup becomes part of recorded ghost state. Generated rivals are a deterministic temporary adapter. No live dependency is added. |
| Product: 2D | PASS | Uses the existing Phaser 2D scene and track/stat renderers. |
| Product: parity/topology | PASS | All cars receive identical Driver Aggression; equipment controls derive only from legitimately installed items within equal slot capacity. |
| Product: theme | PASS | Driver behavior and period equipment adjustments reinforce owner-builder competition. |
| Development Workflow | PASS | Strict test-first is adopted for all outcome math; UI uses pure presentation seams and visual verification. |

**Post-design re-check**: PASS. The data model makes setup a versioned per-car
input, not viewer-local state. Test Day and generated rivals use the same core
resolver, so no principle relies on a scene-specific exception.

## Project Structure

### Documentation (this feature)

```text
specs/028-pre-race-setup/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── race-setup-contract.md
└── tasks.md                     # Created by /speckit.tasks, not this pass
```

### Source Code (repository root)

```text
src/
├── content/items/
│   ├── mercer.ts                # steering-response authoring
│   ├── soto.ts                  # gearing authoring
│   ├── rook.ts                  # pitch, brake-balance, racing-line
│   └── voss.ts                  # bodywork-trim, brake-balance
├── simulation/
│   ├── types.ts                 # setup authoring, selections, evidence, ghost shape
│   ├── raceSetup.ts             # pure catalog/eligibility/aggregation/lock/validation
│   ├── laps.ts                  # applies total setup deltas before segment physics
│   ├── contest.ts               # per-car setup parity and evidence retention
│   ├── rivals.ts                # deterministic temporary rival setup adapter
│   ├── practice.ts              # temporary setup + exact upcoming track
│   └── run.ts                   # remember-setup championship-local state
├── scenes/
│   ├── PreRaceScene.ts          # responsive car/track/setup surface
│   ├── raceSetupPresentation.ts # pure labels, rows, signed totals, layout model
│   ├── RunScene.ts              # PvP routes to setup
│   ├── ContestScene.ts          # consumes locked race input only
│   ├── TestDayScene.ts          # setup-origin temporary practice route
│   └── ResultScene.ts           # per-car setup evidence inspection
└── main.ts                      # scene registration

tests/
├── fixtures/
│   └── race-setup-fixtures.ts
├── unit/
│   ├── raceSetup.test.ts
│   ├── raceSetupPresentation.test.ts
│   ├── laps.test.ts
│   ├── contest.test.ts
│   └── rivals.test.ts
└── integration/
    ├── run-flow.test.ts
    ├── test-day-flow.test.ts
    ├── test-day-boundaries.test.ts
    └── result-scene.test.ts
```

**Structure Decision**: Keep the simulation framework-free and centralize all
setup rules in `simulation/raceSetup.ts`. Scenes consume pure models and never
calculate deltas, eligibility, or opponent setup. Extend existing contest,
practice, run, and result boundaries rather than introducing a second race
pipeline.

## Delivery Order

1. Replace the proof singular setup types with the versioned selection-set data
   model and frozen launch control catalog. Add failing contract tests first.
2. Author all seven items and implement installed-only eligibility,
   same-family aggregation, Balanced defaults, validation, and total-delta fold.
3. Apply setup independently to player and rival lap physics; retain evidence
   per car; add exhaustive lowest-full-race-time generated-rival selections and
   parity tests.
4. Add championship-local Remember setup state with dormant family values and
   strict no-eligibility-from-memory behavior.
5. Build pure setup presentation models and the responsive `PreRaceScene` for
   one through five controls, using existing track/stat renderers, the validated
   entrant's canonical vehicle art over the vehicle-free background, and no
   opponent or stakes data.
6. Wire exact-track Test Day snapshots and exact-origin return without writing
   remembered/scored state.
7. Extend Results to inspect each car's recorded setup without inference.
8. Run focused suites, full `npm test`, `npm run lint`, `npm run build`, and
   browser/render checks at the 800×450 logical viewport.

## Complexity Tracking

No constitutional violations require justification.
