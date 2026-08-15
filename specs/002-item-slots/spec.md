# Feature Specification: Item Slots — Flat Cap with Evict-to-Add

**Feature Branch**: `002-item-slots`

**Created**: 2026-07-26

**Status**: Implementation complete

**Input**: User description: "Introduce generic item slots with a flat per-team cap and evict-to-add: every team has the same number of slots regardless of identity; when offered a new item while full, the player must evict an existing item or decline. Identity expresses through which items a team is offered (draft tag-weighting), not through slot count or named capacity pools."

## Clarifications

### Session 2026-07-26

- Q: How many illustrative items should the offered pool contain, and should their effects be genuinely different from each other? → A: A small set of 4-5 items with genuinely different effects/magnitudes, reusing `001-core-loop`'s existing "Placeholder Upgrade" as one of them for continuity — not a retired/replaced pool, and not a set small or uniform enough that eviction choices in User Story 2 risk feeling arbitrary.
- Q: How many prepare-phase rounds/offers make up a run in this feature? → A: This question exposed that no run/encounter structure exists yet to answer it from — see `specs/vision.md` ("Run structure / encounter system"), now tracked as its own future feature rather than solved here. For **this feature only**, use a simple placeholder: a fixed sequence of 5 single-item offers (slot cap + 2), explicitly not a design decision about how offers will really be generated long-term. See Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fill available slots (Priority: P1)

Across multiple prepare-phase rounds, the player is offered one item per round and can accept it into an open slot, up to a flat cap that is identical for every team.

**Why this priority**: This is the baseline capacity mechanic. Without it, there is no multi-item build at all — every other story depends on a build being able to hold more than one item.

**Independent Test**: Offer as many items in sequence as the flat cap allows, accepting each one, and confirm all of them end up held in the build with no eviction ever required.

**Acceptance Scenarios**:

1. **Given** an empty build, **When** the player is offered an item and accepts it, **Then** the item occupies one of the flat slots.
2. **Given** a build with fewer items held than the flat cap, **When** the player is offered a new item and accepts it, **Then** the item is added without requiring an eviction.
3. **Given** a build with fewer items held than the flat cap, **When** the player is offered a new item and declines it, **Then** the build is unchanged and the next round proceeds.

---

### User Story 2 - Evict to make room (Priority: P1)

Once all slots are full, accepting a new item requires the player to give up one currently-held item.

**Why this priority**: This is the actual "can't have it all" decision the constraint system exists to create. Without it, this feature is just "collect up to N items" — a checklist, not a choice. It ties for P1 with User Story 1 because a slot system with no eviction pressure doesn't yet deliver the thing it was designed for.

**Independent Test**: Fill every slot, then offer one more item. Accepting it must force a choice of which held item to remove; declining must leave the build unchanged.

**Acceptance Scenarios**:

1. **Given** a build with every flat slot occupied, **When** the player is offered a new item and chooses to accept it, **Then** the player must select one currently-held item to evict, and the new item takes its place.
2. **Given** a build with every flat slot occupied, **When** the player is offered a new item and declines it, **Then** the build is unchanged and no eviction occurs.
3. **Given** a full build, **When** the player is asked to choose an item to evict, **Then** they may choose any currently-held item — no item is protected or locked from eviction in this feature.

---

### User Story 3 - Build state is legible at a glance (Priority: P2)

At any point during the prepare phase, the player can see exactly which items are currently held and how many slots remain open.

**Why this priority**: Every design perspective consulted while deciding this constraint system insisted the whole approach only stays fair and legible if slot state is plainly visible, never inferred. This is also a direct expression of Constitution Principle III (Transparency & Legibility) and lays the groundwork for Principle IV (Spectation-First) once a build's state is shown to anyone besides its owner.

**Independent Test**: At any point during the prepare phase, confirm the currently-held items and remaining open slots are displayed as plain, readable state.

**Acceptance Scenarios**:

1. **Given** any point during the prepare phase, **When** the player views their build, **Then** they see every currently-held item and the number of open slots remaining, displayed plainly — not something they have to infer from behavior.

---

### Edge Cases

- What happens if the player is offered an item identical to one they already hold? (Treated as a distinct, separate copy for this feature — item-uniqueness rules are a later concern, not solved here. See Assumptions.)
- What happens on the very first offer of a run, when the build is empty? (Trivial accept case under User Story 1 — no eviction is possible or required.)
- What happens if a run has fewer prepare-phase rounds than the flat slot cap? (The build legitimately ends with fewer than the cap's worth of items — not an error. Nothing in this feature forces a player to fill every slot; declining every offer, leaving an empty build, is also a legitimate end state.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a flat number of generic item slots (illustrative default: 3), identical for every team regardless of identity.
- **FR-002**: The system MUST allow the player to accept an offered item directly into an open slot whenever fewer than the flat cap are currently occupied.
- **FR-003**: When all slots are occupied, the system MUST require the player to choose one currently-held item to evict before a newly accepted item takes its place.
- **FR-004**: The system MUST allow the player to decline any offered item, at any slot-fill state, leaving the current build unchanged.
- **FR-005**: The system MUST NOT protect, lock, or exempt any currently-held item from being chosen for eviction — no item is un-evictable in this feature.
- **FR-006**: The system MUST display the full current build (every held item) and the number of open slots remaining, at any point during the prepare phase.
- **FR-007**: The system MUST NOT vary the flat slot cap by team identity or any other player-facing factor in this feature — identity-weighted drafting is a separate, later feature (see Assumptions).
- **FR-008**: The system MUST extend the contest-resolution simulation built in `001-core-loop` to resolve a build holding 0 to N items, not only the single-item accept/decline case that feature shipped with.

### Key Entities

- **Item Slot Capacity**: a flat constant, identical for every team (illustrative default: 3).
- **Build**: now a list of 0 to N held items (superseding `001-core-loop`'s single optional item plus boolean), still derived from the same shared baseline spec car.
- **Offered Item Pool**: expands beyond `001-core-loop`'s single illustrative item to 4-5 illustrative items with genuinely different effects/magnitudes (Clarification), including that original item — still placeholder content, not the real catalog (see Assumptions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can reach a full build (all N slots occupied) through a sequence of accept decisions without ever hitting an error or an undefined state.
- **SC-002**: When offered an item while full, a player is always presented with an explicit choice (evict-and-accept vs. decline) and can never lose a held item without directly choosing to evict it.
- **SC-003**: At any point, a player can correctly enumerate every currently-held item and the remaining open slots without needing to ask or infer.
- **SC-004**: Two builds that end up holding the same final set of items — regardless of the order items were accepted or evicted along the way — produce identical contest results against the same ghost. The outcome is a function of the final build, not its history.

## Assumptions

- The illustrative slot cap for this feature is 3 — the number that survived every round of the design conversation that produced this spec — but the real balance number is not locked here and may change later.
- The illustrative item catalog stays small (4-5 items, Clarification) and placeholder. Theme and real item content remain undecided (constitution `TODO(THEME)`, carried over from `001-core-loop`'s own assumptions) — this feature is about the constraint mechanic, not real content.
- Identity-weighted drafting (which items a team is more likely to be offered, based on team identity) is explicitly **out of scope** here. This feature only needs multiple illustrative items to offer; team selection and identity-tag weighting is a separate, later feature (see `specs/vision.md`).
- Item synergy (items that interact with or react to each other) is out of scope, per `specs/DEFERRED.md`.
- Holding duplicate copies of the same item is permitted by default in this feature, unless a later feature introduces uniqueness rules.
- This feature uses a fixed, placeholder sequence of 5 single-item offers per run (slot cap + 2) purely to exercise the slot/eviction mechanic (Clarification). This is **not** a decision about how offers are really generated — the real run/encounter structure (how many encounters, what types, shops vs. rewards vs. contests, and the resulting two-layer choice of where to look and what to pick) is deliberately out of scope here and tracked as its own future feature in `specs/vision.md`.
