---

description: "Task list for feature implementation"
---

# Tasks: Count-Synergy Buff — A Third Buff Kind

**Input**: Design documents from `/specs/007-count-synergy-buff/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` under strict TDD (constitution's resolved testing-discipline decision). `resultFormatting.ts`'s new branch is lightly tested via `tests/integration/result-scene.test.ts`, matching every other formatter there — not strict TDD.

**Organization**: Tasks are grouped by user story (spec.md: US1 is P1, US2 is P2). This is the smallest feature since `003-item-pool-draft` — no scene file changes, no new module, purely additive to `buffs.ts`/`laps.ts`/content. Foundational is a single, purely-additive type change with no forced breakage anywhere.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 or US2, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop` through `006-race-visualizer`: `src/simulation/`, `src/content/`, `src/scenes/`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature reuses the existing Vite + Phaser 3 + TypeScript + Vitest scaffold unchanged (plan.md Technical Context); no `package.json` changes needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the `perCount` field to `OfferedItem.buff` — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Update `src/simulation/types.ts` (data-model.md): add optional `perCount?: boolean` to `OfferedItem.buff`. Purely additive/optional — no existing code breaks, no dedicated test needed (matches `003-item-pool-draft`/`005-lap-tick-simulation`'s own precedent for pure structural additions).

**Checkpoint**: Type surface ready — both user stories can now build on top of it. Nothing else in the codebase is affected yet.

---

## Phase 3: User Story 1 - A buff's boost scales with how many matching items are held (Priority: P1) 🎯 MVP

**Goal**: A count-synergy buff's applied boost equals its per-item rate × the count of other matching-tag direct items held anywhere (board or storage, active or inert).

**Independent Test**: Assemble a build holding a count-synergy buff and a known number of other matching-tag direct items (mixed across board and storage); confirm the buff's applied boost equals its per-item rate multiplied by that count, and confirm it drops to zero effect when no matching items are held (spec.md User Story 1).

### Tests for User Story 1 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T007-T009.**

- [X] T003 [P] [US1] Write failing unit tests for `isCountSynergyBuff` and `matchingDirectItemCount` in `tests/unit/buffs.test.ts` (depends on T002; uses locally-constructed fixture items, not real `ITEM_POOL`): excludes the item itself; excludes other buffs; excludes non-matching tags; counts duplicate-id items individually; order-independent; no side effects — confirmed RED (functions don't exist yet)
- [X] T004 [US1] Extend `tests/unit/buffs.test.ts`'s `computeBoostsForLap` tests (same file as T003) for the new `allHeldItems` parameter and `perCount` branch: boost scales linearly with count (`rate × N`); inert at zero count; count spans an inert storage item absent from `activeItems` but present in `allHeldItems`; a count-synergy buff that is itself inert (absent from `activeItems`) is not processed at all; sums additively with flat/stacking buffs sharing a tag; `stackingState` is untouched by count-synergy buffs — confirmed RED (signature mismatch, logic doesn't exist)
- [X] T005 [P] [US1] Extend `tests/unit/laps.test.ts`'s `simulatePlayerLaps` tests (depends on T002) for a count-synergy buff's `firedItems` contribution: equals `matchingDirectItemCount(allHeldItems, item) * item.buff.boostPercent` exactly; direct items' own contributions are unaffected — confirmed RED
- [X] T006 [P] [US1] Add a failing end-to-end test to `tests/unit/contest.test.ts` (depends on T002) for SC-003: two otherwise-identical builds, each holding a count-synergy buff and one *active* matching-tag receiver item — one build additionally holds a matching-tag item inert in storage, the other doesn't — confirm the two produce different `playerTime` — confirmed RED

### Implementation for User Story 1

- [X] T007 [US1] Implement `isCountSynergyBuff` and `matchingDirectItemCount` in `src/simulation/buffs.ts` (depends on T003) — make T003's tests pass — confirmed GREEN
- [X] T008 [US1] Update `computeBoostsForLap`'s signature (add `allHeldItems: OfferedItem[]` parameter) and add the `perCount` branch in `buffs.ts` (depends on T007, T004) — make T004's tests pass — confirmed GREEN
- [X] T009 [US1] Update `src/simulation/laps.ts`'s `simulatePlayerLaps` (depends on T008, T005, T006): build `allHeldItems` (board + storage, unconditional) alongside the existing `activeItems`; pass both to `computeBoostsForLap`; compute a count-synergy buff's `firedItems` contribution via `matchingDirectItemCount` — make T005's and T006's tests pass — confirmed GREEN
- [X] T010 [US1] Add one new count-synergy item to `ITEM_POOL` in `src/content/sample-data.ts` (depends on T009): `identityTag: "performance"`, `buff: { boostPercent: <illustrative value, e.g. 2>, perCount: true }`, no `cooldown`, `timeModifier: 0` (matching existing buff-item convention)
- [X] T011 [P] [US1] Extend `tests/unit/item-pool.test.ts` (depends on T010) to assert the pool includes at least one count-synergy item (`buff.perCount === true`), mirroring `003-item-pool-draft`'s/`005-lap-tick-simulation`'s own "at least one X exists" pattern
- [X] T012 [US1] Manual validation: run quickstart.md scenarios 1-4 (mechanism works end to end, zero-match inertness, inert-storage items still count, buff itself must be active) — confirmed via a headless Playwright walkthrough of the live dev server (real drag-and-drop, real render), zero console errors, all four scenarios' expected outcomes observed on the result screen

**Checkpoint**: The count-synergy mechanism is fully correct and tested. This is the MVP — the feature's actual point.

---

## Phase 4: User Story 2 - The displayed effect reflects the real mechanism, not a flat number (Priority: P2)

**Goal**: A count-synergy item's description states its per-item rate wherever item effects are already shown, not a misleading flat percentage.

**Independent Test**: View a count-synergy item's effect description anywhere it's currently shown; confirm it communicates the per-item rate rather than a bare percentage that looks like a flat buff's (spec.md User Story 2).

### Implementation for User Story 2

- [X] T013 [US2] Update `src/scenes/resultFormatting.ts`'s `itemEffectLabel` (depends on T007 for `isCountSynergyBuff`, T010 for real content to exercise): branch on `isCountSynergyBuff(item)` to produce `Boosts {tag} items by {boostPercent}% per {tag} item held` instead of the existing flat-buff phrasing. No changes needed to `PrepareScene.ts`/`ResultScene.ts` — both already render item effects exclusively through this function (confirmed by inspection, plan.md).
- [X] T014 [US2] Extend `tests/integration/result-scene.test.ts` (depends on T013; not strict TDD per constitution's presentation-layer decision) to confirm the new "per item held" phrasing renders correctly for a count-synergy item, distinct from flat-buff phrasing
- [X] T015 [US2] Manual validation: run quickstart.md scenario 5 (description reflects the real mechanism, in both the prepare-phase display and the result screen) — confirmed live: "Boosts Performance items by 2% per Performance item held" renders correctly on both the prepare-phase offer/held-item cards and the result screen's board/storage lists

**Checkpoint**: Both user stories complete — the mechanism is correct, and its description doesn't misrepresent it (Constitution Principle III).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning both stories

- [X] T016 [P] Regression check: confirm `002-item-slots` through `006-race-visualizer` mechanics (slot capacity, eviction, draft weighting, board/storage movement, flat/stacking buffs, lap-tick simulation, playback) all still pass their existing, unmodified test suites — no code change expected, just confirmation
- [X] T017 [P] Update `README.md`'s references to the buff system, if any exist
- [X] T018 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean
- [X] T019 Run the full quickstart.md validation (all 5 scenarios plus the `simulation:log` data check) end to end as the final gate for this feature — all 5 scenarios confirmed via live Playwright walkthrough; `npm run simulation:log` confirmed working unaffected by this feature's changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories; introduces no breakage anywhere (unlike `004-board-storage-ui`/`005-lap-tick-simulation`'s own Foundational phases)
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on User Story 1's `isCountSynergyBuff` (T007) and pool content (T010) — the description can't be written or tested against a real item until both exist
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within User Story 1

- T003, T005, T006 (tests, different files) can be written in parallel; T004 extends the same file as T003 so it's sequenced after it in this list (not a hard dependency, just shared-file ordering); all four MUST be failing before T007-T009 — strict TDD
- T007 depends on T003
- T008 depends on T007 and T004
- T009 depends on T008, T005, T006
- T010 depends on T009
- T011 depends on T010
- T012 (manual validation) is last

### Within User Story 2

- T013 depends on T007 and T010
- T014 depends on T013
- T015 (manual validation) is last

---

## Parallel Example: User Story 1 (tests)

```bash
# All three are independent of each other and of pool content:
Task: "buffs.test.ts: isCountSynergyBuff + matchingDirectItemCount tests"   # T003
Task: "laps.test.ts: simulatePlayerLaps contribution tests"                 # T005
Task: "contest.test.ts: SC-003 end-to-end outcome test"                     # T006
```

## Parallel Example: Polish

```bash
Task: "Confirm 002-006 mechanics still pass unchanged"   # T016
Task: "Update README.md references"                       # T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the `perCount` field
3. Complete Phase 3: User Story 1 (the count-synergy mechanism itself)
4. **STOP and VALIDATE**: run quickstart.md scenarios 1-4 independently
5. This is the feature's actual point — a third buff kind that's correct and demonstrated by real content. User Story 2 is purely a description-accuracy follow-up (Constitution Principle III) on top of an already-complete mechanism.

### Incremental Delivery

1. Setup + Foundational → type surface ready, nothing else changed yet
2. User Story 1 → validate → the mechanism works, demonstrated by one real item; this is the MVP
3. User Story 2 → validate → the item's description no longer misrepresents it
4. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` (`buffs.ts`, `laps.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged since `001-core-loop`. `resultFormatting.ts` is presentation-layer, lightly tested via `result-scene.test.ts`, same tier as every prior formatting change.
- `buffs.test.ts`/`laps.test.ts` use locally-constructed fixture items rather than the real `ITEM_POOL` for their core-logic tests (T003-T005), so their correctness doesn't depend on content decisions made in `sample-data.ts` — same pattern every simulation-layer test file since `003-item-pool-draft` has used.
- No scene file is touched anywhere in this task list (confirmed by inspection, plan.md Summary) — this feature is `src/simulation/` + `src/content/sample-data.ts` + one formatter function.
- Combining count-scaling with a cooldown/stacking, and the more ambitious specific item-to-item pairing idea, both remain out of scope per spec.md Assumptions and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at either checkpoint to validate a story independently before moving on.
