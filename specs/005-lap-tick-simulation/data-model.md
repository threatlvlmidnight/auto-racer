# Phase 1 Data Model: Lap-Tick Race Simulation (No Visuals)

## Overview

This feature renames `SpecCar`'s and `SampleGhost`'s totals into per-lap paces, adds a `cooldown` field to `OfferedItem`, introduces a `LapBreakdown` type, and adds a `laps` field to `ContestResult`. `Build`, `IdentityTag`, `SLOT_CAPACITY`/`STORAGE_CAPACITY`, and the board/storage shape are unchanged from `004-board-storage-ui`.

## Entities

### SpecCar (MODIFIED)

**Before (001-core-loop through 004-board-storage-ui)**:
```ts
interface SpecCar {
  id: string;
  baseTime: number; // seconds, total finishing time with no items
}
```

**After (005-lap-tick-simulation)**:
```ts
interface SpecCar {
  id: string;
  /** Seconds this car takes per lap with no active item effects. */
  baseLapTime: number;
}
```

### SampleGhost (MODIFIED — "control car")

**Before**:
```ts
interface SampleGhost {
  id: string;
  finishingTime: number; // seconds, fixed total
}
```

**After**:
```ts
interface SampleGhost {
  id: string;
  /** Seconds per lap — identical every lap (FR-008). Never affected by items. */
  lapTime: number;
}
```

Total ghost time for a race = `lapTime × LAP_COUNT` (FR-009), no longer separately authored.

### LAP_COUNT, MIN_LAP_TIME (NEW constants)

```ts
export const LAP_COUNT = 10; // FR-001, Clarifications
export const MIN_LAP_TIME = 0.1; // illustrative floor, FR-016 — small positive constant
```

### OfferedItem (MODIFIED)

**Before (003/004)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number; // one-time magnitude
  identityTag?: IdentityTag;
  buff?: { boostPercent: number };
  activeWhileStored?: boolean;
}
```

**After (005-lap-tick-simulation)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  /** Per-lap magnitude, applied on laps this item fires (FR-003). Same field, reinterpreted meaning — no rename. */
  timeModifier: number;
  identityTag?: IdentityTag;
  /**
   * Present + no cooldown → flat buff (FR-005): boostPercent applies every lap, unconditionally.
   * Present + cooldown set → stacking buff (FR-006): boostPercent is the per-firing increment
   * added to a cumulative total each time this item fires.
   */
  buff?: { boostPercent: number };
  /**
   * Laps between firings (FR-003). Required by convention for direct items
   * (every direct item must have one). For buff items, presence/absence is
   * what distinguishes stacking from flat (see `buff` above) — absent on a
   * non-buff item would be a content-authoring error, not a valid state.
   */
  cooldown?: number;
  activeWhileStored?: boolean;
}
```

A cooldown of 1 fires every lap; a cooldown of N fires on laps `1, 1+N, 1+2N, …` (FR-003).

### LapBreakdown (NEW)

```ts
interface LapBreakdown {
  lap: number; // 1-indexed
  playerLapTime: number; // after clamping to MIN_LAP_TIME
  ghostLapTime: number; // always equal to SampleGhost.lapTime
  /** ids of items that contributed this lap — flat buffs always included; direct items and stacking buffs only on firing laps. */
  firedItemIds: string[];
}
```

### StackingState (NEW — internal computation state, not exported as domain data)

```ts
type StackingState = Record<number, number>; // keyed by active-item array index, not item id (research.md)
```

Not part of `Build`, `ContestResult`, or any persisted/authored data — purely an intermediate value threaded through `laps.ts`'s internal loop and `buffs.ts`'s `computeBoostsForLap`.

### ContestResult (MODIFIED)

**Before (003/004)**:
```ts
interface ContestResult {
  playerTime: number;
  ghostTime: number;
  gap: number;
  outcome: ContestOutcome;
  board: OfferedItem[];
  storage: OfferedItem[];
  timeline: TimelineFrame[];
}
```

**After (005-lap-tick-simulation)**:
```ts
interface ContestResult {
  playerTime: number; // now = sum of laps[].playerLapTime
  ghostTime: number;  // now = lapTime × LAP_COUNT
  gap: number;
  outcome: ContestOutcome;
  board: OfferedItem[];
  storage: OfferedItem[];
  timeline: TimelineFrame[]; // unchanged — still synthetic interpolation (research.md)
  /** NEW: one entry per lap, sufficient to reconstruct playerTime/ghostTime without recomputation (FR-010). */
  laps: LapBreakdown[];
}
```

All pre-existing fields keep their names and shapes — this is purely additive from the perspective of anything that already reads `ContestResult` (confirmed no scene file needs changes, plan.md Summary).

### Build, IdentityTag, SLOT_CAPACITY, STORAGE_CAPACITY, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, ContestOutcome, TimelineFrame (unchanged)

Shapes unchanged from `004-board-storage-ui`.
