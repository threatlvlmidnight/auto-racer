# Implementation Plan: Item Adjacency Buffs

**Branch**: `041-item-adjacency-buffs` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-item-adjacency-buffs/spec.md`

## Summary

Add a framework-free, versioned adjacency resolver over consecutive authored
vehicle slot IDs. Four existing items—one per origin—gain a flat canonical-stat
clause targeting an adjacent category or synergy tag. Resolution is additive
from one immutable snapshot, source tier is the only magnitude scaler, and
storage/coordinates/render order are excluded. The same resolution feeds live
garage preview, normalized build stats, Test Day, scored races, and retained
evidence. Existing item/presentation surfaces gain code-native link and text
models; no generated art is in scope. Automated implementation is DeepSeek-safe;
final qualitative browser review is frontier/owner-only.

## Technical Context

**Language/Version**: TypeScript 5.5, ES modules

**Primary Dependencies**: Existing Phaser 3.80 presentation, Vite 5.4 build,
framework-free simulation modules; no new runtime dependency

**Storage**: In-memory run/build state and immutable contest/Test Day snapshots;
no database or new persistence

**Testing**: Vitest. Strict test-first for graph, validation, stat composition,
preview parity, and contest determinism; existing integration conventions for
scene/presentation projections

**Target Platform**: Existing browser game and GitHub Pages production build

**Project Type**: Single-project 2D web game

**Performance Goals**: One bounded resolution per build/projection; for four
slots, at most three graph edges, eight authored source items in a synthetic
maximum-density fixture, and `O(slot count × clauses × degree)` work. No
per-frame or per-playback-tick resolution.

**Constraints**: Simulation modules remain Phaser-free; no coordinate-derived
authority; no recursive propagation; normalized canonical stats only; source
tier is the only scaler; existing non-adjacency builds remain deep-equal; no
art generation or manual screenshot work in the coding handoff

**Scale/Scope**: One resolver and validator, one placement-diff projection,
four retrofitted catalog items, existing preparation/inspector/result surfaces,
focused unit/integration coverage, and one explicitly separate manual QA gate

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **I. Prepare → Contest Integrity**: PASS. Placement occurs during preparation;
  contest playback consumes a locked deterministic resolution and has no input
  or recomputation path.
- **II. Fairness**: PASS. Adjacency is ordinary draftable item behavior. No
  purchase, subscription, or external entitlement changes its value.
- **III. Transparency & Legibility**: PASS and load-bearing. Static clauses,
  active/inactive neighbors, preview diffs, exact point evidence, and retained
  post-race attribution are required by contract.
- **IV. Spectation-First**: PASS. Retained target-attributed evidence is
  available to race/result inspectors without changing playback authority.
- **V. Build Testing Access**: PASS. Test Day consumes the same locked adjacency
  authority as scored contests and exposes the same contribution evidence.
- **VI. Async-First Architecture**: PASS. The resolver is deterministic and
  versioned, and incompatible evidence is rejected. Feature 038 may transport it
  later without introducing live competition here.
- **Mechanical parity/topology**: PASS. Every vehicle keeps four active slots
  and its existing type distribution. Adjacency reads the stable authored order
  without adding capacity or a vehicle-exclusive rule.
- **2D constraint**: PASS. Presentation uses existing 2D code-native panels,
  badges, and optional connectors; no 3D or asset pipeline change.

**Post-design result**: All gates still PASS. No Complexity Tracking entry is
required. The test-discipline TODO is resolved locally in favor of strict
test-first work for every simulation-facing task in this feature.

## Project Structure

### Documentation (this feature)

```text
specs/041-item-adjacency-buffs/
├── analysis.md
├── clarification-questionnaire.md
├── data-model.md
├── intake.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
├── tasks.md
├── checklists/
│   └── requirements.md
└── contracts/
    └── adjacency-contract.md
```

### Source Code (repository root)

```text
src/
├── content/
│   └── items/
│       ├── mercer.ts        # Brass-Fitted Toolbox clause
│       ├── soto.ts          # Chain Tensioner clause
│       ├── rook.ts          # Interchangeable Test Mounts clause
│       └── voss.ts          # Sealed Instrument Case clause
├── simulation/
│   ├── types.ts             # Clause, graph, link, contribution, resolution types
│   ├── adjacency.ts         # NEW: graph, validation, resolver, link diff helpers
│   ├── tiering.ts           # source-tier scaling for adjacency clauses
│   ├── garage.ts            # reusable non-mutating prospective-build projection
│   ├── laps.ts              # canonical stat/evidence integration
│   ├── practice.ts          # retain/validate Test Day resolution
│   ├── raceSetup.ts         # retain/validate scored pre-race resolution boundary
│   └── contest.ts           # propagate locked evidence into immutable result
└── scenes/
    ├── adjacencyPresentation.ts # NEW: pure text/link/preview/evidence models
    ├── garagePresentation.ts    # slot and inspector adjacency projections
    ├── itemPresentation.ts      # compact/full clause and evidence rows
    ├── PrepareScene.ts          # pointer/keyboard/touch placement integration
    ├── PreRaceScene.ts          # locked aggregate/evidence projection
    ├── TestDayScene.ts          # retained adjacency inspection
    ├── ContestScene.ts          # retained-only race inspector consumption
    └── ResultScene.ts           # retained-only result inspector consumption

tests/
├── fixtures/
│   └── adjacency-fixtures.ts
├── unit/
│   ├── adjacency.test.ts
│   ├── tiering.test.ts
│   ├── laps.test.ts
│   ├── garage.test.ts
│   ├── adjacencyPresentation.test.ts
│   └── items.test.ts
└── integration/
    ├── adjacency-flow.test.ts
    ├── pre-race-setup.test.ts
    ├── practice.test.ts
    └── result-scene.test.ts
```

**Structure Decision**: Add one simulation authority and one pure presentation
projection module, then extend existing lock, stat, garage, and inspector paths.
The new resolver does not enter a Phaser scene and no scene owns adjacency math.
The exact lock/result type may live in an existing shared result structure
rather than adding redundant parallel snapshots, but the versioned resolution
must be retained once and validated at the existing boundaries.

## Implementation Sequence

1. Establish fixtures and failing graph/content/validation tests.
2. Add types, graph derivation, content validation, resolver, deterministic
   ordering, source-tier scaling, and no-recursion proofs.
3. Add canonical-stat and item-evidence integration; prove non-adjacency parity.
4. Add non-mutating garage projection and exact before/after link diffs.
5. Add pure presentation models and existing scene integration for preparation,
   Test Day, scored race, and Results.
6. Retrofit exactly four items and run catalog/balance-boundary tests.
7. Run focused and repository-wide automated gates.
8. Stop before manual browser verification; frontier/owner performs that gate.

## Complexity Tracking

No constitutional violations or justified complexity exceptions.
