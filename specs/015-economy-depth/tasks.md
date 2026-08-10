# Tasks: Economy Depth

**Input**: Design documents from `/specs/015-economy-depth/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/economy-depth-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the four user stories in `spec.md`. `RunStatus` gaining `"failed"` and the `advanceRun` reputation check are foundational — every user story's run-ending/history behavior depends on that hook existing first, even though only US1 introduces the trigger itself. US2 (interest), US3 (sell-back), and US4 (card-locking) are independent of each other and of US1's reputation mechanic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the `"failed"` `RunStatus` value, `Run.reputation`, and the `advanceRun` reputation-check hook that every user story's run-ending/history guarantees depend on

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for `RunStatus` gaining `"failed"` and `Run.reputation` starting at its fixed authored value in `tests/unit/run.test.ts`
- [ ] T003 [P] Add failing tests for `advanceRun` setting `status: "failed"` (not `"active"` or `"completed"`) when `run.reputation <= 0`, including the case where reputation reaches zero on the same transition that would otherwise complete Stage 6, in `tests/unit/run.test.ts`
- [ ] T004 [P] Add failing tests confirming a `"failed"` run's `history`, `credits`, `creditTransactions`, and completed `stages` are identical in shape and completeness to what a `"completed"` run would have at the same point (SC-003) in `tests/unit/run.test.ts`

### Implementation

- [ ] T005 Add `"failed"` to `RunStatus` and `reputation: number` to `Run` (initialized to its fixed authored constant in `createRun`) in `src/simulation/run.ts` (depends on T002)
- [ ] T006 Add the reputation-zero check to `advanceRun`, ahead of its existing stage-completion check, mirroring the existing `"completed"` branch's shape exactly (depends on T003, T005)
- [ ] T007 Run `tests/unit/run.test.ts` foundational cases; confirm GREEN (depends on T005-T006)

**Checkpoint**: `"failed"` exists as a real `RunStatus`, reachable only once `run.reputation` is exposed and decremented — ready for US1 to wire in the actual triggers.

---

## Phase 3: User Story 1 - A run can actually be lost (Priority: P1)

**Goal**: Reputation decrements on an outright PvP loss or a failed sponsor objective (never a tie), and reaching zero ends the run early with a distinct, fully-inspectable outcome.

**Independent Test**: Play a run performing badly enough, repeatedly, to trigger reputation loss; confirm the run ends before Stage 6 with a distinct, legible outcome, and its history up to that point remains inspectable.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T008 [P] [US1] Add failing tests for `applyReputationLoss` decrementing on `trigger: "pvp-loss"` only when `result.outcome === "loss"` (never `"tie"`), and on `trigger: "sponsor-failure"` when a pending sponsor contract fails, in `tests/unit/run.test.ts`
- [ ] T009 [P] [US1] Add failing tests confirming reputation floors at exactly `0` and never goes negative, even from a single large decrement (FR-004), in `tests/unit/run.test.ts`
- [ ] T010 [P] [US1] Add failing tests confirming both triggers can independently fire on the same stage transition (a lost PvP contest that was also the pending sponsor contract's failed objective) and each decrements separately, in `tests/unit/run.test.ts`
- [ ] T011 [P] [US1] Add failing integration test for a full run ending early via `completePvpEncounter` once reputation reaches zero, confirming `status === "failed"` and full history preservation, in `tests/integration/run-flow.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement `applyReputationLoss(run, trigger)` in `src/simulation/run.ts` (depends on T008-T010, Foundational)
- [ ] T013 [US1] Call `applyReputationLoss` from `completePvpEncounter`, before its existing `advanceRun(...)` call, for both the PvP-outcome and sponsor-resolution triggers already computed there, in `src/simulation/run.ts` (depends on T012)
- [ ] T014 [US1] Add `reputationLabel` to `runPresentation.ts` and a `"Failed"` status label, matching the existing `"unavailable"` labeling pattern, in `src/scenes/runPresentation.ts` (depends on T012)
- [ ] T015 [US1] Render reputation alongside credits during an active run, and render a distinct failed-run outcome screen, in `src/scenes/RunScene.ts` (depends on T014)
- [ ] T016 [US1] Run `tests/unit/run.test.ts` and `tests/integration/run-flow.test.ts`; confirm User Story 1 cases are GREEN (depends on T008-T015)

**Checkpoint**: A run can now actually be lost — reputation visibly tracks during play, decrements only on the two authored triggers, and zero reputation ends the run early with a distinct, fully-inspectable outcome.

---

## Phase 4: User Story 2 - Banked credits are worth something (Priority: P1)

**Goal**: Interest is applied to banked credits at stage transitions, recorded as its own transaction, and never manufactures credits from a zero balance.

**Independent Test**: Compare two otherwise-identical runs that differ only in how much credit each banks between encounters; confirm the run that banked more receives a larger interest credit, attributable as its own transaction.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T017 [P] [US2] Add failing tests for `interestFor(bankedCredits)` being pure, deterministic, and `interestFor(0) === 0`, in `tests/unit/run.test.ts`
- [ ] T018 [P] [US2] Add failing tests confirming an `"interest"` transaction is appended at a stage transition when `run.credits > 0`, and confirming no `"interest"` transaction is appended when `run.credits === 0` (FR-008), in `tests/unit/run.test.ts`

### Implementation for User Story 2

- [ ] T019 [US2] Add `"interest"` to `CreditTransactionKind` in `src/simulation/run.ts` (depends on T017, Foundational)
- [ ] T020 [US2] Implement `interestFor` and apply it via the existing `transactionFor`/`appendTransaction` path at the same stage-transition point reputation is checked, skipping the append entirely when the computed amount is zero, in `src/simulation/run.ts` (depends on T018-T019)
- [ ] T021 [US2] Run `tests/unit/run.test.ts`; confirm User Story 2 cases are GREEN (depends on T017-T020)

**Checkpoint**: Banking credits between encounters now yields a larger, attributable interest credit; a zero balance yields none.

---

## Phase 5: User Story 3 - An unwanted item is worth something (Priority: P2)

**Goal**: A player can sell any held item (active or stored) for half its authored price, recorded as its own transaction, with the item removed immediately and irreversibly.

**Independent Test**: Sell a held item; confirm the player receives half its authored price in credits (rounded down) and the item is removed from the build.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T022 [P] [US3] Add failing tests for `sellItem` returning exactly `Math.floor(item.price / 2)` credits and a build with the source position cleared, for both a `"vehicle"` slot source and a `"storage"` source, in `tests/unit/garage.test.ts`
- [ ] T023 [P] [US3] Add failing tests for `sellHeldItem` appending exactly one `"sell-back"` transaction and replacing `run.build` with the sale's result, in `tests/unit/encounters.test.ts`

### Implementation for User Story 3

- [ ] T024 [US3] Add `"sell-back"` to `CreditTransactionKind` in `src/simulation/run.ts` (depends on T022, Foundational)
- [ ] T025 [US3] Implement `sellItem(build, source)` in `src/simulation/garage.ts`, reusing the same source-clearing logic `commitGarageCommand`'s eviction path already has (depends on T022, T024)
- [ ] T026 [US3] Implement `sellHeldItem(run, encounterId, source)` in `src/simulation/encounters.ts`, wrapping `sellItem` with a `"sell-back"` `transactionFor` append (depends on T023, T025)
- [ ] T027 [US3] Add a sell control per held item (active or stored) in `src/scenes/PrepareScene.ts` (depends on T026)
- [ ] T028 [US3] Run `tests/unit/garage.test.ts` and `tests/unit/encounters.test.ts`; confirm User Story 3 cases are GREEN (depends on T022-T027)

**Checkpoint**: Any held item can be sold for half its price, fully attributed, with the item gone from the build immediately.

---

## Phase 6: User Story 4 - Reroll around a card worth keeping (Priority: P2)

**Goal**: A Parts Supplier offer can be locked so a reroll leaves it unchanged while replacing every unlocked offer; locks never persist beyond the encounter instance.

**Independent Test**: Lock one Parts Supplier offer, then reroll; confirm the locked offer is unchanged while every other offer is replaced.

### Tests for User Story 4 (write first and confirm RED)

- [ ] T029 [P] [US4] Add failing tests for `StockEntry.locked` defaulting to `false` on every newly-generated entry, in `tests/unit/encounters.test.ts`
- [ ] T030 [P] [US4] Add failing tests for `toggleLock` flipping exactly one entry's `locked` flag with no credit transaction, and throwing the existing `encounter-id-mismatch`/`invalid-encounter-type` errors when misapplied, in `tests/unit/encounters.test.ts`
- [ ] T031 [P] [US4] Add failing tests confirming `restockSupplier` skips entries where `locked === true` while still replacing every other eligible entry exactly as today (SC-006), in `tests/unit/encounters.test.ts`

### Implementation for User Story 4

- [ ] T032 [US4] Add `locked: boolean` to `StockEntry` (defaulting to `false` wherever a `PartsSupplierPayload` is generated) in `src/simulation/encounters.ts` (depends on T029, Foundational)
- [ ] T033 [US4] Implement `toggleLock(run, encounterId, stockId)` in `src/simulation/encounters.ts` (depends on T030, T032)
- [ ] T034 [US4] Extend `restockSupplier`'s existing per-entry `.map()` to also exempt `locked` entries from replacement, in `src/simulation/encounters.ts` (depends on T031-T032)
- [ ] T035 [US4] Add a lock toggle per Parts Supplier offer in `src/scenes/PrepareScene.ts` (depends on T033-T034)
- [ ] T036 [US4] Run `tests/unit/encounters.test.ts`; confirm User Story 4 cases are GREEN (depends on T029-T035)

**Checkpoint**: A Parts Supplier offer can be locked and rerolled around, unlocked again, and never carries over into a new encounter.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing `RunStatus`/`CreditTransactionKind`/`restockSupplier` behavior and run full validation

- [ ] T037 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing `RunStatus` (`"active"`, `"completed"`, `"unavailable"`) and `CreditTransactionKind` test remains unchanged and passing
- [ ] T038 Grep the codebase for every `switch`/conditional over `RunStatus` and confirm each now has an explicit `"failed"` branch rather than falling through a `default` case (Technical Context constraint, FR-003)
- [ ] T039 Run the local Vite browser through `quickstart.md` Scenarios A-D; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via a run played to reputation zero
- **Phase 4 - US2**: Depends on Foundational only — does not depend on US1's triggers; independently testable via banked-credit comparison
- **Phase 5 - US3**: Depends on Foundational only (needs no reputation/interest machinery); independently testable via a single sell action
- **Phase 6 - US4**: Depends on Foundational only; independently testable via lock-then-reroll
- **Phase 7 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the reputation lose-condition
- **US2 (P1)**: Foundational only; independently validates interest; no dependency on US1
- **US3 (P2)**: Foundational only; independently validates sell-back; no dependency on US1/US2
- **US4 (P2)**: Foundational only; independently validates card-locking; no dependency on US1/US2/US3

### Strict Test-First Order

- T002-T004 MUST be RED before T005-T006 add `"failed"`/`reputation`/the `advanceRun` hook
- T008-T011 MUST be RED before T012-T013 wire in the actual reputation triggers
- T017-T018 MUST be RED before T019-T020 add interest
- T022-T023 MUST be RED before T025-T026 add `sellItem`/`sellHeldItem`
- T029-T031 MUST be RED before T032-T034 add card-locking

---

## Parallel Opportunities

### Foundational hook

```text
T002: RunStatus/reputation type tests in tests/unit/run.test.ts
T003: advanceRun failed-transition tests in tests/unit/run.test.ts
T004: failed-run history-preservation tests in tests/unit/run.test.ts
```

### US1, US2, US3, and US4 are fully independent of each other

```text
US1 (T008-T016): reputation, in run.ts/runPresentation.ts/RunScene.ts
US2 (T017-T021): interest, entirely in run.ts
US3 (T022-T028): sell-back, in garage.ts/encounters.ts/PrepareScene.ts
US4 (T029-T036): card-locking, entirely in encounters.ts/PrepareScene.ts
```

All four can proceed in parallel once Foundational is complete, though
US3 and US4 both touch `src/scenes/PrepareScene.ts` and should be
sequenced or coordinated if worked simultaneously by different people.
Tasks sharing `src/simulation/run.ts` or `src/simulation/encounters.ts`
remain sequential to avoid conflicting contract edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T016.
3. Stop and validate a real reputation-driven run failure independently
   before adding interest, sell-back, or card-locking.

US1 is the MVP: it's the headline mechanic (spec.md's own priority
framing) — every other story is economic texture layered on top.

### Incremental Delivery

1. **Foundational**: `"failed"` `RunStatus`, `Run.reputation`, and the
   `advanceRun` hook, with no trigger wired in yet.
2. **US1**: A run that can actually be lost, with reputation always
   visible.
3. **US2**: Interest on banked credits.
4. **US3**: Half-price item sell-back.
5. **US4**: Parts Supplier card-locking.
6. **Polish**: Full regression against existing `RunStatus`/
   `CreditTransactionKind` behavior, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test
  task; implementation begins only after the listed RED checks fail for
  the expected missing behavior.
- Win/loss streaks are explicitly out of scope for this feature (spec.md
  Assumptions) — no task here adds a placeholder field or transaction
  kind for them.
- FR-012 (fairness) applies to every story: no task should make
  reputation triggers, interest, sell-back value, or card-locking
  availability vary by entrant or purchasable content — T037's
  regression pass is the backstop, not a substitute for building it
  correctly the first time.
