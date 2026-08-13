# Feature Specification: Vehicle Stat Display

**Feature Branch**: `025-vehicle-stat-display`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Display vehicle base and effective physical stats throughout a run, while building the vehicle, and during race playback."

## Background

Feature 021 established four authoritative vehicle capabilities: Acceleration,
Top Speed, Braking Power, and Cornering Speed. Features 020 and 023 then added
items that modify those capabilities directly, conditionally, by tier, and by
lap-varying amplification. The game currently exposes item names and race time
more readily than the vehicle those items produce, making it difficult to read
a build as a whole or connect an item choice to what happens on track.

This feature gives the vehicle's physical stats a stable, readable presence
throughout a run. It distinguishes the stock vehicle baseline from the current
build's totals and, during a race, from the effective values resolved for the
inspected lap. It complements feature 024's item-level summaries and inspector:
024 explains what each item contributes, while this feature explains the
resulting vehicle.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the current vehicle while building (Priority: P1)

While choosing, placing, moving, or storing items, a player can see the
vehicle's four current physical stats without leaving the preparation screen.
Each value shows the stock baseline and the net item-driven change, so the
player can understand the build as a whole rather than mentally adding every
card.

**Why this priority**: Item decisions are meaningful only if the player can see
the vehicle those decisions produce. This is the primary decision-making view
for the feature.

**Independent Test**: Enter a preparation encounter with a stock vehicle, then
place representative fitted, improvised, conditional, tiered, and stored items.
Confirm the display always shows all four authoritative stats, identifies the
stock baseline, and reconciles each unconditional current total with the held
items that are active in that build state.

**Acceptance Scenarios**:

1. **Given** a vehicle with no items, **When** preparation is displayed,
   **Then** all four stats equal the stock baseline and no item bonus is implied.
2. **Given** a vehicle with active item contributions, **When** preparation is
   displayed, **Then** each stat shows its current total and its signed net
   difference from stock.
3. **Given** an item is moved between Fitted, Flexible, Improvised, and Stored
   states, **When** the authoritative build changes, **Then** the stat display
   updates to reflect the behavior active in the new location.
4. **Given** a held conditional or lap-stacking effect cannot be resolved
   outside a track or lap context, **When** preparation is displayed, **Then**
   the unconditional total remains honest and the unresolved potential is
   identified separately rather than folded into a misleading number.
5. **Given** a tier-two or tier-three item, **When** it contributes to a stat,
   **Then** the displayed current total uses its effective tier-adjusted value.

---

### User Story 2 - Preview how a placement changes the vehicle (Priority: P1)

While evaluating an offer or moving a held item, a player can preview the
vehicle stats that would result from the candidate destination before placing
the item. The display emphasizes which totals rise, fall, or stay unchanged and
accounts for any displaced item.

**Why this priority**: Feature 024 explains an item's rules, but players also
need the aggregate consequence of a placement. This turns the vehicle display
into an actionable comparison tool rather than a passive status panel.

**Independent Test**: Preview the same tradeoff item in a matching slot, a Flex
slot, a mismatched slot, storage, and an occupied destination. Confirm the
prospective totals and signed differences match the authoritative garage
preview in every case and that cancelling the preview restores the current
display without changing the build.

**Acceptance Scenarios**:

1. **Given** a selected item and valid destination, **When** placement is
   previewed, **Then** the display shows the prospective total for every changed
   stat alongside its difference from the current build.
2. **Given** placement changes the item's Fitted, Flexible, Improvised, or
   Stored behavior, **When** previewed, **Then** the prospective totals use the
   behavior that destination would actually activate.
3. **Given** placement would displace or swap another item, **When** previewed,
   **Then** the prospective totals account for both the incoming and outgoing
   contributions.
4. **Given** a preview is cancelled or becomes invalid, **When** the preview
   closes, **Then** the display returns to the unchanged authoritative build.
5. **Given** a stat does not change, **When** another stat is previewed changing,
   **Then** the unchanged stat remains legible without receiving false emphasis.

---

### User Story 3 - Follow effective vehicle stats during a race (Priority: P1)

During race playback, a player can see the vehicle's effective four-stat profile
for the current lap. When a condition, cooldown, or stacking amplifier changes a
stat between laps, the display changes with the authoritative lap evidence and
communicates why.

**Why this priority**: The physics model can vary by lap. A preparation-only
total would become misleading at exactly the moment players are trying to
understand their build's performance.

**Independent Test**: Race a build containing an always-on stat item, a
track-conditional effect, and a stacking stat-targeted Buff. Step through laps
and confirm the four displayed effective values match each lap's recorded
physics stats, while changes identify their item or condition source.

**Acceptance Scenarios**:

1. **Given** a race lap with recorded physics stats, **When** that lap is active
   in playback, **Then** all four displayed values match that lap's authoritative
   effective stats.
2. **Given** an effect activates or accumulates between laps, **When** playback
   advances, **Then** the affected value updates and the display identifies the
   source of the change without requiring the player to infer it from color.
3. **Given** a conditional effect is inactive for the current track or lap,
   **When** its stat is displayed, **Then** the effect is not included and its
   inactivity is not presented as an active bonus.
4. **Given** playback is paused or a completed lap is inspected, **When** the
   player opens item details, **Then** the vehicle totals and item-level evidence
   use the same lap context.
5. **Given** race evidence lacks physical stats, **When** the race view is
   displayed, **Then** the interface reports that detailed stats are unavailable
   rather than substituting stock or stale preparation values.

---

### User Story 4 - Scan stats throughout the run on every supported input (Priority: P2)

The vehicle's stats use the same names, order, units, precision, and direction
language wherever they appear. Players using mouse, touch, or keyboard can read
the current values and reach supporting details, and narrow displays preserve
the complete four-stat summary.

**Why this priority**: Repetition builds understanding only when the repeated
information is genuinely consistent and accessible.

**Independent Test**: Compare the same build in preparation, race playback,
result review, and Test Day using mouse, touch, and keyboard at supported
viewports. Confirm the values and terminology agree for the same context and
remain understandable in monochrome and with motion disabled.

**Acceptance Scenarios**:

1. **Given** the same vehicle state and context, **When** stats appear on two
   different screens, **Then** they use identical names, ordering, units, signs,
   and precision.
2. **Given** a narrow viewport, **When** the stat display reflows, **Then** all
   four values and their current context remain readable and reachable.
3. **Given** keyboard or touch input, **When** the player requests supporting
   detail, **Then** the same baseline, delta, and source information available to
   mouse users is persistently accessible without hover.
4. **Given** color or animation is unavailable, **When** a value rises, falls,
   is previewed, or is conditional, **Then** wording, signs, icons, or structure
   continue to communicate that state.

### Edge Cases

- An item improves one stat and harms another; both changes receive equal
  visibility in current and preview displays.
- Several items affect the same stat, including positive and negative deltas;
  the aggregate reconciles with individually inspectable sources.
- A stat is clamped to the simulation's positive minimum; the displayed total
  reflects the authoritative clamped value and does not imply the unclamped sum
  was used in the race.
- A positive amplifier magnifies a negative item contribution, or a negative
  amplifier shrinks a positive contribution; the aggregate direction follows
  the resulting mathematics rather than the amplifier's sign alone.
- A stacking effect changes only on some laps; values remain stable on other
  laps and do not animate or announce a change that did not occur.
- A conditional contribution depends on track segment context and cannot be
  represented by one whole-lap number; the display distinguishes baseline lap
  stats from segment-specific activation and keeps the detailed rule reachable.
- A race transitions between laps while an item inspector is open; both views
  advance to the same authoritative lap or clearly preserve the same paused lap.
- Values are very small, negative before clamping, or large after tiering and
  amplification; consistent precision prevents a real change from rounding to
  a misleading zero.
- A rival has different stats from the player; any rival display is explicitly
  identified and never replaces or masquerades as the player's vehicle panel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use exactly four primary vehicle-stat labels:
  Acceleration, Top Speed, Braking Power, and Cornering Speed.
- **FR-002**: Every vehicle-stat display MUST use one shared ordering, unit,
  sign, and precision convention for those four stats across all screens.
- **FR-003**: During every preparation encounter, the interface MUST display all
  four current vehicle stats without requiring hover or opening an item.
- **FR-004**: The preparation display MUST distinguish the stock baseline, the
  signed aggregate item-driven difference, and the resulting current total.
- **FR-005**: Current preparation totals MUST include only contributions that are
  authoritative in the current build context, including tier and installation
  behavior, and MUST NOT pretend unresolved track-, segment-, or lap-conditional
  potential is currently active.
- **FR-006**: Unresolved conditional potential MUST remain discoverable from the
  vehicle display and use language that distinguishes it from the current total.
- **FR-007**: Previewing a valid garage destination MUST show prospective vehicle
  totals and signed differences from the current authoritative build before the
  player commits placement.
- **FR-008**: Prospective totals MUST use the same authoritative placement rules
  as commitment, including Fitted, Flexible, Improvised, Stored, swap,
  replacement, eviction, tiering, and storage-activity behavior where applicable.
- **FR-009**: Cancelling or invalidating a preview MUST restore the current
  authoritative totals and MUST NOT mutate the build.
- **FR-010**: During track-aware race playback, the display MUST show all four
  effective physical stats for the active or inspected lap.
- **FR-011**: Race values MUST come from that lap's recorded physics evidence;
  the presentation MUST NOT independently recompute simulation outcomes or show
  a shared build snapshot when lap-specific values exist.
- **FR-012**: When effective values change between laps, the player MUST be able
  to identify the item, condition, cooldown, tier, installation state, or
  stacking effect responsible for the change.
- **FR-013**: Vehicle totals and item inspection shown simultaneously MUST share
  the same build, placement-preview, track, and lap context.
- **FR-014**: The display MUST visually and verbally distinguish at least Stock,
  Current Build, Placement Preview, and Race Lap contexts.
- **FR-015**: Beneficial, harmful, unchanged, conditional, previewed, and
  unavailable states MUST be communicated through text, signs, icons, or layout
  in addition to color.
- **FR-016**: Required vehicle-stat information and supporting details MUST be
  accessible by mouse without hover, touch, and keyboard with visible focus.
- **FR-017**: The four-stat summary MUST reflow at all supported viewports without
  clipping values, hiding their context, or reducing text below the project's
  established legibility thresholds.
- **FR-018**: Preparation, race playback, result review, and Test Day MUST use the
  same shared vehicle-stat presentation vocabulary; context-specific views MAY
  add evidence but MUST NOT rename or reinterpret a stat.
- **FR-019**: When authoritative physical-stat evidence is unavailable for a
  context, the interface MUST state that limitation and MUST NOT substitute
  stale, stock, or estimated values without labeling them explicitly.
- **FR-020**: Item-level details MUST remain individually attributable so each
  aggregate difference can be reconciled with feature 024's item presentation.
- **FR-021**: This feature MUST NOT alter stock stats, item effects, tier scaling,
  amplification, placement legality, simulation outcomes, or race timing.
- **FR-022**: The primary always-visible display MUST prioritize the player's
  vehicle; displaying rival stats is optional, but any rival view MUST be
  explicitly labeled and use authoritative evidence for that rival.

### Key Entities

- **Stock Baseline**: The authoritative no-item values for Acceleration, Top
  Speed, Braking Power, and Cornering Speed.
- **Current Vehicle Stats**: The four totals authoritative for the current build
  before unresolved track-, segment-, or lap-specific effects.
- **Prospective Vehicle Stats**: A noncommitting projection of the four totals
  after a candidate garage action, always paired with differences from Current
  Vehicle Stats.
- **Lap-Effective Vehicle Stats**: The four physical values recorded by the
  simulation for one particular race lap after relevant conditions,
  amplifications, cooldowns, tiers, and installation behavior are resolved.
- **Vehicle Stat Line**: One consistently formatted stat containing its name,
  total, unit, context, difference from an appropriate reference, and optional
  source or condition indicator.
- **Stat Contribution Source**: An attributable item or rule that explains part
  of the difference between stock and current, current and prospective, or one
  lap and another.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of players can identify the vehicle's strongest and
  weakest physical stat within 10 seconds of viewing a preparation screen.
- **SC-002**: At least 90% of players can correctly predict which of the four
  vehicle stats will rise or fall before committing a representative item
  placement.
- **SC-003**: For every catalog item and legal installation state, displayed
  current and prospective unconditional totals reconcile exactly with the
  authoritative stock baseline and active item contributions.
- **SC-004**: For sampled races containing conditional, tiered, stacking, and
  stat-targeted effects, 100% of displayed race values equal the corresponding
  lap's recorded physical stats.
- **SC-005**: At every supported viewport, all four stats and their active
  Stock, Current Build, Placement Preview, or Race Lap context remain visible or
  reachable with no clipped consequential values.
- **SC-006**: Keyboard-only and touch-only players can access the same totals,
  comparisons, and source explanations as mouse users, with no required hover.
- **SC-007**: In monochrome and reduced-motion review, 100% of changed,
  unchanged, previewed, conditional, and unavailable states remain distinguishable.
- **SC-008**: Existing deterministic build, item, tier, physics, and contest
  outcomes remain unchanged for identical inputs.

## Assumptions

- Feature 021's `STOCK_PHYSICAL_STATS` and four-stat vocabulary remain the
  authoritative baseline and dimensions.
- Feature 023's lap-specific recorded physics stats remain the authoritative
  race values; presentation consumes evidence rather than rerunning physics.
- Feature 024 owns item-card and item-inspector hierarchy. This feature owns the
  aggregate vehicle panel and source reconciliation between that panel and item
  details.
- "During the run" includes preparation encounters, race playback, result
  review, and Test Day where authoritative stats are available; it does not
  require an always-visible overlay on narrative or entrant-selection screens.
- The primary view shows the player's vehicle. Rival comparison may be planned
  later without blocking the player's complete stat display.
- Exact panel geometry, responsive breakpoints, animation, and icon artwork are
  planning and design-system decisions, provided the information hierarchy and
  accessibility requirements above are preserved.

## Out of Scope

- Changing physics formulas, stock baseline values, item balance, or tier rules.
- Adding new vehicle stats beyond the four established by feature 021.
- Predicting a lap time from the preparation panel or simulating hypothetical
  track outcomes as part of a placement preview.
- Exposing rival hidden build information that the run does not already make
  available.
