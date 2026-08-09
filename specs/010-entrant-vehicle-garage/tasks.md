# Tasks: Entrant Selection & Named-Vehicle Garage

**Input**: Finalized design documents from `/specs/010-entrant-vehicle-garage/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/entrant-garage-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. Every new or changed `src/simulation/` contract follows strict red-green ordering. Scene boundaries, presentation models, input parity, responsive behavior, and contest/result continuity receive focused integration or browser coverage.

**Organization**: Tasks are grouped by the five user stories in `spec.md`. Shared roster, item-schema, and `Build.board` migration work is foundational; explicit entrant confirmation is the MVP; the named garage, installation explanations, accessible input parity, and contest continuity build incrementally on the same immutable run and garage-command contracts.

## Pre-Implementation Constitution Gate

**BLOCKED**: T001 is the opening evidence check. T002 and every feature 010
source or test implementation task MUST remain blocked until T001 records PASS
evidence that Build Testing Access/Test Day under `specs/visual-overhaul.md`
UI-FR-022 is completed and validated. This is a hard implementation and release
gate required by constitution Principle V. Feature 010 does not implement,
approximate, or waive that separately scoped slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US5 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Opening Gate & Setup (Shared Infrastructure)

**Purpose**: Enforce the external Test Day prerequisite, then confirm the existing toolchain and feature boundaries before implementation

- [X] T001 Verify completed implementation plus automated/browser validation evidence for Build Testing Access/Test Day UI-FR-022 in `specs/visual-overhaul.md`, record a PASS/FAIL evidence index in `specs/010-entrant-vehicle-garage/gate-evidence.md`, and stop before T002 on FAIL; only after PASS, confirm feature 010 adds no runtime dependency and retains the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json`

**Checkpoint**: T001 contains PASS evidence for the constitutional prerequisite, and existing project tooling is sufficient; without PASS evidence, feature 010 remains blocked and no later task may start.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the authored roster, typed item catalog, four-slot vehicle model, and compatibility migration required by every user story

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T002 [P] Add failing catalog tests for all four reciprocal entrant/vehicle pairings, local asset keys, shared baseline car, four active slots, three storage positions, unique stable slot IDs, and exact Highwheel/Needle/Lark/Hush topology distributions in `tests/unit/entrants.test.ts`
- [X] T003 [P] Extend failing item-pool tests to require all 15 existing item IDs to retain prices/cooldowns/buff links/storage flags/base effects while adding exactly one of four origins, one Power/Chassis category, synergy tags, authored Fitted behavior, and explicit Improvised behavior or `none` in `tests/unit/item-pool.test.ts`
- [X] T004 Add failing build/run compatibility tests for constructing an empty four-slot `VehicleBuild`, preserving three storage positions, rejecting missing or mismatched identity/topology, and routing legacy generic `Build.board` state to a typed unavailable result rather than guessing defaults in `tests/unit/run.test.ts` (depends on T002-T003)

### Implementation

- [X] T005 [P] Define `EntrantId`, `VehicleId`, `Origin`, `SlotType`, `InstallationCategory`, `InstallationState`, item-behavior, run-identity, vehicle-topology, vehicle-build, locked-build, and contribution types in `src/simulation/types.ts` (depends on T002-T004)
- [X] T006 [P] Author Evelyn Mercer/The Highwheel, Lucien Soto/The Needle, Inez Rook/The Lark, and Nell Voss/The Hush with roles, approaches, strategy directions, origins, reciprocal IDs, shared baseline car, exact topologies, and asset keys in `src/content/entrants.ts` (depends on T002, T005)
- [X] T007 Migrate all 15 playable definitions without changing IDs, prices, cooldowns, buff relationships, base effects, or active-while-stored behavior; add independent origin, Power/Chassis category, synergy tags, Fitted behavior, and explicit Improvised disclosure in `src/content/sample-data.ts` (depends on T003, T005)
- [X] T008 Replace generic `Build.board` construction with validated topology-ordered `VehicleBuild.slots` plus three indexed storage positions, retaining temporary compatibility only inside the migration boundary in `src/simulation/build.ts`, `src/simulation/slots.ts`, and `src/simulation/storage.ts` (depends on T004-T007)
- [X] T009 Extend run identity/build validation so entrant, origin, vehicle, topology, capacity, and baseline mismatches return explicit typed unavailable errors without creating fallback state in `src/simulation/run.ts` (depends on T008)
- [X] T010 Migrate existing item/build/run fixtures to explicit entrant identity, four typed slots, and three stored positions in `tests/unit/buffs.test.ts`, `tests/unit/slots.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/draft.test.ts`, `tests/unit/encounters.test.ts`, `tests/unit/laps.test.ts`, `tests/unit/contest.test.ts`, `tests/unit/playback.test.ts`, `tests/unit/itemVisuals.test.ts`, `tests/integration/run-flow.test.ts`, and `tests/integration/result-scene.test.ts` (depends on T008-T009)
- [X] T011 Update the representative simulation logger to construct a valid named-vehicle build and emit topology-ordered installed/storage data in `scripts/log-simulation.mjs` (depends on T008-T010)
- [X] T012 Run `tests/unit/entrants.test.ts`, `tests/unit/item-pool.test.ts`, `tests/unit/run.test.ts`, `tests/unit/slots.test.ts`, and `tests/unit/storage.test.ts`; confirm foundational catalog and migration cases are GREEN and no public generic-board compatibility contract remains (depends on T005-T011)

**Checkpoint**: The complete catalog and run state use validated entrant identity, named four-slot topology, and three-space storage while preserving shipped item and run semantics.

---

## Phase 3: User Story 1 - Choose an entrant and named vehicle (Priority: P1) MVP

**Goal**: Let the player inspect and deliberately confirm one of four equal-capacity entrants before any run state or random generation exists.

**Independent Test**: Enter selection, inspect all four entrants, leave and return without creating state, then confirm each entrant in a controlled case and verify exactly one run starts with the expected immutable identity, named vehicle, topology, 5 credits, and Stage 1.

### Tests for User Story 1 (write first and confirm RED)

- [X] T013 [P] [US1] Add failing presentation-model tests for all four unlocked choices, role/approach/strategy/origin/vehicle details, topology counts, no-Flex disclosure for The Hush, equality copy, selected state, and disabled confirmation with no selection in `tests/unit/entrantPresentation.test.ts`
- [X] T014 [P] [US1] Add failing run tests proving the pure `createRunForEntrant` creates the fixed six-stage run exactly once after valid confirmation, starts with 5 credits and an empty matching topology, rejects invalid entrant/content initialization inputs, and neither receives nor discovers global active-run state in `tests/unit/run.test.ts`
- [X] T015 [US1] Add failing scene-flow tests proving Title/controller routing calls `canEnterEntrantSelection` with current active-run context, blocks selection with `active-run-exists`, never calls `createRunForEntrant` on that path, allows selection without an active run, keeps inspection/cancellation free of RNG and run state, requires confirmation, and routes each entrant's complete `Run` into Stage 1 in `tests/integration/entrant-run-flow.test.ts` (depends on T013-T014)

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement pure entrant list/detail/equality/confirmation/unavailable presentation selectors in `src/scenes/entrantPresentation.ts` (depends on T013)
- [X] T017 [US1] Implement pure validated `createRunForEntrant` with immutable `RunIdentity`, matching empty `VehicleBuild`, 5 credits, fixed stages, and one-time encounter generation; validate only explicit entrant/content initialization inputs and do not read active-run globals in `src/simulation/run.ts` (depends on T014, T016)
- [X] T018 [US1] Create `EntrantSelectScene` with inspect, select, cancel, explicit Enter Championship confirmation, persistent non-hover details, equality statement, topology labels, and unavailable handling while keeping pre-confirmation state local in `src/scenes/EntrantSelectScene.ts` (depends on T015-T017)
- [X] T019 [US1] Implement and call the caller-owned `canEnterEntrantSelection` guard before `createRunForEntrant`; route Begin Championship to selection only when allowed and without creating a fallback run, preserve the ended run's entrant after completion or abandonment, and expose selection only after an explicit return/new-run action in `src/scenes/TitleScene.ts` and `src/scenes/RunScene.ts` (depends on T018)
- [X] T020 [US1] Register and preload `EntrantSelectScene`, pass the confirmed run without reconstruction, and remove initial-route default identity creation in `src/main.ts` and `src/scenes/BootScene.ts` (depends on T019)
- [X] T021 [US1] Make entrant presentation, run creation, and selection-routing tests GREEN in `tests/unit/entrantPresentation.test.ts`, `tests/unit/run.test.ts`, and `tests/integration/entrant-run-flow.test.ts` (depends on T016-T020)
- [X] T022 [US1] Add scene/presentation assertions for visible selection, focus, disabled confirmation, all-four availability, and no stronger/locked/class framing in `tests/integration/entrant-run-flow.test.ts` (depends on T021)

**Checkpoint**: A run begins only after deliberate entrant confirmation and owns the correct immutable identity and empty named vehicle.

---

## Phase 4: User Story 2 - Prepare the named vehicle in a real garage (Priority: P1)

**Goal**: Replace generic active-board management with the selected four-slot named vehicle, three-space storage, and atomic acquire/move/swap/replace/evict operations.

**Independent Test**: Open Supplier and Reward Draft garages for all four entrants, use all active/storage positions, exercise every movement and replacement operation, cancel a pending displacement, and verify no item or credit is duplicated, lost, or committed early.

### Tests for User Story 2 (write first and confirm RED)

- [X] T023 [P] [US2] Add failing pure garage tests for offer-to-slot/storage placement, active rearrangement, active-storage moves, swaps, replacement, explicit eviction, decline, no-op, stale source, unknown slot, invalid storage index, cancellation, immutable inputs, and unique item-copy conservation in `tests/unit/garage.test.ts`
- [X] T024 [P] [US2] Extend failing encounter tests for atomic Supplier purchase and Reward Draft acceptance through garage commands, including affordability, purchased/completed guards, full-capacity confirmation, cancellation, and unchanged credits/stock/history on failed placement in `tests/unit/encounters.test.ts`
- [X] T025 [US2] Add failing garage scene-flow tests for named-vehicle labels, exact topology order, visible occupied/empty states, three separate storage positions, pre-confirmation occupant/displacement comparison, and zero user-facing Board/BOARD copy in `tests/integration/garage-input-parity.test.ts` (depends on T023-T024)

### Implementation for User Story 2

- [X] T026 [US2] Implement one pure `previewGarageCommand`/`commitGarageCommand` validation path with typed source/destination/replacement commands, atomic immutable results, explicit confirmations, and typed capacity/state failures in `src/simulation/garage.ts` (depends on T023-T025)
- [X] T027 [US2] Route Supplier purchases and Reward Draft acceptance/decline through garage commits so build, credits, stock, encounter status, and history update atomically in `src/simulation/encounters.ts` (depends on T024, T026)
- [X] T028 [US2] Remove direct scene mutation through legacy slot/storage helpers and dispatch only pure garage commands from `src/scenes/PrepareScene.ts` (depends on T026-T027)
- [X] T029 [US2] Implement pure garage topology, source/destination, occupant comparison, storage, confirmation, and encounter-action presentation models in `src/scenes/garagePresentation.ts` (depends on T025-T028)
- [X] T030 [US2] Render the selected silhouette as the central named vehicle, four stable typed mounting slots, separate three-space storage, offer area, persistent comparison, explicit displacement outcome, decline/cancel/confirm actions, and garage/workshop terminology in `src/scenes/PrepareScene.ts` (depends on T029)
- [X] T031 [US2] Carry the unchanged `Run` and `VehicleBuild` between Run and preparation encounters without compacting slots or reconstructing storage in `src/scenes/RunScene.ts` and `src/scenes/PrepareScene.ts` (depends on T030)
- [X] T032 [US2] Make atomic garage and encounter tests GREEN in `tests/unit/garage.test.ts` and `tests/unit/encounters.test.ts` (depends on T026-T031)
- [X] T033 [US2] Make named-vehicle, topology, storage, comparison, cancellation, and terminology scene cases GREEN in `tests/integration/garage-input-parity.test.ts` (depends on T029-T031)
- [X] T034 [US2] Run board/storage compatibility regressions in `tests/unit/slots.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/draft.test.ts`, and `tests/unit/buffs.test.ts`; confirm duplicate-copy, storage-active, eviction, and capacity behavior survives the command-boundary migration (depends on T032-T033)
- [X] T035 [US2] Remove temporary generic `board` compatibility aliases and migrate remaining active-build references in `src/simulation/build.ts`, `src/simulation/contest.ts`, `src/scenes/itemVisuals.ts`, and `src/scenes/itemVisualDescriptor.ts` to topology-ordered vehicle slots (depends on T034) — `build.ts`/`itemVisuals.ts`/`itemVisualDescriptor.ts` already operate on `VehicleBuild` only; `contest.ts`'s `ContestResult.board` is the result-summary field name (US5/T058 scope), not the legacy `Build.board` alias, so no change was needed here
- [X] T036 [US2] Run `npm run build` and the focused US2 suites after compatibility removal; confirm all active preparation consumers compile against `VehicleBuild` only (depends on T035)

**Checkpoint**: Every entrant has a recognizable equal-capacity garage whose pure commands preserve items, economy, encounter state, and cancellation semantics.

---

## Phase 5: User Story 3 - Understand installation behavior before committing (Priority: P1)

**Goal**: Keep every active destination legal while previewing and applying each item's exact authored Fitted, Flexible, or Improvised behavior with occupant comparison.

**Independent Test**: Preview one Power and one Chassis item in matching, Flex, and conflicting slots; verify exact gained/lost/consequence text, commit each state, compare against an occupant, and move to storage where installation state disappears.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T037 [P] [US3] Add failing truth-table tests for pure Fitted/Flexible/Improvised resolution, base behavior retention, gained Fitted behavior, lost Fitted disclosure, authored Improvised consequence or explicit `none`, item-definition immutability, and legality across every catalog item and slot type in `tests/unit/garage.test.ts`
- [ ] T038 [P] [US3] Extend failing lap tests for typed base/Fitted/Improvised behavior operations, Flexible base-only behavior, no installation behavior in storage, same-type slot permutation neutrality, and stable existing cooldown/buff ordering in `tests/unit/laps.test.ts`
- [ ] T039 [US3] Add failing presentation tests for candidate/current-occupant installation states, exact behavior gained/retained/lost, displacement result, category/origin/tags/cooldown/price/affordability/storage behavior, and explicit no-additional-consequence text in `tests/unit/garagePresentation.test.ts` (depends on T037-T038)

### Implementation for User Story 3

- [ ] T040 [US3] Implement pure `resolveInstallation` and enrich placement previews with display-ready behavior/state/loss/displacement facts while treating every category-slot pairing as legal in `src/simulation/garage.ts` (depends on T037-T039)
- [ ] T041 [US3] Apply structured base plus resolved authored installation behavior during deterministic lap simulation and record slot ID, installation state, behavior source, and numeric contribution in `src/simulation/laps.ts` (depends on T038, T040)
- [ ] T042 [US3] Extend the persistent inspector and occupant comparison presentation with all required authored, installation, price, affordability, and storage facts in `src/scenes/garagePresentation.ts` and `src/scenes/itemVisualDescriptor.ts` (depends on T039-T041)
- [ ] T043 [US3] Render text/icon/structural Fitted, Flexible, and Improvised badges plus exact preview/result changes for every enabled destination in `src/scenes/PrepareScene.ts` (depends on T042)
- [ ] T044 [US3] Run `tests/unit/garage.test.ts`, `tests/unit/laps.test.ts`, and `tests/unit/garagePresentation.test.ts`; confirm the complete item-by-slot matrix, simulation behavior, and inspector comparison cases are GREEN (depends on T040-T043)

**Checkpoint**: Installation state is always legal, predictable before commitment, authored per item, and applied deterministically without hidden universal math.

---

## Phase 6: User Story 4 - Use the garage without relying on drag or hover (Priority: P2)

**Goal**: Give drag, click/tap selection, and keyboard users the same persistent information, previews, confirmations, and atomic command results.

**Independent Test**: Complete acquire, install, move, swap, store, compare, cancel, and evict with drag, non-drag pointer/touch, and keyboard adapters and assert identical commands, builds, credits, and histories.

### Tests for User Story 4 (write first and confirm RED)

- [ ] T045 [P] [US4] Add failing adapter parity tests mapping equivalent drag/drop, click/tap select-destination, and keyboard intents to deeply equal garage commands and final run states in `tests/integration/garage-input-parity.test.ts`
- [ ] T046 [P] [US4] Add failing presentation tests for deterministic focus order across offers, four slots, three storage positions, inspector, cancel/confirm, and encounter actions; visible focus/selection/disabled/storage-active states; Escape cancellation; and no hover-only facts in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 4

- [ ] T047 [US4] Add drag, pointer/touch selection, and keyboard intent adapters that emit the same `GarageCommand` and consume the same preview/confirmation result in `src/scenes/PrepareScene.ts` (depends on T045-T046)
- [ ] T048 [US4] Implement persistent source selection, arrow/Tab destination traversal, Enter/Space activation, Escape cancellation, explicit confirmation focus, and non-hover item inspection in `src/scenes/PrepareScene.ts` (depends on T047)
- [ ] T049 [US4] Add semantic text/icon/shape treatments for Power, Chassis, Flex, installation state, focus, selection, occupied, storage-active, disabled, and unavailable states in `src/scenes/garagePresentation.ts` and `src/scenes/demoTheme.ts` (depends on T048)
- [ ] T050 [US4] Add reduced-motion branches that preserve information and command timing while suppressing nonessential selection, displacement, storage, and phase-transition motion in `src/scenes/PrepareScene.ts` and `src/scenes/EntrantSelectScene.ts` (depends on T048-T049)
- [ ] T051 [US4] Make command parity, focus traversal, activation, cancellation, persistent-inspector, and reduced-motion cases GREEN, and add a lightweight tested animation/input responsiveness check proving representative selection/displacement transitions keep focus and activation responsive without an input-blocking stall in `tests/integration/garage-input-parity.test.ts` and `tests/unit/garagePresentation.test.ts` (depends on T047-T050)

**Checkpoint**: Every required garage workflow is available without hover or precision dragging and resolves through one shared domain command path.

---

## Phase 7: User Story 5 - Carry entrant and topology through the run and contest (Priority: P2)

**Goal**: Preserve immutable entrant/vehicle/build identity through weighted acquisition, run routing, contest locking, deterministic playback, results, and summary with installation attribution.

**Independent Test**: Complete a controlled run for each entrant, verify 75/25 origin weighting and topology persistence, lock a mixed-state build, resolve it repeatedly, and inspect identical contest/results with attributable installation contributions.

### Tests for User Story 5 (write first and confirm RED)

- [ ] T052 [P] [US5] Extend failing deterministic draft tests for Coachworks, Velodrome, Fieldworks, and Backroads with normalized RNG draws immediately below `0.75` selecting the eligible home-origin group and draws exactly at `0.75` selecting the eligible all-other-origin group; assert exact selected-group membership, `0.75`/`0.25` weighting, typed empty-selected-group failure without silent branch switching, and no origin/category legality coupling in `tests/unit/draft.test.ts`
- [ ] T053 [P] [US5] Add failing contest tests proving `lockContestBuild` returns `kind: "locked"` with an immutable topology-ordered snapshot for valid context and typed `validation-failure` codes for invalid run, entrant, build, and topology context without throwing or returning a partial snapshot; also cover resolved installed states, storage, same-input deep equality across 100 resolutions, same-type slot permutation neutrality, and Fitted/Improvised contribution attribution in `tests/unit/contest.test.ts`
- [ ] T054 [P] [US5] Extend failing playback/result presentation tests for entrant/vehicle labels, topology order, installation badges, behavior source, slot attribution, lost-Fitted/no-consequence facts, and unchanged 10/12-lap result semantics in `tests/unit/contestFormatting.test.ts` and `tests/integration/result-scene.test.ts`
- [ ] T055 [US5] Extend failing six-stage integration tests for identity/build/storage/credits/sponsor/history continuity across Run, Prepare/garage, Contest, Result, continuation, completion, abandonment, and unavailable recovery; prove completion and abandonment preserve the ended entrant, cannot silently create or select another entrant/run, and require an explicit return/new-run action before entrant selection becomes available in `tests/integration/run-flow.test.ts` and `tests/integration/entrant-run-flow.test.ts` (depends on T052-T054)

### Implementation for User Story 5

- [ ] T056 [US5] Replace legacy identity-tag weighting with four-origin 75/25 selection and typed generation failure while preserving existing offer storage/reuse rules in `src/simulation/draft.ts` and `src/simulation/encounters.ts` (depends on T052-T055)
- [ ] T057 [US5] Implement `lockContestBuild` as a discriminated `locked`/`validation-failure` result with typed invalid run, entrant, build, and topology codes; produce immutable topology-ordered installed/storage snapshots with materialized installation resolutions only on success and do not throw expected failures in `src/simulation/contest.ts` (depends on T053, T056)
- [ ] T058 [US5] Extend contest results and playback records with run identity, named vehicle, canonical topology, installation state, behavior source, slot ID, and contribution facts without reading mutable run or presentation state in `src/simulation/contest.ts`, `src/simulation/playback.ts`, and `src/simulation/types.ts` (depends on T053-T057)
- [ ] T059 [US5] Carry complete validated run/vehicle context through `src/scenes/RunScene.ts`, `src/scenes/PrepareScene.ts`, `src/scenes/ContestScene.ts`, and `src/scenes/ResultScene.ts`; narrow `lockContestBuild` on `kind`, route validation failures to unavailable recovery, and reject missing/inconsistent context without exceptions or default entrant, vehicle, topology, or generic slots (depends on T055-T058)
- [ ] T060 [US5] Render recognizable entrant/vehicle identity, canonical topology tray, installation badges, and immutable contribution callouts during input-free playback in `src/scenes/ContestScene.ts`, `src/scenes/contestFormatting.ts`, and `src/scenes/itemVisuals.ts` (depends on T054, T059)
- [ ] T061 [US5] Preserve entrant/vehicle identity and explain consequential Fitted/Improvised contributions and no-consequence lost-Fitted facts in result inspection and run continuation in `src/scenes/ResultScene.ts`, `src/scenes/resultFormatting.ts`, and `src/scenes/runPresentation.ts` (depends on T054, T060)
- [ ] T062 [US5] Run `tests/unit/draft.test.ts`, `tests/unit/contest.test.ts`, `tests/unit/playback.test.ts`, `tests/unit/contestFormatting.test.ts`, `tests/integration/result-scene.test.ts`, `tests/integration/run-flow.test.ts`, and `tests/integration/entrant-run-flow.test.ts`; confirm exact `0.75` branch behavior, deterministic locking, attribution, 10/12-lap behavior, ended-run routing guards, and full-run continuity are GREEN (depends on T056-T061)

**Checkpoint**: Entrant identity and installation-aware topology remain immutable, deterministic, and explainable throughout the complete shipped run.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Complete local assets, responsive shell behavior, documentation, release dependencies, and full automated/browser acceptance

- [X] T063 [P] Create distinct offline placeholder portraits/emblems for all entrants in `public/assets/entrants/evelyn-mercer.svg`, `public/assets/entrants/lucien-soto.svg`, `public/assets/entrants/inez-rook.svg`, and `public/assets/entrants/nell-voss.svg`
- [X] T064 [P] Create distinct offline silhouettes for The Highwheel, The Needle, The Lark, and The Hush in `public/assets/vehicles/the-highwheel.svg`, `public/assets/vehicles/the-needle.svg`, `public/assets/vehicles/the-lark.svg`, and `public/assets/vehicles/the-hush.svg`
- [ ] T065 Preload and render every local portrait/silhouette without network access or simulation metadata, and verify nonblank selection, garage, and race-marker use in `src/scenes/BootScene.ts`, `src/scenes/EntrantSelectScene.ts`, `src/scenes/PrepareScene.ts`, and `src/scenes/ContestScene.ts` (depends on T063-T064)
- [ ] T066 Implement responsive host/canvas safe-area sizing and landscape/tablet/narrow-portrait composition selection without changing the 800x450 logical game or simulation inputs in `index.html`, `src/main.ts`, `src/scenes/entrantPresentation.ts`, and `src/scenes/garagePresentation.ts` (depends on T065)
- [ ] T067 Update current gameplay, testing, named-vehicle garage, input parity, and local browser validation documentation in `README.md`; record Build Testing Access/Test Day as an external implementation-and-release gate without implementing or waiving it in `specs/DEFERRED.md` (depends on T062, T066)
- [ ] T068 Run `npm test`, `npm run build`, and `npm run lint`; fix only feature-related failures and confirm existing credits, sponsors, six-stage progression, 10/12-lap contests, storage-active behavior, and result regressions remain GREEN (depends on T062-T067)
- [ ] T069 Run the viewport, asset, terminology, reduced-motion, and monochrome scenarios in `specs/010-entrant-vehicle-garage/quickstart.md` through the local Vite browser at 1920x1080, 1366x768, 1024x768, and 390x844; record outcomes in `specs/010-entrant-vehicle-garage/acceptance-results.md` and verify no horizontal page scroll or clipped targets, 14px supporting/16px interactive text, long-copy containment, nonblank local assets, zero active-build Board/BOARD labels, and explicit Test Day release-gate status (depends on T068)
- [ ] T070 Independently reset to title and complete entrant selection plus one full preparation encounter keyboard-only with no pointer/touch input; exercise inspect, acquire, install, move, store, compare, cancel, replace/evict, and encounter completion, then record final-build parity, no-hover information access, monochrome state legibility, stable animation, responsive focus/activation, and zero input-blocking stalls in `specs/010-entrant-vehicle-garage/acceptance-results.md` (depends on T069)
- [ ] T071 Independently reset to title and complete entrant selection plus one full preparation encounter touch-only with no keyboard, mouse, hover, or drag; exercise inspect, acquire, install, move, store, compare, cancel, replace/evict, and encounter completion, then record final-build parity, no-hover information access, monochrome state legibility, stable animation, responsive activation, and zero input-blocking stalls in `specs/010-entrant-vehicle-garage/acceptance-results.md` (depends on T070)
- [ ] T072 Conduct the moderated acceptance study for SC-001, SC-002, SC-003, and SC-011 with at least 5 representative first-time/demo users who receive no external workflow instruction; record per-participant completion, SC-001 elapsed time and bias-not-locking explanation, SC-002 vehicle/topology/equal-capacity answers, every SC-003 placement-state and exact-behavior prediction, and SC-011 visual-review responses, then calculate and mark PASS/FAIL against SC-001 `>=90%` under 2 minutes, SC-002 `100%`, SC-003 `>=95%` of recorded decisions, and SC-011 `>=4/5` in `specs/010-entrant-vehicle-garage/acceptance-study.md` (depends on T071)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Opening Gate & Setup**: T001 records PASS evidence for completed and validated Build Testing Access/Test Day UI-FR-022; T001 blocks T002 and every feature 010 source/test implementation task when evidence is missing or FAIL
- **Phase 2 - Foundational**: Depends on Setup and blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; establishes deliberate run creation and immutable identity
- **Phase 4 - US2**: Depends on US1 because the garage operates on the confirmed run's named `VehicleBuild`
- **Phase 5 - US3**: Depends on US2 because installation resolution enriches the shared garage preview/commit boundary
- **Phase 6 - US4**: Depends on US2-US3 because every input mode dispatches their finalized commands and previews
- **Phase 7 - US5**: Depends on US1-US4 because it locks and presents the finalized identity, build, installation, and interaction contracts
- **Phase 8 - Polish**: Depends on all selected user-story phases; T069 precedes independent keyboard-only T070, touch-only T071, and moderated study T072 acceptance

### User Story Dependencies

- **US1 (P1, MVP)**: Foundational only; independently validates inspection, explicit confirmation, and immutable run identity
- **US2 (P1)**: Uses US1's confirmed identity/topology; independently validates named-garage capacity and atomic build operations
- **US3 (P1)**: Uses US2's preview/command boundary; independently validates all-legal item-authored installation behavior
- **US4 (P2)**: Uses US2-US3 commands/previews; independently validates drag, non-drag, keyboard, touch, and reduced-motion parity
- **US5 (P2)**: Uses the completed build contract; independently validates origin weighting, deterministic contest locking, routing continuity, and result attribution

### Strict Test-First Order

- T002-T004 MUST be RED before T005-T009 change shared simulation types, builds, or run validation
- T014 MUST be RED before T017 changes run creation
- T023-T024 MUST be RED before T026-T027 add garage/encounter commands
- T037-T038 MUST be RED before T040-T041 add installation resolution or lap behavior
- T052-T053 MUST be RED before T056-T058 change draft, contest locking, or result contracts

---

## Parallel Opportunities

### Foundational catalog tests and content

```text
T002: Entrant/vehicle catalog tests in tests/unit/entrants.test.ts
T003: Complete item-schema migration tests in tests/unit/item-pool.test.ts

After T005:
T006: Four-entrant authored content in src/content/entrants.ts
T007: Fifteen-item authored migration in src/content/sample-data.ts
```

### US1 selection boundaries

```text
T013: Pure entrant presentation tests in tests/unit/entrantPresentation.test.ts
T014: Confirmed run-creation tests in tests/unit/run.test.ts
```

### US2 garage boundaries

```text
T023: Pure garage operation tests in tests/unit/garage.test.ts
T024: Atomic encounter/economy tests in tests/unit/encounters.test.ts
```

### US3 installation boundaries

```text
T037: Installation truth-table/catalog matrix in tests/unit/garage.test.ts
T038: Installation-aware simulation tests in tests/unit/laps.test.ts
```

### US4 input-parity boundaries

```text
T045: Equivalent drag, touch, and keyboard command tests in tests/integration/garage-input-parity.test.ts
T046: Focus order, semantic state, cancellation, and no-hover tests in tests/unit/garagePresentation.test.ts
```

### US5 continuity boundaries

```text
T052: Four-origin weighted-draft tests in tests/unit/draft.test.ts
T053: Locked-build and determinism tests in tests/unit/contest.test.ts
T054: Contest/result presentation tests in tests/unit/contestFormatting.test.ts and tests/integration/result-scene.test.ts
```

### Local assets

```text
T063: Four entrant portrait/emblem placeholders under public/assets/entrants/
T064: Four named-vehicle silhouettes under public/assets/vehicles/
```

Tasks sharing `src/simulation/types.ts`, `src/simulation/run.ts`, `src/simulation/garage.ts`, `src/scenes/PrepareScene.ts`, or `tests/integration/run-flow.test.ts` remain sequential to avoid conflicting contract edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T022.
3. Stop and validate entrant inspection, explicit confirmation, and immutable named-vehicle run creation independently.

US1 is the identity-selection MVP. The minimum playable garage increment is Setup + Foundational + US1 + US2 + US3; US4 provides required accessibility parity, and US5 completes the feature's run-to-result contract.

### Incremental Delivery

1. **US1**: Four-way inspection and deliberate confirmed run creation.
2. **US2**: Named four-slot garage, storage, and atomic movement/acquisition.
3. **US3**: Exact item-authored Fitted/Flexible/Improvised previews and simulation.
4. **US4**: Shared-command drag, touch/non-drag, keyboard, and reduced-motion parity.
5. **US5**: Origin weighting, contest locking, scene routing, playback, results, and run continuity.
6. **Polish**: Local assets, responsive viewport matrix, documentation, full gates, and Test Day release dependency.
7. **Acceptance**: Record viewport/browser results, complete keyboard-only and touch-only passes independently, then run the five-or-more-participant SC-001/SC-002/SC-003/SC-011 study against its explicit thresholds.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test task; implementation begins only after the listed RED checks fail for the expected missing behavior.
- `Origin`, installation category, synergy tags, and item legality are independent axes. Every item remains legal in every active slot.
- Installation state is derived from immutable item content plus slot type; stored items have no installation state, and no universal fit/mismatch modifier is introduced.
- Stable slot ordering supports rendering, focus, locking, and review only; same-type position, adjacency, silhouette coordinates, and item order have no simulation meaning.
- All input modes emit the same garage commands. Scenes render domain previews and results but do not calculate installation behavior, economy, or contest contributions.
- Existing run schedule, credits, sponsor contracts, acquisition guards, fixed ghost, 10/12-lap contests, and input-free playback remain authoritative.
- Build Testing Access/Test Day is an explicit external implementation and
  release prerequisite. T001 must record PASS evidence before T002 or any source
  or test implementation begins; this task list documents and checks the gate
  but does not implement or waive it.