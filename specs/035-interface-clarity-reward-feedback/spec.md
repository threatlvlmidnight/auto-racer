# Feature Specification: Interface Clarity and Reward Feedback

**Feature Branch**: `[035-interface-clarity-reward-feedback]`

**Created**: 2026-08-15

**Status**: Implemented (2026-08-16, branch `035-interface-clarity-reward-feedback`) — automated gates green; owner browser QA records visual/input evidence in acceptance-evidence.md.

**Input**: Resolve the remaining demo readability and reward-feedback debt:
make circuit context and adjustable controls unambiguous, make cards and
upgrades meaningfully scannable, and remove overlap, clipping, and unreachable
controls from the current primary-scene compositions.

## Clarifications

### Session 2026-08-15

- Q: What is the player-facing geographic location for a circuit? → A: Use the
  existing World Tour region name with an explicit LOCATION label; show the
  recorded track name beside it, do not invent a city/venue field, and keep
  Test Day marked fixed and unscored.
- Q: What does Adjustable mean? → A: It is a consistent badge for an item that
  exposes a live pre-race control. Keep established names where accurate, but
  rename non-configurable Variable-Ratio Test Gearbox to Two-Speed Test Gearbox;
  Variable-Pitch Propeller remains named as-is because it is configurable.
- Q: What rarity system should cards use? → A: Every playable item receives an
  explicit display-only Standard, Notable, or Rare catalog rarity. It affects
  neither odds, price, tier scaling, economy, nor simulation and must never be
  communicated by color alone.


## Scope and boundaries

Feature 035 improves presentation of facts that already exist. It does not
change contest, economy, tier-upgrade, encounter, track-selection, or item-rule
authority. Feature 032 remains the source of truth for duplicate upgrades and
the before/after overlay; Feature 034 owns new encounter content; Feature 026
owns a new responsive host, high-resolution layout system, and the unresolved
390×844 text-size waiver.

The supported acceptance matrix is the existing landscape canvas compositions
at 1920×1080, 1366×768, 1024×768, and 800×450. Narrow layouts must retain
existing reachable behavior, but this feature does not claim to solve the
project-wide mobile readability floor.

## User Scenarios & Testing

### User Story 1 — Know where and how the next race will run (Priority: P1)

As a player, I can identify the selected circuit and its location on every
surface that identifies an upcoming, active, or completed race, and I can tell
which item controls are genuinely adjustable before the race starts.

**Why this priority**: Race context and build controls affect the player’s next
decision. Ambiguous naming or missing location makes preparation harder to
learn without adding strategic depth.

**Independent Test**: Traverse a seeded Local Race, Championship Race, and
Test Day from selection through result; inspect race-identity surfaces and
configurable items without relying on hover.

**Acceptance Scenarios**:

1. **Given** a race has a recorded circuit and location, **When** it appears in
   selection, briefing, playback, Results, history, or a race summary, **Then**
   the same player-readable circuit name and location are shown or the surface
   explicitly links to that identity.
2. **Given** an item exposes a pre-race control, **When** it is shown in an
   offer, inventory, garage, briefing, or inspector, **Then** its `Adjustable`
   label and available control are discoverable without hover.
3. **Given** an item does not expose a pre-race control, **When** its name,
   badge, description, and empty-state copy are shown, **Then** none imply that
   an unavailable adjustment can be made.
4. **Given** Test Day’s fixed configuration, **When** its circuit identity is
   shown, **Then** it is visibly distinguished from a scored race without
   inventing a location or changing its fixed authority.

---

### User Story 2 — Recognize a meaningful offer or upgrade at a glance (Priority: P1)

As a player, I can distinguish an item’s rarity, held/offer state, and
upgrade eligibility before committing, and receive a satisfying but
non-obscuring confirmation when an upgrade succeeds.

**Why this priority**: Offers and duplicate upgrades are high-frequency,
consequential choices. The transaction is correct, but its payoff and card
hierarchy are too easy to miss.

**Independent Test**: Inspect mixed-rarity Supplier, Reward Draft, inventory,
and duplicate-upgrade fixtures with pointer, touch, keyboard, and reduced
motion enabled; compare every cue with existing authoritative state.

**Acceptance Scenarios**:

1. **Given** an item card is displayed, **When** a player scans it beside cards
   of other rarities or states, **Then** its rarity and key state are
   distinguishable through text, iconography, framing, and hierarchy—not color
   alone.
2. **Given** an offered duplicate would tier up a held item, **When** the offer
   is presented, **Then** the player sees an explicit upgrade-eligible cue
   before purchase without inferring eligibility from decoration.
3. **Given** a duplicate upgrade succeeds, **When** the authoritative Feature
   032 result is displayed, **Then** the offer confirmation and before/after
   feedback have a bounded visual payoff while prices, changed values, and
   dismissal/continuation controls remain readable and reachable.
4. **Given** reduced motion is enabled, **When** a rare offer or upgrade is
   presented, **Then** the same rarity, eligibility, and outcome meaning remain
   available without essential animation.

---

### User Story 3 — Use every primary scene without visual collisions (Priority: P1)

As a player, I can read, focus, and activate every consequential control in
the current primary scenes without text overlap, clipping, accidental control
collisions, or hidden state.

**Why this priority**: A correct game flow is not usable when the composition
hides controls or merges unrelated information.

**Independent Test**: Run the approved viewport matrix through title, entrant
selection, destination/run, acquisition, inventory, pre-race, watched race,
Results, Test Day, and encounter surfaces; record screenshots and keyboard
focus sweeps for each relevant state.

**Acceptance Scenarios**:

1. **Given** any primary scene at a supported landscape viewport, **When** its
   longest authored labels, disabled reasons, price/state badges, and primary
   actions appear together, **Then** no consequential text, control, focus
   ring, or item state overlaps, clips, or becomes unreachable.
2. **Given** a scene has more information than its composition can present at
   once, **When** it renders, **Then** it uses a deliberate compact, pinned, or
   secondary-inspection treatment rather than shrinking text or layering
   controls on top of one another.
3. **Given** keyboard, touch, or pointer input, **When** a user reaches a
   control, **Then** focus, selected, disabled, unavailable, and pressed states
   remain visible without relying solely on color or hover.
4. **Given** a narrow existing host layout, **When** a treatment cannot fit
   safely, **Then** it falls back to the existing safe presentation rather than
   claiming a new responsive layout or reducing the legibility floor.

### Edge Cases

- A missing or legacy circuit-location field uses an explicit neutral fallback;
  it never guesses a geography or alters the selected track.
- A card may be rare, unavailable, selected, pinned, and upgrade-eligible at
  once; every consequential fact remains visible without competing actions.
- Long item names, location names, prices, and disabled reasons remain
  contained in the approved landscape matrix.
- Decorative effects never obscure an item’s rule, tier, price, controls, or
  authoritative before/after values.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose one player-readable circuit identity—name
  and location—for scored-race presentation surfaces.
- **FR-002**: Circuit identity MUST derive from recorded or selected race
  context and MUST NOT affect simulation, rewards, or track selection.
- **FR-003**: Test Day MUST use a clearly labeled fixed-configuration identity
  and MUST NOT be presented as a scored geographic event.
- **FR-004**: `Adjustable` MUST be reserved for items with an available
  pre-race setup control; misleading `Variable` or equivalent control language
  MUST be removed from names, badges, descriptions, and empty states.
- **FR-005**: Adjustable controls MUST state current value, allowed input, and
  race consequence through existing authoritative setup evidence.
- **FR-006**: Item-card rarity, availability, held/offer role, and
  upgrade-eligibility MUST have non-color semantic representation.
- **FR-007**: A duplicate offer that can upgrade a held item MUST expose that
  eligibility before confirmation and reuse Feature 032’s authoritative result.
- **FR-008**: Rare-offer and upgrade-success treatments MUST have a
  reduced-motion equivalent with no loss of meaning.
- **FR-009**: The system MUST define a finite primary-scene/state/viewport audit
  matrix and retain owner-reviewed evidence for it.
- **FR-010**: At 1920×1080, 1366×768, 1024×768, and 800×450, the audit matrix
  MUST show no consequential overlap, clipping, unreachable action, or lost
  focus indication.
- **FR-011**: If a treatment cannot fit an existing narrow layout, it MUST use
  the existing safe fallback; a responsive-host redesign is out of scope.
- **FR-012**: Presentation changes MUST preserve mouse, touch, keyboard,
  reduced-motion, and no-hover access to every consequential fact and action.
- **FR-013**: The feature MUST add pure presentation tests for circuit identity,
  adjustable vocabulary, card-state precedence, and reduced-motion variants
  before scene integration.
- **FR-014**: The feature MUST not introduce live race randomness, player input
  during playback, or an alternate upgrade/economy transaction path.

### Key Entities

- **Circuit presentation identity**: display-only circuit name, location, race
  kind, and fallback state derived from existing race context.
- **Item card state**: display-only combination of rarity, offer/held role,
  selection, availability, upgrade eligibility, and motion treatment.
- **Audit case**: named scene, state fixture, viewport, input mode, and
  expected legibility/focus outcome used as repeatable acceptance evidence.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every audited scored-race identity surface shows the same circuit
  name and location for the same recorded race; Test Day is consistently marked
  fixed and unscored.
- **SC-002**: Controlled mixed-card fixture tests expose rarity and
  upgrade-eligibility before confirmation through text, icon, and structure
  with color disabled.
- **SC-003**: The approved landscape audit matrix records zero consequential
  overlaps, clips, unreachable controls, or missing focus states.
- **SC-004**: Every rare-offer and upgrade outcome has a reduced-motion
  presentation preserving rarity, eligibility, changed tier, and changed values.
- **SC-005**: Full automated tests, lint, type-check, and production build pass
  with no weakened existing authority assertions.

## Assumptions

- Existing track and race context contain or can expose a stable display name;
  missing location data receives an explicit neutral fallback rather than new
  world-tour simulation data.
- Feature 032’s upgrade result remains sufficient for all confirmation facts;
  Feature 035 supplies presentation only.
- The project owner performs browser screenshot and input acceptance because
  automated canvas visual testing is not currently available.
- Feature 026 remains the owner of true narrow-portrait reflow and the mobile
  text-size waiver, even if this feature discovers related defects.
