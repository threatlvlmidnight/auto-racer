# Tasks: Race Legibility and Playback Integrity

**Input**: Design documents in `/specs/027-race-legibility-integrity/`

**Prerequisites**: `spec.md`, `research.md`, `plan.md`, `data-model.md`,
`contracts/race-legibility-contract.md`, and `quickstart.md`

**Tests**: Required before presentation changes. Contest-result parity,
checkpoint math, playback boundaries, and track-summary reconciliation are
correctness gates.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May proceed in parallel because files/inputs are independent.
- **[Story]**: Maps work to US1-US5 in `spec.md`.

---

## Phase 1: Baseline and fixtures

- [ ] T001 Record current deterministic N-car result snapshots, including every
  lap time, final position, gap, outcome, board, and storage, in
  `tests/fixtures/race-legibility-fixtures.ts`.
- [ ] T002 [P] Add equal-time, volatile-frame-order, changing-checkpoint-order,
  missed-boundary, and staggered-finish schedules to the fixture module.
- [ ] T003 [P] Add representative generated 6-corner, 10-corner, power-demand,
  braking-demand, and cornering-demand track fixtures.
- [ ] T004 [P] Inventory every `generateTrack`, `standingsAt`, `playerRank`,
  `playerGapToLeader`, ticker lead-change, marker, and Result track consumer in
  `contracts/race-legibility-contract.md`.

**Checkpoint**: Pre-feature outcomes and every relevant consumer are pinned.

---

## Phase 2: Playback integrity diagnosis (blocking)

### Tests

- [ ] T005 [P] [US3] Add exact before/at/after-boundary tests for
  `carProgressAt` including zero, wraparound, final boundary, and post-finish in
  `tests/unit/playback.test.ts`.
- [ ] T006 [P] [US3] Add property-style monotonicity tests for lap index plus
  fractional progress across varied schedules and visual times.
- [ ] T007 [P] [US3] Add marker placement tests proving `pointAtProgress` uses
  fractional lap geometry while lap index remains separately attributable.
- [ ] T008 [P] [US3] Add one-time event tests for entered laps, player callouts,
  staggered finishes, and all-finished transition.
- [ ] T009 [P] [US3] Add low-frame-rate tests crossing multiple lap boundaries
  and define the latest-checkpoint/no-duplicate behavior.
- [ ] T010 [P] [US3] Add final-transition tests proving Result data is the
  immutable resolved result rather than frame-derived rank.

### Diagnosis and correction

- [ ] T011 [US3] Run T005-T010 against current playback and document whether the
  reported mismatch is an actual progress defect, expected closed-loop wrapping,
  frame-ranking ambiguity, or a combination in `research.md`.
- [ ] T012 [US3] Correct only proven playback/progress defects in
  `src/simulation/playback.ts`, preserving contest results.
- [ ] T013 [US3] Add compact marker identity and lap-context presentation models
  in `src/scenes/raceProjectionPresentation.ts`.
- [ ] T014 [US3] Verify player/rival identity and differing lap counts remain
  readable when markers overlap.

**Checkpoint**: Playback integrity is proven before the leaderboard changes.

---

## Phase 3: Immutable contest evidence

### Tests

- [ ] T015 [P] Add failing N-car resolver tests requiring the exact generated
  `Track` and original roster `tieBreakOrder` on the result.
- [ ] T016 [P] Add failing tests proving all eight simulations, playback, and
  Results receive the same retained track value/structure.
- [ ] T017 [P] Add byte-for-byte regression assertions for every pre-existing
  result field in T001, comparing before/after the additive evidence fields.
- [ ] T018 [P] Add validation tests for duplicate/missing tie-break IDs and
  missing/malformed track evidence.

### Implementation

- [ ] T019 Extend `NCarContestResult` in `src/simulation/types.ts` with immutable
  `track` and `tieBreakOrder` evidence.
- [ ] T020 Emit the already-generated track and original roster ID order from
  `resolveNCarContest` in `src/simulation/contest.ts`.
- [ ] T021 Remove scored playback's independent `generateTrack` call and build
  its schedule from `result.track` in `src/scenes/ContestScene.ts`.
- [ ] T022 Update typed fixtures/adapters without inventing fallback track data;
  legacy absence uses an explicit unavailable presentation state.
- [ ] T023 Run evidence and result-parity tests.

**Checkpoint**: Simulation, playback, and review share one immutable track.

---

## Phase 4: User Stories 1 and 2 - Stable checkpoint projection (P1)

### Tests

- [ ] T024 [P] [US1] Add failing tests for `checkpointProjection` cumulative
  same-lap sums across all valid player checkpoints.
- [ ] T025 [P] [US1] Add failing tie tests proving checkpoint and final ranking
  both use `tieBreakOrder`.
- [ ] T026 [P] [US2] Add failing adjacent-ahead/behind and signed-gap tests for
  player first, middle, and last.
- [ ] T027 [P] [US1] Add failing `Awaiting Lap 1 Split`, once-per-player-lap,
  repeated-frame stability, and final-lap tests.
- [ ] T028 [P] [US1] Add failing missed-multiple-boundary tests that publish only
  the latest completed checkpoint once.
- [ ] T029 [P] [US2] Add failing gained/lost/held/first-split textual-state tests
  in `tests/unit/raceProjectionPresentation.test.ts`.

### Implementation

- [ ] T030 [US1] Implement pure `checkpointProjection` and typed malformed-input
  failures in `src/simulation/playback.ts`.
- [ ] T031 [US1] Implement `latestCompletedPlayerLap` and stable
  `updateLiveProjection` publication state.
- [ ] T032 [US2] Implement the player-centered presentation model with projected
  ordinal, split lap, adjacent ghosts, signed gaps, and position-change text in
  `src/scenes/raceProjectionPresentation.ts`.
- [ ] T033 [US1] Replace `ContestScene`'s full continuously reordered standings
  table with the shared stable projection model.
- [ ] T034 [US2] Render missing ahead/behind rows intentionally for first/last
  place without retaining stale comparison text.
- [ ] T035 [US1] Remove frame-derived lead-change ticker messages and replace
  them with checkpoint projection-change messages; retain valid player item and
  one-time finish facts.
- [ ] T036 [US1] Remove or retire unused scene-facing frame-ranking fields and
  formatters while retaining any pure diagnostic helper still covered by tests.
- [ ] T037 [US1] Run projection tests and manually verify a deliberately volatile race.

**Checkpoint**: The race communicates stable time-attack pace once per lap.

---

## Phase 5: User Story 4 - Authoritative track summary (P1)

### Tests

- [ ] T038 [P] [US4] Add failing exact segment-count, straight-distance,
  corner-distance, total-distance, and angle-statistic tests in
  `tests/unit/tracks.test.ts`.
- [ ] T039 [P] [US4] Add failing demand-score reuse and deterministic capability-
  note tests using the established four-stat vocabulary.
- [ ] T040 [P] [US4] Add failing reconciliation sweeps across a broad deterministic
  generated-track seed/stage matrix.
- [ ] T041 [P] [US4] Add failing Result formatting tests for available and legacy-
  unavailable track evidence in `tests/integration/result-scene.test.ts`.

### Implementation

- [ ] T042 [US4] Reuse the exported physics `cornerArcLength` authority and
  implement pure `summarizeTrack` in `src/simulation/tracks.ts` or a dedicated
  simulation summary module.
- [ ] T043 [US4] Implement concise track-composition and descriptive capability
  presentation in `src/scenes/trackSummaryPresentation.ts`.
- [ ] T044 [US4] Add track name, lap count, straight/corner counts, distance,
  angle range, demand traits, and four-stat notes to `src/scenes/ResultScene.ts`.
- [ ] T045 [US4] Integrate feature-025 aggregate stats when available without
  duplicating its panel or blocking feature 027 when it is not yet implemented.
- [ ] T046 [US4] Run track summary and Result tests; confirm Results never calls
  `generateTrack`.

**Checkpoint**: Results explains the exact circuit used by the contest.

---

## Phase 6: User Story 5 - Spectation, access, and responsive polish (P2)

- [ ] T047 [P] [US5] Add layout-model tests at 1920x1080, 1366x768, 1024x768,
  800x450, and 390x844 for race projection and Result track summary.
- [ ] T048 [P] [US5] Verify essential race information requires no hover or input.
- [ ] T049 [P] [US5] Verify projection change, marker identity, gaps, and demand
  traits without color and with reduced motion.
- [ ] T050 [US5] Refine shared theme/layout integration in `ContestScene.ts` and
  `ResultScene.ts` without scene-specific competing formatters.
- [ ] T051 [US5] Run browser visual review across player first/middle/last,
  overlapping markers, and each supported viewport.

---

## Phase 7: Regression and completion

- [ ] T052 Run complete checkpoint projection coverage for every valid lap count
  and deterministic fixture.
- [ ] T053 Confirm final result snapshots from T001 are unchanged apart from the
  additive `track` and `tieBreakOrder` evidence.
- [ ] T054 Confirm run rewards, advancement, history, and Test Day remain unchanged.
- [ ] T055 Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] T056 Complete the quickstart and record acceptance evidence.
- [ ] T057 Update `specs/HANDOFF.md` and add only genuinely deferred ideas to
  `specs/DEFERRED.md`.

## Dependencies

- Phase 2 integrity diagnosis blocks presentation changes.
- Phase 3 evidence blocks checkpoint tie parity and track summary integration.
- Phase 4 and Phase 5 may proceed in parallel after Phase 3.
- Phase 6 follows integrated race and Result surfaces.
- Feature 025 is independently implementation-ready. Feature 027 may consume its
  panel when present but does not depend on Feature 025 implementation.

## MVP

Phases 1-5 are the P1 implementation: proven playback integrity, stable
checkpoint projection, and authoritative track explanation. Accessibility,
responsive verification, and regression completion remain required before the
feature is considered complete.
