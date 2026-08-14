# Data Model: Race Playback Controls

## PlaybackSpeed

A closed presentation-only value:

- `normal` — displayed `1×`; schedule-time multiplier `0.5`.
- `fast` — displayed `2×`; schedule-time multiplier `1.0`.

Validation rules:

- No other value is valid.
- A new playback scene always initializes to `normal`.
- Selecting the current value is idempotent.
- The value is never serialized into a Run, setup, result, settlement, recovery record, or persistent settings.

## PresentationClock

Fields:

- `scheduleTimeSeconds`: finite monotonic time already consumed from the immutable playback schedule.
- `speed`: current `PlaybackSpeed`.

Transition `advance(realDeltaSeconds)`:

1. Reject or neutralize negative/non-finite deltas at the typed boundary.
2. Retain `previousScheduleTimeSeconds`.
3. Add `realDeltaSeconds × speedMultiplier`.
4. Return the closed interval evidence needed to derive crossed boundaries.

Transition `selectSpeed(speed)`:

- Replaces `speed` only.
- Does not alter `scheduleTimeSeconds`.
- Re-selecting the active speed produces an equivalent state.

## PlaybackAdvance

Immutable evidence for one rendered update:

- `previousScheduleTimeSeconds`
- `scheduleTimeSeconds`
- `speed`

It relates one real-time update to boundary derivation without changing the schedule or result.

## CrossedPlaybackEvent

A presentation event whose immutable schedule boundary lies in `(previousScheduleTimeSeconds, scheduleTimeSeconds]`.

Kinds:

- player lap entered/completed
- player item callout sourced from that recorded lap
- checkpoint projection sourced from that completed lap
- car finished
- Results-ready once all cars are finished

Ordering:

1. Boundary schedule time ascending.
2. Existing stable result/tie-break order when times are equal.
3. Stable event-kind order where a single boundary produces multiple presentation facts.

Each boundary is outside the next interval after it is consumed, guaranteeing exactly-once publication.

## PlaybackControlModel

Fields per control:

- speed value
- visible label (`1×` or `2×`)
- shortcut (`1` or `2`)
- selected boolean
- non-color selected marker/label

There are always exactly two controls and exactly one is selected during active playback.

## State Lifecycle

```text
scene create
  → clock { time: 0, speed: normal }
  → advance zero or more frames
  → select normal/fast any number of times
  → all-finished boundary
  → navigate once to Results
  → scene shutdown discards clock and input handlers
```
