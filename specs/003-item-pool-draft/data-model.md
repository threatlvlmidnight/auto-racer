# Phase 1 Data Model: Item Pool & Performance-Identity Draft Weighting

## Overview

This feature extends `002-item-slots`'s `OfferedItem` with an optional identity tag and an optional buff effect, grows `ITEM_POOL` from 5 to 10-20 items, and introduces two new pure concepts (a weighted draw, a buff-resolution pass) that did not exist before. `Build`, `SpecCar`, `SampleGhost`, `ContestOutcome`, and `TimelineFrame` are unchanged in shape from `002-item-slots`.

## Entities

### SpecCar (unchanged)

```ts
interface SpecCar {
  id: string;
  baseTime: number;
}
```

No changes.

### IdentityTag (NEW)

```ts
export type IdentityTag = "performance";
```

A literal union, currently one value (Clarification: Performance is the only identity this feature implements). An `OfferedItem` with no `identityTag` is neutral — absence, not an explicit `"neutral"` value, represents "no identity signal" (research.md).

### OfferedItem (MODIFIED)

**Before (002-item-slots)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number;
}
```

**After (003-item-pool-draft)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  /** Applied to SpecCar.baseTime if held. Buff items (see `buff`) MUST set this to 0. */
  timeModifier: number;
  /** Absent = neutral (FR-003). */
  identityTag?: IdentityTag;
  /**
   * Present only on buff items (FR-009). If set, this item's `timeModifier`
   * MUST be 0 — its entire effect is expressed here instead.
   */
  buff?: {
    /** Percentage boost applied to other held items sharing this item's own identityTag. */
    boostPercent: number;
  };
}
```

A buff item's `buff.boostPercent` targets its *own* `identityTag` (Key Entities, spec.md) — there is no separate, independent "target tag" field; a buff item does not introduce a second tag dimension.

### Item Pool (MODIFIED)

`src/content/sample-data.ts` exports `ITEM_POOL: OfferedItem[]` grown from 5 to 10-20 items (FR-001), reusing `002-item-slots`'s original 5. Composition (FR-003, FR-009, Assumptions):
- A mix of performance-tagged and neutral direct items, each with a unique `name` and unique `timeModifier` magnitude within its category.
- At least one buff item (`buff` present, `timeModifier: 0`), tagged `"performance"` per this feature's scope (the only identity that exists to synergize with).

### Team Identity Constants (NEW)

```ts
export const ACTIVE_IDENTITY_TAG: IdentityTag = "performance";
export const TAG_WEIGHT = 0.75; // fraction of draws favoring ACTIVE_IDENTITY_TAG (FR-005)
```

Hardcoded constants, not yet player-facing selection (FR-004) — the "Team Identity" entity from spec.md is represented as data, not a type, since only one value exists.

### Weighted Draw (NEW — behavior, not a stored entity)

```ts
function drawItem(
  pool: OfferedItem[],
  targetTag: IdentityTag,
  tagWeight: number,
  rng: () => number
): OfferedItem
```

Given `rng` returning a value in `[0, 1)`: compares the first call against `tagWeight` to choose the tag-group (items with `identityTag === targetTag` vs. items where it's absent), then uses a second `rng()` call to pick uniformly within that group. See contracts/simulation-contract.md for invariants.

### Build (unchanged shape)

```ts
interface Build {
  car: SpecCar;
  heldItems: OfferedItem[];
}
```

Shape unchanged from `002-item-slots`. What changes is how `resultingTime(build)` computes its result: it now runs `heldItems` through `applyBuffs` (below) before summing.

### Buff Resolution (NEW — behavior, not a stored entity)

```ts
function applyBuffs(heldItems: OfferedItem[]): OfferedItem[]
```

Pure function: returns a new array, same length and order as the input, where each non-buff item's `timeModifier` is scaled by `(1 + totalMatchingBoostPercent / 100)` — `totalMatchingBoostPercent` being the sum of `boostPercent` across every held buff item sharing that item's `identityTag`. Buff items themselves pass through unchanged (their own `timeModifier` is always 0). An item with no matching buff item held is returned unchanged (FR-010 — inert is a valid, unmodified state).

### SampleGhost, ContestOutcome, TimelineFrame, ContestResult (unchanged)

Shapes unchanged from `002-item-slots`. `ContestResult.heldItems` continues to echo the final build's items (now potentially including tagged/buff items) for result-screen display.
