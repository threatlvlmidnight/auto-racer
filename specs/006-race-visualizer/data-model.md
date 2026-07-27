# Phase 1 Data Model: Race Visualizer — Watchable Contest Presentation

## Overview

This feature extends `LapBreakdown` with per-item contribution data, removes the now-superseded `TimelineFrame`/`ContestResult.timeline`, and introduces a new, purely-computed `PlaybackSchedule` used only by the presentation layer (never stored on `ContestResult` itself, since it's derived data, not part of the contest's own outcome). `Build`, `SpecCar`, `SampleGhost`, `OfferedItem`, and `Build`'s board/storage shape are unchanged from `005-lap-tick-simulation`.

## Entities

### LapBreakdown (MODIFIED)

**Before (005-lap-tick-simulation)**:
```ts
interface LapBreakdown {
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItemIds: string[];
}
```

**After (006-race-visualizer)**:
```ts
interface FiredItem {
  id: string;
  /** This item's actual applied contribution this lap: a direct item's boosted magnitude, or a buff's currently-applicable boost percent (flat: constant; stacking: current cumulative). */
  contribution: number;
}

interface LapBreakdown {
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItems: FiredItem[];
}
```

### ContestResult (MODIFIED — field removed)

`timeline: TimelineFrame[]` is removed. All other fields (`playerTime`, `ghostTime`, `gap`, `outcome`, `board`, `storage`, `laps`) are unchanged in shape.

### TimelineFrame (REMOVED)

Deleted entirely — confirmed zero remaining consumers (research.md).

### RACE_ANIMATION_SECONDS (NEW constant)

```ts
export const RACE_ANIMATION_SECONDS = 20; // spec.md Clarifications
```

Lives in `src/simulation/playback.ts` (the only consumer) rather than `types.ts`, since it's a presentation-timing constant, not a core simulation constant like `LAP_COUNT`.

```ts
export const MIN_VISUAL_LAP_SECONDS = 0.5;
```

A structural floor on each lap's *visual* duration, distinct from `005-lap-tick-simulation`'s `MIN_LAP_TIME` (which floors the *simulated* time). Without it, a lap near `MIN_LAP_TIME` scaled down by `scaleFactor` (≈0.35-0.4 typically) would render for roughly 0.03-0.04 real seconds — unreadable (research.md, `/speckit.analyze` finding F1).

### PlaybackSchedule (NEW — derived, not stored on `ContestResult`)

```ts
interface CarSchedule {
  /** Cumulative on-screen seconds at the END of each of the 10 laps, under the shared scale factor, each individual lap's share clamped to at least MIN_VISUAL_LAP_SECONDS. Length 10. */
  visualLapBoundaries: number[];
  /** The car's real per-lap simulated times (seconds), unscaled — used to interpolate cumulative simulated time within a lap. Length 10. */
  lapTimes: number[];
}

interface PlaybackSchedule {
  scaleFactor: number; // RACE_ANIMATION_SECONDS / max(playerTime, ghostTime)
  player: CarSchedule;
  ghost: CarSchedule;
}
```

**Clamping note**: a side whose laps never fall below the floor finishes at exactly its `scaleFactor`-derived total (the slower side still lands on `RACE_ANIMATION_SECONDS` exactly, per FR-002). A side with one or more laps clamped may finish slightly *after* its unclamped target — an accepted, bounded trade-off for keeping every lap readable (research.md).

Computed once per resolved contest by `buildPlaybackSchedule(result: ContestResult): PlaybackSchedule`. Not part of `ContestResult` itself — it's a pure derivation the presentation layer computes on demand, kept separate so `ContestResult` (the simulation's own output) doesn't grow a field that exists only to serve one particular presentation.

### CarProgress (NEW — computed per frame, not stored)

```ts
interface CarProgress {
  lapIndex: number; // 0-indexed; 10 once finished
  lapProgress: number; // 0-1 fraction through the current lap, drives position around the oval
  finished: boolean;
}
```

Returned by `carProgressAt(carSchedule: CarSchedule, visualTimeSeconds: number): CarProgress`.

### FrameState (NEW — the per-frame aggregate `ContestScene.ts` actually renders)

```ts
interface FrameState {
  player: CarProgress;
  ghost: CarProgress;
  /** playerCumulativeSimulated - ghostCumulativeSimulated, matching ContestResult.gap's sign convention (negative = player ahead). */
  liveGap: number;
  /** Newly-visible callout events as of this frame (empty most frames). */
  newCallouts: { item: OfferedItem; contribution: number }[];
}
```

Returned by `frameStateAt(schedule: PlaybackSchedule, result: ContestResult, visualTimeSeconds: number, alreadyShownLapIndex: number): FrameState` — the single entry point `ContestScene.ts` calls every `update(time, delta)` tick.

## Everything else

`SpecCar`, `OfferedItem`, `SampleGhost`, `Build`, `IdentityTag`, `SLOT_CAPACITY`/`STORAGE_CAPACITY`, `LAP_COUNT`, `MIN_LAP_TIME`, `ACTIVE_IDENTITY_TAG`/`TAG_WEIGHT`, `ContestOutcome` are all unchanged from `005-lap-tick-simulation`.
