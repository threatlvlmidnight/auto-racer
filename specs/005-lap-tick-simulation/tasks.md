---

description: "Task list for feature implementation"
---

# Tasks: Lap-Tick Race Simulation (No Visuals)

**Input**: Design documents from `/specs/005-lap-tick-simulation/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` only, per the constitution's resolved testing-discipline decision (strict TDD for contest-resolution, lap-ticking, and buff-resolution logic). This feature touches no scene/presentation code at all, so there is no "lighter/manual" tier here beyond the owner-run quickstart checks.

**Organization**: Tasks are grouped by user story (spec.md: US1, US2, US3 are all P1; US4 is P2). This feature **migrates** `SpecCar`/`SampleGhost`/`OfferedItem`/`ContestResult` and replaces the one-shot resolution model with a lap loop — the Foundational phase below is the type-shape migration only (no behavior), and `src/simulation/build.ts`/`contest.ts`/`buffs.ts` (plus their tests) do not compile again until User Story 1 rebuilds them around the new lap loop, matching `004-board-storage-ui`'s own Foundational→US1 handoff pattern.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3, or US4, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop` through `004-board-storage-ui`: `src/simulation/`, `src/content/`; tests under `tests/unit/`. No `src/scenes/` files are touched by this feature (plan.md Summary — confirmed by inspection).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature reuses `004-board-storage-ui`'s Vite + Phaser 3 + TypeScript + Vitest scaffold unchanged (plan.md Technical Context); no `package.json` changes needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrate the shared type shapes and constants — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. `src/simulation/build.ts`, `contest.ts`, `buffs.ts`, and their existing tests do not compile between this phase and User Story 1 — expected, not a bug (see Organization above).

- [X] T002 Update `src/simulation/types.ts` (data-model.md): `SpecCar.baseTime` → `baseLapTime`; `SampleGhost.finishingTime` → `lapTime`; add `OfferedItem.cooldown?: number`; add `LAP_COUNT = 10` and `MIN_LAP_TIME` constants; add the `LapBreakdown` interface; add `ContestResult.laps: LapBreakdown[]`. Purely structural — no dedicated test.
- [X] T003 [P] Update `src/content/sample-data.ts` (depends on T002): rename `BASELINE_CAR.baseTime` → `baseLapTime` (60 → 6) and `SAMPLE_GHOST.finishingTime` → `lapTime` (58.5 → 5.85), per research.md's "divide evenly, preserve the existing pace relationship" decision. Item `cooldown` assignment is deferred to User Story 2's content task (T016) — not needed yet since `cooldown` is optional in the type.

**Checkpoint**: Type surface and baseline/ghost content ready. `build.ts`/`contest.ts`/`buffs.ts` and their tests do not compile yet — that's User Story 1's job to fix.

---

## Phase 3: User Story 1 - A contest resolves as a sequence of discrete laps (Priority: P1) 🎯 MVP piece 1

**Goal**: Get the codebase compiling again around a real lap loop, proving the architecture (outcome correctness, determinism) for the simplest case — a build holding no items.

**Independent Test**: Resolve a contest for an empty build and confirm the result is the sum of `LAP_COUNT` identical base laps for the player, compared against `LAP_COUNT` identical laps for the ghost — matching the existing win/loss/tie correctness rule (spec.md User Story 1).

### Tests for User Story 1 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T006-T008.**

- [X] T004 [US1] Write failing unit tests for `simulatePlayerLaps` in `tests/unit/laps.test.ts` (NEW; depends on T002): for an empty build, confirm the result has exactly `LAP_COUNT` entries, each equal to `car.baseLapTime`; confirm determinism (same build twice → identical output) — confirmed RED (`laps.ts` doesn't exist yet)
- [X] T005 [US1] Update `tests/unit/contest.test.ts` (depends on T002, T003) for the new shapes and an empty-build outcome-correctness/determinism check using `LAP_COUNT`-derived totals — confirmed RED (`contest.ts`/`build.ts` still reference the old field names)

### Implementation for User Story 1

- [X] T006 [US1] Implement `src/simulation/laps.ts`'s minimal `simulatePlayerLaps(build)` (depends on T004): for each lap 1 through `LAP_COUNT`, raw time = `build.car.baseLapTime` (item iteration is deferred to User Story 2 — this version doesn't yet look at held items), clamped to `MIN_LAP_TIME` — make T004's tests pass — confirmed GREEN
- [X] T007 [US1] Update `src/simulation/build.ts`'s `resultingTime` (depends on T006) to delegate to `simulatePlayerLaps` and sum its results, keeping the existing non-finite-value guard as a final defensive check
- [X] T008 [US1] Update `src/simulation/contest.ts`'s `resolveContest` (depends on T007): generate `LAP_COUNT` copies of `ghost.lapTime`; derive `playerTime`/`ghostTime`/`gap`/`outcome` from the lap sums; populate `ContestResult.laps` with basic per-lap entries (`firedItemIds: []` for now, since no items fire yet) so the type is satisfied — make T005's tests pass — confirmed GREEN
- [X] T009 [US1] Manual validation: run quickstart.md scenario 1 (empty-build lap resolution, outcome correctness) — **owner to run**; this feature has no visuals, so validation means reviewing test output/a scratch script, not playing the game

**Checkpoint**: The lap-loop architecture works end-to-end for an empty build. A build *with* held items currently behaves as if it were empty (items don't fire yet) — a known, temporary gap closed by User Story 2.

---

## Phase 4: User Story 2 - Items recur every lap their cooldown allows (Priority: P1)

**Goal**: Direct items fire on their cooldown; flat buffs apply constantly; stacking buffs accumulate permanently; a minimum lap-time floor guards against degenerate combinations.

**Independent Test**: Give a build a single item with a known cooldown and confirm it contributes only on the laps its cooldown predicts; separately, confirm a stacking buff's cumulative boost only ever increases (spec.md User Story 2).

### Tests for User Story 2 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T013-T015.**

- [X] T010 [P] [US2] Extend `tests/unit/laps.test.ts` (depends on T004) with failing tests for `firesOnLap`: cooldown 1 fires every lap; cooldown N (N>1) fires on exactly laps `1, 1+N, 1+2N, …`; pure, no side effects — confirmed RED
- [X] T011 [P] [US2] Rewrite `tests/unit/buffs.test.ts` (depends on T002; uses locally-constructed fixture items, not real `ITEM_POOL`) for `computeBoostsForLap`: a flat buff's contribution is identical on lap 1 and the final lap; a stacking buff's cumulative value only increases, only on firing laps, and never decreases; multiple buffs sharing a tag sum together; two same-`id` stacking buffs (duplicates) accumulate independently, keyed by position; **a flat or stacking buff with no other active item sharing its tag is inert — `boostsByTag` has no entry (or 0) for that tag (spec.md User Story 2 AC5, carried forward from 003/004's own "inert when no match" test — don't let this rewrite drop it)**; no side effects — confirmed RED (`applyBuffs`'s old contract no longer applies)
- [X] T012 [US2] Extend `tests/unit/laps.test.ts`'s `simulatePlayerLaps` tests (depends on T010, T011) for real item recurrence: a cooldown-1 direct item contributes every lap and appears in `firedItemIds`; a cooldown-N item contributes and appears only on predicted laps; an artificially aggressive combination of stacking/recurring effects gets clamped to `MIN_LAP_TIME` rather than reaching zero/negative — confirmed RED

### Implementation for User Story 2

- [X] T013 [US2] Implement `firesOnLap(cooldown, lap)` in `src/simulation/laps.ts` (depends on T010) — make its tests pass — confirmed GREEN
- [X] T014 [US2] Rewrite `src/simulation/buffs.ts`: replace `applyBuffs` with `computeBoostsForLap(activeItems, lap, stackingState)` (depends on T011) — flat buffs (no `cooldown`) always contribute; stacking buffs (`cooldown` set) increment their stored cumulative value (keyed by array position) on firing laps and contribute their current cumulative value every lap — make T011's tests pass — confirmed GREEN
- [X] T015 [US2] Extend `simulatePlayerLaps` in `laps.ts` (depends on T013, T014, T006) to iterate `collectActiveItems`-equivalent active items each lap: direct items contribute their tag-boosted magnitude only on firing laps; buff contributions come from `computeBoostsForLap`, threading `stackingState` across the lap loop; clamp each lap's total to `MIN_LAP_TIME` — make T012's tests pass — confirmed GREEN
- [X] T016 [US2] Migrate `ITEM_POOL` in `src/content/sample-data.ts` (depends on T015): assign a `cooldown` to every direct item (at least one `= 1`, at least one `> 1`); add one new illustrative stacking-buff item (smaller per-firing increment, `cooldown > 1`); leave the existing buff item unchanged — it already has no `cooldown` field, making it a flat buff as-is (research.md)
- [X] T017 [P] [US2] Extend `tests/unit/item-pool.test.ts` (depends on T016): every direct item has a `cooldown`; at least one item has `cooldown === 1` and one has `cooldown > 1`; the pool includes both a flat buff (no cooldown) and a stacking buff (cooldown set)
- [X] T018 [US2] Manual validation: run quickstart.md scenarios 2-5 (cooldown recurrence, flat vs. stacking buffs, inert buff with no match, minimum-floor clamping) — **owner to run**, same reason as T009

**Checkpoint**: Both P1 mechanism stories complete — items genuinely recur, buffs behave per their kind, and the simulation cannot produce a degenerate (zero/negative) lap time.

---

## Phase 5: User Story 3 - The ghost is a fixed-pace control car (Priority: P1)

**Goal**: Explicitly verify the ghost's per-lap constancy — no variance, ever — as its own dedicated guarantee rather than an incidental side effect of User Story 1's wiring.

**Independent Test**: Resolve a contest and confirm every one of the ghost's `LAP_COUNT` laps contributes an identical amount of time, equal to `lapTime`, and that the total equals `lapTime × LAP_COUNT` (spec.md User Story 3).

### Implementation for User Story 3

- [X] T019 [US3] Extend `tests/unit/contest.test.ts` (depends on T008) with dedicated ghost-constancy assertions: every `laps[i].ghostLapTime` equals `ghost.lapTime` exactly across a full race; `ghostTime === ghost.lapTime * LAP_COUNT` — confirmed RED if not already explicitly covered by T005/T008
- [X] T020 [US3] If not already factored out by T008, extract the ghost-lap generation in `contest.ts` into its own small named step (e.g., a `ghostLapTimes(ghost)` helper) so its variance-free behavior is structurally obvious, not just incidentally true — make T019's tests pass — confirmed GREEN
- [X] T021 [US3] Manual validation: run quickstart.md scenario 6 (ghost constant-pace verification) — **owner to run**, same reason as T009

**Checkpoint**: The ghost's fixed-pace behavior is explicitly verified, not just an accident of how User Story 1 happened to wire it.

---

## Phase 6: User Story 4 - The result includes a lap-by-lap breakdown (Priority: P2)

**Goal**: `ContestResult.laps` is a complete, accurate record — real `firedItemIds` once items are involved, and per-lap times that sum exactly to the reported totals.

**Independent Test**: Resolve a contest and confirm the lap-by-lap breakdown's per-lap times sum to exactly the result's reported player and ghost totals, and that `firedItemIds` correctly reflects which items fired each lap (spec.md User Story 4).

### Implementation for User Story 4

- [X] T022 [US4] Extend `tests/unit/contest.test.ts` (depends on T008, T015) to assert `ContestResult.laps` has exactly `LAP_COUNT` entries with correct, non-trivial `firedItemIds` once items are held (flat buffs listed every lap, direct items/stacking buffs only on firing laps), and that summing `laps[].playerLapTime`/`laps[].ghostLapTime` exactly reproduces `playerTime`/`ghostTime` — confirmed RED if the breakdown assembly isn't yet fully wired end-to-end
- [X] T023 [US4] Finish wiring `resolveContest` in `contest.ts` (depends on T022, T015) so `ContestResult.laps` accurately reflects `simulatePlayerLaps`'s real `firedItemIds`, combined with each lap's ghost data — make T022's tests pass — confirmed GREEN
- [X] T024 [US4] Manual validation: run quickstart.md scenario 7 (breakdown reconstructs totals exactly) — **owner to run**, same reason as T009

**Checkpoint**: All four user stories complete — the simulation is lap-based, item effects recur correctly, the ghost is explicitly verified constant, and the full breakdown is exposed and correct.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all four stories

- [X] T025 [P] Regression check: confirm order-independence (SC-006) — permuting `build.board`'s held items (same final set, different order) produces identical outcomes — extend `tests/unit/contest.test.ts` if not already covered
- [X] T026 [P] Regression check: confirm `002-item-slots` through `004-board-storage-ui` mechanics (slot capacity, eviction, identity-weighted draft, board/storage movement) all still pass their existing, unmodified test suites (quickstart.md scenario 9) — no code change expected here, just confirmation
- [X] T027 [P] Update `README.md`'s references to the contest-resolution model, if any exist
- [X] T028 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean
- [X] T029 Run the full quickstart.md validation (all 9 scenarios) end to end as the final gate for this feature — **owner to run**, same reason as T009

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all four user stories; leaves `build.ts`/`contest.ts`/`buffs.ts` and their tests non-compiling until User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational only — gets the codebase compiling again around the (initially item-agnostic) lap loop
- **User Story 2 (Phase 4)**: Depends on User Story 1's lap-loop shell (T006-T008)
- **User Story 3 (Phase 5)**: Depends on User Story 1's ghost-lap wiring (T008) — mostly adds explicit verification, minimal new implementation
- **User Story 4 (Phase 6)**: Depends on User Story 1's breakdown scaffold (T008) and User Story 2's real item-firing data (T015) — without real firing data, the breakdown would have nothing meaningful to expose
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within User Story 2

- T010, T011 (tests, different files) can be written in parallel; both MUST be failing, and T012 MUST also be failing, before T013-T015 — strict TDD
- T013 depends on T010; T014 depends on T011
- T015 depends on T013, T014, and T006 (the US1 shell it's extending)
- T016 (content) depends on T015 (the mechanism must exist before content can exercise it meaningfully)
- T017 depends on T016
- T018 (manual validation) is last

### Within User Story 4

- T022 (test) depends on T008 and T015 — both the breakdown scaffold and real firing data must exist for this test to be meaningful
- T023 depends on T022
- T024 (manual validation) is last

---

## Parallel Example: User Story 2 (tests)

```bash
# Both test files are independent of each other and of ITEM_POOL content:
Task: "Extend laps.test.ts with firesOnLap tests"                    # T010
Task: "Rewrite buffs.test.ts for computeBoostsForLap"                # T011
```

## Parallel Example: Polish

```bash
# All independent regression/doc checks:
Task: "Confirm order-independence (SC-006)"                          # T025
Task: "Confirm 002-004 mechanics still pass unchanged"                # T026
Task: "Update README.md references"                                   # T027
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the type-shape migration
3. Complete Phase 3: User Story 1 (lap-loop architecture, empty-build correctness)
4. Complete Phase 4: User Story 2 (real item recurrence, buffs, minimum floor)
5. Complete Phase 5: User Story 3 (explicit ghost-constancy verification)
6. **STOP and VALIDATE**: run quickstart.md scenarios 1-6 independently
7. This is the actual architectural point of the feature — races resolve lap by lap, items recur on cooldown, buffs behave per their kind, and degenerate lap times can't happen. User Story 4 (P2) adds the breakdown's public exposure on top, completing the Transparency story, but the resolution model itself is already fully correct at this checkpoint.

### Incremental Delivery

1. Setup + Foundational → type surface ready, `build.ts`/`contest.ts`/`buffs.ts` temporarily non-compiling
2. User Story 1 → validate → lap loop works for the empty-build case, compiling again
3. User Story 2 → validate → items actually recur, buffs behave correctly, no degenerate lap times; this is the MVP's mechanical core
4. User Story 3 → validate → ghost constancy explicitly proven
5. User Story 4 → validate → the full lap-by-lap breakdown is exposed and correct
6. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` (`contest.ts`, `build.ts`, `slots.ts`, `storage.ts`, `draft.ts`, the rewritten `buffs.ts`, and the new `laps.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged since `001-core-loop`. This feature touches no other layer.
- `laps.test.ts` and `buffs.test.ts` deliberately use small, locally-constructed fixture items rather than the real `ITEM_POOL`, so their correctness doesn't depend on content decisions made in `sample-data.ts` — same pattern `003-item-pool-draft`/`004-board-storage-ui` used.
- `build.ts`/`contest.ts`/`buffs.ts` and their existing tests do not compile between Foundational and User Story 1 — expected, matching `004-board-storage-ui`'s own Foundational→US1 handoff when `Build`'s shape last changed underneath it.
- `applyBuffs` is removed entirely (contracts/simulation-contract.md) — `computeBoostsForLap` supersedes it. T011 explicitly carries forward the one old assertion still relevant to the new contract (inert when no matching-tag item is active) — added following a `/speckit.analyze` finding (F1) that flagged the first draft of this rewrite as silently dropping that coverage. Every other old `applyBuffs` assertion is superseded by the new lap-aware behavior, not preserved.
- No scene file is touched anywhere in this task list (confirmed by inspection, plan.md Summary) — this feature is purely `src/simulation/` + `src/content/sample-data.ts`.
- Lap count scaling across a run, a richer ghost with its own recorded build, additional team identities, and the real run/encounter structure remain out of scope per spec.md Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before moving on.
