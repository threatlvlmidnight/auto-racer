# Tasks: Vehicle Stat Display

**Input**: Design documents in `/specs/025-vehicle-stat-display/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/vehicle-stat-display-contract.md`, and `quickstart.md`

**Tests**: Required for pure derivation, garage-preview parity, recorded-evidence
integrity, interaction access, and cross-scene vocabulary.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May proceed in parallel because it touches independent files.
- **[Story]**: Maps work to US1-US4 in `spec.md`.

---

## Phase 1: Setup and inventory

- [X] T001 Confirm feature 024 exports the shared physical-stat vocabulary and
  record the exact imports in `specs/025-vehicle-stat-display/quickstart.md`.
- [X] T002 [P] Inventory preparation, race, result, and Test Day consumers and
  their current build/lap evidence sources in
  `specs/025-vehicle-stat-display/contracts/vehicle-stat-display-contract.md`.
- [X] T003 [P] Add representative direct, tradeoff, tiered, installation,
  storage, conditional, Synergy, and stacking-Buff fixtures in
  `tests/fixtures/vehicle-stat-fixtures.ts`.

**Checkpoint**: Every required state has an authoritative source and fixture.

---

## Phase 2: Foundational shared model

### Tests

- [X] T004 [P] Add failing tests for four-stat order, labels, units, precision,
  signs, clamps, and accessible context labels in
  `tests/unit/vehicleStatPresentation.test.ts`.
- [X] T005 [P] Add failing structural and purity tests for
  `VehicleStatPanelModel`, line states, conditional sources, and unavailable
  states in `tests/unit/vehicleStatPresentation.test.ts`.
- [X] T006 [P] Add failing layout/state tests for the shared renderer contract
  in `tests/unit/vehicleStatVisuals.test.ts`.

### Implementation

- [X] T007 Implement Phaser-free types and shared feature-024 metadata adapters
  in `src/scenes/vehicleStatPresentation.ts`.
- [X] T008 Implement value, delta, state, context, and accessibility formatting
  in `src/scenes/vehicleStatPresentation.ts`.
- [X] T009 Implement the reusable model-driven Phaser panel renderer, stable
  four-line order, detail affordance, focus states, and cleanup lifecycle in
  `src/scenes/vehicleStatVisuals.ts`.
- [X] T010 Run foundational tests and confirm they pass.

**Checkpoint**: One pure aggregate model and one shared renderer exist.

---

## Phase 3: User Story 1 - Read the current vehicle (P1)

### Tests

- [X] T011 [P] [US1] Add failing empty-build and direct/tradeoff aggregation
  tests in `tests/unit/vehicleStatPresentation.test.ts`.
- [X] T012 [P] [US1] Add failing tier, Fitted, Flexible, Improvised,
  active-storage, and inert-storage tests.
- [X] T013 [P] [US1] Add failing Synergy/Buff aggregation, clamp, and complete
  item-source reconciliation tests.
- [X] T014 [P] [US1] Add failing tests proving unresolved track-, segment-, and
  lap-dependent effects remain labeled outside the current total.

### Implementation

- [X] T015 [US1] Implement `currentVehicleStatModel` using stock plus existing
  tier/installation/build resolution authorities.
- [X] T016 [US1] Implement attributable active and conditional source adapters
  linking aggregate lines to feature-024 item inspection.
- [X] T017 [US1] Add the always-visible current vehicle panel to Reward Draft,
  Parts Supplier, and garage preparation in `src/scenes/PrepareScene.ts`.
- [X] T018 [US1] Refresh the panel only after authoritative build changes and
  keep selected item/detail context synchronized.
- [X] T019 [US1] Run US1 tests and verify an empty and representative populated
  garage visually.

**Checkpoint**: Preparation honestly explains the current vehicle.

---

## Phase 4: User Story 2 - Preview placement consequences (P1)

### Tests

- [X] T020 [P] [US2] Add failing prospective-total tests for matching, Flex,
  mismatched, and storage destinations.
- [X] T021 [P] [US2] Add failing parity tests for occupied, swap, replacement,
  eviction, move, tier-up, and no-op outcomes.
- [X] T022 [P] [US2] Add failing cancellation/invalid-preview nonmutation tests.
- [X] T023 [P] [US2] Extend drag and select-then-place parity tests to assert
  identical prospective stat models in `tests/integration/garage-input-parity.test.ts`.

### Implementation

- [X] T024 [US2] Expose or adapt the existing noncommitting authoritative
  prospective build from `src/simulation/garage.ts` without duplicating rules.
- [X] T025 [US2] Implement `prospectiveVehicleStatModel` and current-versus-
  prospective signed comparisons in `src/scenes/vehicleStatPresentation.ts`.
- [X] T026 [US2] Bind destination focus/selection and drag previews to the shared
  panel in `src/scenes/PrepareScene.ts`.
- [X] T027 [US2] Restore the current panel on cancel, invalidation, pointer exit,
  and selection changes without mutating the build.
- [X] T028 [US2] Run US2 tests and manually compare preview with committed totals.

**Checkpoint**: Players can evaluate aggregate placement consequences before commit.

---

## Phase 5: User Story 3 - Follow effective race stats (P1)

### Tests

- [X] T029 [P] [US3] Add failing recorded-lap aggregate tests covering flat,
  conditional, Synergy, tiered, and stacking stat-targeted effects.
- [X] T030 [P] [US3] Add failing tests proving models consume recorded evidence
  and never call simulation or substitute another lap.
- [X] T031 [P] [US3] Add failing partial/unavailable evidence tests, including
  the current Test Day ceiling.
- [X] T032 [P] [US3] Add failing player-lap synchronization tests for playback,
  paused inspection, Results, and item details.

### Implementation

- [X] T033 [US3] Implement `recordedLapVehicleStatModel` from
  `PlayerLap.physics.stats` and `itemContributions`.
- [X] T034 [US3] Implement changed-source and segment-conditional detail while
  keeping whole-lap aggregate values distinct.
- [X] T035 [US3] Integrate the stable player-first panel into
  `src/scenes/ContestScene.ts`, updating only when the inspected player lap changes.
- [X] T036 [US3] Integrate the same model into `src/scenes/ResultScene.ts` with
  completed-lap inspection context.
- [X] T037 [US3] Integrate available/unavailable variants into `TestDayScene`,
  `PracticeContestScene`, and `PracticeResultScene`.
- [X] T038 [US3] Synchronize feature-024 item inspection and aggregate vehicle
  stats to the same build, track, and lap context.
- [X] T039 [US3] Run US3 tests and manually inspect a stacking build across laps.

**Checkpoint**: Watched and reviewed stats match immutable race evidence.

---

## Phase 6: User Story 4 - Cross-screen and input consistency (P2)

- [X] T040 [P] [US4] Add cross-screen snapshot tests for identical vocabulary,
  values, order, signs, and precision in `tests/integration/result-scene.test.ts`.
- [X] T041 [P] [US4] Add keyboard, touch, focus, and no-hover access tests for
  source details.
- [X] T042 [P] [US4] Add layout tests for 1920x1080, 1366x768, 1024x768,
  800x450, and 390x844.
- [X] T043 [P] [US4] Verify improved, reduced, unchanged, conditional, preview,
  partial, and unavailable states without color and with reduced motion.
- [X] T044 [US4] Resolve any shared-theme/layout issues in
  `src/scenes/vehicleStatVisuals.ts` without introducing scene-specific variants.
- [X] T045 [US4] Run US4 tests and complete the quickstart interaction matrix.

---

## Phase 7: Regression and completion

- [X] T046 Run catalog-wide current-build and legal-installation reconciliation
  coverage for all 70 items.
- [X] T047 Prove byte-identical build, lap, contest, result, run, and Test Day
  outputs before and after presentation integration.
- [X] T048 Run `npm test`, `npm run lint`, and `npm run build`.
- [X] T049 Complete browser visual review across preparation, race, Results,
  Test Day, supported inputs, and supported viewports.
- [X] T050 Record completion evidence and any genuinely deferred follow-up in
  `specs/025-vehicle-stat-display/quickstart.md` and `specs/DEFERRED.md`.

## Dependencies

- Phase 2 blocks all user stories.
- US1 supplies current totals required by US2.
- US2 and US3 may proceed independently after US1's shared aggregation exists.
- US4 follows the integrated surfaces from US1-US3.
- Feature 027 begins after this specification package; it does not block Feature
  025 implementation and must not absorb aggregate vehicle-stat ownership.

## MVP

Phases 1-4 form the minimum valuable implementation: an honest current vehicle
panel plus authoritative placement preview. Race evidence is still P1 and must
ship before Feature 025 is considered complete.
