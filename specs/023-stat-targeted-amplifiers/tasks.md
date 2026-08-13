# Tasks: Stat-Targeted Amplifiers

**Input**: Design documents from `/specs/023-stat-targeted-amplifiers/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/stat-targeted-amplifiers-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the five user stories in `spec.md`. US1 does the real architectural work — moving physics resolution inside the per-lap loop and wiring non-stacking stat-targeting through it — because once that exists, US2 (stacking growth/decay) is "just" extending the stacking accumulation formula buffs.ts already has for time-targets into a new output bucket; the per-lap machinery to make that growth actually show up in simulated stats is already there from US1. US3 (zero-regression) is checked comprehensively only once both US1 and US2 exist, mirroring `021`/`022`'s own "prove nothing broke once the mechanism is fully built" ordering. US4 (inspectability) and US5 (tiering) build on top last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US5 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [X] T001 Confirm no new runtime dependency is required — stat-targeted amplification is the same percent-of-own-value arithmetic `buffs.ts`/`synergy.ts`/`laps.ts` already use — and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define `StatTarget` and the two shapes that carry it (`Buff`, `SynergyEffect`), plus the pure structural eligibility helper, tested in complete isolation before any resolution-pipeline wiring

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T002 [P] Add failing tests for the `StatTarget` type shape and `Buff.targetStat`/`SynergyEffect.targetStat` coexisting with every existing field, `undefined` and `"time"` treated identically wherever read, in `tests/unit/buffs.test.ts` and `tests/unit/synergy.test.ts`
- [X] T003 [P] Add failing tests for the pure `hasDeltaForStat(item, stat)` eligibility helper: `true` when `item.physics` has the matching delta field, `true` when any `item.conditionalPhysics` entry's `delta` has it (regardless of whether that entry's own condition would match any real track), `false` otherwise; pure and deterministic, in `tests/unit/buffs.test.ts`

### Implementation

- [X] T004 [P] Define `StatTarget` in `src/simulation/types.ts`; add `targetStat?: StatTarget` to `Buff` and to `SynergyEffect` (depends on T002; data-model.md)
- [X] T005 Implement `hasDeltaForStat` in `src/simulation/buffs.ts` (depends on T003; contract §2, research.md Decision 2/6)
- [X] T006 Run `tests/unit/buffs.test.ts`/`tests/unit/synergy.test.ts` foundational cases; confirm GREEN (depends on T004-T005)

**Checkpoint**: The `StatTarget` shape and the eligibility helper exist and are fully tested in isolation — nothing wired into the resolution pipeline yet.

---

## Phase 3: User Story 1 - A Buff or Synergy item amplifies a specific physical stat (Priority: P1)

**Goal**: Flat and count-synergy Buffs, and both Synergy roles (Boost-Others/Self-Conditional), can target a physical stat and measurably amplify a matching held item's resolved delta. This story also moves `resolvePhysicalStats`/`resolveConditionalPhysicsContributions`/`simulateLapPhysics` inside `simulatePlayerLaps`'s per-lap loop — the real architectural shift the whole feature needs — even though at this story's own scope (no stacking yet) the resolved values happen to come out lap-invariant in practice.

**Independent Test**: Author a test item with a `physics.accelerationDelta` and no `timeModifier`; author a second test item whose flat Buff targets `acceleration`; simulate both held together on a real generated track; confirm the first item's effective acceleration — and simulated lap time — measurably changes relative to holding it alone.

### Tests for User Story 1 (write first and confirm RED)

- [X] T007 [P] [US1] Add failing tests confirming `computeBoostsForLap`'s new `boostsByStat` output for a **flat** stat-targeted Buff: eligibility via `hasDeltaForStat` (not `identityTag`), magnitude equals `boostPercent` whenever at least one other active item is eligible, in `tests/unit/buffs.test.ts`
- [X] T008 [P] [US1] Add failing tests confirming `boostsByStat` for a **count-synergy** stat-targeted Buff (`buff.perCount`): magnitude equals `boostPercent × matchingDirectItemCount`, same counting rule already used for time-targets, in `tests/unit/buffs.test.ts`
- [X] T009 [P] [US1] Add failing tests confirming every existing **time-targeted** Buff (flat, stacking, count-synergy) produces byte-identical `boostsByTag` output after `boostsByStat` is added — the two output buckets are fully independent, in `tests/unit/buffs.test.ts`
- [X] T010 [P] [US1] Add failing tests confirming `resolveSynergyEffects`'s `SynergyResolution.appliedDeltaPercent` becomes a per-`StatTarget` map: a target item matching two different source items' Boost-Others effects that target two *different* stats receives both, independently; the existing `.time`-keyed value is unchanged for every pre-existing synergy test, in `tests/unit/synergy.test.ts`
- [X] T011 [P] [US1] Add failing tests confirming end-to-end: a stat-targeted flat Buff measurably changes a matching held item's resolved `PhysicalStats` and simulated lap time on a real generated track, relative to holding the target item alone, in `tests/unit/laps.test.ts`
- [X] T012 [P] [US1] Add failing tests confirming end-to-end: a stat-targeted Synergy effect (Boost-Others) measurably changes a matching held item's resolved stat, in `tests/unit/laps.test.ts`
- [X] T013 [P] [US1] Add failing tests confirming a stat-targeted amplifier (Buff or Synergy) whose only held candidate has no delta for the targeted stat contributes exactly 0 for that candidate — no error, no fallback stat (spec.md FR-004), in `tests/unit/laps.test.ts`
- [X] T014 [P] [US1] Add failing tests confirming compounding composition: a target item held under both a stat-targeted Synergy effect and a stat-targeted flat Buff simultaneously receives `base * (1 + synergyPercent/100) * (1 + buffPercent/100)` — not `base * (1 + (synergyPercent + buffPercent)/100)` (contract §3, research.md Decision 4), in `tests/unit/laps.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Extend `effectiveItem`/`foldPercentDelta` (`src/simulation/laps.ts`) to fold a stat-targeted synergy percent into an item's own `physics`/`conditionalPhysics` deltas, once, before the per-lap loop (depends on T010, T012, T014; contract §3, research.md Decision 4)
- [X] T016 [US1] Extend `computeBoostsForLap` (`src/simulation/buffs.ts`) to compute `boostsByStat` for flat and count-synergy Buffs using `hasDeltaForStat` eligibility (depends on T007-T009; contract §2)
- [X] T017 [US1] Extend `resolvePhysicalStats`/`resolveConditionalPhysicsContributions` (`src/simulation/laps.ts`) to accept a `boostsByStat` parameter and apply it multiplicatively to each active item's matching delta field(s) (depends on T011, T013, T016; contract §3, data-model.md)
- [X] T018 [US1] Move the `resolvePhysicalStats`/`resolveConditionalPhysicsContributions`/`simulateLapPhysics` calls inside `simulatePlayerLaps`'s per-lap loop (`src/simulation/laps.ts`), threading that lap's own `computeBoostsForLap().boostsByStat` through; set `PlayerLap.physics.stats` to that lap's own resolved stats (depends on T015-T017; contract §4, research.md Decision 5/7 — `simulateLapPhysics`'s own signature in `src/simulation/tracks.ts` is untouched)
- [X] T019 [US1] Run `tests/unit/buffs.test.ts`, `tests/unit/synergy.test.ts`, and `tests/unit/laps.test.ts` User Story 1 cases; confirm GREEN (depends on T015-T018)

**Checkpoint**: A stat-targeted flat Buff or Synergy effect works end to end through a real build and a real generated track. Physics resolution now genuinely happens per lap, even though nothing yet makes it vary lap to lap.

---

## Phase 4: User Story 2 - A stacking Buff's stat amplification grows or shrinks over the race (Priority: P1)

**Goal**: Extend the stacking accumulation formula `computeBoostsForLap` already has for time-targets (`previousBoost + boostPercent`, gated by `firesOnLap`) into the `boostsByStat` bucket too. Because US1 already made physics resolution run fresh every lap using that lap's own `boostsByStat`, growth/decay shows up automatically once this one accumulation branch is wired — this story validates and extends, it does not rebuild the per-lap architecture.

**Independent Test**: Author a stat-targeted stacking Buff with a positive `boostPercent` and a short `cooldown`; hold it alongside a matching item; simulate a multi-lap run; confirm the targeted stat's effective value strictly increases at each firing. Repeat with a negative `boostPercent`; confirm it strictly decreases.

### Tests for User Story 2 (write first and confirm RED)

- [X] T020 [P] [US2] Add failing tests confirming `computeBoostsForLap`'s `boostsByStat` for a **stacking** stat-targeted Buff accumulates `previousBoost + boostPercent` on each `firesOnLap` firing — identical formula to today's time-target stacking, just keyed by stat — in `tests/unit/buffs.test.ts`
- [X] T021 [P] [US2] Add failing tests confirming end-to-end: a stat-targeted stacking Buff with a **positive** `boostPercent` produces a strictly larger effective value for its targeted stat at lap 10 than at lap 1 (`PlayerLap.physics.stats`), given at least one intervening firing, in `tests/unit/laps.test.ts`
- [X] T022 [P] [US2] Add failing tests confirming the same setup with a **negative** `boostPercent` produces a strictly smaller effective value at lap 10 than at lap 1, in `tests/unit/laps.test.ts`
- [X] T023 [P] [US2] Add failing tests confirming a build using only flat/count-synergy Buffs and/or Synergy effects (no stacking stat-target) produces `PhysicalStats` identical across every lap — this story's own new capability must not introduce variance where nothing stacks, in `tests/unit/laps.test.ts`
- [X] T023a [P] [US2] Add failing tests confirming a build holding both a stat-targeted Synergy effect (on one held item) and an unrelated stat-targeted stacking Buff (on a different held item) produces a Synergy-attributable portion of the resolved stat that is identical across every lap, while the Buff-attributable portion strictly grows — verified by comparing `PlayerLap.physics.stats`/contribution evidence across laps (spec.md FR-012, quickstart.md coverage item 6, `/speckit.analyze` finding E1), in `tests/unit/laps.test.ts`

### Implementation for User Story 2

- [X] T024 [US2] Extend `computeBoostsForLap`'s stacking branch (`src/simulation/buffs.ts`) to also accumulate into `boostsByStat` when a stacking Buff's `targetStat` names a physical stat, using the existing `firesOnLap`-gated accumulation formula (depends on T020, T023a; contract §4)
- [X] T025 [US2] Run `tests/unit/buffs.test.ts` and `tests/unit/laps.test.ts` User Story 2 cases; confirm GREEN (depends on T024 — T021-T023 are expected GREEN once T024 lands, since US1 already built the per-lap resolution path; T023a additionally proves Synergy's own lap-invariance holds even alongside T024's new stacking behavior)

**Checkpoint**: A stat-targeted stacking Buff's effect measurably grows or shrinks across a real multi-lap run.

---

## Phase 5: User Story 3 - Builds unaffected by this feature simulate identically to today (Priority: P1)

**Goal**: Every build that doesn't use a lap-varying stat-targeted amplifier produces byte-for-byte identical output to today's shipped behavior — proven comprehensively now that US1 (per-lap architecture) and US2 (stacking extension) both exist.

**Independent Test**: Run the full existing regression suite unmodified; confirm every test still passes. Simulate a build using only flat/count-synergy Buffs, Synergy effects, or legacy `timeModifier` items before and after this feature; confirm identical per-lap results, lap for lap.

### Tests for User Story 3 (write first and confirm RED — expected to already be GREEN if US1/US2 were done correctly; this phase exists to prove that, not to add new behavior)

- [X] T026 [P] [US3] Confirm every existing Buff/Synergy/Tiering/physics test (`tests/unit/buffs.test.ts`, `tests/unit/synergy.test.ts`, `tests/unit/laps.test.ts`, `tests/unit/tiering.test.ts`, `tests/unit/tracks.test.ts`, `tests/unit/contest.test.ts`, `tests/integration/run-flow.test.ts`) remains byte-for-byte unchanged after US1/US2's changes
- [X] T027 [P] [US3] Add a failing test confirming a build with no active lap-varying stat-targeted amplifier resolves `PhysicalStats` — computed fresh each lap with an all-zero `boostsByStat` — to a value `toEqual`-identical, every lap, to the same build's pre-feature once-per-build computation, in `tests/unit/laps.test.ts`
- [X] T028 [P] [US3] Add a failing test confirming a build using only legacy time-targeted Buffs/Synergy effects (no `targetStat` authored anywhere) produces byte-for-byte identical `PlayerLap` output (times, contributions, phases) to its pre-feature output, using the same real fixtures existing tests already use, in `tests/unit/laps.test.ts`

### Implementation for User Story 3

- [X] T029 [US3] Fix any regression found by T026-T028 (expected: none — research.md Decision 5's IEEE754-exactness argument was built for exactly this) (depends on T026-T028, US1, US2)

**Checkpoint**: Zero regression confirmed and locked in before inspectability/tiering work continues.

---

## Phase 6: User Story 4 - A stat-targeted amplifier's activity is fully inspectable, lap by lap (Priority: P2)

**Goal**: `PlayerLap.physics.stats` is verifiably correct per lap (not assumed from US1/US2's wiring); `BuffApplication`/`SynergyApplication` identify which stat was targeted and whether a match was found.

**Independent Test**: Simulate a multi-lap run holding a lap-varying stat-targeted stacking Buff; inspect `PlayerLap.physics.stats` across several laps; confirm the values differ by an amount traceable directly to the buff's own authored `boostPercent`/`cooldown` and lap number, without re-deriving from the simulation.

### Tests for User Story 4 (write first and confirm RED)

- [X] T030 [P] [US4] Add failing tests confirming `BuffApplication` gains `targetStat` (always present) and `appliedStatDelta` (populated only when `targetStat !== "time"`); `appliedSeconds` populated only when `targetStat === "time"` — the two never both nonzero for the same application, in `tests/unit/laps.test.ts`
- [X] T031 [P] [US4] Add failing tests confirming `SynergyApplication` gains `targetStat`, always present and correct for every existing and new synergy test fixture, in `tests/unit/synergy.test.ts`
- [X] T032 [P] [US4] Add failing tests confirming two different laps' `PlayerLap.physics.stats` under a lap-varying stacking Buff differ in exactly the targeted stat, by an amount computable directly from the buff's own authored `boostPercent`/`cooldown` and which lap it is — verified against the buff's own authored fields, not re-derived from the simulation output (spec.md US4 Independent Test), in `tests/unit/laps.test.ts`

### Implementation for User Story 4

- [X] T033 [US4] Extend `BuffApplication` construction (`src/simulation/laps.ts`) to populate `targetStat`/`appliedStatDelta`/`appliedSeconds` per contract §5 (depends on T030)
- [X] T034 [US4] Extend `SynergyApplication` construction (`src/simulation/synergy.ts`) to populate `targetStat` (depends on T031)
- [X] T035 [US4] Run `tests/unit/laps.test.ts` and `tests/unit/synergy.test.ts` User Story 4 cases; confirm GREEN (depends on T032-T034 — `PlayerLap.physics.stats`' own per-lap correctness needs no further change, only verification, since US1/US2 already wired it)

**Checkpoint**: Every stat-targeted amplifier's activity is inspectable, matching Constitution Principle III.

---

## Phase 7: User Story 5 - Duplicate-tiered items scale their own physical contribution too (Priority: P3)

**Goal**: `applyTierBonus` scales a held item's own resolved `physics`/`conditionalPhysics` deltas the same way it already scales `timeModifier`/`buff.boostPercent`.

**Independent Test**: Hold a tier-3 copy of a Physics-role item; compare its resolved stat delta against a tier-1 copy of the same item; confirm the tier-3 delta is `TIER_BONUS_PERCENT * 2` percent larger.

### Tests for User Story 5 (write first and confirm RED)

- [X] T036 [P] [US5] Add failing tests confirming `applyTierBonus` scales a tiered item's `physics` delta field(s) by `TIER_BONUS_PERCENT * (tier - 1)` percent, for tier 2 and tier 3, in `tests/unit/tiering.test.ts`
- [X] T037 [P] [US5] Add failing tests confirming `applyTierBonus` scales every `conditionalPhysics` entry's `delta` field(s) the same way, in `tests/unit/tiering.test.ts`
- [X] T038 [P] [US5] Add failing tests confirming end-to-end: a tier-3 duplicate's contribution to a matching phase (via `simulateLapPhysics`) is measurably larger than a tier-1 copy's, on a real generated track, in `tests/unit/laps.test.ts`

### Implementation for User Story 5

- [X] T039 [US5] Extend `applyTierBonus` (`src/simulation/tiering.ts`) to scale `physics`/`conditionalPhysics` delta fields (depends on T036-T037; contract §6)
- [X] T040 [US5] Run `tests/unit/tiering.test.ts` and `tests/unit/laps.test.ts` User Story 5 cases; confirm GREEN (depends on T038-T039)

**Checkpoint**: A duplicate-tiered Physics-role item is measurably stronger than a single copy, matching what a tiered legacy item already gets.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Full regression pass and quickstart validation

- [X] T041 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing test remains passing
- [X] T042 Grep the codebase for consistent naming of `StatTarget`/`targetStat`/`boostsByStat`/`hasDeltaForStat` — no drift between `types.ts`, `buffs.ts`, `synergy.ts`, `laps.ts`, `tiering.ts`, and their tests
- [X] T043 Run the local Vite browser sanity pass and the automated-validation coverage list from `quickstart.md`; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via the concrete flat-Buff/Synergy stat-targeting example — also does the per-lap architectural move every later story relies on
- **Phase 4 - US2**: Depends on US1 (T015-T018, the per-lap architecture) — cannot run first, since stacking growth has nothing to manifest through without it
- **Phase 5 - US3**: Depends on US1 and US2 — proves both together didn't regress anything, so it cannot run before either
- **Phase 6 - US4**: Depends on US1 and US2 (real per-lap values to inspect) and benefits from US3's regression guard being locked in first
- **Phase 7 - US5**: Depends on Foundational only (its own change is independent of the Buff/Synergy resolution pipeline) — ordered last because it's the smallest, most self-contained story, not because of a hard dependency
- **Phase 8 - Polish**: Depends on all user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates stat-targeting for flat/count-synergy Buffs and Synergy effects
- **US2 (P1)**: Foundational + US1's per-lap architecture; independently validates stacking growth/decay
- **US3 (P1)**: Foundational + US1 + US2; pure verification, no new behavior
- **US4 (P2)**: Foundational + US1 + US2; independently validates inspectability
- **US5 (P3)**: Foundational only; independently validates Tiering's own, unrelated fix

### Strict Test-First Order

- T002-T003 MUST be RED before T004-T005 add the `StatTarget` shape and eligibility helper
- T007-T014 MUST be RED before T015-T018 wire stat-targeting into the resolution pipeline
- T020-T023 MUST be RED (T021-T023 expected to already be GREEN once T024 lands) before T024 extends the stacking accumulation branch
- T023a MUST be RED before T024 — unlike T023, T023a depends on the Buff actually growing (T024's own change) to be meaningfully RED, so it belongs with T020-T022's genuine RED set, not T023's
- T026-T028 MUST be confirmed (RED only if a real regression exists — expected GREEN) before T029's fix, if any
- T030-T032 MUST be RED before T033-T034 extend `BuffApplication`/`SynergyApplication`
- T036-T038 MUST be RED before T039 extends `applyTierBonus`

---

## Parallel Opportunities

### Foundational tests

```text
T002: StatTarget/targetStat shape tests (buffs.test.ts, synergy.test.ts)
T003: hasDeltaForStat eligibility tests (buffs.test.ts)
```

### US1 test tasks

```text
T007: flat stat-targeted Buff (buffs.test.ts)
T008: count-synergy stat-targeted Buff (buffs.test.ts)
T009: time-target zero-regression at the unit level (buffs.test.ts)
T010: per-stat SynergyResolution map (synergy.test.ts)
T011: end-to-end flat Buff amplification (laps.test.ts)
T012: end-to-end Synergy amplification (laps.test.ts)
T013: no-match zero contribution (laps.test.ts)
T014: compounding composition (laps.test.ts)
```

T007-T010 share `buffs.test.ts`/`synergy.test.ts`; T011-T014 share
`laps.test.ts`. The two file groups can be worked fully in parallel with
each other.

### US2/US4/US5 test tasks

```text
T020-T023a: stacking growth/decay + no-stack invariance + Synergy-stays-invariant-alongside-Buff (buffs.test.ts, laps.test.ts)
T030-T032: BuffApplication/SynergyApplication/per-lap inspectability (laps.test.ts, synergy.test.ts)
T036-T038: Tiering physics scaling (tiering.test.ts, laps.test.ts)
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T019.
3. Stop and validate the concrete motivating case — a flat Buff or Synergy
   effect measurably amplifying a Physics-role item's resolved stat — works
   correctly, before proving stacking growth, zero regression,
   inspectability, or Tiering.

US1 is the MVP: it unblocks the immediate content-authoring need (stat-
targeted Buff/Synergy items) and, as a side effect of doing so correctly,
already builds the per-lap architecture US2 depends on.

### Incremental Delivery

1. **Foundational**: `StatTarget` shape and the pure eligibility helper —
   tested in isolation, nothing wired in yet.
2. **US1**: Stat-targeted Buff/Synergy wired into the resolution pipeline;
   physics resolution moves inside the per-lap loop.
3. **US2**: Stacking accumulation extended to the new `boostsByStat`
   bucket — growth/decay over a race becomes real.
4. **US3**: Confirmation that nothing that didn't opt in changed.
5. **US4**: Full per-lap inspectability of stat-targeted activity.
6. **US5**: Tiering scales a held item's own physics contribution too.
7. **Polish**: Full regression pass, quickstart validation.

---

## Notes

- T015-T018 are the single most load-bearing tasks in this document: moving
  physics resolution inside the per-lap loop is the one piece every other
  story (US2's growth, US4's per-lap inspectability) depends on existing
  first.
- No task in this document authors any shipped item using `targetStat` —
  `020-character-item-pools`'s content pass is explicitly out of scope
  (spec.md Assumptions). T011-T014, T021-T023, T027-T028, T032, and T038
  use test-only items (`testItem(...)`-style fixtures), matching this
  repository's existing convention for physics-item tests.
- `simulateLapPhysics`/`solveSpan` (`src/simulation/tracks.ts`) receive
  **no task** in this document — their own signatures and every clause in
  `021`'s/`022`'s contracts on them stay untouched; only how often and with
  what stats `simulatePlayerLaps` calls `simulateLapPhysics` changes
  (research.md Decision 7, contract §4).
- `SynergyTarget`/`SynergyCondition`/`matchesTarget`/`resolveConditionPercent`
  (`synergy.ts`) receive no task — targeting logic is unchanged; only what a
  match's resulting percent is applied to changes (contract §7, FR-006).
- The Clarifications decision from `/speckit.clarify` (Synergy stays
  lap-invariant, no stacking concept of its own) means no task in this
  document gives `SynergyEffect` a `cooldown` or accumulated-state field —
  T010/T031 test and populate `targetStat` only.
- **`/speckit.analyze` remediation applied**: T023a was added after
  analysis found FR-012's most distinguishing scenario — a stat-targeted
  Synergy effect staying lap-invariant *even alongside* an unrelated
  lap-varying stacking Buff in the same build — had no dedicated task,
  despite being named explicitly as required coverage in quickstart.md
  (item 6). T024/T025's dependencies and the Strict Test-First
  Order/Parallel Opportunities sections were updated to include T023a.
  Analysis also flagged two lower-severity findings (I1: T023's phase
  classification reads as stricter than its actual RED/GREEN behavior; E2:
  no task explicitly combines a flat `physics` delta and a
  `conditionalPhysics` entry for the same stat under one amplifier) — left
  unaddressed per explicit user direction to fix only E1 before proceeding
  to implementation.
