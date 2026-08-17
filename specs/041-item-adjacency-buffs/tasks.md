# Tasks: Item Adjacency Buffs

**Input**: Design documents from `/specs/041-item-adjacency-buffs/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/adjacency-contract.md`, and `quickstart.md`

**Implementation status**: Ready for coding handoff. Nothing in this file is
implemented yet.

**Agent boundary**: Every task except T043 is `[CODE-DEEPSEEK]`. T043 is
`[MANUAL-FRONTIER-OR-OWNER]` and must remain open after the coding handoff.
There are no image-generation, asset-cropping, screenshot, or audio tasks.

**Testing**: Simulation, validation, lock, and projection tasks are test-first.
The coding agent must create the listed failing test before its paired
implementation and retain existing regressions.

## Phase 1: Setup and fixtures

**Purpose**: Establish deterministic examples and content boundaries before
adding production authority.

- [ ] T001 [CODE-DEEPSEEK] Create builders for empty, end-slot, inner-slot,
  mismatched, competing-source, mutual-source, reordered-slot, storage, tiered,
  and maximum-density builds in `tests/fixtures/adjacency-fixtures.ts`.
- [ ] T002 [P] [CODE-DEEPSEEK] Add a catalog expectation for exactly one initial
  adjacency source per origin, both predicate kinds, and all four normalized
  physical stats in `tests/unit/items.test.ts`.
- [ ] T003 [P] [CODE-DEEPSEEK] Add failing type/content validation tests for
  duplicate/empty clause IDs, invalid predicates/stats, zero/non-finite values,
  and empty descriptions in `tests/unit/adjacency.test.ts`.
- [ ] T004 [P] [CODE-DEEPSEEK] Confirm the command matrix and manual ownership
  boundary remain accurate in `specs/041-item-adjacency-buffs/quickstart.md`;
  do not execute or check manual QA items.

---

## Phase 2: Foundational graph and resolver

**Purpose**: Build the single framework-free authority required by every story.

**Critical**: Complete this phase before stat, garage, or scene integration.

- [ ] T005 [CODE-DEEPSEEK] Add `AdjacencyClause`, rules-version, graph, link,
  contribution, totals, resolution, preview-diff, and typed failure definitions
  to `src/simulation/types.ts` exactly within the closed V1 vocabulary.
- [ ] T006 [P] [CODE-DEEPSEEK] Add failing tests that graph derivation follows
  `VehicleDefinition.slots`, creates consecutive edges, ignores runtime slot
  array order, excludes storage, and rejects topology mismatches in
  `tests/unit/adjacency.test.ts`.
- [ ] T007 [CODE-DEEPSEEK] Implement `adjacencyGraphFor` and clause validation in
  new `src/simulation/adjacency.ts`, using stable slot IDs and typed all-or-
  nothing failures.
- [ ] T008 [P] [CODE-DEEPSEEK] Add failing resolution tests for empty,
  mismatched, one-neighbor, two-neighbor, two-source, mutual-source, and full
  density cases, including canonical output ordering, in
  `tests/unit/adjacency.test.ts`.
- [ ] T009 [P] [CODE-DEEPSEEK] Add a 1,000-permutation evaluation-order test that
  produces deep-equal links, contributions, and totals without mutating the
  input build in `tests/unit/adjacency.test.ts`.
- [ ] T010 [CODE-DEEPSEEK] Implement `resolveAdjacency` and target-total helpers
  in `src/simulation/adjacency.ts`: additive snapshot evaluation, active and
  inactive directed links, no recursion, and deterministic ordering.
- [ ] T011 [P] [CODE-DEEPSEEK] Add failing tier-composition tests proving clause
  values are 100%/115%/130% at tiers 1/2/3 and unaffected by Buff, Synergy,
  installation, modification, Scrutineering, or setup inputs in
  `tests/unit/tiering.test.ts` and `tests/unit/adjacency.test.ts`.
- [ ] T012 [CODE-DEEPSEEK] Extend the existing tier-scaling path in
  `src/simulation/tiering.ts` so cloned tiered source definitions scale authored
  adjacency points once while every other amplifier remains excluded.
- [ ] T013 [P] [CODE-DEEPSEEK] Add failing validator tests for unknown versions,
  malformed/duplicated links, forged totals, missing evidence, and non-finite
  serialized values in `tests/unit/adjacency.test.ts`.
- [ ] T014 [CODE-DEEPSEEK] Implement `validateAdjacencyResolution` in
  `src/simulation/adjacency.ts` by recomputing semantic evidence and rejecting
  incompatible claims rather than repairing or guessing.

**Checkpoint**: One pure resolver owns all adjacency meaning and passes the
complete fixture corpus without any presentation dependency.

---

## Phase 3: User Story 1 — Build around meaningful neighbors (P1 MVP)

**Goal**: Placement changes normalized vehicle stats exactly as the authored
neighbor clauses promise.

**Independent Test**: Move one source across empty, qualifying, and mismatching
neighbors; only graph-implied target contributions change, and reordered build
serialization produces the same current stats and contest result.

- [ ] T015 [US1] [CODE-DEEPSEEK] Add failing tests that adjacency canonical
  points enter each target item's current-build stat ledger exactly once and
  remain separate from existing percentage amplifiers in
  `tests/unit/laps.test.ts`.
- [ ] T016 [US1] [CODE-DEEPSEEK] Integrate resolved target totals into
  `resolveCurrentBuildPhysicalStats`, per-lap physical resolution, and
  target-attributed `ItemPhysicalContributionEvidence` in
  `src/simulation/laps.ts` without mutating item definitions.
- [ ] T017 [P] [US1] [CODE-DEEPSEEK] Add failing no-feature regression tests
  proving builds with no adjacency clauses retain deep-equal current stats, lap
  evidence, and contest outputs in `tests/unit/laps.test.ts` and
  `tests/unit/contest.test.ts`.
- [ ] T018 [P] [US1] [CODE-DEEPSEEK] Add failing composition cases covering
  Fitted/Flexible/Improvised, Adapted Mount, stat graft, twin-tuned,
  Scrutineering, Buff, Synergy, and configurable setup in
  `tests/unit/laps.test.ts`.
- [ ] T019 [US1] [CODE-DEEPSEEK] Reconcile the canonical ledger composition in
  `src/simulation/laps.ts` and `src/simulation/liveItemInstances.ts` so source
  instance IDs survive projection and no existing layer scales adjacency.
- [ ] T020 [P] [US1] [CODE-DEEPSEEK] Add the four approved `+1` tier-1 clauses
  and exact player-facing copy to `src/content/items/mercer.ts`,
  `src/content/items/soto.ts`, `src/content/items/rook.ts`, and
  `src/content/items/voss.ts`; do not add or modify image assets.
- [ ] T021 [US1] [CODE-DEEPSEEK] Complete catalog validation for the four-item
  slice and repair only clause-data failures in `src/simulation/adjacency.ts`
  and `tests/unit/items.test.ts`.

**Checkpoint**: The four playable items create deterministic, normalized,
target-attributed build value with no regression to other items.

---

## Phase 4: User Story 2 — Understand adjacency before committing (P1)

**Goal**: Every acquisition and placement surface shows truthful static clauses
and exact before/after active-link changes for all input modes.

**Independent Test**: Preview move, swap, replacement, storage install/removal,
and tier change commands; successful commit deep-equals preview `after`, and
source/target/state/value remain available without hover or color.

- [ ] T022 [US2] [CODE-DEEPSEEK] Add failing projection tests for legal move,
  swap, confirmation-pending replace/evict, storage transitions, stale input,
  and preview non-mutation in `tests/unit/garage.test.ts`.
- [ ] T023 [US2] [CODE-DEEPSEEK] Extract/reuse a non-mutating prospective-build
  projection from garage commit semantics and implement
  `previewAdjacencyForGarageCommand` in `src/simulation/garage.ts` and
  `src/simulation/adjacency.ts` without bypassing commit confirmation.
- [ ] T024 [P] [US2] [CODE-DEEPSEEK] Add failing diff tests for newly active,
  broken, changed, unchanged-active, and unrelated-link preservation in
  `tests/unit/adjacency.test.ts`.
- [ ] T025 [US2] [CODE-DEEPSEEK] Implement stable link-identity before/after
  diffing in `src/simulation/adjacency.ts` and prove committed resolution
  deep-equals preview `after`.
- [ ] T026 [P] [US2] [CODE-DEEPSEEK] Add failing pure presentation tests for
  offered, stored, end-slot, inner-slot, mismatch, tiered, and dense builds,
  including complete non-color accessibility labels, in
  `tests/unit/adjacencyPresentation.test.ts`.
- [ ] T027 [US2] [CODE-DEEPSEEK] Create `src/scenes/adjacencyPresentation.ts`
  with static clause, installed-link, placement-diff, aggregate-delta, badge,
  connector, and accessibility models derived only from authoritative
  resolution/preview data.
- [ ] T028 [US2] [CODE-DEEPSEEK] Extend `src/scenes/itemPresentation.ts` and
  `src/scenes/garagePresentation.ts` so compact cards and persistent inspectors
  disclose adjacency clauses and current links without parsing description
  text or recomputing mechanics.
- [ ] T029 [US2] [CODE-DEEPSEEK] Integrate the shared models into pointer,
  keyboard, and touch-equivalent selection/placement paths in
  `src/scenes/PrepareScene.ts`, using code-native rows/badges/connectors only.
- [ ] T030 [P] [US2] [CODE-DEEPSEEK] Add integration assertions for input-mode
  parity, no-hover discoverability, selected/focused state, replacement
  confirmation, and preview/commit parity in
  `tests/integration/adjacency-flow.test.ts`.

**Checkpoint**: The player can predict every gained or broken adjacency link
before any inventory mutation is committed.

---

## Phase 5: User Story 3 — Trust stable, bounded resolution (P1)

**Goal**: Test Day and scored races lock, validate, and consume the same
versioned adjacency authority, with no playback recomputation.

**Independent Test**: Lock identical build/setup/track inputs into Test Day and
a scored contest; adjacency evidence and result math deep-equal, and changing
playback speed or skipping cannot affect either.

- [ ] T031 [US3] [CODE-DEEPSEEK] Add failing Test Day/scored lock parity and
  unknown-version rejection tests in `tests/integration/practice.test.ts` and
  `tests/integration/pre-race-setup.test.ts`.
- [ ] T032 [US3] [CODE-DEEPSEEK] Retain and validate one adjacency resolution at
  the existing immutable build-lock boundaries in `src/simulation/practice.ts`
  and `src/simulation/raceSetup.ts`, without introducing scene authority.
- [ ] T033 [US3] [CODE-DEEPSEEK] Propagate locked adjacency evidence through
  contest/result construction in `src/simulation/contest.ts` and shared types,
  preserving target instance/slot attribution.
- [ ] T034 [P] [US3] [CODE-DEEPSEEK] Add integration tests proving runtime slot
  reordering, playback 1×/2×, pause, skip, and Results transition cannot change
  adjacency evidence or contest output in
  `tests/integration/adjacency-flow.test.ts`.
- [ ] T035 [US3] [CODE-DEEPSEEK] Remove or guard any accidental scene-time
  resolver call surfaced by T034; `src/scenes/ContestScene.ts` and
  `src/scenes/TestDayScene.ts` may consume retained presentation models only.
- [ ] T036 [P] [US3] [CODE-DEEPSEEK] Add a static-source inspection assertion
  (or equivalent import-boundary test) that `src/simulation/adjacency.ts` has no
  Phaser imports, random/time inputs, or scene dependency in
  `tests/unit/adjacency.test.ts`.

**Checkpoint**: Adjacency is immutable contest evidence, not a playback effect.

---

## Phase 6: User Story 4 — Inspect post-decision evidence (P2)

**Goal**: Pre-race, Test Day, race, and Results identify the exact retained
source, target, rule, and normalized point value whenever adjacency contributes.

**Independent Test**: Select the affected target item on each surface and
reconcile its adjacency rows to the locked aggregate without invoking the
resolver from presentation.

- [ ] T037 [US4] [CODE-DEEPSEEK] Add failing presentation tests for retained
  source/target/clause/stat/tier/value rows and inactive-clause omission from
  outcome contribution claims in `tests/unit/adjacencyPresentation.test.ts`.
- [ ] T038 [US4] [CODE-DEEPSEEK] Add retained-evidence adapters to
  `src/scenes/adjacencyPresentation.ts` and `src/scenes/itemPresentation.ts`,
  keeping static authored clauses distinct from active outcome receipts.
- [ ] T039 [US4] [CODE-DEEPSEEK] Integrate read-only adjacency rows into
  `src/scenes/PreRaceScene.ts`, `src/scenes/TestDayScene.ts`,
  `src/scenes/ContestScene.ts`, and `src/scenes/ResultScene.ts` using existing
  selected-item inspectors and without adding an always-visible log.
- [ ] T040 [P] [US4] [CODE-DEEPSEEK] Add end-to-end evidence reconciliation and
  absent/inactive cases in `tests/integration/adjacency-flow.test.ts` and
  `tests/integration/result-scene.test.ts`.

---

## Phase 7: Automated gates and separate manual acceptance

- [ ] T041 [P] [CODE-DEEPSEEK] Run all focused commands in `quickstart.md`, fix
  only Feature 041 regressions, and record exact automated outcomes in
  `specs/041-item-adjacency-buffs/quickstart.md`.
- [ ] T042 [CODE-DEEPSEEK] Run `npm test`, `npm run lint`, `npm run typecheck`,
  and `npm run build:pages`; confirm no image/audio assets or screenshot outputs
  were added and mark Feature 041 code-complete but manual-QA-pending.
- [ ] T043 [MANUAL-FRONTIER-OR-OWNER] Execute the manual browser matrix in
  `specs/041-item-adjacency-buffs/quickstart.md` and record dated qualitative
  findings. DeepSeek MUST NOT execute, check off, or claim completion of this
  task.

## Dependencies and execution order

- Phase 1 can start immediately.
- Phase 2 blocks all production integration.
- Phase 3 establishes outcome authority before Phase 4 exposes previews.
- Phase 4 must finish before the player-facing lock surfaces in Phases 5–6 are
  considered complete.
- Phase 5 supplies retained evidence consumed by Phase 6.
- T041–T042 follow all coding tasks. T043 follows automated success and remains
  outside the DeepSeek handoff.
- Feature 042 may begin after Feature 041's automated gates; it does not need to
  wait for Feature 041 art because Feature 041 creates no art.
- Feature 037 item artwork should consume the settled Feature 041/042 catalog,
  not block this mechanic.

## Parallel opportunities

- T002–T004 can run in parallel after fixture conventions are known.
- Test authoring tasks marked `[P]` may proceed against separate files while the
  preceding production task is implemented.
- The four content edits in T020 are independent files but remain one balanced
  content checkpoint.
- Presentation unit tests and lock integration tests may proceed in parallel
  after the Phase 2 types are stable.

## Implementation handoff rule

The coding agent continues through T042 in one implementation run unless a real
code/data blocker is encountered. It stops with T043 visibly open. Passing
automated tests is code completion, not final visual acceptance.
