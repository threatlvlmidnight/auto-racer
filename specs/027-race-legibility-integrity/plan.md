# Implementation Plan: Race Legibility and Playback Integrity

**Branch**: `027-race-legibility-integrity` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

Replace frame-level live standings with a stable player-centered time-attack
projection published at completed player-lap checkpoints. First pin playback
progress, marker wrapping, finish behavior, tie order, and final-result parity
with tests. Extend the immutable N-car result with the exact generated track and
original roster tie order, then use that evidence for playback, equal-lap
projection, and post-race track composition. Preserve all contest math.

## Technical Context

**Language/Version**: TypeScript 5.5 with the existing strict toolchain

**Primary Dependencies**: Phaser 3.80; no new runtime dependencies

**Storage**: In-memory immutable contest result; no persistence migration in this slice

**Testing**: Vitest pure/integration tests plus browser visual verification

**Target Platform**: 1600x900 backing canvas with 800x450 logical coordinates and feature-026 responsive frame

**Performance Goals**: Marker interpolation remains per-frame; projection and track summary derive only at lap/result boundaries

**Constraints**: No live input, outcome recomputation, frame-derived final order, or result-scene track regeneration

**Scale/Scope**: Eight cars, 10-16 laps, generated 6-10-corner tracks, race and Result scenes

## Constitution Check

- **I. Prepare -> Contest Integrity**: PASS. Playback remains noninteractive and immutable.
- **II. Fairness**: PASS. No competitive content or entitlement changes.
- **III. Transparency & Legibility**: PASS, directly served through stable splits and retained track evidence.
- **IV. Spectation-First**: PASS. Player-centered pace is readable to viewers.
- **V. Build Testing Access**: PASS. Scored-result explanation shares established vocabulary; Test Day behavior is unchanged.
- **VI. Async-First Architecture**: PASS. Every rival remains a recorded ghost.

**Post-design re-check**: PASS. New result fields preserve evidence already used
during resolution. Projection and summaries are pure consumers. No complexity
exception is required.

## Project Structure

```text
specs/027-race-legibility-integrity/
|-- spec.md
|-- research.md
|-- plan.md
|-- data-model.md
|-- quickstart.md
|-- contracts/race-legibility-contract.md
|-- checklists/requirements.md
`-- tasks.md

src/simulation/
|-- types.ts                  # Track and tie-order result evidence
|-- contest.ts                # Emit exact evidence without outcome changes
|-- playback.ts               # Progress plus checkpoint projection authority
`-- tracks.ts                 # Pure track summary using existing physics definitions

src/scenes/
|-- raceProjectionPresentation.ts
|-- trackSummaryPresentation.ts
|-- ContestScene.ts
|-- ResultScene.ts
|-- contestFormatting.ts
`-- resultFormatting.ts

tests/unit/
|-- contest.test.ts
|-- playback.test.ts
`-- tracks.test.ts

tests/integration/
|-- contest-scene.test.ts
|-- result-scene.test.ts
`-- run-flow.test.ts
```

**Structure Decision**: Simulation-layer pure functions own checkpoint math and
track composition evidence. Scene-layer pure adapters own labels/layout models.
Phaser scenes only render those models and retain no competing ranking logic.

## Complexity Tracking

No Constitution Check violations.
