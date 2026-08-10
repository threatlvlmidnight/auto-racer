# Synergy Effect Contract

This contract defines the framework-free interfaces used by authored
synergy content, synergy resolution, and its attribution in simulation
results. Exact TypeScript names may follow repository conventions, but
these inputs, outputs, and invariants are binding.

## 1. Authored Content Contract

```ts
type SynergyTarget =
  | { kind: "tag"; tag: string }
  | { kind: "category"; category: InstallationCategory };

type SynergyCondition =
  | { kind: "linear-per-count"; percentPerMatch: number }
  | { kind: "exact-other-count"; count: number; bonusPercent: number };

interface SynergyEffect {
  target: SynergyTarget;
  appliesTo: "others" | "self";
  condition: SynergyCondition;
  description: string;
}
```

Binding behavior:

- `ItemDefinition.synergyEffects: readonly SynergyEffect[]` is new,
  optional, and defaults to empty. It is independent of `ItemDefinition
  .buff` — an item may have either, both, or neither; the two fields
  never interact.
- `SynergyCondition` is a discriminated union. A new `kind` MAY be added
  later without changing the meaning or handling of `"linear-per-count"`
  or `"exact-other-count"` (FR-012).
- `exact-other-count.count` MUST support `0` (the "lone item" case) and
  any other non-negative integer.

## 2. Resolution Contract

```ts
function resolveSynergyEffects(build: VehicleBuild): Map<string, SynergyResolution>;
// keyed by VehicleSlotState.slotId

interface SynergyResolution {
  appliedDeltaPercent: number;
  applications: SynergyApplication[];
}

interface SynergyApplication {
  sourceItemId: string;
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  description: string;
}
```

Binding behavior:

- Pure and deterministic: identical `build` always returns a deeply equal
  result.
- Reads only `build.slots`. `build.storage` MUST NOT be inspected —
  a stored item never counts toward any target, regardless of quantity
  (FR-005).
- A `SynergyEffect`'s own source item is excluded from its target's
  count, for both `"others"` and `"self"` application (FR-006).
- Every simultaneously-applicable effect is included in
  `applications` — none is dropped when multiple effects apply to the
  same slot.
- Never reads live input, wall-clock time, unseeded randomness, or any
  other car's build (FR-010).

## 3. Simulation Integration Contract

```ts
function effectiveItem(
  item: ItemDefinition,
  installation: InstallationResolution,
  synergy: SynergyResolution | undefined,
): ItemDefinition;
```

Binding behavior:

- Extends the existing `effectiveItem` function (`laps.ts`) — the
  Fitted/Improvised fold happens first, then the synergy delta folds on
  top, on the same effective item, using the same numeric-field-mutation
  pattern already established (adjusting `timeModifier` or
  `buff.boostPercent` as appropriate to the item's own effect kind).
- `ContributionEvidence` gains an optional `synergy?: SynergyApplication[]`
  field, populated only when `applications` is non-empty for that item's
  slot, listing every contributing effect (FR-007).

## 4. Garage Presentation Contract

```ts
interface SynergyEffectDisplay {
  target: SynergyTarget;
  targetLabel: string;
  currentMatchCount: number;
  applies: boolean;
  currentValueLabel: string;
}

function garageItemInspector(
  item: ItemDefinition,
  slotType: SlotType | null,
  credits: number,
  build: VehicleBuild,          // new parameter: needed for live synergy match counts
): GarageItemInspector & { synergyEffects: SynergyEffectDisplay[] };
```

Binding behavior:

- `synergyEffects` contains one `SynergyEffectDisplay` per authored
  effect on the inspected item, reflecting the *current* build's live
  match count and whether the effect currently applies — never only the
  item's static authored description (FR-009).
- No new presentation module, scene, or build-wide overview is
  introduced — this is the only change to the inspector's public shape
  (FR-013).

## 5. Non-Interference Requirements

- Every existing test asserting `item-012`/`item-014`/`item-015`'s
  behavior (identity-tag buffs) MUST continue passing unchanged — this
  feature adds a field and a resolution pass alongside the existing buff
  system, never inside it (FR-008, SC-005).
- No function introduced or modified by this feature may accept or read
  more than one car's `VehicleBuild` — single-build scope only (FR-010).
