# Feature Specification: Duplicate Item Tiering

**Feature Branch**: `016-duplicate-item-tiering`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Duplicate-item tiering: acquiring a second or third copy of a held item upgrades its tier (up to three stars) instead of occupying another slot, with each tier adding a flat percentage bonus to the item's own effect; a copy acquired while already at max tier auto-converts to credits via the existing sell-back math. Decided direction recorded in specs/skribidi-gap-decisions.md §5 following the Skribidi Skids POC gap analysis, resolving the open 'Duplicate-item rules' item in specs/DEFERRED.md."

## Clarifications

### Session 2026-08-09

- Q: If a player already holds an item at ★2 or ★3, should the offer
  itself (a Parts Supplier stock entry, a Reward Draft option) show what
  buying/accepting it will actually result in — a tier upgrade or a
  credit conversion — before they confirm, or is that only revealed
  after? → A: Shown before committing — the offer is labeled with its
  real outcome ahead of time (e.g. "Buy → upgrades to ★3" or, at max
  tier, "Buy → sells for N credits instead"), so the player never
  confirms an action blind to what it does.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A second copy upgrades what you already have (Priority: P1)

A player who acquires an item they already hold — on the board or in
storage — doesn't get a second, separate copy taking up a slot; the
item they already have gets stronger instead.

**Why this priority**: This is the headline behavior the feature exists
to introduce. Today acquiring a duplicate either wastes a slot on a
second copy of something already owned, or (if slots are full) the
acquisition can't be placed at all. Without this, "acquire an item
already held" has no distinct, valuable outcome.

**Independent Test**: Hold an item, then acquire another copy of that
same item; confirm no new position is occupied and the held copy's tier
increases by exactly one, up to a maximum of ★3.

**Acceptance Scenarios**:

1. **Given** a held item at ★1 (on the board or in storage), **When**
   the player acquires another copy of that same item, **Then** the
   held copy becomes ★2, no new board slot or storage position is used,
   and the acquisition is otherwise resolved exactly as it already is
   today (credits spent for a purchase, offer consumed for a reward).
2. **Given** a held item at ★1 or ★2, **When** the player is offered
   another copy of it (before committing to acquire it), **Then** the
   offer itself shows that acquiring it will upgrade it to the next
   tier, not just present a generic "buy"/"accept" action.
3. **Given** a held item at ★2, **When** the player acquires another
   copy, **Then** it becomes ★3.
4. **Given** an item not currently held anywhere, **When** the player
   acquires it, **Then** it is placed as a new ★1 held item exactly as
   acquisition already works today — tiering never changes the
   first-copy acquisition flow.
5. **Given** a held item, **When** the player sells it (per
   `015-economy-depth`), **Then** its tier is gone along with it — a
   later re-acquired copy of the same item starts fresh at ★1, not at
   whatever tier the sold copy had reached.

---

### User Story 2 - A higher tier is measurably stronger (Priority: P1)

A player who has tiered an item up can tell, and benefit from, it being
stronger than the same item at ★1 — both by inspecting it beforehand and
by how it performs in a race.

**Why this priority**: Without a real mechanical payoff, tiering is a
cosmetic label with no reason to pursue duplicates over other choices.
This is what makes User Story 1's mechanic actually matter.

**Independent Test**: Compare an item's contribution in a resolved
contest at ★1 versus the same item at ★3 (all else equal); confirm the
★3 version contributes measurably more, and confirm the garage inspector
shows the live tiered value before the race happens.

**Acceptance Scenarios**:

1. **Given** an item's authored effect (its own `timeModifier` or
   `buff`), **When** its tier increases, **Then** its own effect is
   boosted by a fixed percentage per tier above ★1 — ★1 is the
   unmodified authored value, ★2 and ★3 are progressively stronger.
2. **Given** a tiered item, **When** the player inspects it in the
   garage, **Then** its current tier and its current effective value
   (base effect plus tier bonus) are both visible before any contest
   resolves.
3. **Given** a tiered item also affected by installation behavior
   (`010-entrant-vehicle-garage`) or a synergy effect
   (`014-item-synergy-tags`), **When** a contest resolves, **Then** the
   tier bonus, installation delta, and synergy delta all apply together
   — none silently overrides or excludes another.

---

### User Story 3 - A copy at max tier isn't wasted (Priority: P2)

A player who acquires yet another copy of an item already at ★3 (the
tiering ceiling) still gets something for it, instead of the acquisition
being blocked or the copy simply vanishing.

**Why this priority**: A real but smaller edge case — it only matters
once a player has already tiered something all the way up, which takes
two prior duplicate acquisitions of the same item.

**Independent Test**: Hold an item already at ★3, then acquire another
copy of it; confirm the acquisition converts to credits instead of being
blocked, silently discarded, or creating a fourth tier.

**Acceptance Scenarios**:

1. **Given** a held item at ★3, **When** the player acquires another
   copy of that same item, **Then** the acquisition converts to credits
   equal to half the item's authored price (the same calculation
   `015-economy-depth`'s sell-back uses), recorded as its own
   attributable transaction, and the held item remains at ★3 — no
   fourth tier exists.
2. **Given** this conversion, **When** the player reviews their credit
   history, **Then** the conversion is distinguishable from a deliberate
   player-initiated sale — it is system-triggered, not a sell action the
   player chose.
3. **Given** a held item at ★3, **When** the player is offered another
   copy of it (before committing to acquire it), **Then** the offer
   itself shows the exact credit amount it will convert to, not a
   generic "buy"/"accept" action that turns out to do something else.

---

### Edge Cases

- What happens if a player already holds a copy of an item in both
  active install and storage simultaneously? Duplicate detection MUST
  NOT allow this to happen in the first place — with only one physical
  identity per acquisition and tiering (not a second copy) as the
  outcome of every subsequent acquisition, a given item's `id` can only
  ever occupy one held position (board slot or storage index) at a time
  for the entire life of that held instance.
- What happens to a duplicate acquired within the same Parts Supplier
  encounter as the item's first copy (e.g., two stock entries offering
  the same item)? Each acquisition is resolved independently and in
  order — buying the first places a new ★1 item; buying the second
  (still within the same encounter) upgrades it to ★2 exactly as it
  would across separate encounters.
- What happens to tier when an item moves between the board and storage
  (a garage rearrangement, not an acquisition)? Tier travels with the
  held item — moving it between a vehicle slot and storage is not an
  acquisition event and never changes its tier.
- What happens if the item pool itself contains fewer than three
  eligible acquisition opportunities for a given item across a run? Nothing special — most items may never reach ★3 in a given run; this
  feature does not guarantee reachability, only defines what happens
  when a duplicate is acquired.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST track a tier (★1, ★2, or ★3) on every
  held item instance (active board or storage), starting at ★1 when
  first acquired.
- **FR-002**: When the player acquires an item whose identity matches an
  item already held (on the board or in storage) at ★1 or ★2, the system
  MUST increase that held item's tier by exactly one instead of creating
  a second held instance — the acquisition MUST NOT occupy a new board
  slot or storage position.
- **FR-003**: When the player acquires an item whose identity matches a
  held item already at ★3, the system MUST convert that acquisition into
  credits equal to half the item's authored price (the same calculation
  `015-economy-depth`'s sell-back uses) instead of creating a fourth
  tier, a second held instance, or discarding it with no compensation.
- **FR-004**: Tier MUST modify only the item's own authored effect (its
  `timeModifier` and/or `buff`) by a fixed percentage per tier above its
  ★1 (unmodified) value — the exact percentage is a balance/tuning
  decision, not fixed by this specification (see Assumptions).
- **FR-005**: A held item's current tier and its current effective value
  (base effect plus tier bonus) MUST be visible wherever that item is
  already inspectable today — the player is never left inferring tier
  from behavior alone (Constitution Principle III).
- **FR-006**: A tier bonus MUST compose with any active installation
  behavior (`010-entrant-vehicle-garage`) and any active synergy effect
  (`014-item-synergy-tags`) on the same item — none of the three may
  silently override or exclude another.
- **FR-007**: Every credit change produced by max-tier auto-conversion
  (FR-003) MUST be recorded as its own attributable transaction,
  distinguishable from a player-initiated sale (Constitution Principle
  III).
- **FR-008**: Selling a held item (`015-economy-depth`) MUST continue to
  pay out based on the item's authored price only — tier does not change
  sell-back value.
- **FR-009**: Tiering rules (duplicate detection, tier bonus, max-tier
  conversion) MUST NOT vary by player entrant, vehicle, or any
  purchasable content (Constitution Principle II, Fairness).
- **FR-010**: Duplicate detection MUST apply uniformly to every
  acquisition path that can grant a held item today (Parts Supplier
  purchase, Reward Draft acceptance) — no acquisition path is exempt.
- **FR-011**: Every offer of an item the player already holds (a Parts
  Supplier stock entry, a Reward Draft option) MUST show its actual
  resolution — a tier upgrade to a specific tier, or a credit conversion
  and its exact amount — before the player commits to acquiring it,
  never only after (Constitution Principle III, Clarifications Session
  2026-08-09).

### Key Entities

- **Item Tier**: A new per-held-instance attribute (not a property of
  the static item catalog) with value ★1, ★2, or ★3, starting at ★1 and
  never decreasing except by the held item leaving the build entirely
  (sale, or a future removal mechanic).
- **Tier Bonus**: The fixed percentage-per-tier increase applied to a
  held item's own authored effect, layered alongside (not replacing)
  installation and synergy deltas.
- **Duplicate-Acquisition Resolution**: The outcome of an acquisition
  whose item identity matches an already-held item — either a tier
  increase (FR-002) or a credit conversion (FR-003) — replacing what
  would otherwise be a new held instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Acquiring a duplicate of a held item below ★3 never
  occupies a new board slot or storage position, in 100% of cases.
- **SC-002**: A ★3 item's own contribution to a resolved contest is
  measurably greater than the same item at ★1, with zero exceptions.
- **SC-003**: A duplicate acquired while the matching held item is
  already at ★3 always converts to credits — zero cases of a blocked
  acquisition, a silently discarded copy, or a fourth tier.
- **SC-004**: A held item's tier is visible at every point the item
  itself is already shown, with zero states requiring the player to
  infer it; every offer of an item already held shows its real
  acquisition outcome before the player commits, with zero cases of a
  surprise tier upgrade or credit conversion discovered only afterward.
- **SC-005**: Every credit change introduced by this feature (max-tier
  conversion) is attributable to a specific, inspectable transaction
  record — zero silent credit changes.

## Assumptions

- The exact tier-bonus percentage (e.g., "+25% per tier") is a
  balance/tuning decision for planning and content authoring, not fixed
  by this specification — matching how `015-economy-depth` already
  treats its own reputation/interest constants as a separate balance
  pass.
- Sell-back value (`015-economy-depth` FR-009) is unchanged by this
  feature — it continues to pay out half of the item's authored price
  regardless of tier, keeping that formula's meaning stable rather than
  introducing a second, tier-aware price concept.
- Tier is state on the held item instance, not the shared `ItemDefinition`
  catalog entry — two different players' or two different runs' copies
  of "the same item" never share tier state.
- This feature does not introduce any way to intentionally downgrade or
  reset a tier short of selling the item entirely.
- This feature does not change how items are offered (Parts Supplier
  stock generation, Reward Draft weighting) — an item already held can
  still be offered again today, and this feature only changes what
  happens when the player acts on that offer.
