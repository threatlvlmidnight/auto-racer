# Tasks: Contextual Physics Effects

**Input**: Design documents from `/specs/022-contextual-physics-effects/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/contextual-physics-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the four user stories in `spec.md`, in the delivery order `plan.md` establishes — not their numeric priority order. US1 (the core conditional-resolution mechanism) must exist before US2 (the zero-regression guard) can prove anything, mirroring `021`'s own "build the new behavior, then prove nothing else broke" ordering. US3 (inspectability) follows once conditional resolution is real. US4 (generalize beyond the single motivating example) comes last because, if US1 is built correctly, it's a validation phase, not a new-implementation phase — the resolution mechanism is generic across all four stats and both directions from the start, never hardcoded to "acceleration, at-least" first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [X] T001 Confirm no new runtime dependency is required — conditional resolution is plain threshold comparisons over the same closed-form algebra `021` already uses — and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the condition/contribution types and the pure corner-tightness matcher, tested in complete isolation before any engine wiring

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [X] T002 [P] Add failing tests for `PhysicsCondition`/`ConditionalPhysicsContribution` type shapes and for `ItemDefinition.conditionalPhysics` coexisting with the existing `physics` field, in `tests/unit/tracks.test.ts`
- [X] T003 [P] Add failing tests for the corner-tightness matcher: `"at-least"` matches a corner's `turnDegrees` at or above the threshold (inclusive), `"at-most"` matches at or below (inclusive), both directions handle the exact-equality boundary correctly, and the function is pure/deterministic and reads nothing beyond its own arguments, in `tests/unit/tracks.test.ts`

### Implementation

- [X] T004 [P] Define `PhysicsCondition` and `ConditionalPhysicsContribution` in `src/simulation/types.ts`; add `conditionalPhysics?: readonly ConditionalPhysicsContribution[]` to `ItemDefinition` alongside the existing `physics` field (depends on T002; data-model.md)
- [X] T005 Implement the corner-tightness matcher (e.g. `matchesPhysicsCondition(condition, turnDegrees): boolean`) in `src/simulation/tracks.ts` (depends on T003; contracts §1)
- [X] T006 Run `tests/unit/tracks.test.ts` foundational cases; confirm GREEN (depends on T004-T005)

**Checkpoint**: The condition/contribution data shapes exist and the matcher is fully tested in isolation — nothing wired into `simulateLapPhysics` yet.

---

## Phase 3: User Story 1 - An item's stat boost can be scoped to tight corners only (Priority: P1)

**Goal**: `simulateLapPhysics` resolves conditional deltas per span/corner (research.md Decision 1: `corneringSpeed` at the corner itself, `acceleration` at the previous corner, `brakingPower` at the current corner, `topSpeed` at either bounding corner), and the concrete motivating case — a tight-corner acceleration specialist — works end to end through a real build on a real generated track.

**Independent Test**: Author a test item with an `accelerationDelta` conditioned on a corner-tightness threshold; simulate it on a real generated track with a mix of sharp and gentle corners; confirm its delta measurably changes lap time only through phases associated with qualifying corners.

### Tests for User Story 1 (write first and confirm RED)

- [X] T007 [P] [US1] Add failing tests confirming per-corner `corneringSpeed` conditional resolution: a `corneringSpeedDelta` condition matching corner `i`'s own `turnDegrees` changes only that corner's `apexSpeed`, verified via `simulateLapPhysics` against a real generated track with mixed corner angles, in `tests/unit/tracks.test.ts`
- [X] T008 [P] [US1] Add failing tests confirming per-span `acceleration` conditional resolution: an `accelerationDelta` condition is evaluated against the **previous** corner (the one just exited), not the current one — constructed against a track where the previous and current corners have different angles, confirming the accelerating phase's seconds reflect a match against the previous corner only, in `tests/unit/tracks.test.ts`
- [X] T009 [P] [US1] Add failing tests confirming per-span `brakingPower` conditional resolution: a `brakingPowerDelta` condition is evaluated against the **current** corner (about to be entered) — symmetric to T008, in `tests/unit/tracks.test.ts`
- [X] T010 [P] [US1] Add failing tests confirming per-span `topSpeed` conditional resolution: a `topSpeedDelta` condition applies to the cruising phase when **either** bounding corner matches, and does not apply when neither bounding corner matches, in `tests/unit/tracks.test.ts`
- [X] T011 [P] [US1] Add failing tests confirming a conditional contribution whose condition is never met anywhere on a given track contributes exactly 0 for the whole lap — no error, no fallback to always-applying (Edge Cases), in `tests/unit/tracks.test.ts`
- [X] T012 [P] [US1] Add failing tests confirming SC-001: given two items of identical delta magnitude — one via an item's existing flat `physics` field, one via `conditionalPhysics` (tight-corner-only) — simulated independently through a real build on the same real generated track, the conditional item's total lap-time contribution is never greater in magnitude than the unconditional item's, and is strictly smaller whenever the track has any phase the condition excludes, in `tests/unit/laps.test.ts`
- [X] T013 [P] [US1] Add failing tests confirming an item can carry both `physics` (flat, unconditional) and `conditionalPhysics` simultaneously, with both contributing additively to the same lap, in `tests/unit/laps.test.ts`
- [X] T013a [P] [US1] Add failing tests confirming two *separate* conditional contributions — from two different items, each with a `conditionalPhysics` entry — targeting the same stat with overlapping conditions (e.g. both match the same corner/phase) sum additively rather than overriding or deduplicating (spec.md Edge Cases, FR-004's "from the same item or different items" clause), in `tests/unit/laps.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Extend `simulateLapPhysics`'s signature with a third, optional `conditionalContributions` parameter (default `[]`); resolve an effective `corneringSpeed` per corner (base + every matching contribution) before each `apexSpeed` call, in `src/simulation/tracks.ts` (depends on T007, T011, T005; contracts §3)
- [X] T015 [US1] Resolve an effective `{ acceleration, brakingPower, topSpeed }` per span — previous-corner-gated, current-corner-gated, and either-bounding-corner-gated respectively (research.md Decision 1) — before each existing `solveSpan` call; `solveSpan`'s own signature stays untouched, in `src/simulation/tracks.ts` (depends on T008-T010, T014)
- [X] T016 [US1] Add a `resolveConditionalPhysicsContributions` helper in `src/simulation/laps.ts`, mirroring `resolvePhysicalStats`'s existing active-item filtering, collecting every active held item's `conditionalPhysics` entries into one flat list; pass it as `simulateLapPhysics`'s new third argument (depends on T012-T013a, T015)
- [X] T017 [US1] Run `tests/unit/tracks.test.ts` and `tests/unit/laps.test.ts` User Story 1 cases; confirm GREEN (depends on T014-T016)

**Checkpoint**: The concrete motivating case — an item that only improves acceleration exiting tight corners — works end to end through a real build and a real generated track.

---

## Phase 4: User Story 2 - Existing flat, unconditional items are completely unaffected (Priority: P1)

**Goal**: Every build using zero conditional items produces byte-for-byte identical results to `021`'s shipped model — proven, not merely assumed, before US3/US4 build on top of US1.

**Independent Test**: Run the full existing `021` physics regression suite unmodified; confirm every test still passes. Simulate a build containing only unconditional items before and after this feature; confirm identical lap times.

### Tests for User Story 2 (write first and confirm RED — expected to already be GREEN if US1 was done correctly; this phase exists to prove that, not to add new behavior)

- [X] T018 [P] [US2] Confirm every existing `021` physics test (`tests/unit/tracks.test.ts`, `tests/unit/laps.test.ts`, `tests/unit/contest.test.ts`, `tests/integration/run-flow.test.ts`) remains byte-for-byte unchanged after US1's changes
- [X] T019 [P] [US2] Add a failing test confirming `simulateLapPhysics` called with its existing two-argument signature (no third argument, and separately with an explicit `[]`) produces byte-for-byte identical output to `021`'s shipped behavior, using the same real-track fixtures `021`'s own tests use, in `tests/unit/tracks.test.ts`

### Implementation for User Story 2

- [X] T020 [US2] Fix any regression found by T018-T019 (expected: none, since T014's default-parameter design was built for exactly this) (depends on T018-T019, US1)

**Checkpoint**: Zero regression confirmed and locked in before inspectability/generalization work continues.

---

## Phase 5: User Story 3 - A conditional item's activity is fully inspectable (Priority: P2)

**Goal**: The per-lap physics breakdown makes it possible to determine, per phase, which conditional item(s) actually applied there — matching this project's Transparency & Legibility standard for every other item mechanic.

**Independent Test**: Simulate a lap with a conditional item held; inspect the returned phase breakdown; confirm it identifies which specific phases the item's condition matched, verifiable directly against the track's own corner angles.

### Tests for User Story 3 (write first and confirm RED)

- [X] T021 [P] [US3] Add failing tests confirming the phase breakdown returned through `simulateLapPhysics`/`PlayerLap.physics` identifies, per phase, which conditional contribution(s) (source item id and stat) actually applied — verified against the track's own authored corner angles, not re-derived from the simulation — in `tests/unit/tracks.test.ts` and `tests/unit/laps.test.ts`
- [X] T022 [P] [US3] Add failing tests confirming a build simulated on two different track shapes produces two breakdowns whose sets of matched phases differ in a way traceable to the two tracks' different corner angles, in `tests/unit/laps.test.ts`
- [X] T022a [P] [US3] Add a failing test confirming `PlayerLap.physics.stats` for a build holding conditional items still equals the build's base (unconditional-only) resolved `PhysicalStats` — conditional deltas MUST surface only through the phase breakdown, never leak into the build-level `.stats` field (spec.md Edge Cases), in `tests/unit/laps.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Extend `LapPhaseBreakdown` (`src/simulation/types.ts`) with a field recording which conditional contribution(s), if any, matched that phase; populate it in `simulateLapPhysics` (`src/simulation/tracks.ts`) (depends on T021-T022a; data-model.md's LapPhaseBreakdown extension)
- [X] T024 [US3] Confirm the extended breakdown threads through `PlayerLap.physics`/`LapBreakdown.physics` unchanged in every other respect, and that `.stats` stays base-only per T022a (`src/simulation/laps.ts`) — no change needed if T016 already passes the full breakdown through and resolvePhysicalStats already excludes conditional deltas (depends on T023)
- [X] T025 [US3] Run `tests/unit/tracks.test.ts` and `tests/unit/laps.test.ts` User Story 3 cases; confirm GREEN (depends on T023-T024)

**Checkpoint**: Every conditional item's activity is inspectable, matching Constitution Principle III.

---

## Phase 6: User Story 4 - The condition isn't limited to "tight corners only" (Priority: P3)

**Goal**: Confirm all four stats and both threshold directions are independently usable through the same mechanism US1 already built generically — not a new implementation phase if US1/T014-T016 were built correctly.

**Independent Test**: Author one item conditioned on "corner ≥ threshold" and one on "corner ≤ threshold" for two different stats; simulate both on the same track; confirm each applies to the complementary set of qualifying corners its own condition implies.

### Tests for User Story 4 (write first and confirm RED — expected to already be GREEN; this phase validates generality, it does not add it)

- [X] T026 [P] [US4] Add tests confirming each of the four stats (`acceleration`, `topSpeed`, `brakingPower`, `corneringSpeed`) and both directions (`"at-least"`, `"at-most"`) can be independently authored and correctly simulated — at least one working example item per stat/direction combination, in `tests/unit/tracks.test.ts`

### Implementation for User Story 4

- [X] T027 [US4] Fix any gap found by T026 (expected: none — T014-T016's resolution was built generically across stat, direction, and phase kind from the start, never hardcoded to the single motivating example) (depends on T026, US1)

**Checkpoint**: The full design space (4 stats × 2 directions) is confirmed usable, not just the one motivating example.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression pass and quickstart validation

- [X] T028 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing test remains passing
- [X] T029 Grep the codebase for consistent naming of `PhysicsCondition`/`ConditionalPhysicsContribution`/`conditionalPhysics` — no drift between `types.ts`, `tracks.ts`, `laps.ts`, and their tests
- [X] T030 Run the local Vite browser sanity pass and the automated-validation coverage list from `quickstart.md`; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via the concrete tight-corner-specialist example
- **Phase 4 - US2**: Depends on Foundational and US1 (T014-T016) — proves US1's own wiring didn't regress anything, so it cannot run first
- **Phase 5 - US3**: Depends on US1 (T014-T016) and benefits from US2's regression guard being locked in first — independently testable via breakdown inspection
- **Phase 6 - US4**: Depends on US1 (T014-T016) — pure validation that the mechanism already generalizes; ordered last because it's enrichment, not a regression guard (unlike US2 here, and unlike `021`'s own US4, which *was* a regression guard and was ordered immediately after its US1)
- **Phase 7 - Polish**: Depends on all user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the core conditional-resolution mechanism
- **US2 (P1)**: Foundational + US1's wiring existing; pure verification
- **US3 (P2)**: Foundational + US1; independently validates inspectability
- **US4 (P3)**: Foundational + US1; independently validates generality across all four stats/both directions

### Strict Test-First Order

- T002-T003 MUST be RED before T004-T005 add the condition/contribution types and matcher
- T007-T013a MUST be RED before T014-T016 wire conditional resolution into `simulateLapPhysics`/`laps.ts`
- T018-T019 MUST be confirmed (RED only if a real regression exists — expected GREEN) before T020's fix, if any
- T021-T022a MUST be RED before T023-T024 extend the breakdown
- T026 MUST be confirmed (expected GREEN) before T027's fix, if any

---

## Parallel Opportunities

### Foundational tests

```text
T002: type-shape tests in tracks.test.ts
T003: corner-tightness matcher tests in tracks.test.ts
```

Both touch the same file and should be sequenced or coordinated if worked simultaneously by different people.

### US1 test tasks

```text
T007: corneringSpeed resolution (tracks.test.ts)
T008: acceleration resolution (tracks.test.ts)
T009: brakingPower resolution (tracks.test.ts)
T010: topSpeed resolution (tracks.test.ts)
T011: never-matches edge case (tracks.test.ts)
T012: SC-001 magnitude comparison (laps.test.ts)
T013: flat + conditional coexistence (laps.test.ts)
T013a: multi-item conditional overlap (laps.test.ts)
```

T007-T011 share `tracks.test.ts`; T012-T013a share `laps.test.ts`. The two
files can be worked fully in parallel with each other.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T017.
3. Stop and validate the concrete motivating case — a tight-corner
   acceleration specialist — works correctly, before proving zero
   regression or building inspectability/generality on top.

US1 is the MVP: the core conditional-resolution mechanism, proven against
the one concrete case this feature exists for.

### Incremental Delivery

1. **Foundational**: `PhysicsCondition`/`ConditionalPhysicsContribution`
   types and the pure corner-tightness matcher — tested in isolation,
   nothing wired in yet.
2. **US1**: Conditional resolution wired into `simulateLapPhysics` and
   `laps.ts` — the concrete motivating case works end to end.
3. **US2**: Confirmation that nothing that didn't opt in changed.
4. **US3**: Full per-phase inspectability of conditional activity.
5. **US4**: Confirmation that the mechanism generalizes across all four
   stats and both threshold directions, not just the one example.
6. **Polish**: Full regression pass, quickstart validation.

---

## Notes

- T014-T016 are the single most load-bearing tasks in this document: the
  default-`[]` third parameter on `simulateLapPhysics` is what makes
  US2's zero-regression guarantee mechanical rather than aspirational.
- No task in this document authors any shipped item using
  `conditionalPhysics` — `020-character-item-pools`' content pass is
  explicitly out of scope (spec.md Assumptions). T012, T013, T019, T021,
  T022, and T026 use test-only items (`testItem(...)`-style fixtures),
  matching this repository's existing convention for physics-item tests.
- `solveSpan` (`src/simulation/tracks.ts`) receives **no task** in this
  document — its own four-argument signature and every clause in `021`'s
  Inter-Apex Span Contract stay untouched; only what its caller
  (`simulateLapPhysics`) passes into it changes (research.md Decision 4,
  contracts §3).
- The buff/synergy/tiering-vs-physics question raised during `020`'s
  design discussion is explicitly out of scope here — no task in this
  document adds a buff/synergy/tiering interaction with either
  `ItemPhysicsContribution` or `ConditionalPhysicsContribution` (spec.md
  Assumptions).
- `LapPhaseKind`'s declared-but-unused `"apex"` member (`types.ts:108`,
  confirmed unused anywhere in the current implementation — research.md
  Decision 2) is left exactly as-is; no task in this document touches it.
- **`/speckit.analyze` remediation applied**: T013a and T022a were added
  after analysis found two edge cases named in spec.md had no dedicated
  task — multi-item conditional overlap (Edge Cases bullet 3) and
  `LapBreakdown.physics.stats` staying base-only under conditional items
  (Edge Cases bullet 4). Analysis also found `spec.md`/`research.md` had
  drifted from research.md's own verified findings on two points, both
  since corrected in `spec.md`/`research.md` directly (not in this file):
  (1) FR-002/Key Entities referenced a nonexistent `"apex"` phase and
  omitted the real `"cruising"` phase; (2) FR-004/Edge Cases cited `021
  research.md` Decision 6 for item-to-item delta summation, when that
  decision is actually about `physicsLapTime + Σ(timeModifier)`
  additivity — the correct source is `021 contracts/physics-simulation-
  contract.md` §1. Neither correction changes any task's scope or file
  path, only the citation/wording they trace back to.
