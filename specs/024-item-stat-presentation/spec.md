# Feature Specification: Item Stat Presentation

**Feature Branch**: `024-item-stat-presentation`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Upgrade the game's item presentation so the new character-specific items and their physical stats, conditional effects, buffs, synergies, tiers, and installation behavior are readable and easy to compare wherever players encounter them."

## Clarifications

### Session 2026-08-12

- Q: How should preview, inspection, and commitment differ across desktop and eventual mobile input? → A: **Hover previews. Selection inspects. Placement commits.** Hover is an optional desktop convenience; clicking, tapping, or keyboard-selecting an item persistently inspects it; the item is committed only when the player places it in a slot or storage. Mouse and touch both support first-class drag-and-drop, while tap/click/keyboard selection followed by choosing a destination remains an equally capable alternative. Selecting an item never commits it by itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand an item at a glance (Priority: P1)

While choosing or arranging items, a player can immediately identify an item's name, origin, category, tier, price when relevant, and its consequential effects. Physical-stat changes use consistent player-facing names, signs, units, and icons, while conditional or amplified effects state what they affect and when they apply. The player does not need to decode internal field names or infer whether a larger number is beneficial.

**Why this priority**: The new catalog introduces several dimensions that the current name-and-icon cards do not expose. If players cannot understand an offer before choosing it, the expanded item system creates obscurity rather than strategic depth.

**Independent Test**: Present a representative set containing a direct physical-stat item, a tradeoff item, a conditional item, a Buff, a Synergy item, and an economy-only placeholder. Confirm a player can identify each item's effect, direction, target, condition, and category from its visible presentation without consulting source data or another screen.

**Acceptance Scenarios**:

1. **Given** an item changes one or more physical stats, **When** its compact presentation is visible, **Then** each changed stat is named consistently and shows a signed value whose beneficial or harmful direction is communicated without color alone.
2. **Given** an item has both a benefit and a penalty, **When** the player reads it, **Then** both sides of the tradeoff have equal visibility rather than the benefit visually hiding the penalty.
3. **Given** an item has a conditional physical effect, **When** the player reads it, **Then** the affected stat and activation condition are presented together as one understandable rule.
4. **Given** an item amplifies another item, **When** the player reads it, **Then** the target stat, eligible targets, amplification amount, and flat, stacking, or count-based behavior are explicit.
5. **Given** an item currently has no implemented contest effect, **When** it is shown, **Then** the presentation labels that state honestly and does not imply a performance benefit.

---

### User Story 2 - Compare an offer with the current build (Priority: P1)

During acquisition and garage decisions, a player can select an offer and compare it with held items without losing the surrounding choices. A persistent inspector expands the selected item's full rules, while compact cards retain the most decision-relevant facts. Previewing a destination explains the item's resulting Fitted, Flexible, or Improvised state and exactly which authored behavior would be gained, lost, or changed.

**Why this priority**: Item value depends on the player's current build, vehicle slot, tags, and track-facing strategy. A readable isolated card is insufficient unless the player can use it to make an actual placement or replacement decision.

**Independent Test**: Select one offered item, preview it in a matching slot, a Flex slot, a mismatched slot, and storage, then compare it against the displaced item. Confirm every preview names the resulting state and displays all changed effects before commitment.

**Acceptance Scenarios**:

1. **Given** multiple offers are visible, **When** the player selects one, **Then** the offer list remains visible and a persistent full inspector opens for the selected item without accepting or placing it.
2. **Given** a candidate destination, **When** placement is previewed, **Then** the preview labels Fitted, Flexible, Improvised, or Stored and states the exact active and inactive behavior resulting from that destination.
3. **Given** placement would displace another item, **When** the player previews it, **Then** the incoming and outgoing items can be compared using the same stat names, ordering, signs, and units.
4. **Given** an item has synergy tags or effects, **When** the current build contains matching and nonmatching items, **Then** the inspector distinguishes the authored rule from the currently satisfied or unsatisfied relationship.
5. **Given** a tiered held item, **When** it is compared with a tier-one offer, **Then** the current tier and tier-adjusted values are explicit and are not presented as the authored tier-one values.

---

### User Story 3 - Inspect why an item mattered (Priority: P2)

During a race and on result or Test Day screens, the player can inspect the same item identity and rules seen during preparation, plus the relevant resolved evidence: installation state, effective tier, active conditions, targeted amplification, and lap-specific physical stats or contribution. The presentation separates an item's authored rule from what actually happened in the inspected race or lap.

**Why this priority**: Preparation and results must use one visual and verbal language so players can learn from a race. This directly supports the project's transparency and build-testing principles.

**Independent Test**: Run a build containing a conditional item and a stacking stat-targeted Buff. Inspect both during preparation, race playback, and result review; confirm their identity and authored descriptions remain consistent while race/result views add accurate lap-specific state.

**Acceptance Scenarios**:

1. **Given** an item is shown in preparation, race playback, and results, **When** its details are inspected in each location, **Then** its name, origin, category, tags, authored effects, and stat terminology remain consistent.
2. **Given** a conditional effect, **When** an inspected lap contains matching and nonmatching track contexts, **Then** the result distinguishes where the condition activated from where it did not.
3. **Given** a stacking stat-targeted Buff, **When** two different laps are inspected, **Then** the display shows the correct lap-specific accumulated amplification and resulting targeted stat.
4. **Given** an item contributed nothing, **When** it is inspected after the race, **Then** it remains present and reports zero contribution or a specific unmet condition, cooldown, inactive-storage, or installation reason.
5. **Given** multiple items affect the same stat, **When** the result is inspected, **Then** each source remains individually attributable and the effective stat can be reconciled from the displayed evidence.

---

### User Story 4 - Read and operate item details on every supported input (Priority: P2)

Players using mouse, touch, or keyboard can select, inspect, dismiss, and move between item details. Required information is persistently available and never depends on hover, color perception, or animation. Compact and expanded presentations reflow for narrow screens without hiding consequential values.

**Why this priority**: The existing garage contract already promises input parity and non-hover access. Adding richer item information must preserve that promise rather than creating a new inaccessible path.

**Independent Test**: Inspect and compare representative complex items using mouse without hover, touch, and keyboard at each supported viewport. Repeat with color removed and reduced motion enabled; confirm the same facts and actions remain available.

**Acceptance Scenarios**:

1. **Given** keyboard-only input, **When** the player navigates item cards, **Then** every item can receive visible focus and open its persistent inspector without pointer input.
2. **Given** touch input, **When** the player taps an item, **Then** its full details remain open until the player selects another item or explicitly dismisses them.
3. **Given** touch input, **When** the player drags an item to a valid destination, **Then** the item follows the gesture, valid destinations are identifiable, and releasing it places and commits the item under the existing placement rules.
4. **Given** touch input where dragging is difficult or undesirable, **When** the player selects an item and then taps a valid destination, **Then** the resulting placement is identical to drag-and-drop.
5. **Given** a narrow portrait display, **When** a complex item is inspected, **Then** all consequential effects remain readable through intentional reflow or scrolling rather than clipped text or reduced illegible type.
6. **Given** beneficial, harmful, active, inactive, selected, conditional, or unsatisfied states, **When** they are displayed, **Then** text, iconography, or structure distinguishes them in addition to color.

### Edge Cases

- An item affects all four physical stats, carries multiple conditional effects, has multiple synergy tags, and has both Fitted and Improvised behavior; the inspector keeps every rule reachable without overlapping or truncating content.
- Multiple conditional effects target the same stat under different conditions; each condition remains distinct rather than being merged into a misleading single value.
- A stat delta is zero, extremely small, negative, or amplified across zero; the display uses consistent precision and does not create a false benefit through rounding.
- A negative amplification shrinks another item's positive contribution, while a positive amplification magnifies a negative contribution; wording describes the actual mathematical direction instead of assuming every positive percentage helps.
- An item has an absent cooldown, an explicit multi-lap cooldown, or a stacking trigger; each receives an unambiguous cadence description.
- An item is active in storage, inactive in storage, or previewed for storage; its current and prospective state are distinguishable.
- A touch gesture begins as a tap, becomes a drag, crosses a scrollable region, leaves every valid destination, or is cancelled; the interface distinguishes the intended gesture and never commits an accidental or invalid placement.
- A finger obscures the dragged item or destination; the drag presentation keeps the item identity and valid drop targets visible throughout the gesture.
- An item has no synergy tags, no conditional effect, no Fitted bonus, or no additional Improvised consequence; absent mechanics are omitted or explicitly described where their absence affects a placement decision, without empty placeholder rows.
- Long item names, translated-length text, and large tier-adjusted values do not obscure price, category, or consequential effects.
- The selected item disappears because an offer is declined, bought, rerolled, combined into a higher tier, sold, or displaced; the inspector closes or moves to the resulting authoritative item without showing stale information.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use one consistent player-facing vocabulary for acceleration, top speed, braking power, cornering speed, time, cooldown, origin, category, tier, installation state, and storage state everywhere item information appears.
- **FR-002**: Every compact item presentation MUST expose, without interaction, the item's name, origin, Power or Chassis category, tier when above tier one, price when relevant, and every consequential base effect or tradeoff needed to distinguish it from another visible choice.
- **FR-003**: Every item MUST have a persistent full inspector that exposes its name, origin, category, synergy tags, current tier, base effects, conditional effects, cooldown or trigger cadence, Buff or Synergy rules, Fitted behavior, Improvised behavior, storage activity, and price or affordability where relevant.
- **FR-004**: Compact presentations MAY summarize complex rules, but MUST NOT omit a penalty, condition, target stat, stacking behavior, or lack of implemented contest effect in a way that changes the apparent decision.
- **FR-005**: Physical-stat values MUST use stable names, ordering, signs, precision, and units across all screens.
- **FR-006**: Beneficial and harmful directions MUST be communicated with wording or symbols in addition to color, and the direction MUST reflect the actual effect rather than assuming that positive numbers are always beneficial.
- **FR-007**: Conditional effects MUST present the affected stat, magnitude, and activation condition as a connected rule.
- **FR-008**: Buff and Synergy effects MUST identify the targeted stat, eligible item set, amplification magnitude, and whether their behavior is flat, stacking, count-based, or conditional.
- **FR-009**: The inspector MUST distinguish an item's authored rules from its current resolved state, including tier-adjusted values, installation state, satisfied relationships, and lap-specific accumulation.
- **FR-010**: Previewing an item in a destination MUST identify the prospective Fitted, Flexible, Improvised, or Stored state and show the exact behaviors that become active, remain active, become inactive, or are lost before the player commits.
- **FR-011**: Replacement or eviction previews MUST show incoming and outgoing items through the same comparison vocabulary and value formatting.
- **FR-012**: The system MUST distinguish synergy tags an item carries from Synergy effects it performs; neither may be labeled as the other.
- **FR-013**: Tiered items MUST show their effective tier and effective tier-adjusted values while retaining access to the underlying authored rule; tier-one values MUST NOT be mislabeled as current effective values.
- **FR-014**: Race, result, and Test Day inspection MUST preserve the same item identity and authored descriptions used during preparation and add only context-specific resolved evidence.
- **FR-015**: Result inspection MUST retain every held item, including zero-contribution items, and state the contribution or a specific reason the item did not contribute.
- **FR-016**: Lap-specific inspection MUST accurately show conditional activation, cooldown state, stacking state, targeted amplification, installation state, storage activity, and effective physical stats when those facts affect the inspected lap.
- **FR-017**: When multiple items affect the same outcome value, the presentation MUST keep each source individually attributable and expose enough evidence to reconcile the resolved value.
- **FR-018**: Required item information and inspection actions MUST be available by mouse without hover, touch, and keyboard with visible focus.
- **FR-019**: Hover MAY provide a convenience preview, but MUST NOT be the sole route to any required item information.
- **FR-019a**: Selecting an item MUST persistently inspect it without committing any acquisition or build change; commitment MUST occur only when the player places the item in a slot or storage through an established placement interaction.
- **FR-019b**: Mouse and touch users MUST both be able to place items by drag-and-drop, with the dragged item and valid destinations remaining identifiable throughout the gesture.
- **FR-019c**: Touch, pointer, and keyboard users MUST also be able to place an item by selecting it and then choosing a valid destination; this path MUST produce the same authoritative result as drag-and-drop.
- **FR-019d**: A cancelled drag, an invalid drop, or a gesture that does not cross the drag threshold MUST NOT change the build or commit an acquisition.
- **FR-020**: Selected, focused, beneficial, harmful, active, inactive, conditional, unsatisfied, Fitted, Flexible, Improvised, and storage-active states MUST use text, iconography, shape, or layout in addition to color.
- **FR-021**: Item presentations MUST reflow at all supported viewports without clipping consequential information, obscuring interaction targets, or reducing required text below the project's established legibility thresholds.
- **FR-022**: Item information MUST remain understandable when motion is reduced or absent; animation may reinforce but MUST NOT carry unique meaning.
- **FR-023**: The feature MUST NOT alter item availability, authored effects, simulation outcomes, economy values, placement legality, tier rules, or contest resolution.
- **FR-024**: The item-information hierarchy MUST cover Reward Draft, Parts Supplier, garage slots, storage, placement and replacement previews, race playback, scored results, Test Day briefing, Test Day playback, and Test Day results.

### Key Entities

- **Compact Item Summary**: The always-visible, comparison-oriented identity and consequential effects shown wherever several items compete for attention.
- **Item Inspector**: The persistent expanded view of one selected item's complete authored rules and current context.
- **Stat Line**: One consistently formatted physical-stat or time change, including name, magnitude, direction, unit, source, and optional condition.
- **Effect Rule**: A player-facing statement connecting an effect's magnitude with its target, cadence, eligibility, and activation condition.
- **Resolved Item State**: Context-specific facts such as effective tier, installation state, storage activity, satisfied synergies, accumulated stacks, and lap contribution; distinct from authored rules.
- **Placement Comparison**: A prospective before-and-after view of the incoming item, destination behavior, and any displaced item.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a representative-item comprehension test, at least 90% of participants correctly identify each item's changed stat, effect direction, activation condition, and target after inspecting it once, without external explanation.
- **SC-002**: At least 90% of participants can choose the intended item from three offers for a stated build goal and correctly explain the decisive tradeoff in under 45 seconds.
- **SC-003**: At least 90% of participants correctly predict the resulting Fitted, Flexible, Improvised, or Stored behavior before committing a placement.
- **SC-004**: For every catalog item, all consequential authored fields are represented accurately in the full inspector, with zero unexplained or contradictory values across preparation, race, and result contexts.
- **SC-005**: For sampled contests containing conditional, stacking, synergy, tiered, and storage-active effects, 100% of displayed resolved values reconcile with the authoritative race evidence.
- **SC-006**: Keyboard-only and touch-only users can inspect and compare every item in every covered screen, with 100% of required information available without hover.
- **SC-007**: At every supported viewport, no consequential item text or interaction target is clipped, overlapped, or made unreachable for the most complex catalog item.
- **SC-008**: In monochrome and reduced-motion review, 100% of consequential states remain distinguishable and no unique information is lost.
- **SC-009**: Existing deterministic contest results and item acquisition, economy, placement, storage, and tier outcomes remain unchanged for identical inputs.

## Assumptions

- Feature 020's 70-item catalog and feature 023's stat-targeted amplification vocabulary are the authoritative content and behavior inputs; this feature presents them but does not redesign or rebalance them.
- The existing four physical stats remain acceleration, top speed, braking power, and cornering speed for this feature.
- The current supported viewport and minimum-text requirements established by the garage and Test Day features remain binding.
- Compact cards use progressive disclosure: they show the facts needed for comparison, while selection opens the complete inspector without navigation away from the current task.
- Existing placement semantics remain authoritative: mouse and touch users may drag and drop, while touch, pointer, and keyboard users may also select an item and then choose a destination. The inspector supports those flows but does not introduce a separate commit action.
- Item-specific final artwork is not required for this slice. A consistent icon and stat language may represent items whose bespoke art is not yet available.
- Broader scene composition, character illustration, track spectacle, menus, and the complete period visual-theme overhaul remain outside this feature except where a local layout adjustment is necessary to make item information readable.
- Authored descriptions remain available, but structured values and labels take precedence for comparison; presentation text is never interpreted to determine simulation behavior.

## Dependencies and Scope Boundaries

- Depends on the finalized item definitions from `020-character-item-pools` and the resolved stat, condition, synergy, tier, installation, and evidence contracts from features 010, 014, 016, 021, 022, and 023.
- Extends feature 008's shared item-description and race-tooltip goals; it does not remove those behaviors.
- Does not add new item mechanics, new catalog entries, new art-production requirements, player-configurable display preferences, localization infrastructure, or simulation/economy changes.
- Does not implement the full `visual-overhaul.md` program; it delivers the item-information portion as one independently playable and testable feature.
