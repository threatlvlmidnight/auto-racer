# Data Model: Race Spectacle

## Track

Immutable authored content. One of exactly 3 in the catalog.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable content ID, e.g. `"track-harborline"` |
| `name` | string | Display name, presentation only |
| `points` | `{x: number, y: number}[]` | A closed-loop path, authored fixed data — never computed at runtime |

Track selection carries no simulation authority: it never affects lap
times, finishing order, or any value already fixed by
`012-multi-ghost-contest`'s `NCarContestResult`.

## `selectTrack`

```ts
function selectTrack(runSeed: number, pvpStageOrdinal: number): Track;
```

Pure and deterministic: `(runSeed + pvpStageOrdinal) mod 3` indexes into
the fixed 3-track catalog (Research Decision 2). Identical inputs always
select the identical track — this is the mechanism that satisfies "the
same contest, replayed, always shows the same track" (spec.md FR-003) and,
by extension, "canonical across every viewer" once real async multiplayer
exists.

## Car Schedule

Replaces today's `PlaybackSchedule.player`/`.ghost` fields.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Matches the corresponding `CarResult.id` from `012` |
| `visualLapBoundaries` | `number[]` | Unchanged meaning from today's `CarSchedule` |
| `lapTimes` | `number[]` | Unchanged meaning from today's `CarSchedule` |

## Playback Schedule (extended)

| Field | Type | Rules |
|---|---|---|
| `scaleFactor` | number | Derived from the slowest car's total time across all 8 cars, not just 2 (generalizes today's `max(playerTime, ghostTime)`) |
| `cars` | `CarSchedule[]` | Exactly 8 entries, same order as `NCarContestResult.cars` |
| `track` | `Track` | The result of `selectTrack`, attached once per schedule so every consumer reads the same selected track |

## Car Progress (unchanged shape, now per-array-entry)

| Field | Type | Rules |
|---|---|---|
| `lapIndex` | number | Unchanged meaning |
| `lapProgress` | number, 0-1 | Unchanged meaning |
| `finished` | boolean | Unchanged meaning |

## Ranked Car (new — powers both standings and ticker)

The output of `standingsAt(schedule, visualTimeSeconds)`, one entry per car,
ordered by live position.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Matches `CarResult.id` |
| `position` | integer, 1-indexed | Live position at this moment; contiguous, no duplicates |
| `cumulativeTime` | number | This car's simulated elapsed time at this moment (via `cumulativeSimulatedTimeAt`) |

`standingsAt` is the single source of "what's the current order" — both
the live standings sidebar (spec.md FR-004) and ticker lead-change
detection (FR-006) call it; neither computes its own ordering.

## Frame State (extended)

| Field | Type | Rules |
|---|---|---|
| `cars` | `CarProgress[]` | Replaces today's separate `player`/`ghost` fields |
| `standings` | `RankedCar[]` | Output of `standingsAt` at this frame's `visualTimeSeconds` |
| `newCallouts` | `CalloutEvent[]` | Scoped to the player's own car only — never populated for a rival (spec.md FR-005) |
| `newTickerLines` | `TickerLine[]` | Player's own firing events (every one) plus rival "notable moment" lines (lead changes, finishes) detected by comparing this frame's `standings` to the previous frame's |

## Ticker Line

| Field | Type | Rules |
|---|---|---|
| `t` | number | Visual playback timestamp this line appeared at |
| `carId` | string | Which car the line is about |
| `kind` | `"player-fired"` \| `"took-lead"` \| `"finished"` | Curation category (spec.md FR-006); exact kind set may grow in implementation but MUST stay within "derivable from precomputed facts," never invented |
| `text` | string | Rendered commentary, authored in-repo voice — never Skribidi Skids POC copy |

A rival never produces a `"player-fired"`-equivalent line for its own
firings — only `"took-lead"`/`"finished"` category lines exist for
rivals, matching FR-006's curation rule.

## Validation Invariants

1. `selectTrack(runSeed, pvpStageOrdinal)` called twice with identical
   arguments returns the identical `Track` (by `id`).
2. A `PlaybackSchedule`'s `cars` array always has exactly 8 entries, in
   the same order as the `NCarContestResult.cars` it was built from.
3. `standingsAt(schedule, t)` always returns exactly 8 `RankedCar`s with a
   contiguous 1..8 `position` permutation, no duplicates, at any `t`.
4. `newCallouts` is never non-empty for a frame whose entered lap belongs
   to a car other than the player.
5. Every `TickerLine` is attributable to a specific precomputed fact
   (a `firedItems` entry, a `standingsAt` position change, or a
   `CarProgress.finished` transition) — none is synthesized independently.
6. None of the above ever reads live input, wall-clock time, or unseeded
   randomness; all are pure functions of `(NCarContestResult, Track,
   visualTimeSeconds)` or a subset thereof.
