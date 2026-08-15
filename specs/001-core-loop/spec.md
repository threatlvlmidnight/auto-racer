# Feature Specification: Core Loop — Baseline Build vs. Sample Ghost

**Feature Branch**: `001-core-loop`

**Created**: 2026-07-26

**Status**: Implemented — owner browser validation remains open (T015, T019, T023)

**Input**: User description: "Build the smallest complete version of the core game loop: a player views the shared baseline spec car, makes at least one change to it in a prepare phase, then runs that build in a contest phase as a 1v1 race against a fixed sample ghost. After the contest resolves, the player sees a results view with enough data to understand why they won or lost. Team identity, the draft/acquisition system, a ladder, and real player-vs-player ghosts are out of scope for this feature — the goal is only to prove the prepare→contest loop end to end and confirm it's legible."

## Clarifications

### Session 2026-07-26

- Q: Does the contest resolve as a live-paced simulation the player watches happen, or an instant computation shown immediately? → A: Instant computation; results shown immediately. No live-watch requirement in this slice — live/broadcast-style presentation is deferred to a later feature.
- Q: Should the player's attribution of outcome-to-change be an exact numeric breakdown, or qualitative only? → A: Qualitative only — show what changed and how the baseline and modified results compare; no numeric decomposition required in this slice.
- Q: Should this slice allow modifying multiple properties, or exactly one? → A: Exactly one axis of modification, expressed as a single offered item during the prepare phase: the player may accept it (added to their build) or decline it (baseline unchanged). "Modification" in this game is fundamentally a choice, not a property edit.
- Q: How should an exact tie between player and ghost be handled? → A: Ties are a valid, displayed outcome. Following The Bazaar's convention, a tie counts as a win for both sides — not a draw or loss for either.
- Q: Should this slice include a no-penalty retesting mechanic? → A: No — deferred entirely. Build-testing access (Constitution Principle V) will be designed later as part of encounters/events that change the build (e.g., a future "test day"-style encounter), not partially built into this core loop slice. User Story 3 and FR-008 removed from this spec; see `specs/DEFERRED.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose to take an offered item, then race (Priority: P1)

A player starts from the one shared baseline ("spec") car and is offered a single item during a prepare phase. They may accept it (adding it to their build) or decline it (keeping the baseline unchanged), then commit to a contest: a 1v1 race against a fixed sample ghost that resolves with no further input from the player.

**Why this priority**: This is the entire prepare → contest loop in miniature. Without it, there is no game to test — every other story depends on this one existing and working.

**Independent Test**: Can be fully tested by loading the baseline car, choosing to accept or decline the offered item, starting a contest, and confirming the game reaches a resolved result (win, loss, or tie) with no manual intervention required once the contest starts.

**Acceptance Scenarios**:

1. **Given** the player declines the offered item, **When** the player starts a contest against a sample ghost, **Then** the contest resolves on its own and displays a result (win, loss, or tie) with a final time.
2. **Given** the player accepts the offered item, **When** the player starts a contest against a sample ghost, **Then** the result reflects the effect of that item (a different finishing time than declining it, against the same ghost).
3. **Given** a contest has started, **When** it is running, **Then** the player cannot provide any input that alters the outcome.

---

### User Story 2 - Understand the result through transparent data (Priority: P2)

After a contest resolves, the player can see the specific numbers that explain the outcome: their build's result, the ghost's result, the gap between them, and which choice (accepting or declining the offered item) is associated with that result.

**Why this priority**: A win or loss without an explanation is meaningless to a player trying to improve their build. This is the feature's direct expression of the project's transparency commitment.

**Independent Test**: Can be tested by comparing two results — one where the item was declined, one where it was accepted — and confirming the displayed data clearly shows how the two compare.

**Acceptance Scenarios**:

1. **Given** a resolved contest, **When** the player views the result, **Then** they see their final time, the ghost's final time, and the gap between them.
2. **Given** a resolved contest where the player accepted the offered item, **When** the player views the result, **Then** the displayed data shows how that run compares to the baseline (declined) outcome against the same ghost.

---

### Edge Cases

- What happens if the player declines the offered item? (The unmodified baseline is a legitimate build and must produce a normal, valid result.)
- What happens if accepting the item makes the build finish worse than declining it would have? (The result must still resolve normally and remain legible as a loss attributable to that choice.)
- How does the system handle a contest that ends in an exact tie between the player and the ghost? (Counts as a win for both sides — see FR-011.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single shared baseline ("spec") car, identical for every player, as the starting point for this feature.
- **FR-002**: The system MUST offer the player exactly one item during the prepare phase, which they may accept (added to their build) or decline (baseline unchanged), before a contest starts.
- **FR-003**: The system MUST prevent any player input from affecting a contest once it has started.
- **FR-004**: The system MUST resolve a contest as a 1-versus-1 race between the player's build and a sample ghost, ending in a win, loss, or tie.
- **FR-005**: The system MUST NOT require a live opponent or live matchmaking to resolve a contest.
- **FR-006**: The system MUST display, once a contest resolves, the player's final time, the ghost's final time, and the gap between them.
- **FR-007**: The system MUST display enough information for the player to identify which specific change(s) they made are associated with the outcome, using qualitative comparison (e.g., baseline and modified results shown side by side) rather than an exact numeric breakdown of each change's individual contribution.
- **FR-009**: The system MUST NOT include any purchasable content or currency that affects contest outcomes. (Trivially true today since no monetization exists yet — stated explicitly to bound scope.)
- **FR-010**: Contest resolution in this feature MUST be computed and displayed immediately upon start; a live-paced, real-time-watched, or broadcast-style presentation of a contest is explicitly deferred to a later feature.
- **FR-011**: In the event of an exact tie between the player's build and the sample ghost, the system MUST record and display the outcome as a win for both sides, not a draw or loss for either.

### Key Entities

- **Baseline (Spec) Car**: the shared starting point every build derives from; modified only by the single offered item this feature introduces.
- **Build**: the baseline car plus the single offered item, if the player chose to accept it, during the prepare phase.
- **Sample Ghost**: a fixed, non-live recorded opponent used to resolve a contest within this feature's scope.
- **Contest Result**: the output of a resolved contest — final times for both sides, the gap, the outcome, and data attributing that outcome to specific build changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player can complete one full prepare → contest cycle (choose to accept or decline the offered item, run a contest, view a result) without external instruction in under 5 minutes.
- **SC-002**: After viewing a single result screen, a player can correctly state whether they won or lost and name at least one reason contributing to that outcome, without consulting outside help.
- **SC-003**: The same build run against the same sample ghost multiple times produces a consistent, explainable result each time.
- **SC-004**: A modified build and the unmodified baseline build produce measurably different results against the same ghost, confirming the applied change had a detectable effect.

## Assumptions

- This feature intentionally excludes team identity, the draft/acquisition system, multiple simultaneous component categories, a ladder/ranking system, and real player-vs-player ghosts — all deferred to later feature specs.
- "Sample ghost" means a small, fixed, hand-set opponent run shipped with the build for this feature, not another real player's data.
- The specific identity/content of the single offered item (what it is, what it does thematically or mechanically) is not fixed by this spec. Any single illustrative item is sufficient to prove the loop; the real item/component catalog is a later feature's responsibility.
- An exact tie between the player's build and the sample ghost counts as a win for both sides (Bazaar-style tie handling), not a draw or loss for either.
- Build-testing/retesting access (Constitution Principle V) is entirely out of scope for this feature. It will be designed later as part of encounters/events that change the build, not as a bolt-on to this core loop slice.
