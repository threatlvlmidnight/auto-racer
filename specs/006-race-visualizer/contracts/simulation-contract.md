# Internal Contract: Simulation Module (updated for 006-race-visualizer)

This project has no external API, service, or other system consuming it — the only "interface" worth contracting is the boundary between `src/simulation/` (framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This feature adds one new module (`playback.ts`), adds `isFlatBuff` to `buffs.ts`, modifies `laps.ts`'s `PlayerLap`/`contest.ts`'s `resolveContest`, and removes `buildTimeline`. `drawItem`, `firesOnLap`, `computeBoostsForLap`, `hasOpenSlot`/`addItem`/`evictAndAdd`, `hasOpenStorageSlot`/`moveToStorage`/`moveToBoard`/`swapBoardStorage` are all unchanged and not restated here.

## `isFlatBuff` (NEW, in `buffs.ts`)

```ts
function isFlatBuff(item: OfferedItem): boolean
```

Returns `!!item.buff && item.cooldown === undefined`. Pure, no side effects.

## `simulatePlayerLaps` / `PlayerLap` (MODIFIED)

```ts
interface FiredItem {
  id: string;
  contribution: number;
}
interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
}
function simulatePlayerLaps(build: Build): PlayerLap[]
```

**Change**: `firedItemIds: string[]` becomes `firedItems: FiredItem[]`. For each firing direct item, `contribution` is its actual boosted per-lap magnitude that lap (already computed). For each firing buff item, `contribution` is its currently-applicable boost percent: `item.buff.boostPercent` for a flat buff, or `lapBoosts.stackingState[index]` (the cumulative value `computeBoostsForLap` already returns) for a stacking buff.

**Invariants (test these first, per strict TDD)**:
1. **Direct item contribution matches its applied effect**: a firing direct item's `contribution` equals exactly the value added to that lap's `time`.
2. **Flat buff contribution is constant**: always equals `item.buff.boostPercent`, regardless of lap.
3. **Stacking buff contribution matches its cumulative state**: equals `computeBoostsForLap`'s returned `stackingState` value for that item's index, on every lap it appears in `firedItems`.
4. All prior invariants from `005-lap-tick-simulation`'s contract (exactly `LAP_COUNT` entries, minimum floor, cooldown correctness, determinism, order-independence, no side effects) continue to hold.

## `resolveContest` / `ContestResult` (MODIFIED)

**Change**: `laps[].firedItemIds` becomes `laps[].firedItems` (passed through from `simulatePlayerLaps` unchanged). `ContestResult.timeline` is **removed** — `resolveContest` no longer calls `buildTimeline`, and `TIMELINE_FRAME_COUNT`/the `TimelineFrame` import are deleted from `contest.ts`.

**Invariants**: all prior invariants (determinism, outcome correctness, breakdown sums to totals, no side effects, purity) continue to hold — this is a shape change only, not a computation change.

## `buildPlaybackSchedule` (NEW, in `playback.ts`)

```ts
function buildPlaybackSchedule(result: ContestResult): PlaybackSchedule
```

**Behavior**: `scaleFactor = RACE_ANIMATION_SECONDS / Math.max(result.playerTime, result.ghostTime)`. For each side, each lap's raw visual duration is `scaleFactor * lapTime`, clamped to at least `MIN_VISUAL_LAP_SECONDS` (data-model.md); `visualLapBoundaries[i]` is the cumulative sum of these (possibly-clamped) per-lap durations through lap `i+1`. `lapTimes` is that side's raw (unscaled) per-lap simulated times from `result.laps`.

**Invariants (test these first, per strict TDD)**:
1. **Both sides share the same `scaleFactor`** — never independently derived.
2. **The slower side's final `visualLapBoundaries` entry equals `RACE_ANIMATION_SECONDS` exactly, *provided none of its laps needed clamping***; the faster side's final entry is strictly less than `RACE_ANIMATION_SECONDS` under the same condition (or exactly equal, only on a tie).
3. **No lap's visual duration is ever below `MIN_VISUAL_LAP_SECONDS`**, regardless of how short its simulated time is — verified with a fixture lap at `005-lap-tick-simulation`'s `MIN_LAP_TIME` floor under a `scaleFactor` small enough that the unclamped result would otherwise fall below it.
4. **Monotonically increasing**: each side's `visualLapBoundaries` strictly increases lap over lap (guaranteed by both `MIN_LAP_TIME` and the `MIN_VISUAL_LAP_SECONDS` floor).
5. **Determinism, no side effects, purity** — same as every other `src/simulation/` function.

## `carProgressAt` (NEW, in `playback.ts`)

```ts
function carProgressAt(carSchedule: CarSchedule, visualTimeSeconds: number): CarProgress
```

**Behavior**: finds the lap index whose `visualLapBoundaries` entry is the first `>= visualTimeSeconds`; `lapProgress` is the fractional position within that lap's segment (0 at the segment's start boundary, 1 at its end). If `visualTimeSeconds` is at or past the final boundary, returns `{ lapIndex: 10, lapProgress: 1, finished: true }`.

**Invariants (test these first, per strict TDD)**:
1. `visualTimeSeconds = 0` → `lapIndex: 0, lapProgress: 0`.
2. `visualTimeSeconds` at or past the final boundary → `finished: true`.
3. `lapProgress` is always in `[0, 1]`.
4. Pure, deterministic, no side effects.

## `cumulativeSimulatedTimeAt` (NEW, in `playback.ts`)

```ts
function cumulativeSimulatedTimeAt(carSchedule: CarSchedule, visualTimeSeconds: number): number
```

**Behavior**: using the same lap index/fraction `carProgressAt` would derive, returns the car's actual cumulative *simulated* (unscaled) time elapsed: sum of completed laps' `lapTimes` plus `lapProgress * currentLapTime`.

**Invariants**: monotonically non-decreasing as `visualTimeSeconds` increases; at `visualTimeSeconds = 0` returns `0`; once `finished`, returns the side's full total (`playerTime` or `ghostTime`).

## `liveGapAt` (NEW, in `playback.ts`)

```ts
function liveGapAt(schedule: PlaybackSchedule, visualTimeSeconds: number): number
```

**Behavior**: `cumulativeSimulatedTimeAt(schedule.player, t) - cumulativeSimulatedTimeAt(schedule.ghost, t)` — same sign convention as `ContestResult.gap` (negative = player currently ahead).

**Invariants**: once both `carProgressAt` calls report `finished: true` (i.e., at or beyond whichever side's schedule ends later — normally `RACE_ANIMATION_SECONDS`, but possibly slightly later if any lap needed the `MIN_VISUAL_LAP_SECONDS` clamp), `liveGapAt` equals `result.gap` exactly.

## `calloutEventsForLap` (NEW, in `playback.ts`)

```ts
function calloutEventsForLap(lap: LapBreakdown, itemsById: Map<string, OfferedItem>): { item: OfferedItem; contribution: number }[]
```

**Behavior**: maps `lap.firedItems` to their full `OfferedItem` (via `itemsById`), filters out any item where `isFlatBuff(item)` is true (FR-007), returns the rest.

**Invariants (test these first, per strict TDD)**:
1. A flat buff in `firedItems` never appears in the output.
2. A direct item or stacking buff in `firedItems` always appears in the output, paired with its `contribution`.
3. No side effects; pure given its inputs.

## `frameStateAt` (NEW, in `playback.ts` — aggregator)

```ts
function frameStateAt(
  schedule: PlaybackSchedule,
  result: ContestResult,
  visualTimeSeconds: number,
  lastRenderedPlayerLapIndex: number
): FrameState
```

**Behavior**: combines `carProgressAt` (both sides), `liveGapAt`, and — only when the player's `lapIndex` has just advanced past `lastRenderedPlayerLapIndex` — `calloutEventsForLap` for the newly-entered lap, so callouts surface exactly once per lap rather than every frame.

**Invariants**:
1. `newCallouts` is empty on every frame where the player's lap index hasn't changed since the last call.
2. `newCallouts` reflects exactly one lap's events on the frame where the lap index does change.
3. Pure given its inputs — `ContestScene.ts` is responsible for tracking and passing `lastRenderedPlayerLapIndex` between calls, not this function.

## Non-goals for this contract

- No network calls, no persistence — unchanged from 001-005.
- No skip/fast-forward logic — `visualTimeSeconds` is expected to advance monotonically via the scene's own frame clock; this contract doesn't define behavior for time running backward.
- No track/venue variety, no corner-specific geometry — a single oval is a rendering concern in `ContestScene.ts`, not modeled here at all.
- No changes to slot capacity, eviction, draft weighting, board/storage movement, or the underlying lap-tick simulation itself (002-005) — this contract only covers deriving watchable playback timing from an already-resolved `ContestResult`.
