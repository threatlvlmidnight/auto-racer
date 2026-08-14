# Implementation Plan: Race Playback Controls

**Branch**: `030-race-playback-controls` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-race-playback-controls/spec.md`

## Summary

Introduce one shared, race-local presentation clock whose `1×` rate consumes existing immutable playback schedules at half the current rate and whose default `2×` rate consumes them at the current rate. Use the clock in scored eight-car playback and Test Day playback, expose direct `1×`/`2×` controls with keyboard parity, and make crossed-boundary event derivation robust to speed changes and delayed frames. Simulation, schedules, contest results, settlement, and run state remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.5 on Node.js 20 for tooling

**Primary Dependencies**: Phaser 3.80, Vite 5.4

**Storage**: N/A; playback speed is scene-local and resets for every race

**Testing**: Vitest 2 unit/integration suites, ESLint, TypeScript no-emit build validation, browser viewport QA

**Target Platform**: Modern desktop web browsers; canonical 800×450 logical Phaser canvas with scale-fit presentation

**Project Type**: Static browser game

**Performance Goals**: Preserve smooth 60 fps rendering; speed selection updates in the next rendered frame; no additional simulation resolution

**Constraints**: Presentation-only; exactly two speed values; default rate is half the legacy rate; direct keyboard/pointer/touch parity; no persistence; no scored-race pause/skip; no event duplication or omission across delayed frames

**Scale/Scope**: Two playback scenes, one shared pure playback-clock/event boundary, existing 2-car and 8-car schedules, two controls per active race

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Status | Plan evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Speed changes consume already-resolved evidence and cannot alter contest input or output. |
| II. Fairness | PASS | Both speeds are available to every player and have no competitive effect. |
| III. Transparency & Legibility | PASS | The active speed is explicit; boundary events remain deterministic and inspectable. |
| IV. Spectation-First | PASS | The slower `1×` option improves race comprehension while the default `2×` retains the established pace. |
| V. Build Testing Access | PASS | Test Day receives the same speed meanings while retaining its previously shipped unscored controls. |
| VI. Async-First Architecture | PASS | Playback continues to consume immutable recorded opponents with no live dependency. |
| Product constraints | PASS | No topology, physics, capacity, theme, or 2D-presentation rule changes. |
| Development Workflow | PASS | Feature proceeds through specification, clarification, planning, tasks, analysis, then implementation. Playback boundary logic receives test-first coverage. |

**Post-design re-check**: PASS. The shared clock has presentation authority only, the event cursor derives solely from immutable schedules/results, and the scene owns ephemeral selection.

## Project Structure

### Documentation (this feature)

```text
specs/030-race-playback-controls/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── playback-control-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── simulation/
│   └── playback.ts                 # pure clock rate and crossed-boundary derivation
└── scenes/
    ├── playbackControlPresentation.ts # labels, selected state, control model
    ├── ContestScene.ts             # scored Local/Championship controls
    ├── PracticeContestScene.ts     # normalized Test Day 1×/2× behavior
    └── demoTheme.ts                # reusable active/focus treatment if required

tests/
├── unit/
│   ├── playback.test.ts
│   └── playbackControlPresentation.test.ts
└── integration/
    └── playback-controls.test.ts
```

**Structure Decision**: Extend the existing single-project Phaser/Vite layout. Pure clock and boundary rules stay framework-free in simulation; scenes render and bind controls without gaining simulation authority.

## Delivery Design

1. Add failing pure tests for default/fast rate advancement, monotonic transitions, idempotent selection, delayed-frame boundary coverage, and deeply identical result evidence.
2. Introduce exact playback speed values and a pure clock advance boundary without changing the 20-second legacy schedule constant.
3. Add a pure two-button presentation model with explicit selected text/state and shortcut labels.
4. Integrate scored playback with direct buttons and `1`/`2` keys; reset state in every `create()`.
5. Normalize Test Day's speed cycle to the same two meanings while preserving its existing pause, skip, cancel, and focus behavior.
6. Run focused regression suites, full gates, and browser QA at 800×450 plus representative larger landscape viewports.

## Complexity Tracking

No constitutional violations or additional architectural layers require justification.
