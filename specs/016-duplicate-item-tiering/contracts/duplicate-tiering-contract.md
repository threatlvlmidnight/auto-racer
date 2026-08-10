# Duplicate Item Tiering Contract

This contract defines the framework-free interfaces used by duplicate
detection, tier resolution, its simulation integration, and its
pre-commit presentation. Exact TypeScript names may follow repository
conventions, but these inputs, outputs, and invariants are binding.

## 1. Position Contract

```ts
interface VehicleSlotState {
  slotId: string;
  slotType: SlotType;
  item: ItemDefinition | null;
  tier: 1 | 2 | 3;
}

interface StoredPosition {
  index: number;
  item: ItemDefinition | null;
  tier: 1 | 2 | 3;
}
```

Binding behavior:

- `tier` is new on both types; `ItemDefinition` itself gains no field
  (FR-001, Research Decision 1).
- Every position holding a freshly-placed item (first acquisition, or a
  garage move/swap/evict target) MUST have `tier: 1` unless it is itself
  the target of a tier-upgrade resolution.
- `tier` MUST be preserved unchanged across any `commitGarageCommand`
  move/swap that relocates the item without it being an acquisition.

## 2. Duplicate Resolution Contract

```ts
type DuplicateResolution =
  | { kind: "new" }
  | { kind: "tier-upgrade"; area: "vehicle" | "storage"; slotId?: string; index?: number; fromTier: 1 | 2; toTier: 2 | 3 }
  | { kind: "max-tier-convert"; creditsGained: number };

function resolveDuplicateAcquisition(build: VehicleBuild, item: ItemDefinition): DuplicateResolution;
```

Binding behavior:

- Pure and deterministic: identical `build`/`item` always returns a
  deeply equal result.
- Matches by `ItemDefinition.id` only, scanning `build.slots` and
  `build.storage` together (FR-002, Research Decision 3) — storage is
  never exempt.
- `creditsGained` for `"max-tier-convert"` is always exactly
  `Math.floor(item.price / 2)` (FR-003, matching `015-economy-depth`'s
  sell-back formula in value only, not in transaction kind).
- Never inspects `run.credits`, `run.identityTag`, or any purchasable-
  content flag — a pure function of `build` and `item` only (FR-009,
  Constitution Principle II).

## 3. Tier Bonus Contract

```ts
function applyTierBonus(item: ItemDefinition, tier: 1 | 2 | 3): ItemDefinition;
```

Binding behavior:

- `tier === 1` MUST return a value semantically identical to the
  unmodified `item` (FR-004).
- `tier === 2`/`tier === 3` MUST increase the item's own authored effect
  (`timeModifier` and/or `buff.boostPercent`, whichever the item's effect
  kind uses) by a fixed percentage per tier above ★1 — never a field the
  item's authored effect doesn't already use.
- MUST NOT mutate the input `item` or any shared catalog object.
- MUST NOT read `build.slots`/`build.storage` — operates only on the
  single item/tier pair given (Validation Invariant 6).

## 4. Simulation Integration Contract

```ts
function effectiveItem(item: OfferedItem, installation: InstallationResolution): OfferedItem; // unchanged signature
```

Binding behavior:

- `laps.ts`'s `simulatePlayerLaps` MUST call `applyTierBonus` on every
  located item — board *and* storage — before any other fold
  (installation, then synergy) is applied (FR-006, Research Decision 4).
- Storage items, which today receive no fold at all, MUST also receive
  the tier fold — `activeWhileStored` items' contribution reflects tier
  the same way board items' does.
- No new `ContributionEvidence` field is introduced — tier's effect is
  visible through the same numeric contribution value installation and
  synergy already report through.

## 5. Acquisition Routing Contract

```ts
function purchaseStock(run: Run, encounterId: string, stockId: string, placement?: PlacementCommand): Run;
function acceptReward(run: Run, encounterId: string, offerId: string, placement?: PlacementCommand): Run; // signature illustrative; matches existing acceptReward shape
```

Binding behavior:

- Both MUST call `resolveDuplicateAcquisition(run.build, item)` before
  any placement decision.
- `{ kind: "new" }` MUST proceed exactly as today — `placement` is
  required; a missing/invalid `placement` remains an error.
- `{ kind: "tier-upgrade", ... }` MUST update only the matched
  position's `tier`; MUST NOT call `commitGarageCommand`/
  `applyPlacement`; MUST NOT require or consult `placement`. The
  acquisition's existing cost/consumption behavior (credit spend, offer
  consumption) is unchanged.
- `{ kind: "max-tier-convert", creditsGained }` MUST NOT touch
  `run.build`; MUST append exactly one `"duplicate-conversion"`
  transaction for `creditsGained` via the existing `transactionFor`
  path; the acquisition's existing consumption behavior still occurs
  (stock marked purchased / offer marked consumed).
- Routing MUST be identical in shape for both acquisition paths — no
  path-specific special case in the classification logic (FR-010).

## 6. Pre-Commit Preview Contract

```ts
function previewAcquisitionResolution(build: VehicleBuild, item: ItemDefinition): DuplicateResolution;
```

Binding behavior:

- MUST return a result deeply equal to what
  `resolveDuplicateAcquisition(build, item)` would return for the same
  arguments — the preview and the real resolution are never allowed to
  diverge (FR-011, Validation Invariant 4).
- MUST be computed fresh at render time against the *current* build —
  never cached/baked into a payload at encounter-generation time
  (Research Decision 6).
- `garagePresentation.ts` MUST surface this for every Parts Supplier
  stock entry and every Reward Draft option whose item currently matches
  a held item, so the offer can be labeled with its real outcome before
  the player commits.

## 7. Non-Interference Requirements

- Every existing test asserting today's acquisition behavior for an item
  *not* already held (new-item placement, credit spend, offer
  consumption) MUST continue passing unchanged — this feature adds a
  classification step ahead of that behavior, never replaces it.
- `015-economy-depth`'s `sellItem`/`sellHeldItem` and its `"sell-back"`
  transaction kind MUST remain unaffected — selling a tiered item still
  pays out based on authored price only (FR-008), and tier is simply
  discarded along with the sold item.
- No function introduced or modified by this feature may accept or read
  more than one player's `Run`/`VehicleBuild` — single-run scope only,
  consistent with Constitution Principle I.
