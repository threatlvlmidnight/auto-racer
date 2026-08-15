# Implementation Plan: Roguelike Encounter Variety

**Branch**: `[034-roguelike-encounter-variety]` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/034-roguelike-encounter-variety/spec.md`

## Summary

Expand the 40-stage World Tour with seven deterministic encounter types and a
second, instance-bound item progression axis. The implementation introduces
stable held-item instances, normalized player-facing physical stats, declarative
encounter eligibility/cadence, atomic encounter transactions, retained deferred
effects, and exact evidence. Existing garage, tiering, race, Test Day, settlement,
and presentation authority remains the integration boundary.

## Technical Context

**Language/Version**: TypeScript 5.5 targeting ES2020

**Primary Dependencies**: Phaser 3.80, Vite 5.4

**Storage**: In-memory versioned `RunState`; no backend or cross-device save

**Testing**: Vitest 2 with unit, deterministic corpus, integration, and presentation-contract tests

**Target Platform**: Modern desktop/mobile browsers and GitHub Pages static build

**Project Type**: Single-project 2D browser game

**Performance Goals**: Preserve 60 FPS playback; encounter generation and preview complete synchronously within one UI frame; bounded catalog scans only

**Constraints**: Offline-capable, deterministic from retained seeds/state, no live services, no playback-time outcome mutation, keyboard/pointer/touch parity, no visual-testing requirement in this planning cycle

**Scale/Scope**: 5 legs, 40 global stages, 20 choice stages, 7 new encounter types, roughly 70 playable items, 4 canonical physical stats, and 7 initial Workshop Modification behaviors

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Design evidence | Result |
|-----------|-----------------|--------|
| Prepare → contest | Encounters mutate retained pre-race state; Exhibition uses committed automated race authority | PASS |
| Fairness | All entrants use identical legality, economy, cadence, stat, and modification rules | PASS |
| Transparency | Every operation has an exact preview and retained evidence | PASS |
| Spectacle | Exhibition reuses race playback without adding outcome-time randomness | PASS |
| Test Day | Modifications and normalized stats flow through existing Test Day authority without scoring | PASS |
| Async determinism | Named seed domains and immutable outcomes make offers and races reproducible | PASS |
| 2D product | New presentation stays inside Phaser scenes/presentation modules | PASS |
| Motor-Age theme | Workshop, scrutineering, privateer, specialist, and exhibition framing match the setting | PASS |

Post-design check: no constitutional exception, new project, service, or live
dependency was introduced. Feature 033 owns race-enrichment primitives used by
`Guarded`; Feature 035 retains global visual-polish ownership.

## Design Phases

### Phase 0 — Decisions and calibration

- Establish stable item-instance identity and migration boundaries.
- Define canonical physical-stat normalization and the 10% corpus acceptance gate.
- Define deterministic encounter scheduling, guarantees, and bounded fallback.
- Fix effect ordering, modification compatibility, impound return, and atomicity.

### Phase 1 — Models and contracts

- Add item-instance, modification, cadence, encounter transaction, pending-effect,
  Exhibition objective/result, and normalized-stat models.
- Publish internal simulation/presentation contracts in `contracts/`.
- Provide an executable validation guide in `quickstart.md`.

### Phase 2 — Test-first implementation slices

- Build shared authority first, then implement independently testable user stories:
  varied encounter cadence; item modification/transformation; Exhibition Trial;
  Tag Specialist; and history/pending-effect legibility.
- Reconcile Feature 033 shared race contracts before adding `Guarded` behavior.

## Project Structure

### Documentation (this feature)

```text
specs/034-roguelike-encounter-variety/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── encounter-variety-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── content/
│   ├── encounterVariants.ts       # authored encounter copy/variants
│   ├── itemModifications.ts       # modification catalog and compatibility
│   └── items/*.ts                 # fitted/improvised catalog audit
├── simulation/
│   ├── types.ts                   # retained item/encounter/result types
│   ├── itemInstances.ts           # identity and immutable-definition boundary
│   ├── statNormalization.ts       # canonical stat authority and physics adapter
│   ├── itemModifications.ts       # modification resolution and attribution
│   ├── encounterCadence.ts        # eligibility, cooldown, guarantee, fallback
│   ├── exhibition.ts              # objectives and unscored settlement
│   ├── encounters.ts              # offers, previews, atomic transactions
│   ├── run.ts                     # lifecycle, history, pending effects
│   ├── garage.ts                  # reserved impound slots and instance moves
│   ├── tiering.ts                 # independent tier/modification scaling
│   ├── raceSetup.ts               # exact resolved contributions
│   ├── laps.ts                    # canonical stat adapter
│   └── contest.ts                 # Guarded/Exhibition integration
└── scenes/
    ├── RunScene.ts                # route/history/status integration
    ├── PrepareScene.ts            # supplier/specialist transaction UI
    ├── InventoryScene.ts          # modification/placement inspection
    ├── PreRaceScene.ts            # normalized previews and impound state
    ├── ContestScene.ts            # Exhibition/Guarded evidence rendering
    ├── ResultScene.ts             # Exhibition and modification attribution
    └── encounterPresentation.ts   # exact reusable encounter view models

tests/
├── fixtures/encounter-variety-fixtures.ts
├── unit/{encounterCadence,itemInstances,itemModifications,statNormalization,exhibition}.test.ts
└── integration/encounter-variety-flow.test.ts
```

**Structure Decision**: Extend the existing single TypeScript/Phaser project.
Keep deterministic rules in `src/simulation`, authored content in `src/content`,
and Phaser-free view models beside existing `src/scenes/*Presentation.ts` modules.

## Complexity Tracking

No constitution violations require justification.
