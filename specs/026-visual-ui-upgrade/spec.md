# Feature Specification: Visual UI Upgrade

**Feature Branch**: `026-visual-ui-upgrade`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Upgrade the game to a higher-resolution responsive visual presentation with cohesive production-intent UI, real generated artwork, and reusable art assets while remaining an iterative pre-1.0 pass."

## Background

The current game proves the prepare-to-contest loop with a compact 800×450
canvas, simple geometric panels, procedural item symbols, and lightly themed
placeholder backdrops. That is sufficient to verify systems, but it no longer
communicates the character, vehicle, setting, or quality of the growing item and
physics design.

This feature is the first production-intent visual pass. It establishes a
higher-resolution responsive presentation, a cohesive interface language, and
real generated 2D artwork for the game's most visible surfaces. It is not final
1.0 polish: assets may receive later revisions, animation remains deliberately
limited, and the feature prioritizes a complete, coherent vertical slice over
exhaustive launch-grade content.

Feature 024 remains responsible for item-information hierarchy and interaction.
Feature 025 remains responsible for aggregate vehicle-stat information. Feature
026 supplies the visual system and production-intent art those functional
surfaces use.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter a coherent illustrated Motor Age (Priority: P1)

From title screen through entrant selection, workshop preparation, race day,
and results, the player sees a cohesive illustrated world inspired by the dawn
of the alternate Motor Age. Screens use real production-intent art rather than
generic gradients, abstract placeholders, or debug-like geometry.

**Why this priority**: The game's unusual setting and characters are a core
part of its identity. A mechanically complete loop still feels provisional if
the world is not visible.

**Independent Test**: Play one complete run and confirm that every primary
scene uses the same art direction, material vocabulary, color system, and
typographic hierarchy, with production-intent generated art on the title,
entrant, workshop, race, and result surfaces.

**Acceptance Scenarios**:

1. **Given** the player moves between primary scenes, **When** each scene loads,
   **Then** its background, framing, typography, controls, and illustration feel
   like parts of one game rather than unrelated prototypes.
2. **Given** an entrant or vehicle is shown, **When** the player encounters it
   on different screens, **Then** its silhouette, colors, materials, and visual
   identity remain recognizable and consistent.
3. **Given** a primary scene previously relied on a generic placeholder
   backdrop, **When** the upgraded scene is shown, **Then** production-intent
   generated artwork replaces the placeholder while preserving UI readability.
4. **Given** generated artwork contains irrelevant text, logos, modern objects,
   visual artifacts, or inconsistent vehicle details, **When** assets are
   reviewed, **Then** they are rejected or corrected before integration.

---

### User Story 2 - Read and operate the game at higher resolution (Priority: P1)

The player can use the full game at a modern high-resolution desktop viewport
without the interface appearing like a low-resolution canvas merely enlarged.
Layout, type, line work, panels, illustrations, and interaction targets remain
sharp and intentionally composed across supported aspect ratios.

**Why this priority**: Higher-resolution artwork cannot improve the experience
if the rendering and layout system still behaves as a stretched 800×450 mockup.

**Independent Test**: Complete the primary flow at 1920×1080, 1366×768,
1024×768, and 800×450, then inspect 390×844 portrait reflow. Confirm that no
consequential UI clips, art retains appropriate resolution, and interaction
targets remain usable.

**Acceptance Scenarios**:

1. **Given** a 1920×1080 viewport, **When** a primary scene renders, **Then** UI
   geometry and text use the available resolution intentionally and required art
   is not visibly pixelated or blurred.
2. **Given** two supported aspect ratios, **When** the same screen renders,
   **Then** layout reflows or reframes rather than stretching artwork or placing
   essential controls outside the safe area.
3. **Given** a smaller supported viewport, **When** content cannot fit in the
   wide composition, **Then** it uses an intentional compact or stacked layout
   without hiding consequential information.
4. **Given** an interactive control, **When** used by mouse, touch, or keyboard,
   **Then** its hit target, focus state, pressed state, and disabled state remain
   clear at every supported viewport.

---

### User Story 3 - Recognize entrants, vehicles, and item families (Priority: P1)

Players can recognize the four entrants, their machines, and the broad identity
of their item ecosystems through consistent production-intent visual assets.
Artwork celebrates each character's racing philosophy without contradicting
their documented identity or implying unequal base capability.

**Why this priority**: The authored roster and 70-item pool depend on strong
identity. Visual differentiation makes that content memorable and supports
strategic scanning.

**Independent Test**: Show unlabeled entrant portraits, vehicle illustrations,
and representative item-family art after one run. Confirm players can reliably
associate each with Mercer, Soto, Rook, or Voss and describe the intended visual
difference without assuming one vehicle is inherently superior.

**Acceptance Scenarios**:

1. **Given** the four entrant portraits, **When** viewed together, **Then** each
   has a distinct silhouette, palette, wardrobe/material language, and demeanor
   consistent with the canonical roster.
2. **Given** the four vehicle illustrations, **When** viewed together, **Then**
   each expresses its topology and philosophy while avoiding visual language
   that promises superior baseline performance.
3. **Given** representative character-exclusive items, **When** displayed in the
   feature 024 card system, **Then** supporting art reinforces origin and item
   family without replacing readable rules.
4. **Given** Inez Rook's assets, **When** reviewed, **Then** they communicate
   ambitious experimental engineering rather than low-quality cobbling.
5. **Given** Nell Voss's assets, **When** reviewed, **Then** they communicate
   aggressive rulebook engineering without sabotage, malice, or criminal
   caricature.

---

### User Story 4 - Experience a more legible, tactile interface (Priority: P2)

Panels, buttons, cards, slots, meters, focus rings, and status badges use a
shared visual system with clear hierarchy and tactile feedback. Decorative art
supports the game state instead of competing with it.

**Why this priority**: Art direction alone does not make a usable interface. A
reusable component system is what carries the visual upgrade across the run.

**Independent Test**: Inventory every recurring component across the primary
flow and confirm the same semantic state uses the same styling, contrast,
spacing, typography, and feedback wherever it appears.

**Acceptance Scenarios**:

1. **Given** two controls with the same semantic role on different screens,
   **When** compared, **Then** their visual states and interaction feedback are
   consistent.
2. **Given** dense item or race information over illustrated art, **When** shown,
   **Then** contrast treatments and framing keep all consequential information
   readable.
3. **Given** selected, focused, disabled, affordable, unaffordable, beneficial,
   harmful, active, or inactive content, **When** displayed, **Then** it is
   distinguishable without color alone.
4. **Given** reduced motion is enabled, **When** the player navigates the game,
   **Then** no required feedback or information disappears.

---

### User Story 5 - Iterate on art without rebuilding screens (Priority: P2)

The development team can replace, refine, or add generated assets through a
documented asset pipeline without changing gameplay logic or manually repairing
every scene. Source intent, generation prompts, selected masters, derivatives,
and usage are traceable.

**Why this priority**: This is intentionally not final 1.0 art. A maintainable
pipeline allows later quality passes without turning this upgrade into throwaway
work.

**Independent Test**: Replace one representative background, portrait, vehicle,
and item-family asset with revised masters; regenerate required derivatives and
confirm every consumer loads the replacements with no gameplay-code changes.

**Acceptance Scenarios**:

1. **Given** a generated asset, **When** another contributor reviews it, **Then**
   they can identify its purpose, canonical subject, source prompt or direction,
   master file, exported variants, and consuming screens.
2. **Given** a high-resolution master, **When** runtime derivatives are made,
   **Then** aspect ratio, crop-safe regions, transparency, and compression are
   appropriate for their declared uses.
3. **Given** a missing or failed asset, **When** the game loads, **Then** a
   deliberate fallback preserves functionality and legibility rather than
   leaving a broken or invisible surface.
4. **Given** an asset revision, **When** integrated, **Then** deterministic
   gameplay and authored content remain unchanged.

### Edge Cases

- Generated art contains fake lettering, signatures, watermarks, or symbols
  that resemble UI; the asset is corrected, cropped, or rejected.
- A character or vehicle changes appearance between generated images; canonical
  reference sheets take precedence and inconsistent assets are revised.
- A wide background is viewed in portrait; essential subject matter remains
  within documented crop-safe regions and UI never covers critical focal points.
- A transparent item or vehicle asset has halos, clipped extremities, or poor
  contrast against one scene; export and outline/shadow treatment preserve it.
- A high-resolution asset exceeds the runtime texture or loading budget; an
  appropriately sized derivative is used while the master remains archived.
- Several generated images use subtly different historical eras or rendering
  styles; the visual-direction checklist rejects the inconsistent set.
- Decorative texture lowers text contrast; panels provide a stable readable
  field independent of the background artwork.
- An asset is unavailable during development; the fallback is visibly
  intentional and does not become an accidental final asset.
- Device pixel ratio or browser scaling changes; UI remains sharp without
  changing the authoritative logical placement or input behavior.
- Reduced motion is enabled; transitions become instantaneous or subdued while
  selection, focus, progress, and outcome states remain clear.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST provide a higher-resolution responsive presentation
  that uses modern desktop viewport space intentionally rather than only scaling
  the existing 800×450 composition.
- **FR-002**: The visual system MUST define shared typography, spacing, color,
  panel, border, control, focus, badge, and safe-area conventions for all primary
  scenes.
- **FR-003**: Title, entrant selection, preparation/workshop, race playback,
  scored results, and Test Day surfaces MUST use one cohesive art direction.
- **FR-004**: Primary scene backdrops MUST use production-intent generated 2D
  artwork or deliberately authored visual assets rather than generic placeholder
  gradients or debug geometry.
- **FR-005**: The feature MUST include production-intent generated art for the
  four entrants and four vehicles, with consistent canonical identity across
  every use.
- **FR-006**: The feature MUST include supporting production-intent art for the
  item presentation system at a reusable family, category, or representative
  item level chosen during planning; readable feature 024 information MUST remain
  primary and the feature is not required to produce 70 unique illustrations.
- **FR-007**: Generated assets MUST conform to the canonical alternate Motor Age
  setting, 2D medium, entrant identities, vehicle topology, and moral/lore
  boundaries documented by the project.
- **FR-008**: Generated assets containing visible model artifacts, unwanted
  text, watermarks, modern anachronisms, identity drift, or misleading mechanical
  implications MUST NOT be accepted as runtime production-intent assets.
- **FR-009**: Every generated asset family MUST have a documented visual brief,
  canonical references, selected high-resolution master, runtime derivatives,
  crop/transparency guidance, and consuming surfaces.
- **FR-010**: High-resolution masters MUST be retained separately from optimized
  runtime derivatives so future revisions do not depend on upscaling compressed
  game assets.
- **FR-011**: Runtime assets MUST use dimensions and compression appropriate to
  their maximum displayed size and MUST remain visually sharp at the primary
  high-resolution target.
- **FR-012**: Layouts MUST preserve consequential content and interaction at
  1920×1080, 1366×768, 1024×768, 800×450, and 390×844 through responsive reflow,
  safe-area constraints, or scrolling where appropriate.
- **FR-013**: Artwork MUST preserve documented crop-safe regions at supported
  aspect ratios and MUST NOT place required UI over critical faces, vehicle
  features, or narrative focal points.
- **FR-014**: Text and consequential UI MUST remain readable over every art asset
  through intentional panels, scrims, framing, contrast, or composition.
- **FR-015**: Recurring controls and states MUST use shared visual components
  rather than scene-specific approximations.
- **FR-016**: Mouse, touch, and keyboard interaction MUST retain clear hit,
  hover where applicable, pressed, selected, focused, and disabled states.
- **FR-017**: State meaning MUST use structure, iconography, text, or shape in
  addition to color; animation MUST NOT carry unique information.
- **FR-018**: The feature MUST respect reduced-motion preferences and MUST avoid
  motion that obstructs reading or causes required controls to move unpredictably.
- **FR-019**: Missing or failed optional art assets MUST fall back to a deliberate
  readable presentation without preventing the primary flow from continuing.
- **FR-020**: Feature 024's item-card hierarchy and feature 025's vehicle-stat
  hierarchy MUST remain functionally authoritative; this feature styles and
  illustrates them without omitting or redefining their information.
- **FR-021**: The feature MUST NOT change item availability, economy, placement,
  tiering, simulation, race resolution, entrant parity, or progression.
- **FR-022**: The first pass MUST explicitly distinguish production-intent assets
  from final 1.0 assets and record known visual debt rather than blocking the
  feature on launch-grade polish.
- **FR-023**: Runtime art and UI MUST meet a planning-defined loading/memory
  budget on the supported web target without sacrificing input responsiveness.
- **FR-024**: The final integrated pass MUST include a visual inventory showing
  every primary screen, component family, and runtime asset with its completion
  or known-debt status.

### Key Entities

- **Visual Design System**: Shared rules and reusable components for typography,
  color, spacing, panels, controls, states, and responsive safe areas.
- **Art Direction Brief**: The canonical description of style, era, mood,
  palette, materials, composition, exclusions, and quality bar used to create
  and review generated artwork.
- **Canonical Character Reference**: The identity anchor for an entrant's face,
  silhouette, clothing, palette, demeanor, and recurring details.
- **Canonical Vehicle Reference**: The identity anchor for a vehicle's
  silhouette, topology, materials, scale cues, palette, and recurring details.
- **Asset Master**: The highest-quality selected and corrected source image kept
  for future iteration, separate from runtime optimization.
- **Runtime Derivative**: A cropped, resized, transparent, and/or compressed
  version of a master used by the game for a declared viewport or surface.
- **Crop-Safe Region**: The portion of an asset that must remain meaningful and
  unobscured across responsive crops and UI overlays.
- **Visual Inventory**: A traceable list of primary screens, reusable component
  families, assets, consumers, completion state, and known pre-1.0 debt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a blind consistency review, at least 90% of participants group
  screenshots from every primary scene as belonging to the same game and art
  direction.
- **SC-002**: At least 90% of players can correctly associate each entrant and
  vehicle with its canonical identity after one completed run.
- **SC-003**: At every required viewport, no consequential text, state, or
  interaction target is clipped, overlapped, or unreachable on any primary
  scene.
- **SC-004**: At 1920×1080, 100% of primary runtime artwork displays without
  visible upscaling artifacts at its intended maximum size.
- **SC-005**: Every accepted generated runtime asset passes the project's review
  checklist for unwanted text, watermarks, generation artifacts, anachronisms,
  identity consistency, crop safety, and UI contrast.
- **SC-006**: Every primary scene and recurring component family is represented
  in the visual inventory with either a completed status or explicit pre-1.0
  debt; no placeholder remains undocumented.
- **SC-007**: Keyboard-only and touch-only players can complete the primary flow
  with 100% of required focus, selection, pressed, and disabled states visible.
- **SC-008**: The integrated asset set remains within the performance budget
  established during planning and introduces no sustained input or playback
  responsiveness regression on the supported target.
- **SC-009**: Existing deterministic item, garage, physics, contest, progression,
  and Test Day outcomes remain unchanged for identical inputs.

## Assumptions

- AI image generation will be used to create production-intent raster artwork,
  followed by selection, correction, cropping, transparency work, and runtime
  optimization as needed; first-generation outputs are not automatically final.
- The canonical roster, vision, vehicle topology, and character-item documents
  are the source of truth for visual identity.
- Feature 024 should establish the item UI's information architecture before
  feature 026 applies final visual styling and supporting art.
- Feature 025 should establish the vehicle-stat hierarchy before feature 026
  applies final panel styling.
- A coherent complete pass is more important than maximum detail on any one
  screen. Known polish gaps may remain when explicitly inventoried.
- High-resolution desktop is the primary quality target, while supported narrow
  layouts must remain fully functional and readable.
- Exact generation prompts, asset counts, master dimensions, file formats,
  loading strategy, component geometry, and performance budgets are planning
  decisions rather than specification-level commitments.

## Out of Scope

- Final 1.0 marketing art, storefront assets, trailers, or launch key art.
- Full frame-by-frame character or vehicle animation.
- Seventy unique final item illustrations unless a later planning decision
  explicitly expands the scope.
- 3D models, real-time lighting, or a change from the constitution's 2D medium.
- Redesigning gameplay, item rules, simulation, economy, progression, or race
  controls.
- Final localization production, though layouts must avoid unnecessary
  dependence on short English strings.
