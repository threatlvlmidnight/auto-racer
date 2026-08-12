# Tasks: Arcade Physics Simulation

**Input**: Design documents from `/specs/021-arcade-physics-simulation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/physics-simulation-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the four user stories in `spec.md`, in the delivery order `plan.md` establishes — not their numeric priority order. US1 (stock-build physics) must exist before US4 (the regression guard) can prove anything, and US4 is deliberately proven *before* US2 (items driving stats) so the regression guard exists before new behavior is layered on — mirroring `018`'s own T025-before-T026 ordering. US3 (inspectability) closes the loop once US2's stats are real.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US4 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required — the kinematics involved (the trapezoidal velocity-profile formula) are closed-form algebra (`Math.sqrt`, basic arithmetic), not a physics engine — and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the pure segment/stat-level physics engine — corner geometry, the inter-apex span solver, and lap assembly — required by every user story, tested in complete isolation from builds and items

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for `PhysicalStats`/`ItemPhysicsContribution`/`LapPhaseKind`/`LapPhaseBreakdown` type shapes in `tests/unit/tracks.test.ts`
- [ ] T003 [P] Add failing tests for `cornerArcLength`/`apexSpeed`: apex speed decreases as `turnDegrees` increases (sharper is slower), increases as the `corneringSpeedStat` argument increases, both are pure and deterministic, and neither reads anything beyond their own arguments, in `tests/unit/tracks.test.ts`
- [ ] T004 [P] Add failing tests for `solveSpan`: `totalSeconds` exactly equals the sum of its own `phases[].seconds`; peak speed never exceeds `stats.topSpeed`; a short `distance` produces fewer phases (no cruise, or braking-only) than a long one; finite, positive results for every valid input including an `entrySpeed` already above the achievable peak, in `tests/unit/tracks.test.ts`
- [ ] T005 [P] Add failing tests for `simulateLapPhysics`: pure and deterministic; its `totalSeconds` equals the sum of its own `phases[].seconds`; and — the specific property this feature exists to guarantee — two hand-constructed `TrackSegment[]` sequences with equal `trackCharacteristics()` scores but different real layouts produce different `totalSeconds` for the same `PhysicalStats`, in `tests/unit/tracks.test.ts`

### Implementation

- [ ] T006 Define `PhysicalStats` and `STOCK_PHYSICAL_STATS` in `src/simulation/tracks.ts` (depends on T002)
- [ ] T007 Implement `cornerArcLength(turnDegrees)` and `apexSpeed(turnDegrees, corneringSpeedStat)` in `src/simulation/tracks.ts` (depends on T003; research.md Decisions 2-3)
- [ ] T008 Implement `solveSpan(distance, entrySpeed, exitSpeed, stats)` — the trapezoidal velocity-profile formula — in `src/simulation/tracks.ts` (depends on T004, T006; research.md Decision 1)
- [ ] T009 Implement `simulateLapPhysics(stats, segments)` — flattens `segments` into inter-apex spans using `cornerArcLength`'s entry/exit split (research.md Decision 4), calls `solveSpan` once per span plus one apex-hold contribution per corner — in `src/simulation/tracks.ts` (depends on T005, T007-T008; research.md Decisions 1-2, 4)
- [ ] T010 [P] Define `ItemPhysicsContribution`, `LapPhaseKind`, and `LapPhaseBreakdown` in `src/simulation/types.ts` (depends on T002)
- [ ] T011 Run `tests/unit/tracks.test.ts` foundational cases; confirm GREEN (depends on T006-T010)

**Checkpoint**: A pure, deterministic, shape-sensitive physics engine exists and is fully tested against bare stats/segments — nothing wired to `simulatePlayerLaps`, builds, or items yet.

---

## Phase 3: User Story 1 - A stock build produces a real, segment-aware lap time (Priority: P1)

**Goal**: `simulatePlayerLaps(build, lapCount, track)` produces a deterministic, track-shape-sensitive lap time for a build with no physics-stat items, by calling the Phase 2 engine — proving the core rewrite works before any item-driven variation is layered on.

**Independent Test**: Simulate a stock build across a wide sample of generated tracks; confirm every result is deterministic and finite, and confirm two structurally different tracks with equal aggregate characteristic scores produce different stock lap times.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T012 [P] [US1] Add failing tests confirming `simulatePlayerLaps(build, lapCount, track)` for a build with zero physics-stat items produces a lap time whose physics-derived component comes from `simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments)`, in `tests/unit/laps.test.ts`
- [ ] T013 [P] [US1] Add failing tests confirming two generated tracks with equal `corneringDemand`/`powerDemand`/`brakingDemand` scores but different real segment sequences produce different lap times through the full `simulatePlayerLaps` path for the same stock build (SC-001, end-to-end), in `tests/unit/laps.test.ts`
- [ ] T014 [P] [US1] Add failing tests confirming a straight too short to both reach `STOCK_PHYSICAL_STATS.topSpeed` and brake down for the next corner's apex never reaches top speed on that straight (FR-003), constructed against a real generated track's segments, in `tests/unit/laps.test.ts`
- [ ] T015 [P] [US1] Add failing tests confirming identical `(build, track)` inputs produce deeply equal results across repeated calls, in `tests/unit/laps.test.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Wire `simulatePlayerLaps` to resolve a build's `PhysicalStats` (`STOCK_PHYSICAL_STATS` only — item aggregation is US2's job) and fold `simulateLapPhysics`'s `totalSeconds` additively with the existing `timeModifier` sum whenever `track` is supplied, in `src/simulation/laps.ts` (depends on T012-T015, T009)
- [ ] T017 [US1] Run `tests/unit/laps.test.ts` User Story 1 cases; confirm GREEN (depends on T016)

**Checkpoint**: Every N-car contest already produces a real, shape-sensitive, deterministic physics lap time for stock builds — `resolveContest` itself needs zero change here, since it already passes a shared `Track` to every car's `simulatePlayerLaps` call (research.md Decision 7).

---

## Phase 4: User Story 4 - Everything that doesn't opt in keeps working exactly as it does today (Priority: P2, proven before US2)

**Goal**: Confirm the legacy no-track path and every existing `timeModifier`-only item are byte-for-byte unaffected by everything Phase 2/US1 just built, before US2 adds new item-driven behavior on top.

**Independent Test**: Run the full existing test suite unmodified; confirm every pre-existing test passes, and confirm a `timeModifier`-only item's flat contribution is unchanged whether or not a track is supplied.

### Tests for User Story 4 (write first and confirm RED — expected to already be GREEN if US1 was done correctly; this phase exists to prove that, not to add new behavior)

- [ ] T018 [P] [US4] Confirm every existing `simulatePlayerLaps(build, lapCount)` call (no `track` argument) across the full test suite remains byte-for-byte unchanged
- [ ] T019 [P] [US4] Add failing tests confirming a `timeModifier`-only item continues to contribute its existing flat seconds delta unmodified, whether or not a `track` is supplied, in `tests/unit/laps.test.ts`

### Implementation for User Story 4

- [ ] T020 [US4] Fix any regression found by T018-T019 (expected: none, since Research Decision 6's additive fold was already built into T016) (depends on T018-T019, US1)

**Checkpoint**: Zero regression confirmed and locked in before item-driven behavior is added.

---

## Phase 5: User Story 2 - Items express real physical stats, and their value depends on the actual track (Priority: P1)

**Goal**: `ItemDefinition.physics` (an `ItemPhysicsContribution`) sums into a build's resolved `PhysicalStats` on top of `STOCK_PHYSICAL_STATS`; a build's item choices measurably change its lap time, and the size of that change genuinely depends on the specific track's real segment content.

**Independent Test**: Give a build a cornering-speed-boosting item; resolve it on a corner-dominant generated track and a straight-dominant one; confirm the item is a bigger net time gain on the former than the latter.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T021 [P] [US2] Add failing tests confirming an `ItemPhysicsContribution`'s deltas sum correctly into a build's resolved `PhysicalStats`, excluding inactive storage items (matching the existing installed/active-item filtering convention `simulatePlayerLaps` already uses), in `tests/unit/laps.test.ts`
- [ ] T022 [P] [US2] Add failing tests confirming a build holding a cornering-speed item is faster on a corner-dominant generated track than the same build without it, in `tests/unit/laps.test.ts`
- [ ] T023 [P] [US2] Add failing tests confirming the same item's benefit is smaller (or a net loss) on a straight-dominant generated track than on the corner-dominant one, in `tests/unit/laps.test.ts`
- [ ] T024 [P] [US2] Add failing tests confirming an item that trades cornering speed for top speed nets differently across tracks with different real segment layouts, not just different aggregate scores, in `tests/unit/laps.test.ts`

### Implementation for User Story 2

- [ ] T025 [US2] Resolve a build's `PhysicalStats` as `STOCK_PHYSICAL_STATS` plus the sum of every active held item's `physics` deltas, in `src/simulation/laps.ts` (depends on T021-T024, T016)
- [ ] T026 [US2] Run `tests/unit/laps.test.ts` User Story 2 cases; confirm GREEN (depends on T025)

**Checkpoint**: A build's own item choices demonstrably and correctly change its physical stats, and those stats' real value depends on which track it races — the payoff this whole feature exists to deliver.

---

## Phase 6: User Story 3 - Every physics-derived second remains fully attributable (Priority: P2)

**Goal**: `PlayerLap.physics` exposes the build's resolved four stats and a per-phase time breakdown whose sum exactly equals the lap's physics-derived time component — no opaque total.

**Independent Test**: Simulate a lap for a build with several physics-stat items; confirm the result exposes real per-phase times that sum to the total, for both an item-laden build and a stock one.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T027 [P] [US3] Add failing tests confirming `PlayerLap.physics.stats` reports the build's resolved `PhysicalStats` and `PlayerLap.physics.phases` sums exactly to the lap's physics-derived time (SC-004), in `tests/unit/laps.test.ts`
- [ ] T028 [P] [US3] Add failing tests confirming a build with zero physics-stat items still reports a real, non-empty phase breakdown derived from `STOCK_PHYSICAL_STATS`, in `tests/unit/laps.test.ts`
- [ ] T028a [P] [US3] Add a failing test confirming `toLegacyContestResult` (`src/scenes/runPresentation.ts`) preserves `physics` when bridging an `NCarContestResult`'s `PlayerLap`s into `ContestResult.laps` (`LapBreakdown[]`) — verified directly against the current mapping (line 218-224), which today copies only `lap`/`playerLapTime`/`ghostLapTime`/`firedItems`/`contributions` and silently drops `trackFit`; without this task `physics` would repeat the exact same gap for anything read from `run.history`, in `tests/integration/run-flow.test.ts` (resolves `/speckit.analyze` finding I1)

### Implementation for User Story 3

- [ ] T029 [US3] Record `simulateLapPhysics`'s phase breakdown and the build's resolved `PhysicalStats` on `PlayerLap.physics` (`src/simulation/laps.ts`) and thread it onto `LapBreakdown.physics` (`src/simulation/types.ts`) (depends on T027-T028, T025)
- [ ] T029a [US3] Add `physics: lap.physics` to `toLegacyContestResult`'s `laps` mapping in `src/scenes/runPresentation.ts`, so `run.history`'s post-race review carries the same inspectable breakdown `ResultScene` already gets directly from `NCarContestResult` — `ResultScene.ts` itself is unaffected by this task (it already reads `NCarContestResult`/`PlayerLap` directly, never through this bridge) (depends on T028a, T029)
- [ ] T030 [US3] Run `tests/unit/laps.test.ts` and `tests/integration/run-flow.test.ts` User Story 3 cases; confirm GREEN (depends on T029, T029a)

**Checkpoint**: Every physics-derived second is inspectable — matching Constitution Principle III, and stricter than the `018` mechanic this feature replaces.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fully remove `018`'s superseded mechanic, confirm zero regression, and run full validation

- [ ] T031 Remove `buildTrackLean`, `trackBias`, `trackFitPercent`, and `TRACK_FIT_MAX_PERCENT` entirely from `src/simulation/tracks.ts` — not deprecated, not left dormant behind a flag
- [ ] T032 Remove the `trackFit?` field from `PlayerLap` (`src/simulation/laps.ts`) and `LapBreakdown` (`src/simulation/types.ts`); remove the now-dead `trackFitPercent` import from `laps.ts`
- [ ] T033 Update `tests/unit/tracks.test.ts`: remove the `"buildTrackLean (T024, FR-006)"` describe block, which asserts against the function this feature removes
- [ ] T034 Update `tests/unit/laps.test.ts`: remove the `"simulatePlayerLaps track-fit fold (T026, contract §5)"` describe block (line 777 onward) and its `trackFit`-referencing assertions — already superseded by US1-US3's `physics`-field coverage. **Also fix the separate `it("omits trackFit entirely when no track is supplied")` test at line 771-773**, inside the different `"simulatePlayerLaps omitted-track parity (T025, FR-007)"` describe block (line 763) — this test is not part of the block above and was missed by this task's original scope during `/speckit.analyze` (finding C1); replace its `expect(lap.trackFit).toBeUndefined()` assertion with an equivalent check that `lap.physics` is `undefined` when no track is supplied. Without this fix, `tsc` fails to compile once T032 removes `trackFit` from the `PlayerLap` interface — this is a real compile-time break, not a style nit.
- [ ] T035 Update `tests/unit/contest.test.ts`: remove the 4 `trackFit`-referencing tests under `"resolveContest track generation (N-car, US2)"` (lines 355, 368, 376, 393 — the 5th test in that block, `"regenerates the same track for the same (seed, level)..."` at line 386, doesn't reference `trackFit` and stays untouched) and replace with equivalent assertions against `car.laps[].physics`: (a) every car — player and every rival — gets a real `physics` breakdown, none exempt (replaces line 355's test); (b) the legacy 2-car overload's own `laps` never carry a `physics` field at all (its own explicit assertion, replacing line 393's test — not left as an inference from (a) alone, per `/speckit.analyze` finding L1)
- [ ] T036 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing test remains passing
- [ ] T037 Grep the codebase for any remaining reference to `trackFit`/`buildTrackLean`/`TRACK_FIT_MAX_PERCENT` and confirm zero results outside this feature's own spec documents and prior features' historical handoff notes
- [ ] T038 Run the local Vite browser through `quickstart.md` Scenarios A-B; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via `simulatePlayerLaps`' own stock-build determinism/shape-sensitivity behavior
- **Phase 4 - US4**: Depends on Foundational and US1 (T016) — proves US1's own wiring didn't regress anything, so it cannot run first, but requires no changes to US1's own code beyond fixing anything it finds (expected: nothing)
- **Phase 5 - US2**: Depends on Foundational, US1 (T016), and US4's regression guard being in place first — independently testable via build-vs-track item value, but not independently *implementable* before US1's wiring exists
- **Phase 6 - US3**: Depends on US2 (T025) — there's nothing meaningful to attribute per-item/per-stat until items actually resolve into `PhysicalStats`
- **Phase 7 - Polish**: Depends on all user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the physics engine's own stock-build behavior
- **US4 (P2)**: Foundational + US1's wiring existing; pure verification, proven before US2 by deliberate ordering
- **US2 (P1)**: Foundational + US1 + US4's regression guard; independently validates the item-vs-track payoff
- **US3 (P2)**: Foundational + US2's stat resolution existing; independently validates inspectability

### Strict Test-First Order

- T002-T005 MUST be RED before T006-T010 add the physics engine
- T012-T015 MUST be RED before T016 wires stock-build simulation into `simulatePlayerLaps`
- T018-T019 MUST be confirmed (RED only if a real regression exists — expected GREEN) before T020's fix, if any
- T021-T024 MUST be RED before T025 adds item-driven stat resolution
- T027-T028 MUST be RED before T029 adds the inspectable breakdown
- T028a MUST be RED before T029a wires `physics` through `toLegacyContestResult`

---

## Parallel Opportunities

### Foundational engine tests

```text
T002: type-shape tests in tracks.test.ts
T003: cornerArcLength/apexSpeed tests
T004: solveSpan tests
T005: simulateLapPhysics shape-sensitivity tests
```

All four touch `tests/unit/tracks.test.ts` and should be sequenced or
coordinated if worked simultaneously by different people, since they land
in the same file. T010 (types.ts) can run fully in parallel with T002-T005
since it's a different file.

### US1/US2/US3 test tasks are each parallel within their own phase

```text
T012-T015: US1 tests (laps.test.ts)
T021-T024: US2 tests (laps.test.ts)
T027-T028: US3 tests (laps.test.ts)
```

Each group touches the same file (`laps.test.ts`) and should be sequenced
or coordinated if worked simultaneously by different people. T028a
(`run-flow.test.ts`) is a different file and can run fully in parallel
with T027-T028.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T017.
3. Stop and validate real, deterministic, shape-sensitive stock-build
   physics independently before proving zero regression or wiring in
   items.

US1 is the MVP: a real physics engine, wired into `simulatePlayerLaps` and
therefore into every N-car contest via `resolveContest`'s existing track
wiring, before anything else depends on it.

### Incremental Delivery

1. **Foundational**: `PhysicalStats`/corner geometry/`solveSpan`/
   `simulateLapPhysics` — pure, tested in isolation, nothing wired in yet.
2. **US1**: Stock-build physics wired into `simulatePlayerLaps` — every
   N-car contest now races real, shape-sensitive physics.
3. **US4**: Confirmation that nothing that didn't opt in changed.
4. **US2**: Items carry real physical stats — the actual gameplay payoff,
   and the prerequisite `020-character-item-pools`' content is designed
   against.
5. **US3**: Full phase/stat inspectability on `PlayerLap.physics`.
6. **Polish**: `018`'s superseded `trackFit` mechanic fully removed, full
   regression pass, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test
  task; implementation begins only after the listed RED checks fail for
  the expected missing behavior.
- `resolveContest` (`src/simulation/contest.ts`) requires **zero** task in
  this document — its existing `generateTrack`/shared-`Track` wiring
  already puts a track exactly where `simulatePlayerLaps` needs one
  (research.md Decision 7). Confirmed directly against the current
  codebase, not assumed.
- `018`'s `buildTrackLean`/`trackFit`/`TRACK_FIT_MAX_PERCENT` are removed
  entirely by Polish (T031-T032), not deprecated or left behind an
  optional flag — this feature fully supersedes that mechanic.
- `/speckit.analyze` caught one CRITICAL finding (C1) on this feature:
  `T034`'s original scope missed a `trackFit`-referencing test living in a
  *different* describe block than the one it targeted
  (`tests/unit/laps.test.ts:771-773`, inside `"simulatePlayerLaps
  omitted-track parity"`, not `"...track-fit fold"`) — verified directly
  against the current file, not assumed. Left unfixed, this would have
  been a `tsc` compile failure once T032 removed the `trackFit` field, not
  a caught-by-tests regression. T034 now covers both locations.
- No task in this document should add a buff/synergy interaction between
  `ItemPhysicsContribution` and existing `buff.boostPercent` items —
  research.md Decision 6 explicitly scopes that out of this feature.
- Exact tuning constants (`STOCK_PHYSICAL_STATS`' four values, the corner
  arc-length formula's exponent/scale, the apex-speed formula's
  `referenceAngle`, the entry/exit split ratio, the apex-hold time) are
  balance-pass placeholders per research.md Decision 4 — implementers
  choose concrete values that satisfy the contract's behavioral invariants
  (SC-001, SC-002, positive/finite results), not fixed numbers from this
  document.
