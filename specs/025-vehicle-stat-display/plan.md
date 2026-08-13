# Implementation Plan: Vehicle Stat Display

**Branch**: `025-vehicle-stat-display` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

Add one shared, player-first vehicle-stat presentation model for Acceleration,
Top Speed, Braking Power, and Cornering Speed. Preparation derives an honest
unconditional current total from stock plus active installed contributions;
placement preview derives a prospective build through the existing garage
preview/commit authority; race, result, and Test Day views consume immutable
lap evidence when it exists and explicitly report unavailable detail when it
does not. The feature reuses feature 024's stat vocabulary and item contribution
evidence and does not alter physics, items, garage legality, or contest results.

## Technical Context

**Language/Version**: TypeScript 5.5 with the existing strict project toolchain

**Primary Dependencies**: Phaser 3.80; no new runtime dependencies

**Storage**: None; all models are derived from in-memory build, preview, and lap evidence

**Testing**: Vitest unit and integration tests plus the existing browser visual workflow

**Target Platform**: Existing 1600x900 backing canvas with 800x450 logical scene coordinates

**Performance Goals**: Recompute only when build, preview destination, or inspected lap changes; no per-frame simulation

**Constraints**: No presentation-side physics or garage-rule reconstruction; no hover-only facts; four stats must remain readable at supported viewports

**Scale/Scope**: Four stats, 70 items, four active slots, three storage positions, preparation/race/result/Test Day scene families

## Constitution Check

- **I. Prepare -> Contest Integrity**: PASS. Race displays are read-only and consume recorded evidence.
- **II. Fairness**: PASS. No content, balance, or competitive entitlement changes.
- **III. Transparency & Legibility**: PASS, directly served. Aggregate values reconcile to stock and attributable item evidence.
- **IV. Spectation-First**: PASS. Lap-effective vehicle changes become readable during playback without adding control.
- **V. Build Testing Access**: PASS. Test Day uses the same vocabulary and honestly labels unavailable physical evidence.
- **VI. Async-First Architecture**: PASS. Ghost and networking behavior are unchanged.

**Post-design re-check**: PASS. The contracts keep stock/build derivation,
garage preview, recorded race evidence, and rendering separate. No complexity
exception is required.

## Project Structure

```text
specs/025-vehicle-stat-display/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- vehicle-stat-display-contract.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md

src/scenes/
|-- vehicleStatPresentation.ts  # Pure aggregate models and formatting
|-- vehicleStatVisuals.ts       # Shared Phaser renderer
|-- PrepareScene.ts             # Current and prospective build panels
|-- ContestScene.ts             # Player lap-effective panel
|-- ResultScene.ts              # Final/inspectable lap context
|-- TestDayScene.ts
|-- PracticeContestScene.ts
`-- PracticeResultScene.ts

src/simulation/
|-- garage.ts                   # Existing preview/commit authority
|-- laps.ts                     # Existing recorded lap physics evidence
|-- slots.ts                    # Existing installation authority
`-- tracks.ts                   # STOCK_PHYSICAL_STATS and PhysicalStats

tests/unit/
|-- vehicleStatPresentation.test.ts
`-- vehicleStatVisuals.test.ts

tests/integration/
|-- garage-input-parity.test.ts
|-- result-scene.test.ts
`-- run-flow.test.ts
```

**Structure Decision**: Keep calculation and formatting in one Phaser-free
scene-layer module. It may call existing pure simulation authorities, but must
not duplicate their formulas. One renderer consumes the model across all
scenes. Existing feature-024 item models remain the drill-down source.

## Complexity Tracking

No Constitution Check violations.
