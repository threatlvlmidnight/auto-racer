# Tasks: Interface Clarity and Reward Feedback

**Input**: Design documents from specs/035-interface-clarity-reward-feedback/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/interface-clarity-contract.md, quickstart.md

**Testing rule**: Write pure presentation and catalog-validation tests before
their implementation. Phaser scene work consumes those models; owner browser
acceptance records visual/input evidence after automated gates pass.

## Format: [ID] [P?] [Story] Description

- **[P]** marks work safe to execute concurrently after its prerequisites.
- **[US1–US3]** maps to the independently testable user stories in spec.md.
- Existing simulation, economy, tiering, setup, and upgrade authorities must not
  be reimplemented in this feature.

---

## Phase 1: Reconciliation and baselines

**Purpose**: Freeze present behavior and avoid overlap with Feature 033.

[X] T001 Reconcile current Feature 033 changes to src/simulation/types.ts, contest/result track evidence, and race scenes before Feature 035 edits; record the exact retained inputs used by circuit presentation in specs/035-interface-clarity-reward-feedback/acceptance-evidence.md
[X] T002 [P] Create deterministic region, scored-result, Test Day, configurable/non-configurable item, mixed-card, duplicate-upgrade, long-copy, and reduced-motion fixtures in tests/fixtures/interface-clarity-fixtures.ts
[X] T003 [P] Record current full test/lint/build baselines and the four-viewport primary-scene audit matrix in specs/035-interface-clarity-reward-feedback/acceptance-evidence.md
[X] T004 [P] Inventory every playable catalog item, its current name, configurableSetup presence, and proposed Standard/Notable/Rare rarity in tests/unit/itemCatalogPresentation.test.ts
[X] T005 [P] Add failing regression assertions for existing Feature 032 duplicate receipts and Feature 028 eligible setup controls in tests/integration/interface-clarity-baseline.test.ts
[X] T006 Run T002–T005 and retain baseline failures/expectations without changing authority or visual behavior

**Checkpoint**: The current catalog, retained race inputs, upgrade truth, and
audit scope are known before shared presentation types change.

---

## Phase 2: Foundational presentation contracts

**Purpose**: Establish display-only catalog fields and pure models that block all scene work.

[X] T007 [P] Add failing catalog completeness, closed-rarity, and no-authority-impact tests in tests/unit/itemCatalogPresentation.test.ts
[X] T008 [P] Add failing scored/legacy/Test Day circuit identity and fallback tests in tests/unit/circuitPresentation.test.ts
[X] T009 [P] Add failing installed/stored/non-configurable Adjustable capability tests in tests/unit/adjustablePresentation.test.ts
[X] T010 [P] Add failing card-state precedence, non-color token, upgrade-eligibility, and reduced-motion tests in tests/unit/cardFeedbackPresentation.test.ts
[X] T011 [P] Add failing audit-case matrix validation tests in tests/unit/interfaceClarityAudit.test.ts
[X] T012 Define display-only ItemRarity on ItemDefinition and catalog validation in src/simulation/types.ts and author Standard/Notable/Rare on every entry in src/content/items/{neutral,mercer,soto,rook,voss}.ts
[X] T013 Rename the non-configurable Variable-Ratio Test Gearbox to Two-Speed Test Gearbox and update catalog, fixture, and regression references without changing its item ID, price, physics, pools, or effects
[X] T014 Implement pure circuitPresentationIdentity in src/scenes/circuitPresentation.ts using retained Track and TourStage/RegionDefinition evidence only
[X] T015 Implement adjustablePresentation in src/scenes/adjustablePresentation.ts over existing configurableSetup, held location, eligible controls, and selections without creating controls or deltas
[X] T016 Implement cardFeedbackState and validated audit-case definitions in src/scenes/cardFeedbackPresentation.ts
[X] T017 Extend src/scenes/itemPresentation.ts and src/scenes/itemVisualDescriptor.ts with rarity, Adjustable, upgrade-eligibility, and reduced-motion semantic tokens while retaining existing tier/effect/accessibility truth
[X] T018 Run T007–T017 and confirm all new pure contracts are GREEN; resolve lint/type failures without scene integration

**Checkpoint**: Every new label, rarity, card state, and fallback is pure,
deterministic, test-covered, and display-only.

---

## Phase 3: User Story 1 — Know where and how the next race will run (Priority: P1)

**Goal**: Present the same retained track/location identity across scored-race
surfaces and make live pre-race capability explicit.

**Independent Test**: Traverse seeded Local, Championship, and Test Day routes;
compare every displayed identity and inspect installed, stored, and absent
configurable items without hover.

### Tests — write first

[X] T019 [P] [US1] Add cross-surface circuit identity agreement tests for Run, PreRace, Contest, Result, history, and Test Day models in tests/integration/circuit-identity-flow.test.ts
[X] T020 [P] [US1] Add Adjustable badge/control-discovery and Two-Speed Test Gearbox naming tests in tests/unit/adjustablePresentation.test.ts and tests/unit/itemPresentation.test.ts

### Implementation

[X] T021 [US1] Retain display-only track ID/name and region ID with scored history at the existing settlement bridge in src/simulation/run.ts, project it through src/scenes/runPresentation.ts, and render retained track name plus LOCATION region identity on scheduled-race, destination, run, and history surfaces in src/scenes/RunScene.ts, src/scenes/DestinationScene.ts, and src/scenes/worldTourPresentation.ts; do not regenerate/infer a track or change settlement
[X] T022 [US1] Render the shared identity in src/scenes/PreRaceScene.ts, src/scenes/ContestScene.ts, and src/scenes/ResultScene.ts without generating/reselecting a track
[X] T023 [US1] Render fixed/unscored borrowed-track identity in src/scenes/TestDayScene.ts, src/scenes/PracticeContestScene.ts, and src/scenes/PracticeResultScene.ts
[X] T024 [US1] Render the ADJUSTABLE badge, associated control-family/current-value explanation, and unavailable/stored absence consistently in src/scenes/itemVisuals.ts, src/scenes/PrepareScene.ts, src/scenes/InventoryScene.ts, and src/scenes/PreRaceScene.ts
[X] T025 [US1] Run T019–T024 plus setup, track, result, run-flow, and Test Day regressions; record identity/control evidence in acceptance-evidence.md

**Checkpoint**: Race context and actual setup capability are consistent and
inspectable, with Test Day explicitly distinguished.

---

## Phase 4: User Story 2 — Recognize a meaningful offer or upgrade at a glance (Priority: P1)

**Goal**: Make authored rarity and existing duplicate-upgrade truth scannable
without changing content authority or obscuring card facts.

**Independent Test**: Inspect mixed-rarity offers and a duplicate purchase with
pointer, keyboard, touch, monochrome, and reduced-motion variants.

### Tests — write first

[X] T026 [P] [US2] Add full-catalog rarity/card-token and color-independent accessibility tests in tests/unit/itemCatalogPresentation.test.ts and tests/unit/itemVisuals.test.ts
[X] T027 [P] [US2] Add failing upgrade-eligible-before-purchase, exact-receipt-after-purchase, max-tier, and reduced-motion tests in tests/integration/supplier-feedback.test.ts and tests/integration/interface-clarity-baseline.test.ts

### Implementation

[X] T028 [US2] Add reusable rarity label/icon/frame and semantic state treatments to src/scenes/itemVisuals.ts, preserving prices, tier labels, effects, controls, and accessibility text at every card size
[X] T029 [US2] Consume card feedback state for Supplier, Reward Draft, garage, and inventory cards in src/scenes/PrepareScene.ts and src/scenes/InventoryScene.ts
[X] T030 [US2] Render explicit upgrade-eligible cues before confirmation and bounded receipt-backed payoff after success in src/scenes/PrepareScene.ts; preserve Feature 032’s existing receipt/Undo/overlay truth
[X] T031 [US2] Add reduced-motion equivalents and non-color text/icon structure for rare, selected, unavailable, focused, and upgrade-result states in src/scenes/itemVisuals.ts and src/scenes/focusPresentation.ts
[X] T032 [US2] Run T026–T031 plus tiering, inventory, acquisition, and demo-feedback regressions; record card/receipt evidence in acceptance-evidence.md

**Checkpoint**: Rarity and upgrade feedback are visible before/after action, but
all transaction and tier calculations remain owned by existing authority.

---

## Phase 5: User Story 3 — Use every primary scene without visual collisions (Priority: P1)

**Goal**: Resolve feature-owned overlap, clipping, focus, and reachability
defects in the existing landscape compositions and preserve safe fallback.

**Independent Test**: Execute the approved matrix with longest-copy/dense-state
fixtures at each viewport and input mode; record all owner visual evidence.

### Tests — write first

[X] T033 [P] [US3] Add longest-copy, combined-card-state, and compact/pinned fallback model tests in tests/unit/interfaceClarityAudit.test.ts and tests/unit/cardFeedbackPresentation.test.ts
[X] T034 [P] [US3] Add keyboard-focus, pointer/touch reachability, no-hover, and reduced-motion integration coverage across primary hosts in tests/integration/interface-clarity-flow.test.ts

### Implementation

[X] T035 [US3] Add reusable compact/pinned secondary-inspection layout decisions and semantic focus-state rendering in src/scenes/cardFeedbackPresentation.ts, src/scenes/itemVisuals.ts, and src/scenes/focusPresentation.ts
[X] T036 [US3] Apply audited layout corrections to route/destination, acquisition, and inventory surfaces in src/scenes/RunScene.ts, src/scenes/DestinationScene.ts, src/scenes/PrepareScene.ts, and src/scenes/InventoryScene.ts
[X] T037 [US3] Apply audited layout corrections to setup, playback, and Results surfaces in src/scenes/PreRaceScene.ts, src/scenes/ContestScene.ts, and src/scenes/ResultScene.ts
[X] T038 [US3] Apply audited layout corrections to Test Day/practice and shared primary controls in src/scenes/TestDayScene.ts, src/scenes/PracticeContestScene.ts, src/scenes/PracticeResultScene.ts, and src/scenes/demoTheme.ts
[X] T039 [US3] Classify each unresolved finding as fixed, intentional, or Feature 026 responsive-host follow-up in acceptance-evidence.md; do not silently waive a failed case
[X] T040 [US3] Run T033–T039 and focused scene/input suites; verify no scene derives new simulation/economy state for presentation

**Checkpoint**: Current landscape scenes preserve accessible, reachable
consequential content without claiming new portrait reflow.

---

## Phase 6: Final audit and release gate

**Purpose**: Complete the combined regression, evidence, and owner acceptance.

[X] T041 [P] Reconcile README.md, specs/DEFERRED.md, specs/HANDOFF.md, and specs/ROADMAP.md with Feature 035 decisions and any Feature 026 follow-ups
[X] T042 Run npm test, npm run lint, npm run build, and npm run build:pages; fix only Feature 035 regressions and record the exact results in acceptance-evidence.md
[X] T043 Perform owner browser QA at 1920×1080, 1366×768, 1024×768, and 800×450 across the complete primary-scene/state/input matrix; attach screenshots or explicit review outcomes to acceptance-evidence.md
[X] T044 Re-run the Constitution Check against delivered code and record final PASS evidence, including no change to odds, price, tier authority, simulation, economy, or Test Day scoring, in acceptance-evidence.md

## Dependencies and execution order

- Phase 1 begins immediately, but T001 must complete before any shared-file edit
  because Feature 033 is active.
- Phase 2 blocks every user story; T012–T017 establish the only new shared
  display contracts.
- US1, US2, and US3 can begin after Phase 2, but coordinate their shared edits
  to itemVisuals.ts, itemPresentation.ts, PrepareScene.ts, and PreRaceScene.ts.
- Phase 6 requires every intended user story to be complete.

## Parallel opportunities

- T002–T005, T007–T011, T019–T020, T026–T027, and T033–T034 are parallel.
- After the foundational checkpoint, a developer can own race identity (US1),
  card/upgrade feedback (US2), or landscape audit/layout (US3), provided shared
  renderer and scene edits are sequenced.

## Implementation strategy

1. Land the display-only catalog and pure models with tests.
2. Deliver US1 first: truthful race/location and setup capability.
3. Deliver US2 second: scannable cards and receipt-backed upgrade feedback.
4. Deliver US3 through the finite audit, escalating only responsive-host defects
   to Feature 026.
5. Complete the full gate and owner acceptance before marking the feature done.
