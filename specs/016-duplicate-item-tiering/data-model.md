# Data Model: Duplicate Item Tiering

## `VehicleSlotState` / `StoredPosition` Extension

```ts
export interface VehicleSlotState {
  slotId: string;
  slotType: SlotType;
  item: ItemDefinition | null;
  tier: 1 | 2 | 3;   // new; meaningful only when item is non-null
}

export interface StoredPosition {
  index: number;
  item: ItemDefinition | null;
  tier: 1 | 2 | 3;   // new; meaningful only when item is non-null
}
```

| Rule | Source |
|---|---|
| Every newly-placed item (a fresh acquisition with no existing match, or an existing garage move/swap/evict) sets/keeps `tier: 1` unless it is itself the target of a tier-upgrade | FR-002, US1 Acceptance Scenario 3 |
| `tier` is meaningless (ignored) when `item` is `null` — an empty position | Consistent with how `slotType`/`index` are already meaningless-but-present on an empty position |
| `tier` travels with the item through any `commitGarageCommand` move/swap between positions — moving is not an acquisition and never changes tier | Edge Cases |
| `tier` is discarded entirely when the item is sold (`015-economy-depth`) — a later re-acquired copy starts at `tier: 1` | US1 Acceptance Scenario 5 |

`ItemDefinition` itself is unchanged — no `tier` field is added there
(Research Decision 1).

## `CreditTransactionKind` Extension

```ts
export type CreditTransactionKind =
  | "purchase"
  | "restock"
  | "participation"
  | "win-bonus"
  | "sponsor-immediate"
  | "sponsor-conditional"
  | "interest"          // from 015-economy-depth
  | "sell-back"          // from 015-economy-depth
  | "duplicate-conversion"; // new
```

`"duplicate-conversion"` flows through the existing `transactionFor`
machinery unchanged (same pattern `015` already established for its own
new kinds) — no new transaction shape.

## `DuplicateResolution`

The outcome of checking an about-to-be-acquired item against the
current build.

```ts
type DuplicateResolution =
  | { kind: "new" }
  | {
      kind: "tier-upgrade";
      area: "vehicle" | "storage";
      slotId?: string;    // present when area is "vehicle"
      index?: number;     // present when area is "storage"
      fromTier: 1 | 2;
      toTier: 2 | 3;
    }
  | { kind: "max-tier-convert"; creditsGained: number };
```

```ts
function resolveDuplicateAcquisition(build: VehicleBuild, item: ItemDefinition): DuplicateResolution;
```

Binding behavior:

- Pure and deterministic: identical `build`/`item` always returns a
  deeply equal result.
- Scans both `build.slots` and `build.storage` for an existing position
  whose `item?.id === item.id` (Research Decision 3). At most one match
  can exist at any time (duplicate resolution itself is what prevents a
  second physical copy from ever existing — see Validation Invariant 1).
- No match → `{ kind: "new" }`.
- Match with `tier < 3` → `{ kind: "tier-upgrade", ...position, fromTier: match.tier, toTier: match.tier + 1 }`.
- Match with `tier === 3` → `{ kind: "max-tier-convert", creditsGained: Math.floor(item.price / 2) }` — the same formula `015-economy-depth`'s sell-back uses (Research Decision 5), computed here independently since this feature does not depend on `sellItem` existing.

## `applyTierBonus`

```ts
function applyTierBonus(item: ItemDefinition, tier: 1 | 2 | 3): ItemDefinition;
```

| Rule | Source |
|---|---|
| `tier === 1` returns `item` unchanged (no-op, matching `effectiveItem`'s existing early-return convention for "nothing to fold") | FR-004 |
| `tier === 2`/`tier === 3` returns a shallow copy with `timeModifier` and/or `buff.boostPercent` increased by `TIER_BONUS_PERCENT × (tier - 1)`, applied to whichever numeric field the item's own authored effect already uses — the same "adjust whichever field this item's effect kind uses" pattern `effectiveItem` (`laps.ts`) already established for installation deltas | FR-004, Research Decision 4 |
| `TIER_BONUS_PERCENT` is a balance/tuning constant, not fixed by this specification | spec.md Assumptions |
| Never mutates the input `item` (or the shared `ItemDefinition` catalog entry) — always returns a new object when `tier > 1` | Consistent with `effectiveItem`'s existing non-mutating contract |

## `laps.ts` Integration

`simulatePlayerLaps`'s `locatedItems` construction changes for both
board and storage entries:

```ts
// board (VehicleSlotState) — was: effectiveItem(slot.item, installation)
item: effectiveItem(applyTierBonus(slot.item, slot.tier), installation)

// storage (StoredPosition) — was: position.item (no fold at all)
item: applyTierBonus(position.item, position.tier)
```

Tier's contribution is therefore already folded into the same numeric
value `ContributionEvidence` already attributes to installation/synergy
— no new `ContributionEvidence` field is required; a tiered item's
higher contribution is visible the same way an installation-boosted
item's already is today.

## `encounters.ts` Integration

`purchaseStock` and `acceptReward` both call
`resolveDuplicateAcquisition(run.build, item)` before doing anything
placement-related:

| Resolution | Behavior |
|---|---|
| `{ kind: "new" }` | Unchanged from today — proceeds through `applyPlacement`/`commitGarageCommand` exactly as it already does, with the new position's `tier` initialized to `1`. |
| `{ kind: "tier-upgrade", ... }` | No `commitGarageCommand` call — the matched position's `tier` is set to `toTier` in place. The acquisition's existing cost/consumption behavior (credits spent for a purchase, offer marked consumed for a reward) is unchanged. No `PlacementCommand`/destination is required or consulted. |
| `{ kind: "max-tier-convert", creditsGained }` | No `commitGarageCommand` call, `run.build` is untouched. A `"duplicate-conversion"` transaction for `creditsGained` is appended via the existing `transactionFor` path. The acquisition's existing consumption behavior (stock entry marked purchased, offer marked consumed) still occurs — the player did commit to an acquisition, it just resolved as credits instead of an item. |

`purchaseStock`'s `placement: PlacementCommand` parameter becomes
optional — required and consulted only for the `"new"` case; omitted (or
ignored if supplied) for `"tier-upgrade"`/`"max-tier-convert"`, since
neither has a destination. Supplying no `placement` for a `"new"`
resolution remains an error, exactly as an invalid placement is an error
today.

## Offer Resolution Preview (Presentation)

```ts
function previewAcquisitionResolution(build: VehicleBuild, item: ItemDefinition): DuplicateResolution;
```

A thin, presentation-facing re-export of `resolveDuplicateAcquisition`
(Research Decision 6) — `garagePresentation.ts` calls it fresh every
render for every Parts Supplier stock entry and Reward Draft option, so
`PrepareScene.ts` can label each offer with its real outcome before the
player commits (FR-011). Returns the exact same `DuplicateResolution`
shape `encounters.ts` will produce when the offer is actually acted on —
the preview and the real resolution are never allowed to diverge because
both call the same pure function against the same build.

## Validation Invariants

1. At any point a `VehicleBuild` is returned from any exported
   `run.ts`/`encounters.ts`/`garage.ts` function, no two positions
   (across `slots` and `storage` combined) hold items with the same
   `ItemDefinition.id` — `resolveDuplicateAcquisition` is the sole gate
   that prevents this, and its own correctness is what every downstream
   invariant here depends on.
2. `resolveDuplicateAcquisition`'s classification (`new` vs.
   `tier-upgrade` vs. `max-tier-convert`) never depends on which
   acquisition path (Parts Supplier vs. Reward Draft) is calling it —
   only on `build` and `item` (FR-010, FR-009 fairness).
3. `applyTierBonus(item, 1)` is referentially transparent to the
   original `item` object's semantic value (even if a defensive shallow
   copy is made) — a ★1 item's effective value is always identical to
   its authored value.
4. `previewAcquisitionResolution(build, item)` and
   `resolveDuplicateAcquisition(build, item)` called with the same
   arguments always return deeply equal results (Research Decision 6).
5. A `"duplicate-conversion"` transaction's `amount` always equals
   `Math.floor(item.price / 2)` for the exact item that triggered it —
   identical to `015`'s sell-back formula in value, distinct in kind
   (Research Decision 5).
6. `applyTierBonus` never reads or writes `build.slots`/`build.storage`
   directly — it operates only on the single `item`/`tier` pair it's
   given, keeping it composable with installation and synergy exactly
   like every other single-item fold step in `laps.ts`.
