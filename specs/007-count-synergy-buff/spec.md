# Feature Specification: Count-Synergy Buff — A Third Buff Kind

**Feature Branch**: `007-count-synergy-buff`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "A third buff kind: count-synergy items boost matching-tag items based on how many are currently held across board and storage combined (active or inert), rather than a fixed constant or time-accumulated stacking value."

## Clarifications

### Session 2026-07-26

- Q: What kind of synergy should this feature add — specific item-to-item pairing, threshold/count synergy, or both? → A: Threshold/count synergy. An effect scales with how many matching-tag items are held, extending the existing tag concept (`003-item-pool-draft`) rather than introducing item-to-item pairing (the original, more ambitious idea logged in `specs/DEFERRED.md`, which remains available for a future feature).
- Design decisions made without a further question, each a reasonable default given established precedent (see Assumptions for full reasoning): the count includes matching items in storage even if not flagged active-while-stored (the item being *counted* need not be active; the counting buff itself still must be); the counting buff has no cooldown (always potentially active, like a flat buff); the count considers only direct items, not other buffs, matching `003-item-pool-draft`'s existing buff-to-direct-item convention; no artificial cap, since the board/storage container's own finite capacity already bounds it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A buff's boost scales with how many matching items are held (Priority: P1)

A new kind of buff item — a **count-synergy buff** — boosts every other active item sharing its identity tag by an amount proportional to how many *other* items of that same tag are currently held anywhere in the build (board or storage, regardless of whether a stored one is individually active-while-stored). Holding more of the matching tag makes this buff stronger; holding none makes it inert.

**Why this priority**: This is the actual point of the feature — a third way an item's power can be expressed, distinct from the existing flat (always-on constant) and stacking (grows over time) buff kinds (`005-lap-tick-simulation`), and the first mechanism where board/storage *composition* itself (not just what's active) directly drives outcome.

**Independent Test**: Assemble a build holding a count-synergy buff and a known number of other matching-tag direct items (mixed across board and storage); confirm the buff's applied boost equals its per-item rate multiplied by that count, and confirm it drops to zero effect when no matching items are held.

**Acceptance Scenarios**:

1. **Given** a held count-synergy buff and N other direct items sharing its identity tag, held anywhere across board and storage, **When** the contest resolves, **Then** the buff's applied boost equals its per-item rate × N.
2. **Given** a held count-synergy buff and zero other items sharing its tag anywhere in the build, **When** the contest resolves, **Then** the buff has no effect — a legitimate, inert outcome, not an error.
3. **Given** a matching-tag direct item held only in storage and not flagged active-while-stored (so it contributes nothing to the race itself), **When** counting toward a count-synergy buff's total, **Then** it still counts — the count considers everything held, not just what's currently active.
4. **Given** the count-synergy buff itself is inactive (in storage, not active-while-stored), **When** the contest resolves, **Then** it applies no boost at all, regardless of how many matching items are held — the buff must itself be active to apply anything, even though what it counts is broader.
5. **Given** a count-synergy buff and a flat or stacking buff sharing the same target tag, **When** both are active, **Then** their contributions sum together onto matching items, per the existing additive-stacking rule (`003-item-pool-draft`).

---

### User Story 2 - The displayed effect reflects the real mechanism, not a flat number (Priority: P2)

Wherever an item's effect is already shown (prepare-phase display, result screen, in-race indicators), a count-synergy buff's description reflects its actual per-item rate — not a single flat percentage that would misrepresent how it works.

**Why this priority**: This is a direct expression of Constitution Principle III (Transparency & Legibility) — showing "+3%" for an item whose real effect depends on board/storage composition would be actively misleading, not just incomplete. P2 because the mechanism (User Story 1) can be built and correctness-tested before its description is polished.

**Independent Test**: View a count-synergy item's effect description anywhere it's currently shown; confirm it communicates the per-item rate (and, where already displayed per-item, its currently-applicable computed value) rather than a bare percentage that looks like a flat buff's.

**Acceptance Scenarios**:

1. **Given** a count-synergy item, **When** its effect is displayed anywhere items are already described, **Then** the description states its per-item rate in a way that doesn't read as a fixed, flat percentage.

---

### Edge Cases

- What happens with duplicate copies of the same matching-tag item? (Each held copy counts individually toward the total — two copies count as two.)
- What happens if the only matching items are all in storage and none are active-while-stored? (They still count, per User Story 1 Acceptance Scenario 3 — the count-synergy buff can be powered entirely by inert stored items, even though those items themselves aren't contributing to the race.)
- What happens if a count-synergy buff and another count-synergy buff share the same tag? (Same as any other same-tag buff pairing — their contributions sum, per Acceptance Scenario 5.)
- What happens if someone tries to combine count-scaling with a cooldown (a "stacking count buff")? (Out of scope for this feature — see Assumptions. A count-synergy buff always has no cooldown.)
- What happens to the buff's own eligibility if it's a direct item's target but the buff has no identity tag itself? (Not applicable — a buff without an identity tag has no tag to match against and cannot be a count-synergy buff; this is a content-authoring constraint, not a runtime state to handle.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The item data model MUST support flagging a buff as count-synergy, distinct from the existing flat and stacking kinds (`005-lap-tick-simulation`).
- **FR-002**: A count-synergy buff MUST have no cooldown — it is always potentially active, like a flat buff. Combining count-scaling with a stacking cooldown is out of scope for this feature.
- **FR-003**: A count-synergy buff's applied boost MUST equal its per-item rate multiplied by the count of *other* held direct items sharing its identity tag.
- **FR-004**: That count MUST include qualifying items anywhere in the build — board or storage — regardless of whether a storage item is individually flagged active-while-stored.
- **FR-005**: A count-synergy buff MUST itself be active (on the board, or in storage and flagged active-while-stored) to apply its boost at all — an inactive count-synergy buff contributes nothing, regardless of what it would otherwise count.
- **FR-006**: When the qualifying count is zero, a count-synergy buff MUST be inert — a valid, non-error state.
- **FR-007**: A count-synergy buff's contribution MUST sum additively with any other buff (flat, stacking, or count-synergy) sharing the same target tag, per the existing stacking rule (`003-item-pool-draft`).
- **FR-008**: The item pool MUST include at least one count-synergy item, so the mechanism is demonstrated, not just declared possible.
- **FR-009**: The system MUST display a count-synergy item's effect in terms that reflect its actual per-item mechanism, wherever item effects are already shown — not a flat percentage that would misrepresent it.
- **FR-010**: This feature MUST NOT change the board/storage capacity, eviction, draft-weighting, lap-tick, or existing flat/stacking buff mechanics already established (`002-item-slots` through `006-race-visualizer`) — it only adds one new way a buff's magnitude can be computed.

### Key Entities

- **Count-Synergy Buff** (a third kind of buff item, alongside `005-lap-tick-simulation`'s Flat and Stacking Buff Items): carries a per-item rate instead of a flat or time-accumulated value; its applied boost is that rate multiplied by how many other matching-tag direct items are held anywhere in the build.
- **Qualifying Count**: the number of other held direct items (board or storage, active or inert) sharing a count-synergy buff's identity tag — the input driving its applied boost.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A build holding a count-synergy buff and exactly N other matching-tag direct items produces a boost equal to exactly the buff's per-item rate × N, for several different values of N.
- **SC-002**: A build holding a count-synergy buff and zero matching-tag direct items produces no boost from it at all.
- **SC-003**: A matching-tag item held only in inert storage (not active-while-stored) still counts toward a count-synergy buff's total — verified by comparing a build with that item present-but-inert against an otherwise-identical build where it's absent entirely, and confirming the two produce different outcomes.
- **SC-004**: Wherever a count-synergy item's effect is displayed, its description communicates the per-item rate rather than presenting as an ordinary flat percentage.

## Assumptions

- Reuses the existing single "performance" identity tag (`003-item-pool-draft`); no new tag dimension is introduced. Once additional team identities exist (`specs/vision.md`, still undesigned), this mechanism should extend to them without further rework, since it's tag-driven, not hardcoded to "performance" specifically.
- Count-synergy buffs are always flat-shaped (no cooldown) in this feature. Combining count-scaling with a stacking/cooldown-gated buff is explicitly out of scope — a possible future extension, not solved here.
- The qualifying count considers only *direct* items (not other buff items), matching `003-item-pool-draft`'s existing convention that buffs act on direct items, not on each other.
- No artificial cap is placed on the count — the board/storage container's own finite capacity (`SLOT_CAPACITY` + `STORAGE_CAPACITY`) already bounds how large it can practically get.
- The exact per-item rate, and whether the pool's one illustrative example is a new item or a converted existing one, are content decisions for planning — this spec only requires the mechanism exist and be demonstrated by at least one real item.
- This feature reuses `006-race-visualizer`'s existing `contribution`-based callout/breakdown pipeline without modification — a count-synergy buff's contribution is just another number flowing through the same existing data path flat and stacking buffs already use; no new UI feature or display surface is required.
- This is a simulation-and-content feature, not a UI feature — it does not touch board/storage drag-and-drop (`004-board-storage-ui`), the lap-tick loop's architecture (`005-lap-tick-simulation`), or the race visualizer's rendering (`006-race-visualizer`) beyond the description text produced for an item's effect.
- The original, more ambitious "specific item-to-item pairing" idea (`specs/DEFERRED.md`'s original example: "a tyre that's better paired with an engine item") remains explicitly deferred, not resolved by this feature — tracked separately for whenever that direction is picked up.
