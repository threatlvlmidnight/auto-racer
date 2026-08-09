# Implementation Plan: Entrant Selection & Named-Vehicle Garage

**Branch**: `010-entrant-vehicle-garage` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-entrant-vehicle-garage/spec.md`

## Summary

Require an explicit choice among the four committed entrants before creating a
run, then replace the prototype's generic three-slot board with the selected
entrant's named four-slot Power/Chassis/Flex vehicle and shared three-space
storage. Extend the framework-free simulation model with immutable run identity,
typed item installation content, pure placement previews/commands, and resolved
installation contributions in locked contest data. Phaser scenes render and
dispatch those contracts, with drag and select-then-destination paths sharing the
same command boundary and a responsive DOM/canvas shell supporting the existing
800x450 logical composition.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: One in-memory `Run` passed through Phaser scene data. Selection is
local presentation state until confirmation; confirmation atomically creates the
run with immutable identity, generated encounters, credits, and empty topology.
Cross-session resume remains out of scope.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts; focused integration tests for selection/run routing,
including the caller-owned active-run guard, garage command parity, typed contest
locking success/failure, and result continuity; Phaser scene presentation checks
plus browser interaction and viewport validation.

**Target Platform**: Modern desktop and mobile web browsers, with an 800x450
Phaser logical game size and responsive CSS/canvas presentation.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: Pure placement previews and run transitions are
synchronous; contest resolution remains a one-time pre-playback calculation;
the local browser check MUST complete entrant selection and one preparation
encounter through the 800x450 demo flow with stable animation, responsive focus
and activation, and no input-blocking stalls. No hardware-specific frame-rate
guarantee is introduced because the repository establishes none.

**Constraints**:
- Preserve the six-stage run, credits, sponsor rules, 10/12-lap PvP schedule,
  fixed ghost, deterministic contest resolution, and input-free playback.
- All entrants share base lap time, four active slots, three storage positions,
  and contest rules; only origin weighting, topology, identity, and presentation differ.
- Each deterministic draft draw uses the authoritative `0.75` home-origin branch
  and `0.25` all-other-origin branch; origin never changes legality or category.
- Every item has independent origin, Power/Chassis category, synergy tags, base
  behavior, authored Fitted behavior, and explicit Improvised disclosure.
- Every active-slot placement remains legal. Installation state is derived from
  item category plus slot type; there is no universal fit multiplier.
- Same-type slot order, mounting coordinates, adjacency, and item order have no
  gameplay meaning. Stable topology ordering exists only for rendering and snapshots.
- Missing or inconsistent identity/topology data routes to an unavailable state;
  it never selects an entrant or creates a generic fallback build.
- Route/controller code guards entrant-selection entry with current active-run
  context before invoking the pure run constructor; run construction validates
  only explicit entrant/content initialization inputs.
- Contest locking returns a discriminated typed success/failure result for
  invalid run, entrant, build, or topology context; expected failures do not throw.
- Required item information and actions cannot depend on hover, drag precision,
  color, or motion. Supporting text is at least 14 CSS px and interactive labels
  at least 16 CSS px at final display size.
- Acceptance requires completing entrant selection and one full preparation
  encounter independently by keyboard-only and touch-only paths, with all
  required information available without hover.
- Build Testing Access/Test Day from `specs/visual-overhaul.md` UI-FR-022 is a
  hard implementation and release gate. It must be completed and validated
  before feature 010 implementation begins; this feature does not absorb it.

**Scale/Scope**: Four entrants, four named vehicles, four fixed topologies,
four active slots and three storage positions per run, migration of 15 prototype
items, six Phaser scenes plus one entrant-selection scene, and local placeholder
portraits/silhouettes sufficient to distinguish the roster.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Selection and installation occur before contests. A locked immutable build resolves completely before read-only playback; no contest input is introduced. |
| II. Fairness | PASS | All entrants have equal baseline performance and capacity. No monetization or paid outcome advantage is added. |
| III. Transparency & Legibility | PASS | Placement preview exposes Fitted/Flexible/Improvised state and exact authored behavior; contest/result data attributes installation-derived contributions. |
| IV. Spectation-First | PASS | Entrant, vehicle, topology, and consequential installation behavior persist into playback and results using immutable result data. |
| V. Build Testing Access | BLOCKED | Feature 010 implementation and release cannot begin until the separately scoped Test Day/Build Testing Access slice in `specs/visual-overhaul.md` UI-FR-022 is completed and validated. This plan does not implement or waive that prerequisite. |
| VI. Async-First Architecture | PASS | The existing fixed recorded ghost remains the opponent; no live service or synchronization is introduced. |
| Product - 2D medium | PASS | Portraits, vehicle silhouettes, mounting plates, and scene presentation remain Phaser/DOM 2D assets. |
| Product - mechanical parity and topology | PASS | Four equal-capacity authored topologies implement the binding Power/Chassis/Flex and item-authored installation model exactly. |
| Product - theme | PASS | Local 2D roster and vehicle assets use the committed alternate-1901 identities without allowing period styling to hide mechanics. |
| Development Workflow | PASS | The feature is a vertical selection-to-contest slice. Strict test-first work is required for simulation-facing changes, resolving the constitution's testing-discipline TODO for this feature. |

Principles I-IV and VI and the product constraints pass. The overall
Constitution Check is currently **BLOCKED** by Principle V; implementation MUST
NOT begin while Build Testing Access/Test Day remains incomplete or unvalidated.
This is a prerequisite gate, not a justified constitutional violation, so no
Complexity Tracking waiver applies.

**Post-Phase-1 re-check**: The data model derives installation behavior without
mutating item definitions, the contracts make all UI input modes dispatch the
same pure commands, and locked contest snapshots contain enough identity and
attribution data for deterministic playback. Principles I-IV and VI remain
passing, but the overall plan remains **BLOCKED** under Principle V until Build
Testing Access/Test Day is completed and validated. No other constitutional or
design gate is unresolved.

## Project Structure

### Documentation (this feature)

```text
specs/010-entrant-vehicle-garage/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── entrant-garage-contract.md
└── tasks.md                         # Generated implementation backlog
```

### Source Code (repository root)

```text
src/
├── main.ts                          (MODIFIED) - register selection and responsive scaling
├── content/
│   ├── sample-data.ts               (MODIFIED) - migrate item definitions
│   └── entrants.ts                  (NEW) - four entrants, vehicles, topology, asset keys
├── simulation/
│   ├── types.ts                     (MODIFIED) - origin/category/topology/result types
│   ├── run.ts                       (MODIFIED) - immutable run identity and validation
│   ├── draft.ts                     (MODIFIED) - four-origin weighted/off-origin draws
│   ├── garage.ts                    (NEW) - pure preview, move, swap, replace, cancel contracts
│   ├── encounters.ts                (MODIFIED) - garage destinations and atomic acquisition
│   ├── laps.ts                      (MODIFIED) - item-authored installation behavior
│   ├── contest.ts                   (MODIFIED) - topology-aware immutable result snapshot
│   └── slots.ts, storage.ts         (REPLACED/REUSED through garage command boundary)
└── scenes/
    ├── TitleScene.ts                (MODIFIED) - route without run creation
    ├── EntrantSelectScene.ts        (NEW) - inspect, select, confirm
    ├── RunScene.ts                  (MODIFIED) - accept only confirmed run identity
    ├── PrepareScene.ts              (MODIFIED) - named garage and input parity
    ├── ContestScene.ts              (MODIFIED) - named vehicle topology tray
    ├── ResultScene.ts               (MODIFIED) - identity and installation attribution
    ├── entrantPresentation.ts       (NEW) - pure selection/detail model
    ├── garagePresentation.ts        (NEW) - pure responsive inspector/preview model
    └── existing formatters/theme    (MODIFIED as required, no domain decisions)

public/assets/
├── entrants/                        (NEW) - four local placeholder portraits/emblems
└── vehicles/                        (NEW) - four local vehicle silhouettes

tests/
├── unit/
│   ├── entrants.test.ts             (NEW)
│   ├── garage.test.ts               (NEW)
│   ├── draft.test.ts                (MODIFIED)
│   ├── run.test.ts                  (MODIFIED)
│   ├── laps.test.ts                 (MODIFIED)
│   ├── contest.test.ts              (MODIFIED)
│   └── existing simulation tests    (MIGRATED/REGRESSION)
└── integration/
    ├── entrant-run-flow.test.ts      (NEW)
    ├── garage-input-parity.test.ts   (NEW)
    ├── run-flow.test.ts              (MODIFIED)
    └── result-scene.test.ts          (MODIFIED)
```

**Structure Decision**: Preserve the existing single-project split. Domain
definitions and deterministic transitions stay framework-free under
`src/simulation`; authored roster/item content stays under `src/content`; Phaser
scenes consume pure presentation models and dispatch commands. A single
`garage.ts` ownership boundary replaces scene-specific board/storage mutations so
drag, pointer selection, touch, and keyboard activation cannot diverge.

## Delivery Order

0. Complete and validate the separately scoped Build Testing Access/Test Day
  slice required by constitution Principle V. This hard gate blocks feature 010
  implementation and release; it is not feature 010 runtime work.
1. Complete setup and the shared foundation: roster/item/topology types, catalog
  migration, validated `VehicleBuild`, fixtures, and unavailable-state handling.
2. Complete US1 entrant selection and run initialization. Explicit confirmation
  creates the immutable run identity and named empty vehicle that later garage
  behavior consumes; garage work does not precede or establish run identity.
3. Complete US2 named-garage topology, storage, and atomic commands, then US3
  item-authored Fitted/Flexible/Improvised previews and simulation behavior.
4. Complete US4 keyboard, touch/non-drag, pointer, reduced-motion, focus, and
  persistent-inspector parity on the finalized garage command/preview boundary.
5. Complete US5 deterministic `0.75` home-origin/`0.25` all-other-origin drafts,
  immutable contest locking, identity/topology continuity, and result attribution.
6. Complete polish: local assets, responsive layouts, documentation, full
  automated gates, and browser acceptance. Browser acceptance independently
  completes entrant selection and one full preparation encounter by keyboard-only
  and touch-only paths and checks the 800x450 flow for stable animation and no
  input-blocking stalls.

Each step must keep `npm test` and `npm run build` green before the next scene
surface is opened. Runtime code is not part of this planning command.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
