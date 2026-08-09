# Data Model: Multi-Ghost Contest

## Rival Profile

Immutable authored content, reusable across a run and across runs.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable content ID, e.g. `"rival-torres"` |
| `name` | string | Display name |
| `color` | string | Presentation-only visual identity (marker/standings color) |
| `vehicleId` | `VehicleId` | One of the four existing named vehicles; rivals reuse player topology content, no fifth topology is authored |
| `levelScaling` | authored per-level rule | Controls how many of the vehicle's slots get filled and which `ITEM_POOL` price tier the draw favors, per level (see Research Decision 3) |

Exactly 7 profiles are authored (FR-004). A profile contains no simulation
math of its own — it is pure content, resolved by `resolveRivalBuild`.

## Resolved Rival Build

The output of `resolveRivalBuild(profile: RivalProfile, level: number, seed: number): VehicleBuild`.

This is not a new type — it is the existing `VehicleBuild` (vehicle ID,
`SpecCar`, 4 typed slots, 3 storage positions), populated deterministically:

1. Start from `createEmptyVehicleBuild(profile.vehicleId)`.
2. For each slot/storage position the profile's `levelScaling` rule fills
   at this `level`, draw an item via the existing `drawItem(pool,
   targetTag, tagWeight, rng)` (`src/simulation/draft.ts`), seeded from a
   value derived from `(seed, profile.id, level, position index)`.
3. Install each drawn item into its position via the existing
   `addItem`/storage helpers — no new placement logic.

The result is a build indistinguishable, structurally, from a player's own
— it can be Fitted/Flexible/Improvised per slot exactly the same way, and
runs through `simulatePlayerLaps` exactly the same way.

**Determinism invariant**: `resolveRivalBuild(profile, level, seed)` called
twice with identical arguments returns deeply equal builds (FR-005).

## Car Result

Replaces the current two-sided `playerTime`/`ghostTime`/`gap` fields.

| Field | Type | Rules |
|---|---|---|
| `id` | `"player"` \| rival profile `id` | Stable identity within the result |
| `role` | `"player"` \| `"rival"` | Exactly one `"player"` entry per result |
| `name` | string | Display name (player's entrant name, or rival's authored name) |
| `color` | string | Presentation-only |
| `time` | number | Total finishing time, seconds |
| `laps` | `PlayerLap[]` | Same per-lap breakdown structure already used for the player today — every car gets full attribution, not just the player |
| `position` | integer, 1-indexed | Finishing rank; unique across the result, no gaps |
| `gapToLeader` | number | `time - (position 1's time)`; `0` for the leader |

## N-Car Contest Result

Extends today's `ContestResult`.

| Field | Type | Rules |
|---|---|---|
| `lapCount` | number | Unchanged meaning |
| `cars` | `CarResult[]` | Exactly 8 entries (player + 7 rivals), ordered by `position` ascending. Every entry counts toward standings — none is decorative (FR-003). |
| `outcome` | `ContestOutcome` | Unchanged type; now derived as `"win"` iff the player's `CarResult.position === 1`, `"tie"` iff tied for 1st, else `"loss"` |
| `board` | `OfferedItem[]` | The player's own installed items, same meaning as today |
| `storage` | `OfferedItem[]` | The player's own stored items, same meaning as today |

`playerTime`, `ghostTime`, and `gap` are removed from this shape; a
consumer that wants "player's time" or "player's gap to the winner" reads
them off `cars.find(c => c.role === "player")`.

## Tie-Break Rule

If two or more `CarResult`s compute an identical `time`, they are ordered
by a fixed roster order: the player first, then the 7 rival profiles in
their authored catalog order. This order is applied only to break ties — it
never overrides a strictly faster time (FR-007).

## Validation Invariants

1. A resolved N-car contest always contains exactly 8 `CarResult`s: one
   `"player"` and 7 `"rival"`, matching the 7 authored `RivalProfile`s.
2. `position` values are a contiguous 1..8 permutation with no gaps or
   duplicates, even when `time`s tie.
3. `resolveRivalBuild(profile, level, seed)` and the full
   `resolveContest(playerBuild, rivalRoster, level, seed, lapCount)` are
   pure — identical inputs always produce deeply equal outputs, and neither
   reads live input, wall-clock time, or unseeded randomness.
4. Every `CarResult.laps` entry has the same shape and the same
   attribution guarantees (`sourceItemId`, `installation`, etc.) that the
   player's own lap breakdown has today — no car's contribution evidence is
   second-class.
5. A missing or incomplete rival profile catalog (fewer than 7 profiles
   available) is a typed, inspectable failure — resolution never silently
   duplicates a profile or races with an incomplete field.
6. Test Day/Practice mode's existing single-`SampleGhost` resolution path
   is unchanged by any of the above; it does not construct or consume
   `RivalProfile`/`CarResult` data at all (FR-011).
