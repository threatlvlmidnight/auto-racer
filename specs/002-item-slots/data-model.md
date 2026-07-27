# Phase 1 Data Model: Item Slots — Flat Cap with Evict-to-Add

## Overview

This feature migrates `Build` from a single optional item to a bounded list, and adds one new pure-rules concept (slot capacity) that did not exist in `001-core-loop`. Everything else in `001-core-loop`'s data model (`SpecCar`, `OfferedItem`, `SampleGhost`, `ContestOutcome`, `TimelineFrame`) is unchanged in shape.

## Entities

### SpecCar (unchanged)

```ts
interface SpecCar {
  id: string;
  baseTime: number; // seconds, the shared spec-series baseline
}
```

No changes. Still the identical starting point for every build.

### OfferedItem (unchanged shape, pool grows)

```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number; // seconds; negative = faster, positive = slower
}
```

No shape change. `src/content/sample-data.ts` now exports an `ITEM_POOL: OfferedItem[]` of 4-5 items with genuinely different `timeModifier` magnitudes (per Clarification Q1), reusing 001's original item as one entry for continuity, instead of a single `OFFERED_ITEM` constant.

### Item Slot Capacity (NEW)

```ts
export const SLOT_CAPACITY = 3; // illustrative default, per FR-001 / Assumptions
```

A flat constant, identical for every team, with no per-team or per-identity variation (FR-001, FR-007). Not a type — a fixed value the slot rules and UI both read.

### Build (MODIFIED — breaking change from 001-core-loop)

**Before (001-core-loop)**:
```ts
interface Build {
  car: SpecCar;
  item: OfferedItem | null;
  itemAccepted: boolean;
}
```

**After (002-item-slots)**:
```ts
interface Build {
  car: SpecCar;
  heldItems: OfferedItem[]; // 0..SLOT_CAPACITY items, order not meaningful
}
```

**Validity rule**: `0 <= heldItems.length <= SLOT_CAPACITY` always. Nothing in this feature produces or accepts a `Build` outside this range — `slots.ts`'s functions are the only way to add items, and they enforce the bound (see Contracts).

**Order-independence (SC-004)**: `heldItems` is treated as a set for outcome purposes — `resultingTime` sums modifiers regardless of list order, and `resolveContest` takes only a finished `Build`, never the sequence of accept/evict actions that produced it. Two builds with the same items in different list order are contest-equivalent by construction.

### ContestResult (MODIFIED — field rename/generalization)

**Before (001-core-loop)**:
```ts
interface ContestResult {
  playerTime: number;
  ghostTime: number;
  gap: number;
  outcome: ContestOutcome;
  itemAccepted: boolean;
  timeline: TimelineFrame[];
}
```

**After (002-item-slots)**:
```ts
interface ContestResult {
  playerTime: number;
  ghostTime: number;
  gap: number;
  outcome: ContestOutcome;
  heldItems: OfferedItem[]; // final build's items, for result-screen legibility
  timeline: TimelineFrame[];
}
```

`itemAccepted: boolean` is replaced by `heldItems: OfferedItem[]` — the direct generalization from "was the one item accepted" to "which items ended up held." `resultFormatting.ts`'s single-item `choiceLabel`/`comparisonLabel` functions are replaced by a held-items-list formatter (see quickstart.md).

### ContestOutcome, TimelineFrame (unchanged)

No changes — `"win" | "loss" | "tie"` and the internal frame shape from 001 carry forward as-is.

## Relationships

```
SpecCar (1) ──< Build (1, via car)
OfferedItem (0..N) ──< Build (via heldItems, bounded by SLOT_CAPACITY)
Build (1) ── resultingTime() ──> number
Build (1) + SampleGhost (1) ── resolveContest() ──> ContestResult
ContestResult.heldItems == the Build.heldItems that produced it (echoed through for display)
```

## State transitions (prepare phase, per round)

A round starts with a `Build` (initially `{ car: BASELINE_CAR, heldItems: [] }`) and one offered `OfferedItem`:

1. **Not full** (`heldItems.length < SLOT_CAPACITY`):
   - Accept → `addItem(build, offered)` → `heldItems.length` grows by 1.
   - Decline → `build` unchanged.
2. **Full** (`heldItems.length === SLOT_CAPACITY`):
   - Accept-with-swap on held item at index `i` → `evictAndAdd(build, i, offered)` → same length, item at `i` replaced.
   - Decline → `build` unchanged.

After 5 rounds (fixed placeholder count, per Clarification Q2), the final `Build` is passed to `resolveContest`.
