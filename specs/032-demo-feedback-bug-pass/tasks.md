# Tasks: Demo Feedback Bug Pass

**Input**: Design documents from `specs/032-demo-feedback-bug-pass/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/demo-feedback-contract.md`, `quickstart.md`

**Testing rule**: Consequential simulation, economy, settlement, Undo, history,
and balance tasks use strict red-green-refactor. Presentation-model tests fail
before Phaser scene integration. Art polish follows semantic/input/layout tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]** means safe to execute concurrently because it touches distinct files
  and has no incomplete dependency.
- **[US1–US5]** maps directly to the five independently testable user stories in
  `spec.md`.

---

## Phase 1: Setup and Baselines

**Purpose**: Freeze current behavior, asset inputs, and reported failures before
changing shared authorities.

- [X] T001 Run and record the pre-feature `npm test`, `npm run lint`, `npm run build`, and `npm run build:pages` baselines in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`
- [X] T002 [P] Create catalog-backed deterministic fixtures for direct, amplifier, composition-scaled, fitted-value-scaled, cooldown/lap, synergy, economy, and configurable items in `tests/fixtures/demo-feedback-fixtures.ts`
- [X] T003 [P] Add regression coverage for DEMO-001 hidden Reward Draft Test Day and DEMO-002 skip semantics in `tests/integration/demo-regressions.test.ts`
- [X] T004 [P] Add baseline assertions for Supplier purchased-slot reuse, partial-stock restock, and duplicate-tier feedback gaps in `tests/integration/supplier-feedback.test.ts`
- [X] T005 [P] Add baseline position-language, Local third-place reputation, and final-summary record assertions in `tests/integration/result-summary.test.ts`
- [X] T006 [P] Validate and document the 1672×941 transparent/chroma masters, alpha corners, and source provenance in `tests/unit/uiChrome.test.ts` and `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`

**Checkpoint**: Every reported defect has a failing or pinned baseline and both
approved asset masters are reproducible.

---

## Phase 2: Foundational Pure Contracts

**Purpose**: Add shared types and reducers that block story-level scene work.

**⚠️ CRITICAL**: Complete this phase before integrating any story into Phaser.

- [X] T007 Add `ScalingClassification`, `LiveStatChange`, `EconomyContribution`, `AcquisitionReceipt`, `InventoryHostContext`, `SaleReceipt`, `SaleUndoSnapshot`, and record-projection types to `src/simulation/types.ts`
- [X] T008 [P] Add failing immutability/shape tests for the new evidence and receipt types in `tests/unit/demoFeedbackTypes.test.ts`
- [X] T009 [P] Add the pure `idle | preview | pinned` tag-inspection reducer and matching-location projection contract to `src/scenes/itemPresentation.ts`
- [X] T010 [P] Add the pure inventory host/layout/session presentation contract skeleton to `src/scenes/inventoryPresentation.ts`
- [X] T011 [P] Add the semantic UI crop-region/state types and empty region registry to `src/scenes/uiChrome.ts`
- [X] T012 Add shared catalog/build location helpers that enumerate installed and stored held items without mutation in `src/simulation/garage.ts`
- [X] T013 Run focused foundation tests for `tests/unit/demoFeedbackTypes.test.ts`, `tests/unit/itemPresentation.test.ts`, `tests/unit/inventoryPresentation.test.ts`, and `tests/unit/uiChrome.test.ts`, then resolve type/lint failures without changing gameplay behavior

**Checkpoint**: Story work can consume typed evidence, receipts, context tokens,
and semantic chrome without inventing local scene state.

---

## Phase 3: User Story 1 — See Item and Stat Progression (Priority: P1) 🎯 MVP

**Goal**: Watched races and Results visibly reconcile live effective stats,
amplification, and every shipped scaling-like rule with retained evidence.

**Independent Test**: Run the controlled build matrix at `1×` and `2×`; every
displayed current value, delta, arrow, source, amplifier, category, and cadence
must match immutable lap/result evidence.

### Tests — write first and observe failure

- [X] T014 [P] [US1] Add catalog-wide classification tests for every scaling-like item in `tests/unit/scalingClassification.test.ts`
- [X] T015 [P] [US1] Add failing before/current/delta/source/amplifier evidence tests across lap boundaries in `tests/unit/laps.test.ts`
- [X] T016 [P] [US1] Add failing pure compact-panel reducer tests, including non-color arrow labels and unchanged-state behavior, in `tests/unit/liveStatPresentation.test.ts`
- [X] T017 [P] [US1] Add failing delayed-frame and `1×`/`2×` exactly-once boundary consumption tests in `tests/integration/watched-race-feedback.test.ts`
- [X] T018 [P] [US1] Add failing Result/Test Day reconciliation tests for all audited scaling categories in `tests/integration/result-scene.test.ts` and `tests/integration/test-day-flow.test.ts`

### Implementation

- [X] T019 [US1] Implement authoritative `composition | fitted-value | lap-activation` classification and next-trigger projection in `src/simulation/buffs.ts`
- [X] T020 [US1] Extend immutable lap contribution evidence with previous/current effective stat values, signed deltas, source IDs, and amplifier attribution in `src/simulation/laps.ts`
- [X] T021 [US1] Extend playback boundary publication to carry each retained stat change once without recomputation in `src/simulation/playback.ts`
- [X] T022 [US1] Implement the compact live-stat presentation reducer over retained boundaries in `src/scenes/vehicleStatPresentation.ts`
- [X] T023 [US1] Add arrow, signed delta, source, and transient highlight rendering without color-only meaning in `src/scenes/vehicleStatVisuals.ts`
- [X] T024 [US1] Integrate the compact panel into watched scored races without changing layout authority or race results in `src/scenes/ContestScene.ts`
- [X] T025 [US1] Reuse the same retained-evidence projection in Test Day playback/results in `src/scenes/PracticeContestScene.ts`, `src/scenes/PracticeResultScene.ts`, and `src/scenes/practicePresentation.ts`
- [X] T026 [US1] Show audited scaling category, current input/magnitude, and next trigger in result evidence in `src/scenes/ResultScene.ts`
- [X] T027 [US1] Remove or rewrite every catalog/presentation phrase that falsely implies race/day persistence in `src/content/items/`, `src/scenes/itemPresentation.ts`, and `src/scenes/resultFormatting.ts`
- [X] T028 [US1] Verify Variable-Pitch Propeller remains +15% top-speed effect per other held `airflow` item and exposes count/current/next effect in `src/content/items/rook.ts` and `src/scenes/itemPresentation.ts`
- [X] T029 [US1] Run `tests/unit/scalingClassification.test.ts`, `tests/unit/liveStatPresentation.test.ts`, `tests/integration/watched-race-feedback.test.ts`, and existing playback-control suites; record speed/skip parity in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`

**Checkpoint**: US1 is independently demoable and all live values reconcile to
recorded evidence.

---

## Phase 4: User Story 2 — Understand Rules, Synergies, and Tags (Priority: P1)

**Goal**: Every item exposes complete tags and mechanic-accurate relationships;
tag inspection highlights every matching held item with input parity.

**Independent Test**: Inspect all 70 catalog items on acquisition, inventory,
race, and Results surfaces with pointer, touch, and keyboard; no authored tag or
mechanical condition is hidden or malformed.

### Tests — write first and observe failure

- [X] T030 [P] [US2] Add catalog-wide authored-tag completeness and unique accessible icon-token tests in `tests/unit/itemPresentation.test.ts`
- [X] T031 [P] [US2] Add preview-versus-pinned reducer, held-match count, installed/storage location, and keyboard/touch parity tests in `tests/unit/tagInspection.test.ts`
- [X] T032 [P] [US2] Add synergy explanation contract tests for relationship, threshold, target stat/effect, and result in `tests/unit/synergyPresentation.test.ts`
- [X] T033 [P] [US2] Add explicit Variable-Pitch Propeller and Interchangeable Test Mounts regression cases in `tests/integration/demo-regressions.test.ts`

### Implementation

- [X] T034 [US2] Implement complete tag token/name/icon metadata for all authored tags in `src/scenes/itemVisualDescriptor.ts`
- [X] T035 [US2] Implement shared full-rule, scaling-category, and mechanic-accurate synergy explanation projection in `src/scenes/itemPresentation.ts`
- [X] T036 [US2] Complete preview/pin/unpin/focus state and matching garage-location projection in `src/scenes/itemPresentation.ts`
- [X] T037 [US2] Render compact tag icons, pinned details, counts, and non-color matching-item highlights in `src/scenes/itemVisuals.ts`
- [X] T038 [US2] Correct Interchangeable Test Mounts authored/presented rule to exactly-two-Power +50% self cornering in `src/content/items/rook.ts` and its presentation fixtures
- [X] T039 [US2] Integrate the same inspector/highlight behavior into Reward Draft, Supplier, and inventory hosts in `src/scenes/PrepareScene.ts` and `src/scenes/inventoryVisuals.ts`
- [X] T040 [US2] Integrate read-only item/tag inspection into watched race and Results without changing playback state in `src/scenes/ContestScene.ts` and `src/scenes/ResultScene.ts`
- [X] T041 [US2] Run the 70-item catalog matrix and pointer/touch/keyboard cases in `tests/unit/itemPresentation.test.ts`, `tests/unit/tagInspection.test.ts`, and `tests/unit/synergyPresentation.test.ts`

**Checkpoint**: US2 is independently testable; every item rule and relationship
is available without hover.

---

## Phase 5: User Story 3 — Acquire, Upgrade, Move, and Sell Clearly (Priority: P1)

**Goal**: Supplier/reward actions are unambiguous, inventory is available from
every eligible host, and sales support one exact bounded Undo.

**Independent Test**: Purchase, tier, restock, skip, rearrange, sell, Undo, and
transition across wide/narrow hosts using pointer, touch, and keyboard; every
mutation happens exactly once and context restores exactly.

### Tests — write first and observe failure

- [X] T042 [P] [US3] Add failing consumed-slot, duplicate purchase rejection, and full-three-offer restock transition tests in `tests/unit/encounters.test.ts`
- [X] T043 [P] [US3] Add failing old/new tier and changed-effect receipt tests in `tests/unit/tiering.test.ts`
- [X] T044 [P] [US3] Add failing Reward Draft `SKIP REWARDS` no-mutation tests in `tests/integration/supplier-feedback.test.ts`
- [X] T045 [P] [US3] Add failing responsive overlay/full-window, blocked-modal, and exact host-token restoration tests in `tests/unit/inventoryPresentation.test.ts`
- [X] T046 [P] [US3] Add failing sale base/modifier receipt and atomic exact-location/tier/credit Undo tests in `tests/unit/garage.test.ts`
- [X] T047 [P] [US3] Add failing Undo invalidation tests for subsequent move, sale, acquisition, close, and scene transition in `tests/unit/inventoryUndo.test.ts`
- [X] T048 [P] [US3] Add eligible-host and live-race exclusion integration matrix in `tests/integration/inventory-flow.test.ts`
- [X] T049 [P] [US3] Add drag-zone visibility/drop plus pointer/touch/keyboard parity tests in `tests/integration/garage-input-parity.test.ts`

### Implementation

- [X] T050 [US3] Retain consumed Supplier stock as a disabled acquisition receipt and reject repeated purchase in `src/simulation/encounters.ts`
- [X] T051 [US3] Make Restock atomically replace all three slots with fresh eligible offer IDs and clear old receipts in `src/simulation/encounters.ts`
- [X] T052 [US3] Return old/new tier and changed effect values from duplicate-tier settlement without a second mutation in `src/simulation/tiering.ts` and `src/simulation/encounters.ts`
- [X] T053 [US3] Rename the sole decline action to `SKIP REWARDS` while delegating to the existing no-acquisition transition in `src/scenes/PrepareScene.ts`
- [X] T054 [US3] Render disabled purchased slots plus immediate upgrade confirmation and the dismissible before/after overlay in `src/scenes/PrepareScene.ts`
- [X] T055 [US3] Implement validated immediate sale receipt and exact compensating Undo command in `src/simulation/garage.ts`
- [X] T056 [US3] Implement Undo invalidation on every later inventory mutation and host transition in `src/simulation/run.ts` and `src/simulation/encounters.ts`
- [X] T057 [US3] Complete measured-safe-bounds overlay/full-window and typed host-context reducer in `src/scenes/inventoryPresentation.ts`
- [X] T058 [US3] Build the shared inventory board/storage renderer, drag lifecycle, sell target, payout receipt, and Undo control in `src/scenes/inventoryVisuals.ts`
- [X] T059 [US3] Integrate inventory entry/return into run hub and destination selection in `src/scenes/RunScene.ts` and `src/scenes/DestinationScene.ts`
- [X] T060 [US3] Integrate inventory entry/return into Reward Draft, Supplier, and Sponsor acquisition surfaces in `src/scenes/PrepareScene.ts`
- [X] T061 [US3] Integrate inventory entry/return into pre-race setup while preserving setup selections/memory in `src/scenes/PreRaceScene.ts`
- [X] T062 [US3] Integrate inventory entry/return into Results while preserving settlement/history view state in `src/scenes/ResultScene.ts`
- [X] T063 [US3] Explicitly suppress inventory during scored and Test Day live playback in `src/scenes/ContestScene.ts` and `src/scenes/PracticeContestScene.ts`
- [X] T064 [US3] Run the complete eligible-host, narrow/wide, sale/Undo, and input-parity matrix in `tests/integration/inventory-flow.test.ts`, `tests/unit/inventoryUndo.test.ts`, and `tests/integration/garage-input-parity.test.ts`

**Checkpoint**: US3 can ship independently; no scene owns a parallel garage or
credit mutation path.

---

## Phase 6: User Story 4 — Correct Outcome, Economy, Record, and Balance (Priority: P1)

**Goal**: Podium outcomes, economy-item transactions, final W/L, and entrant
power match the clarified policies and deterministic parity gates.

**Independent Test**: Resolve all eight positions across Local, Championship,
and Elite races with economy items installed/stored; reconcile each receipt and
final record, then rerun fixed balance fixtures byte-identically.

### Tests — write first and observe failure

- [X] T065 [P] [US4] Add exhaustive Local/Championship/Elite position-table tests pinning third at +1 reputation with unchanged purse/points in `tests/unit/settlement.test.ts`
- [X] T066 [P] [US4] Add installed/storage and tier 1/2/3 Chit, Nameplate, and Plaque contribution tests in `tests/unit/economyItems.test.ts`
- [X] T067 [P] [US4] Add exactly-once race-win, sale, and sponsor-success transaction integration tests in `tests/integration/economy-items.test.ts`
- [X] T068 [P] [US4] Add retained-history W/L projection tests for every race kind, retry protection, and no tie bucket in `tests/unit/runRecord.test.ts`
- [X] T069 [P] [US4] Add final summary reconciliation tests for wins + losses = counted scored history in `tests/integration/result-summary.test.ts`
- [X] T070 [P] [US4] Build fixed-seed representative draft/run and optimized legal-build fixture harnesses in `tests/fixtures/balance-fixtures.ts`
- [X] T071 [P] [US4] Add immutable Nell catalog and equal stock vehicle baseline control tests in `tests/unit/balance.test.ts`
- [X] T072 [P] [US4] Add failing ≤5-percentage-point representative and ≤2% ceiling spread assertions in `tests/unit/balance.test.ts`

### Implementation

- [X] T073 [US4] Update Local third-place reputation to +1 while preserving credit and Championship-point policies in `src/simulation/settlement.ts`
- [X] T074 [US4] Implement held-item economy contribution scanning with tier/location evidence in `src/simulation/garage.ts`
- [X] T075 [US4] Implement Bookmaker's Chit `+1/+2/+3` scored-win credits in race settlement in `src/simulation/settlement.ts` and `src/simulation/run.ts`
- [X] T076 [US4] Implement Engine Builder's Nameplate `+1/+2/+3` per-sale modifier in `src/simulation/garage.ts`
- [X] T077 [US4] Implement Patron's Brass Plaque `+2/+4/+6` successful-sponsor modifier in `src/simulation/encounters.ts` and `src/simulation/run.ts`
- [X] T078 [US4] Author complete deterministic economy rules and tags for the three neutral items in `src/content/items/neutral.ts`
- [X] T079 [US4] Add source/tier/location/base/modifier/total transaction projections to `src/scenes/itemPresentation.ts` and `src/scenes/resultFormatting.ts`
- [X] T080 [US4] Render itemized race, sale, and sponsor economy receipts in `src/scenes/ResultScene.ts`, `src/scenes/PrepareScene.ts`, and `src/scenes/inventoryVisuals.ts`
- [X] T081 [US4] Derive wins/losses solely from retained Local/Championship/Elite placement history in `src/simulation/run.ts`
- [X] T082 [US4] Replace third-place loss copy and render final wins/losses alongside points/reputation in `src/scenes/resultFormatting.ts` and `src/scenes/ResultScene.ts`
- [X] T083 [US4] Run the baseline balance harness and record entrant/item/build evidence before tuning in `specs/032-demo-feedback-bug-pass/balance-evidence.md`
- [X] T084 [US4] Tune existing Evelyn Mercer exclusive item values/synergies only as required in `src/content/items/mercer.ts`
- [X] T085 [US4] Tune existing Lucien Soto exclusive item values/synergies only as required in `src/content/items/soto.ts`
- [X] T086 [US4] Tune existing Inez Rook exclusive item values/synergies only as required in `src/content/items/rook.ts`
- [X] T087 [US4] Rerun both balance gates, iterate T084–T086 without changing Nell or baseline vehicles, and record passing evidence in `specs/032-demo-feedback-bug-pass/balance-evidence.md`
- [X] T088 [US4] Run exhaustive settlement/economy/history tests in `tests/unit/settlement.test.ts`, `tests/unit/economyItems.test.ts`, `tests/unit/runRecord.test.ts`, and `tests/integration/economy-items.test.ts`, then record deterministic rerun comparison in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`

**Checkpoint**: US4 passes both quantitative balance gates and every transaction
is explicit, deterministic, and counted once.

---

## Phase 7: User Story 5 — Intentional, Readable Interface (Priority: P2)

**Goal**: Replace prioritized primitive chrome with the approved quiet visual
language while preserving responsive layout and input semantics.

**Independent Test**: Review championship indicators, pre-race controls, and
shared primary buttons at supported landscape bounds in every semantic state;
no clipping, false focus, color-only state, or loss of item/build dominance.

### Tests — write before runtime integration

- [X] T089 [P] [US5] Add exact named crop rectangles, in-bounds assertions, and non-overlap checks for the approved master in `tests/unit/uiChrome.test.ts`
- [X] T090 [P] [US5] Add nine-slice minimum-size and semantic normal/hover/focus/pressed/disabled mapping tests in `tests/unit/uiChrome.test.ts`
- [X] T091 [P] [US5] Add pre-race false-blue-border versus keyboard-focus regression tests in `tests/integration/pre-race-setup.test.ts`
- [X] T092 [P] [US5] Add championship progress semantic-state and fallback-without-texture tests in `tests/unit/worldTourPresentation.test.ts`
- [X] T093 [P] [US5] Add supported-viewport bounds/input-state tests for prioritized controls in `tests/integration/ui-chrome.test.ts`

### Implementation

- [X] T094 [US5] Measure and register approved source rectangles/nine-slice margins with stable semantic keys in `src/scenes/uiChrome.ts`
- [X] T095 [US5] Preload the transparent control master and preserve a code-rendered fallback in `src/scenes/BootScene.ts` and `src/scenes/visualAssets.ts`
- [X] T096 [US5] Implement reusable runtime-text-over-nine-slice controls with semantic focus/disabled/pressed states in `src/scenes/uiChrome.ts`
- [X] T097 [US5] Replace championship leg/round primitives first while preserving labels and progress meaning in `src/scenes/RunScene.ts` and `src/scenes/worldTourPresentation.ts`
- [X] T098 [US5] Replace pre-race selector/buttons and remove the unintended persistent blue border while retaining true keyboard focus in `src/scenes/PreRaceScene.ts`
- [X] T099 [US5] Replace shared primary buttons on the agreed surfaces without changing actions or focus order in `src/scenes/PrepareScene.ts`, `src/scenes/ResultScene.ts`, and `src/scenes/DestinationScene.ts`
- [X] T100 [US5] Validate neutral chrome, restrained state color, World's Fair/editorial accents, and item/build visual priority in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`
- [X] T101 [US5] Decide from in-game evidence whether additional sprite sheets are needed; if so, record their exact crop inventory/prompts before generation in `specs/032-demo-feedback-bug-pass/ui-asset-manifest.md`

**Checkpoint**: US5 is independently reviewable and the first approved sheet is
proven in-game before any further image-generation spend.

---

## Phase 8: Cross-Story Integration and Release Gate

**Purpose**: Prove combined behavior, static deployment compatibility, and
regression safety.

- [X] T102 [P] Add one full run integration covering acquisition, tags, setup inventory, watched live stats, podium/economy settlement, and final W/L in `tests/integration/demo-feedback-run.test.ts`
- [X] T103 [P] Add deterministic replay assertions showing UI speed, inspection, inventory opening, and chrome never alter contest/result bytes in `tests/integration/demo-regressions.test.ts`
- [X] T104 [P] Add catalog-wide no-hidden-tags/no-false-scaling/no-malformed-synergy audit to `tests/unit/items.test.ts`
- [X] T105 Verify Reward Draft continues hiding Test Day and document the permanent exact-return defect as deferred rather than silently re-enabling it in `specs/DEMO-BUGS.md`
- [X] T106 Run all focused suites listed in `specs/032-demo-feedback-bug-pass/quickstart.md` and reconcile failures to `specs/032-demo-feedback-bug-pass/contracts/demo-feedback-contract.md` before full verification
- [X] T107 Run `npm test`, `npm run lint`, `npm run build`, and `npm run build:pages`; record commands/counts/results in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`
- [X] T108 Perform pointer/touch/keyboard and wide/narrow manual QA from `quickstart.md`, including `1×`/`2×`, sell/Undo expiry, exact context return, and UI states; record evidence in `specs/032-demo-feedback-bug-pass/acceptance-evidence.md`
- [X] T109 Re-run the balance harness from a clean process and verify byte-identical fixture output and both numeric bands in `specs/032-demo-feedback-bug-pass/balance-evidence.md`
- [X] T110 Update `specs/HANDOFF.md`, `specs/DEFERRED.md`, and Feature 032 status with completed scope, evidence links, remaining DEMO-001 work, and Feature 033 ownership; do not mark complete while any required task remains

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1** has no dependencies and freezes the baseline.
- **Phase 2** depends on Phase 1 and blocks every scene integration.
- **US1 and US2** may proceed in parallel after Phase 2, but US2 race/results
  integration should consume US1's stable evidence model.
- **US3** may proceed after Phase 2; its shared item visuals may integrate US2
  when available without blocking the authoritative inventory/Undo logic.
- **US4** pure settlement/economy/history tests may proceed after Phase 2;
  balance tuning must wait for catalog audits and must finish before final QA.
- **US5** crop metadata/tests may proceed after Phase 2, but runtime replacement
  follows semantic story work so visual changes do not obscure logic regressions.
- **Phase 8** depends on every included story checkpoint.

### Critical path

`T001–T013 → T014–T029 → T042–T064 → T065–T088 → T089–T101 → T102–T110`

US2 (`T030–T041`) can overlap US1 after the foundational types settle.

### Parallel opportunities

- Baseline tasks T002–T006 touch separate fixtures/suites.
- Within each story, all tasks explicitly marked `[P]` are designed to be
  written concurrently before implementation.
- US3 authoritative inventory work and US4 settlement tests can proceed in
  parallel after Phase 2 because they converge only at receipts/Results wiring.
- US5 crop tests can run alongside US4 balance tuning, but scene replacement
  waits until the semantic controls are stable.

---

## Implementation Strategy

### First playable increment

1. Complete Setup and Foundational phases.
2. Complete US1 live feedback and US2 item clarity.
3. Validate one watched race and Results path independently.

### Incremental delivery

1. **Feedback slice**: US1 + US2.
2. **Inventory/acquisition slice**: US3.
3. **Correctness/economy/balance slice**: US4.
4. **Visual-polish slice**: US5.
5. **Combined release gate**: Phase 8.

Each slice preserves authoritative state boundaries and can be tested before the
next slice begins. Do not generate additional UI sheets until T100 validates the
approved control language in the actual game.
