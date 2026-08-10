# Tasks: Tag-Targeted Synergy Behavior

**Input**: Design documents from `/specs/014-item-synergy-tags/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/synergy-effect-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. The core `resolveSynergyEffects` engine and its `laps.ts` integration are shared foundational work; Boost-Others (US1) and Self-Conditional (US2) each add one example item proving their shape; live garage inspection (US3) builds on both.

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

**Purpose**: Establish the synergy type vocabulary, the core resolution engine, and its integration into lap simulation — required by every user story

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for the `SynergyTarget`/`SynergyCondition`/`SynergyEffect` type shapes and the new `ItemDefinition.synergyEffects` field in `tests/unit/synergy.test.ts`
- [ ] T003 [P] Add failing tests for `resolveSynergyEffects`: target matching by tag and by category, both condition shapes (`linear-per-count`, `exact-other-count` including `count: 0`), self-exclusion for both `"others"` and `"self"` application, storage items never counted, and determinism across repeated calls, in `tests/unit/synergy.test.ts`
- [ ] T004 [P] Add failing tests for `laps.ts` folding a synergy delta into a slot's effective item alongside any Fitted/Improvised delta, and for `ContributionEvidence.synergy` correctly attributing it, in `tests/unit/laps.test.ts`

### Implementation

- [ ] T005 Define `SynergyTarget`, `SynergyCondition` (discriminated union), `SynergyEffect`, and the new `ItemDefinition.synergyEffects` field in `src/simulation/types.ts` (depends on T002)
- [ ] T006 Implement `resolveSynergyEffects(build)` — reading only `build.slots`, excluding each effect's own source item — in `src/simulation/synergy.ts` (depends on T003, T005)
- [ ] T007 Extend `laps.ts`'s `effectiveItem` to fold `resolveSynergyEffects`'s output on top of the existing Fitted/Improvised delta, and extend `ContributionEvidence` with the `synergy` attribution field (depends on T004, T006)
- [ ] T008 Run `tests/unit/synergy.test.ts` and the foundational cases in `tests/unit/laps.test.ts`; confirm GREEN (depends on T005-T007)

**Checkpoint**: The synergy engine exists, resolves deterministically from active slots only, and its output is folded into simulation with full attribution — ready for both Boost-Others and Self-Conditional content.

---

## Phase 3: User Story 1 - An item that boosts its own kind (Priority: P1)

**Goal**: An item authored with a Boost-Others effect increases other held items sharing its target, attributed to the source item.

**Independent Test**: Hold a Boost-Others item and another item sharing its target tag; resolve a contest; confirm the target item's contribution reflects the boost, attributed to the source item.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T009 [P] [US1] Add failing tests for a Boost-Others item boosting another held item sharing its target, with correct source attribution, and confirming no boost applies when no item shares the target, in `tests/unit/laps.test.ts`
- [ ] T010 [P] [US1] Add failing tests confirming two different Boost-Others items targeting the same third item both apply simultaneously, each separately attributed, in `tests/unit/synergy.test.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Author at least one example Boost-Others item (e.g. targeting the `gearing` tag) in `src/content/sample-data.ts` (depends on T009, Foundational)
- [ ] T012 [US1] Run `tests/unit/laps.test.ts` and `tests/unit/synergy.test.ts`; confirm User Story 1 cases are GREEN (depends on T009-T011)

**Checkpoint**: A Boost-Others item demonstrably strengthens other matching held items, fully attributed.

---

## Phase 4: User Story 2 - An item whose own effect depends on the build around it (Priority: P1)

**Goal**: An item authored with a Self-Conditional effect changes its own contribution based on the count of other matching items held, independent of Boost-Others.

**Independent Test**: Hold a Self-Conditional item alone; confirm its conditional bonus applies. Add a second matching item; confirm the conditional bonus no longer applies while the item's own base effect remains.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T013 [P] [US2] Add failing tests for a Self-Conditional item's own contribution including its conditional bonus when its condition is met (e.g. the `exact-other-count: 0` "lone item" case) and excluding it when not met, in `tests/unit/laps.test.ts`
- [ ] T014 [P] [US2] Add failing tests confirming a Self-Conditional item's unconditional base effect is present regardless of whether its condition is met — the condition only gates the additional bonus, never the base — in `tests/unit/synergy.test.ts`

### Implementation for User Story 2

- [ ] T015 [US2] Author at least one example Self-Conditional item (e.g. "+50 to this item's own effect, and if this is the only Power item held, +50% more") in `src/content/sample-data.ts` (depends on T013, Foundational)
- [ ] T016 [US2] Run `tests/unit/laps.test.ts` and `tests/unit/synergy.test.ts`; confirm User Story 2 cases are GREEN (depends on T013-T015)

**Checkpoint**: A Self-Conditional item's own contribution demonstrably changes with build composition, independent of any Boost-Others mechanism.

---

## Phase 5: User Story 3 - See conditional value live, before racing (Priority: P2)

**Goal**: The garage shows any held item's live synergy-effect value — target, current match count, and whether it currently applies — before any contest resolves.

**Independent Test**: Hold a Boost-Others item and a Self-Conditional item in the same build; open the garage inspector; confirm both show their live, currently-applicable value.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T017 [P] [US3] Add failing tests for `garageItemInspector` returning a `synergyEffects` display array reflecting the current build's live match count and applies/not-applies state for each of the item's authored effects — not just static description text — in `tests/unit/garagePresentation.test.ts`

### Implementation for User Story 3

- [ ] T018 [US3] Extend `garageItemInspector` to accept the current `VehicleBuild` and compute live `synergyEffects` display data in `src/scenes/garagePresentation.ts` (depends on T017, Foundational)
- [ ] T019 [US3] Wire the extended inspector's synergy data into `PrepareScene`'s tooltip text (extending the existing `inspectorText` helper) in `src/scenes/PrepareScene.ts` (depends on T018)
- [ ] T020 [US3] Run `tests/unit/garagePresentation.test.ts`; confirm User Story 3 cases are GREEN (depends on T017-T019)

**Checkpoint**: Every held item with a synergy effect shows its live, build-aware value in the garage, before any contest is resolved.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing buff/count-synergy behavior and run full validation

- [ ] T021 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing `item-012`/`item-014`/`item-015` (identity-tag buff) test remains unchanged and passing (SC-005)
- [ ] T022 Confirm `007-count-synergy-buff`'s existing storage-inclusive counting behavior (`matchingDirectItemCount`) is unaffected — this feature adds a separate, active-only-counting mechanism alongside it, never modifies it
- [ ] T023 Run the local Vite browser through `quickstart.md` Scenarios A-D; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via one example Boost-Others item
- **Phase 4 - US2**: Depends on Foundational only — does not depend on US1's example item or tests; independently testable via one example Self-Conditional item
- **Phase 5 - US3**: Depends on Foundational (needs `resolveSynergyEffects` to exist) and benefits from US1/US2's example items existing to exercise against, but its own inspector-display logic is independently testable with any synergy-bearing item
- **Phase 6 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates Boost-Others
- **US2 (P1)**: Foundational only; independently validates Self-Conditional; no dependency on US1
- **US3 (P2)**: Foundational only for its own logic; most useful once US1/US2's example items exist to inspect

### Strict Test-First Order

- T002-T004 MUST be RED before T005-T007 add the synergy engine and its `laps.ts` integration
- T009-T010 MUST be RED before T011 authors the Boost-Others example item
- T013-T014 MUST be RED before T015 authors the Self-Conditional example item
- T017 MUST be RED before T018-T019 extend the garage inspector

---

## Parallel Opportunities

### Foundational engine boundaries

```text
T002: Type-shape tests in tests/unit/synergy.test.ts
T003: resolveSynergyEffects behavior tests in tests/unit/synergy.test.ts
T004: laps.ts integration tests in tests/unit/laps.test.ts
```

### US1 and US2 are fully independent of each other

```text
US1 (T009-T012): Boost-Others, entirely in laps.test.ts/synergy.test.ts/sample-data.ts
US2 (T013-T016): Self-Conditional, entirely in laps.test.ts/synergy.test.ts/sample-data.ts
```

Both can proceed in parallel once Foundational is complete, though they
touch the same `sample-data.ts` file for their example items and should
be sequenced or coordinated if worked simultaneously by different people.

Tasks sharing `src/simulation/synergy.ts`, `src/simulation/laps.ts`, or
`src/simulation/types.ts` remain sequential to avoid conflicting contract
edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T012.
3. Stop and validate one working Boost-Others item independently before
   adding Self-Conditional or garage-inspection work.

US1 is the MVP: proof that a tag-targeted effect can boost another item,
fully attributed. US2 proves the second, distinct effect shape. US3 makes
both visible before committing to a build.

### Incremental Delivery

1. **Foundational**: The synergy engine and its simulation integration,
   with zero example content yet.
2. **US1**: One working Boost-Others item.
3. **US2**: One working Self-Conditional item, independent of US1.
4. **US3**: Live garage inspection for both.
5. **Polish**: Full regression against existing buff/count-synergy
   behavior, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test task; implementation begins only after the listed RED checks fail for the expected missing behavior.
- This feature adds a new, separate mechanism (`synergyEffects`) alongside the existing `buff` field — it never modifies `buffs.ts` or any identity-tag buff item's behavior (T021-T022 exist specifically to verify this by regression, not just by code review).
- Only two `SynergyCondition` kinds ship in this pass; the discriminated-union shape is what makes a third kind addable later without rework (per `research.md` Decision 2) — no task here should hard-code an assumption that only these two kinds will ever exist.
- No build-wide "active synergies" overview is in scope (FR-013) — US3's task list is deliberately limited to per-item inspector extension.
