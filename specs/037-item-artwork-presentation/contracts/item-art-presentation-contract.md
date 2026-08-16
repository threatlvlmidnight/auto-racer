# Item Art Presentation Contract

## 1. Authority boundary

- Item definitions, pools, tiers, economy, run state, contest input, and
  resolution remain authoritative outside this feature.
- `ItemArtDescriptor`, `ArtSource`, crop data, and overlays are display-only.
- Art lookup failure may choose a semantic fallback; it must not mutate the item
  or prevent its normal card/inspector flow.

## 2. Manifest and source identity

- The production-lock catalog has exactly one descriptor per item ID.
- Every non-fallback descriptor references one known source and one in-bounds
  crop with provenance and revision metadata.
- A descriptor's `fallbackToken` and accessible label are required regardless
  of art availability.
- `totalDirectCostUsd` must not exceed $50. Exceeding it changes source strategy
  to composed-sheet crops; it cannot reduce coverage or bypass validation.

## 3. Shared presentation behavior

- Compact cards and inspectors accept the same descriptor and retain all
  semantics from `itemPresentation.ts`: item name, effect, category, price,
  placement, tier, Feature 035 rarity, and state information.
- Art is supplemental and never replaces required semantic text/non-color
  symbols. At compact size, an unsafe crop resolves to the semantic fallback.
- Existing item surfaces must use shared helpers, not bespoke per-scene art
  lookup.

## 4. Overlay behavior

- Base art is stable across tier, rarity, modification, installation, storage,
  selection, and focus states.
- These states use existing Feature 035 display vocabulary as independent
  overlays. Approved effect overlays may add shine, color, or sparkle without
  changing the base descriptor, `itemId`, effects, or placement rules.

## 5. Validation and resilience

- Validation blocks release on missing/duplicate descriptor, missing source,
  out-of-bounds crop, missing provenance/revision, unknown item ID, or an
  invalid fallback.
- A Feature 034 item may be onboarded as `fallback-only` before the production
  lock only when documented in the manifest report.
- Missing, corrupt, or unavailable art falls back at every supported surface;
  reduced motion and narrow layouts retain current safe presentation behavior.

## 6. Required proof

1. 100% production-lock catalog coverage and zero invalid manifest records.
2. Identical item/run/race outcomes with art valid, disabled, or unavailable.
3. Existing Feature 035 rarity/state semantics remain visible and equal in all
   asset states.
4. Every card/inspector surface resolves the same item to the same descriptor
   or documented fallback.
