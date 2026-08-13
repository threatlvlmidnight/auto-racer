# Contract: Race Legibility and Playback Integrity

## 1. Contest evidence

The scored N-car resolver returns the exact generated `Track` and original
`tieBreakOrder` with the immutable result. It generates the track once and uses
that value for every player's and rival's lap simulation.

- Playback MUST use `result.track`.
- Results MUST use `result.track`.
- Neither scene may call `generateTrack` for an already-resolved contest.
- Adding evidence MUST NOT change any lap time, final position, gap, or outcome.

## 2. Checkpoint projection

```ts
function checkpointProjection(
  result: NCarContestResult,
  completedLap: number,
): CheckpointProjection;
```

- Pure, deterministic, and framework-free.
- Rejects lap numbers outside `1..result.lapCount` and malformed lap arrays.
- Sums each car's recorded lap times through exactly `completedLap`.
- Sorts ascending cumulative time and breaks ties by `result.tieBreakOrder`.
- Returns the player plus immediate ranked neighbors and signed player-relative gaps.
- Does not read playback schedules, visual time, progress, geometry, or final position.

## 3. Publication cadence

```ts
function latestCompletedPlayerLap(progress: CarProgress, lapCount: number): number;

function updateLiveProjection(
  previous: LiveProjectionState,
  result: NCarContestResult,
  playerProgress: CarProgress,
): LiveProjectionState;
```

- Before the first completed lap, state is `Awaiting Lap 1 Split`.
- State changes only when latest completed player lap increases.
- Multiple boundaries crossed in one call publish the latest valid checkpoint once.
- Repeated calls within one lap return an equal state.
- Final Results never derive from this state.

## 4. Playback integrity

- `carProgressAt` remains the single progress authority.
- `pointAtProgress` consumes only fractional lap progress for closed-loop marker
  geometry; lap count remains separately visible.
- Finish transition is monotonic and emitted once per car.
- Player item callouts remain scoped to player evidence.
- Frame-derived lead-change commentary is not shown once checkpoint projection
  becomes the ranking model.
- Tests cover exact boundaries, float-adjacent boundaries, wraparound, ties,
  missed frames, early finishers, and all-finished transition.

## 5. Player-centered presentation

The always-visible view shows:

- current player lap;
- `Projected Pn` after the first split;
- completed checkpoint lap;
- immediately adjacent ghost ahead and behind when present;
- signed same-checkpoint gaps;
- gained/lost/held position text at checkpoint changes.

It MUST NOT render a continuously reordering full-field table. The eight-car
final standings remain on Results.

## 6. Track summary

```ts
function summarizeTrack(
  track: Track,
  lapCount: number,
): TrackCompositionSummary;
```

- Pure and deterministic.
- Counts segment kinds directly.
- Uses straight `length` and the same exported `cornerArcLength` used by physics.
- Reuses retained `track.characteristics` demand values.
- Computes exact min/max/mean corner angles without severity buckets.
- Uses feature 025/024 physical-stat vocabulary for capability notes.
- Labels notes as descriptive track traits; never claims unrecorded exact seconds.
- Missing legacy evidence yields a typed unavailable model.

## 7. Accessibility and responsive behavior

- Essential information requires no interaction or hover.
- Player and rival identity cannot rely on color alone.
- Projection changes have textual status; animation is optional reinforcement.
- Race and Results layouts preserve consequential content at 1920x1080,
  1366x768, 1024x768, 800x450, and 390x844.

## 8. Regression boundary

Feature 027 MUST NOT change stock stats, items, Buff/Synergy rules, generated
track algorithms, physical formulas, ghost lap evidence, contest time, final
ranking, run rewards, or run progression. Any authoritative defect discovered
by integrity tests requires separately documented evidence before this boundary
may be revised.
