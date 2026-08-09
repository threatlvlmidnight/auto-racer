# Tasks: Multi-Ghost Contest

**Input**: Design documents from `/specs/012-multi-ghost-contest/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/multi-ghost-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice (every prior feature's `plan.md`, and this feature's own Technical Context) is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. Foundational rival-content/build-resolution work is shared; the N-car contest result (US1) is the MVP; standings presentation (US2) and level-scaling (US3) build incrementally on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US3 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the rival profile catalog and deterministic build-resolution required by every user story

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing catalog tests for exactly 7 rival profiles, unique IDs, and every `vehicleId` resolving to an existing vehicle definition in `tests/unit/rivals.test.ts`
- [ ] T003 [P] Add failing `resolveRivalBuild` tests for determinism (identical `(profile, level, seed)` -> deeply equal build), reuse of `createEmptyVehicleBuild`/`drawItem` with no second selection mechanism, and normal Fitted/Flexible/Improvised resolution on the returned build in `tests/unit/rivals.test.ts`

### Implementation

- [ ] T004 Define `RivalProfile`, `CarResult`, and `NCarContestResult` types in `src/simulation/types.ts` (depends on T002-T003)
- [ ] T005 Author 7 rival profiles (id, name, color, `vehicleId` reusing an existing topology, `levelScaling` rule) in `src/content/rivals.ts` (depends on T004)
- [ ] T006 Implement `resolveRivalBuild(profile, level, seed)` reusing `createEmptyVehicleBuild` and the existing `drawItem` deterministic draw from `src/simulation/draft.ts` in `src/simulation/rivals.ts` (depends on T004-T005)
- [ ] T007 Run `tests/unit/rivals.test.ts`; confirm catalog and build-resolution cases are GREEN (depends on T004-T006)

**Checkpoint**: 7 rival profiles exist and resolve deterministically into real, inspectable `VehicleBuild`s.

---

## Phase 3: User Story 1 - Race against a full field, not one ghost (Priority: P1) MVP

**Goal**: Extend `resolveContest` from a two-sided (player, ghost) result to a fully deterministic 8-car ranked result.

**Independent Test**: Resolve a contest for a given player build and confirm the result contains the player plus 7 rival cars, each with a finishing time, produced by one deterministic function call with no live/async step.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T008 [P] [US1] Add failing tests for N-car `resolveContest` resolution — exactly 8 `CarResult`s, every rival counted toward standings (no decorative car), and determinism across repeated calls with identical inputs — in `tests/unit/contest.test.ts`
- [ ] T009 [P] [US1] Add failing tests for a rival roster of length != 7 producing a typed, inspectable failure rather than a silent partial field in `tests/unit/contest.test.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Extend `resolveContest` to `(playerBuild, rivalRoster, level, seed, lapCount)` returning `NCarContestResult`, resolving each rival via `resolveRivalBuild` and running every car through the existing `simulatePlayerLaps` in `src/simulation/contest.ts` (depends on T008-T009, Foundational)
- [ ] T011 [US1] Migrate or explicitly supersede every existing test asserting the old `playerTime`/`ghostTime`/`gap` shape in `tests/unit/contest.test.ts` (depends on T010)
- [ ] T012 [US1] Run `tests/unit/contest.test.ts`; confirm N-car resolution and migrated cases are GREEN (depends on T010-T011)

**Checkpoint**: A contest resolves deterministically against the full 8-car field; the result is a ranked `cars[]` array with zero decorative entries.

---

## Phase 4: User Story 2 - See exactly where you finished, against everyone (Priority: P1)

**Goal**: Surface the full N-car standings — exact position, time, and gap to every other car — instead of a single win/loss verdict.

**Independent Test**: Resolve a contest, confirm the result exposes a complete ranked order, and confirm `ResultScene` renders that full order rather than only a player-vs-ghost gap.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T013 [P] [US2] Add failing tests proving ties in computed `time` resolve via fixed roster order (player, then rivals in authored catalog order) — never randomized or left ambiguous — in `tests/unit/contest.test.ts`
- [ ] T014 [P] [US2] Add failing tests for N-car label/position/gap formatting in `tests/unit/contestFormatting.test.ts`
- [ ] T015 [US2] Add failing integration tests for `ResultScene` rendering the player's exact position and every other car's result in `tests/integration/result-scene.test.ts` (depends on T013-T014)

### Implementation for User Story 2

- [ ] T016 [US2] Implement the fixed-roster-order tie-break in `resolveContest` in `src/simulation/contest.ts` (depends on T013)
- [ ] T017 [P] [US2] Implement N-car label/position/gap formatting in `src/scenes/contestFormatting.ts` (depends on T014)
- [ ] T018 [US2] Extend `ContestScene` to render every car in `cars[]` progressing on the existing oval track (minimum viable extension from 2 markers to N; richer visuals remain `race-spectacle`'s scope) in `src/scenes/ContestScene.ts` (depends on T010)
- [ ] T019 [US2] Extend `ResultScene` to render full ranked standings instead of a single player-vs-ghost verdict in `src/scenes/ResultScene.ts` (depends on T016-T017)
- [ ] T020 [US2] Run `tests/unit/contestFormatting.test.ts` and `tests/integration/result-scene.test.ts`; confirm standings and tie-break cases are GREEN (depends on T016-T019)

**Checkpoint**: Players can state their exact finishing position and gap to any specific car; every existing single-ghost result consumer is migrated.

---

## Phase 5: User Story 3 - Face rivals that scale as the run progresses (Priority: P2)

**Goal**: The same authored rival profile produces measurably different, level-appropriate stats depending on which PvP stage ordinal the contest is resolved at.

**Independent Test**: Resolve the same rival profile at two different in-run levels and confirm different, level-appropriate stats from the one authored definition; confirm resolving it twice at the same level and seed produces identical stats.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T021 [P] [US3] Add failing tests proving a rival profile resolved at a higher in-run level produces measurably stronger stats than the same profile at a lower level, and identical stats when resolved twice at the same level/seed, in `tests/unit/rivals.test.ts`
- [ ] T022 [P] [US3] Add failing integration tests proving `resolveContest` is called with the current scheduled PvP stage's ordinal as `level` (today: 1st or 2nd of the six-stage run) in `tests/integration/run-flow.test.ts`

### Implementation for User Story 3

- [ ] T023 [US3] Implement per-level `slotsToFill`/`priceBias` scaling (reusing each item's existing `price` field, no new rival-only stat) in `resolveRivalBuild` in `src/simulation/rivals.ts` (depends on T021)
- [ ] T024 [US3] Wire the run's current PvP stage ordinal through to `resolveContest`'s `level` argument in `src/scenes/ContestScene.ts` (depends on T022-T023)
- [ ] T025 [US3] Run `tests/unit/rivals.test.ts` and `tests/integration/run-flow.test.ts`; confirm level-scaling cases are GREEN (depends on T023-T024)

**Checkpoint**: Rival profiles are reusable, level-scaled content — not one-off fixed builds per race.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on already-shipped features and full automated/quickstart validation

- [ ] T026 Confirm `TestDayScene`, `PracticeContestScene`, `PracticeResultScene`, and their existing tests pass unchanged, still resolving only against `SAMPLE_GHOST` (FR-011) — regression check, no new code
- [ ] T027 Run `npm test`, `npm run build`, and `npm run lint`; fix only feature-related failures and confirm existing credits, sponsors, six-stage progression, and 10/12-lap contest regressions remain GREEN
- [ ] T028 Search all test files for remaining assertions against the old `playerTime`/`ghostTime`/`gap` shape; confirm zero remain (SC-005)
- [ ] T029 Run the local Vite browser through `quickstart.md` Scenarios A-D; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; establishes the N-car `resolveContest` result every later phase consumes
- **Phase 4 - US2**: Depends on US1's result shape existing
- **Phase 5 - US3**: Depends on US1's `resolveRivalBuild`/`resolveContest` call sites existing; independent of US2's presentation work
- **Phase 6 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1, MVP)**: Foundational only; independently validates the full 8-car deterministic result
- **US2 (P1)**: Uses US1's `NCarContestResult`; independently validates standings presentation and tie-break
- **US3 (P2)**: Uses Foundational's `resolveRivalBuild` and US1's `resolveContest` call sites; independently validates level-scaling. Does not depend on US2.

### Strict Test-First Order

- T002-T003 MUST be RED before T004-T006 add rival types/content/resolution
- T008-T009 MUST be RED before T010 extends `resolveContest`
- T013-T014 MUST be RED before T016-T017 add the tie-break and formatting
- T021-T022 MUST be RED before T023-T024 add level-scaling

---

## Parallel Opportunities

### Foundational rival content and resolution

```text
T002: Rival profile catalog tests in tests/unit/rivals.test.ts
T003: resolveRivalBuild determinism tests in tests/unit/rivals.test.ts
```

### US1 contest resolution boundaries

```text
T008: N-car resolution tests in tests/unit/contest.test.ts
T009: Invalid-roster typed-failure tests in tests/unit/contest.test.ts
```

### US2 standings boundaries

```text
T013: Tie-break tests in tests/unit/contest.test.ts
T014: Label/gap formatting tests in tests/unit/contestFormatting.test.ts
```

### US3 level-scaling boundaries

```text
T021: Level-scaling tests in tests/unit/rivals.test.ts
T022: Run-flow level-wiring tests in tests/integration/run-flow.test.ts
```

Tasks sharing `src/simulation/contest.ts`, `src/simulation/types.ts`, or `src/scenes/ContestScene.ts` remain sequential to avoid conflicting contract edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T012.
3. Stop and validate the full 8-car deterministic result independently (e.g. via a script or focused test run) before adding presentation work.

US1 is the MVP: a resolvable, deterministic, fully-counted 8-car field. US2 makes that field visible/legible to the player. US3 makes the rival roster reusable content instead of one-off builds.

### Incremental Delivery

1. **US1**: Deterministic 8-car `resolveContest` result.
2. **US2**: Full standings in `ContestScene`/`ResultScene`, tie-break rule.
3. **US3**: Level-scaled rival builds, wired to the current PvP stage ordinal.
4. **Polish**: Test Day regression confirmation, full automated gates, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test task; implementation begins only after the listed RED checks fail for the expected missing behavior.
- Rival profiles are pure authored content; all simulation math flows through the existing `simulatePlayerLaps`/`drawItem`/installation-resolution functions. No second simulation engine is introduced.
- `race-spectacle` (the richer procedural-track/particle/ticker presentation) is explicitly out of scope — `ContestScene`'s extension here is the minimum viable N-car rendering, not the final visual treatment.
- Test Day/Practice mode is regression-checked (T026), never modified.
