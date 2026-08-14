# Quickstart: Race Legibility and Playback Integrity

## Goal

Verify that the watched race presents stable equal-lap time-attack projections,
that marker motion is faithful to immutable schedules without claiming physical
road order, and that Results explains the exact track used by simulation.

## Integrity fixtures

Include contests covering:

1. Eight equal lap schedules to exercise roster tie order.
2. Frequent frame-level order changes but stable lap splits.
3. Player moving first -> middle -> last and last -> middle -> first at checkpoints.
4. Unequal lap times with cars on different laps around the closed path.
5. A low-frame-rate update crossing multiple player boundaries.
6. Ghosts finishing before and after the player.
7. Generated tracks with 6 and 10 corners and varied demand profiles.
8. A legacy/malformed result with missing track evidence.

## Verification flow

1. Resolve a scored contest and assert `result.track` is the same track supplied
   to every car simulation; assert `tieBreakOrder` matches original roster order.
2. Sample playback at start, immediately before/at/after every visual lap
   boundary, during wraparound, and after finish. Compare every marker's progress
   with `carProgressAt` and its point with `pointAtProgress`.
3. Before player lap one completes, confirm `Awaiting Lap 1 Split` remains fixed.
4. At each player checkpoint N, independently sum every car's first N recorded
   laps. Confirm projected rank, adjacent ghosts, and signed gaps match exactly.
5. Advance through frames inside the next lap. Confirm projection text and rows
   do not change despite any frame-level ordering changes.
6. Cross several boundaries in one update. Confirm only the latest checkpoint
   publishes and no duplicate event burst occurs.
7. Complete the race. Confirm Results position/time/gaps are read directly from
   `NCarContestResult` and remain byte-identical to the pre-feature values.
8. Confirm Results shows exact straight/corner count, physical distance, corner
   angles, existing demand scores, and descriptive four-stat notes from
   `result.track` without calling `generateTrack`.
9. Repeat visual review at all supported viewports, in monochrome, and with
   reduced motion. Confirm player/ghost identity and projection change do not
   depend on color or animation.

## Automated checks

```sh
npm test
npm run lint
npm run build
```

## Expected invariants

- Existing car lap times, final positions, gaps, outcomes, rewards, and run state
  are unchanged.
- Projection changes at most once per completed player lap.
- Every projection compares the same lap count for all eight cars.
- Marker geometry never becomes the ranking source.
- Simulation, playback, and Results use the same retained track.
- Missing track evidence is labeled unavailable, never regenerated.

## Completion evidence

- `npm test`: 887 passed (0 failed) — up from 780 before this feature (825
  after feature 025). New coverage: 82 tests in `tests/unit/playback.test.ts`
  (playback-integrity diagnosis T005-T010, `checkpointProjection`/
  `latestCompletedPlayerLap`/`updateLiveProjection` T024-T028, the T052 full
  lap-count/fixture sweep, the T053 additive-only-evidence proof), 17 tests
  in `tests/unit/raceProjectionPresentation.test.ts` (marker identity T013/
  T014, `projectionPresentation` T029, US5 no-hover/no-color T048/T049), 12
  new tests in `tests/unit/tracks.test.ts` (`summarizeTrack` T038-T040, T049
  demand-trait legibility), 3 tests in `tests/unit/race-legibility-
  baseline.test.ts` (T001 pre-feature snapshot), and 5 new tests in `tests/
  unit/contest.test.ts` / `tests/integration/result-scene.test.ts` (T015-
  T018 evidence contract, T041 track-summary presentation).
- `npm run lint` / `npm run build`: clean throughout.
- Diagnosis outcome (T011, recorded in full in `research.md`): **zero
  authoritative playback defects found**. `carProgressAt`, `pointAtProgress`,
  `frameStateAt`, and `nCarFrameStateAt` all matched independent
  calculation at every sampled boundary, wraparound, tie, and multi-boundary
  jump. `src/simulation/playback.ts`'s pre-existing progress math required
  no correction (T012 was a no-op); the real gaps were presentational
  (marker identity, and the live standings table itself), both addressed by
  this feature.
- Manual browser verification: confirmed the retired live-reordering
  standings sidebar is fully replaced by the stable "PROJECTED PACE" panel,
  and that it correctly reads `Awaiting Lap 1 Split` at race start (the
  FR-006 initial state). Test Day/Practice scenes (unaffected by this
  feature) continued to render correctly throughout. **Full live-race
  verification of a checkpoint publishing (lap 1 → lap 2 transition) and of
  the Results track-summary panel was not obtained** — this environment's
  backgrounded browser tab throttles `requestAnimationFrame` severely
  (confirmed independently of any code change: 40+ seconds of real wait
  advanced the 20-second full-field race animation only marginally), making
  a full 10-lap race impractical to sit through via this tool. Confidence
  instead rests on the 887-test suite, which independently re-derives and
  checks every checkpoint/projection/track-summary value the same way the
  quickstart's manual steps 4-8 describe.
- One structural note for future work: `contestFormatting.ts`'s
  `standingsRows` is no longer called by any scene (the sidebar it fed is
  retired) but is kept, per T036, because `tests/unit/contestFormatting.test.ts`
  still covers it as a pure formatter — delete only if a future pass
  confirms it has no remaining purpose.
