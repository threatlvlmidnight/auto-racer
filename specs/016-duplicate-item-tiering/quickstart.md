# Quickstart: Duplicate Item Tiering

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/duplicate-tiering-contract.md](./contracts/duplicate-tiering-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. `resolveDuplicateAcquisition` tests confirm: no match → `"new"`;
   match on the board or in storage at ★1/★2 → `"tier-upgrade"` with the
   correct `fromTier`/`toTier`; match at ★3 → `"max-tier-convert"` with
   the correct credits amount; determinism across repeated calls.
2. `applyTierBonus` tests confirm ★1 is a no-op, ★2/★3 scale the item's
   own authored effect by the fixed per-tier percentage, and the input
   item/catalog entry is never mutated.
3. `laps.ts` tests confirm the tier fold applies to both board and
   storage located items, ahead of installation and synergy, and that
   all three compose without any being dropped.
4. `encounters.ts` tests confirm `purchaseStock`/`acceptReward` route
   correctly for all three resolution kinds, that a tier-upgrade never
   calls `commitGarageCommand`, and that a max-tier conversion appends
   exactly one `"duplicate-conversion"` transaction without touching
   `run.build`.
5. `garagePresentation.ts` tests confirm `previewAcquisitionResolution`
   matches `resolveDuplicateAcquisition`'s output for the same build/item
   and updates live as the build changes within a single encounter.
6. Regression tests confirm zero behavior change in every existing
   acquisition test for an item not already held, and zero change to
   `015-economy-depth`'s `sellItem`/`"sell-back"` behavior.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: A Duplicate Upgrades in Place

1. Acquire an item for the first time; confirm it appears as ★1.
2. At a later encounter, acquire the same item again; confirm no new
   slot or storage position is used and the held item is now ★2.
3. Acquire it a third time; confirm it becomes ★3.
4. Inspect the item in the garage at each tier; confirm its live
   effective value visibly increases with tier.

## Scenario B: A Higher Tier Performs Better

1. Resolve a contest holding an item at ★1; note its contribution.
2. Tier the same item up to ★3 (in a fresh build/run if needed) and
   resolve a contest again, all else equal; confirm its contribution is
   measurably greater.
3. Combine a tiered item with an active installation behavior and/or a
   synergy effect; confirm all three contribute together in the result.

## Scenario C: Max Tier Converts to Credits

1. Tier an item up to ★3, then encounter another offer of the same item.
2. Before committing, confirm the offer shows the exact credit amount it
   will convert to (not a generic buy/accept label).
3. Commit to the acquisition; confirm credits increase by that exact
   amount, the item remains at ★3 with no fourth tier, and the credit
   history shows a `"duplicate-conversion"` transaction distinguishable
   from a deliberate sale.

## Scenario D: Pre-Commit Visibility

1. Hold an item at ★1; view a Parts Supplier stock entry or Reward Draft
   option offering the same item.
2. Confirm the offer is labeled with its real outcome ("upgrades to ★2")
   before the player commits.
3. Buy/accept a different offer that changes the build; confirm the
   still-unresolved offer's label updates to reflect the new build state
   if it would now resolve differently.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS). Acceptance requires all automated checks and scenarios above,
plus zero regression in any existing acquisition, installation, synergy,
or sell-back test.
