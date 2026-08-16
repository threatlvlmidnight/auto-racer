# Quickstart: Validate Item Artwork and Presentation

## Prerequisites

1. Feature 034 must have locked its item-definition additions and
   transformations; Feature 035 must have implemented the display-only rarity,
   Adjustable, and state vocabulary.
2. Owner selects an art direction from the eight recorded concept plates.
3. The item-art manifest records final source/crop/provenance/revision data and
   direct spend at or below $50, or records the composed-sheet fallback.

## Automated checks

```sh
npm test -- --run tests/unit/itemArtManifest.test.ts tests/unit/itemVisualDescriptor.test.ts
npm test -- --run tests/integration/item-art-presentation.test.ts
npm run lint
npm run typecheck
npm run build
```

## Validation matrix

1. Run manifest validation against the locked catalog. Verify every item has one
   descriptor, one valid in-bounds source/crop or documented pre-lock fallback,
   provenance/revision, and total direct cost ≤ $50.
2. Review all items at compact-card size across offers, garage/inventory,
   installed slots, storage, Test Day, race inspection, and Results. Verify
   stable art identity and retained semantic text/non-color symbols.
3. Inspect the same items from every supported entry point. Verify a consistent
   expanded art treatment and that Feature 035 rarity/state/tier/Adjustable
   treatment remains separate from base art.
4. Exercise missing source, corrupt texture, invalid crop, compact-unsafe crop,
   and a Feature 034 fallback-only item. Verify labeled semantic fallback,
   reachable navigation, and unchanged item/run/race evidence.
5. Repeat a representative matrix with reduced motion and narrow layout. Verify
   existing safe behavior remains available and no visual state changes mechanics.
