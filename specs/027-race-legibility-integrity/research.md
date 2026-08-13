# Research: Race Legibility and Playback Integrity

## Decision 1: Rank only at equal-lap checkpoints

`checkpointProjection(result, completedLap)` compares each car's sum of recorded
lap times through the same 1-indexed `completedLap`. It never reads animation
time, marker coordinates, fractional progress, or wall-clock time.

**Why**: A meaningful time-attack split compares like with like. The current
frame-level ordering compares interpolated progress continuously and changes too
quickly to read.

**Rejected**: Debouncing the existing live table. It would display an arbitrary
stale sample rather than a defined race checkpoint.

## Decision 2: Publish on player checkpoints and hold

The displayed projection begins as `Awaiting Lap 1 Split`. When the player
completes lap N, the view publishes the equal-lap-N projection and holds it
until the player completes lap N+1. A low-frame-rate update that crosses several
boundaries publishes the latest completed checkpoint once and does not replay a
burst of obsolete rankings.

**Why**: The player requested once-per-lap updates. Using player boundaries gives
the UI a single understandable cadence.

**Rejected**: Updating when any ghost completes a lap; that recreates churn and
compares unequal checkpoint counts.

## Decision 3: Retain contest tie-break order explicitly

`NCarContestResult` gains immutable `tieBreakOrder: readonly string[]` in the
original roster priority used by final resolution: player first, then rivals in
authored roster order. Checkpoint ties use that array.

**Why**: `result.cars` is already sorted by final position. It cannot safely
reconstruct the original rival order used to break final ties.

**Rejected**: Rival ID or final-position order. Neither is the binding contest
tie rule.

## Decision 4: Retain the exact generated Track on the result

`resolveNCarContest` already generates one `Track` before simulating every car.
It returns that exact immutable value as `result.track`. `ContestScene` builds
playback from `result.track`; `ResultScene` summarizes `result.track`. Neither
scene calls `generateTrack`.

**Why**: This makes one object authoritative across simulation, playback, and
review, eliminating independent regeneration even though generation is pure.

**Rejected**: Store only `(seed, level)` and regenerate later. Reproducibility is
not as strong as retained evidence, and legacy/migration handling becomes
ambiguous.

## Decision 5: Spatial progress is not rank

`carProgressAt` and `pointAtProgress` continue to place cars by fractional lap
progress for spectacle. Rank comes only from checkpoint projection during the
race and final result afterward. Each marker receives a persistent identity mark
and compact lap indicator; the interface does not label along-track order as
position.

**Why**: On a closed circuit, a later-lap car can wrap behind an earlier-lap car
on screen. That is correct geometry, not a leaderboard.

## Decision 6: Player-centered comparison replaces the table

The always-visible race summary contains the player's projected ordinal, the
adjacent projected ghost ahead and behind, same-checkpoint signed gaps, the
completed split lap, and a textual change from the previous projection. The
full eight-car list is reserved for final Results.

**Why**: Three stable rows answer the immediate racing question without asking
the player to track eight moving names.

## Decision 7: Track summary uses existing physical definitions

`summarizeTrack(track)` derives:

- straight and corner counts directly from `segments`;
- total straight distance from straight `length`;
- total corner distance from the existing exported `cornerArcLength` formula;
- total physical distance as their sum;
- minimum, maximum, and mean corner angle;
- existing `powerDemand`, `brakingDemand`, and `corneringDemand` scores from the
  retained track characteristics.

No new arbitrary sharp/gentle or long/short classification thresholds are
introduced. The concise capability notes map long/abundant straights to Top
Speed, repeated exits to Acceleration, higher braking demand to Braking Power,
and cornering demand/angles to Cornering Speed. They are labeled track traits,
not exact time attribution.

**Why**: Existing track physics already defines distance and demand. Reusing it
avoids a second classification system that might disagree with simulation.

**Rejected**: New corner severity buckets. Their thresholds would be arbitrary
and add no information beyond exact angles and existing demand scores.

## Decision 8: Integrity tests precede UI replacement

Tests first pin progress interpolation, closed-loop wrapping, player checkpoint
detection, equal-lap cumulative ranking, ties, missed boundaries, finishes, and
final-result parity. Only then is the live table removed.

**Why**: This distinguishes expected loop geometry from an actual defect and
prevents presentation work from masking one.

## Decision 9: Stop frame-derived lead commentary

Ticker messages caused only by frame-level `standingsAt` lead changes are
removed or replaced by checkpoint projection-change messages. Player item
callouts and one-time finish facts may remain when derived from immutable
evidence.

**Why**: Announcing a lead model that the primary UI intentionally no longer
uses would reintroduce contradictory churn.
