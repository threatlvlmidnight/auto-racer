# Research: Duplicate Item Tiering

## Decision 1: Tier lives on the held position, not on `ItemDefinition`

**Decision**: `tier: 1 | 2 | 3` is added directly to `VehicleSlotState`
and `StoredPosition` — the two existing types that already represent "an
item held at a specific place" — rather than to `ItemDefinition`, the
shared, static catalog entry every item's data comes from.

**Rationale**: `ItemDefinition` is read from the shared `ITEM_POOL`
catalog (`src/content/sample-data.ts`) and is never per-instance data
today — every held copy of "item-007" is the exact same object reference
in principle. Tier is inherently per-*held-instance* state (two
different runs, or two different players, holding "item-007" must never
share a tier), and `VehicleSlotState`/`StoredPosition` are already the
per-instance wrapper around an item (they own `slotId`/`index`, the
position-specific identity). Adding `tier` there keeps `ItemDefinition`
pure and shared, consistent with how the codebase already treats it.

**Alternatives considered**:
- A per-instance clone of `ItemDefinition` carrying its own `tier` field:
  rejected — would require generating a synthetic per-copy `id`,
  breaking the existing invariant that `ItemDefinition.id` identifies
  the catalog entry, which duplicate detection itself depends on (FR-002
  needs to match on the *same* `id` across held items).

## Decision 2: `resolveDuplicateAcquisition` is a new module, not folded into `garage.ts`

**Decision**: `resolveDuplicateAcquisition(build, item)` and
`applyTierBonus(item, tier)` live in a new `src/simulation/tiering.ts`,
mirroring `014-item-synergy-tags`'s `synergy.ts`.

**Rationale**: `garage.ts`'s `commitGarageCommand` answers "is this
placement legal, and what happens to the board?" — a source/destination
movement question. Duplicate resolution answers a different question
entirely: "does this acquisition even need a destination?" — it has to
run *before* any placement decision, for both acquisition paths
(`purchaseStock`, `acceptReward`), and its output (new / tier-upgrade /
max-tier-convert) determines whether `garage.ts` gets invoked at all.
Keeping it as its own module, called by `encounters.ts` ahead of
`garage.ts`, avoids conflating two different questions inside one
function.

**Alternatives considered**:
- Add duplicate detection as a new `GarageCommand`/`GarageDestination`
  variant: rejected — same reasoning `015-economy-depth`'s Research
  Decision 4 already established for `sellItem`: a tier-upgrade or
  max-tier-convert has no destination at all, so forcing it into a
  destination-shaped contract means inventing a fake one.

## Decision 3: Duplicate detection matches on `ItemDefinition.id`, across board and storage together

**Decision**: `resolveDuplicateAcquisition` scans both `build.slots` and
`build.storage` for an existing item whose `id` equals the acquired
item's `id`. A match anywhere (board or storage) triggers tier-upgrade/
max-tier-convert; no match anywhere means a fresh ★1 placement.

**Rationale**: `id` is already the only identity concept `ItemDefinition`
has (confirmed by direct inspection — no tier/rarity/level field exists
today). Scanning both areas together, rather than only the board, is
required by FR-002's own wording ("an item already held (on the board or
in storage)") and matches the player's actual mental model: an item they
already own anywhere shouldn't be duplicated, regardless of where it's
sitting.

**Alternatives considered**:
- Board-only detection (storage exempt): rejected — explicitly
  contradicts FR-002 and would let a player stockpile physically
  identical storage copies of the same item, the exact waste this
  feature exists to eliminate.

## Decision 4: Tier bonus folds in before installation, ahead of synergy

**Decision**: The effective-item fold chain becomes: authored value →
`applyTierBonus` → installation delta (`effectiveItem`'s existing fold)
→ synergy delta (`014`'s `resolveSynergyEffects` output). `applyTierBonus`
is called for *both* board and storage located items in `laps.ts` — today
only board items go through `effectiveItem` at all; storage items are
used as-is.

**Rationale**: Tier represents the item's own intrinsic strength — a
property of the item itself, independent of how or where it's mounted.
Installation behavior (Fitted/Improvised) is about the *mounting*, and
synergy (014) is about the *build around it* — both conceptually later,
context-dependent layers on top of "what this item itself is." Folding
tier first keeps that ordering: intrinsic → mounting → build context.
Extending the fold to storage items (which today skip `effectiveItem`
entirely) is required because storage items can hold tier too (FR-001
doesn't exempt storage) and `activeWhileStored` items already contribute
directly without installation, so tier must reach them the same way.

**Alternatives considered**:
- Fold tier after synergy (last in the chain): rejected — synergy
  effects (014) match against *other* items' tags/categories, not the
  source item's own strength; there's no requirement that synergy see a
  tier-boosted value to compute correctly, and folding tier earlier is
  simpler to reason about (each layer only needs to know the previous
  layer's output, never skip around).

## Decision 5: Max-tier conversion gets its own `CreditTransactionKind`, not `015`'s `"sell-back"`

**Decision**: `CreditTransactionKind` gains `"duplicate-conversion"` —
a ninth value, distinct from `015-economy-depth`'s `"sell-back"` — even
though both compute `Math.floor(item.price / 2)`.

**Rationale**: FR-007 explicitly requires the conversion be
"distinguishable from a deliberate player-initiated sale" in run
history. Reusing `"sell-back"` would make every max-tier conversion
indistinguishable from the player choosing to sell something, which
directly contradicts that requirement and would corrupt any future
reporting that assumes `"sell-back"` only ever reflects deliberate
player action.

**Alternatives considered**:
- Reuse `"sell-back"` with an extra flag on the transaction: rejected —
  `CreditTransaction` has no precedent for a "reason" sub-field on any
  existing kind; a new kind is the established pattern this codebase
  already uses to distinguish transaction meanings (`"sponsor-immediate"`
  vs. `"sponsor-conditional"` is the direct precedent for two similarly-
  computed but semantically distinct transaction kinds).

## Decision 6: Pre-commit offer resolution is computed live at display time, not baked into the payload

**Decision**: The "what will this offer actually do?" preview (FR-011)
is a new pure presentation-layer function (in `garagePresentation.ts`,
alongside `garageItemInspector`) that takes the current `build` and an
offer's item and returns the live resolution — not a field precomputed
once when `PartsSupplierPayload`/`RewardDraftPayload` is generated.

**Rationale**: Within a single Parts Supplier encounter, the player can
buy one stock entry and then look at a second entry offering the same
item — the second entry's correct preview ("upgrades to ★2" vs. "upgrades
to ★3") depends on the build *at the moment it's displayed*, which
changes as the player acts within the same encounter. A payload-baked
preview computed once at encounter-generation time would go stale the
moment the player buys anything. Computing it live, the same way
`garageItemInspector` already recomputes synergy/installation values
live against the current build, keeps it always correct.

**Alternatives considered**:
- Recompute and store the preview on every stock/offer entry after each
  purchase: rejected — adds a synchronization obligation (every mutation
  path must remember to refresh every other entry's preview) for no
  benefit over simply computing it on render, which is already how every
  other live inspector value in this codebase works.
