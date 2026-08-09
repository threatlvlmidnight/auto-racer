# Race Spectacle Contract

This contract defines the framework-free interfaces used by track content,
track selection, and extended playback scheduling. Exact TypeScript names
may follow repository conventions, but these inputs, outputs, and
invariants are binding.

## 1. Track Catalog Contract

```ts
interface Track {
  id: string;
  name: string;
  points: readonly { x: number; y: number }[];  // closed-loop path, fixed authored data
}

function selectTrack(runSeed: number, pvpStageOrdinal: number): Track;
```

Binding behavior:

- The catalog contains exactly 3 `Track`s, each fixed, hand-authored data —
  never generated, computed, or randomized at runtime.
- `selectTrack` is pure and deterministic: identical `(runSeed,
  pvpStageOrdinal)` always selects the identical `Track`.
- `selectTrack` introduces no new identifier concept — it consumes only
  values `012-multi-ghost-contest` already threads through
  `resolveContest` (`seed`, `level`).

## 2. Extended Playback Schedule Contract

```ts
interface CarSchedule {
  id: string;                 // matches a 012 CarResult.id
  visualLapBoundaries: number[];
  lapTimes: number[];
}

interface PlaybackSchedule {
  scaleFactor: number;        // derived from the slowest of all 8 cars
  cars: CarSchedule[];        // exactly 8, same order as NCarContestResult.cars
  track: Track;               // selectTrack's result, attached once
}

function buildPlaybackSchedule(
  result: NCarContestResult,  // from 012-multi-ghost-contest
  track: Track,
): PlaybackSchedule;
```

Binding behavior:

- Pure function of `(result, track)`; no live input, no randomness.
- `scaleFactor` generalizes today's two-car `max(playerTime, ghostTime)`
  to `max(...cars.map(c => c.time))` — every car's on-screen pace stays
  proportional to its real computed time under one shared scale.

## 3. Standings and Frame State Contract

```ts
interface CarProgress {
  lapIndex: number;
  lapProgress: number;   // 0-1
  finished: boolean;
}

interface RankedCar {
  id: string;
  position: number;      // 1-indexed, contiguous, no duplicates
  cumulativeTime: number;
}

interface TickerLine {
  t: number;
  carId: string;
  kind: "player-fired" | "took-lead" | "finished";
  text: string;
}

interface FrameState {
  cars: CarProgress[];              // exactly 8, same order as schedule.cars
  standings: RankedCar[];           // exactly 8, ordered by live position
  newCallouts: CalloutEvent[];      // player's car only, per FR-005
  newTickerLines: TickerLine[];     // curated per FR-006
}

function standingsAt(schedule: PlaybackSchedule, visualTimeSeconds: number): RankedCar[];
function frameStateAt(
  schedule: PlaybackSchedule,
  result: NCarContestResult,
  visualTimeSeconds: number,
  previousStandings: RankedCar[] | null,
): FrameState;
```

Binding behavior:

- `standingsAt` is the single source of "what's the current order." Both
  the live standings sidebar and ticker lead-change detection call this
  exact function — no second, independent ordering implementation may
  exist anywhere in the codebase.
- `newCallouts` is never populated for any car other than the player's own
  (`role: "player"` in `012`'s `CarResult`) — this is a hard rule, not a
  default that happens to be empty for rivals today.
- `newTickerLines`'s `"player-fired"` lines are emitted for every one of
  the player's own precomputed firing events (reusing the existing
  `calloutEventsForLap`, unchanged). `"took-lead"`/`"finished"` lines are
  emitted for a rival only when `standingsAt` shows that rival's position
  changing to 1st, or that rival's `CarProgress.finished` transitioning to
  `true` — never for every rival firing.
- Both functions are pure: identical arguments always produce identical
  output; neither reads live input, wall-clock time, or unseeded
  randomness.

## 4. Migration Requirements

- `src/scenes/ContestScene.ts` renders the `PlaybackSchedule.track`,
  every car in `frameStateAt(...).cars` (not just 2 markers), the
  `standings` array as a live sidebar, and `newTickerLines`. The existing
  player-board-flash-on-`newCallouts` behavior is preserved unchanged and
  is NOT extended to any other car.
- `src/scenes/contestFormatting.ts`'s `leaderLabel(liveGap: number)` is
  replaced by an N-car standings label reading from `RankedCar[]` — no
  function in the migrated codebase may assume exactly one opponent.
- Every existing test asserting the old two-car
  `PlaybackSchedule.player`/`.ghost` shape is migrated to the new
  `cars: CarSchedule[]` shape or explicitly and visibly removed.
