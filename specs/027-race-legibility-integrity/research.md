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

## Diagnosis (T011): no proven playback defect

Ran the full T005-T010 integrity suite (`tests/unit/playback.test.ts`,
54 tests) against unmodified `carProgressAt`, `pointAtProgress`,
`frameStateAt`, and `nCarFrameStateAt` before any presentation change.
Result: **zero authoritative defects**. Findings, per contract §4:

- **T005 exact boundaries**: at a non-final boundary instant, `carProgressAt`
  reports the *completing* lap's index at `lapProgress: 1` (not the next
  lap's index at progress 0); the instant after, it correctly rolls to the
  next lap at progress ≈0. This is intentional, matching `frameStateAt`'s own
  `result.laps[player.lapIndex]` evidence lookup at the completion instant —
  keep as-is, not a defect.
- **T006 monotonicity**: nondecreasing across five varied schedules (uniform,
  accelerating, decelerating, irregular, `MIN_VISUAL_LAP_SECONDS`-clamped)
  sampled every 0.05s for the full animation window plus overrun — holds
  everywhere.
- **T007 spatial vs. rank**: `pointAtProgress(track, progress)` takes only
  fractional progress (arity 2, no lap-index parameter) — two cars on
  different laps at equal fractional progress render at the identical point.
  Confirmed as expected closed-loop geometry (Decision 5), not a defect;
  Phase 2's `raceProjectionPresentation.ts` (T013) adds the identity/lap
  labeling this makes necessary.
- **T008/T009 one-time events and low-frame-rate jumps**: entered-lap/callout
  evidence fires exactly once per caller-recorded lap index, including after
  a single jump spanning multiple boundaries — `carProgressAt` and
  `frameStateAt` are both stateless and derive the correct final lap from
  whatever time they're given, with no accumulation or replay risk. The
  *publish-only-the-latest-checkpoint* requirement (contract §3) is a
  property of `updateLiveProjection`, built fresh in Phase 4 — it has no
  existing counterpart to diagnose here.
- **T010 final vs. frame**: `resultFormatting.ts`'s functions
  (`outcomeLabel`, `positionLabel`, `standingsRow`, etc.) already take only
  `NCarContestResult`, never a frame/schedule — confirmed structurally
  (no such parameter exists) and by value (a volatile/staggered fixture's
  mid-race frame order is independent of, and never substituted for, the
  final `result.cars` order already used by `ResultScene`).

**Conclusion**: Phase 2 requires no changes to `src/simulation/playback.ts`
(T012 is a no-op). The two real gaps this diagnosis surfaces are
presentation gaps, not simulation defects: (1) markers need an explicit
identity/lap-context label since screen position alone cannot communicate
rank (addressed by T013's `raceProjectionPresentation.ts`), and (2) the
*live* standings sidebar itself performs frame-level reordering — a design
choice from `013-race-spectacle`, not a bug — which Phase 4 replaces per
Decision 6.

## Decision 9: Stop frame-derived lead commentary

Ticker messages caused only by frame-level `standingsAt` lead changes are
removed or replaced by checkpoint projection-change messages. Player item
callouts and one-time finish facts may remain when derived from immutable
evidence.

**Why**: Announcing a lead model that the primary UI intentionally no longer
uses would reintroduce contradictory churn.
