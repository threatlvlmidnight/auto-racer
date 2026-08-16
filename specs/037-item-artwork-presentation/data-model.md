# Data Model: Item Artwork and Presentation

All entities are presentation and production metadata only. No field may enter
item mechanics, item pools, economy, run state, contest input, or resolution.

## ItemArtDescriptor

| Field | Type | Rules |
|---|---|---|
| `itemId` | string | Exactly one descriptor for each production-lock catalog definition. |
| `artKind` | `atlas-crop` \| `scene-crop` \| `fallback` | Determines source/crop behavior only. |
| `sourceId` | string \| null | Required unless `artKind` is `fallback`. |
| `cropId` | string \| null | Unique among descriptors sharing a source. |
| `fallbackToken` | string | Stable semantic fallback label/token. |
| `accessibleLabel` | string | Names the item and art identity without relying on color. |
| `revision` | string | Source-art revision used for reproducible review. |

**Invariants**: `itemId` is unique; a descriptor cannot change an item
definition; fallback is always present even when source/crop is valid.

## ArtSource

| Field | Type | Rules |
|---|---|---|
| `sourceId` | string | Stable unique source identifier. |
| `kind` | `transparent-atlas` \| `composed-scene` | Matches the production strategy. |
| `assetPath` | string | Packaged static path under `public/assets/items/`. |
| `textureKey` | string | Stable BootScene preload key. |
| `width` / `height` | positive integer | Native source dimensions used to validate crops. |
| `provenance` | string | Generated/commissioned/source record. |
| `revision` | string | Source revision identifier. |
| `directCostUsd` | non-negative number | Counts toward the $50 direct-budget ledger. |

## CropRect

| Field | Type | Rules |
|---|---|---|
| `cropId` | string | Stable within its source. |
| `x`, `y`, `width`, `height` | positive integer bounds | Must lie completely inside source dimensions. |
| `compactSafe` | boolean | True only when readable at compact-card size. |
| `inspectorSafe` | boolean | True when reusable in expanded inspection. |

## ItemArtManifest

Contains the production-lock catalog version, source list, crop list, descriptor
list, `totalDirectCostUsd`, and generated validation report. It derives its
catalog roster from item definitions but never writes back to them.

**Validation states**: `valid`, `fallback-only`, `invalid`. `valid` requires a
source/crop/provenance/revision; `fallback-only` is allowed only before the
production lock or for a documented onboarding exception; `invalid` blocks the
release gate.

## ArtDirectionReview

Contains eight concept-plate records, one owner-selected direction, review date,
and the selected source-art standard. Production sources cannot transition from
`planned` to `approved` until this record is selected.

## PresentationOverlay

| Field | Type | Rules |
|---|---|---|
| `kind` | rarity/state/tier/modification/installation/etc. | Uses Feature 035 vocabulary. |
| `baseItemId` | string | References the descriptor but never replaces it. |
| `effectToken` | string \| null | Optional shine/color/sparkle treatment. |

**Invariant**: Overlay composition is display-only and never produces a new
`ItemArtDescriptor` or item ID.
