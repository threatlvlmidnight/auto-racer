---

description: "Task list for feature implementation"
---

# Tasks: Item Slots — Flat Cap with Evict-to-Add

**Input**: Design documents from `/specs/002-item-slots/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` only, per the constitution's resolved testing-discipline decision (strict TDD for contest-resolution and slot/eviction logic; lighter/manual checks elsewhere). Not a blanket TDD pass over the whole codebase.

**Organization**: Tasks are grouped by user story (spec.md: US1 and US2 are both P1, US3 is P2). This feature **migrates** `001-core-loop`'s `Build`/`ContestResult` shapes rather than adding a greenfield model — the Foundational phase below is that migration, and all three user stories build on top of it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop`: `src/simulation/`, `src/content/`, `src/scenes/`, `src/main.ts`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature reuses `001-core-loop`'s Vite + Phaser 3 + TypeScript + Vitest scaffold unchanged (plan.md Technical Context); no `package.json` changes needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrate the shared `Build`/`ContestResult` data model and expand the item pool — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T003–T006.**

- [X] T002 [P] Update `tests/unit/contest.test.ts` for the new `Build` shape (`{car, heldItems: OfferedItem[]}`) and `ContestResult` shape (`heldItems` replacing `itemAccepted`), covering the updated invariants in `contracts/simulation-contract.md`: determinism, outcome correctness, detectable effect of held items, order-independence (SC-004), and purity — confirmed RED against the old `contest.ts`/`types.ts`

### Implementation for Foundational

- [X] T003 Update `src/simulation/types.ts`: `Build` becomes `{car, heldItems: OfferedItem[]}`, `ContestResult.itemAccepted` becomes `heldItems: OfferedItem[]`, add the `SLOT_CAPACITY` constant (data-model.md)
- [X] T004 [P] Update `src/simulation/build.ts` (depends on T003): `resultingTime` sums `car.baseTime` plus every held item's `timeModifier` (data-model.md)
- [X] T005 Update `src/simulation/contest.ts` (depends on T002, T003, T004): adapt `resolveContest` to the new `Build` shape; make T002's tests pass — confirmed GREEN
- [X] T006 [P] Update `src/content/sample-data.ts` (depends on T003): expand the single `OFFERED_ITEM` into `ITEM_POOL: OfferedItem[]` of 4-5 items with genuinely different `timeModifier` magnitudes, reusing `001-core-loop`'s original item as one entry (Clarification Q1, data-model.md)

**Checkpoint**: `Build`/`ContestResult` migration complete — all three user stories can now build on top of it.

---

## Phase 3: User Story 1 - Fill available slots (Priority: P1) 🎯 MVP piece 1

**Goal**: Across multiple prepare-phase rounds, the player is offered one item per round and can accept it into an open slot, up to the flat cap.

**Independent Test**: Offer as many items in sequence as the flat cap allows, accepting each one, and confirm all of them end up held in the build with no eviction ever required (spec.md User Story 1).

### Tests for User Story 1 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T008.**

- [X] T007 [US1] Write failing unit tests for `hasOpenSlot` and `addItem` in `tests/unit/slots.test.ts`, covering the capacity-never-exceeded and no-side-effect invariants from `contracts/simulation-contract.md` — confirmed RED (`slots.ts` doesn't exist yet)

### Implementation for User Story 1

- [X] T008 [US1] Implement `hasOpenSlot(build)` and `addItem(build, item)` in `src/simulation/slots.ts` (depends on T007) — make T007's tests pass — confirmed GREEN
- [X] T009 [US1] Rework `src/scenes/PrepareScene.ts` into a 5-round offer loop reading from `ITEM_POOL` in a fixed order (research.md): each round offers one item; while `hasOpenSlot(build)` is true, the player can accept (`addItem`) or decline (depends on T006, T008)
- [X] T010 [US1] Confirm `src/scenes/ContestScene.ts`'s call into `resolveContest` still works unchanged with the reworked `PrepareScene`'s final (now multi-item) `Build` (depends on T005, T009)
- [X] T011 [US1] Manual validation: run quickstart.md scenarios 1–2 (fill every slot without eviction; decline while slots remain open) — **owner to run**, sandbox can't reach the user's browser

**Checkpoint**: A player can fill up to `SLOT_CAPACITY` items across multiple rounds. Eviction is not yet exercised — that's User Story 2.

---

## Phase 4: User Story 2 - Evict to make room (Priority: P1)

**Goal**: Once all slots are full, accepting a new item requires the player to give up one currently-held item.

**Independent Test**: Fill every slot, then offer one more item. Accepting it must force a choice of which held item to remove; declining must leave the build unchanged (spec.md User Story 2).

### Tests for User Story 2 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T013.**

- [X] T012 [US2] Add failing unit tests for `evictAndAdd` in `tests/unit/slots.test.ts` (extends T007's file), covering "eviction never loses more than one item" and "no item is protected from eviction" (FR-005) — confirmed RED

### Implementation for User Story 2

- [X] T013 [US2] Implement `evictAndAdd(build, evictIndex, item)` in `src/simulation/slots.ts` (depends on T012, T008) — make T012's tests pass — confirmed GREEN
- [X] T014 [US2] Extend `PrepareScene.ts`'s round loop (depends on T009, T013): when `!hasOpenSlot(build)`, present the offered item alongside every currently-held item as a swap target — clicking a held item calls `evictAndAdd` with that index; a Decline control remains available and leaves the build unchanged
- [X] T015 [US2] Manual validation: run quickstart.md scenarios 3–4 (evict to accept once full; decline while full) — **owner to run**, same reason as T011

**Checkpoint**: Both P1 stories complete — the slot/eviction mechanic is fully exercised end to end.

---

## Phase 5: User Story 3 - Build state is legible at a glance (Priority: P2)

**Goal**: At any point during the prepare phase, the player can see exactly which items are currently held and how many slots remain open.

**Independent Test**: At any point during the prepare phase, confirm the currently-held items and remaining open slots are displayed as plain, readable state (spec.md User Story 3).

### Implementation for User Story 3

- [X] T016 [US3] Add a plain, always-visible held-items list and open-slot counter to `PrepareScene.ts`, updated after every round's outcome — accept, decline, or evict (depends on T009, T014)
- [X] T017 [US3] Replace `resultFormatting.ts`'s single-item `choiceLabel`/`comparisonLabel` with a held-items-list formatter that renders 0 to N items; wire it into `ResultScene.ts` alongside the existing times/gap/outcome display (depends on T005's `ContestResult.heldItems`)
- [X] T018 [US3] Update `tests/integration/result-scene.test.ts` (depends on T017, not strict TDD per constitution's presentation-layer decision) to confirm `ResultScene` renders the held-items list correctly for 0-item, 1-item, and multi-item builds
- [X] T019 [US3] Manual validation: run quickstart.md scenario 5 (build state legible at every point) — **owner to run**, same reason as T011

**Checkpoint**: All three user stories complete — the feature is fully playable and legible end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all three stories

- [X] T020 [P] Add edge-case handling and, if gaps are found, regression tests: confirm an empty final build (every offer declined) and a full final build both resolve through `resolveContest` without error (Edge Cases, SC-001)
- [X] T021 [P] Update `README.md`'s quickstart references for the new 5-round, slot-based prepare flow
- [X] T022 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean after the migration
- [X] T023 Run the full quickstart.md validation (all 7 scenarios, including the order-independence check in scenario 6) end to end as the final gate for this feature — **owner to run**, same reason as T011

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all three user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on User Story 1's `PrepareScene` round loop (T009) and `slots.ts` file (T008) — extends rather than duplicates them
- **User Story 3 (Phase 5)**: Depends on Foundational, User Story 1's round loop (T009), and User Story 2's swap interaction (T014) — its display work wraps state both stories produce
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within User Story 1

- T007 (tests) MUST be written and failing before T008 (implementation) — strict TDD
- T009 depends on T006 (item pool) and T008 (slot functions)
- T010 is a confirmation step, depends on T005 and T009
- T011 (manual validation) is last

### Within User Story 2

- T012 (tests, extends T007's file) MUST be failing before T013 — strict TDD
- T013 depends on T012 and T008
- T014 depends on T009 and T013
- T015 (manual validation) is last

### Within User Story 3

- T016 depends on T009 and T014
- T017 depends on T005 (`ContestResult.heldItems`) — can start as soon as Foundational is done, independent of T016
- T018 depends on T017
- T019 (manual validation) is last

---

## Parallel Example: Foundational

```bash
# After Setup (Phase 1) completes, these can start together:
Task: "Update tests/unit/contest.test.ts for the new Build/ContestResult shape"   # T002
# T004 and T006 can both start once T003 (types.ts) lands:
Task: "Update src/simulation/build.ts to sum all heldItems' modifiers"            # T004
Task: "Expand src/content/sample-data.ts into an ITEM_POOL of 4-5 items"          # T006
```

## Parallel Example: User Story 3

```bash
# Both can start as soon as their own dependencies land, independent of each other:
Task: "Add held-items list + open-slot counter to PrepareScene.ts"    # T016 (needs T009, T014)
Task: "Replace resultFormatting.ts's single-item labels with a list formatter"  # T017 (needs only T005)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the `Build`/`ContestResult` migration
3. Complete Phase 3: User Story 1 (fill slots)
4. Complete Phase 4: User Story 2 (evict to make room)
5. **STOP and VALIDATE**: run quickstart.md scenarios 1–4 independently
6. This is the actual slot/eviction mechanic working end to end — the thing this feature exists to prove. Both P1 stories are needed together for a meaningful independent test, since a slot system with no eviction pressure doesn't yet deliver what it was designed for (see spec.md's "Why this priority" for User Story 2)

### Incremental Delivery

1. Setup + Foundational → migration complete, nothing user-visible changed yet
2. User Story 1 → validate → players can fill slots
3. User Story 2 → validate → the actual "can't have it all" decision now exists; this is the MVP
4. User Story 3 → validate → the feature now satisfies Transparency & Legibility (Constitution Principle III) fully, including on the result screen
5. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` (`contest.ts`, `slots.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged from `001-core-loop`.
- The 5-round, fixed-order offer sequence (T009) is a deliberate placeholder (research.md) — it is not where this feature's design attention goes, so it gets no dedicated user story of its own.
- Identity-weighted drafting, item synergy, and the real run/encounter structure do not appear here — all explicitly out of scope per spec.md Assumptions and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at either checkpoint to validate a story independently before moving on.
