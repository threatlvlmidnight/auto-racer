# Tasks: Character Item Pools

**Input**: Design documents from `/specs/020-character-item-pools/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/item-pools-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the four user stories in `spec.md`, in the delivery order `plan.md` establishes. Foundational proves the pool-resolution logic and fixes the two real `identityTag` bugs (Parts Supplier eligibility, the `"trigger-tagged-items"` sponsor objective) against synthetic data and the *old* catalog first — before any real content exists to gate. US1 wires real draft-time gating. US2 is the 70-item catalog itself, ordered *after* US1 because content authored against an ungated draft would be unverifiable. US3 (cross-pollination) and US4 (rivals) are independent enrichments layered on top.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [X] T001 Confirm no new runtime dependency is required — pool resolution is array lookup/concat, and cross-pollination's guest selection reuses `rivals.ts`'s existing `mulberry32`/`hashSeed` PRNG pattern (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pool-resolution logic (`itemPools.ts`) and the two real `identityTag` bugs this plan found (Parts Supplier eligibility, the `"trigger-tagged-items"` sponsor objective), proven against synthetic fixture pools and the *old* `ITEM_POOL` — nothing wired into real drafting yet, and no dependency on the 70-item catalog existing.

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T002 [P] Add failing tests for `validateItemPools()`'s structural checks — correct counts, duplicate-`id` detection, non-neutral/distinct-lean detection — against small synthetic fixture pools (not the real catalog, which doesn't exist yet), in `tests/unit/itemPools.test.ts` (new file)
- [X] T003 [P] Add failing tests for `poolForEntrant`/`poolForRival`/`poolForCrossPollination`'s pure resolution logic against synthetic fixture pools — each returns exactly the items its own contract names, never a third party's (contract §2), in `tests/unit/itemPools.test.ts`
- [X] T004 [P] Add failing tests confirming `createSupplierPayload`/`restockSupplier` no longer filter eligible stock by `identityTag` — proven against the *old*, still-present `ITEM_POOL` first (so the fix is verified independently of the catalog swap), in `tests/unit/encounters.test.ts`
- [X] T005 [P] Add failing tests confirming `resolvePendingSponsor`'s `"trigger-tagged-items"` branch matches held items via `synergyTags.includes(objective.tag)`, not `identityTag`, and confirming `objectiveForKind` selects `tag` from `SPONSOR_OBJECTIVE_TAGS` deterministically via the `rng` it now accepts (same seed → same tag; different seed → may differ), in `tests/unit/encounters.test.ts`

### Implementation

- [X] T006 [P] Implement `validateItemPools` in `src/simulation/itemPools.ts` — structural checks only (counts, duplicate `id`, lean-distinctness); the `SPONSOR_OBJECTIVE_TAGS` cross-check is added in T009 once that constant exists (depends on T002; data-model.md, research.md Decision 6)
- [X] T007 [P] Implement `poolForEntrant`/`poolForRival`/`poolForCrossPollination` in `src/simulation/itemPools.ts` (depends on T003; contract §2)
- [X] T008 Remove the `identityTag` filter from `createSupplierPayload` and `restockSupplier` (`src/simulation/encounters.ts`) (depends on T004; research.md Decision 3, contract §3)
- [X] T009 Add exported `SPONSOR_OBJECTIVE_TAGS: readonly string[]` constant (`src/simulation/run.ts`, colocated with `SponsorObjective`); rename `SponsorObjective`'s `"trigger-tagged-items"` variant's `identityTag` field to `tag: string`; thread `rng` into `objectiveForKind` (`encounters.ts`) so it selects `tag` from `SPONSOR_OBJECTIVE_TAGS` via that `rng` instead of the single constant `run.identityTag` it reads today; update `resolvePendingSponsor` to match via `synergyTags`; extend `validateItemPools` (`src/simulation/itemPools.ts`, from T006) to import `SPONSOR_OBJECTIVE_TAGS` and confirm every entry matches at least one `Buff`-role item in the pool (depends on T005, T006; research.md Decision 4, contract §4, data-model.md "SponsorObjective — tag rename")
- [X] T010 Run `tests/unit/itemPools.test.ts` and `tests/unit/encounters.test.ts` foundational cases; confirm GREEN (depends on T006-T009)

**Checkpoint**: Pool-resolution logic and both `identityTag` fixes exist and are fully tested in isolation — nothing wired into real drafting or the 70-item catalog yet.

---

## Phase 3: User Story 1 - A player's draft only offers items their own character could plausibly have (Priority: P1)

**Goal**: Standard reward-draft and Parts Supplier offers (including restocks) are gated to Neutral + the player's own entrant's pool.

**Independent Test**: Start a run as each of the 4 entrants in turn; open enough reward drafts/Supplier restocks to sample broadly; confirm every offered item is either in the Neutral pool or that entrant's own exclusive pool, and that no other entrant's exclusive item ever appears.

### Tests for User Story 1 (write first and confirm RED)

- [X] T011 [P] [US1] Add failing tests confirming `createPayload`'s `"reward-draft"` branch draws only from `poolForEntrant(run.identity.entrantId)`, using a small synthetic Neutral + 2-entrant fixture catalog (not the real 70 yet), in `tests/unit/encounters.test.ts`
- [X] T012 [P] [US1] Add failing tests confirming `createSupplierPayload`/`restockSupplier` draw from that same gated pool, in `tests/unit/encounters.test.ts`
- [X] T013 [P] [US1] Add failing tests confirming two different entrants' eligible offer sets differ even under the same seed (spec.md US1 AS3), in `tests/unit/encounters.test.ts`
- [X] T014 [P] [US1] Add a failing integration test confirming a run started as each of the 4 entrants never surfaces an out-of-pool item across many sampled offers, in `tests/integration/entrant-run-flow.test.ts`
- [X] T015 [P] [US1] Add a failing test confirming identical `(run seed, stage)` inputs still produce byte-identical reward-draft/Supplier offers once `chooseEncounter`/`createPayload`/`createSupplierPayload`/`restockSupplier` resolve their own pool internally instead of taking it as a parameter (FR-008) — call the same run/stage twice with the same seed and assert identical offers, in `tests/unit/encounters.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Simplify `chooseEncounter`/`createPayload`/`createSupplierPayload`/`restockSupplier` (`src/simulation/encounters.ts`) to resolve their own pool internally via `itemPools.poolForEntrant(run.identity.entrantId)` — drop the `itemPool` parameter from all four signatures (depends on T011-T013, T015; data-model.md "Signature simplification")
- [X] T016a [US1] Guard `drawItem` (`src/simulation/draft.ts`) against an empty `taggedItems` group — discovered live against the real, identityTag-less `NEUTRAL_ITEMS` catalog: the coin flip landing on the tagged branch (~`tagWeight`, 75%, of draws) indexed into an empty array and returned `undefined`, not the graceful `neutralItems` fallback research.md Decision 2 originally assumed needed no code change (depends on T016; research.md Decision 2, revised)
- [X] T017 [US1] Update call sites: `src/scenes/PrepareScene.ts` and `src/scenes/RunScene.ts` drop their `ITEM_POOL` import and the now-removed argument (depends on T016)
- [X] T018 [US1] Run `tests/unit/encounters.test.ts` and `tests/integration/entrant-run-flow.test.ts` User Story 1 cases; confirm GREEN (depends on T016-T017)

**Checkpoint**: Draft-time gating works end to end against a small synthetic catalog. Nothing here depends on the real 70 items existing — US2 can now safely author content that this gating will actually enforce.

---

## Phase 4: User Story 2 - Each character's pool has its own real identity (Priority: P1)

**Goal**: The real 70-item catalog — 10 Neutral (already locked, data-model.md appendix) plus 15 per entrant, each grounded in that entrant's authored `approach`/`strategyDirections`, each with a distinct non-neutral `physics` lean (FR-010).

**Independent Test**: Inspect each entrant's 15-item pool in isolation; confirm every item is a valid `ItemDefinition` that installs/tiers/simulates correctly with zero engine changes, and that each entrant's set reads as thematically distinct from the others.

**Note**: T020-T023 are creative authoring tasks, not mechanical ones — each follows the same concept-list → lock → stat-block process already used for the Neutral-10 (propose ~10-15 items, iterate with the user, lock, then flesh into full `physics`/`buff`/`synergyEffects` stat blocks), not a one-shot auto-generation. Exact item names/numbers are intentionally not fixed here (spec.md Assumptions, mirroring `018`'s own convention for scoring constants).

### Content

- [X] T019 [US2] Write the locked `NEUTRAL_ITEMS` (all 10, per data-model.md's appendix) into `src/content/items/neutral.ts`
- [X] T019a Add the "value-scaled Buff" engine capability (`Buff.scalesWithFittedValue`, `buffs.ts`/`laps.ts`) ahead of Mercer's items, per explicit user request mid-authoring — boost scales with `sumFittedValue` of fitted (board-only) items; TDD in `tests/unit/buffs.test.ts`/`tests/unit/laps.test.ts` (research.md Decision 8; item-to-item value mutation stays deferred to the Economy follow-up)
- [X] T020 [US2] Author Evelyn Mercer's 15-item exclusive pool in `src/content/items/mercer.ts` (Coachworks) — grounded in "dependable recurring effects and conventional direct performance," "durable builds that protect an accumulated advantage," "wheel, material, and matching-set synergies," "value builds based on appraising, refurbishing, and trading items" (`entrants.ts`)
- [X] T021 [P] [US2] Author Lucien Soto's 15-item exclusive pool in `src/content/items/soto.ts` (Velodrome) — grounded in "frequent triggers and cooldown coordination," "momentum and cadence that reward maintaining a sequence," "lightweight, precisely curated builds," "late-race stamina scaling and explosive sprint finishes"
- [X] T022 [P] [US2] Author Inez Rook's 15-item exclusive pool in `src/content/items/rook.ts` (Fieldworks) — grounded in "aircraft power, propellers, and experimental airflow systems," "multi-axle running gear and unconventional tracking systems," "instrumented heat, pressure, and controlled-limit engineering," and "cross-disciplinary prototypes that connect otherwise unrelated systems"; her items MUST read as intentional, high-quality experiments rather than cobbled-together or resource-starved machinery
- [X] T023 [P] [US2] Author Nell Voss's 15-item exclusive pool in `src/content/items/voss.ts` (Backroads) — grounded in "rulebook engineering through exact conditions and technical loopholes," "late-braking attacks and aggressive but calculated corner entry," "information builds that identify narrow performance opportunities," and "getaway acceleration and decisive high-speed escape"; she MAY bend technical definitions and racing etiquette aggressively but MUST NOT sabotage another machine, deploy hazards, or deliberately cause a collision
- [X] T024 [US2] Assemble `src/content/items/index.ts` — re-exports `NEUTRAL_ITEMS`, builds `EXCLUSIVE_ITEMS: Record<EntrantId, readonly ItemDefinition[]>` from T020-T023 (depends on T019-T023)

### Tests for User Story 2 (write first and confirm RED where feasible; T020-T023 are content, not RED/GREEN cycles — T025-T026 are what actually goes RED-then-GREEN)

- [X] T025 [P] [US2] Add failing tests confirming `validateItemPools()` reports valid against the real, fully-authored catalog — exact counts, no duplicate `id` across all 70, each entrant's summed `physics` lean non-neutral and distinct from the other three's (FR-001, FR-010, SC-005), and every `SPONSOR_OBJECTIVE_TAGS` entry (`run.ts`) matches at least one real `Buff`-role item across the 70-item catalog (contract §4), in `tests/unit/itemPools.test.ts`
- [X] T026 [P] [US2] Add failing tests confirming every one of the 70 items installs, tiers, and simulates correctly on a real generated track, using the engine exactly as it stands after T019a — `synergy.ts`/`tiering.ts` untouched, `laps.ts`/`buffs.ts`'s only change is the deliberate, already-tested value-scaled-buff addition (FR-007, SC-002), in `tests/unit/items.test.ts` (new file)

### Verify

- [X] T027 [US2] Run `tests/unit/itemPools.test.ts` and `tests/unit/items.test.ts` User Story 2 cases; confirm GREEN (depends on T024-T026)

**Checkpoint**: The real 70-item catalog exists, is structurally valid, and every item works correctly in simulation. US1's gating (already built) now enforces something real.

---

## Phase 5: User Story 3 - Occasionally, a run offers a glimpse of another character's item (Priority: P2)

**Goal**: A new cross-pollination encounter lets a player draft from exactly one other entrant's pool for a single offer, without widening their standard pool.

**Independent Test**: Trigger the cross-pollination encounter directly; confirm its offers are drawn from exactly one other entrant's pool (deterministically, from the run's own seed); confirm accepting it adds a normal, fully-functional item with no special-cased simulation behavior.

### Tests for User Story 3 (write first and confirm RED)

- [X] T028 [P] [US3] Add failing tests confirming `poolForCrossPollination` never returns the caller's own pool or `NEUTRAL_ITEMS`, is deterministic per `(seed, encounterId)`, and can select a different guest entrant for a different `encounterId` in the same run (FR-004, FR-008), in `tests/unit/itemPools.test.ts`
- [X] T029 [P] [US3] Add failing tests confirming a `"cross-pollination"` encounter's generated payload carries `guestEntrantId` and offers drawn only from that guest's exclusive pool — never Neutral, never the player's own (US3 AS1), in `tests/unit/encounters.test.ts`
- [X] T030 [P] [US3] Add failing tests confirming a cross-pollinated item, once installed, fires/contributes in simulation exactly like any other held item — no origin-based branch anywhere in `laps.ts` (US3 AS3, FR-007), in `tests/unit/laps.test.ts`

### Implementation for User Story 3

- [X] T031 [US3] Add `"cross-pollination"` to `EncounterType` (`src/simulation/run.ts`) and to `ENCOUNTER_SUMMARIES` (`src/simulation/encounters.ts`) — joins the existing weighted 2-of-N choice-stage selection with zero new scheduling logic (depends on T029; research.md Decision 5)
- [X] T032 [US3] Add `CrossPollinationPayload` to `src/simulation/encounters.ts` (same module as `RewardDraftPayload`/`PartsSupplierPayload`/`SponsorMeetingPayload` — not `types.ts`) and a `createPayload` branch using `poolForCrossPollination` (depends on T028-T030; data-model.md)
- [X] T033 [US3] Run `tests/unit/itemPools.test.ts`, `tests/unit/encounters.test.ts`, and `tests/unit/laps.test.ts` User Story 3 cases; confirm GREEN (depends on T031-T032)

**Checkpoint**: Cross-pollination is real, deterministic, and simulation-transparent.

---

## Phase 6: User Story 4 - Rivals keep drafting sensibly under the new pool structure (Priority: P3)

**Goal**: `resolveRivalBuild` draws each rival's items from Neutral plus the exclusive pool matching that rival's own `vehicleId`'s origin.

**Independent Test**: Resolve several rival builds across all `GHOST_POOL` profiles; confirm every installed/stored item belongs to Neutral or that rival's own vehicle-origin pool.

### Tests for User Story 4 (write first and confirm RED)

- [X] T034 [P] [US4] Add failing tests confirming `resolveRivalBuild` draws from `poolForRival(profile.vehicleId)` across all `GHOST_POOL` profiles — every installed/stored item belongs to Neutral or that rival's own pool (FR-005), in `tests/unit/rivals.test.ts`

### Implementation for User Story 4

- [X] T035 [US4] Update `resolveRivalBuild` (`src/simulation/rivals.ts`) to draw from `itemPools.poolForRival(profile.vehicleId)` instead of the flat `ITEM_POOL` (depends on T034; research.md Decision 7)
- [X] T036 [US4] Run `tests/unit/rivals.test.ts` User Story 4 cases; confirm GREEN (depends on T035)

**Checkpoint**: Rivals never field an item that shouldn't exist on their own vehicle's character.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Migrate or convert the 16 pre-existing `ITEM_POOL`/`item-0XX`-referencing test files (FR-006), remove `ITEM_POOL`, full regression, quickstart validation

- [X] T037 Migrate `tests/fixtures/practice-fixtures.ts` and `tests/fixtures/practice-run-fixtures.ts` from `ITEM_POOL`-sourced `item(id)` lookups to equivalent-value `testItem(...)` literals — preserve every exact `price`/`timeModifier`/`cooldown`/`buff` number so every downstream test's numeric assertions stay unchanged (FR-006)
- [X] T038 Confirm the remaining files referencing `ITEM_POOL`/`item-0XX` directly (`tests/integration/garage-input-parity.test.ts`, `result-scene.test.ts`, `run-flow.test.ts`; `tests/unit/encounters.test.ts`, `garage.test.ts`, `garagePresentation.test.ts`, `itemVisuals.test.ts`, `laps.test.ts`, `playback.test.ts`, `practice.test.ts`, `practicePresentation.test.ts`, `run.test.ts`, `slots.test.ts`) pass unchanged after T037's fixture migration — fix any that reference `ITEM_POOL`/item ids outside the two shared fixtures
- [X] T039 Delete `tests/unit/item-pool.test.ts` — its entire premise (pinning the retired 20-item catalog's exact shipped values against the `010` migration contract) has no subject once `ITEM_POOL` is removed; not a migration candidate under either of FR-006's two options
- [X] T040 Remove `ITEM_POOL` from `src/content/sample-data.ts` (`BASELINE_CAR` stays); confirm no remaining references anywhere in `src/` or `tests/`
- [X] T041 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing test remains passing
- [X] T042 Run the local Vite browser sanity pass and the automated-validation coverage list from `quickstart.md`; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable against a small synthetic catalog — does not need the real 70 items to exist
- **Phase 4 - US2**: Depends on Foundational; ordered after US1 (not before) so content is authored against a real, already-enforced gate, not an ungated draft (plan.md Delivery Order)
- **Phase 5 - US3**: Depends on US1 (the same `createPayload`/pool-resolution machinery) and benefits from US2's real catalog existing, but is independently testable with a synthetic pool if needed
- **Phase 6 - US4**: Depends on Foundational only — genuinely independent of US1-US3 (rivals never go through the draft/encounter code path); ordered last as the smallest, most self-contained piece
- **Phase 7 - Polish**: Depends on all user-story phases (in particular US2 — the real catalog must exist before `ITEM_POOL` can be safely removed)

### User Story Dependencies

- **US1 (P1)**: Foundational only
- **US2 (P1)**: Foundational only, but ordered after US1 for the reason above
- **US3 (P2)**: US1 (shares its pool-resolution wiring)
- **US4 (P3)**: Foundational only; independent of US1-US3

### Strict Test-First Order

- T002-T005 MUST be RED before T006-T009 implement pool resolution and the two `identityTag` fixes
- T011-T015 MUST be RED before T016-T017 wire real draft-time gating
- T025-T026 MUST be RED before the catalog (T019-T024) is considered complete — content that fails validation or simulation is not "done"
- T028-T030 MUST be RED before T031-T032 add the cross-pollination encounter
- T034 MUST be RED before T035 updates `resolveRivalBuild`

---

## Parallel Opportunities

### Foundational tests

```text
T002: validateItemPools structural checks (itemPools.test.ts)
T003: pool resolution functions (itemPools.test.ts)
T004: Parts Supplier identityTag removal (encounters.test.ts)
T005: sponsor objective synergyTags matching + tag-selection (encounters.test.ts)
```

### US2 content authoring

```text
T020: Mercer's pool (items/mercer.ts)
T021: Soto's pool (items/soto.ts)
T022: Rook's pool (items/rook.ts)
T023: Voss's pool (items/voss.ts)
```

Four separate files — this is the reason `items/` is a directory of
per-entrant files rather than one large `items.ts` (plan.md Structure
Decision). T020 is listed without `[P]` only because it's the first of the
four and a natural place to re-confirm the authoring format/notation before
the other three proceed; T021-T023 can genuinely run in parallel with each
other and with T020 once that's established.

### US3/US4 test tasks

```text
T028: poolForCrossPollination determinism (itemPools.test.ts)
T029: cross-pollination payload (encounters.test.ts)
T030: simulation-time non-interference (laps.test.ts)
T034: resolveRivalBuild pool integration (rivals.test.ts)
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T018 — gating works against a small synthetic
   catalog.
3. Stop and validate the concrete case — a player only ever sees items from
   Neutral or their own pool — before authoring the real 70 items.

US1 is the mechanical MVP; US2 is the actual payoff, but only meaningful
once US1's gate is real.

### Incremental Delivery

1. **Foundational**: pool-resolution logic + both `identityTag` fixes,
   tested in isolation against synthetic data and the old catalog.
2. **US1**: real draft-time gating, still against a synthetic catalog.
3. **US2**: the real 70-item catalog, authored against an already-enforced
   gate.
4. **US3**: cross-pollination, enrichment on top of US1's machinery.
5. **US4**: rival integration, independent and smallest.
6. **Polish**: 16-file test migration, `ITEM_POOL` removal, full
   regression, quickstart validation.

---

## Notes

- No task in this document enumerates the 60 exclusive-pool items' exact
  names/numbers — T020-T023 are creative authoring tasks following the
  same interactive concept-list → lock → stat-block process already used
  for the Neutral-10, not auto-generation (spec.md Assumptions).
- `src/simulation/draft.ts` (`drawItem`) receives one task, T016a — a
  one-line guard, not the "zero code change" originally assumed;
  research.md Decision 2 documents the real `undefined`-item bug this fixes.
- `src/simulation/synergy.ts`/`tiering.ts` receive **no task** — untouched,
  verified by T026. `laps.ts`/`buffs.ts` receive exactly one deliberate
  change each, T019a's value-scaled-buff addition (research.md Decision 8)
  — a scope revision to FR-007's original "zero changes" framing, made
  explicitly by the user mid-authoring, not an unplanned gap.
- T039 (deleting `item-pool.test.ts`) is a deliberate removal, not a
  silent one — its own task explains why it doesn't fit either of FR-006's
  two migration options, mirroring how `021` Polish explicitly documented
  removing `018`'s superseded `trackFit` rather than leaving the reasoning
  implicit.
- T009 also introduces `SPONSOR_OBJECTIVE_TAGS` and threads `rng` into
  `objectiveForKind` — a small signature change beyond the plain field
  rename, needed so the sponsor-objective tag choice stays deterministic
  per `(run seed, stage)` (FR-008) instead of becoming either hardcoded or
  unseeded (2026-08-12 remediation, `/speckit.analyze` findings C1/E2).
