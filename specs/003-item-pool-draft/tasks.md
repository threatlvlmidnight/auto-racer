---

description: "Task list for feature implementation"
---

# Tasks: Item Pool & Performance-Identity Draft Weighting

**Input**: Design documents from `/specs/003-item-pool-draft/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` only, per the constitution's resolved testing-discipline decision (strict TDD for contest-resolution, slot/eviction, draft, and buff-resolution logic; lighter/manual checks elsewhere). Not a blanket TDD pass over the whole codebase.

**Organization**: Tasks are grouped by user story (spec.md: US1 and US2 are both P1, US3 and US4 are both P2). This feature **extends** `002-item-slots`'s `OfferedItem`/`ITEM_POOL` rather than replacing them — the Foundational phase below is the type-surface extension, and all four user stories build on top of it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3, or US4, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop`/`002-item-slots`: `src/simulation/`, `src/content/`, `src/scenes/`, `src/main.ts`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature reuses `002-item-slots`'s Vite + Phaser 3 + TypeScript + Vitest scaffold unchanged (plan.md Technical Context); no `package.json` changes needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared `OfferedItem` type surface — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Update `src/simulation/types.ts` (data-model.md): add `export type IdentityTag = "performance"`; add optional `identityTag?: IdentityTag` and `buff?: { boostPercent: number }` fields to `OfferedItem`; add `export const ACTIVE_IDENTITY_TAG: IdentityTag = "performance"` and `export const TAG_WEIGHT = 0.75`. Purely additive/optional — no existing test in `tests/unit/contest.test.ts` or `tests/unit/slots.test.ts` should break, so no dedicated foundational test is needed; the new fields are exercised by each user story's own tests below.

**Checkpoint**: Type surface ready — all four user stories can now build on top of it.

---

## Phase 3: User Story 1 - A real pool of distinct items exists to draft from (Priority: P1) 🎯 MVP piece 1

**Goal**: Expand the offered item pool from 5 to 10-20 distinct, tagged items.

**Independent Test**: Inspect the item pool and confirm it contains 10-20 items, no two sharing a name or effect magnitude (spec.md User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Expand `ITEM_POOL` in `src/content/sample-data.ts` (depends on T002): retain `002-item-slots`'s original 5 items; add new direct items (unique `name`, unique `timeModifier` magnitude each) mixing `identityTag: "performance"` and untagged/neutral entries; add exactly one buff item (`identityTag: "performance"`, `timeModifier: 0`, `buff: { boostPercent: <illustrative value, e.g. 5> }`) per FR-009 — total pool size between 10 and 20 (FR-001, data-model.md)
- [X] T004 [P] [US1] Add a pool-invariant regression test in `tests/unit/item-pool.test.ts` (depends on T003): assert `ITEM_POOL.length` is between 10 and 20; no two items share a `name`; no two *direct* (non-buff) items share a `timeModifier` magnitude; every item with a `buff` field has `timeModifier === 0` (SC-001, FR-001, FR-009's buff-item invariant)
- [X] T005 [US1] Manual validation: launch the game (`npm run dev`) and confirm the prepare phase still runs without error against the grown pool — **owner to run**, sandbox can't reach the user's browser (a spot-check only; offer-distribution behavior is validated in User Story 2)

**Checkpoint**: Pool contains 10-20 distinct, tagged items ready to draft from. Offers still cycle through only the first few (fixed-order draw is still in place) until User Story 2 lands.

---

## Phase 4: User Story 2 - Performance identity biases the draft (Priority: P1)

**Goal**: Replace the fixed cyclic offer order with a weighted random draw that favors performance-tagged items ~75% of the time, and show each offer's identity tag so the weighting is visible, not hidden math (spec.md User Story 2 AC3; Constitution Principle III).

**Independent Test**: Sample a large number of simulated offers to a Performance-identity build and confirm performance-tagged items are drawn substantially more often than neutral ones, never reduced to zero; and confirm each offer displays its own identity tag so a player can see the bias directly, not just infer it statistically (spec.md User Story 2, all three acceptance scenarios).

### Tests for User Story 2 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T007.**

- [X] T006 [US2] Write failing unit tests for `drawItem` in `tests/unit/draft.test.ts` (depends on T002; uses a small locally-constructed fixture pool, not the real `ITEM_POOL`, to keep the test isolated from content changes): cover contracts/simulation-contract.md's invariants — determinism given a fixed `rng` sequence, group-selection respects `tagWeight` on both sides of the boundary, every item in a non-empty group is reachable, and a distribution test (N ≥ 1000 trials with real `Math.random()`) asserting the tagged-item proportion falls within a tolerance band (e.g., 65%-85%) around 75% (FR-005, SC-002) — confirmed RED (`draft.ts` doesn't exist yet)

### Implementation for User Story 2

- [X] T007 [US2] Implement `drawItem(pool, targetTag, tagWeight, rng)` in `src/simulation/draft.ts` (depends on T006) — make T006's tests pass — confirmed GREEN
- [X] T008 [US2] Update `src/scenes/PrepareScene.ts` (depends on T003, T007): replace `ITEM_POOL[this.round % ITEM_POOL.length]` with `drawItem(ITEM_POOL, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, Math.random)` each round (FR-008)
- [X] T009 [US2] Update `PrepareScene.ts`'s offer rendering (depends on T008; same file, immediately follows the draw wiring) to show the offered item's identity tag (or "Neutral") alongside its existing name/effect label — a minimal tag-display sliver so the weighting itself is visible as soon as it exists, satisfying spec.md User Story 2 AC3 without waiting on the fuller held-item/result-screen display work in User Story 3 (FR-006)
- [X] T010 [US2] Manual validation: run quickstart.md scenarios 2-3 (offers vary between runs; performance identity visibly biases the draft, including the offer's displayed tag) — **owner to run**, same reason as T005

**Checkpoint**: Both P1 stories complete — the pool exists, the draft is visibly weighted toward Performance, and that weighting is shown on-screen, not just statistically inferable. This is the feature's actual headline mechanic, honestly self-contained per its own spec.

---

## Phase 5: User Story 3 - Held and offered items show their identity tag (Priority: P2)

**Goal**: Complete identity-tag legibility for the item's remaining touchpoints — the held-items build list and the result screen. (Offer-side display shipped as part of User Story 2, T009, so this phase doesn't repeat it.)

**Independent Test**: At any build-review point (held-items list, result screen), confirm the identity tag of every visible item is shown as plain, readable state (spec.md User Story 3).

### Implementation for User Story 3

- [X] T011 [US3] Update `PrepareScene.ts`'s held-item build-state rendering (`renderBuildState`) (depends on T009 — reuses the same tag-label approach introduced there) to show each held item's identity tag (or "Neutral") alongside its name (FR-006)
- [X] T012 [US3] Update `src/scenes/resultFormatting.ts`'s `heldItemsLabel` (depends on T002) to include each held item's identity tag; `ResultScene.ts` needs no further change since it already renders `heldItemsLabel`'s output (FR-006)
- [X] T013 [P] [US3] Update `tests/integration/result-scene.test.ts` (depends on T012; not strict TDD per constitution's presentation-layer decision) to confirm identity tags render correctly for both tagged and neutral items
- [X] T014 [US3] Manual validation: run quickstart.md scenario 4 (identity tags visible on the held-items list and result screen) — **owner to run**, same reason as T005

**Checkpoint**: Identity tags are legible everywhere an item appears — Transparency & Legibility (Constitution Principle III) satisfied for this feature's new dimension.

---

## Phase 6: User Story 4 - A buff item rewards pairing by tag (Priority: P2)

**Goal**: The buff item boosts other held items sharing its tag, computed once at build-resolution.

**Independent Test**: Assemble a build holding the buff item and a matching-tag item; confirm the contest outcome is measurably better than holding either alone (spec.md User Story 4).

### Tests for User Story 4 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T017-T018.**

- [X] T015 [P] [US4] Write failing unit tests for `applyBuffs` in `tests/unit/buffs.test.ts` (depends on T002; uses locally-constructed fixture items, not real `ITEM_POOL`): cover contracts/simulation-contract.md's invariants — boost applies when tags match, inert when they don't (FR-010), additive stacking across two buff items targeting the same tag, order-independence, no side effects — confirmed RED (`buffs.ts` doesn't exist yet)
- [X] T016 [P] [US4] Add a failing test to `tests/unit/contest.test.ts` (depends on T002) for SC-005: a build holding a buff item plus a matching-tag direct item MUST produce a different (better) `resolveContest().playerTime` than an otherwise-identical build holding only one of the two — confirmed RED (today's `resultingTime` doesn't apply buffs yet)

### Implementation for User Story 4

- [X] T017 [US4] Implement `applyBuffs(heldItems)` in `src/simulation/buffs.ts` (depends on T015) — make T015's tests pass — confirmed GREEN
- [X] T018 [US4] Update `src/simulation/build.ts`'s `resultingTime` (depends on T017, T016) to call `applyBuffs(build.heldItems)` before summing modifiers — make T016's test pass — confirmed GREEN
- [X] T019 [US4] Update `PrepareScene.ts`/`resultFormatting.ts` display (depends on T009, T011, T012, T018) so the buff item's target tag and boost percentage are shown as plainly as any direct item's effect (User Story 4 AC3)
- [X] T020 [US4] Manual validation: run quickstart.md scenarios 5-6 (buff item rewards pairing; buff item's effect is legible) — **owner to run**, same reason as T005

**Checkpoint**: All four user stories complete — the feature is fully playable, legible, and includes a first taste of item synergy.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all four stories

- [X] T021 [P] Regression check: confirm `002-item-slots` mechanics (slot capacity, eviction, decline-is-a-no-op) still hold unchanged against the grown pool (quickstart.md scenario 7) — extend `tests/unit/slots.test.ts` if any gap is found
- [X] T022 [P] Regression check: confirm order-independence (SC-004) still holds for buff-affected builds (quickstart.md scenario 8) — extend `tests/unit/contest.test.ts` if not already covered by T016
- [X] T023 [P] Update `README.md`'s references to item-pool/draft behavior, if any exist
- [X] T024 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean
- [X] T025 Run the full quickstart.md validation (all 8 scenarios) end to end as the final gate for this feature — **owner to run**, same reason as T005

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all four user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational and User Story 1's pool content (T003) — the draw needs real tagged items to be meaningful. Fully self-contained on exit, including tag visibility (T009).
- **User Story 3 (Phase 5)**: Depends on Foundational and User Story 2's offer-side tag display (T009) for its shared tag-label approach; completes the remaining held-item/result-screen touchpoints
- **User Story 4 (Phase 6)**: Depends on Foundational only for its tests/implementation (T015-T018); its display task (T019) additionally depends on User Story 2's (T009) and User Story 3's (T011, T012) display work
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within User Story 2

- T006 (tests) MUST be written and failing before T007 (implementation) — strict TDD
- T007 depends on T006
- T008 depends on T003 (pool content) and T007 (draw function)
- T009 depends on T008 — adds tag display to the same render path the draw wiring just touched
- T010 (manual validation) is last

### Within User Story 4

- T015 and T016 (tests, different files) can be written in parallel; both MUST be failing before T017/T018 — strict TDD
- T017 depends on T015
- T018 depends on T017 and T016
- T019 depends on T009, T011, T012 (all prior display groundwork), and T018
- T020 (manual validation) is last

---

## Parallel Example: Foundational → User Story 1

```bash
# After Setup (Phase 1) and T002 (types.ts) land:
Task: "Expand ITEM_POOL to 10-20 items in src/content/sample-data.ts"        # T003
# Once T003 completes:
Task: "Add pool-invariant regression test in tests/unit/item-pool.test.ts"   # T004
```

## Parallel Example: User Story 4

```bash
# Both test files are independent of each other, only need T002 (types.ts):
Task: "Write failing applyBuffs tests in tests/unit/buffs.test.ts"          # T015
Task: "Add failing SC-005 test to tests/unit/contest.test.ts"              # T016
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the `OfferedItem` type extension
3. Complete Phase 3: User Story 1 (pool content)
4. Complete Phase 4: User Story 2 (weighted draft + its own tag display)
5. **STOP and VALIDATE**: run quickstart.md scenarios 1-3 independently
6. This is the feature's actual headline mechanic — a real pool, visibly weighted toward the player's team identity, with that weighting shown on-screen (not just statistically inferable) as of T009. User Stories 3 and 4 add further legibility (held-items/result screen) and synergy depth on top, but this checkpoint is already a complete, spec-honest increment — it doesn't ship hidden math.

### Incremental Delivery

1. Setup + Foundational → type surface ready, nothing user-visible changed yet
2. User Story 1 → validate → pool is real and distinguishable
3. User Story 2 → validate → the draft visibly favors Performance, and shows it; this is the MVP
4. User Story 3 → validate → identity tags are legible on the held-items list and result screen too, satisfying Transparency & Legibility fully for this feature
5. User Story 4 → validate → the buff item gives a first taste of item synergy
6. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` (`contest.ts`, `slots.ts`, `build.ts`, and the two new modules `draft.ts`/`buffs.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged from `001-core-loop`/`002-item-slots`.
- `draft.test.ts` and `buffs.test.ts` deliberately use small, locally-constructed fixture items rather than the real `ITEM_POOL`, so their correctness doesn't depend on content decisions made in `sample-data.ts`.
- The weighted draw's distribution test (T006) asserts a tolerance band, not an exact count — FR-005/SC-002 describe a probabilistic guarantee (research.md explains why an exact-count assertion would be wrong here).
- Tag display is split across two phases on purpose (T009 in US2, T011-T012 in US3) so User Story 2 is independently, honestly self-contained per its own AC3 — added following a `/speckit.analyze` finding (F2) that flagged the original single-task version as leaving the MVP checkpoint's weighting invisible until US3 shipped.
- Slot capacity, eviction rules, and the 5-round offer count are untouched by this feature (FR-007, spec.md Assumptions) — T021 exists purely as a regression guard, not new work.
- Additional team identities, richer/multi-axis item synergy, per-lap/per-tick effects, item cooldowns, and the real run/encounter structure do not appear here — all explicitly out of scope per spec.md Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before moving on.
