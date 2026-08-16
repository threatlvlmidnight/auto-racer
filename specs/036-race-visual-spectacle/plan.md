# Implementation Plan: Race Visual Spectacle

**Branch**: `036-race-visual-spectacle` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

## Summary

Render the immutable multi-car race result as a richer, broadcast-style 2D
spectacle. `ContestScene` will derive its circuit drawing, machine identities,
focus window, and bounded picture-in-picture (PiP) moments from the retained
track, roster, playback boundaries, and Feature 033 enrichment evidence. The
new presentation layer is strictly read-only: it cannot regenerate a track,
change the contest result, alter the playback clock, or add contest input.

## Technical Context

**Language/Version**: TypeScript 5.5

**Primary Dependencies**: Phaser 3.80, Vite 5, Vitest 2

**Storage**: In-memory immutable contest result and static packaged assets; no
database or network requirement

**Testing**: Vitest unit and integration tests; TypeScript type-check, ESLint,
and Vite production build

**Target Platform**: Desktop and responsive browser runtime at the existing
800×450 logical Phaser scene

**Project Type**: Single-project browser game

**Performance Goals**: Preserve smooth existing playback at 1× and 2× for an
8-car, 8–16-lap race; no additional per-frame resolution or path generation

**Constraints**: 2D illustrated presentation; retained track geometry and
Feature 033 event order are authoritative; stable wide top-down main camera;
PiP budget is 2/2/3/4/4 for 8/10/12/14/16 laps; reduced motion and unavailable
assets retain textual, labeled playback; four bespoke vehicle-art files load
through explicit keys with recorded generation/license provenance

**Scale/Scope**: One scored-race scene, four player vehicle profiles, reusable
rival profiles, one persistent focus window, and a maximum of four selected
PiP moments per race

## Constitution Check

| Principle | Plan assessment | Status |
|---|---|---|
| Prepare → Contest Integrity | Presentation reads a completed result and offers no steering or contest input. | Pass |
| Fairness | Vehicle art and focus selection have no mechanics or outcome effect. | Pass |
| Transparency & Legibility | Existing race facts remain visible; every cut-in carries retained event text and a non-color identity. | Pass |
| Spectation-First | This is a bounded broadcast presentation improvement, including reduced-motion equivalents. | Pass |
| Build Testing Access | No test-day access is removed or changed. | Pass |
| Async-First Architecture | No live opponent, matchmaking, persistence, or network dependency is introduced. | Pass |
| Product constraints | Uses 2D alternate-Motor-Age art and preserves equal mechanical topology. | Pass |

**Post-design re-check**: Pass. The data model has no simulation mutation path
and all control state is race-local presentation state.

## Project Structure

### Documentation

```text
specs/036-race-visual-spectacle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── race-visual-spectacle-contract.md
```

### Source Code

```text
src/
├── content/
│   └── raceVisualProfiles.ts             # player/rival display descriptors
├── scenes/
│   ├── ContestScene.ts                   # composition and lifecycle only
│   ├── raceSpectaclePresentation.ts      # pure PiP selection/focus reducers
│   ├── raceSpectacleVisuals.ts           # Phaser circuit, marker, PiP rendering
│   └── visualAssets.ts                   # static asset keys and safe fallbacks
└── simulation/
    ├── playback.ts                       # immutable crossed-boundary source
    ├── raceEnrichment.ts                 # Feature 033 ordering authority
    └── types.ts                          # retained result/event types

public/assets/race/vehicles/
└── player-*.png                           # four bespoke player vehicle models

tests/
├── fixtures/race-spectacle-fixtures.ts
├── unit/raceSpectaclePresentation.test.ts
├── unit/raceVisualProfiles.test.ts
└── integration/race-spectacle.test.ts
```

**Structure Decision**: Keep contest rules and playback unchanged. Add pure
scene-facing presentation reducers alongside thin Phaser rendering helpers, so
the selection policy is tested without a canvas and `ContestScene` remains the
single consumer of playback boundaries.

## Delivery Plan

1. Establish retained-fixture coverage for compact, hairpin/switchback-like,
   eventless, simultaneous-event, asset-fallback, and every lap-budget race.
2. Define pure race visual profiles, circuit decoration descriptors, PiP budget
   calculation, eligibility, deterministic selection, focus-window restoration,
   and reduced-motion presentation text.
3. Draw the enhanced top-down circuit from `schedule.track.points` only:
   layered road surface, verge, start/finish, region-aware landmarks, shadows,
   and local emphasis must be decorative projections of the existing path.
4. Produce or import four bespoke 2D player-vehicle art files with recorded
   generation/license provenance; preload their stable keys and retain a
   geometric, labeled no-asset fallback.
5. Replace generic markers with the four player profiles and reusable rival
   classes; preserve labels, number/pattern identity, heading, current marker
   coordinates, and a no-asset fallback.
6. Feed Feature 033 evidence through the existing crossed-boundary loop to
   start the selected PiP, show its retained driver/name/consequence, suppress
   conflicts deterministically, and restore the selected focus car.
7. Add accessible focus selection and compact-layout fallback without moving or
   disabling 1×/2× controls, race facts, pause/skip behavior, or result handoff.
8. Verify retained outcome equivalence, exact-once moments, budget limits,
   reduced motion, asset failure, visual identity, performance, type-check,
   lint, and production build.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
