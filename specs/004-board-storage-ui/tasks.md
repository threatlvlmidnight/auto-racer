---

description: "Task list for feature implementation"
---

# Tasks: Board & Storage — Drag-and-Drop Prepare UI

**Input**: Design documents from `/specs/004-board-storage-ui/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` only, per the constitution's resolved testing-discipline decision (strict TDD for contest-resolution, slot/eviction, storage-movement, draft, and buff-resolution logic; lighter/manual checks elsewhere). Not a blanket TDD pass over the whole codebase.

**Organization**: Tasks are grouped by user story (spec.md: US1-US4 are P1, US5 is P2). This feature **migrates** `Build` from a compact `heldItems` list into fixed-size `board`/`storage` arrays — the Foundational phase below is that migration, and all five user stories build on top of it. Because this migration changes `slots.ts`'s `addItem` signature and `Build`'s shape, `PrepareScene.ts` does not compile against the old code once Foundational lands — User Story 1 is what gets it compiling again, matching how `002-item-slots`'s own Foundational→US1 handoff worked.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3, US4, or US5, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop` through `003-item-pool-draft`: `src/simulation/`, `src/content/`, `src/scenes/`, `src/main.ts`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature reuses `003-item-pool-draft`'s Vite + Phaser 3 + TypeScript + Vitest scaffold unchanged (plan.md Technical Context), using Phaser's existing native drag/drop-zone input APIs rather than a new package

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrate `Build`/`OfferedItem`/`ContestResult` to the board+storage shape — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. `PrepareScene.ts` will not compile between this phase and User Story 1 — expected, matching `002-item-slots`'s own migration precedent (see Organization above).

### Tests for Foundational (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T003-T006.**

- [X] T002 [P] Update `tests/unit/contest.test.ts` and `tests/unit/slots.test.ts` for the new shapes (data-model.md, contracts/simulation-contract.md): `Build.board`/`Build.storage` as fixed-length `(OfferedItem | null)[]`, `OfferedItem.activeWhileStored?`, `ContestResult.board`/`ContestResult.storage` replacing `heldItems`, `addItem`'s new `boardIndex` parameter, and `resultingTime`'s two new invariants (an ordinary storage item has zero effect; the one `activeWhileStored` item counts exactly as if it were on the board) — confirmed RED against the old `types.ts`/`contest.ts`/`slots.ts`

### Implementation for Foundational

- [X] T003 Update `src/simulation/types.ts`: `Build` becomes `{car, board: (OfferedItem|null)[], storage: (OfferedItem|null)[]}`; add `OfferedItem.activeWhileStored?: boolean`; add `STORAGE_CAPACITY = SLOT_CAPACITY`; `ContestResult.heldItems` becomes `ContestResult.board`/`.storage` (data-model.md)
- [X] T004 [P] Update `src/simulation/build.ts` (depends on T003): `resultingTime` collects the active item set (every non-null `board` item, plus non-null `storage` items with `activeWhileStored === true`), runs it through the unchanged `applyBuffs`, then sums onto `car.baseTime` (data-model.md, contracts/simulation-contract.md)
- [X] T005 [P] Update `src/simulation/slots.ts` (depends on T003): `hasOpenSlot` checks `board.some(slot => slot === null)`; `addItem(build, item, boardIndex)` gains the explicit index parameter and places into that specific `null` slot; `evictAndAdd` adapts to `board[evictIndex]` (contracts/simulation-contract.md)
- [X] T006 Update `src/simulation/contest.ts` (depends on T003, T004): `resolveContest` returns `ContestResult.board`/`.storage` (compacted, non-null entries) instead of `heldItems` — make T002's tests pass — confirmed GREEN

**Checkpoint**: `Build`/`OfferedItem`/`ContestResult` migration complete — all five user stories can now build on top of it. `PrepareScene.ts` does not compile yet.

---

## Phase 3: User Story 1 - The board and storage are distinct, visible areas (Priority: P1) 🎯 MVP piece 1

**Goal**: Replace the scrolling text list with a visual board region and a toggle-able storage region, each showing their fixed capacity and contents.

**Independent Test**: Open the prepare phase and confirm the board is visible by default with `SLOT_CAPACITY` positions shown, and a single control reveals a separate storage area with its own fixed capacity (spec.md User Story 1).

### Implementation for User Story 1

- [X] T007 [US1] Rework `src/scenes/PrepareScene.ts` (depends on T003, T005, T006) to compile against the new `Build` shape: initialize `this.build` with `board`/`storage` as `null`-filled arrays of their respective capacities, and render the board as a row of `SLOT_CAPACITY` slot rectangles (visually distinguishing empty vs. occupied) in place of the old text list. No item interactivity yet (accept/evict/decline/Next/Refresh land in US2/US3) — this story is display-only. **Preserve the existing `renderRound()` guard that starts `ContestScene` once `this.round >= OFFER_ROUNDS`** — this rewrite must not drop the only path out of the prepare phase.
- [X] T008 [US1] Add a storage toggle control to `PrepareScene.ts` (depends on T007) that shows/hides a row of `STORAGE_CAPACITY` slot rectangles, mirroring the board's rendering (FR-002)
- [X] T009 [US1] Manual validation: run quickstart.md scenario 1 — **owner to run**, sandbox can't reach the user's browser

**Checkpoint**: Board and storage are visible, distinct regions. The prepare phase is not yet playable end-to-end (no way to act on an offer or advance a round) — that lands across User Stories 2-3.

---

## Phase 4: User Story 2 - Item actions happen by dragging, not clicking buttons (Priority: P1)

**Goal**: Accepting an offer onto an open board slot and evicting a held item both happen via drag, replacing the old Accept/Replace buttons.

**Independent Test**: Drag an offer onto an open board slot and confirm it's accepted immediately; drag an offer onto a held item and confirm that item is evicted and replaced immediately (spec.md User Story 2, Scenarios 1-2).

### Implementation for User Story 2

- [X] T010 [US2] Update `PrepareScene.ts` (depends on T007): make the current offer draggable via Phaser's native drag input; register each board slot as a drop zone; dropping on an open slot calls `addItem(build, offer, boardIndex)`, dropping on an occupied slot calls `evictAndAdd(build, boardIndex, offer)` — both apply to `this.build` immediately, replacing the old Accept/Replace buttons entirely (FR-003, FR-004)
- [X] T011 [US2] Manual validation: run quickstart.md scenario 2 (accept and evict via drag) — **owner to run**, same reason as T009

**Checkpoint**: Item decisions happen entirely by dragging. Declining (leaving the offer alone) and advancing past it still have no control yet — that's User Story 3.

---

## Phase 5: User Story 3 - The round advances explicitly, and the offer can be rerolled (Priority: P1)

**Goal**: A Next control advances the round regardless of what was dragged; a Refresh control rerolls the current offer, limited to one use per round.

**Independent Test**: Leave an offer untouched and click Next — confirm it's declined and the next round begins; click Refresh on an unused round — confirm a new offer appears without ending the round; click Refresh again the same round — confirm nothing happens (spec.md User Story 3).

### Implementation for User Story 3

- [X] T012 [US3] Add a Next control to `PrepareScene.ts` (depends on T010): clicking it advances `this.round` and re-renders — **if `this.round` has now reached `OFFER_ROUNDS`, this MUST start `ContestScene` with the final build (T007's preserved guard), exactly as the pre-existing `renderRound()` did; otherwise** it draws a new offer via `drawItem` (unchanged from 003) and resets the round's Refresh allowance — regardless of whether the current offer was dragged anywhere (FR-005)
- [X] T013 [US3] Add a Refresh control to `PrepareScene.ts` (depends on T012): clicking it replaces the current offer with a new `drawItem` draw without advancing the round or touching `this.build`; track `refreshesRemaining: number` as scene state (default 1, decremented on use, reset to 1 by T012's Next handler) rather than a boolean — this is what lets a future item effect grant extra refreshes (FR-007) without a later rework; visibly disable the control once `refreshesRemaining === 0` (FR-006, FR-007, FR-015)
- [X] T014 [US3] Manual validation: run quickstart.md scenarios 3-6 (decline via Next, Next always advances, Refresh reroll, Refresh resets every round) — **owner to run**, same reason as T009

**Checkpoint**: All three P1 flow stories complete — the prepare phase is fully playable end-to-end via drag plus Next/Refresh. This is the MVP.

---

## Phase 6: User Story 4 - Board and storage items can be freely rearranged (Priority: P1)

**Goal**: Players can drag held items between the board and storage at any time, independent of the current offer.

**Independent Test**: Drag a board item into an open storage slot and confirm it moves; drag it back and confirm the reverse; drag a stored item onto an occupied board slot and confirm the two swap (spec.md User Story 4).

### Tests for User Story 4 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T016.**

- [X] T015 [P] [US4] Write failing unit tests for `hasOpenStorageSlot`, `moveToStorage`, `moveToBoard`, and `swapBoardStorage` in `tests/unit/storage.test.ts` (depends on T003; uses locally-constructed fixture builds, not real `ITEM_POOL`): cover contracts/simulation-contract.md's invariants — item preserved (never duplicated or lost), capacities unchanged, no side effects, and the swap's idempotent-pair property — confirmed RED (`storage.ts` doesn't exist yet)

### Implementation for User Story 4

- [X] T016 [US4] Implement `hasOpenStorageSlot`, `moveToStorage`, `moveToBoard`, `swapBoardStorage` in `src/simulation/storage.ts` (depends on T015) — make T015's tests pass — confirmed GREEN
- [X] T017 [US4] Update `PrepareScene.ts` (depends on T008, T016): make board and storage items draggable; dropping a board item on an open storage slot calls `moveToStorage`; dropping a stored item on an open board slot calls `moveToBoard`; dropping a stored item on an *occupied* board slot calls `swapBoardStorage` (FR-008, FR-009, FR-010)
- [X] T018 [US4] Manual validation: run quickstart.md scenario 7 (board ↔ storage movement, including the swap and full-storage rejection cases) — **owner to run**, same reason as T009

**Checkpoint**: Full board/storage rearrangement is available, independent of the offer flow.

---

## Phase 7: User Story 5 - Storage is inert by default, and that's visible (Priority: P2)

**Goal**: One pool item is flagged active-while-stored; ordinary stored items have no effect; the distinction is visible wherever an item appears.

**Independent Test**: Hold an ordinary item in storage and confirm the outcome matches an empty slot; hold the one flagged item in storage instead and confirm its effect still applies; confirm the distinction is visible by looking (spec.md User Story 5).

### Implementation for User Story 5

- [X] T019 [P] [US5] Add one item to `ITEM_POOL` in `src/content/sample-data.ts` (depends on T003) flagged `activeWhileStored: true` (illustrative example: "Tyre Rack," per Clarifications), giving the mechanism from Foundational (T004) real content to demonstrate (FR-012)
- [X] T020 [P] [US5] Extend `tests/unit/item-pool.test.ts` (depends on T019) to assert the pool includes at least one `activeWhileStored` item, mirroring `003-item-pool-draft`'s buff-item invariant
- [X] T021 [US5] Update `PrepareScene.ts`'s storage slot rendering (depends on T017, T019) to visibly distinguish the `activeWhileStored` item from ordinary stored items (FR-013)
- [X] T022 [US5] Update `src/scenes/resultFormatting.ts` (depends on T006) — split the old `heldItemsLabel` into board/storage sections, distinguishing the `activeWhileStored` item — and wire the result into `src/scenes/ResultScene.ts`
- [X] T023 [P] [US5] Update `tests/integration/result-scene.test.ts` (depends on T022; not strict TDD per constitution's presentation-layer decision) to confirm board/storage sections render correctly and the `activeWhileStored` item is visually distinguished
- [X] T024 [US5] Manual validation: run quickstart.md scenario 8 (storage inert by default, with one visible exception) — **owner to run**, same reason as T009

**Checkpoint**: All five user stories complete — the feature is fully playable, legible, and storage carries real (if mostly inert) weight.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all five stories

- [X] T025 [P] Regression check: confirm `003-item-pool-draft`'s identity-tag weighting and buff-item tag-matching are unaffected by board/storage placement (quickstart.md scenario 9) — extend `tests/unit/buffs.test.ts`/`tests/unit/draft.test.ts` if any gap is found
- [X] T026 [P] Regression check: confirm order-independence (SC-004) still holds across board/storage arrangements — extend `tests/unit/contest.test.ts` if not already covered by T002
- [X] T027 [P] Update `README.md`'s references to the prepare-phase UI, if any exist
- [X] T028 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean
- [X] T029 Run the full quickstart.md validation (all 10 scenarios) end to end as the final gate for this feature — **owner to run**, same reason as T009

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all five user stories; leaves `PrepareScene.ts` non-compiling until User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational only — gets `PrepareScene.ts` compiling again and renders the board/storage regions
- **User Story 2 (Phase 4)**: Depends on Foundational and User Story 1's board rendering (T007)
- **User Story 3 (Phase 5)**: Depends on User Story 2's drag-drop wiring (T010)
- **User Story 4 (Phase 6)**: Depends on Foundational for its tests/implementation (T015-T016); its UI wiring (T017) additionally depends on User Story 1's storage rendering (T008)
- **User Story 5 (Phase 7)**: Depends on Foundational (T003) for content/tests (T019-T020); its display tasks (T021, T022) additionally depend on User Story 4's storage drag wiring (T017) and Foundational's `ContestResult` shape (T006)
- **Polish (Phase 8)**: Depends on all five user stories being complete

### Within User Story 4

- T015 (tests) MUST be written and failing before T016 (implementation) — strict TDD
- T016 depends on T015
- T017 depends on T008 and T016
- T018 (manual validation) is last

### Within User Story 5

- T019 and T020 (content + its test) are sequential (same underlying data), but independent of T021-T023's display work until the display tasks need real content to show
- T021 depends on T017 and T019
- T022 depends on T006 (can start as soon as Foundational is done, independent of T021)
- T023 depends on T022
- T024 (manual validation) is last

---

## Parallel Example: Foundational

```bash
# After Setup (Phase 1) and T003 (types.ts) land, these can run together:
Task: "Update src/simulation/build.ts's resultingTime for the active item set"   # T004
Task: "Update src/simulation/slots.ts for the board array + indexed addItem"    # T005
```

## Parallel Example: User Story 5

```bash
# Content + its test are sequential, but independent of the display half:
Task: "Add an activeWhileStored item to ITEM_POOL in sample-data.ts"            # T019
Task: "Extend item-pool.test.ts for the activeWhileStored invariant"           # T020 (after T019)
# Meanwhile, independent of the above:
Task: "Update resultFormatting.ts / ResultScene.ts for board/storage sections"  # T022 (needs only T006)
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the `Build`/`OfferedItem`/`ContestResult` migration
3. Complete Phase 3: User Story 1 (visible board/storage)
4. Complete Phase 4: User Story 2 (drag accept/evict)
5. Complete Phase 5: User Story 3 (Next/Refresh)
6. **STOP and VALIDATE**: run quickstart.md scenarios 1-6 independently
7. This is the actual "doesn't feel like a game" fix, fully playable end to end via drag plus Next/Refresh. User Stories 4-5 add the storage-rearrangement and inert-by-default depth on top, but this checkpoint already replaces every button-driven interaction the feature exists to fix.

### Incremental Delivery

1. Setup + Foundational → migration complete, `PrepareScene.ts` temporarily non-compiling
2. User Story 1 → validate → board/storage visible, compiling again
3. User Story 2 → validate → accept/evict via drag
4. User Story 3 → validate → the round can advance and reroll; this is the MVP
5. User Story 4 → validate → board ↔ storage rearrangement works
6. User Story 5 → validate → storage's inert-by-default rule (and its one exception) is real and legible
7. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` (`contest.ts`, `slots.ts`, `build.ts`, `draft.ts`, `buffs.ts`, and the new `storage.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged since `001-core-loop`.
- `storage.test.ts` deliberately uses locally-constructed fixture builds rather than the real `ITEM_POOL`, so its correctness doesn't depend on content decisions made in `sample-data.ts` — same pattern `003-item-pool-draft` used for `draft.test.ts`/`buffs.test.ts`.
- `PrepareScene.ts` not compiling between Foundational and User Story 1 is expected, not a bug in the task breakdown — it mirrors `002-item-slots`'s own Foundational→US1 handoff when `Build`'s shape last changed underneath it.
- Refresh's one-per-round allowance is `PrepareScene` scene state, not a `Build` field or a `src/simulation/` concern (research.md) — there is no dedicated test task for it beyond the manual validation in T014, matching how `round` itself has never had a dedicated unit test.
- No shop economy, currency, or run/encounter structure appears here — Refresh is free and per-round, not a purchase — and additional team identities, richer item synergy, and item-granted bonus refreshes remain out of scope per spec.md Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before moving on.
