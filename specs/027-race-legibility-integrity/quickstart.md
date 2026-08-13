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
