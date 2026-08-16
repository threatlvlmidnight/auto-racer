# Implementation Plan: Item Artwork and Presentation

**Branch**: `037-item-artwork-presentation` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

## Summary

Replace procedural item iconography with a display-only, catalog-validated art
pipeline. Each locked item definition receives one stable art descriptor that
can resolve to an atlas crop or composed-scene crop, a semantic fallback, and
provenance/revision data. Shared card and inspector helpers render the same
identity at different sizes while Feature 035 remains the authority for rarity,
Adjustable, and card-state semantics. The default pipeline is a lean hybrid:
transparent cutout atlases for compact cards and eight family-oriented composed
scenes for inspector/hero treatment, capped at $50 direct production spend.

## Technical Context

**Language/Version**: TypeScript 5.5

**Primary Dependencies**: Phaser 3.80, Vite 5, Vitest 2; no new runtime
dependency

**Storage**: Packaged static image files in `public/assets/items/`; typed
manifest and descriptor data in source; production evidence in feature docs

**Testing**: Vitest unit/integration tests, manifest validation, TypeScript
type-check, ESLint, Vite production build, and owner visual review

**Target Platform**: Existing browser game and 800×450 logical Phaser scene;
current narrow-layout safe paths remain authoritative

**Project Type**: Single-project browser game

**Performance Goals**: No card/inspector presentation change may add runtime
asset generation or alter item/race/run resolution; compact cards use preloaded
or cached asset keys with deterministic fallback

**Constraints**: 2D alternate-Motor-Age visual vocabulary; art is mechanically
inert; one stable descriptor per production-lock item; base art is invariant;
state/effect overlays are separate; 100% manifest coverage; $50 direct spend
cap; composed-sheet-only fallback if hybrid cannot meet that cap

**Scale/Scope**: Current baseline is 70 items, 70 crop IDs, 9 transparent atlas
sheets, 8 composed family scenes, 17 primary sources, and 70 crop/manifest QA
checks; final scale is `70 + N` after Feature 034 locks `N` additional identities

## Constitution Check

| Principle | Plan assessment | Status |
|---|---|---|
| Prepare → Contest Integrity | Art is a read-only projection and cannot change preparation or contest resolution. | Pass |
| Fairness | Art, rarity, and effect overlays expose no purchasable or mechanical advantage. | Pass |
| Transparency & Legibility | Existing semantic text/non-color symbols remain present, including on fallback. | Pass |
| Spectation-First | Stable recognizable components improve third-party readability of builds and race inspectors. | Pass |
| Build Testing Access | Test Day and existing item evidence remain available and unchanged. | Pass |
| Async-First Architecture | No live service, identity, or matchmaking dependency is introduced. | Pass |
| Product constraints | Uses 2D illustrated Motor Age art and preserves vehicle/item mechanical parity. | Pass |

**Post-design re-check**: Pass. The manifest and UI model are display-only; no
resolver, catalog selection, tier, or economy write path accepts art data.

## Project Structure

### Documentation

```text
specs/037-item-artwork-presentation/
├── asset-budget.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── item-art-manifest.md              # generated production evidence
└── contracts/
    └── item-art-presentation-contract.md
```

### Source Code and Assets

```text
public/assets/items/
├── atlases/                          # transparent compact-card source sheets
├── scenes/                           # composed inspector/hero sources
└── families/                         # existing family artwork, retained only if approved

src/
├── content/
│   ├── items/                        # authoritative item definitions
│   └── itemArtManifest.ts            # typed descriptors/source/crop metadata
└── scenes/
    ├── BootScene.ts                  # safe static asset preload
    ├── itemVisualDescriptor.ts       # descriptor lookup and semantic fallback
    ├── itemVisuals.ts                # shared compact-card/inspector rendering
    ├── itemPresentation.ts            # authoritative semantic item display model
    └── visualAssets.ts                # stable asset-key helpers

tests/
├── fixtures/item-art-fixtures.ts
├── unit/itemArtManifest.test.ts
├── unit/itemVisualDescriptor.test.ts
└── integration/item-art-presentation.test.ts
```

**Structure Decision**: Keep catalog mechanics in `src/content/items/` and all
art metadata in a separate display-only manifest. Extend the existing shared
item visual helpers rather than adding surface-specific card implementations.

## Delivery Plan

1. Reconcile the production-lock item catalog after Features 034 and 035; derive
   the exact `70 + N` manifest roster and record any fallback-only entries.
2. Create eight representative direction mockups (four object types × technical
   catalog/workbench variants); obtain owner selection before source production.
3. Establish the lean-hybrid budget ledger and source manifest. Use 9 transparent
   atlas sheets and 8 composed family scenes only while the $50 direct cap holds;
   otherwise switch all source records to composed-sheet crops.
4. Create typed descriptor, crop, source, revision, provenance, and fallback
   models plus validation that covers every locked catalog item exactly once.
5. Safely preload source assets and render descriptor art through the existing
   compact card and inspector components without changing semantic models.
6. Keep Feature 035 state/rarity/Adjustable treatment as separate overlays;
   permit approved visual effects but never base-art variants for state.
7. Verify every supported item surface, missing/invalid crop behavior, reduced
   motion, narrow layout, catalog changes, and invariant item/race/run evidence.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
