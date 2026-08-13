# Data Model: Race Legibility and Playback Integrity

## Authoritative result extension

```ts
interface NCarContestResult {
  lapCount: number;
  cars: CarResult[];
  outcome: ContestOutcome;
  board: OfferedItem[];
  storage: OfferedItem[];
  track: Track;
  tieBreakOrder: readonly string[];
}
```

`track` is the same generated object supplied to every car's simulation.
`tieBreakOrder` records original roster priority before final sorting. Both are
immutable contest evidence and do not affect already-resolved times.

## Checkpoint projection

```ts
interface CheckpointCar {
  carId: string;
  role: CarRole;
  name: string;
  color: string;
  completedLap: number;
  cumulativeTime: number;
  position: number;
  gapToPlayer: number; // car cumulative time - player cumulative time
}

interface CheckpointProjection {
  completedLap: number;
  lapCount: number;
  cars: readonly CheckpointCar[]; // ranked, contiguous positions
  playerPosition: number;
  player: CheckpointCar;
  ahead: CheckpointCar | null;
  behind: CheckpointCar | null;
}
```

Every `CheckpointCar.cumulativeTime` sums exactly laps `[0, completedLap)`.
All cars use the same completed-lap count. Ties use `tieBreakOrder`.

## Stable live presentation state

```ts
type LiveProjectionState =
  | { kind: "awaiting-first-split"; label: "Awaiting Lap 1 Split" }
  | {
      kind: "projected";
      current: CheckpointProjection;
      previous: CheckpointProjection | null;
      change: "gained" | "lost" | "held" | "first-split";
      placesChanged: number;
    };
```

The scene updates this state only when the player's latest completed lap
increases. If several boundaries are crossed in one frame, it derives only the
latest checkpoint and retains the previously published state for comparison.

## Marker presentation

```ts
interface MarkerPresentation {
  carId: string;
  role: CarRole;
  lapLabel: string;
  fractionalProgress: number;
  finished: boolean;
  identityLabel: string;
}
```

Marker position still derives from `CarProgress.lapProgress`. `lapLabel` and
identity distinguish cars on different laps; no field claims marker order is
rank.

## Track summary

```ts
interface TrackCompositionSummary {
  trackId: string;
  trackName: string;
  lapCount: number;
  straightCount: number;
  cornerCount: number;
  totalStraightDistance: number;
  totalCornerDistance: number;
  totalDistance: number;
  minCornerDegrees: number;
  maxCornerDegrees: number;
  meanCornerDegrees: number;
  demands: {
    power: number;
    braking: number;
    cornering: number;
  };
  capabilityNotes: readonly {
    stat: "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";
    text: string;
  }[];
}
```

Distance uses the simulation's straight lengths plus `cornerArcLength` for each
corner. Capability notes are deterministic descriptive rules over these facts;
they do not calculate build-specific seconds.

## Validation invariants

1. `track` is the exact track used for all eight cars.
2. `tieBreakOrder` contains every car ID exactly once.
3. Projection lap is within `1..lapCount`; every car has that many recorded laps.
4. Projection positions are a contiguous permutation with no duplicates.
5. Adjacent `ahead`/`behind` are the immediately neighboring ranked entries.
6. Straight count plus corner count equals `track.segments.length`.
7. Total distance equals straight distance plus corner distance within floating tolerance.
8. Final display reads `CarResult.position`, never the last projection.
