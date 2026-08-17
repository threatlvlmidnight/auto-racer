# Tasks: Item Pool Expansion and Loot

**Input**: Design documents in `/specs/042-item-pool-expansion-loot/`  
**Prerequisites**: `spec.md`, `research.md`, `catalog-plan.md`, `data-model.md`,
`contracts/`, `plan.md`, and `quickstart.md`  
**Implementation status**: Ready for coding handoff. Nothing here is implemented.  
**Agent boundary**: T001–T058 are `[CODE-DEEPSEEK]`. T059 is
`[MANUAL-FRONTIER-OR-OWNER]`. No task authorizes asset generation, screenshot
capture/comparison, listening review, or qualitative visual approval.

## Phase 1 — Fixtures, types, and catalog truth foundation

- [ ] T001 [P] [CODE-DEEPSEEK] Add deterministic baseline/expansion/offer/lap-
  length fixtures matching `catalog-plan.md` in
  `tests/fixtures/item-catalog-fixtures.ts`.
- [ ] T002 [P] [CODE-DEEPSEEK] Add failing catalog-count, dead-card, tag-role,
  capability, copy-truth, rarity, price, category, installation, mechanic, and
  reachable-pool tests in `tests/unit/itemCatalogAudit.test.ts`.
- [ ] T003 [CODE-DEEPSEEK] Extend item/catalog types in
  `src/simulation/types.ts` with typed item kind, tag roles, economy effects,
  lap-window effects, normalized installation behavior, and Loot capability;
  do not add item-ID branches.
- [ ] T004 [P] [CODE-DEEPSEEK] Author the stable 19-tag classification and
  player-facing role descriptions from `catalog-plan.md` in
  `src/content/itemTagRoles.ts`.
- [ ] T005 [CODE-DEEPSEEK] Create pure catalog validation/report projection in
  `src/simulation/itemCatalogAudit.ts`, including typed failures and stable
  deterministic ordering.
- [ ] T006 [CODE-DEEPSEEK] Wire complete catalog validation into existing item
  validation/tests so unintended effectless active cards and mechanically
  invalid Loot fail before offers can use them.

**Checkpoint**: The existing catalog is measurable, and known truth failures
remain red until explicitly repaired.

## Phase 2 — Deterministic rarity and unique offers

- [ ] T007 [P] [CODE-DEEPSEEK] Add failing weighted-without-replacement tests for
  4/2/1 rarity, identity weighting, seed determinism, unique IDs, and exhausted
  pools in `tests/unit/draft.test.ts`.
- [ ] T008 [CODE-DEEPSEEK] Implement one pure weighted-without-replacement draw
  helper in `src/simulation/draft.ts`, consuming a documented fixed RNG pattern
  and returning typed exhaustion evidence.
- [ ] T009 [P] [CODE-DEEPSEEK] Add failing multi-card uniqueness tests for every
  shop/draft/event offer path in `tests/unit/encounters.test.ts` and
  `tests/integration/item-expansion-flow.test.ts`.
- [ ] T010 [CODE-DEEPSEEK] Migrate multi-card offer generation in
  `src/simulation/encounters.ts`, `src/simulation/encounterOffers.ts`, and any
  shared rival/acquisition callers to the authoritative sampler without changing
  one-card semantics unintentionally.
- [ ] T011 [CODE-DEEPSEEK] Project actual rarity/availability and exhausted-pool
  facts through existing card/offer presentation in
  `src/scenes/itemPresentation.ts` and `src/scenes/encounterPresentation.ts`.

**Checkpoint**: Rarity affects availability and visible offers cannot repeat a
definition ID.

## Phase 3 — Reusable mechanic primitives and baseline remediation (US1)

**Goal**: All 70 baseline offers are mechanically real and truthfully described.

- [ ] T012 [P] [US1] [CODE-DEEPSEEK] Add failing multiplicative Buff tier tests
  and 8/10/12/14/16-lap cooldown-stack fixtures in
  `tests/unit/itemMechanics.test.ts` and `tests/unit/tiering.test.ts`.
- [ ] T013 [US1] [CODE-DEEPSEEK] Replace additive Buff percentage-point tiering
  with shared 100%/115%/130% multiplication in the existing tier authority;
  preserve direct-stat and Feature 041 adjacency contracts.
- [ ] T014 [P] [US1] [CODE-DEEPSEEK] Add failing tests for at-least-other-count,
  distinct-authored-tag-count, early/final-quarter lap windows, and canonical
  installation behavior in `tests/unit/itemMechanics.test.ts`.
- [ ] T015 [US1] [CODE-DEEPSEEK] Create reusable pure mechanic resolution and
  validation in `src/simulation/itemMechanics.ts`, extending existing synergy,
  lap, and installation authorities rather than parsing card copy.
- [ ] T016 [P] [US1] [CODE-DEEPSEEK] Add failing typed economy tests for always,
  sold-item-tag, and sold-item-developed conditions and tier scaling in
  `tests/unit/economyItems.test.ts`.
- [ ] T017 [US1] [CODE-DEEPSEEK] Move current name-specific economy behavior
  from `src/simulation/garage.ts` / `src/simulation/run.ts` into typed definition
  data and one reusable resolver, preserving existing payouts.
- [ ] T018 [P] [US1] [CODE-DEEPSEEK] Add per-item failing fixtures for the 12
  locked retrofits and both dead definitions in
  `tests/unit/itemCatalogAudit.test.ts` and `tests/unit/items.test.ts`.
- [ ] T019 [US1] [CODE-DEEPSEEK] Apply the four Mercer retrofits from
  `catalog-plan.md` in `src/content/items/mercer.ts`, including 6%/5% stacking,
  typed Ledger Chit economy, and normalized Axle installation behavior.
- [ ] T020 [P] [US1] [CODE-DEEPSEEK] Apply the three Soto retrofits in
  `src/content/items/soto.ts`, including 6%/5% stacking, meaningful Crankset
  installation behavior, and non-punitive Frame threshold.
- [ ] T021 [P] [US1] [CODE-DEEPSEEK] Apply the two Rook retrofits in
  `src/content/items/rook.ts`, including non-punitive Test Mounts threshold and
  meaningful Rotary Aero Engine installation behavior.
- [ ] T022 [P] [US1] [CODE-DEEPSEEK] Apply the three Voss retrofits in
  `src/content/items/voss.ts`, including repaired Bookmaker payoff, 6% Tank
  stacking, and meaningful Ballast installation behavior.
- [ ] T023 [US1] [CODE-DEEPSEEK] Repair all audit-proven compact/full tag,
  target, installed-versus-held, exact-shutoff, cooldown, economy, tier, and
  installation copy mismatches in typed data/presentation; record every extra
  repair in `catalog-plan.md` without opportunistic rebalance.
- [ ] T024 [US1] [CODE-DEEPSEEK] Pass the complete 70-definition baseline truth
  audit with zero dead active offers and zero behavior/presentation mismatch.

**Checkpoint**: Existing players can trust every baseline offer before new
content enters any pool.

## Phase 4 — Eight active-item expansion (US2)

**Goal**: Add the frozen two-per-origin active roster with distinct roles.

- [ ] T025 [P] [US2] [CODE-DEEPSEEK] Add failing definition, role, tier,
  installation, pool, and non-redundancy fixtures for all eight stable IDs in
  `tests/unit/itemCatalogAudit.test.ts` and `tests/unit/items.test.ts`.
- [ ] T026 [P] [US2] [CODE-DEEPSEEK] Author Master's Service Record and
  Refurbisher's Tool Roll in `src/content/items/mercer.ts` using only reusable
  typed mechanics; do not add or modify image assets.
- [ ] T027 [P] [US2] [CODE-DEEPSEEK] Author Pacer's Lap Bell and Final Sprint
  Tonic in `src/content/items/soto.ts`; retain exact values in normalized-point
  evidence and do not add image assets.
- [ ] T028 [P] [US2] [CODE-DEEPSEEK] Author Thermal Relief Valve and Wind-Tunnel
  Notebook in `src/content/items/rook.ts`; do not add image assets.
- [ ] T029 [P] [US2] [CODE-DEEPSEEK] Author Forged Inspection Seal and Concealed
  Reserve Tank in `src/content/items/voss.ts`; exact-count shutoff must be
  visible and no image assets may be added.
- [ ] T030 [US2] [CODE-DEEPSEEK] Integrate new threshold/lap-window/typed economy
  effects into current-build, per-lap, Test Day, scored contest, and evidence
  paths in `src/simulation/laps.ts`, `src/simulation/practice.ts`, and
  `src/simulation/contest.ts`.
- [ ] T031 [P] [US2] [CODE-DEEPSEEK] Add pure compact/full presentation tests for
  every new mechanic, active/inactive state, live count, lap window, tradeoff,
  and effective tier value in `tests/unit/itemPresentation.test.ts`.
- [ ] T032 [US2] [CODE-DEEPSEEK] Extend `src/scenes/itemPresentation.ts` and
  existing inspectors so new mechanics are fully disclosed from typed data and
  do not rely on hover, color, or prose parsing.

**Checkpoint**: The active catalog contains exactly eight new, mechanically
justified definitions and three distinguishable directions per origin.

## Phase 5 — Loot definitions and neutral acquisition (US3)

**Goal**: Loot occupies normal capacity, is completely inert, and appears only
through an explicit bounded neutral source.

- [ ] T033 [P] [US3] [CODE-DEEPSEEK] Add failing four-definition schema,
  category, tier, inertness, pool-exclusion, and normal-capacity tests in
  `tests/unit/itemPools.test.ts`, `tests/unit/items.test.ts`, and
  `tests/unit/itemCatalogAudit.test.ts`.
- [ ] T034 [US3] [CODE-DEEPSEEK] Author the four stable Loot definitions in
  `src/content/items/loot.ts` and export `LOOT_ITEMS` separately from
  `NEUTRAL_ITEMS`; do not create, select, or modify images.
- [ ] T035 [US3] [CODE-DEEPSEEK] Extend item-instance creation/cloning/validation
  in `src/simulation/itemInstances.ts` and `src/simulation/types.ts` for an empty
  immutable permanent-Loot ledger and known version.
- [ ] T036 [P] [US3] [CODE-DEEPSEEK] Add deep-equality tests proving held Loot
  affects no stats, laps, Buff, Synergy, adjacency, installation behavior,
  setup, economy, sponsor, Tag Specialist, modification, Scrutineering, Rebuild,
  or contest events in `tests/unit/loot.test.ts` and
  `tests/integration/loot-acquisition-flow.test.ts`.
- [ ] T037 [US3] [CODE-DEEPSEEK] Enforce all Loot exclusion guards in the
  authoritative simulation/acquisition modules without checking names or IDs.
- [ ] T038 [P] [US3] [CODE-DEEPSEEK] Add failing offer tests proving normal
  entrant-origin shops/drafts contain zero Loot and explicit neutral offers
  contain three distinct definitions with at most one Loot in
  `tests/integration/loot-acquisition-flow.test.ts`.
- [ ] T039 [US3] [CODE-DEEPSEEK] Add an authored neutral supplier/cache variant
  and typed `lootEligible` offer policy in `src/content/encounterVariants.ts`,
  `src/simulation/encounterOffers.ts`, `src/simulation/encounterCadence.ts`, and
  `src/simulation/encounters.ts`; ordinary stock must be shared neutral only.
- [ ] T040 [US3] [CODE-DEEPSEEK] Add code-native neutral-source and Loot card
  presentation through existing scenes, including `LOOT`, inertness, capacity,
  stat, tier magnitude, and credit rules; do not add art.

**Checkpoint**: Loot is playable at a real capacity cost but cannot dilute or
affect any normal character shop or contest while held.

## Phase 6 — Deterministic preview and atomic sale (US4/US5)

**Goal**: Preview and settlement choose the same full-fit leftmost target and
commit bonus, source removal, credits, history, receipt, and Undo together.

- [ ] T041 [P] [US4] [CODE-DEEPSEEK] Add failing target-order/applicability tests
  for authored slots, storage, Loot exclusion, authored contribution,
  modification contribution, prior-Loot-only contribution, partial cap, full
  cap, moves, and runtime-array permutations in `tests/unit/loot.test.ts`.
- [ ] T042 [US4] [CODE-DEEPSEEK] Create pure target resolver, preview,
  fingerprint, validator, and typed failures in `src/simulation/loot.ts` per
  `contracts/loot-sale-contract.md`.
- [ ] T043 [P] [US4] [CODE-DEEPSEEK] Add failing pure presentation tests for
  exact source/target/location/stat/magnitude/cap/base credits/economy/final
  credits and every blocking reason in `tests/unit/lootPresentation.test.ts`.
- [ ] T044 [US4] [CODE-DEEPSEEK] Create `src/scenes/lootPresentation.ts` and
  integrate preview/confirmation models into existing item and supplier/garage
  surfaces without allowing manual target override.
- [ ] T045 [P] [US5] [CODE-DEEPSEEK] Add failing valid, stale, duplicate,
  unknown-version, forged-receipt, and all-or-nothing sale tests in
  `tests/integration/loot-sale-flow.test.ts`.
- [ ] T046 [US5] [CODE-DEEPSEEK] Extend `src/simulation/garage.ts` and
  `src/simulation/encounters.ts` with the versioned Loot sale command and atomic
  receipt, reusing normal half-price/economy/credit transaction authority.
- [ ] T047 [P] [US5] [CODE-DEEPSEEK] Add failing immediate Undo fixtures for
  exact source location, target prior ledger, credits, credit transaction,
  command consumption, history, blocked restoration, and later Undo
  invalidation in `tests/integration/loot-sale-flow.test.ts`.
- [ ] T048 [US5] [CODE-DEEPSEEK] Extend the discriminated sale Undo path in
  `src/simulation/garage.ts`, `src/simulation/encounters.ts`, and
  `src/simulation/run.ts` so Loot Undo restores all fields atomically or none.
- [ ] T049 [P] [US5] [CODE-DEEPSEEK] Add lifecycle tests for move, storage,
  tier-up, modification replace, identity-preserving transform, identity-
  replacing rebuild, sale, surrender, and removal in
  `tests/unit/itemInstances.test.ts` and
  `tests/integration/loot-sale-flow.test.ts`.
- [ ] T050 [US5] [CODE-DEEPSEEK] Preserve/remove the permanent ledger according
  to stable instance identity in `src/simulation/itemInstances.ts`,
  `src/simulation/liveItemInstances.ts`, and encounter transaction paths.

**Checkpoint**: Loot value cannot duplicate, drift to another item, waste tier
points, or partially settle.

## Phase 7 — Normalized outcome and retained evidence (US5/US6)

- [ ] T051 [P] [US5] [CODE-DEEPSEEK] Add failing normalized-layer tests proving
  Loot points add once and are never scaled by tier, Buff, Synergy, adjacency,
  installation, modification, setup, or Scrutineering in
  `tests/unit/statNormalization.test.ts` and `tests/unit/laps.test.ts`.
- [ ] T052 [US5] [CODE-DEEPSEEK] Add the separate `loot` layer to
  `src/simulation/statNormalization.ts` and reconcile source-attributed current
  build/per-lap evidence in `src/simulation/laps.ts`.
- [ ] T053 [P] [US6] [CODE-DEEPSEEK] Add Test Day/scored contest/result parity,
  unknown-version, missing-identity, non-finite, and forged-evidence tests in
  `tests/integration/practice.test.ts` and `tests/integration/result-scene.test.ts`.
- [ ] T054 [US6] [CODE-DEEPSEEK] Retain and validate permanent Loot evidence at
  existing build-lock/result boundaries in `src/simulation/practice.ts`,
  `src/simulation/contest.ts`, and shared result types; scenes consume retained
  data and never settle or retarget Loot.
- [ ] T055 [US6] [CODE-DEEPSEEK] Add read-only Loot attribution rows to current
  build, Pre-Race, Test Day, and Results via shared presentation projections;
  do not add an always-visible race log.

## Phase 8 — Audit, automated gates, and separate manual acceptance

- [ ] T056 [P] [US6] [CODE-DEEPSEEK] Generate the deterministic catalog,
  entrant-access, offer, duplicate/tier-attainment, and lap-length balance
  reports in `tests/unit/itemCatalogAudit.test.ts`; reconcile all thresholds in
  `contracts/catalog-and-offer-contract.md` without weakening failed bounds.
- [ ] T057 [CODE-DEEPSEEK] Run every focused command in `quickstart.md`, repair
  only Feature 042 regressions, and record exact command/count/corpus/balance
  outcomes in `quickstart.md`.
- [ ] T058 [CODE-DEEPSEEK] Run `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`, and `npm run build:pages`; confirm no image/audio/screenshot
  outputs changed and mark code complete but manual-QA pending.
- [ ] T059 [MANUAL-FRONTIER-OR-OWNER] Execute the manual browser matrix in
  `quickstart.md` and record dated findings. DeepSeek MUST NOT execute, check
  off, or claim completion of this task.

## Dependencies and execution order

- Phase 1 blocks all content changes because it establishes the truth contract.
- Phase 2 blocks new offer integration.
- Phase 3 must pass before Phase 4 expands the catalog.
- Phase 4 locks the active roster before Feature 037 production art.
- Phase 5 establishes typed inert Loot and its only acquisition lane before any
  sale logic exists.
- Phase 6 owns atomic transaction/Undo authority and blocks outcome integration.
- Phase 7 owns stat/result parity and retained evidence.
- T056–T058 follow all coding work. T059 follows automated success and remains
  outside the DeepSeek handoff.
- Feature 041 automated implementation must land/rebase first because Feature
  042 audits and composes its four adjacency source items.

## Parallel opportunities

- T001/T002/T004 can run in parallel.
- Within Phase 3, tests T012/T014/T016/T018 can be prepared in parallel; content
  files T019–T022 can be edited in parallel after shared mechanics compile.
- T026–T029 are independent origin content files after T025 fixtures lock.
- Presentation tests T043 and transaction tests T045/T047 can be prepared in
  parallel after the preview contract is stable.
- T051 and T053 may be prepared in parallel after the receipt/ledger model lands.
