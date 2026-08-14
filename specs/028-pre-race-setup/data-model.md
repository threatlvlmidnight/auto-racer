# Data Model: Pre-Race Setup

## Control authoring

```ts
type SetupControlFamily =
  | "driver-aggression"
  | "brake-balance"
  | "steering-response"
  | "gearing"
  | "propeller-pitch"
  | "racing-line"
  | "bodywork-trim";

interface ConfigurableSetupEffect {
  family: Exclude<SetupControlFamily, "driver-aggression">;
  magnitude: 1;
}
```

`ItemDefinition.configurableSetup?: ConfigurableSetupEffect`. Launch magnitude
is one for every authored item. Same-family installed items add magnitudes.

## Control definition

```ts
interface SetupPositionDefinition {
  id: "low" | "balanced" | "high";
  label: string;
  deltaPerMagnitude: ItemPhysicsContribution;
}

interface SetupControlDefinition {
  family: SetupControlFamily;
  label: string;
  positions: readonly [SetupPositionDefinition, SetupPositionDefinition, SetupPositionDefinition];
}
```

Definitions are immutable launch content owned by `raceSetup.ts`. The middle
position always has an all-zero delta; low/high are exact inverses.

## Derived eligible control

```ts
interface EligibleSetupControl {
  family: SetupControlFamily;
  sourceItemIds: readonly string[]; // empty only for driver-aggression
  magnitude: number;                // 1 universal; number of installed sources
  positions: readonly SetupPositionPresentation[];
}
```

Invariants:

- Driver Aggression exists exactly once.
- Stored items never appear in `sourceItemIds`.
- One family produces one control regardless of source count.
- Source IDs are stable-sorted for canonical equality.

## Draft and remembered state

```ts
type SetupPositionId = "low" | "balanced" | "high";
type SetupSelections = Partial<Record<SetupControlFamily, SetupPositionId>>;

interface RunSetupMemory {
  enabled: boolean;
  selections: SetupSelections;
}
```

The scene draft contains selections for currently eligible controls plus the
checkbox state. Missing selections resolve to `balanced`. Remembered ineligible
families remain in run memory but contribute nothing.

## Locked setup

```ts
interface LockedSetupControl {
  family: SetupControlFamily;
  position: SetupPositionId;
  sourceItemIds: readonly string[];
  magnitude: number;
  appliedDelta: ItemPhysicsContribution;
}

interface LockedRaceSetup {
  rulesVersion: "race-setup-v1";
  encounterId: string;
  trackId: string;
  controls: readonly LockedSetupControl[];
  totalDelta: ItemPhysicsContribution;
}
```

Validation rejects:

- unknown rules/family/position;
- track or encounter mismatch;
- missing universal control;
- equipment family not enabled by the locked build;
- source IDs that differ from current installed eligibility;
- incorrect magnitude, per-control delta, ordering, or aggregate delta;
- duplicate family entries.

## Per-car contest and ghost evidence

```ts
interface CarResult {
  // existing fields...
  setup?: LockedRaceSetup; // absent only for explicitly supported legacy evidence
}

interface RecordedGhost {
  build: VehicleBuild;
  setup: LockedRaceSetup;
  trackId: string;
  simulationRulesVersion: string;
}
```

Every car is simulated from its own build/setup pair. A setup belonging to one
car cannot be copied to another because validation checks installed source IDs.

For generated rivals, legal combination enumeration is bounded by the same
four-slot topology: at most five controls including Driver Aggression, hence at
most `3^5 = 243` full-race candidates per rival. Candidate arrays use canonical
family order and `low`, `balanced`, `high` position order; stable first minimum
wins exact time ties.

## Setup input and practice snapshot

```ts
interface RaceSetupInput {
  run: Run;
  encounterId: string;
  build: VehicleBuild;
  track: Track;
  eligibleControls: readonly EligibleSetupControl[];
  initialSelections: SetupSelections;
}

interface PracticeSetupSnapshot {
  origin: "pre-race-setup";
  track: Track;
  setup: LockedRaceSetup;
  draftSelections: SetupSelections;
  rememberChecked: boolean;
  focusFamily?: SetupControlFamily;
}
```

Practice snapshot is navigation state only. It never becomes `RunSetupMemory`
and never completes the PvP encounter.

## Launch authoring matrix

| Entrant | Item | Family |
|---|---|---|
| Evelyn Mercer | Hand-Fitted Steering Knuckle | steering-response |
| Lucien Soto | Two-Speed Drive Hub | gearing |
| Inez Rook | Variable-Pitch Propeller | propeller-pitch |
| Inez Rook | Differential Braking Valve | brake-balance |
| Inez Rook | Gyroscopic Stabilizer | racing-line |
| Nell Voss | Adjustable Bodywork Stay | bodywork-trim |
| Nell Voss | Split-Circuit Brake Valve | brake-balance |
