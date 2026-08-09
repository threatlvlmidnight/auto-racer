# Tasks: Run Progression - Encounter Structure

**Input**: Finalized design documents from `/specs/009-run-progression/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/run-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. Every new or changed `src/simulation/` behavior follows strict red-green ordering. Scene boundaries receive focused integration coverage; Phaser interaction and presentation receive browser/manual validation.

**Organization**: Tasks are grouped by the four user stories in `spec.md`. Shared authored-price/type work is foundational; the fixed six-stage run is the MVP; acquisition, PvP, and summary phases build incrementally without changing shipped board/storage or race-presentation contracts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing toolchain and scope before implementation

- [X] T001 Confirm the feature adds no runtime dependency or tooling change and retain the existing Phaser 3, TypeScript, Vite, and Vitest configuration in `package.json`

**Checkpoint**: Existing project tooling is sufficient; no package installation or scaffold change is required.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared authored-price contract required by acquisition encounters

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T002 Add a failing content-contract test asserting `ITEM_POOL` still contains all 15 existing items and every item has an authored integer price from 2 through 5 in `tests/unit/item-pool.test.ts`

### Implementation

- [X] T003 Add required `price` data to `OfferedItem` in `src/simulation/types.ts` and author a 2-5 credit price for every existing item without changing effects, tags, cooldowns, or pool membership in `src/content/sample-data.ts` (depends on T002)
- [X] T004 Update existing `OfferedItem` test fixtures with valid authored prices while preserving their prior semantics in `tests/unit/buffs.test.ts`, `tests/unit/contest.test.ts`, `tests/unit/draft.test.ts`, `tests/unit/laps.test.ts`, `tests/unit/playback.test.ts`, `tests/unit/slots.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/itemVisuals.test.ts`, and `tests/integration/result-scene.test.ts` (depends on T003)
- [X] T005 Run the focused authored-price and existing item-pool tests in `tests/unit/item-pool.test.ts` and confirm T002 is GREEN with exactly 15 priced items (depends on T003-T004)

**Checkpoint**: All existing item content has an explicit legal price and prior item behavior is unchanged.

---

## Phase 3: User Story 1 - Progress through a run of discrete encounters (Priority: P1) MVP

**Goal**: Create a durable six-stage run state machine with stored choice pairs, stable encounter IDs, exactly-once advancement, persistent build state, and a terminal completed state.

**Independent Test**: Start a run, complete a choice encounter, verify the resulting build persists into the next stage, inspect both scheduled PvP stage definitions, and confirm generic encounter completion cannot bypass either required race result.

### Tests for User Story 1 (write first and confirm RED)

- [X] T006 [P] [US1] Add failing tests for `createRun` covering `Run.identityTag`, 5 starting credits, empty history, the fixed choice/choice/PvP-10/choice/choice/PvP-12 schedule, stable stage IDs, and a stored initial choice pair in `tests/unit/run.test.ts`
- [X] T007 [P] [US1] Add failing tests for random encounter-pair generation covering two distinct choices, injected RNG, stored/reused results across reads, repeated types across different stages, and Sponsor Meeting exclusion while a contract is pending in `tests/unit/encounters.test.ts`
- [X] T008 [US1] Extend failing run-transition tests for choice activation, stale/wrong/completed IDs, duplicate completion, immutable inputs, one history entry per completed choice stage, unchanged build carry-forward, and rejection of generic completion at PvP stages through typed `RunTransitionError` codes in `tests/unit/run.test.ts` (depends on T006)

### Implementation for User Story 1

- [X] T009 [US1] Define run, stage, encounter-choice, active-encounter, status, history, credit-transaction, sponsor-contract domain types, stable ID helpers, and `RunTransitionError` with stable machine-readable codes in `src/simulation/run.ts` (depends on T006-T008)
- [X] T010 [US1] Implement injected-RNG eligible encounter selection that stores two distinct choices and reads `Run.identityTag` and pending-contract eligibility from explicit run state in `src/simulation/encounters.ts` (depends on T007, T009)
- [X] T011 [US1] Implement `createRun`, the fixed six-stage schedule, guarded non-PvP encounter activation/completion, immutable build carry-forward, append-only history, exactly-once IDs, and rejection of generic completion for PvP stages in `src/simulation/run.ts` (depends on T009-T010)
- [X] T012 [US1] Run `tests/unit/run.test.ts` and the encounter-pair cases in `tests/unit/encounters.test.ts` and confirm all US1 simulation tests are GREEN (depends on T010-T011)
- [X] T013 [US1] Add a failing scene-boundary integration test for new-run creation, stored choice selection, active encounter routing, and one-step return progression in `tests/integration/run-flow.test.ts`
- [X] T014 [US1] Create `RunScene` to render stage position, credits, two stored encounter choices with type and concise outcome/rule summaries, current/available/completed states, and dispatch guarded domain transitions without regenerating choices; entering a displayed choice requires one pointer activation and never more than two in `src/scenes/RunScene.ts` (depends on T013)
- [X] T015 [US1] Register `RunScene` as the initial run entry and route complete `Run` scene data without reconstructing state in `src/main.ts` (depends on T014)
- [X] T016 [US1] Make the US1 new-run and encounter-routing integration cases GREEN in `tests/integration/run-flow.test.ts` (depends on T014-T015)

**Checkpoint**: The top-level five-offer sequence has been replaced by a testable six-stage run shell whose choice stages advance exactly once and whose PvP stages require the result-aware transition added in US3.

---

## Phase 4: User Story 2 - Choose where to engage, then what to take (Priority: P1)

**Goal**: Separate encounter choice from acquisition choice and implement Reward Draft, Parts Supplier, Sponsor Meeting, and the run-scoped credit economy using the existing placement/eviction rules.

**Independent Test**: Choose one of two encounter types, enter it without auto-taking an item, then complete Reward Draft, Parts Supplier, and Sponsor Meeting fixtures while confirming run-owned identity, credits, and board/storage results.

### Tests for User Story 2 (write first and confirm RED)

- [X] T017 [P] [US2] Add failing Reward Draft tests for three stored weighted offers, use of `Run.identityTag` with `TAG_WEIGHT` instead of `ACTIVE_IDENTITY_TAG`, occasional off-identity draws, accept-at-most-one, decline-all, stable offer IDs, and exactly-once completion in `tests/unit/encounters.test.ts`
- [X] T018 [US2] Add failing Parts Supplier tests for three stored run-identity-tagged stock entries, authored prices, with-replacement generation from one/two eligible definitions, empty unavailable-stock state when none are eligible, atomic purchase-plus-placement, any-number affordable purchases, insufficient-credit no-op, one 1-credit restock, replacement of only unpurchased stock, leave-with-zero-purchases, and non-negative balances in `tests/unit/encounters.test.ts` (depends on T017)
- [X] T019 [US2] Add failing credit-ledger tests for stable transaction IDs, ordered purchase/restock/immediate-sponsor entries, correct `balanceAfter`, immutable rejected operations, and duplicate-action guards in `tests/unit/encounters.test.ts` (depends on T018)
- [X] T020 [US2] Add failing Sponsor Meeting tests for one stored immediate +2 option, two stored distinct conditional objectives, one pending contract maximum, seeded/stable whole-second targets 3-6 seconds below the next 10- or 12-lap baseline, and tagged objectives storing `Run.identityTag` with a 10-event requirement in `tests/unit/encounters.test.ts` (depends on T019)

### Implementation for User Story 2

- [X] T021 [US2] Implement Reward Draft payload generation and accept/decline transitions using `drawItem`, `Run.identityTag`, `TAG_WEIGHT`, stable offer IDs, and existing placement commands in `src/simulation/encounters.ts` (depends on T017-T020)
- [X] T022 [US2] Implement the auditable run-scoped credit ledger and atomic Parts Supplier stock, purchase, one-use restock, affordability, and leave transitions in `src/simulation/encounters.ts` (depends on T018-T019, T021)
- [X] T023 [US2] Implement stored Sponsor Meeting options, immediate payout, conditional contract acceptance, seeded target calculation, and single-pending-contract eligibility in `src/simulation/encounters.ts` (depends on T020, T022)
- [X] T024 [US2] Run `tests/unit/encounters.test.ts` and confirm all Reward Draft, Supplier, ledger, identity, and Sponsor Meeting tests are GREEN (depends on T021-T023)
- [X] T025 [US2] Add failing integration/presentation-model cases proving encounter selection never auto-selects an item, acquisition completion returns the exact resulting build and ledger, Supplier exposes each price plus current balance/affordability/restock cost/restock availability/purchased state, and Sponsor exposes exact targets/payouts in `tests/integration/run-flow.test.ts`
- [X] T026 [US2] Replace the fixed five-round logic with encounter-specific Reward Draft and Parts Supplier presentation, visibly rendering item prices, current credits, disabled unaffordable purchases, purchased stock, the 1-credit restock cost and used/insufficient-credit disabled states, while reusing shipped drag/drop, board/storage movement, decline, eviction, duplicate-copy, and active-while-stored behavior in `src/scenes/PrepareScene.ts` (depends on T025)
- [X] T027 [US2] Route complete run context and encounter IDs between `RunScene` and `PrepareScene`; render Sponsor Meeting's immediate payout, conditional payouts, exact target-time threshold, tagged-trigger requirement, pending contract, and disabled Sponsor eligibility; keep all generation and credit mutations in domain functions in `src/scenes/RunScene.ts` (depends on T026)
- [X] T028 [US2] Make the acquisition separation, build persistence, identity ownership, Supplier affordability/state, exact sponsor target/payout, and economy integration cases GREEN in `tests/integration/run-flow.test.ts` (depends on T026-T027)

**Checkpoint**: All three non-PvP encounters are playable as distinct stored interactions, and no encounter choice implicitly makes an acquisition decision.

---

## Phase 5: User Story 3 - Enter a PvP encounter as a complete contest (Priority: P1)

**Goal**: Run the existing watched ghost contest at the stage-owned 10 or 12 laps, preserve presentation and immutable builds, then apply race payouts and sponsor resolution exactly once.

**Independent Test**: Resolve and watch controlled 10- and 12-lap PvP stages, inspect their results, continue the run, and verify identical race behavior for identical inputs plus correct payouts and sponsor outcomes without build mutation.

### Tests for User Story 3 (write first and confirm RED)

- [X] T029 [P] [US3] Add failing lap tests proving `simulatePlayerLaps` accepts explicit 10 and 12 counts, returns exactly that many deterministic laps, and preserves existing firing/contribution order and minimum-lap behavior in `tests/unit/laps.test.ts`
- [X] T030 [P] [US3] Add failing contest regression tests proving `resolveContest` passes explicit lap count to player and ghost generation, stores lap count in `ContestResult`, preserves the pre-feature 10-lap fixture exactly, and produces a deterministic 12-lap result with only two additional scheduled laps in `tests/unit/contest.test.ts`
- [X] T031 [P] [US3] Add failing playback tests proving schedules and completion derive their terminal lap from `ContestResult.lapCount`/schedule data for both 10 and 12 laps rather than global `LAP_COUNT` in `tests/unit/playback.test.ts`

### Variable-lap implementation

- [X] T032 [US3] Parameterize `simulatePlayerLaps` by explicit lap count while preserving a compatibility default for non-run build calculations in `src/simulation/laps.ts` and `src/simulation/build.ts` (depends on T029-T031)
- [X] T033 [US3] Parameterize player and ghost contest resolution, add immutable `lapCount` to `ContestResult`, remove simulation dependence on global `LAP_COUNT` in `src/simulation/contest.ts` and `src/simulation/types.ts`, and migrate every hand-built `ContestResult` fixture including `tests/unit/playback.test.ts` and `tests/integration/result-scene.test.ts` (depends on T030, T032)
- [X] T034 [US3] Derive playback schedules, terminal indices, and finished states from result/schedule lap count for 10- and 12-lap races in `src/simulation/playback.ts` (depends on T031, T033)
- [X] T035 [US3] Run `tests/unit/laps.test.ts`, `tests/unit/contest.test.ts`, `tests/unit/playback.test.ts`, `tests/integration/result-scene.test.ts`, and `npm run build`; confirm the explicit 10/12-lap migration and all required result fixtures are GREEN (depends on T032-T034)

### PvP progression tests and implementation

- [X] T036 [US3] Add failing run tests for immutable build snapshots, +2 participation, +2 win-only bonus, tie/loss handling, ordered ledger/history entries, stale/duplicate PvP completion rejection, `race-result-mismatch` rejection for wrong lap count or board/storage item IDs before any mutation, and final-stage completion in `tests/unit/run.test.ts` (depends on T035)
- [X] T037 [US3] Add failing sponsor-resolution tests for win, target-time, and run-identity tagged-trigger objectives; actual/10 event reporting; +7 success or +0 failure; next-PvP-only and exactly-once resolution; contract clearing; Sponsor Meeting re-eligibility; and `completePvpEncounter` atomically recording the sponsor outcome and transaction alongside PvP history in `tests/unit/encounters.test.ts` and `tests/unit/run.test.ts` (depends on T035)
- [X] T038 [US3] Implement guarded PvP completion with active-payload lap-count and compacted build-item-ID validation, typed `race-result-mismatch` rejection before mutation, participation/win ledger entries, immutable race history, and terminal progression in `src/simulation/run.ts` (depends on T036-T037)
- [X] T039 [US3] Implement pure pending-sponsor evaluation from immutable `ContestResult`, including per-occurrence matching-tag firing counts from all laps, then compose its outcome, stable payout transaction ID, +7/0 result, contract clearing, and `sponsorOutcome` into the same guarded `completePvpEncounter` transition in `src/simulation/encounters.ts` and `src/simulation/run.ts` (depends on T037-T038)
- [X] T040 [US3] Run the focused PvP payout and sponsor-resolution cases in `tests/unit/run.test.ts` and `tests/unit/encounters.test.ts` and confirm they are GREEN (depends on T038-T039)
- [X] T041 [US3] Add failing scene-flow integration cases for Contest-to-Result-to-Run context, exactly-once result application, Continue Run routing, and 10/12-lap label inputs in `tests/integration/run-flow.test.ts` (depends on T040)
- [X] T042 [US3] Accept run/encounter/lap-count context, call `resolveContest` once, preserve shipped read-only playback, item flashes/tooltips and race layout, and derive all lap labels from the explicit schedule/result count in `src/scenes/ContestScene.ts` (depends on T041)
- [X] T043 [US3] Preserve shipped result inspection while carrying the immutable result and run context through a single guarded Continue Run action instead of Race Again in `src/scenes/ResultScene.ts` (depends on T042)
- [X] T044 [US3] Make the PvP scene-flow, exactly-once continuation, and 10/12-lap label integration cases GREEN in `tests/integration/run-flow.test.ts` and retain existing result formatting assertions in `tests/integration/result-scene.test.ts` (depends on T042-T043)

**Checkpoint**: Both scheduled PvP encounters use one explicit lap-count source from simulation through labels, preserve the watched race, and settle economy/contracts once.

---

## Phase 6: User Story 4 - Understand run status and completion (Priority: P2)

**Goal**: Make active, completed, and unavailable runs legible; show ordered encounter/PvP history; and start a clean new run after completion.

**Independent Test**: Complete a run, inspect all six chronological history entries and both PvP outcomes, leave the summary, and start a fresh run with stage 1, empty history, 5 credits, and unchanged total capacities.

### Tests for User Story 4 (write first and confirm RED)

- [X] T045 [P] [US4] Add failing run tests for chronological history summaries, acquisition/transaction/PvP/sponsor outcome details, visible remaining progress, completed-state action rejection, clean new-run reset, and unchanged 3-board/3-storage capacities in `tests/unit/run.test.ts`
- [X] T046 [P] [US4] Add failing integration cases for available/active/completed/unavailable status labels, ordered final summary, explicit New Run recovery, and missing/corrupt context that never regenerates choices silently in `tests/integration/run-flow.test.ts`

### Implementation for User Story 4

- [X] T047 [US4] Implement pure run-progress and ordered-history summary selectors plus explicit unavailable-state construction without random reconstruction in `src/simulation/run.ts` (depends on T045)
- [X] T048 [US4] Render completed encounter path, PvP outcomes, sponsor objective plus exact target and actual/required trigger counts, credit details, remaining progress, terminal disabled actions, completed summary, and explicit New Run/unavailable recovery in `src/scenes/RunScene.ts` (depends on T046-T047)
- [X] T049 [US4] Add defensive missing-run routing to the explicit unavailable state in `src/scenes/PrepareScene.ts`, `src/scenes/ContestScene.ts`, and `src/scenes/ResultScene.ts` without silently starting a replacement path (depends on T048)
- [X] T050 [US4] Run `tests/unit/run.test.ts` and `tests/integration/run-flow.test.ts` and confirm all history, summary, reset, and unavailable-state cases are GREEN (depends on T047-T049)

**Checkpoint**: A complete run is understandable and terminal, and invalid in-memory context is handled honestly rather than replaced.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate preserved contracts, complete browser scenarios, and enforce scope boundaries

- [X] T051 [P] Run unchanged board/storage/draft/buff regressions in `tests/unit/slots.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/draft.test.ts`, `tests/unit/buffs.test.ts`, and `tests/unit/item-pool.test.ts` to confirm capacity, movement, eviction, active-while-stored, duplicate-copy, and 75/25 identity weighting behavior remains intact
- [X] T052 [P] Run unchanged race-presentation regressions in `tests/unit/contestFormatting.test.ts`, `tests/unit/itemVisuals.test.ts`, and `tests/integration/result-scene.test.ts` to confirm result attribution, tooltips, callouts, gap display, and race presentation remain intact
- [X] T053 Audit the complete feature diff and every modified/new source file against `specs/009-run-progression/quickstart.md` scope checks: no Build Testing Access placeholder, Rival Scouting, Scrutineering, Factory Development, Privateer Exchange, live input/opponents, new identity, capacity change, persistence subsystem, monetization, or theme-wide content/art conversion; statically confirm encounter paths including `src/scenes/PrepareScene.ts` never read `ACTIVE_IDENTITY_TAG` and instead use `Run.identityTag`
- [X] T054 Run all browser/manual portions of the six scenarios in `specs/009-run-progression/quickstart.md`, including a full six-stage run, Reward Draft decline/placement, Supplier purchase/restock failures, a naturally generated Sponsor Meeting presentation, watched 10/12-lap races, exactly-once retries, unavailable recovery, and final new-run reset; rely on deterministic T037-T040 fixtures for exhaustive sponsor-objective success/failure coverage
- [X] T055 Run the complete automated gate from `package.json` with `npm test`, `npm run build`, and `npm run lint`, fixing only feature-related failures and confirming all existing suites remain GREEN

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies
- **Phase 2 - Foundational**: Depends on Phase 1 and blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; establishes run ownership, schedule, IDs, and progression used by every later story
- **Phase 4 - US2**: Depends on US1 because acquisition encounters complete through the guarded run transition
- **Phase 5 - US3**: Depends on US1 and US2 because PvP completion settles the shared ledger and pending sponsor contract
- **Phase 6 - US4**: Depends on US1-US3 because its summary renders their finalized history outcomes
- **Phase 7 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1, MVP)**: Foundational only; independently validates the six-stage state machine and durable build carry-forward
- **US2 (P1)**: Uses US1's current encounter and exactly-once completion boundary; independently validates all acquisition/economy decisions
- **US3 (P1)**: Uses US1 progression and US2 ledger/contracts; independently validates watched PvP, explicit lap counts, payouts, and sponsor settlement
- **US4 (P2)**: Reads immutable outputs from US1-US3; independently validates status, history, completion, unavailable state, and reset

### Strict Test-First Order

- T002 MUST be RED before T003 changes `src/simulation/types.ts`
- T006-T008 MUST be RED before T009-T011 change `src/simulation/run.ts` or `src/simulation/encounters.ts`
- T017-T020 MUST be RED before T021-T023 change acquisition/economy simulation behavior
- T029-T031 MUST be RED before T032-T034 change laps, contest, result types, or playback
- T036-T037 MUST be RED before T038-T039 change PvP progression or sponsor resolution
- T045 MUST be RED before T047 changes run summary/unavailable simulation behavior

---

## Parallel Opportunities

### US1 simulation tests

```text
T006: Run creation/schedule/identity tests in tests/unit/run.test.ts
T007: Stored encounter-pair generation tests in tests/unit/encounters.test.ts
```

### US3 variable-lap tests

```text
T029: Explicit lap simulation tests in tests/unit/laps.test.ts
T030: ContestResult 10/12-lap regression tests in tests/unit/contest.test.ts
T031: Playback schedule/completion tests in tests/unit/playback.test.ts
```

### US4 and final regressions

```text
T045: Domain history/status tests in tests/unit/run.test.ts
T046: Scene-boundary status/summary tests in tests/integration/run-flow.test.ts
T051: Board/storage/draft/buff regression suites
T052: Race-presentation regression suites
```

Tasks sharing `src/simulation/run.ts`, `src/simulation/encounters.ts`, `src/scenes/RunScene.ts`, or `tests/integration/run-flow.test.ts` remain sequential to avoid conflicting edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T016.
3. Stop and validate the six-stage state machine independently before adding encounter-specific economy or UI.

US1 is the structural MVP. A playable feature increment requires US2 and US3 as the complete P1 vertical slice; US4 then adds the P2 summary and recovery layer.

### Incremental Delivery

1. **US1**: Stable run schedule, stored choices, IDs, build carry-forward, terminal state.
2. **US2**: Reward Draft, Supplier, Sponsor Meeting, run identity, and credit ledger.
3. **US3**: Explicit 10/12-lap PvP, watched race continuation, payouts, sponsor resolution.
4. **US4**: Ordered summary, status legibility, unavailable recovery, clean new run.
5. **Polish**: Preserved-contract regressions, scope audit, browser quickstart, full automated gate.

---

## Notes

- Every `src/simulation/` change has an earlier failing test task; implementation tasks are not started until their listed RED checks fail for the expected missing behavior.
- `Run.identityTag` is the only encounter identity input. Reward Draft, Supplier, and tagged sponsor objectives must not read `ACTIVE_IDENTITY_TAG` internally.
- Random choices, offers, stock, sponsor options, and target thresholds are generated through explicit inputs and stored on the run before display.
- The lap count migrates as one value through `laps.ts`, `contest.ts`, `ContestResult`/`types.ts`, playback schedules/completion, and `ContestScene` labels; 10- and 12-lap tests guard against divergence.
- Existing board/storage helpers and race presentation are reused, not reimplemented.
- Build Testing Access remains the mandatory immediate follow-up feature and release-sequencing gate; phase-two encounters remain excluded from implementation.