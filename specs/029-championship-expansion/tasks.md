# Tasks: World Championship Expansion

**Input**: Design documents from `/specs/029-championship-expansion/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/world-tour-contract.md`, `quickstart.md`

**Testing discipline**: Strict test-first for scheduling, destination offers,
race-kind settlement, standings, local build generation, Last Chance, finale
selection, and deterministic replay. Each corresponding test must fail for the
expected reason before implementation begins.

**Integration note**: Feature 028 may land before or during implementation.
Reconcile its canonical PreRace/setup types rather than reverting, duplicating,
or bypassing them. Preserve unrelated dirty worktree changes.

## Phase 1: Setup, assets, and baselines

**Purpose**: Bind approved art/content identifiers and preserve current behavior
before replacing the schedule.

- [X] T001 Generate and visually inspect seven vehicle-free production-intent regional race backgrounds in `public/assets/backgrounds/regions/`
- [X] T002 Record dimensions, SHA-256 hashes, composition, generation path, and accepted status for all seven backgrounds in `specs/026-visual-ui-upgrade/asset-manifest.md`
- [ ] T003 [P] Create world-tour seed, run, stage, result, ghost, and build fixture builders in `tests/fixtures/world-tour-fixtures.ts`
- [ ] T004 [P] Add pre-migration schedule/economy/reputation/contract baselines in `tests/unit/championship-baseline.test.ts` and `tests/integration/world-tour-baseline.test.ts`
- [ ] T005 Run T004 against the current implementation, confirm it passes, and retain only assertions needed to detect unintended non-feature regressions

---

## Phase 2: Foundational world-tour domain

**Purpose**: Establish versioned types, region metadata, canonical schedule
construction, compatibility guard, and presentation isolation used by all
stories.

**Critical**: Blocks all user-story implementation.

- [ ] T006 Add failing type/contract tests in `tests/unit/championship.test.ts` for seven stable region IDs, Local/Championship race kinds, five legs, 40 stages, and the exact per-leg cadence/lap tables
- [ ] T007 Add failing deterministic offer tests in `tests/unit/championship.test.ts` for two ordered unvisited options, seed equality, back-navigation persistence, confirmation-only commitment, four unique choices, and automatic Paris
- [ ] T008 [P] Add failing region isolation tests in `tests/unit/tracks.test.ts` proving `regionTheme` survives track/race evidence but cannot change geometry, characteristics, stats, lap times, or settlement
- [ ] T009 [P] Add failing legacy compatibility tests in `tests/integration/legacy-run-guard.test.ts` proving old active schedules are rejected while entrant unlocks/settings are preserved
- [ ] T010 Add `RegionId`, `RaceKind`, `LocalRaceTier`, `FinaleMode`, `LastChanceStatus`, `TourLeg`, `TourStage`, destination-offer, standings, and versioned run shapes to `src/simulation/types.ts`
- [ ] T011 [P] Author immutable region labels, engineering tendencies, presentation theme keys, and Paris metadata in `src/content/regions.ts`
- [ ] T012 Implement versioned offer generation, travel confirmation, five-leg construction, exact 40-stage cadence, lap lookup, and progress derivation in `src/simulation/championship.ts`
- [ ] T013 Extend track/race evidence with presentation-only `regionTheme` in `src/simulation/tracks.ts` and enforce simulation isolation through typed boundaries
- [ ] T014 Implement old-schedule detection and explicit unavailable/restart projection in `src/simulation/championship.ts` and `src/simulation/run.ts` without mutating persistent settings/unlocks
- [ ] T015 Run T006-T009 plus current run/track regression suites and resolve every stale 12/24-stage or four/eight-race assumption explicitly

**Checkpoint**: A pure deterministic five-leg schedule can be created,
persisted, replayed, and rejected by version without Phaser.

---

## Phase 3: User Story 1 — Travel through a full world championship (Priority: P1)

**Goal**: Choose four unique regional legs from stable offers, travel to Paris,
and complete the exact 40-stage tour.

**Independent Test**: Complete a seeded route through four confirmations and
Paris; verify offers, cadence, navigation, history, and stage-40 completion.

### Tests

- [ ] T016 [P] [US1] Add failing complete-route property/table tests in `tests/unit/championship.test.ts` over representative seeds and all valid destination-choice paths
- [ ] T017 [P] [US1] Add failing navigation tests in `tests/integration/world-tour-flow.test.ts` for first offer after entrant selection, Back with no mutation, explicit confirmation, post-leg offers, automatic Paris, and exact completion
- [ ] T018 [P] [US1] Add failing encounter compatibility tests in `tests/unit/encounters.test.ts` proving Arrival plus three preparation stages use the existing two-choice catalog and regional flavor cannot alter odds/prices/rewards/mechanics

### Implementation

- [ ] T019 [US1] Extend run creation/advancement/history in `src/simulation/run.ts` to use committed `TourLeg`/`TourStage` state and complete only after stage 40 or explicit failure
- [ ] T020 [US1] Add region-flavor descriptors around unchanged encounter selection in `src/simulation/encounters.ts` without changing its probability/economy authority
- [ ] T021 [US1] Implement `DestinationScene` in `src/scenes/DestinationScene.ts` with two persistent cards, disclosed theme/cadence/tendency, Back, focus/input parity, and explicit travel confirmation
- [ ] T022 [US1] Register destination routing in `src/main.ts`, `src/scenes/EntrantSelectScene.ts`, `src/scenes/RunScene.ts`, and result-to-next-stage navigation without counting travel as a stage
- [ ] T023 [US1] Update run history/summary formatting in `src/scenes/runPresentation.ts` and `src/scenes/resultFormatting.ts` for five legs, 40 chronological outcomes, and stage-40 completion
- [ ] T024 [US1] Run T016-T018 and execute the complete-route quickstart scenario with at least two distinct seeded routes

**Checkpoint**: The entire world route is navigable with placeholder canonical
race opponents before specialized Local/standings logic lands.

---

## Phase 4: User Story 2 — Understand Local and Championship competition (Priority: P1)

**Goal**: Run both competition types through one contest pipeline while applying
their disclosed opponent, settlement, interest, points, and contract policies.

**Independent Test**: Resolve equivalent Local and Championship races, prove
canonical race parity, and reconcile all different settlement outputs.

### Tests

- [ ] T025 [P] [US2] Add failing settlement table tests in `tests/unit/settlement.test.ts` for all eight positions, Local `1+1` purse/no interest/no points, Championship `2+2` purse/interest/points, sponsor ordering, and zero-floor reputation
- [ ] T026 [P] [US2] Add failing shared-pipeline parity tests in `tests/integration/race-parity.test.ts` proving race kind selects inputs/policy only and never a second simulation, playback, setup, or Results resolver
- [ ] T027 [P] [US2] Add failing sponsor tests in `tests/integration/contract-targeting.test.ts` for next-Championship skipping Local Races and explicitly race-agnostic objectives progressing in either type
- [ ] T028 [P] [US2] Add failing player-copy/static-boundary tests in `tests/integration/world-tour-copy.test.ts` rejecting visible `PvE`/`PvP` and requiring Local Race/Championship Race across hub, setup, contracts, Results, history, and explanations

### Implementation

- [ ] T029 [US2] Implement pure race-kind purse, reputation, interest, points, sponsor, and explanation policy in `src/simulation/settlement.ts`
- [ ] T030 [US2] Refactor `src/simulation/contest.ts` and `src/simulation/run.ts` so both race kinds assemble the same canonical contest input and settle exactly once through T029
- [ ] T031 [US2] Update contract target resolution and objective eligibility in `src/simulation/encounters.ts` and sponsor content so next-Championship contracts skip Local Races and disclose that behavior
- [ ] T032 [US2] Add pure race-kind presentation labels/descriptions in `src/scenes/worldTourPresentation.ts` and consume them in `RunScene.ts`, `PreRaceScene.ts`, `ContestScene.ts`, and `ResultScene.ts`
- [ ] T033 [US2] Render itemized purse, interest, reputation, sponsor, and points settlement in `src/scenes/ResultScene.ts` without inferring values in the scene
- [ ] T034 [US2] Run T025-T028 plus current contest/playback/result regression suites

**Checkpoint**: Local and Championship races are mechanically canonical,
economically distinct, and unambiguous to players.

---

## Phase 5: Local opponent content and deterministic PvE fields (supports US2)

**Purpose**: Supply every Local Race with seven inspectable regional opponents
whose reduced difficulty comes solely from legal builds and setups.

- [ ] T035 Add failing content-schema/count tests in `tests/unit/localOpponents.test.ts` for 42 selectable-region profiles, seven Paris profiles, unique stable IDs, correct region counts, identity/tendency completeness, and no portrait requirement
- [ ] T036 Add failing Qualifier/Challenge generation tests in `tests/unit/localOpponents.test.ts` for allowed occupied-slot bands, tier caps, Balanced Qualifiers, track-aware legal Challenges, legs 1–2 lower bias, legs 3–4 upper bias, and no tier 3
- [ ] T037 Add failing legality/transparency/determinism tests in `tests/unit/localOpponents.test.ts` for canonical slot/build/setup validators, inspectable evidence, deterministic fallback, same-profile visible upgrade, and repeated equality
- [ ] T038 [P] Author seven British Isles and seven Continental Europe profiles in `src/content/localTeams/britishIsles.ts` and `src/content/localTeams/continentalEurope.ts`
- [ ] T039 [P] Author seven North America and seven South America profiles in `src/content/localTeams/northAmerica.ts` and `src/content/localTeams/southAmerica.ts`
- [ ] T040 [P] Author seven Northern Europe and seven Mediterranean & North Africa profiles in `src/content/localTeams/northernEurope.ts` and `src/content/localTeams/mediterraneanNorthAfrica.ts`
- [ ] T041 [P] Author seven Paris international exhibition profiles in `src/content/localTeams/parisExhibition.ts`
- [ ] T042 Assemble and validate the profile catalog in `src/content/localTeams/index.ts`, then implement deterministic legal item/build selection, slot/tier scaling, setup selection, and fallback provenance in `src/simulation/localOpponents.ts`
- [ ] T043 Integrate seven generated local snapshots into Local Race contest assembly in `src/simulation/run.ts` through the shared setup/contest boundary
- [ ] T044 Extend per-car Results inspection in `src/scenes/ResultScene.ts` to show local identity, legal build, setup, and fallback label from recorded evidence
- [ ] T045 Run T035-T037 across every profile, leg, and Local tier; reject content that requires a hidden pace modifier to meet difficulty goals

---

## Phase 6: User Story 3 — Follow a meaningful championship table (Priority: P1)

**Goal**: Track the player and seven persistent rivals across ten Championship
Races using exact points and deterministic tie-breaking.

**Independent Test**: Feed result matrices through ten rounds and independently
reconcile points, wins, podiums, recent finishes, ties, and classification.

### Tests

- [ ] T046 [P] [US3] Add failing standings tests in `tests/unit/standings.test.ts` for `10,8,6,5,4,3,2,1`, Local exclusion, wins, podiums, recent finish, and immutable history
- [ ] T047 [P] [US3] Add failing exhaustive tie-break tests in `tests/unit/standings.test.ts` for points → wins → podiums → most-recent Championship finish → stable entrant order
- [ ] T048 [P] [US3] Add failing rival persistence/evolution tests in `tests/unit/rivals.test.ts` for seven stable identities, canonical legal snapshots, deterministic leg evolution, and same-seed equality
- [ ] T049 [P] [US3] Add failing standings-flow tests in `tests/integration/world-tour-flow.test.ts` proving only Championship Results mutate standings and normal race ten determines final classification

### Implementation

- [ ] T050 [US3] Implement pure standings creation, result application, sorting, histories, qualification projection, and normal classification in `src/simulation/standings.ts`
- [ ] T051 [US3] Extend championship rival content/state generation in `src/content/rivals.ts` and `src/simulation/rivals.ts` with seven persistent identities and versioned evolving snapshots
- [ ] T052 [US3] Integrate standings mutation after Championship settlement only in `src/simulation/run.ts`, recording canonical per-race standings snapshots for history
- [ ] T053 [US3] Add standings table/history presentation models in `src/scenes/worldTourPresentation.ts` with text/symbol tie-break meaning and Local-team exclusion
- [ ] T054 [US3] Render current standings and post-race changes in `src/scenes/RunScene.ts` and `src/scenes/ResultScene.ts`
- [ ] T055 [US3] Run T046-T049 and the normal-finale quickstart scenario

**Checkpoint**: A full normal championship has stable rivals, reproducible
standings, and deterministic classification.

---

## Phase 7: User Story 4 — Earn and contest the elite Paris finale (Priority: P1)

**Goal**: Convert the final race into an exact-track eight-car title challenge
when the player leads after race nine.

**Independent Test**: Exercise sole-leader, equal-highest-points, lower-points,
sparse, duplicate, invalid, and full-record cases; verify field and classification.

### Tests

- [ ] T056 [P] [US4] Add failing finale qualification tests in `tests/unit/standings.test.ts` for sole raw-points lead, raw-points tie that secondary tie-breaks place first, raw-points tie that secondary tie-breaks place below first, lower points total, exact race-nine boundary, and derive-once behavior
- [ ] T057 [P] [US4] Add failing record-selection tests in `tests/unit/rivals.test.ts` for exact track fingerprint, eligibility/ranking, player exclusion, deduplication, invalid evidence rejection, top seven, and stable ordering
- [ ] T058 [P] [US4] Add failing fallback tests in `tests/unit/rivals.test.ts` for zero-to-six records, deterministic legal exhibition ghosts, visible provenance labels, and an unchanged total field of eight
- [ ] T059 [P] [US4] Add failing elite flow tests in `tests/integration/elite-finale.test.ts` for frozen standings, shared setup/contest/results pipeline, ghost standings exclusion, and finish-based World Champion/Podium/Classified outcomes

### Implementation

- [ ] T060 [US4] Define the injected exact-track recorded-ghost source, validation, and provenance contracts in `src/simulation/types.ts` and `src/simulation/rivals.ts` without adding networking
- [ ] T061 [US4] Implement finale derivation, record filtering/ranking, seven-slot selection, and deterministic exhibition fallback generation in `src/simulation/rivals.ts`
- [ ] T062 [US4] Persist `FinaleSelection` after Championship Race nine and assemble normal versus elite race-ten input exactly once in `src/simulation/run.ts`
- [ ] T063 [US4] Freeze standings in elite mode and implement finish-only elite classification in `src/simulation/standings.ts`
- [ ] T064 [US4] Add elite qualification, opponent provenance, frozen-table, and title-result presentation in `src/scenes/worldTourPresentation.ts`, `RunScene.ts`, `PreRaceScene.ts`, and `ResultScene.ts`
- [ ] T065 [US4] Run T056-T059 plus invalid/tampered ghost regression cases

**Checkpoint**: Both finale modes are deterministic, parity-safe, and complete.

---

## Phase 8: User Story 5 — Read the tour and regional identity (Priority: P2)

**Goal**: Present a legible world itinerary and distinct race environment while
keeping region strictly presentation-only.

**Independent Test**: Navigate an entire route at required viewports, inspect
completed legs/current stages, and force each background plus neutral fallback.

### Tests

- [ ] T066 [P] [US5] Add failing itinerary-model tests in `tests/unit/worldTourPresentation.test.ts` for selected route, visible locked Paris, completed history, current expanded eight-stage leg, dominant action, and shared header values
- [ ] T067 [P] [US5] Add failing responsive/accessibility tests in `tests/unit/worldTourPresentation.test.ts` for 800×450 fit, non-color stage states, focus order, compact history, and no unvisited-region clutter
- [ ] T068 [P] [US5] Add failing asset/preload/fallback tests in `tests/unit/visualAssets.test.ts` for seven stable region keys, correct file mapping, crop configuration, and neutral fallback

### Implementation

- [ ] T069 [US5] Implement pure world-map anchors, route lines, leg/history cards, current-stage sequence, header, and destination presentation in `src/scenes/worldTourPresentation.ts`
- [ ] T070 [US5] Recompose `src/scenes/RunScene.ts` as the stylized map itinerary with inspectable completed-leg histories and expanded current leg
- [ ] T071 [US5] Add all seven regional texture descriptors, preload keys, focal/crop metadata, and neutral fallback in `src/scenes/visualAssets.ts` and `src/scenes/BootScene.ts`
- [ ] T072 [US5] Select regional backgrounds/dressing from recorded `regionTheme` in `src/scenes/ContestScene.ts` without importing region content into simulation
- [ ] T073 [US5] Show canonical region and track identity in `src/scenes/PreRaceScene.ts` and `src/scenes/ResultScene.ts` even when visual loading falls back
- [ ] T074 [US5] Run T066-T068 and perform the regional-art/itinerary viewport matrix in `specs/029-championship-expansion/quickstart.md`

**Checkpoint**: The world-tour fantasy is visible and usable without changing
any race result.

---

## Phase 9: User Story 6 — Survive one Last Chance (Priority: P1)

**Goal**: Start at 12 reputation, warn near elimination, and allow exactly one
race-bound opportunity to recover after first reaching zero.

**Independent Test**: Exercise every transition and sponsor/race delta ordering,
including preparation traversal, recovery, repeat zero, and Paris-at-zero.

### Tests

- [ ] T075 [P] [US6] Add failing state-machine tests in `tests/unit/reputation.test.ts` for start 12, floor zero/no cap, warning threshold four, available→active→consumed, active→failed, and consumed→failed
- [ ] T076 [P] [US6] Add failing settlement-boundary tests in `tests/unit/settlement.test.ts` proving position+sponsor deltas settle before one Last Chance evaluation and ordering cannot change the outcome
- [ ] T077 [P] [US6] Add failing flow tests in `tests/integration/world-tour-flow.test.ts` for preparation while active, next-race-only recovery, later zero, no-next-race Paris zero, and explicit success/failure explanations

### Implementation

- [ ] T078 [US6] Implement pure Last Chance transitions and warning projection in `src/simulation/reputation.ts`
- [ ] T079 [US6] Initialize reputation/status and apply T078 once per final race settlement in `src/simulation/run.ts` and `src/simulation/settlement.ts`
- [ ] T080 [US6] Add low-reputation, active Last Chance, consumed, recovery, and failure presentation to `src/scenes/worldTourPresentation.ts`, `RunScene.ts`, and `ResultScene.ts`
- [ ] T081 [US6] Run T075-T077 and every Last Chance quickstart case

**Checkpoint**: Reputation failure is predictable, single-use, and complete.

---

## Phase 10: Determinism, integration, and release gates

**Purpose**: Prove the assembled 40-stage feature, content, visuals, compatibility,
and constitutional guarantees as one shippable slice.

- [ ] T082 Add a full same-version/seed/choice/evidence replay test in `tests/integration/world-tour-determinism.test.ts` comparing route, offers, stages, tracks, 49-profile snapshots, settlements, standings, finale, and classification
- [ ] T083 Add full-route integration fixtures for normal success, elite success, Last Chance recovery, Last Chance failure, and legacy rejection in `tests/integration/world-tour-flow.test.ts`
- [ ] T084 [P] Add static audits/tests rejecting region reads in lap/contest math, Local-only simulators, hidden pace fields, leaked PvE/PvP copy, every-race interest, and stale immediate-zero elimination in `tests/integration/world-tour-boundaries.test.ts`
- [ ] T085 [P] Reconcile `specs/HANDOFF.md`, `specs/DEFERRED.md`, and relevant gap/vision documents with the finalized World Tour, Local/Championship terminology, elite finale, Last Chance, and feature-030 playback-speed boundary
- [ ] T086 Run `rg` audits for stale 12/24-stage, four/eight-race, max-20-lap, immediate-zero-failure, every-race-interest, and flat-round-map assumptions; update each intentional survivor with explicit legacy context
- [ ] T087 Run focused feature suites and all existing run, encounter, setup, contest, playback, result, track, rival, and item tests; resolve regressions without weakening assertions
- [ ] T088 Run full `npm test`, `npm run lint`, and `npm run build`; accept only already documented non-feature warnings
- [ ] T089 Perform browser visual/input QA at 1920×1080, 1366×768, 1024×768, 800×450, and 390×844 for Destination, itinerary, setup, race, Results, history, standings, Last Chance, normal finale, elite finale, and missing-art fallback
- [ ] T090 Execute every scenario in `specs/029-championship-expansion/quickstart.md` and record evidence in `specs/029-championship-expansion/acceptance-evidence.md`
- [ ] T091 Re-run the Constitution Check from `plan.md` against delivered code and record final PASS evidence in `specs/029-championship-expansion/acceptance-evidence.md`

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 preserves baselines and accepted assets.
- Phase 2 is the blocking foundation for every story.
- US1 depends on Phase 2 and establishes full route navigation.
- US2 depends on Phase 2; its run wiring integrates with US1.
- Local opponent content depends on US2's shared race-kind boundary.
- US3 depends on US2 settlement and Phase 2 types; local content can be authored
  in parallel with early US3 domain work.
- US4 depends on completed US3 standings and rival evidence.
- US5 depends on Phase 2 presentation metadata and US1 route state; it can begin
  after those seams stabilize without waiting for elite logic.
- US6 depends on US2 settlement but is otherwise independent of US3-US5.
- Phase 10 depends on all selected stories.

### Parallel opportunities

- T003 and T004 can run in parallel.
- T008, T009, and T011 touch separate boundaries after the initial type contract.
- Test tasks marked `[P]` within each story can be written concurrently before
  their corresponding implementation tasks.
- T038-T041 split the 49 authored profiles into non-overlapping region modules;
  T042 performs their ordered catalog assembly after those tasks finish.
- US5 presentation work may proceed alongside US3/US4 domain work once route and
  theme models are stable.
- US6 state-machine work may proceed alongside standings/finale work after the
  settlement contract is stable.

## Implementation strategy

1. Lock the versioned 40-stage route and compatibility boundary.
2. Deliver an end-to-end route with one shared race-kind pipeline.
3. Add authored Local fields and exact settlement/contract behavior.
4. Add persistent standings, then the elite finale record adapter.
5. Layer the itinerary and seven environments over stable domain evidence.
6. Add Last Chance at the single settlement boundary.
7. Finish with complete deterministic replay, content validation, viewport QA,
   regression, and constitutional evidence.
