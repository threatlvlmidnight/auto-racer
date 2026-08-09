# Tasks: Build Testing Access - Test Day

**Input**: Finalized design documents from `/specs/011-build-test-day/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/test-day-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. New and changed simulation/practice contracts follow strict red-green-refactor ordering. Unit, integration, presentation, deterministic-repeat, protected-state mutation, build, lint, and browser acceptance are release gates.

**Organization**: Tasks are grouped by the four user stories in `spec.md`. Pure practice state remains outside `Run`; shared contest/playback authority and deep protected-run equivalence are foundational; Test Day flow, transparent evidence, iteration/comparison, and availability/accessibility are independently testable increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing toolchain and freeze the implementation/evidence boundaries before test-first work begins

- [X] T001 Confirm feature 011 adds no runtime dependency, retains Phaser 3, TypeScript, Vite, Vitest, and ESLint scripts in `package.json`, and record the strict test-first command matrix plus retained-evidence destination in `specs/011-build-test-day/quickstart.md`
- [X] T002 [P] Add reusable controlled empty, direct/recurring, buff-dependent, tie, positive-modifier, and minimum-clamp practice fixtures without mutating production state in `tests/fixtures/practice-fixtures.ts`
- [X] T003 [P] Add reusable active-run fixtures across three origin categories and four concrete entry contexts (run hub, Supplier, Reward Draft, and pre-start PvP briefing), including exact encounter payload, selected offer/reward/control, route/focus/navigation tokens, offers, supplier stock, purchases, `restockUsed`, sponsor, history, and next-opponent state in `tests/fixtures/practice-run-fixtures.ts`

**Checkpoint**: Existing dependencies are sufficient and controlled fixtures expose every practice and protected-run acceptance case.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish pure practice-only domain contracts, fixed deterministic inputs, shared resolver/playback reuse, reconciliation, and complete protected-state auditing without extending `Run`

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T004 [P] Add failing unit tests for immutable `TestDayAvailability`, `PracticeReturnContext`, `ProtectedPreparationOrigin`, `PracticeConfig`, `LockedPracticeBuild`, `PracticeSession`, `PracticeResult`, `PracticeComparison`, and typed practice failure contracts that remain absent from `Run`, `RunStage`, `EncounterType`, and `RunHistoryEntry` in `tests/unit/practice.test.ts`
- [X] T005 [P] Add failing deterministic contract tests requiring `test-day-v1`, the `ghost-001` definition from `src/content/sample-data.ts`, 5.85-second rival laps, exactly 10 laps, no RNG/seed/opponent/lap override, one deep-copied frozen snapshot, and exact structural equality across 100 resolutions of each controlled snapshot for one normalized deterministic projection containing authoritative contest, ordered playback, contribution, buff-application, clamp, and reconciliation facts while excluding session/result IDs, route/encounter/navigation/focus identity, timestamps, presentation state, and every other unique or non-simulation envelope field in `tests/unit/practice-determinism.test.ts`
- [X] T006 [P] Add failing protected-state projection tests for run ID/seed, status, stage index and complete stage states, ordered choices, active encounter and payload, credits/transactions, sponsor, offers and offer states, build/storage, history, next scored opponent/configuration, scored-result count, and all stored RNG-relevant fields in `tests/unit/practice-protected-state.test.ts`
- [X] T007 Add failing mutation-detection tests that independently alter every protected field family and prove whole-`Run` deep equality plus the named projection detects each change, including Supplier offers/stock/`restockUsed` and Reward Draft offers, in `tests/unit/practice-protected-state.test.ts` (depends on T006)
- [X] T008 [P] Extend failing playback tests proving `buildPlaybackSchedule` and `frameStateAt` consume the exact resolved contest, while pause, speed, skip, reduced motion, resize, background, and attempted outcome-changing input cannot alter any result fact in `tests/unit/playback.test.ts`
- [X] T009 Add failing import-boundary and spy tests proving practice code delegates directly to `resolveContest` and authoritative playback helpers with exact contest/playback/contribution facts, while `src/scenes/ContestScene.ts`, `src/scenes/ResultScene.ts`, `src/scenes/runPresentation.ts`, and `src/simulation/run.ts` retain sole scored routing/settlement authority and practice cannot import or call `completePvpEncounter`, `continueRunFromResult`, sponsor settlement, encounter completion, run advancement, or scored analytics in `tests/integration/test-day-boundaries.test.ts` (depends on T004-T008)

### Implementation

- [X] T010 Define deep-readonly practice snapshots, sessions, results, availability, return/origin, reconciliation, comparison, and protected-state types in `src/simulation/practice.ts`, reserving recovery record/codec types for `src/simulation/practiceRecovery.ts`, without modifying the public run-domain types in `src/simulation/run.ts` (depends on T004-T009)
- [X] T011 Implement immutable `TEST_DAY_CONFIG` using `ghost-001` from `src/content/sample-data.ts`, canonical build fingerprinting, single-flight session creation, deep snapshot locking, RNG-free delegation to `resolveContest`, and the sole normalized `PracticeComparisonProjection` whose contest, authoritative playback, contribution/buff/clamp, and reconciliation facts are exactly equal to a projection built from direct `resolveContest` plus shared playback output while unique/navigation/presentation metadata is excluded in `src/simulation/practice.ts` (depends on T005, T010)
- [X] T012 Implement `captureProtectedRunState` with complete explicit FR-027 projection plus a whole-`Run` clone/equality backstop in `src/simulation/practice.ts` (depends on T006-T007, T010)
- [X] T013 Implement practice-only reconciliation and typed failed/unavailable outcomes that never substitute inputs or cross into scored settlement in `src/simulation/practice.ts` (depends on T009-T012)
- [X] T014 Reuse existing contest and playback outputs unchanged for practice consumers, adding only mode-neutral immutable fact fields required by both scored and practice presentation in `src/simulation/contest.ts`, `src/simulation/playback.ts`, and `src/simulation/types.ts` (depends on T008-T013)
- [X] T015 Make foundational practice, deterministic-repeat, protected-state mutation, playback-invariance, and authority-boundary suites GREEN in `tests/unit/practice.test.ts`, `tests/unit/practice-determinism.test.ts`, `tests/unit/practice-protected-state.test.ts`, `tests/unit/playback.test.ts`, and `tests/integration/test-day-boundaries.test.ts` (depends on T010-T014)

**Checkpoint**: Practice has pure immutable types outside `Run`, fixed disclosed inputs, one shared contest/playback authority, complete reconciliation, and mutation-sensitive protected-state evidence.

---

## Phase 3: User Story 1 - Test the current build before it counts (Priority: P1) MVP

**Goal**: Enter an explicitly unscored Test Day from every eligible preparation origin, resolve one locked build without outcome-changing input, and return to the exact unchanged origin.

**Independent Test**: Capture the complete run and origin UI state at run hub, Supplier, Reward Draft, and pre-start PvP briefing; cancel or complete Test Day; then verify exact route/encounter restoration, object identity for in-memory return, deep run/projection equality, unchanged offers and restock state, and zero scored progression callbacks.

### Tests for User Story 1 (write first and confirm RED)

- [X] T016 [P] [US1] Add failing presentation tests for a `TEST DAY`/`UNSCORED` briefing that identifies the locked build, `ghost-001`, 5.85 seconds, 10 laps, deterministic sample status, and explicit no-reward/no-penalty/no-progression copy in `tests/unit/practicePresentation.test.ts`
- [X] T017 [P] [US1] Add failing integration tests for run-hub and pre-start PvP entry, briefing cancel, cancel/exit during active playback before any completed practice result, rapid double activation, immutable Start Test capture, and practice completion; require active-playback cancel/exit to discard the incomplete result and return to the exact originating encounter, route, payload, selection, offers/stock/restock state, navigation context, and focus target with the origin `Run` object unchanged and zero settlement/progression calls in `tests/integration/test-day-flow.test.ts`
- [X] T018 [US1] Add failing integration tests for Supplier and Reward Draft entry/return that preserve the same active encounter ID and exact payload, offers/stock order and state, purchases, credits, `restockUsed`, build/storage, and unresolved-but-stable preparation context in `tests/integration/test-day-flow.test.ts` (depends on T017)
- [X] T019 [US1] Extend failing scored-flow regression tests proving `src/scenes/ContestScene.ts`, `src/scenes/ResultScene.ts`, and `src/scenes/runPresentation.ts` preserve normal scored Contest/Result settlement, practice scenes remain separate, and practice results cannot be passed to scored continuation APIs in `tests/integration/run-flow.test.ts` (depends on T017-T018)

### Implementation for User Story 1

- [X] T020 [US1] Implement pure origin validation and explicit `PracticeReturnContext` creation for run hub, Supplier, Reward Draft, and pre-start PvP briefing in `src/simulation/practice.ts` (depends on T016-T019)
- [X] T021 [US1] Implement briefing, immutable snapshot disclosure, single-flight Start Test, cancel, and typed unavailable handling in `src/scenes/TestDayScene.ts` (depends on T020)
- [X] T022 [US1] Add Test Day entry and exact return-context handoff at run hub and pre-start PvP briefing without committing the scored race in `src/scenes/RunScene.ts` (depends on T021)
- [X] T023 [US1] Add Test Day entry and exact Supplier/Reward Draft encounter handoff without accepting, declining, purchasing, restocking, committing, or cancelling active offers in `src/scenes/PrepareScene.ts` (depends on T021-T022)
- [X] T024 [US1] Implement dedicated unscored playback over the stored contest result and shared playback schedule with presentation-only pause, speed, and skip controls in `src/scenes/PracticeContestScene.ts` (depends on T014, T021-T023)
- [X] T025 [US1] Implement dedicated practice result return routing with no purse, sponsor, progression, history, or scored-result controls in `src/scenes/PracticeResultScene.ts` (depends on T024)
- [X] T026 [US1] Register the three practice scenes and pass practice context without reconstructing a run, rival, snapshot, or result in `src/main.ts` (depends on T021-T025)
- [X] T027 [US1] Make briefing, origin routing, Supplier/Reward Draft preservation, double-start, zero-callback, exact-return, and scored-flow regression tests GREEN in `tests/unit/practicePresentation.test.ts`, `tests/integration/test-day-flow.test.ts`, and `tests/integration/run-flow.test.ts` (depends on T020-T026)

**Checkpoint**: The P1 Test Day loop is playable from every eligible origin, produces one immutable unscored result, and returns the exact unchanged run and preparation encounter.

---

## Phase 4: User Story 2 - Understand why the test produced its result (Priority: P1)

**Goal**: Expose authoritative lap, timing, event, item, buff, storage, clamp, zero-contribution, and reconciliation evidence during playback and result review.

**Independent Test**: Resolve controlled direct, recurring, flat-buff, stacking-buff, count-buff, storage-active/inactive, zero, unmet/cooldown, positive-modifier, multiple-effect, tie, and clamp cases; verify every displayed value comes from immutable result facts and reconciles exactly.

### Tests for User Story 2 (write first and confirm RED)

- [X] T028 [P] [US2] Extend failing lap tests for per-held-item evidence covering source/location, effect kind, trigger/cooldown state, base contribution, buff source/target/type/applied amount, signed resulting contribution, pre-clamp time, clamp adjustment, resulting lap time, storage activity, and explicit zero/unmet/inactive reasons in `tests/unit/laps.test.ts`
- [X] T029 [P] [US2] Add failing presentation tests for exact player/rival lap times, running/final gap, outcome, event chronology, contribution rows, buff relationships without double counting, empty-build state, and future installation attribution only when authoritative data exists in `tests/unit/practicePresentation.test.ts`
- [X] T030 [US2] Add failing reconciliation tests for direct, recurring, flat, stacking, count, storage-active/inactive, zero, cooldown/unmet, tie, positive modifier, multiple effects, and minimum-time clamp fixtures in `tests/unit/practice.test.ts` (depends on T028-T029)

### Implementation for User Story 2

- [X] T031 [US2] Extend immutable contest evidence types with complete contribution, buff-application, trigger-state, storage, and clamp facts at the computation boundary in `src/simulation/types.ts` (depends on T028-T030)
- [X] T032 [US2] Emit complete evidence for every held item and lap where effects, buffs, cooldowns, storage behavior, and minimum-time clamping are computed in `src/simulation/laps.ts` (depends on T031)
- [X] T033 [US2] Carry the exact immutable lap/event/contribution evidence through contest results and shared playback facts without presentation recalculation in `src/simulation/contest.ts` and `src/simulation/playback.ts` (depends on T032)
- [X] T034 [US2] Implement pure formatting-only timing, lap, gap, event, item, buff, storage, clamp, zero-state, reconciliation, and optional installation selectors in `src/scenes/practicePresentation.ts` (depends on T029, T033)
- [X] T035 [US2] Render non-hover live/completed lap and contribution inspection with persistent `TEST DAY`/`UNSCORED` labeling in `src/scenes/PracticeContestScene.ts` (depends on T034)
- [X] T036 [US2] Render final totals, signed gap, outcome, complete evidence, zero/unmet reasons, and reconciliation status without scored settlement affordances in `src/scenes/PracticeResultScene.ts` (depends on T034-T035)
- [X] T037 [US2] Make lap evidence, presentation, and full reconciliation matrices GREEN in `tests/unit/laps.test.ts`, `tests/unit/practice.test.ts`, `tests/unit/practicePresentation.test.ts`, and `tests/unit/playback.test.ts` (depends on T031-T036)

**Checkpoint**: Every consequential and non-consequential held item is explainable without hover, and all displayed timing and contribution facts reconcile to the shared immutable contest result.

---

## Phase 5: User Story 3 - Iterate and compare build changes (Priority: P2)

**Goal**: Repeat practice with fresh snapshots and compare only the latest two completed tests from the same active run without persisting practice into `Run`.

**Independent Test**: Complete two identical tests and verify zero deltas, then change one item/location through normal preparation and verify complete snapshot/result deltas while run history and every protected field remain unchanged.

### Tests for User Story 3 (write first and confirm RED)

- [X] T038 [P] [US3] Add failing comparison tests for latest-two same-run retention, canonical snapshot content changes, total/gap/outcome/lap/contribution deltas, zero deltas for identical snapshots, immutable prior results, and clearing on run mismatch/end/abandon/unavailable/reload in `tests/unit/practice.test.ts`
- [X] T039 [P] [US3] Add failing comparison presentation tests for changed/unchanged/improved/worsened text and structure, long labels, per-lap and item/buff deltas, and no color-only meaning in `tests/unit/practicePresentation.test.ts`
- [X] T040 [US3] Add failing integration tests for return, one normal Supplier or Reward Draft build change, repeat from the exact preparation encounter, latest-two comparison, unlimited subsequent tests, and zero practice entries in run history/scored-result count in `tests/integration/test-day-flow.test.ts` (depends on T038-T039)

### Implementation for User Story 3

- [X] T041 [US3] Implement a memory-only latest-two completed-session cache keyed by active run ID with explicit lifecycle clearing and no `Run` serialization path in `src/simulation/practice.ts` (depends on T038-T040)
- [X] T042 [US3] Implement pure comparison of snapshot contents, totals, gap, outcome, laps, and item/buff contributions with exact zero deltas for identical inputs in `src/simulation/practice.ts` (depends on T041)
- [X] T043 [US3] Add formatting-only comparison selectors with textual changed/unchanged/improved/worsened semantics in `src/scenes/practicePresentation.ts` (depends on T039, T042)
- [X] T044 [US3] Add Repeat Test and latest-two comparison review while preserving return-to-preparation as the only build-edit route in `src/scenes/PracticeResultScene.ts` (depends on T040, T043)
- [X] T045 [US3] Make comparison, changed-build repeat, unlimited-repeat, lifecycle-clear, and no-persistence tests GREEN in `tests/unit/practice.test.ts`, `tests/unit/practicePresentation.test.ts`, and `tests/integration/test-day-flow.test.ts` (depends on T041-T044)

**Checkpoint**: Repeated tests always resolve fresh locked inputs, comparisons explain only the latest same-run pair, and no practice result enters scored run state.

---

## Phase 6: User Story 4 - Understand when Test Day is available (Priority: P2)

**Goal**: Make every eligible, unavailable, recovery, input, reduced-motion, responsive, and semantic state explicit and operable with pointer, keyboard, and touch.

**Independent Test**: Traverse every run phase and required viewport with mouse, keyboard only, and touch only; verify correct availability/recovery reasons, full no-hover operation, visible focus, semantic monochrome states, reduced-motion fact parity, and no clipping or horizontal scroll.

### Tests for User Story 4 (write first and confirm RED)

- [X] T046 [P] [US4] Add failing availability tests for no/malformed run, ended run, invalid build, unstable drag/purchase/restock/replacement/eviction/sponsor confirmation, active contest, scored settlement, missing encounter/origin, and recovery mismatch with one text-ready reason per state in `tests/unit/practice.test.ts`
- [X] T047 [P] [US4] Add failing recovery codec tests for recursively key-sorted canonical JSON, stable array order, rejected non-JSON/non-finite/cyclic values, version `test-day-recovery-v1`, canonical `fnv1a64-v1:<16 lowercase hex>` over UTF-8 payload bytes, complete protected origin/preparation/run/snapshot/route/config payload coverage, and typed `unsupported-version`, `fingerprint-mismatch`, and `payload-mismatch` failures in `tests/unit/practiceRecovery.test.ts`; include a syntactically valid canonical payload whose protected run/origin state is mutated and whose FNV-1a fingerprint is correctly recomputed, and require typed `payload-mismatch` from cross-field/schema validation rather than acceptance; add integration cases for valid exact-origin restoration, corrupt/non-canonical/schema/run/config/origin mismatch, no fallback run/opponent/result, no comparison persistence, and clearing after cancel/return in `tests/integration/test-day-recovery.test.ts`
- [X] T048 [P] [US4] Add failing presentation tests for deterministic focus order, pointer/keyboard/touch action parity, visible focus, disabled/unavailable labels, non-color state tokens, 14px supporting text, 16px controls, long-copy containment, and responsive vertical-flow models at all four viewports in `tests/unit/practicePresentation.test.ts`
- [X] T049 [US4] Add failing scene tests for keyboard-only and touch-only entry, start, inspect, pause/speed/skip, repeat, return, Escape/cancel, reduced-motion parity, and no hover or precision-drag dependency in `tests/integration/test-day-flow.test.ts` (depends on T046-T048)

### Implementation for User Story 4

- [X] T050 [US4] Implement complete typed availability decisions and explicit recovery failures without creating or replacing run, opponent, snapshot, or result context in `src/simulation/practice.ts` (depends on T046-T049)
- [X] T051 [US4] Implement canonical payload serialize/fingerprint/write/read/validate/clear behavior in `src/simulation/practiceRecovery.ts` using version `test-day-recovery-v1` and browser-supported FNV-1a 64-bit fingerprint `fnv1a64-v1:<16 lowercase hex>` over UTF-8 canonical payload bytes as an integrity-not-security checksum; require byte-identical canonical reserialization plus complete schema, run ID, protected origin encounter/payload, return context, snapshot, and fixed-config cross-checks so even syntactically valid protected-state mutation with a recomputed fingerprint returns typed `payload-mismatch`, while version and fingerprint failures remain typed separately outside `Run` and comparison history (depends on T047, T050)
- [X] T052 [US4] Implement pure responsive layout, focus order, semantic state, minimum text/control size, long-label, and reduced-motion presentation models in `src/scenes/practicePresentation.ts` (depends on T048, T050)
- [X] T053 [US4] Render explicit unavailable/recovery states and equivalent pointer, keyboard, and touch briefing actions with visible focus in `src/scenes/TestDayScene.ts` (depends on T051-T052)
- [X] T054 [US4] Apply shared pointer/keyboard/touch playback and inspection controls, reduced-motion branches, semantic selected/focused/disabled states, and actual-viewport vertical flow in `src/scenes/PracticeContestScene.ts` (depends on T052-T053)
- [X] T055 [US4] Apply shared pointer/keyboard/touch comparison, repeat, inspection, and return controls plus semantic changed/improved/worsened states in `src/scenes/PracticeResultScene.ts` (depends on T052-T054)
- [X] T056 [US4] Add accessible practice focus, control, and monochrome-safe state treatments without altering scored styling contracts in `src/scenes/demoTheme.ts` (depends on T053-T055)
- [X] T057 [US4] Make unavailable, recovery, responsive presentation, input parity, reduced-motion, and semantic-state suites GREEN in `tests/unit/practice.test.ts`, `tests/unit/practiceRecovery.test.ts`, `tests/unit/practicePresentation.test.ts`, `tests/integration/test-day-recovery.test.ts`, and `tests/integration/test-day-flow.test.ts` (depends on T050-T056)

**Checkpoint**: Test Day clearly explains every availability/recovery state and remains fully operable and legible across input modes, motion preferences, monochrome review, and required viewports.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete regression, deterministic, mutation, browser, documentation, and retained constitutional gate evidence

- [X] T058 [P] Extend the representative simulation logger with a fixed practice run that reports config, snapshot fingerprint, totals, gap, outcome, and reconciliation without writing practice into run history in `scripts/log-simulation.mjs`
- [X] T059 [P] Update Test Day usage, fixed sample disclosure, exact eligible origins, recovery limits, accessibility controls, and validation commands in `README.md`
- [X] T060 Run focused unit, integration, presentation, deterministic-repeat, direct-authority equivalence, protected-state mutation, recovery, and scored-regression suites for `tests/unit/practice.test.ts`, `tests/unit/practice-determinism.test.ts`, `tests/unit/practice-protected-state.test.ts`, `tests/unit/practiceRecovery.test.ts`, `tests/unit/laps.test.ts`, `tests/unit/playback.test.ts`, `tests/unit/practicePresentation.test.ts`, `tests/integration/test-day-boundaries.test.ts`, `tests/integration/test-day-flow.test.ts`, `tests/integration/test-day-recovery.test.ts`, and `tests/integration/run-flow.test.ts`; fix only feature-related failures (depends on T057-T059)
- [X] T061 Run `npm test` and record the complete passing unit/integration regression output, including 100x empty/direct/buff deterministic repeats and every protected-field mutation detector, in `specs/011-build-test-day/acceptance-evidence.md` (depends on T060)
- [X] T062 Run `npm run build` and `npm run lint`, fix only feature-related failures, and record exact commands and PASS/FAIL output in `specs/011-build-test-day/acceptance-evidence.md` (depends on T061)
- [X] T063 Run the full Test Day browser flow across run hub, Supplier, Reward Draft, and pre-start PvP briefing at 1920x1080, 1366x768, 1024x768, and 390x844; for each viewport record captures and measurements for zero horizontal scroll, zero clipped targets, 14px supporting text, 16px interactive labels, long-copy containment, exact return encounter/offers/restock state, and browser Performance evidence showing no reproducible input-blocking task of 100 ms or longer during start, playback controls, inspection, or return in `specs/011-build-test-day/acceptance-evidence.md` (depends on T062)
- [X] T064 Independently complete entry, start, lap/item/buff/storage/zero/clamp inspection, pause/speed/skip, comparison, repeat, and return using keyboard only and then touch only; record visible focus, no-hover/no-drag access, outcome-input rejection, and complete fact parity in `specs/011-build-test-day/acceptance-evidence.md` (depends on T063)
- [X] T065 Repeat browser acceptance with reduced motion and monochrome/state-label review; exercise valid interruption recovery plus corrupt, unsupported-version, fingerprint, non-canonical/schema/payload, config, run, and origin mismatch, including a syntactically valid protected-state mutation with a correctly recomputed fingerprint; and record semantic `TEST DAY`/`UNSCORED`, selected, focused, disabled, unavailable, changed, improved, and worsened evidence in `specs/011-build-test-day/acceptance-evidence.md` (depends on T064)
- [X] T066 Conduct the five-participant SC-008 moderated explanation check without external instruction and record whether at least 90% identify the largest consequential item/buff effect and unscored status in `specs/011-build-test-day/acceptance-evidence.md` (depends on T065)
- [X] T067 Create the final SC-011/feature 010 T001 prerequisite evidence index with commit/worktree identifier, date, exact commands, test identifiers, browser/device matrix, and artifact links in `specs/011-build-test-day/acceptance-evidence.md`; include explicit PASS/FAIL rows for every P1 acceptance scenario; SC-001 through SC-010; each SC-001 context (Supplier with an offer selected, Supplier without an offer selected, Reward Draft with a reward selected, Reward Draft without a reward selected) with starting state, ordered deliberate open/start/return action count no greater than four, and exact returned encounter/selection; normalized deterministic projection repeat; exact direct authoritative `resolveContest` contest/playback/contribution equivalence; reconciliation; outcome-input invariance; complete protected-state and zero settlement/progression equality; valid interruption recovery and corrupt/unsupported-version/fingerprint/non-canonical/schema/payload/config/run/origin integrity including recomputed-fingerprint protected-state mutation; keyboard-only, touch-only, visible-focus, no-hover, reduced-motion, and monochrome/state-label acceptance; separate 1920x1080, 1366x768, 1024x768, and 390x844 rows; focused/full automated tests; build; lint; the no-input-blocking-100-ms browser measurement; UI-FR-022/UI-FR-023; Constitution I/III/V; and every required retained artifact; mark the overall gate FAIL on any missing/failed row and make this exact index the evidence consumed by feature 010 T001 before `specs/010-entrant-vehicle-garage/gate-evidence.md` can record PASS (depends on T061-T066)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; T002 and T003 may proceed in parallel after T001 confirms the toolchain
- **Phase 2 - Foundational**: Depends on Setup and blocks all user stories
- **Phase 3 - US1**: Depends on Foundational and provides the independently playable MVP route
- **Phase 4 - US2**: Depends on US1 plus foundational shared result facts; enriches the same resolver output rather than creating a second simulation
- **Phase 5 - US3**: Depends on US1-US2 because comparison consumes completed immutable sessions and their evidence
- **Phase 6 - US4**: Depends on US1-US3 because availability, recovery, and accessible controls wrap the complete flow
- **Phase 7 - Polish**: Depends on all selected user stories; automated checks precede browser/study evidence and T067 is the final release gate

### User Story Dependencies

- **US1 (P1, MVP)**: Foundational only; independently proves immutable practice resolution, exact Supplier/Reward Draft/PvP/run-hub return, and zero scored callbacks
- **US2 (P1)**: Uses US1's shared result; independently proves complete inspectable and reconciled timing/contribution evidence
- **US3 (P2)**: Uses completed US1-US2 sessions; independently proves fresh snapshots, changed-build comparison, and no `Run` persistence
- **US4 (P2)**: Wraps the complete flow; independently proves availability/recovery explanations and pointer/keyboard/touch/reduced-motion/responsive accessibility

### Strict Test-First Order

- T004-T009 MUST be RED before T010-T014 add shared practice contracts or result facts
- T016-T019 MUST be RED before T020-T026 add Test Day routing or scenes
- T028-T030 MUST be RED before T031-T036 add contribution evidence or selectors
- T038-T040 MUST be RED before T041-T044 add comparison retention or UI
- T046-T049 MUST be RED before T050-T056 add availability, recovery, or accessible interaction behavior

---

## Parallel Opportunities

### Setup Fixtures

```text
T002: Controlled practice fixtures in tests/fixtures/practice-fixtures.ts
T003: Protected run/origin fixtures in tests/fixtures/practice-run-fixtures.ts
```

### Foundational Contracts

```text
T004: Practice domain-boundary tests in tests/unit/practice.test.ts
T005: Fixed-input and 100x repeat tests in tests/unit/practice-determinism.test.ts
T006: Complete protected projection tests in tests/unit/practice-protected-state.test.ts
T008: Playback fact/input invariance in tests/unit/playback.test.ts
```

### User Story 1

```text
T016: Briefing presentation tests in tests/unit/practicePresentation.test.ts
T017: Run-hub/PvP routing tests in tests/integration/test-day-flow.test.ts
```

### User Story 2

```text
T028: Computation-source contribution tests in tests/unit/laps.test.ts
T029: Formatting-only evidence tests in tests/unit/practicePresentation.test.ts
```

### User Story 3

```text
T038: Comparison domain tests in tests/unit/practice.test.ts
T039: Comparison presentation tests in tests/unit/practicePresentation.test.ts
```

### User Story 4

```text
T046: Availability reason tests in tests/unit/practice.test.ts
T047: Recovery codec and capsule tests in tests/unit/practiceRecovery.test.ts and tests/integration/test-day-recovery.test.ts
T048: Input/responsive presentation tests in tests/unit/practicePresentation.test.ts
```

### Documentation and Tooling

```text
T058: Practice simulation logger in scripts/log-simulation.mjs
T059: Player/developer documentation in README.md
```

Tasks sharing `src/simulation/practice.ts`, `src/scenes/practicePresentation.ts`, any practice scene, or `tests/integration/test-day-flow.test.ts` remain sequential to avoid conflicting contract edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T027.
3. Stop and validate immutable fixed-config practice across three origin categories and four concrete entry contexts, exact Supplier/Reward Draft state restoration, and zero scored settlement/progression callbacks.

US1 is the minimum playable Test Day route. Constitution Principle V acceptance additionally requires US2 transparency and the final automated/browser evidence gate; US3 and US4 complete comparison, recovery, and required accessibility behavior.

### Incremental Delivery

1. **US1**: Fixed unscored practice and exact preparation return with no run mutation.
2. **US2**: Complete authoritative lap/item/buff/storage/clamp evidence and reconciliation.
3. **US3**: Fresh-snapshot repeat and latest-two same-run build comparison.
4. **US4**: Explicit unavailable/recovery behavior and full input/motion/viewport accessibility.
5. **Polish**: Full tests, build, lint, browser matrix, participant check, and retained feature 010 gate evidence.

---

## Notes

- Practice data is presentation-owned and never extends `Run`, its stages, encounters, or scored history.
- `resolveContest`, `buildPlaybackSchedule`, and `frameStateAt` remain the only contest/playback authorities; scenes format immutable facts only.
- Supplier and Reward Draft return to the exact active encounter and preserve offers, stock, purchases, `restockUsed`, credits, build, and storage.
- Whole-`Run` equality is the forward-compatible backstop; `ProtectedRunState` makes every mutable and RNG-relevant FR-027 field auditable.
- A failed deterministic, reconciliation, input-invariance, phase-integrity, or protected-state check makes T067 FAIL and keeps feature 010 blocked.
