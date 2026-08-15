# Data Model: Demo Feedback Bug Pass

## ScalingClassification

- `kind`: `composition | fitted-value | lap-activation`
- `sourceItemId`, `targetStat`
- `currentInput`, `currentMagnitude`
- `nextTriggerLabel`
- Derived from authored item plus held build or retained lap evidence; never a
  new cross-race persistence record.

## LiveStatChange

- `boundaryId`, `lap`, `stat`
- `previousValue`, `currentValue`, `delta`, `direction`
- `sourceItemId`, `sourceItemName`
- `amplifierSources[]`: item, magnitude, affected contribution
- Immutable child evidence of a resolved contest result.

## TagInspectionState

- `mode`: `idle | preview | pinned`
- `tag`: nullable tag ID
- `label`, `matchingHeldCount`
- `matchingLocations[]`: vehicle slot or storage index plus item ID
- Preview never overwrites pinned state; keyboard/touch can reach pinned state.

## AcquisitionReceipt

- `offerId`, `status`: `purchased | upgraded | unavailable`
- `itemId`, `oldTier`, `newTier`
- `changedEffects[]`: label, old value, new value
- Retained only for the current acquisition surface; restock replaces all offer
  entries and clears prior receipts.

## InventoryHostContext

- `host`: destination, reward, supplier, sponsor, pre-race, result, or run hub
- `sceneKey`, `focusKey`
- host-owned selection/navigation snapshot
- `presentation`: `overlay | full-window`, derived from measured safe bounds
- `blockedReason`: nullable unresolved-modal/transaction reason

## SaleReceipt / SaleUndoSnapshot

- item ID, tier, exact prior `GarageLocation`
- base sale value, economy modifiers, total payout
- credits before/after
- `valid`: invalidated by next inventory mutation or scene transition
- Undo atomically restores the exact item/location/tier and prior credits or
  fails without mutation.

## EconomyContribution

- `sourceItemId`, `sourceItemName`, `tier`
- `heldLocation`: installed slot or storage index
- `trigger`: scored-win, item-sale, or sponsor-success
- `amount`
- Included in the owning authoritative transaction receipt exactly once.

## ScoredRaceRecordProjection

- Derived from retained race history entries with ordered 1–8 placement.
- `wins`: count of Local/Championship/Elite entries at positions 1–3.
- `losses`: count of those entries at positions 4–8.
- No tie bucket and no separately mutable counters.

## BalanceEvidence

- entrant ID, fixed fixture/version, seed set, draft policy
- representative races/wins/rate and performance aggregate
- optimized legal build/setup fingerprint and ceiling metric
- acceptance: max representative rate spread ≤5 percentage points and max
  optimized ceiling spread ≤2%, with baseline vehicle equality asserted.

## UIChromeRegion

- stable key, source rectangle, nine-slice margins
- semantic family/state: primary, secondary, compact, danger, selector, focus,
  divider, glyph
- accessibility meaning remains in runtime control model, never the bitmap.
