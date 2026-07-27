# Phase 1 Data Model: Board & Storage — Drag-and-Drop Prepare UI

## Overview

This feature migrates `Build` from a compact `heldItems` list into two fixed-size, index-addressable collections (`board`, `storage`), adds an `activeWhileStored` flag to `OfferedItem`, and changes what `resultingTime` treats as the "active" item set. `SpecCar`, `SampleGhost`, `ContestOutcome`, `TimelineFrame`, `IdentityTag`, and the buff-related fields on `OfferedItem` are unchanged in shape from `003-item-pool-draft`.

## Entities

### SpecCar, IdentityTag (unchanged)

No changes from `003-item-pool-draft`.

### OfferedItem (MODIFIED)

**Before (003-item-pool-draft)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number;
  identityTag?: IdentityTag;
  buff?: { boostPercent: number };
}
```

**After (004-board-storage-ui)**:
```ts
interface OfferedItem {
  id: string;
  name: string;
  timeModifier: number;
  identityTag?: IdentityTag;
  buff?: { boostPercent: number };
  /** If true, this item's effect applies even while held in storage (FR-011/FR-012). Absent/false = inert while stored (the default). */
  activeWhileStored?: boolean;
}
```

### STORAGE_CAPACITY (NEW)

```ts
export const STORAGE_CAPACITY = SLOT_CAPACITY;
```

A named alias, not an independent number — the spec requires storage to always match the board's capacity (Clarifications), so this stays derived rather than separately configurable.

### Build (MODIFIED — breaking change from 003-item-pool-draft)

**Before (003-item-pool-draft)**:
```ts
interface Build {
  car: SpecCar;
  heldItems: OfferedItem[];
}
```

**After (004-board-storage-ui)**:
```ts
interface Build {
  car: SpecCar;
  /** Fixed length SLOT_CAPACITY. null = open slot. Items here always contribute to the outcome. */
  board: (OfferedItem | null)[];
  /** Fixed length STORAGE_CAPACITY. null = open slot. Items here are inert unless activeWhileStored. */
  storage: (OfferedItem | null)[];
}
```

Both arrays are always exactly their capacity in length (no growing/shrinking) — an open slot is represented by `null` at that index, not by array shortening. This is what gives each visual slot stable positional identity for drag targets (research.md).

### Refresh Allowance (NEW — scene-level state, not part of `Build`)

Not a `Build` field. `PrepareScene` tracks `refreshesRemaining: number` (default 1), decremented on use and reset to 1 whenever the round advances (Next) — a counter, not a boolean, so a future item effect that grants additional refreshes (FR-007) only needs to add to this value, not change its type. See research.md for why this isn't modeled on `Build`.

### ContestResult (MODIFIED)

**Before (003-item-pool-draft)**:
```ts
interface ContestResult {
  playerTime: number;
  ghostTime: number;
  gap: number;
  outcome: ContestOutcome;
  heldItems: OfferedItem[];
  timeline: TimelineFrame[];
}
```

**After (004-board-storage-ui)**:
```ts
interface ContestResult {
  playerTime: number;
  ghostTime: number;
  gap: number;
  outcome: ContestOutcome;
  /** Compacted (non-null) board items, for result-screen display. */
  board: OfferedItem[];
  /** Compacted (non-null) storage items, for result-screen display. */
  storage: OfferedItem[];
  timeline: TimelineFrame[];
}
```

`heldItems` is replaced by the same `board`/`storage` split as `Build`, so the result screen can show both sections (and which storage item, if any, was actually contributing) without re-deriving it.

### Active Item Set (NEW — computed, not stored)

```ts
function collectActiveItems(build: Build): OfferedItem[]
```

Not a stored entity — a computation inside `build.ts`. Returns every non-null `board` item, plus every non-null `storage` item where `activeWhileStored === true`. This is the list `applyBuffs` and the final summation operate over; ordinary (non-flagged) storage items never enter it at all.

### SampleGhost, ContestOutcome, TimelineFrame (unchanged)

Shapes unchanged from `003-item-pool-draft`.
