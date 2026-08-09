# Phase 1 Data Model: Count-Synergy Buff — A Third Buff Kind

## Overview

This feature adds one optional field to `OfferedItem.buff` and one new function parameter to `buffs.ts`'s `computeBoostsForLap`. `Build`, `ContestResult`, `LapBreakdown`/`FiredItem`, `SpecCar`, `SampleGhost`, and every other existing type are unchanged from `006-race-visualizer`.

## Entities

### OfferedItem (MODIFIED)

**Before (006-race-visualizer)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number;
  identityTag?: IdentityTag;
  buff?: { boostPercent: number };
  cooldown?: number;
  activeWhileStored?: boolean;
}
```

**After (007-count-synergy-buff)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number;
  identityTag?: IdentityTag;
  buff?: {
    boostPercent: number;
    /**
     * If true, this buff's applied boost is boostPercent multiplied by the
     * count of other held direct items sharing its tag (board or storage,
     * active or inert) — a count-synergy buff. Absent/false = existing
     * flat/stacking behavior, governed by `cooldown` as before.
     */
    perCount?: boolean;
  };
  cooldown?: number;
  activeWhileStored?: boolean;
}
```

A count-synergy buff (`buff.perCount === true`) MUST have `cooldown` absent (FR-002) — the same "no cooldown = always potentially active" reading `isFlatBuff` already uses, so a count-synergy buff is structurally a flat buff's cousin (no cooldown) with a different, composition-derived magnitude instead of a fixed constant.

### Buff Kind classification (NEW helpers, not stored data)

```ts
function isFlatBuff(item: OfferedItem): boolean // unchanged: !!item.buff && item.cooldown === undefined
function isCountSynergyBuff(item: OfferedItem): boolean // NEW: !!item.buff?.perCount
```

Every buff is now one of three kinds: **flat** (`buff` present, no `cooldown`, no `perCount`), **stacking** (`buff` present, `cooldown` set), or **count-synergy** (`buff.perCount` true, implies no `cooldown`). `isFlatBuff` returns `true` for count-synergy buffs too (both have no cooldown) — this is intentional and already correct for `006-race-visualizer`'s callout-exclusion purposes (research.md): a count-synergy buff's value doesn't change lap-to-lap any more than a flat buff's does, so it shouldn't trigger a per-lap callout either.

### Qualifying Count (NEW — computed, not stored)

```ts
function matchingDirectItemCount(allHeldItems: OfferedItem[], item: OfferedItem): number
```

The count of items in `allHeldItems` that are not `item` itself, are not buffs (`!candidate.buff`), and share `item.identityTag`. Not persisted anywhere — recomputed from current build state whenever needed (it can't change mid-contest, since board/storage composition is fixed once a contest starts).

### `computeBoostsForLap` (MODIFIED signature)

**Before**:
```ts
function computeBoostsForLap(
  activeItems: OfferedItem[],
  lap: number,
  incomingState: StackingState
): LapBoosts
```

**After**:
```ts
function computeBoostsForLap(
  activeItems: OfferedItem[],
  allHeldItems: OfferedItem[],
  lap: number,
  incomingState: StackingState
): LapBoosts
```

`LapBoosts`'s own shape (`{ boostsByTag, stackingState }`) is unchanged. `allHeldItems` is used only for count-synergy buffs' `matchingDirectItemCount` call; flat and stacking buffs ignore it entirely.

## Everything else

`Build`, `ContestResult`, `LapBreakdown`, `FiredItem`, `SpecCar`, `SampleGhost`, `IdentityTag`, `SLOT_CAPACITY`/`STORAGE_CAPACITY`, `LAP_COUNT`, `MIN_LAP_TIME`, `RACE_ANIMATION_SECONDS`, `MIN_VISUAL_LAP_SECONDS` are all unchanged from `006-race-visualizer`.
