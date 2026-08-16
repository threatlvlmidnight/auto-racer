# Research: Item Artwork and Presentation

## Decision 1 — One item identity, one display-only descriptor

**Decision**: Every production-lock item definition has exactly one stable item
art descriptor. Cards and inspectors reuse it at different crop/display sizes;
they do not each own a new art identity.

**Rationale**: The current catalog baseline is 70 items, and one identity shared
across surfaces prevents a 140-file card/inspector explosion while preserving
recognition.

**Alternatives rejected**: Surface-specific art duplicates production and can
drift; procedural symbols alone do not deliver the requested physical-object
identity.

## Decision 2 — Lean hybrid source pipeline with a hard fallback

**Decision**: Default to nine transparent atlas sources for compact presentation
and eight composed scenes for inspector/hero treatment. Record every generation,
processing, and source-preparation cost; switch to composed-sheet crops only if
the $50 direct budget cap cannot be met.

**Rationale**: Transparent cutouts protect card legibility, while composed scenes
provide the tactile alternate-Motor-Age setting. The explicit fallback preserves
scope and manifest coverage if cost or source quality is too high.

**Alternatives rejected**: Individual full art per item exceeds the budget and
adds asset management cost; composed-only as the default weakens compact-card
silhouette control.

## Decision 3 — Direction is owner-gated before production

**Decision**: Produce eight concept plates: engine, chassis, instrument, and
unusual/economy item types, each in technical-catalog and painterly-workbench
directions. The technical-catalog direction is preferred; workbench still-life
is the fallback. Do not produce catalog sources until the owner selects one.

**Rationale**: The direction materially affects prompts, crop framing, and
source reuse, so choosing it from representative examples prevents a costly
catalog redo.

**Alternatives rejected**: Choosing by prose alone risks a mismatched visual
language; producing all assets before review violates the budget discipline.

## Decision 4 — Semantic overlays never modify base art

**Decision**: Tier, Feature 035 rarity, Adjustable, modification, installation,
storage, selection, and focus remain independent UI overlays. Effects or
modifications may add an approved shine, color, sparkle, or similar overlay but
cannot create a new base-art identifier.

**Rationale**: Players recognize the same item across surfaces and states while
existing Feature 035 semantics remain the single state authority.

**Alternatives rejected**: State-specific base art creates ambiguous identities
and multiplies asset count; encoding semantic state in color alone is
inaccessible.

## Decision 5 — Manifest validation gates release

**Decision**: Validate the current locked catalog against a typed manifest and
a human-readable evidence document. Validation fails on missing descriptor,
duplicate item ID/crop key, invalid source bounds, missing provenance/revision,
unknown source asset, or absent fallback.

**Rationale**: A catalog-changing Feature 034 needs safe onboarding before new
art is available, and source sheets make crop mistakes likely without explicit
validation.

**Alternatives rejected**: Filename conventions alone cannot prove crop bounds
or descriptor uniqueness; runtime-only errors arrive too late for release.

## Decision 6 — Existing semantic models and static asset loading are reused

**Decision**: `itemPresentation.ts` remains the source of item name/effect/state
text, while `itemVisualDescriptor.ts` maps it to art or semantic fallback.
`BootScene` preloads static source keys; missing keys use the current procedural
icon path rather than blocking a scene.

**Rationale**: Existing card helpers already serve offers, garage, practice,
race inspection, and results. Centralizing art there avoids behavior drift.

**Alternatives rejected**: Per-scene loaders duplicate failure behavior;
embedding art metadata in item mechanics risks authority leakage.
