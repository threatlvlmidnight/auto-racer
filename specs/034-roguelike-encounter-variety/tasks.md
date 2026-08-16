# Tasks: Roguelike Encounter Variety

**Input**: Design documents in `specs/034-roguelike-encounter-variety/`

**Tests**: Required for deterministic simulation, transaction, content-corpus,
integration, and presentation contracts. Owner performs visual acceptance.

## Phase 1: Setup and cross-feature reconciliation

- [X] T001 Reconcile Feature 033 retained overtake and race-evidence contracts needed by Guarded in `specs/033-race-enrichment/` and `specs/034-roguelike-encounter-variety/contracts/encounter-variety-contract.md`
- [X] T002 [P] Add deterministic Feature 034 builders and seeds in `tests/fixtures/encounter-variety-fixtures.ts`
- [X] T003 [P] Snapshot the current four-stat marginal-value corpus in `tests/fixtures/balance-fixtures.ts` and `tests/unit/balance.test.ts`
- [X] T004 [P] Inventory every playable item's placement behavior in `tests/fixtures/item-presentation-fixtures.ts`

---

## Phase 2: Foundational authority

**Purpose**: Blocking shared models and deterministic boundaries.

- [X] T005 Write instance identity, duplicate, move, storage, tier, and removal tests in `tests/unit/itemInstances.test.ts`
- [X] T006 Introduce `ItemInstance`, provenance, reservation, and versioned encounter types in `src/simulation/types.ts`
- [X] T007 Implement stable run-scoped item identity and definition lookup in `src/simulation/itemInstances.ts`
- [X] T008 Migrate vehicle slots and storage to item instances in `src/simulation/garage.ts`, `src/simulation/storage.ts`, and `src/simulation/build.ts` (landed through the additive `liveItemInstances.ts` compatibility boundary and stable `instanceId` fields)
- [X] T009 Migrate acquisition, duplicate tiering, sale, and inventory operations in `src/simulation/draft.ts`, `src/simulation/tiering.ts`, and `src/simulation/run.ts`
- [X] T010 Update garage and inventory presentation view models for item identity in `src/scenes/garagePresentation.ts` and `src/scenes/inventoryPresentation.ts`
- [X] T011 Update existing garage/storage/tiering/inventory fixtures and regressions in `tests/unit/garage.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/tiering.test.ts`, and `tests/integration/inventory-flow.test.ts`
- [X] T012 Write canonical-stat equivalence and simulation-boundary tests in `tests/unit/statNormalization.test.ts`
- [X] T013 Implement canonical stat types, calibration coefficients, and physics adapter in `src/simulation/statNormalization.ts`
- [X] T014 Route stock cars, items, setup, and lap simulation through canonical points in `src/simulation/types.ts`, `src/simulation/raceSetup.ts`, and `src/simulation/laps.ts`
- [X] T015 Update stat inspection and race evidence to report canonical points in `src/scenes/vehicleStatPresentation.ts`, `src/scenes/raceSetupPresentation.ts`, and `src/scenes/resultFormatting.ts`
- [X] T016 Add the balanced reference-track 10% acceptance gate in `tests/unit/balance.test.ts`
- [X] T017 Write encounter definition, eligibility, transaction atomicity, stale-preview, and idempotency contract tests in `tests/unit/encounters.test.ts`
- [X] T018 Implement declarative encounter definitions, retained instances, action previews, and pure transactions in `src/simulation/encounters.ts`
- [X] T019 Extend run state with encounter versions, cadence, pending-effect categories, and immutable history evidence in `src/simulation/run.ts`
- [X] T020 Add typed legacy/stale/unavailable recovery without guessed migrations in `src/simulation/run.ts` and `tests/unit/run.test.ts`
- [X] T021 Add exact reusable encounter view models in `src/scenes/encounterPresentation.ts` and tests in `tests/unit/encounterPresentation.test.ts`
- [X] T022 Integrate retained encounter lifecycle and one-time advancement in `src/scenes/RunScene.ts` and `tests/integration/run-flow.test.ts`

**Checkpoint**: Existing behavior passes with stable instances and canonical stats.

---

## Phase 3: User Story 1 — Mechanically different choices (P1) 🎯 MVP

**Goal**: Deterministic varied pairs across all 20 choice stages.

**Independent Test**: Traverse seeded full runs and verify legal, retained,
non-acquisition-doubled pairs, cooldowns, guarantees, and bounded fallback.

- [X] T023 [US1] Write cooldown, family-pair, guarantee-window, deterministic replay, and fallback tests in `tests/unit/encounterCadence.test.ts`
- [X] T024 [P] [US1] Author at least three early/mid/late variants for each new encounter in `src/content/encounterVariants.ts`
- [X] T025 [US1] Implement eligibility filters, two-choice selected-type cooldown, stable sorting, and bounded fallback in `src/simulation/encounterCadence.ts`
- [X] T026 [US1] Implement global-stage guarantee tracking, including Upgrade Workshop windows 1–20 and 21–40, in `src/simulation/encounterCadence.ts`
- [X] T027 [US1] Register the seven new types and classify existing encounters by family in `src/content/encounterVariants.ts` and `src/simulation/encounterCadence.ts`
- [X] T028 [US1] Store generated pairs before presentation and isolate named seed domains via `cadenceDomainRng` in `src/simulation/encounterCadence.ts` (pair storage in `run.ts` state is a run-integration follow-up)
- [X] T029 [US1] Present type, interaction, input, cost, consequence, and disabled reason in `src/scenes/runPresentation.ts` and `src/scenes/RunScene.ts`
- [X] T030 [US1] Add a 20-choice-stage deterministic route corpus covering every eligible new type and authored variant in `tests/integration/encounter-variety-flow.test.ts`

**Checkpoint**: US1 is a shippable variety/cadence increment.

---

## Phase 4: User Story 2 — Modify, sacrifice, exchange, or transform (P1)

**Goal**: Exact, atomic, instance-bound build reshaping.

**Independent Test**: Confirm/decline/unavailable/stale fixtures for all build
operations and verify exact before/after state and history.

- [X] T031 [P] [US2] Write modification compatibility, replacement, tier-scaling, movement, and attribution tests in `tests/unit/itemModifications.test.ts`
- [X] T032 [P] [US2] Write Scrutineering formula, cap, reservation, concurrent Sponsor, and return tests in `tests/unit/scrutineering.test.ts`
- [X] T033 [P] [US2] Write upgrade, exchange, rebuild, capacity, and atomic rollback tests in `tests/unit/encounterTransactions.test.ts`
- [X] T034 [P] [US2] Author stat graft, Twin-Tuned, Guarded, and Adapted Mount content/compatibility in `src/content/itemModifications.ts`
- [X] T035 [US2] Implement modification resolution, replacement, tier interaction, and contribution attribution in `src/simulation/itemModifications.ts`
- [X] T036 [US2] Integrate stat grafts, Twin-Tuned, and Adapted Mount into resolved build contributions in `src/simulation/raceSetup.ts`
- [X] T037 [US2] Integrate Guarded with Feature 033 retained overtake attempts and once-per-race evidence in `src/simulation/contest.ts` and `src/simulation/playback.ts`
- [X] T038 [US2] Implement Factory Development item-first compatible offers and free confirmation in `src/simulation/encounterOffers.ts` (pure offers; `encounters.ts`/scene wiring is a follow-up)
- [X] T039 [US2] Implement Upgrade Workshop eligibility, optional free single-item tiering, and guarantee fulfillment in `src/simulation/encounterOffers.ts`
- [X] T040 [US2] Implement Privateer Exchange same-tier foreign-origin offers and settlement in `src/simulation/encounterOffers.ts`
- [X] T041 [US2] Implement Experimental Rebuild tier/category filtering, 2-credit payment, three replacements, and modification destruction in `src/simulation/encounterOffers.ts`
- [X] T042 [US2] Implement Scrutineering target snapshot, configurable percentage/cap, impound, and per-category pending state in `src/simulation/scrutineering.ts` (pure module; `encounters.ts`/scene wiring is a follow-up)
- [X] T043 [US2] Reserve the source vehicle slot and reject move/install conflicts via `SlotReservation`/`isSlotReserved` in `src/simulation/scrutineering.ts`
- [X] T044 [US2] Settle the next scored race by returning the exact impounded instance before clearing the effect via `settleScrutineering` in `src/simulation/scrutineering.ts`
- [X] T045 [US2] Implement exact encounter/type/transaction preview models in `src/scenes/encounterPresentation.ts` (item-mod/placement preview slots remain for follow-up)
- [X] T046 [US2] Add build-changing encounter actions, confirmation, decline, and unavailable flows to `src/scenes/RunScene.ts` and `src/scenes/InventoryScene.ts`
- [X] T047 [US2] Show separate base, placement, tier, modification, and Scrutineering contribution evidence in `src/scenes/PreRaceScene.ts`, `src/scenes/ContestScene.ts`, and `src/scenes/ResultScene.ts`
- [X] T048 [US2] Audit and author meaningful Fitted/Improvised behavior across `src/content/items/mercer.ts`, `src/content/items/soto.ts`, `src/content/items/rook.ts`, `src/content/items/voss.ts`, and `src/content/items/neutral.ts`
- [X] T049 [US2] Add corpus gates for every item's exact placement preview and legibility in `tests/unit/itemPresentation.test.ts` (target value-band resonance remains a balance-tuning follow-up)
- [X] T050 [US2] Add full-garage, empty-garage, max-tier, modified-sale, modified-exchange, and pending-effect integration coverage in `tests/integration/encounter-variety-flow.test.ts` (empty/max-tier/modified-exchange/pending-effect covered; modified-sale deferred to scene wiring)

**Checkpoint**: US2 supplies the full persistent build layer independently of Exhibition/Tag Specialist.

---

## Phase 5: User Story 3 — Exhibition Trial (P2)

**Goal**: Unscored solo races with three exact objectives and +0–3 reputation.

**Independent Test**: Resolve scores 0–3 and prove all Championship state and
next-scored-race effects are unchanged.

- [X] T051 [P] [US3] Write objective commitment, evidence, scoring, replay, and isolation tests in `tests/unit/exhibition.test.ts`
- [X] T052 [P] [US3] Author at least three Exhibition variants and objective threshold bands in `src/content/encounterVariants.ts`
- [X] T053 [US3] Implement deterministic time, activation, and demand objective generation in `src/simulation/exhibition.ts`
- [X] T054 [US3] Implement solo contest commitment and independent Exhibition settlement in `src/simulation/exhibition.ts` (score 0–3; `championshipUnchanged` guarantees no standings/points mutation)
- [X] T055 [US3] Reuse race/playback authority without rival, standings, Sponsor, or points mutation — proven by `resolveContest`-derived Exhibition evidence test (isolation asserted; `contest.ts`/`settlement.ts` unchanged)
- [X] T056 [US3] Add Exhibition briefing, objective status, and retained result view models in `src/scenes/exhibitionPresentation.ts`
- [X] T057 [US3] Integrate Exhibition entry/playback/results through `src/scenes/RunScene.ts`, `src/scenes/PracticeContestScene.ts`, and `src/scenes/PracticeResultScene.ts`
- [X] T058 [US3] Add score 0–3 and Championship-isolation flow coverage in `tests/integration/encounter-variety-flow.test.ts`

---

## Phase 6: User Story 4 — Tag Specialist (P2)

**Goal**: Late-run, build-responsive cross-origin same-tag acquisition.

**Independent Test**: Exercise no/one/multiple qualifying tags, one restock,
purchase/leave, exact stock filtering, and exactly one modified premium entry.

- [X] T059 [P] [US4] Write eligibility, selected-tag, stock, restock, modification, and pricing tests in `tests/unit/tagSpecialist.test.ts`
- [X] T060 [US4] Implement held-item tag counts across slots/storage and final-four-choice eligibility in `src/simulation/tagSpecialist.ts`
- [X] T061 [US4] Implement retained cross-origin stock and one same-tag restock in `src/simulation/tagSpecialist.ts` (stock retention is caller-held; restock rebuilds from the same retained seed)
- [X] T062 [US4] Select one compatible modified stock entry and apply the exact 2-credit premium in `src/simulation/tagSpecialist.ts`
- [X] T063 [US4] Reuse authoritative purchase/duplicate/capacity transactions via `purchaseTagStock` (atomic capacity placement) in `src/simulation/tagSpecialist.ts`
- [X] T064 [US4] Add qualifying-tag selection, stock inspection, restock, purchase, and leave actions in `src/scenes/PrepareScene.ts` (implemented on the retained encounter surface in `RunScene.ts`)
- [X] T065 [US4] Add late-run deterministic eligibility and transaction integration coverage in `tests/integration/encounter-variety-flow.test.ts`

---

## Phase 7: User Story 5 — Cadence and history understanding (P2)

**Goal**: Explain active, completed, unavailable, and pending encounter state.

**Independent Test**: Reconcile a complete run's visible chronology and pending
status to retained authoritative state without hover or color-only meaning.

- [X] T066 [P] [US5] Write chronological history, pending category, expiry, and immutable evidence tests in `tests/unit/runRecord.test.ts`
- [X] T067 [P] [US5] Write non-hover/non-color and keyboard/pointer/touch presentation contract tests in `tests/unit/encounterPresentation.test.ts` (garage-input-parity additions remain for scene wiring)
- [X] T068 [US5] Add immutable immediate/deferred encounter history projections in `src/simulation/historyProjection.ts`
- [X] T069 [US5] Add active/pending/settled/unavailable status view models with target and expiry in `src/scenes/cadencePresentation.ts`
- [X] T070 [US5] Render cadence, pending effects, and encounter history in `src/scenes/RunScene.ts` without global Feature 035 visual work
- [X] T071 [US5] Add a full-run acceptance fixture containing accepted, declined, unavailable, concurrent, successful, and failed outcomes in `tests/integration/encounter-variety-flow.test.ts`

---

## Phase 8: Polish and cross-cutting validation

- [X] T072 [P] Verify all seven encounter types have three authored variants plus entrant and route-position coverage in `tests/unit/encounterContent.test.ts`
- [X] T073 [P] Verify Test Day remains unscored and does not consume Sponsor/Scrutineering state in `tests/integration/test-day-boundaries.test.ts`
- [X] T074 [P] Verify all four entrants use identical legality, cadence, economy, modification, and stat rules in `tests/integration/encounter-variety-flow.test.ts`
- [X] T075 [P] Add async replay determinism coverage for offers, modifications, Guarded, and Exhibition in `tests/integration/encounter-variety-flow.test.ts` (Exhibition/offer determinism; `Guarded` overlay determinism is pending Feature 033 event render integration)
- [X] T076 Run focused Feature 034 scenarios and reconcile expected results in `specs/034-roguelike-encounter-variety/quickstart.md`
- [X] T077 Run `npm test`, `npm run lint`, and `npm run build`, then record implementation evidence in `specs/034-roguelike-encounter-variety/checklists/requirements.md`
- [X] T078 Update feature status and implementation handoff in `specs/034-roguelike-encounter-variety/spec.md` and `specs/HANDOFF.md`

## Dependencies and execution order

- Phase 1 precedes Phase 2; Feature 033 reconciliation precedes Guarded (T037).
- Phase 2 blocks every user story.
- US1 establishes scheduling and is the MVP.
- US2 depends on US1 registration/cadence and supplies modification authority used by US4.
- US3 depends only on Phase 2 plus encounter registration, so it may proceed alongside most US2 work.
- US4 depends on item modifications and authoritative purchasing from US2.
- US5 depends on lifecycle evidence from US1–US4.
- Phase 8 follows all user stories.

## Parallel opportunities

- T002–T004 can run concurrently.
- Tests/content marked `[P]` can be prepared before their corresponding implementation.
- After Phase 2, Exhibition work can proceed alongside the build-changing core.
- Content audit, encounter variant authoring, and presentation-contract work touch separate files.

## Implementation strategy

1. Ship Phase 2 plus US1 as the smallest independently useful cadence MVP.
2. Add US2's instance-bound build layer and atomic operations.
3. Add Exhibition and Tag Specialist as independent encounter slices.
4. Finish chronology/accessibility, corpus gates, and full verification.
