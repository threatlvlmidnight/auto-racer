# Tasks: Season Structure Growth

**Input**: Design documents from `/specs/017-season-structure-grow/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/season-schedule-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the two user stories in `spec.md`. Widening `RunStage`'s `pvpOrdinal`/`lapCount` types is shared foundational work. US1 (the 12-stage schedule itself) and US2 (confirming every existing ordinal-reading mechanism still resolves correctly) are both P1 and largely independent — US2 is integration-level verification that US1's widened schedule doesn't break anything already planned, so it can only run meaningfully once US1's schedule exists, but it requires no changes to US1's own code.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US2 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Widen `RunStage.pvpOrdinal`/`lapCount`'s types — required before the 12-entry schedule can be authored

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests confirming `RunStage.pvpOrdinal` accepts `1 | 2 | 3 | 4` and `RunStage.lapCount` accepts `10 | 12 | 14 | 16` (type-level and runtime shape), in `tests/unit/run.test.ts`

### Implementation

- [ ] T003 Widen `RunStage.pvpOrdinal` to `1 | 2 | 3 | 4` and `RunStage.lapCount` to `10 | 12 | 14 | 16` in `src/simulation/run.ts` (depends on T002); confirm `choiceOrdinal` requires no change (already `number`, per `research.md` Decision 2)
- [ ] T004 Run `tests/unit/run.test.ts` foundational cases; confirm GREEN (depends on T003)

**Checkpoint**: The type domain is widened; ready to author the 12-entry schedule.

---

## Phase 3: User Story 1 - A season is long enough to feel like a season (Priority: P1)

**Goal**: The run schedule grows from 6 to 12 stages, in the fixed [choice, choice, pvp] × 4 order, ending on a PvP stage, using only the three existing non-PvP encounter types.

**Independent Test**: Play a run from start to finish; confirm it visits 12 stages total in the fixed pattern, and the final stage is PvP.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T005 [P] [US1] Add failing tests for `createStages` returning exactly 12 entries in the fixed [choice, choice, pvp] × 4 order, with `choiceOrdinal` 1-8, `pvpOrdinal` 1-4, and every pvp entry having a defined `lapCount`, in `tests/unit/run.test.ts`
- [ ] T006 [P] [US1] Add failing tests confirming `advanceRun` reaches `"completed"` only after the 12th stage resolves, not at the old 6-stage boundary, in `tests/unit/run.test.ts`
- [ ] T007 [P] [US1] Add failing tests confirming `generateEncounterChoices` still offers only the three existing non-PvP encounter types at every one of the 8 choice stages, in `tests/unit/run.test.ts`
- [ ] T008 [P] [US1] Add failing integration test for a full 12-stage run played start to finish, in `tests/integration/run-flow.test.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Replace `createStages`'s 6-entry definitions array with the 12-entry [choice, choice, pvp] × 4 array in `src/simulation/run.ts` (depends on T005-T007, Foundational)
- [ ] T010 [US1] Update `src/scenes/RunScene.ts`'s shape guard from `run.stages.length === 6` to `run.stages.length === 12` (depends on T009)
- [ ] T011 [US1] Update `tests/fixtures/practice-run-fixtures.ts`'s duplicated 6-entry stage-definitions array to the new 12-entry shape (depends on T009)
- [ ] T012 [US1] Run `tests/unit/run.test.ts` and `tests/integration/run-flow.test.ts`; confirm User Story 1 cases are GREEN (depends on T009-T011)

**Checkpoint**: A run visits all 12 stages in the correct order, ends on a PvP stage, and every downstream call site expecting the old 6-stage shape has been updated.

---

## Phase 4: User Story 2 - Everything that already reads PvP position keeps working (Priority: P1)

**Goal**: Rival difficulty scaling, sponsor next-PvP-stage targeting, and (once implemented) deterministic track selection all resolve correctly at every one of the four widened PvP ordinals, with no change to their own formulas.

**Independent Test**: Resolve a PvP contest at each of the four scheduled PvP stages in a single run; confirm rival scaling and sponsor objective resolution produce a defined, correct result at every ordinal.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T013 [P] [US2] Add failing tests confirming a sponsor contract's `"win-next-race"`/`"target-race-time"` objective, accepted at any of the 8 choice stages, correctly resolves against the next scheduled PvP stage — including the case where it is accepted at the 11th (last) choice stage, immediately before the 12th (final) PvP stage — in `tests/unit/run.test.ts`
- [ ] T014 [P] [US2] Add failing tests confirming a sponsor `"trigger-tagged-items"` objective continues to count events correctly across the longer 12-stage run, in `tests/unit/run.test.ts`
- [ ] T015 [P] [US2] Add failing integration test confirming `012-multi-ghost-contest`'s rival-profile-by-level resolution succeeds for `pvpOrdinal` values `3` and `4`, with no change to that feature's own resolution code, in `tests/integration/run-flow.test.ts` (skip/mark pending if `012`'s implementation has not yet landed, per that feature's own delivery status)

### Implementation for User Story 2

- [ ] T016 [US2] Confirm (by inspection and the tests above) that no code change is needed in `run.ts`'s sponsor next-PvP-stage lookup or `objectiveForKind` — this story is verification, not new implementation (depends on T013-T015, US1)
- [ ] T017 [US2] Run `tests/unit/run.test.ts` and `tests/integration/run-flow.test.ts`; confirm User Story 2 cases are GREEN (depends on T013-T016)

**Checkpoint**: Every existing PvP-ordinal-reading mechanism is confirmed correct at all four ordinals, with zero changes required to any of their own formulas.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing run/encounter behavior and run full validation

- [ ] T018 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing `run.ts`/`RunScene.ts`/`encounters.ts` test remains passing at the new 12-stage schedule
- [ ] T019 Grep the codebase for any remaining hardcoded reference to a 6-stage schedule (`.length === 6`, `stages[5]`, `pvpOrdinal: 2` as a terminal assumption) beyond the two already identified in `plan.md`, and update any found
- [ ] T020 Run the local Vite browser through `quickstart.md` Scenarios A-B; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via a full 12-stage run
- **Phase 4 - US2**: Depends on Foundational and on US1's 12-entry schedule existing (T009) — it verifies behavior *against* that schedule, so it cannot run first, but requires no changes to US1's own code
- **Phase 5 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the 12-stage schedule's shape and completion boundary
- **US2 (P1)**: Foundational + US1's schedule existing; independently validates cross-feature correctness, but is verification of US1's output, not a parallel implementation track

### Strict Test-First Order

- T002 MUST be RED before T003 widens the `pvpOrdinal`/`lapCount` types
- T005-T008 MUST be RED before T009-T011 replace the schedule array and update dependent call sites
- T013-T015 MUST be RED before T016 confirms no further code change is needed

---

## Parallel Opportunities

### Foundational

```text
T002: RunStage type-widening tests in tests/unit/run.test.ts
```

Single task, no parallelism needed at this scale.

### US1 test tasks are parallel with each other

```text
T005: createStages shape tests
T006: advanceRun completion-boundary tests
T007: generateEncounterChoices type-set tests
T008: full-run integration test
```

All four touch `tests/unit/run.test.ts`/`tests/integration/run-flow.test.ts`
and should be sequenced or coordinated if worked simultaneously by
different people, since they land in the same files.

### US2 depends on US1's schedule, not on US1's tests

Once T009 lands, US2's own test-writing (T013-T015) can proceed
independently of the rest of US1's cleanup tasks (T010-T012).

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T012.
3. Stop and validate a full 12-stage run independently before adding
   cross-feature ordinal verification.

US1 is the MVP: the season is actually longer, in the correct shape,
before anything else is checked against it.

### Incremental Delivery

1. **Foundational**: Widened `pvpOrdinal`/`lapCount` types, no schedule
   change yet.
2. **US1**: The 12-stage schedule itself, with all dependent call sites
   updated.
3. **US2**: Confirmation that every existing ordinal-reading mechanism
   (rival scaling, sponsor lookup, track selection) still works
   correctly at the new length.
4. **Polish**: Full regression pass, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test
  task; implementation begins only after the listed RED checks fail for
  the expected missing behavior.
- This feature deliberately introduces no new encounter type — no task
  here should add a value to `EncounterType`/`NonPvpEncounterType`
  (FR-004).
- The lap-count progression (10, 12, 14, 16) authored in T009 is a
  planning default per `research.md` Decision 3, not a locked balance
  decision — a future tuning pass may change these four numbers without
  touching this feature's structural code.
- T015's `012-multi-ghost-contest` integration test should be marked
  pending/skipped rather than deleted if that feature's own
  implementation has not yet landed when this feature is implemented —
  the contract (FR-005) still applies and must be verified once both
  are built.
