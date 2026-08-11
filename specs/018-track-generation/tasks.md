# Tasks: Track Generation

**Input**: Design documents from `/specs/018-track-generation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/track-generation-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. The segment model, seeded generation, and characteristic scoring are shared foundational work. US1 (generation + scoring, replacing the hand-authored catalog) and US3 (confirming `012`/`013` consumers keep working unchanged) land together, per `plan.md`'s Delivery Order — US3 is verification of US1's own output, not parallel work. US2 (build track-fit wired into real simulation) depends on US1's `generateTrack` existing, but is otherwise independent new work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US3 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required — the seeded PRNG is local pure code, not a library — and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the segment/track/characteristics types and the pure generation + scoring engine — required by every user story

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for `TrackSegment`/widened `Track`/`TrackCharacteristics` type shapes (a track has `segments`, derived `points`, and derived `characteristics`) in `tests/unit/tracks.test.ts`
- [ ] T003 [P] Add failing tests for the local seeded PRNG's own determinism (same numeric seed always produces the same output sequence) in `tests/unit/tracks.test.ts`

### Implementation

- [ ] T004 Define `TrackSegment`, widen `Track`, and add `TrackCharacteristics` in `src/simulation/tracks.ts` (depends on T002)
- [ ] T005 Implement the local seeded PRNG (mulberry32-style, seeded from `seed * 1000003 + pvpOrdinal`) in `src/simulation/tracks.ts` (depends on T003)
- [ ] T006 Implement `generateTrack(seed, pvpOrdinal)`'s segment-generation core in `src/simulation/tracks.ts`: draw corner count, uniform turn direction, per-corner raw angles, per-straight lengths from the PRNG; scale angles to sum to exactly 360°; enforce minimum segment-length/angle bounds (depends on T004-T005; contract §1/§2, research.md Decisions 1-3)
- [ ] T007 Implement `deriveTrackPoints(segments)` (turtle-walk segments into a closed point path, then uniformly scale/translate into the existing `x: 70-560, y: 84-320` bounding box) in `src/simulation/tracks.ts` (depends on T006; research.md Decision 3)
- [ ] T008 Implement `trackCharacteristics(segments)` (`corneringDemand`/`powerDemand`/`brakingDemand` per the formulas in research.md Decision 4) in `src/simulation/tracks.ts` (depends on T006)
- [ ] T009 Wire `generateTrack` to return `{ id, name, segments, points: deriveTrackPoints(segments), characteristics: trackCharacteristics(segments) }` in `src/simulation/tracks.ts` (depends on T006-T008)
- [ ] T010 Run `tests/unit/tracks.test.ts` foundational cases; confirm GREEN (depends on T004-T009)

**Checkpoint**: `generateTrack` exists as a pure, deterministic function producing a closed segment sequence, a renderable point path, and three bounded characteristic scores — fully tested in isolation, nothing wired to any consumer yet.

---

## Phase 3: User Story 1 - Every track has a real, scoreable shape (Priority: P1)

**Goal**: The fixed 3-track hand-authored catalog is replaced by generation; every PvP stage races a freshly generated track for its own `(seed, pvpOrdinal)` pair.

**Independent Test**: Generate tracks for several `(seed, pvpOrdinal)` pairs; confirm each is a closed, non-degenerate segment sequence, confirm the same pair always regenerates identically, confirm different pairs differ, and confirm each track's three scores are derived from its own structure.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T011 [P] [US1] Add failing tests confirming `generateTrack(seed, ordinal)` called twice with identical arguments returns deeply equal results, in `tests/unit/tracks.test.ts`
- [ ] T012 [P] [US1] Add failing tests confirming a wide sample of `(seed, ordinal)` pairs each produce a closed segment sequence (returns to start position/heading) with every segment at or above its minimum bound, in `tests/unit/tracks.test.ts`
- [ ] T013 [P] [US1] Add failing tests confirming different `(seed, ordinal)` pairs produce different segment sequences, and confirming `corneringDemand`/`powerDemand` trend in the directions FR-005 requires as a track's corner/straight composition changes, in `tests/unit/tracks.test.ts`
- [ ] T014 [P] [US1] Add failing tests confirming `brakingDemand` varies independently of `corneringDemand`/`powerDemand` (a corner-heavy-but-gentle sequence and a corner-light-but-sharp sequence produce different `brakingDemand` values), in `tests/unit/tracks.test.ts`
- [ ] T015 [P] [US1] Add failing tests confirming `generateTrack` accepts any integer `pvpOrdinal` (not just 1-4) without special-casing or failing, in `tests/unit/tracks.test.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Remove `selectTrack` and the hand-authored `TRACKS` catalog (`src/content/tracks.ts`) (depends on T011-T015, Foundational)
- [ ] T017 [US1] Update `src/scenes/ContestScene.ts:80`'s `selectTrack(input.seed, input.level)` call to `generateTrack(input.seed, input.level)` — this is the only production caller of `selectTrack` (verified directly against the codebase; `resolveContest` itself does not call `selectTrack` today — its own new call is added separately in US2/T031) (depends on T016)
- [ ] T018 [US1] Replace `tests/unit/playback.test.ts`'s `TRACKS[0]`-derived `TEST_TRACK` fixture (used across ~13 call sites) with a local literal `Track` object defined in that test file, and update its direct `selectTrack(42, 1)` call (the "attaches the selected track once per schedule" test) to `generateTrack(42, 1)` (depends on T016)
- [ ] T019 [US1] Remove the existing `"TRACKS catalog (FR-003, data-model.md Track)"` and `"selectTrack determinism (FR-003, Validation Invariant 1)"` describe blocks in `tests/unit/tracks.test.ts` — they assert against the catalog/function this feature deletes (depends on T016)
- [ ] T020 [US1] Run `tests/unit/tracks.test.ts` and `tests/unit/playback.test.ts`; confirm User Story 1 cases are GREEN (depends on T011-T019)

**Checkpoint**: Every PvP contest races a real, freshly generated, scored track instead of a pick from the old fixed 3-track catalog, and both the rendering call site (`ContestScene.ts`) and its test fixtures (`playback.test.ts`) are fully migrated off the removed catalog.

---

## Phase 4: User Story 3 - Every existing track consumer keeps working (Priority: P2)

**Goal**: `013-race-spectacle`'s rendering, standings, and commentary render a generated track exactly as they render today's, with no change to how that code *consumes* `Track` beyond the mechanical `selectTrack`→`generateTrack` rename at its one call site (T017).

**Independent Test**: Render a generated track through `013`'s existing rendering path; confirm cars trace a closed loop with no visual discontinuity, and every existing `013`/`012` test continues to pass unchanged.

### Tests for User Story 3 (write first and confirm RED)

- [ ] T021 [P] [US3] Add failing tests confirming `pointAtProgress` produces a continuous, closed path (no gaps/jumps) across a full lap (progress 0 to 1) on a generated track's `points`, in `tests/unit/tracks.test.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Confirm (by inspection and the test above) that no further code change is needed anywhere in `013-race-spectacle`'s rendering/standings/commentary beyond T017's rename — `pointAtProgress`/`standingsAt`/commentary code all consume only `Track.points`/`NCarContestResult`, already unaffected (depends on T021, US1)
- [ ] T023 [US3] Run the full existing `012-multi-ghost-contest`/`013-race-spectacle` test suites; fix any remaining test that still references the removed `TRACKS`/`selectTrack`/`content/tracks.ts` by name (depends on T016-T019, T021-T022)

**Checkpoint**: Zero regression in `012`/`013` presentation against generated tracks.

---

## Phase 5: User Story 2 - A build's composition fits some tracks better than others (Priority: P1)

**Goal**: A build's Power/Chassis item composition measurably affects lap time differently depending on the track it races, via an optional, additive `track` parameter on `simulatePlayerLaps`.

**Independent Test**: Resolve the same build's contest on a `powerDemand`-heavy generated track and a `corneringDemand`-heavy one; confirm its finishing time differs in the direction its composition predicts.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T024 [P] [US2] Add failing tests for `buildTrackLean`: empty build → `0`; exactly balanced Power/Chassis → `0`; Power-heavy → positive; Chassis-heavy → negative; storage items excluded from the count, in `tests/unit/tracks.test.ts`
- [ ] T025 [P] [US2] Add failing tests confirming every existing `simulatePlayerLaps(build)`/`simulatePlayerLaps(build, lapCount)` call (no `track` argument) produces a result byte-for-byte identical to before this feature, in `tests/unit/laps.test.ts`
- [ ] T026 [P] [US2] Add failing tests confirming `simulatePlayerLaps(build, lapCount, track)` folds a `trackFit` adjustment: a Power-leaning build is faster on a `powerDemand`-heavy track and slower on a `corneringDemand`-heavy one (and the reverse for a Chassis-leaning build), a neutral/empty build sees `trackFit.appliedPercent === 0` on every lap regardless of track, and the effect is applied after every existing fold (tier, installation, synergy, buffs), in `tests/unit/laps.test.ts`
- [ ] T027 [P] [US2] Add failing tests confirming the N-car `resolveContest` overload generates exactly one track per contest (from its own `seed`/`level`) and applies it identically to the player and every rival, and that the legacy 2-car overload remains untouched (no track generated or applied), in `tests/unit/contest.test.ts`

### Implementation for User Story 2

- [ ] T028 [US2] Implement `buildTrackLean(build)` in `src/simulation/tracks.ts` (depends on T024, Foundational)
- [ ] T029 [US2] Add optional `trackFit?: { appliedPercent: number; appliedSeconds: number }` to `PlayerLap` and `LapBreakdown` in `src/simulation/types.ts` (depends on T025-T026)
- [ ] T030 [US2] Widen `simulatePlayerLaps`'s signature with an optional `track` parameter and fold the `trackFit` adjustment (using `buildTrackLean` and `track.characteristics`) as the final, whole-lap fold in `src/simulation/laps.ts` (depends on T028-T029)
- [ ] T031 [US2] Add `resolveContest`'s own new `generateTrack(seed, level)` call to the N-car overload in `src/simulation/contest.ts`, passing the same `Track` to every car's `simulatePlayerLaps` call — this is a new call, separate from T017's pre-existing rendering-side call in `ContestScene.ts` (depends on T030, T016)
- [ ] T032 [US2] Run `tests/unit/tracks.test.ts`, `tests/unit/laps.test.ts`, and `tests/unit/contest.test.ts`; confirm User Story 2 cases are GREEN (depends on T024-T031)

**Checkpoint**: A build's own composition demonstrably performs differently from one generated track to the next, visibly and attributably, with zero change to any call site that doesn't opt in.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing simulation/presentation behavior and run full validation

- [ ] T033 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing `laps.test.ts`/`contest.test.ts`/`playback.test.ts`/`012`/`013` test remains passing against generated tracks
- [ ] T034 Grep the codebase for any remaining reference to the removed `TRACKS`/`selectTrack`/`src/content/tracks.ts` and update any found
- [ ] T035 Run the local Vite browser through `quickstart.md` Scenarios A-B; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via `generateTrack`'s own determinism/closure/scoring behavior
- **Phase 4 - US3**: Depends on Foundational and US1 (T016-T019) — verifies behavior *against* the generated tracks US1 produces, so it cannot run first, but requires no changes to US1's own code
- **Phase 5 - US2**: Depends on Foundational and US1's `generateTrack` existing (T016, so `resolveContest` has a track to generate) — independently testable via `simulatePlayerLaps`'s own optional-parameter contract, but not independently *implementable* before US1's generation exists
- **Phase 6 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates generation's own determinism/closure/scoring behavior
- **US3 (P2)**: Foundational + US1's `generateTrack`/catalog-removal existing; pure verification of US1's output against `012`/`013`
- **US2 (P1)**: Foundational + US1's `generateTrack` existing; independently validates the simulation-wiring payoff; no dependency on US3

### Strict Test-First Order

- T002-T003 MUST be RED before T004-T009 add the types/PRNG/generation/scoring engine
- T011-T015 MUST be RED before T016-T019 replace `selectTrack`/`TRACKS` and migrate its callers/fixtures
- T021 MUST be RED before T022-T023 confirm/complete US3
- T024-T027 MUST be RED before T028-T031 add `buildTrackLean`/`trackFit`/simulation wiring

---

## Parallel Opportunities

### Foundational engine boundaries

```text
T002: type-shape tests in tests/unit/tracks.test.ts
T003: PRNG determinism tests in tests/unit/tracks.test.ts
```

### US1 test tasks are parallel with each other

```text
T011: generateTrack determinism tests
T012: closure/non-degeneracy tests
T013: characteristic-trend tests
T014: brakingDemand independence tests
T015: unbounded-ordinal tests
```

All five touch `tests/unit/tracks.test.ts` and should be sequenced or
coordinated if worked simultaneously by different people, since they
land in the same file. T017 and T018 (different files —
`ContestScene.ts` and `playback.test.ts`) can run in parallel with each
other once T016 lands.

### US2 test tasks are parallel with each other

```text
T024: buildTrackLean tests (tracks.test.ts)
T025: omitted-track parity tests (laps.test.ts)
T026: track-supplied effect tests (laps.test.ts)
T027: resolveContest wiring tests (contest.test.ts)
```

T025 MUST be written and passing before T026 adds any real behavior
change to `simulatePlayerLaps` — it is the regression guard for every
other existing test in the suite.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T020.
3. Stop and validate real, scored, generated tracks independently
   before wiring them into simulation or re-verifying `013`'s
   presentation layer.

US1 is the MVP: a real track model with real scores, replacing the
decorative hand-authored catalog — including its one production
renderer call site and its test fixtures — before anything else depends
on it.

### Incremental Delivery

1. **Foundational**: `TrackSegment`/`Track`/`TrackCharacteristics`
   types, the seeded PRNG, `generateTrack`, `deriveTrackPoints`,
   `trackCharacteristics` — no consumer wired in yet.
2. **US1**: `selectTrack`/`TRACKS` replaced by generation everywhere
   that referenced them — `ContestScene.ts`'s rendering call and
   `playback.test.ts`'s fixtures, not just the definition itself.
3. **US3**: Confirmation that `012`/`013` presentation requires zero
   further changes against generated tracks.
4. **US2**: `buildTrackLean`, `simulatePlayerLaps`'s optional `track`
   parameter and `trackFit` fold, `resolveContest`'s own new
   per-contest generation-and-apply wiring (distinct from
   `ContestScene.ts`'s rendering-side call) — the actual gameplay
   payoff.
5. **Polish**: Full regression pass, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test
  task; implementation begins only after the listed RED checks fail for
  the expected missing behavior.
- `selectTrack` has exactly one production caller today —
  `src/scenes/ContestScene.ts:80` — verified directly against the
  codebase during `/speckit.analyze`, not assumed. `resolveContest`
  does not call it; T031 adds `resolveContest`'s own new call
  (separate from T017's rename) as part of US2, since track-fit
  simulation is new behavior this feature introduces, not a migration
  of existing behavior.
- Track shape is guaranteed closed and non-self-intersecting **by
  construction** (uniform turn direction, exact 360° turn-angle sum) —
  no task here should add post-generation validation/rejection/retry
  logic (research.md Decision 1).
- No new field is added to `ItemDefinition` anywhere in this feature —
  `buildTrackLean` reads only the existing `installationCategory`
  (FR-006). No task here should touch `src/content/sample-data.ts`'s
  item catalog.
- Exact generation/scoring/tuning constants (segment-count range,
  corner-angle range, `CORNER_LENGTH_PER_DEGREE`, `SHARP_CORNER_DEGREES`,
  `BRAKING_REFERENCE`, `TRACK_FIT_MAX_PERCENT`, `MIN_STRAIGHT_LENGTH`)
  are balance-pass placeholders per research.md — implementers choose
  concrete values that satisfy the contract's behavioral invariants
  (bounded 0-100 scores, correct directional trends), not fixed numbers
  from this document.
