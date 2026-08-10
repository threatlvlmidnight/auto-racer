# Feature Specification: Tag-Targeted Synergy Behavior

**Feature Branch**: `014-item-synergy-tags`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Make the existing synergyTags field mechanically real: specific items are authored to care about tags elsewhere in the build — an item might boost other items sharing a tag ('gearing items get +5%'), or an item's own effect might change based on how many matching items are held ('+50% if you're the only Power item'). This extends the existing buff-item pattern (item-012/014/015 today only target the single shared 'performance' identityTag) to also target by synergyTags and installationCategory. Synergy is a per-item authored trait, not a uniform system-wide 'hold N of any tag' rule. Opponent-targeting effects (weakening a rival's items) are explicitly out of scope. Decided direction recorded in specs/skribidi-gap-decisions.md §4 following the Skribidi Skids POC gap analysis; corrected in a follow-up conversation with the owner away from a symmetric-threshold model toward this authored-per-item model. Resolves the open item logged in specs/DEFERRED.md since before 003-item-pool-draft: 'Item synergy / combination effects between held items.'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An item that boosts its own kind (Priority: P1)

A player holds an item authored to boost other items sharing a synergy tag
— for example, an item that reads "boosts gearing items by 5%" — and,
while holding other `gearing`-tagged items, sees those items' own
contributions increase accordingly.

**Why this priority**: This is the direct extension of the buff pattern
that already exists in the game (item-012 already boosts other
`"performance"`-tagged items) — the only new ingredient is targeting a
synergy tag instead of the one shared identity tag. It's the smallest,
most natural first slice.

**Independent Test**: Hold a tag-targeting buff item and at least one
other item sharing its target tag; resolve a contest; confirm the target
item's own contribution reflects the boost, attributable to the buff item
that granted it — the same way an existing `"performance"`-tagged buff
item's effect is attributable today.

**Acceptance Scenarios**:

1. **Given** a held item authored to boost items sharing a specific
   synergy tag, **When** another held item shares that tag, **Then** the
   target item's contribution in the contest result reflects the boost,
   attributed to the source item.
2. **Given** the same buff item, **When** no other held item shares its
   target tag, **Then** no boost is applied anywhere — the buff item's
   own presence is not itself a bonus.
3. **Given** a tag-targeting buff item, **When** its target tag is a
   `synergyTags` value or an `installationCategory` value (Power/Chassis),
   **Then** both targeting kinds work — targeting is not limited to
   `synergyTags` alone.

---

### User Story 2 - An item whose own effect depends on the build around it (Priority: P1)

A player holds an item authored with a self-conditional effect — for
example, "+50 to this item's own effect, and if this is the only Power
item held, an additional +50%" — and sees that item's own contribution
change as they add or remove other matching items from the build.

**Why this priority**: This is the specific richer pattern the owner
named directly (the "lone Power item" example) — a condition on the
item's *own* magnitude based on build composition, not a buff to some
*other* item. Distinct enough from User Story 1 to need its own
validation.

**Independent Test**: Hold a self-conditional item alone (no other item
sharing its condition's target); resolve a contest and confirm the
conditional bonus applies. Add a second item sharing that target; resolve
again and confirm the conditional bonus no longer applies (the condition
is no longer met), while the item's own base effect remains.

**Acceptance Scenarios**:

1. **Given** a self-conditional item held with no other item matching its
   condition's target, **When** the contest resolves, **Then** the
   item's own contribution includes both its unconditional base effect
   and its conditional bonus.
2. **Given** the same item, **When** a second item matching the
   condition's target is also held, **Then** the conditional bonus no
   longer applies, while the item's unconditional base effect is
   unaffected.
3. **Given** a self-conditional item's condition, **When** it is
   inspected in the garage before a contest, **Then** the player can see
   whether the condition is currently met, not just the item's static
   description text.

---

### User Story 3 - See conditional value live, before racing (Priority: P2)

While building, a player can see the live, current value of any held
tag-conditional or self-conditional item's effect — not just its
authored description text — so a build decision is informed by what's
actually true right now, not a guess about what the text implies.

**Why this priority**: Constitution Principle III requires every
outcome-determining value to be inspectable. A conditional effect whose
current state isn't visible until a contest resolves is exactly the kind
of hidden math this project avoids elsewhere.

**Independent Test**: Hold a tag-targeting buff item and a self-conditional
item in the same build; open the garage inspector; confirm both show
their live, currently-applicable value given the rest of the build, not
only their authored base description.

**Acceptance Scenarios**:

1. **Given** a tag-targeting buff item held in a build, **When** the
   player inspects it in the garage, **Then** they see which currently-held
   items (if any) it is boosting and by how much, live.
2. **Given** a self-conditional item, **When** the player inspects it in
   the garage, **Then** they see whether its condition is currently met
   and the resulting effective value, live.

---

### Edge Cases

- What happens when two different tag-targeting buff items both target
  the same third item? Both apply; the target item's contribution
  reflects both boosts, each separately attributable — neither silently
  overwrites the other.
- What happens when a tag-targeting buff item's target tag has zero other
  carriers in the catalog at authoring time? This is an authoring-quality
  concern (don't ship a buff item that can never find a target), not a
  runtime error — the system MUST still behave correctly (simply grant no
  boost) if it occurs.
- What happens to a self-conditional item's condition count if a matching
  item is in storage rather than actively installed? It does NOT count —
  only actively installed items count toward any target, regardless of
  their Fitted/Flexible/Improvised state (FR-005).
- What happens when a tag-targeting buff item would target itself (it
  shares its own target tag)? It MUST NOT boost itself — targeting always
  excludes the source item, matching the existing buff-item exclusion
  rule already in place for identity-tag buffs.
- Opponent-targeting effects (an item that weakens a rival's items) are
  explicitly out of scope for this feature — noted here only so it is not
  mistaken for an oversight; it was a considered and declined idea, not a
  gap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Items MAY be authored with an effect that boosts other held
  items sharing a specific target — extending the existing buff pattern
  (`item.buff`, today limited to matching the single shared `"performance"`
  identity tag) so the target can also be a specific `synergyTags` value
  or a specific `installationCategory` (Power/Chassis).
- **FR-002**: Items MAY be authored with a self-conditional effect: the
  item's own contribution changes based on the count of other held items
  matching a specified target (a `synergyTags` value or
  `installationCategory`) — for example, a bonus that applies only when
  the item is the sole holder of its category.
- **FR-003**: The existing count-scaling buff pattern (linear:
  `boostPercent × matching count`, per `007-count-synergy-buff`) MUST
  remain authorable against a `synergyTags`/`installationCategory` target,
  not only the identity tag.
- **FR-004**: An exact-count condition (e.g. "only if exactly 1 matching
  item is held") MUST be authorable as an alternative to linear scaling —
  tag-conditional effects are not limited to "more is better."
- **FR-005**: Counting toward a tag/category target counts only actively
  installed items (on the vehicle's active slots) — a stored item does
  NOT count, regardless of how many other items share its target. This is
  a deliberate divergence from `007-count-synergy-buff`'s existing
  precedent (which does count storage) — synergy targeting is a distinct,
  newer mechanic with its own rule. Installation state among active items
  (Fitted, Flexible, or Improvised) does NOT affect whether an active item
  counts — only whether it's actively installed at all matters, never how
  well it fits its slot. Applied consistently to both Boost-Others and
  Self-Conditional effects.
- **FR-006**: A tag-targeting or self-conditional effect's source item
  MUST NOT count toward its own target — the exclusion rule already
  applied to today's identity-tag buffs extends unchanged to
  tag/category targets.
- **FR-007**: Every value produced by a tag-targeting or self-conditional
  effect MUST remain independently attributable in post-race inspection —
  a player MUST be able to see which specific item and which specific
  condition produced which specific value (Constitution Principle III).
- **FR-008**: Existing buff items (identity-tag-targeted) MUST continue
  working unchanged — this feature extends the targeting vocabulary
  additively; it is not a breaking change to already-authored content.
- **FR-009**: The garage MUST show, for any held item with a tag/category-
  targeting or self-conditional effect, its live current value given the
  rest of the current build — not only its static authored description —
  updating immediately as items are added, moved, or removed.
- **FR-010**: This feature MUST NOT introduce any effect that reads or
  modifies another car's build. Every effect is scoped to the player's
  own single build, matching every other simulation rule in the game
  today. Opponent-targeting effects are explicitly out of scope.
- **FR-011**: Tag/category targeting and conditional-effect authoring
  MUST NOT vary by player entrant or by any purchasable content or
  currency (Constitution Principle II, Fairness).

### Key Entities

- **Synergy Target**: What a tag-targeting or self-conditional effect
  matches against — either a specific `synergyTags` value already
  authored on items, or a specific `installationCategory`
  (Power/Chassis). Distinct from today's single hardcoded identity-tag
  target.
- **Boost-Others Effect**: An item's authored effect that increases other
  held items' own contributions when they match its Synergy Target —
  extends today's `item.buff` shape to a broader set of possible targets.
- **Self-Conditional Effect**: An item's authored effect that modifies its
  *own* contribution based on the count of other held items matching a
  Synergy Target — a new authored-behavior shape distinct from
  Fitted/Improvised (which key off slot-type match) and from Boost-Others
  (which affects a different item).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A held Boost-Others item's target boost is applied to every
  currently-held item matching its Synergy Target, and to no item that
  doesn't match, with zero exceptions across a sample of resolved
  contests.
- **SC-002**: A held Self-Conditional item's condition is evaluated
  correctly (applies when met, does not apply when not met) across every
  tested build composition, with zero exceptions.
- **SC-003**: In post-race inspection, 100% of Boost-Others and
  Self-Conditional values are attributable to the specific item and
  condition that produced them.
- **SC-004**: The garage shows the live, current value of every held
  Boost-Others or Self-Conditional item's effect before any contest is
  resolved, for 100% of such items in the build.
- **SC-005**: Zero existing buff items (identity-tag-targeted) change
  behavior as a result of this feature shipping.

## Assumptions

- No new items are required by this feature; it extends the authoring
  vocabulary available for items. A small number of new example items
  demonstrating Boost-Others and Self-Conditional effects may be authored
  to prove the mechanism, but retrofitting all 20 existing items to use
  the new targeting vocabulary is not required.
- The 14 `synergyTags` values already authored across the item pool
  (`gearing`, `momentum`, `material`, `information`, `control`,
  `traction`, `lightweight`, `heat`, `suspension`, `pressure`, `airflow`,
  `wheel`, `crowd`, `cargo`) are the available target vocabulary; this
  feature adds no new tags. A target tag with very few carriers is an
  authoring-quality judgment call for whichever item references it, not
  a system-level restriction this spec enforces.
- Opponent-targeting effects are out of scope, per explicit owner
  direction — not deferred as a near-term follow-up, just not part of
  this project's near-term plans. If revisited later, it would need its
  own architecture pass given every current simulation function operates
  on one build at a time.
- The garage surface this feature extends is `010-entrant-vehicle-garage`'s
  existing inspector/presentation pattern (`garagePresentation.ts`,
  `garageItemInspector`) — this feature adds live conditional-value
  display alongside it, not a new competing UI paradigm.
- This feature does not touch origin weighting, vehicle topology, or
  installation (Fitted/Flexible/Improvised) rules — Synergy Targets are a
  new, independent axis layered on top of the existing buff mechanism.
