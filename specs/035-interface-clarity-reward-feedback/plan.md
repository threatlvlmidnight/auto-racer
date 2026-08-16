# Implementation Plan: Interface Clarity and Reward Feedback

**Branch**: [035-interface-clarity-reward-feedback] | **Date**: 2026-08-15 | **Spec**: spec.md

**Input**: Feature specification in specs/035-interface-clarity-reward-feedback/spec.md

## Summary

Make existing race context, setup capability, item rarity, and tier-upgrade facts
easier to scan without changing any outcome authority. Add display-only catalog
rarity, pure circuit/adjustable/card-feedback presentation models, reusable
non-color card treatments, and a finite owner-reviewed landscape audit matrix.

## Technical Context

**Language/Version**: TypeScript 5.5, ES2020  
**Primary Dependencies**: Phaser 3.80, Vite 5.4  
**Storage**: In-memory run/result state; no new persistence  
**Testing**: Vitest 2 unit, integration, and presentation-contract tests  
**Target Platform**: Static modern-browser game and GitHub Pages  
**Project Type**: Single TypeScript/Phaser project  
**Performance Goals**: Pure projections are bounded catalog/scene-state scans and render within a UI frame; preserve 60 FPS playback  
**Constraints**: Offline, deterministic, no input during contest, no change to simulation/economy/setup truth, pointer/touch/keyboard/no-hover/reduced-motion parity  
**Scale/Scope**: all playable catalog items; seven scored-race identity surfaces; primary-scene audit at four existing landscape viewports

## Constitution Check

| Principle | Evidence | Result |
| --- | --- | --- |
| Prepare → Contest Integrity | Only presents retained setup/race facts; playback gets no input or authority changes. | PASS |
| Fairness | Rarity is display-only; no odds, price, or performance change. | PASS |
| Transparency & Legibility | Location, controls, rarity, tier-upgrade evidence, and non-color state become clearer. | PASS |
| Spectation-First | Playback gains retained race identity only. | PASS |
| Build Testing Access | Test Day remains fixed/unscored and receives the same explanatory treatment. | PASS |
| Async-First Architecture | No service, live state, or viewer-local race outcome is introduced. | PASS |
| 2D product and theme | Phaser presentation and Motor-Age catalog language are retained. | PASS |

Re-check after implementation: no exception is expected. Feature 033 may change
race evidence, but Feature 035 reads existing retained track/stage inputs and
does not depend on its new mechanics.

## Design Phases

### Phase 0 — presentation decisions

- Author Standard/Notable/Rare for the whole catalog and rename the one
  misleading non-configurable Variable item.
- Specify pure circuit identity, adjustable capability, card-state precedence,
  and audit-case projections.
- Baseline longest-copy and dense-state layout fixtures before scene edits.

### Phase 1 — reusable models and renderers

- Extend ItemDefinition/content validation with display-only rarity.
- Add circuitPresentation.ts, adjustable/card feedback projections, and reusable
  item-card visual semantics.
- Add pure tests before scene wiring; all upgrade facts come from Feature 032
  acquisition/receipt authority.

### Phase 2 — independently verifiable presentation slices

- Wire consistent track/location identity into run, briefing, playback, Results,
  history, destination, and Test Day surfaces, retaining display evidence for
  completed-race history only.
- Wire Adjustable badge/control discovery into offer, garage, inventory, and
  setup surfaces.
- Wire rarity and upgrade eligibility/outcome feedback into cards and receipts.
- Run the landscape audit, resolve feature-owned collisions, and document any
  responsive-host follow-up under Feature 026.

## Project Structure

    specs/035-interface-clarity-reward-feedback/
    ├── spec.md
    ├── clarification-questionnaire.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── acceptance-evidence.md
    └── contracts/interface-clarity-contract.md

    src/
    ├── content/items/*.ts
    ├── simulation/{types,run}.ts
    └── scenes/
        ├── circuitPresentation.ts
        ├── cardFeedbackPresentation.ts
        ├── itemPresentation.ts
        ├── itemVisualDescriptor.ts
        ├── itemVisuals.ts
        ├── RunScene.ts
        ├── PreRaceScene.ts
        ├── ContestScene.ts
        ├── ResultScene.ts
        ├── InventoryScene.ts
        └── {PrepareScene,TestDayScene,PracticeContestScene,PracticeResultScene}.ts

    tests/
    ├── fixtures/interface-clarity-fixtures.ts
    ├── unit/{circuitPresentation,cardFeedbackPresentation,itemPresentation,itemVisuals}.test.ts
    └── integration/{result-scene,run-flow,supplier-feedback,test-day-flow}.test.ts

**Structure Decision**: Extend the current single project. Catalog truth stays in
content/types, deterministic projections stay Phaser-free in scenes, and Phaser
classes only render those models.

## Complexity Tracking

No constitutional violation or new architectural dependency requires an exception.
