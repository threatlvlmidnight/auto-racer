# Tasks: Item Stat Presentation

**Input**: Design documents from `/specs/024-item-stat-presentation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/item-presentation-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. Pure presentation contracts and all 70 catalog items are
covered with Vitest; rendered input, responsive, and cross-scene behavior are
covered by integration tests and the existing browser sanity workflow.

**Organization**: Tasks are grouped by the four user stories in `spec.md`.
Foundational work creates the single formatting vocabulary and renderer boundary.
US1 delivers readable cards and persistent inspection in preparation. US2 adds
authoritative placement comparison. US3 carries the same model into race,
results, and Test Day. US4 completes keyboard/touch parity and responsive,
non-color, reduced-motion validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no
  dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish
  tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Lock the existing catalog and UI surfaces before replacing their
presentation

- [ ] T001 Confirm the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint
  toolchain in `package.json` is sufficient and record that feature 024 adds no
  runtime dependency in `specs/024-item-stat-presentation/quickstart.md`
- [ ] T002 [P] Inventory every current item presentation call site
  (`PrepareScene`, `ContestScene`, `ResultScene`, Test Day scenes,
  `garagePresentation.ts`, `resultFormatting.ts`, `itemVisuals.ts`) and record
  its authoritative item/context/evidence source in
  `specs/024-item-stat-presentation/contracts/item-presentation-contract.md`
- [ ] T003 [P] Add a representative feature-024 item fixture set covering direct,
  tradeoff, conditional, flat Buff, stacking Buff, count/value-scaled Buff,
  Synergy, tiered, storage-active, storage-inert, and economy-only shapes in
  `tests/fixtures/item-presentation-fixtures.ts`

**Checkpoint**: Every consumer and required content shape has an explicit test
fixture or catalog source.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the one pure vocabulary/model boundary and reusable renderer
that all four user stories require

**CRITICAL**: Complete this phase before scene-specific user-story work.

### Tests (write first and confirm RED)

- [ ] T004 [P] Add failing tests for shared stat order, player-facing names,
  abstract units, signs, precision, zero handling, and semantic direction
  (including negative time = Gain and negative physical delta = Loss) in
  `tests/unit/itemPresentation.test.ts`
- [ ] T005 [P] Add failing structural tests for `CompactItemModel`,
  `ItemInspectorModel`, `InstallationPresentation`, `PlacementComparisonModel`,
  `RelationshipEvidence`, and `ItemLapEvidence` context invariants in
  `tests/unit/itemPresentation.test.ts`
- [ ] T006 [P] Add failing tests confirming formatter purity/determinism and that
  Phaser is not imported by the pure model module in
  `tests/unit/itemPresentation.test.ts`
- [ ] T007 [P] Extend descriptor tests for category/effect-family supporting
  marks, active-storage state, and direction-neutral behavior in
  `tests/unit/itemVisuals.test.ts`

### Implementation

- [ ] T008 Define shared stat metadata, presentation context, compact/inspector,
  placement, relationship, lap-evidence, and selection-state types in
  `src/scenes/itemPresentation.ts`, including owned definitions for
  `ItemVisualKind`, `ItemStateBadge`, `PlacementPresentationContext`, and the
  `RecordedItemEvidence` adapter union (depends on T004-T006; `data-model.md`)
- [ ] T009 Implement `statDefinition` and `formatStatDelta` in
  `src/scenes/itemPresentation.ts`, including stable order, abstract units,
  precision, signs, and semantic Gain/Loss/Neutral direction (depends on T004,
  contract §2)
- [ ] T010 Refactor `src/scenes/itemVisualDescriptor.ts` into a supporting
  category/effect-family descriptor that never substitutes visual direction for
  written direction (depends on T007)
- [ ] T011 Implement model-driven compact-card and inspector Phaser renderers,
  scroll/overflow hooks, selected/focused/transient-preview states, and cleanup
  lifecycle in `src/scenes/itemVisuals.ts`; retain compatibility exports for
  unmigrated scenes until T048/T061 removes their final use (depends on
  T008-T010; contract §8)
- [ ] T012 Run `tests/unit/itemPresentation.test.ts` and
  `tests/unit/itemVisuals.test.ts`; confirm the foundational contract is GREEN
  (depends on T008-T011)

**Checkpoint**: A pure shared model and reusable renderer exist; no scene has
been migrated yet.

---

## Phase 3: User Story 1 - Understand an item at a glance (Priority: P1) MVP

**Goal**: Reward, supplier, installed, and storage cards expose item identity and
all consequential effects without interaction, while selection opens a complete
persistent inspector.

**Independent Test**: Present the representative set and confirm each item's
stat, direction, target, condition, category, tier, origin, price, and no-effect
state can be understood without source data or hover.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T013 [P] [US1] Add failing compact-model tests for direct physical deltas,
  multi-stat tradeoffs, conditional rules, time effects, and economy-only items;
  penalties and conditions must receive separate visible lines in
  `tests/unit/itemPresentation.test.ts`
- [ ] T014 [P] [US1] Add failing compact-model tests for flat, stacking,
  per-count, fitted-value-scaled Buffs and both Synergy condition shapes;
  target stat, eligible set, magnitude, cadence/scaling, and Buff-versus-Synergy
  identity must be explicit in `tests/unit/itemPresentation.test.ts`
- [ ] T015 [P] [US1] Add failing full-inspector tests for category, origin, tags,
  tier/base/effective values, price/affordability, storage activity, Fitted and
  Improvised behavior, cooldown, and omission of irrelevant empty sections in
  `tests/unit/itemPresentation.test.ts`
- [ ] T016 [P] [US1] Add a failing catalog sweep over all 70 items ensuring every
  item formats successfully and every consequential authored field maps to a
  compact or inspector line in `tests/unit/itemPresentation.test.ts`
- [ ] T017 [P] [US1] Replace legacy Performance/Neutral expectation tests with
  origin/category/stat vocabulary expectations in
  `tests/integration/result-scene.test.ts`
- [ ] T018 [P] [US1] Add failing preparation-scene model tests confirming offers,
  installed items, and stored items request the correct surface/tier/price/
  installation context in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 1

- [ ] T019 [US1] Implement typed authored-effect extraction for `physics`,
  `conditionalPhysics`, `timeModifier`, `buff`, `synergyEffects`, and no-race-
  effect detection in `src/scenes/itemPresentation.ts` (depends on T013-T014)
- [ ] T020 [US1] Implement `compactItemModel` and `itemInspectorModel`, including
  tier-one versus effective values, stable section ordering, rule prefixes,
  affordability, storage behavior, and accessible labels in
  `src/scenes/itemPresentation.ts` (depends on T015-T016, T019; contracts §3-4)
- [ ] T021 [US1] Refactor `src/scenes/garagePresentation.ts` to adapt build,
  slot/storage, tier, synergy satisfaction, and offer context into the shared
  models; delete competing legacy effect/cooldown strings (depends on T018,
  T020)
- [ ] T022 [US1] Replace Reward Draft, Parts Supplier, installed, and storage
  icon/name cards and hover-only tooltips with compact cards plus one persistent
  selected-item inspector in `src/scenes/PrepareScene.ts` (depends on T011,
  T020-T021)
- [ ] T023 [US1] Implement click/tap selection and optional hover preview in
  `src/scenes/PrepareScene.ts`; pointer exit restores the persistent selection,
  and selecting never accepts, purchases, moves, or sells an item (depends on
  T022; contract §7)
- [ ] T024 [US1] Refactor `src/scenes/resultFormatting.ts` item identity/effect/
  cooldown/detail helpers to delegate to `src/scenes/itemPresentation.ts` while
  retaining temporary compatibility exports for not-yet-migrated scenes
  (depends on T017, T020)
- [ ] T025 [US1] Run the US1 unit/integration tests and verify the representative
  set in Reward Draft and Parts Supplier at 800×450 without using hover; confirm
  GREEN (depends on T019-T024)

**Checkpoint**: US1 is independently usable as the MVP—players can read and
persistently inspect every current item while choosing or arranging it.

---

## Phase 4: User Story 2 - Compare an offer with the current build (Priority: P1)

**Goal**: Selected items and candidate destinations show authoritative
Fitted/Flexible/Improvised/Stored behavior, incoming/outgoing comparison, live
relationship satisfaction, and effective tiers before placement commits.

**Independent Test**: Preview one offer or held item in matching, Flex,
mismatched, storage, and occupied destinations; confirm the displayed active/
inactive behavior and comparison match the authoritative garage preview before
commitment.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T026 [P] [US2] Add failing tests adapting `previewGarageCommand` results
  into `PlacementComparisonModel` for place, move, swap, replace/evict where the
  authoritative preview supports them, no-op, invalid, and requires-confirmation
  outcomes in `tests/unit/garagePresentation.test.ts`
- [ ] T027 [P] [US2] Add failing tests for Fitted, Flexible, Improvised, and
  Stored presentation, including gained/lost behavior, no-additional-consequence,
  and active/inert storage states in `tests/unit/itemPresentation.test.ts`
- [ ] T028 [P] [US2] Add failing tests for current satisfied/unsatisfied Synergy
  relationships, exact-count boundaries, per-count/value-scaled Buff magnitude,
  and distinction between carried tags and performed effects in
  `tests/unit/garagePresentation.test.ts`
- [ ] T029 [P] [US2] Add failing tier comparison tests confirming held tier and
  tier-adjusted values are explicit beside an authored tier-one offer in
  `tests/unit/itemPresentation.test.ts`
- [ ] T030 [P] [US2] Extend garage input-parity tests so drag/drop and select-
  then-destination produce the same source, destination, preview, confirmation,
  and committed build; selection, cancelled drag, below-threshold gesture, and
  invalid drop produce no mutation in
  `tests/integration/garage-input-parity.test.ts`

### Implementation for User Story 2

- [ ] T031 [US2] Implement installation and relationship evidence adapters plus
  `placementComparisonModel` in `src/scenes/garagePresentation.ts`, consuming
  existing installation and garage-preview authority without recomputing
  legality (depends on T026-T029; contract §5)
- [ ] T032 [US2] Render the candidate destination state and incoming/outgoing
  inspector comparison in `src/scenes/itemVisuals.ts`, using identical stat
  ordering/formatting for both items (depends on T027, T029, T031)
- [ ] T033 [US2] Wire drag destination enter/leave and select-then-destination
  preview state into `src/scenes/PrepareScene.ts`; preview must show before
  commit and cancellation must restore the current selected-item inspector
  (depends on T031-T032)
- [ ] T034 [US2] Route drag/drop and select-then-destination through the same
  existing acquisition/garage command adapters in `src/scenes/PrepareScene.ts`,
  preserving authoritative swap/confirmation/invalid behavior and never adding
  new placement semantics (depends on T030, T033)
- [ ] T035 [US2] Update selection after sell, purchase, decline, tier-combine,
  max-tier conversion, move, swap, replacement, or eviction so the inspector
  follows an unambiguous authoritative result or closes instead of showing stale
  data in `src/scenes/PrepareScene.ts` (depends on T034)
- [ ] T036 [US2] Run US2 unit/integration tests and manually compare the
  representative tradeoff item across every destination using both placement
  inputs; confirm GREEN (depends on T031-T035)

**Checkpoint**: US2 is independently testable; inspection and comparison explain
the placement but only authoritative placement commits change the build.

---

## Phase 5: User Story 3 - Inspect why an item mattered (Priority: P2)

**Goal**: Race playback, scored results, and Test Day preserve item identity and
authored rules while adding authoritative lap-specific activation,
amplification, installation, contribution, and zero-contribution evidence.

**Independent Test**: Race a build containing a conditional item and stacking
stat-targeted Buff; inspect both during preparation, two different race laps,
results, and Test Day, confirming stable authored identity and correct
context-specific evidence.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T037 [P] [US3] Add failing resolution tests for
  `ItemPhysicalContributionEvidence`: one entry per held item/lap with source
  location, effective tier/installation, flat resolved delta, conditional
  resolved deltas and matched segment indexes, Buff/Synergy applications, and
  inactivity reason; assert all pre-existing stats/phases/times remain identical
  in `tests/unit/laps.test.ts`
- [ ] T038 [P] [US3] Add failing tests retaining zero-contribution items with a
  specific inactive-storage, unmet-condition, cooldown, ineligible-target, or
  unavailable-evidence reason in `tests/unit/itemPresentation.test.ts`
- [ ] T039 [P] [US3] Add failing tests reconciling multiple individually
  attributable item sources affecting one stat from recorded physical evidence,
  including tier, installation, Synergy, Buff, and condition adjustment without
  presentation-side recomputation, in `tests/unit/itemPresentation.test.ts`
- [ ] T040 [P] [US3] Add failing race presentation tests mapping playback frame
  lap index to the same lap context used by the selected item's evidence in
  `tests/unit/playback.test.ts`
- [ ] T041 [P] [US3] Extend scored-result tests so every installed and stored item
  remains selectable and uses shared authored plus recorded result evidence in
  `tests/integration/result-scene.test.ts`
- [ ] T042 [P] [US3] Add Test Day model tests for briefing, playback, and result
  contexts, including the exact `Not evaluated in this Test Day` physical state
  where the legacy practice path does not run track-aware physics; this state
  must differ from zero, inactive, and unmet, in
  `tests/unit/practicePresentation.test.ts`

### Implementation for User Story 3

- [ ] T043 [US3] Define `ItemPhysicalContributionEvidence` in
  `src/simulation/types.ts`, emit it from the same effective-item and
  conditional-match values already used by `src/simulation/laps.ts`, and adapt
  it through `resolvedItemEvidence` in `src/scenes/itemPresentation.ts`; never
  rerun physics, and prove all existing stats/phases/times/outcomes remain
  unchanged (depends on T037-T039; contract §6)
- [ ] T044 [US3] Add persistent read-only board-card selection and a lap-context
  item inspector to `src/scenes/ContestScene.ts`; update only when the selected
  item or active lap changes and preserve contest non-interactivity (depends on
  T040, T043)
- [ ] T045 [US3] Replace scored-result item rows/tooltips with selectable compact
  cards and a persistent shared inspector in `src/scenes/ResultScene.ts`,
  including installed, storage, and zero-contribution items (depends on T041,
  T043)
- [ ] T046 [US3] Extend `src/scenes/practicePresentation.ts` with shared item
  context/evidence adapters for Test Day briefing, playback, and results,
  rendering legacy time evidence where present and the explicit
  `Not evaluated in this Test Day` state for track-aware physical effects
  (depends on T042-T043)
- [ ] T047 [US3] Add selectable item summaries and persistent inspectors to
  `src/scenes/TestDayScene.ts`, `src/scenes/PracticeContestScene.ts`, and
  `src/scenes/PracticeResultScene.ts`, synchronized to the active/paused practice
  lap where evidence exists (depends on T046)
- [ ] T048 [US3] Remove remaining scene-specific item rule strings and legacy
  hover tooltip usage from `src/scenes/ContestScene.ts`, `src/scenes/ResultScene.ts`,
  `src/scenes/TestDayScene.ts`, `src/scenes/PracticeContestScene.ts`, and
  `src/scenes/PracticeResultScene.ts`; retain no competing formatter (depends on
  T044-T047)
- [ ] T049 [US3] Run US3 unit/integration tests and perform the quickstart race/
  result/Test Day representative-item flow; confirm GREEN and reconcile displayed
  evidence with recorded laps, including proof that Test Day unavailability is
  not displayed as zero contribution (depends on T043-T048)

**Checkpoint**: US3 independently closes the prepare-to-contest transparency
loop with one stable item language and authoritative resolved evidence.

---

## Phase 6: User Story 4 - Read and operate item details on every supported input (Priority: P2)

**Goal**: Mouse, touch, and keyboard users can select, inspect, dismiss, and
place items; all required content reflows at supported viewports and remains
understandable without color or motion.

**Independent Test**: Repeat representative inspection and placement by mouse
without hover, touch, and keyboard at every supported viewport, then repeat in
monochrome and reduced-motion modes.

### Tests for User Story 4 (write first and confirm RED)

- [ ] T050 [P] [US4] Add failing selection-controller tests for persistent
  selection, transient hover preview/restore, focus, dismissal, stale-item
  cleanup, destination navigation, and inspected-lap synchronization in
  `tests/unit/itemVisuals.test.ts`
- [ ] T051 [P] [US4] Extend garage parity tests for visible keyboard focus,
  keyboard selection/destination activation, touch tap selection, touch drag,
  drag-threshold/cancel behavior, and identical authoritative placement results
  in `tests/integration/garage-input-parity.test.ts`
- [ ] T052 [P] [US4] Add pure layout-model tests for 1920×1080, 1366×768,
  1024×768, 800×450, and 390×844; require 10px compact text, 11px inspector text,
  14px primary action labels, and 40×32 current-canvas destinations, with every
  consequential line reachable without overlap in
  `tests/unit/itemVisuals.test.ts`; only 800×450 is a runtime integration target
  in feature 024
- [ ] T053 [P] [US4] Add non-color/reduced-motion state tests ensuring beneficial,
  harmful, active, inactive, selected, focused, conditional, unsatisfied,
  Fitted, Flexible, Improvised, and storage-active states have structural/text
  distinctions in `tests/unit/itemVisuals.test.ts`
- [ ] T054 [P] [US4] Add accessible-label coverage for every interactive card,
  inspector control, and garage destination using the same presentation model in
  `tests/unit/itemPresentation.test.ts`

### Implementation for User Story 4

- [ ] T055 [US4] Implement reusable scene-local item selection/focus controller
  behavior in `src/scenes/itemVisuals.ts`, including hover restoration,
  drag-threshold separation, dismissal, stale selection cleanup, and accessible
  labels (depends on T050, T054)
- [ ] T056 [US4] Implement keyboard card/destination navigation and activation,
  touch drag identity lift/valid-target highlighting, and equivalent select-
  then-destination input in `src/scenes/PrepareScene.ts` (depends on T051, T055)
- [ ] T057 [US4] Implement wide, logical-canvas, and portrait card/inspector
  layout models with intentional scrolling/paging and the specified minimum
  type/target sizes in `src/scenes/itemVisuals.ts`; bind the current logical-
  canvas mode in feature 024 and expose non-current modes for feature 026
  (depends on T052, T055)
- [ ] T058 [US4] Apply the shared responsive item layout and focus behavior to
  `src/scenes/ContestScene.ts`, `src/scenes/ResultScene.ts`,
  `src/scenes/TestDayScene.ts`, `src/scenes/PracticeContestScene.ts`, and
  `src/scenes/PracticeResultScene.ts` (depends on T057)
- [ ] T059 [US4] Add structural state markers and reduced-motion branches to
  `src/scenes/itemVisuals.ts` and all item-using scenes so color/animation never
  carries unique meaning (depends on T053, T057-T058)
- [ ] T060 [US4] Run all US4 automated tests and execute the quickstart input,
  800×450 runtime, layout-model viewport, monochrome, and reduced-motion matrix;
  confirm GREEN without claiming non-current Phaser canvas integration
  (depends on T055-T059)

**Checkpoint**: All four user stories are independently functional on mouse,
touch, and keyboard across supported layouts.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Remove obsolete presentation paths, verify catalog completeness,
and prove no gameplay regression

- [ ] T061 [P] Remove obsolete `enableItemTooltip` and any now-unused legacy
  item-detail helpers/imports from `src/scenes/itemVisuals.ts`,
  `src/scenes/resultFormatting.ts`, and all consumers; `rg` must find no
  hover-only required information path
- [ ] T062 [P] Audit every catalog item against compact/full coverage and record
  any intentional economy-only/no-effect state in
  `specs/024-item-stat-presentation/quickstart.md`
- [ ] T063 [P] Verify feature 025 can reuse exported stat vocabulary without
  importing item-card/inspector types, and record the verification in
  `specs/024-item-stat-presentation/quickstart.md`
- [ ] T064 Run `npm test`, `npm run lint`, and `npm run build`; confirm existing
  deterministic acquisition, economy, garage, tier, physics, contest,
  progression, and Test Day outcomes remain unchanged and passing; separately
  assert the new physical evidence reconciles with the already-resolved stats
- [ ] T065 Run the local browser sanity pass through Reward Draft, Parts
  Supplier, held-item rearrangement, race playback, scored results, and Test Day
  on the current 800×450 logical runtime; record high-resolution/portrait
  integration debt for feature 026 in
  `specs/024-item-stat-presentation/quickstart.md`
- [ ] T066 Re-run every acceptance and success-criterion check in
  `specs/024-item-stat-presentation/quickstart.md` and mark feature 024 complete
  only when all consequential item fields, interactions, and contexts reconcile

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies
- **Phase 2 - Foundational**: Depends on Setup; blocks every user story
- **Phase 3 - US1**: Depends on Foundational; MVP item cards/inspector
- **Phase 4 - US2**: Depends on US1 models and preparation renderer
- **Phase 5 - US3**: Depends on US1 shared models; may begin in parallel with
  US2 after T020, though final reconciliation benefits from US2 relationship and
  installation adapters
- **Phase 6 - US4**: Depends on US1-US3 scene integrations so input/responsive
  behavior can be applied consistently
- **Phase 7 - Polish**: Depends on all desired user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently delivers readable cards and
  persistent inspection in preparation
- **US2 (P1)**: US1; independently delivers authoritative build comparison and
  placement-preview parity
- **US3 (P2)**: US1 plus recorded contest/practice evidence; independently
  delivers race/result/Test Day transparency and may be developed alongside US2
  after the shared model is stable
- **US4 (P2)**: US1-US3 scene surfaces; independently validates full input and
  responsive accessibility across them

### Test-First Order

- T004-T007 MUST fail before T008-T011 create the foundational model/renderer
- T013-T018 MUST fail before T019-T024 implement US1 formatting and preparation
- T026-T030 MUST fail before T031-T035 implement placement comparison/parity
- T037-T042 MUST fail before T043-T048 implement resolved scene evidence
- T050-T054 MUST fail before T055-T059 implement input/responsive behavior
- Scene/browser verification follows pure-model and integration GREEN checks;
  simulation tests remain regression tests because this feature changes no
  simulation behavior

---

## Parallel Opportunities

### Setup and foundational tests

```text
T002: presentation call-site/evidence inventory
T003: representative fixture set
T004-T006: pure model/stat contract tests
T007: visual descriptor tests
```

### US1 tests

```text
T013-T016: shared compact/inspector/catalog tests
T017: result compatibility tests
T018: garage context tests
```

### US2 tests

```text
T026/T028: garage preview and relationship adapters
T027/T029: installation and tier presentation models
T030: input parity integration
```

### US3 tests

```text
T037-T039: resolved evidence model
T040: playback lap synchronization
T041: scored result integration
T042: Test Day adapters/unavailable evidence
```

After T020 stabilizes the shared model, US2 adapter work and US3 evidence work
touch different files and can proceed in parallel.

### US4 tests

```text
T050/T052/T053: selection, layout, and state renderer contracts
T051: garage input parity
T054: accessible labels
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T025.
3. Stop and validate Reward Draft, Parts Supplier, installed slots, and storage
   using the representative fixture set without hover.

US1 is the MVP because it replaces the current unreadable icon/name cards and
hover-only details with decision-ready cards and a persistent inspector before
more complex comparison or resolved evidence is added.

### Incremental Delivery

1. Foundation → shared vocabulary and renderers
2. US1 → readable preparation cards and inspector
3. US2 → placement and replacement comparison
4. US3 → race, results, and Test Day evidence
5. US4 → complete input/responsive accessibility
6. Polish → remove legacy paths, full regression, browser matrix

Each checkpoint leaves the prior slice usable and testable. If scope must be
reduced, do not substitute hover-only behavior or omit penalties/conditions;
stop at the last completed checkpoint instead.

### Commit Strategy

- Commit Foundational separately from scene migrations.
- Commit each user story after its checkpoint passes.
- Keep feature 025 aggregate vehicle panels and feature 026 art/style work out of
  feature 024 commits except for documentation of shared boundaries or visual
  debt.

---

## Notes

- `[P]` means parallel-safe by dependency and primary file ownership; tasks that
  name the same file may still require coordination.
- Every formatter and adapter is presentation-only; no task authorizes changes
  to simulation math, item content, economy, or garage legality.
- Hover is always optional convenience. Persistent selection is the required
  information path.
- Feature 025 owns aggregate vehicle stats. Feature 024 exports vocabulary only.
- Feature 026 owns final high-resolution styling and generated art. Feature 024
  delivers functional hierarchy and interaction first.
