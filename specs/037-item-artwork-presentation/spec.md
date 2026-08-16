# Feature Specification: Item Artwork and Presentation

**Feature Branch**: [037-item-artwork-presentation]

**Created**: 2026-08-15

**Status**: Planning complete — gated on Features 034 and 035

**Input**: Give every playable item a recognizable, cohesive visual treatment
and make that art the primary visual anchor of item cards and inspection without
hiding the rules, effects, placement, price, rarity, tier, modification, or
accessibility information that players use to make decisions.

## Clarifications

### Session 2026-08-15

- Q: Which source strategy should the feature use? → A: Default to a deliberate
  hybrid: transparent cutouts for compact cards plus composed-scene crops for
  selected inspector/hero treatment. Fall back to composed-sheet crops only if
  the approved production budget cannot support the hybrid.
- Q: What catalog boundary must ship with bespoke art? → A: Wait for Feature 034
  and ship the current catalog together with its locked additions.
- Q: May states modify base art? → A: Base art remains invariant. Tier, rarity,
  modification, installation, storage, selection, and focus use separate
  overlays; effects and modifications may add approved visual effects such as
  shine, color, or sparkle without changing the base artwork.
- Q: How should the final art direction be chosen? → A: Generate representative
  technical-catalog and painterly-workbench mockups before final selection. The
  technical-catalog direction is preferred; painterly workbench still-life is
  the fallback direction.
- Q: What production budget cap determines whether hybrid source art is viable?
  → A: Use a lean hybrid pipeline with a maximum $50 direct production budget.
  If validated source generation and required processing exceed that cap, use
  composed-sheet crops only while preserving the same catalog coverage and QA.

## User Scenarios & Testing

### User Story 1 — Recognize and scan items (Priority: P1)

As a player, I can quickly distinguish offered, installed, stored, and inspected
items through cohesive art while still understanding their mechanical meaning
without relying on color, hover, or memory.

**Why this priority**: Item decisions are the central preparation activity; art
must improve recognition without making the game less legible.

**Independent Test**: Review every item in the active playable catalog across
the main offer, board/storage, and inspector contexts. Confirm it has a stable
art identity and the item name, effect, category, price, placement, rarity,
tier, and relevant state remain available as text or non-color symbols.

**Acceptance Scenarios**:

1. **Given** an item appears in any reusable card context, **When** a player
   views it, **Then** the same item uses a stable recognizable art identity at
   compact and expanded sizes.
2. **Given** a player compares similar items, **When** their artwork is visible,
   **Then** it complements rather than replaces their name, rules, effect, and
   placement information.
3. **Given** art cannot be loaded or is unsuitable at the current size,
   **When** the card renders, **Then** a labeled semantic fallback retains the
   existing complete item information.

---

### User Story 2 — Inspect a coherent physical invention (Priority: P1)

As a player, I can open an item and see a more detailed illustration that makes
the invention feel tangible and coherent with the alternate Motor Age while
still seeing every relevant rule and state.

**Why this priority**: The item inspector is where players invest attention;
it should reward that attention without obscuring outcome-affecting facts.

**Independent Test**: Inspect each item from its supported entry points and
confirm the art, title, effect, category, state, and accessible description
agree with the same item card and with the item definition.

**Acceptance Scenarios**:

1. **Given** an item is selected from an offer, vehicle, storage, or result,
   **When** its inspector opens, **Then** it presents the same stable item art
   and a larger readable view without recomputing its rules.
2. **Given** the item has a tier, modification, installation, or state cue,
   **When** it is inspected, **Then** those cues remain separate from the base
   art and do not change its identity.
3. **Given** a player uses reduced motion or a narrow layout, **When** they
   inspect an item, **Then** the art and all semantic information remain
   reachable through the existing safe presentation path.

---

### User Story 3 — Trust the art catalog as it grows (Priority: P2)

As a player and maintainer, I can trust that every shipped item art reference is
stable, traceable, and safely replaceable as the catalog expands.

**Why this priority**: Asset mistakes or inconsistent crops quickly undermine a
cohesive catalog and make future item additions risky.

**Independent Test**: Validate the item-art manifest against the playable
catalog and intentionally exercise a missing or invalid art reference. Confirm
every active item resolves to a documented source/crop or an explicit fallback,
with no gameplay state change.

**Acceptance Scenarios**:

1. **Given** the active catalog changes, **When** asset validation runs,
   **Then** missing, duplicate, invalid, or undocumented item-art references
   are reported before release.
2. **Given** an item uses artwork cropped from a larger source, **When** the
   game loads it, **Then** its crop identity and source provenance are stable
   and reviewable.
3. **Given** an art asset fails to load, **When** the item is shown, **Then**
   the presentation falls back without changing item behavior, odds, economy,
   or saved/run state.

### Edge Cases

- Several items may share a source sheet but must never resolve to the wrong
  crop or become indistinguishable at compact size.
- A new Feature 034 item, transformed item, or modified instance may be shown
  before final artwork is available; it must retain a documented fallback.
- Art may be unavailable, corrupt, oversized, or unsuitable for a compact card;
  cards and inspectors must remain semantically complete.
- An item may appear in offers, inventory, installed slots, storage, practice,
  race inspection, and results; its art identity cannot alter item mechanics or
  presentation evidence.

## Requirements

### Functional Requirements

- **FR-001**: The feature MUST give every item in the production-lock playable
  catalog—current items plus the locked Feature 034 additions—a stable art
  identity plus a labeled semantic fallback.
- **FR-002**: The feature MUST present item art through reusable compact-card
  and expanded-inspector treatments while preserving existing text/non-color
  presentation of name, effects, category, price, placement, tier, rarity, and
  relevant item state.
- **FR-003**: Item artwork MUST be mechanically inert: it MUST NOT alter item
  effects, tiers, prices, odds, pools, placement legality, run state, contest
  input, or contest outcome.
- **FR-004**: The feature MUST keep base item art distinct from presentation
  overlays that communicate tier, rarity, modification, installation, storage,
  selection, or focus state. Approved effects/modifications may add a separate
  shine, color, sparkle, or equivalent overlay but MUST NOT alter base art.
- **FR-005**: The feature MUST use a documented, deterministic source/crop
  identity for each item, including provenance and revision information.
- **FR-006**: The feature MUST validate the active item catalog against its art
  manifest and surface missing, duplicate, invalid, or undocumented references
  before release.
- **FR-007**: The feature MUST provide a safe fallback for unavailable or
  unsuitable art at every supported item surface without hiding semantic item
  facts or blocking navigation.
- **FR-008**: The feature MUST preserve reduced-motion and current narrow-layout
  safe paths; it does not take over Feature 026's broad responsive-host work.
- **FR-009**: The feature MUST use the card-state vocabulary and display-only
  rarity model established by Feature 035 rather than creating a competing
  state/rarity system.
- **FR-010**: The feature MUST support the current playable catalog and define
  an explicit fallback/onboarding route for new Feature 034 item definitions,
  modifications, and transformations before final art is locked.
- **FR-011**: Before production assets are generated, the feature MUST present
  representative technical-catalog and painterly-workbench mockups for owner
  direction selection; the approved direction becomes the source-art standard.
- **FR-012**: The lean hybrid art pipeline MUST keep direct production spend at
  or below $50 for the production-lock catalog. If that cap cannot be met, the
  feature MUST use composed-sheet crops only and retain all identity, fallback,
  manifest, and accessibility requirements.

### Key Entities

- **Item art descriptor**: display-only stable identity connecting an item
  definition to its art source/crop, fallback, accessible label, and revision.
- **Art source**: a transparent cutout, a crop-ready composed sheet, or another
  documented source image with provenance and revision metadata.
- **Art manifest**: the catalog-level record that verifies every active item
  resolves to a unique valid descriptor or explicit fallback.
- **Presentation overlay**: a separate display-only layer for item state, tier,
  rarity, modification, installation, selection, or focus.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Asset validation reports 100% manifest coverage for the
  production-lock playable catalog, with zero missing, duplicate, invalid, or
  undocumented shipped art references.
- **SC-002**: In an owner-reviewed catalog matrix, every item is distinguishable
  from other active items at compact-card size without color alone, and all
  item identity/rule facts remain available at every supported surface.
- **SC-003**: In fixtures that include a missing asset, invalid crop, and new
  item definition, 100% of cards and inspectors retain a labeled fallback and
  preserve the identical item/race/run result.
- **SC-004**: Existing Feature 035 rarity and state information remains visible
  and semantically identical with item art enabled, disabled, or unavailable.
- **SC-005**: Full automated tests, lint, type-check, production build, and
  documented asset-manifest validation pass without weakened item-mechanics or
  presentation assertions.

## Assumptions

- Feature 035 is the authority for display-only card rarity, Adjustable, and
  state semantics.
- Feature 034 may add or transform items before the final production art count
  and crop list are locked.
- Art is a visual asset, not a source of game rules; the existing item
  definition/presentation models remain authoritative for semantic text.
- The default source strategy is hybrid. It may change to composed-sheet crops
  only when the approved production budget makes hybrid infeasible.
- Final production occurs after Feature 034 locks its catalog additions.
- Technical-catalog illustration is the preferred direction and painterly
  workbench still-life is the fallback; final selection follows mockup review.
- The lean hybrid pipeline has a $50 maximum direct production budget; exceeding
  it triggers the composed-sheet crop fallback.
