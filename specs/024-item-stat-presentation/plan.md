# Implementation Plan: Item Stat Presentation

**Branch**: `024-item-stat-presentation` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-item-stat-presentation/spec.md`

## Summary

Replace the current icon-and-name cards plus hover-only text tooltip with a
shared, data-first item presentation system. A pure formatter converts an
authoritative `ItemDefinition` and explicit view context into a compact card,
a persistent full inspector, and optional placement or lap-resolved evidence.
Reusable Phaser renderers consume those models in Reward Draft, Parts Supplier,
garage slots, storage, race playback, scored results, and Test Day. Compact
cards prioritize readable typography and signed stat lines; the smaller icon
becomes supporting identity. Selection persistently opens the inspector,
hover remains an optional preview, and both drag-and-drop and select-then-place
commit through the existing garage commands.

The existing lap evidence is insufficient to reconcile physics-role items: it
records aggregate `PhysicalStats`, Buff applications, and conditional source
IDs, but not every item's final tier/installation/Synergy/Buff-adjusted physical
delta. This plan therefore adds an evidence-only `ItemPhysicalContributionEvidence`
shape to `PlayerLap.physics`. The resolver records values it already computed;
no formula, timing, or outcome changes. Test Day's legacy non-track-aware path
does not fabricate this evidence and labels physical resolution as not evaluated.

Feature 024 owns item identity, rules, contribution attribution, and item-level
interaction. Feature 025 separately owns aggregate vehicle base/current/effective
stat panels; both features share stat vocabulary and context but neither
duplicates the other's presentation model.

## Technical Context

**Language/Version**: TypeScript 5.5 with the existing strict project toolchain

**Primary Dependencies**: Phaser 3.80; no new runtime dependencies

**Storage**: N/A — presentation state is scene-local and derived from existing
in-memory run, build, encounter, playback, and result data

**Testing**: Vitest for pure presentation models and scene-facing integration
contracts; existing browser sanity workflow for rendered interaction and
responsive visual verification

**Target Platform**: Current 800×450 logical Phaser/Vite web runtime with mouse,
keyboard, and touch input; pure layout contracts also cover the established
desktop and 390×844 portrait targets for feature 026 to bind to the runtime

**Project Type**: Single client-side web game

**Performance Goals**: Rebuild item models only when selection, authoritative
build state, or inspected lap changes; no formatting work is added to the
per-frame race path when those inputs are unchanged

**Constraints**: The current runtime remains a fixed 800×450 logical canvas;
feature 024 must fit that canvas and provide pure forward-compatible layout
models, while feature 026 owns game-wide high-resolution/portrait integration.
Required information cannot depend on hover, color, or animation. Presentation
cannot recompute simulation or mutate garage state. Evidence-only simulation
fields may be added, but existing deterministic outcomes must remain identical.

**Scale/Scope**: 70 authored items; up to three encounter offers, four installed
slots, three storage positions, and context-specific inspection across six
scene families. New shared presentation/renderer modules plus adaptations to
PrepareScene, ContestScene, ResultScene, Test Day scenes, and their tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Prepare → Contest Integrity**: PASS. Selection and inspection are
  read-only during contest playback. Garage commitment continues to occur only
  through existing placement commands in preparation.
- **II. Fairness**: PASS. The feature exposes existing item information and
  introduces no paid content or competitive modifier.
- **III. Transparency & Legibility**: PASS, and directly served. One shared model
  exposes authored effects, installation consequences, tiers, conditions,
  amplification, and resolved evidence without hover-only access. The evidence
  extension records each already-resolved item physical delta so presentation
  never guesses or reruns physics.
- **IV. Spectation-First**: PASS. Race cards and lap-context inspectors make an
  observed build more understandable without adding contest control.
- **V. Build Testing Access**: PASS. The same item identity and rule formatter is
  used in Test Day briefing, playback, and results, with practice evidence
  adapting into the resolved inspector model.
- **VI. Async-First Architecture**: PASS. No opponent or networking behavior
  changes.

**Result**: All gates PASS. No Complexity Tracking entries required.

**Post-design re-check**: PASS. The data model keeps authoring, resolution,
garage commands, and presentation separate. Resolution emits deterministic
evidence alongside unchanged outcomes; presentation only consumes it. Test Day
honestly reports its non-track-aware ceiling. The contract forbids mutation and
independent outcome computation, preserving Principles I, III, V, and VI.

## Project Structure

### Documentation (this feature)

```text
specs/024-item-stat-presentation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── item-presentation-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Created by /speckit.tasks, not this phase
```

### Source Code (repository root)

```text
src/scenes/
├── itemPresentation.ts       # Pure vocabulary, formatting, card/inspector models
├── itemVisualDescriptor.ts   # Reduced to supporting visual identity descriptor
├── itemVisuals.ts            # Reusable Phaser card and inspector renderers
├── garagePresentation.ts     # Garage/placement context adapter; no duplicate strings
├── resultFormatting.ts       # Result adapter; delegates item rules to shared model
├── practicePresentation.ts   # Test Day recorded/unavailable-evidence adapter
├── PrepareScene.ts            # Selection, hover preview, placement preview, inspector
├── ContestScene.ts            # Read-only selection + lap-context inspection
├── ResultScene.ts             # Read-only result inspection
├── TestDayScene.ts            # Briefing item inspection
├── PracticeContestScene.ts    # Lap-context practice inspection
└── PracticeResultScene.ts     # Practice result inspection

src/simulation/
├── types.ts                   # Evidence-only per-item physical contribution shape
├── garage.ts                  # Existing preview/commit authority; unchanged
├── slots.ts                   # Existing installation authority; unchanged
├── laps.ts                    # Emits already-resolved per-item physical evidence
└── tiering.ts                 # Existing effective tier authority; unchanged

tests/unit/
├── itemPresentation.test.ts   # Catalog coverage, vocabulary, formatting, edge cases
├── itemVisuals.test.ts        # Descriptor/renderer-state contracts
├── garagePresentation.test.ts # Placement context adaptation
├── practicePresentation.test.ts
└── laps.test.ts               # Evidence correctness + outcome non-regression

tests/integration/
├── garage-input-parity.test.ts
├── result-scene.test.ts
└── run-flow.test.ts
```

**Structure Decision**: Keep all formatting in one pure scene-layer module and
all drawing in one reusable Phaser module. Context adapters translate existing
authoritative data into the shared model. `types.ts`/`laps.ts` receive the
minimum evidence-only extension needed for item-level reconciliation; all math,
result values, and garage rules remain untouched. This avoids a second item data
source and prevents presentation from recreating simulation logic.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
