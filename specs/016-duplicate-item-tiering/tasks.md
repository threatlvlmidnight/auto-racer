# Tasks: Duplicate Item Tiering

**Input**: Design documents from `/specs/016-duplicate-item-tiering/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/duplicate-tiering-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. The core classification engine (`resolveDuplicateAcquisition`/`applyTierBonus`) is shared foundational work. US1 (tier-upgrade routing + visibility) and US2 (the mechanical payoff in simulation) are independent of each other. US3 (max-tier overflow) extends the same acquisition-routing switch US1 builds, so it depends on US1's routing skeleton existing, not just on Foundational.

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

**Purpose**: Add the `tier` field, the pure classification/bonus engine, and new-item tier initialization — required by every user story

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for `VehicleSlotState`/`StoredPosition` gaining `tier: 1 | 2 | 3`, defaulting to `1` on a freshly-placed item, in `tests/unit/garage.test.ts`
- [ ] T003 [P] Add failing tests for `resolveDuplicateAcquisition` classifying `"new"` (no match), `"tier-upgrade"` (match at ★1/★2, on the board or in storage), and `"max-tier-convert"` (match at ★3, with the correct `Math.floor(item.price / 2)` credits), plus determinism across repeated calls, in `tests/unit/tiering.test.ts`
- [ ] T004 [P] Add failing tests for `applyTierBonus`: ★1 is a no-op, ★2/★3 scale the item's own `timeModifier`/`buff.boostPercent` by the fixed per-tier percentage, and the input item is never mutated, in `tests/unit/tiering.test.ts`

### Implementation

- [ ] T005 Add `tier` to `VehicleSlotState`/`StoredPosition` and `"duplicate-conversion"` to `CreditTransactionKind` in `src/simulation/types.ts` (depends on T002)
- [ ] T006 Implement `resolveDuplicateAcquisition(build, item)` and `applyTierBonus(item, tier)` in new `src/simulation/tiering.ts` (depends on T003-T004)
- [ ] T007 Update `commitGarageCommand`'s new-placement paths in `src/simulation/garage.ts` to initialize `tier: 1` (depends on T005)
- [ ] T008 Run `tests/unit/garage.test.ts` and `tests/unit/tiering.test.ts` foundational cases; confirm GREEN (depends on T005-T007)

**Checkpoint**: Tier exists as real per-position state; the pure classification and bonus engine exists and is fully tested in isolation — ready for both acquisition routing (US1/US3) and simulation integration (US2).

---

## Phase 3: User Story 1 - A second copy upgrades what you already have (Priority: P1)

**Goal**: Acquiring a duplicate of a held item (below ★3) upgrades it in place instead of occupying a new slot or storage position, and every offer of an already-held item shows this outcome before the player commits.

**Independent Test**: Hold an item, then acquire another copy of that same item; confirm no new position is occupied and the held copy's tier increases by exactly one.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T009 [P] [US1] Add failing tests for `purchaseStock`/`acceptReward` calling `resolveDuplicateAcquisition` first: a `"new"` resolution proceeds exactly as today (placement required), and a `"tier-upgrade"` resolution updates only the matched position's tier, never calls `commitGarageCommand`, and never requires a `placement`, in `tests/unit/encounters.test.ts`
- [ ] T010 [P] [US1] Add failing tests for `previewAcquisitionResolution` matching `resolveDuplicateAcquisition`'s output for the same build/item, and reflecting a build change made earlier within the same encounter, in `tests/unit/garagePresentation.test.ts`
- [ ] T011 [P] [US1] Add failing tests for `garageItemInspector` showing a held item's current tier, in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Wire `resolveDuplicateAcquisition` into `purchaseStock` and `acceptReward` in `src/simulation/encounters.ts`, handling the `"new"` and `"tier-upgrade"` branches (leave `"max-tier-convert"` to throw `invalid-action` for now — completed in US3) (depends on T009, Foundational)
- [ ] T013 [US1] Implement `previewAcquisitionResolution` in `src/scenes/garagePresentation.ts`, re-exporting `resolveDuplicateAcquisition` against the live build (depends on T010)
- [ ] T014 [US1] Extend `garageItemInspector` to show a held item's current tier in `src/scenes/garagePresentation.ts` (depends on T011)
- [ ] T015 [US1] Render tier badges on held items and label each Parts Supplier/Reward Draft offer with its tier-upgrade outcome (where applicable) in `src/scenes/PrepareScene.ts` (depends on T012-T014)
- [ ] T016 [US1] Run `tests/unit/encounters.test.ts` and `tests/unit/garagePresentation.test.ts`; confirm User Story 1 cases are GREEN (depends on T009-T015)

**Checkpoint**: A duplicate acquisition below ★3 demonstrably upgrades the held item in place, visibly, and the player can see this outcome before committing.

---

## Phase 4: User Story 2 - A higher tier is measurably stronger (Priority: P1)

**Goal**: A tiered item's own effect is boosted in simulation, composing correctly with installation behavior and synergy effects, and its live effective value is inspectable beforehand.

**Independent Test**: Compare an item's contribution in a resolved contest at ★1 versus ★3 (all else equal); confirm the ★3 version contributes measurably more.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T017 [P] [US2] Add failing tests for `laps.ts` folding `applyTierBonus` into both board and storage located items, ahead of installation and synergy, confirming all three compose without any being dropped, in `tests/unit/laps.test.ts`
- [ ] T018 [P] [US2] Add failing tests for `garageItemInspector` showing a tiered item's live effective value (base effect plus tier bonus), in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 2

- [ ] T019 [US2] Fold `applyTierBonus` into `laps.ts`'s `simulatePlayerLaps` for both board and storage located items, ahead of the existing installation fold (depends on T017, Foundational)
- [ ] T020 [US2] Extend `garageItemInspector`'s effective-value display to reflect the current tier bonus in `src/scenes/garagePresentation.ts` (depends on T018)
- [ ] T021 [US2] Run `tests/unit/laps.test.ts` and `tests/unit/garagePresentation.test.ts`; confirm User Story 2 cases are GREEN (depends on T017-T020)

**Checkpoint**: A ★3 item demonstrably outperforms the same item at ★1 in a resolved contest, composing correctly with installation and synergy, and its live value is visible beforehand.

---

## Phase 5: User Story 3 - A copy at max tier isn't wasted (Priority: P2)

**Goal**: Acquiring another copy of an already-★3 item converts to credits instead of being blocked or discarded, with the outcome visible before commit.

**Independent Test**: Hold an item already at ★3, then acquire another copy of it; confirm the acquisition converts to credits instead of being blocked, silently discarded, or creating a fourth tier.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T022 [P] [US3] Add failing tests for `purchaseStock`/`acceptReward` handling a `"max-tier-convert"` resolution: exactly one `"duplicate-conversion"` transaction appended for the correct amount, `run.build` untouched, and the acquisition's existing consumption behavior (stock marked purchased / offer marked consumed) still occurs, in `tests/unit/encounters.test.ts`
- [ ] T023 [P] [US3] Add failing tests for `previewAcquisitionResolution` showing the exact credit amount for an offer matching an already-★3 held item, in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 3

- [ ] T024 [US3] Extend `purchaseStock`/`acceptReward`'s routing in `src/simulation/encounters.ts` to handle `"max-tier-convert"` — append a `"duplicate-conversion"` transaction via the existing `transactionFor` path, leaving `run.build` unchanged (depends on T022, US1's routing skeleton from T012)
- [ ] T025 [US3] Label max-tier offers with their exact credit conversion amount in `src/scenes/PrepareScene.ts` (depends on T023-T024)
- [ ] T026 [US3] Run `tests/unit/encounters.test.ts` and `tests/unit/garagePresentation.test.ts`; confirm User Story 3 cases are GREEN (depends on T022-T025)

**Checkpoint**: A duplicate acquired at max tier always converts to credits, visibly and attributably, never blocked or silently discarded.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing acquisition/installation/synergy/sell-back behavior and run full validation

- [ ] T027 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing acquisition test for an item not already held, every existing installation/synergy test, and every `015-economy-depth` sell-back test remains unchanged and passing
- [ ] T028 Confirm `resolveDuplicateAcquisition`'s classification never varies between the Parts Supplier and Reward Draft acquisition paths for equivalent build/item inputs (FR-010, FR-009 fairness)
- [ ] T029 Run the local Vite browser through `quickstart.md` Scenarios A-D; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via a single duplicate acquisition below ★3
- **Phase 4 - US2**: Depends on Foundational only — does not depend on US1's routing; independently testable via a ★1-vs-★3 contest comparison
- **Phase 5 - US3**: Depends on Foundational and on US1's routing skeleton (T012) existing, since it extends the same `purchaseStock`/`acceptReward` switch rather than introducing a separate one
- **Phase 6 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the tier-upgrade mechanic and its pre-commit visibility
- **US2 (P1)**: Foundational only; independently validates the mechanical payoff in simulation; no dependency on US1
- **US3 (P2)**: Foundational + US1's routing skeleton; independently testable via its own scenario, but not independently *implementable* before US1's routing exists

### Strict Test-First Order

- T002-T004 MUST be RED before T005-T007 add `tier`/the classification engine/garage init
- T009-T011 MUST be RED before T012-T014 wire in routing, preview, and tier display
- T017-T018 MUST be RED before T019-T020 fold tier into simulation and the inspector's effective value
- T022-T023 MUST be RED before T024-T025 add max-tier routing and its offer label

---

## Parallel Opportunities

### Foundational engine boundaries

```text
T002: tier field tests in tests/unit/garage.test.ts
T003: resolveDuplicateAcquisition tests in tests/unit/tiering.test.ts
T004: applyTierBonus tests in tests/unit/tiering.test.ts
```

### US1 and US2 are fully independent of each other

```text
US1 (T009-T016): acquisition routing + visibility, in encounters.ts/garagePresentation.ts/PrepareScene.ts
US2 (T017-T021): simulation payoff, in laps.ts/garagePresentation.ts
```

Both can proceed in parallel once Foundational is complete, though both
touch `src/scenes/garagePresentation.ts` and should be sequenced or
coordinated if worked simultaneously by different people. US3 should
start only after US1's T012 (the routing skeleton) lands, since it
extends the same switch rather than adding a parallel one.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T016.
3. Stop and validate a real duplicate-to-tier-upgrade acquisition
   independently before adding the simulation payoff or max-tier
   handling.

US1 is the MVP: it's the headline mechanic (spec.md's own priority
framing). US2 proves it actually matters mechanically. US3 closes the
one remaining edge case.

### Incremental Delivery

1. **Foundational**: `tier` field, `resolveDuplicateAcquisition`,
   `applyTierBonus`, with no acquisition routing or simulation
   integration wired in yet.
2. **US1**: A duplicate acquisition below ★3 upgrades in place, visibly,
   before and after commit.
3. **US2**: A tiered item's own effect is measurably stronger in a
   resolved contest.
4. **US3**: A duplicate at max tier converts to credits instead of being
   wasted.
5. **Polish**: Full regression against existing acquisition/
   installation/synergy/sell-back behavior, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test
  task; implementation begins only after the listed RED checks fail for
  the expected missing behavior.
- Tier is state on the held position, never on `ItemDefinition` itself
  (per `research.md` Decision 1) — no task here should add a `tier`
  field to the shared item catalog.
- `015-economy-depth`'s sell-back formula and `"sell-back"` transaction
  kind are explicitly untouched by this feature (FR-008) — T027's
  regression pass is the backstop, not a substitute for building the
  routing correctly the first time.
