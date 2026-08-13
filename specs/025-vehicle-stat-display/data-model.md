# Data Model: Vehicle Stat Display

All types below are derived presentation data. Authoritative sources remain
`STOCK_PHYSICAL_STATS`, the current/prospective `VehicleBuild`, and recorded
`PlayerLap.physics` evidence.

```ts
type VehicleStatKey =
  | "acceleration"
  | "topSpeed"
  | "brakingPower"
  | "corneringSpeed";

type VehicleStatContext =
  | { kind: "stock" }
  | { kind: "current-build" }
  | { kind: "placement-preview"; destinationLabel: string }
  | { kind: "race-lap"; lap: number; lapCount: number }
  | { kind: "result-lap"; lap: number; lapCount: number }
  | { kind: "test-day"; lap?: number };

interface VehicleStatPanelModel {
  context: VehicleStatContext;
  contextLabel: string;
  lines: readonly VehicleStatLineModel[];
  conditionalSources: readonly ConditionalStatSource[];
  status: "available" | "partially-available" | "unavailable";
  unavailableReason: string | null;
  accessibilityLabel: string;
}

interface VehicleStatLineModel {
  key: VehicleStatKey;
  label: string;
  compactLabel: string;
  unit: string;
  stockValue: number;
  currentValue: number | null;
  currentLabel: string;
  stockDelta: number | null;
  stockDeltaLabel: string | null;
  comparisonDelta: number | null;
  comparisonDeltaLabel: string | null;
  state: "improved" | "reduced" | "unchanged" | "unavailable";
  changeSources: readonly StatChangeSource[];
}

interface StatChangeSource {
  sourceItemId: string;
  sourceLabel: string;
  value: number;
  valueLabel: string;
  state: "active" | "inactive" | "conditional";
  reasonLabel?: string;
}

interface ConditionalStatSource extends StatChangeSource {
  state: "conditional";
  conditionLabel: string;
  affectedSegments?: readonly number[];
}
```

## Current build input

```ts
interface CurrentVehicleStatInput {
  build: VehicleBuild;
  stock: PhysicalStats;
}
```

The resolver uses existing tier and installation authorities. Stored inert
items do not contribute. Unresolved conditional physical effects populate
`conditionalSources`, not `currentValue`.

## Placement preview input

```ts
interface ProspectiveVehicleStatInput {
  currentBuild: VehicleBuild;
  preview: PlacementPreview;
  prospectiveBuild: VehicleBuild;
  destinationLabel: string;
  stock: PhysicalStats;
}
```

`prospectiveBuild` must be obtained through the existing garage command path.
The panel's `comparisonDelta` is prospective minus current; no mutation occurs.

## Recorded lap input

```ts
interface RecordedLapVehicleStatInput {
  lap: number;
  lapCount: number;
  physics?: {
    stats: PhysicalStats;
    itemContributions?: readonly ItemPhysicalContributionEvidence[];
  };
}
```

Absent `physics` produces an unavailable panel. Present `stats` with missing
item contributions produces an available aggregate with unavailable source
reconciliation. Segment-conditional evidence remains separate from the four
whole-lap values.

## State transitions

```text
Current Build -> valid destination focus -> Placement Preview
Placement Preview -> cancel/invalid       -> Current Build
Placement Preview -> commit               -> new Current Build
Race Lap N -> recorded lap boundary       -> Race Lap N+1
Any context -> missing authority           -> Unavailable (labeled)
```

No transition in this presentation model mutates the build or advances a race.
