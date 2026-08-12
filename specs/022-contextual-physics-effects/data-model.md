# Data Model: Contextual Physics Effects

## PhysicsCondition

A qualifier restricting where a stat delta applies. One kind exists today;
the shape is a discriminated union so a second kind can be added without
touching the first (research.md Decision 3; mirrors `SynergyCondition`,
`types.ts:130`).

```ts
export interface PhysicsCondition {
  kind: "corner-tightness";
  direction: "at-least" | "at-most";
  turnDegrees: number;
}
```

| Field | Type | Notes |
|---|---|---|
| `kind` | `"corner-tightness"` | Only kind in v1 (spec.md Assumptions). A future kind (e.g. `"straight-length"`) adds a new union member, never modifies this one. |
| `direction` | `"at-least" \| "at-most"` | `"at-least"`: matches when the corner's `turnDegrees` ≥ `turnDegrees`. `"at-most"`: matches when ≤. Required — spec.md FR-008 forbids special-casing one direction. |
| `turnDegrees` | `number` | The threshold angle. Same unit/domain as `TrackSegment`'s existing corner `turnDegrees` field — no new unit system introduced. |

**Validation invariant**: `turnDegrees` MUST be a finite, positive number.
An item authored with a non-positive or non-finite threshold is a content
bug (caught by content validation, not a runtime simulation concern — no
defensive fallback is added inside `simulateLapPhysics` beyond what
`018`/`021` already guarantee for corner angles generally).

## ConditionalPhysicsContribution

An item's stat delta, paired with the `PhysicsCondition` that gates it.

```ts
export interface ConditionalPhysicsContribution {
  condition: PhysicsCondition;
  delta: ItemPhysicsContribution;
}
```

| Field | Type | Notes |
|---|---|---|
| `condition` | `PhysicsCondition` | When this contribution applies. |
| `delta` | `ItemPhysicsContribution` | Reuses `021`'s existing four-optional-field delta shape unchanged (`accelerationDelta`/`topSpeedDelta`/`brakingPowerDelta`/`corneringSpeedDelta`) — no new delta shape introduced. |

**Relationship**: `ItemDefinition` gains one new optional field:

```ts
conditionalPhysics?: readonly ConditionalPhysicsContribution[];
```

Sits alongside the existing `physics?: ItemPhysicsContribution` field
(untouched) — an item may carry neither, either, or both (research.md
Decision 3).

**Validation invariant**: An empty array (`conditionalPhysics: []`) is
equivalent to the field being absent — both mean "no conditional
contributions." Consumers MUST treat `undefined` and `[]` identically
(matches `synergyEffects`' existing "Optional, defaults to empty" contract
on `ItemDefinition`, `types.ts:90`).

## Per-phase corner association (derived, not stored)

Not a new stored entity — a resolution rule applied at simulation time
(research.md Decision 1), summarized here for contract/task reference:

| Phase kind | Associated corner | Stat it gates |
|---|---|---|
| `accelerating` | `corners[previous]` (just exited) | `accelerationDelta` |
| `braking` | `corners[i]` (about to enter) | `brakingPowerDelta` |
| `cruising` | Either `corners[previous]` or `corners[i]` (match-if-either) | `topSpeedDelta` |
| *(none — resolved before spans, at `apexSpeed`)* | `corners[i]` itself | `corneringSpeedDelta` |

## LapPhaseBreakdown extension

**Current shape** (`types.ts:111`, unchanged fields):

```ts
export interface LapPhaseBreakdown {
  phase: LapPhaseKind;
  segmentIndex: number;
  seconds: number;
}
```

**Extension** (US3, FR-006 — exact field name/shape is a `tasks.md`
implementation choice, described here at the behavior level per spec.md's
own convention of leaving representation to planning): each phase entry
additionally reports which conditional contribution(s), if any, actually
applied to produce its `seconds` value — e.g. the source item id(s) and
which stat(s) were conditionally boosted. This is additive to the existing
three fields; nothing already consumed by `021`'s presentation code
changes shape or meaning.

**Validation invariant** (extends `021`'s existing "no unexplained
remainder" contract, contracts §3/§4 there): `Σ phases[].seconds` MUST
still equal `totalSeconds` exactly as today — conditional resolution
changes *which* `PhysicalStats` a phase's kinematics were computed against,
never how a phase's own seconds are summed into the lap total.

## Simulation entry point extension

**Current signature** (`tracks.ts:328`, unchanged for callers passing two
arguments — this is precisely FR-005/SC-003's zero-regression contract):

```ts
export function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
): { totalSeconds: number; phases: LapPhaseBreakdown[] }
```

**Extension** (research.md Decision 4):

```ts
export function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
  conditionalContributions: readonly ConditionalPhysicsContribution[] = [],
): { totalSeconds: number; phases: LapPhaseBreakdown[] }
```

`solveSpan`'s own four-argument signature (`tracks.ts:258`) is unchanged —
callers of `solveSpan` resolve the effective per-span `PhysicalStats`
*before* calling it; `solveSpan` itself never sees a condition or an item.

## `resolvePhysicalStats` (laps.ts) — unchanged; new sibling function

`resolvePhysicalStats` (`laps.ts:105`) keeps its exact current signature
and behavior — it resolves only unconditional (`physics`) deltas, exactly
as today. A new function collects conditional contributions from the same
active-item set:

```ts
function resolveConditionalPhysicsContributions(
  activeItems: readonly OfferedItem[],
): ConditionalPhysicsContribution[]
```

Flattens every active item's `conditionalPhysics` array into one list
(order-preserving, no deduplication — spec.md's Edge Cases requires
additive stacking, not deduplication). Passed as `simulateLapPhysics`'s
third argument alongside the existing `resolvePhysicalStats` result.
