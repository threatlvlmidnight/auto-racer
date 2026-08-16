# Feature 037 Intake: Item Artwork and Presentation

**Created**: 2026-08-15

**Status**: Intake — plan asset pipeline now; execute catalog art after Feature 034 stabilizes item content.

## Problem

Items currently use procedural symbols and functional text. The expanding
catalog needs recognizable, cohesive visual art that improves scanning and
makes each invention feel like a physical object without hiding rules, tiers,
rarity, prices, placement, or accessibility information.

## Intended scope

- Define an item-art direction and generation pipeline for every current
  playable item, including future Feature 034 additions before production lock.
- Generate cohesive art sources either as crop-ready composed sheets/scenes or
  as transparent cutout sheets, then document deterministic crop keys and
  consumers.
- Implement a reusable card/inspector presentation that makes art primary but
  retains all semantic item information without hover or color.
- Add asset validation, fallback, loading, and revision/provenance records.

## Dependencies and boundaries

- Focuses and completes the item-art portion of Feature 026 rather than
  restarting the entire responsive/UI overhaul.
- Builds on Feature 035 card rarity, Adjustable, and state semantics; it must
  not duplicate those models.
- Waits for Feature 034's item-instance/modification catalog before final
  production counts and crop lock.
- Does not alter item effects, tiers, prices, odds, pool selection, or economy.

## Initial decisions needed

- Preferred source strategy: transparent spritesheet, composed-sheet crops, or
  a deliberate hybrid.
- Asset volume and generation/review cadence per batch.
- Whether art represents item definition only or also has small overlays for
  tier, modification, and installation state.

