# Feature Specification: Season Structure Growth

**Feature Branch**: `017-season-structure-grow`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Season structure: grow the run schedule from today's fixed 6 stages (4 choice + 2 PvP) to 12 stages (8 choice + 4 PvP), keeping the existing 2:1 choice-to-PvP ratio and ending the season on a PvP stage, using only the three existing non-PvP encounter types. Widens RunStage's choiceOrdinal/pvpOrdinal/lapCount types so every mechanism that already reads PvP ordinal (012-multi-ghost-contest rival scaling, sponsor next-PvP-stage targeting, 013-race-spectacle deterministic track selection) continues to work correctly across all four PvP stages without its own redesign. Does not introduce any new encounter type (Rival Scouting/Scrutineering/Factory Development/Privateer Exchange remain future work) and does not touch event-type variety. Decided direction recorded in specs/skribidi-gap-decisions.md §7."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A season is long enough to feel like a season (Priority: P1)

A player experiences a run that lasts noticeably longer than today's
6-stage sprint — more choice stages to build a strategy across, more
scheduled races to prove it against, and a season that climaxes in a
race rather than trailing off at a shop visit.

**Why this priority**: This is the headline mechanic the whole gap
analysis's "add more depth" feedback pointed at. Every economy,
synergy, and tiering system planned this session (014-016) becomes more
meaningful the longer a single run runs — this is what actually
delivers that runway.

**Independent Test**: Play a run from start to finish; confirm it visits
12 stages total, arranged as four repeating groups of two choice stages
followed by one PvP stage, and confirm the final (12th) stage is a PvP
stage, not a choice stage.

**Acceptance Scenarios**:

1. **Given** a newly created run, **When** the player inspects its
   stage schedule, **Then** it contains exactly 12 stages: choice,
   choice, PvP, choice, choice, PvP, choice, choice, PvP, choice,
   choice, PvP — the same repeating pattern today's 6-stage run already
   uses, now repeated four times instead of two.
2. **Given** a run in progress, **When** the player completes every
   stage in order, **Then** the run reaches `"completed"` only after the
   12th stage (the fourth PvP stage) resolves — never earlier.
3. **Given** a choice stage at any position in the 12-stage schedule,
   **When** the player is offered encounter choices, **Then** the
   offered types are drawn from the same three non-PvP encounter types
   available today (Parts Supplier, Reward Draft, Sponsor Meeting) — no
   new encounter type is offered anywhere in the schedule.

---

### User Story 2 - Everything that already reads PvP position keeps working (Priority: P1)

A player's run correctly scales rival difficulty, resolves
"win-next-race"/"target-race-time" sponsor objectives, and (once
`013-race-spectacle` ships) selects a race track at every one of the
four scheduled PvP stages — not just the first two positions those
systems were originally built against.

**Why this priority**: Three other planned features
(`012-multi-ghost-contest`, `013-race-spectacle`, and the existing
sponsor-objective logic in `009-run-progression`) already read a PvP
stage's ordinal position to decide something. If this feature only
widens the schedule without confirming those readers still resolve
correctly past ordinal 2, it silently breaks planned work rather than
extending it.

**Independent Test**: Resolve a PvP contest at each of the four
scheduled PvP stages in a single run; confirm rival difficulty scaling,
sponsor objective resolution, and track selection (once its owning
feature ships) all produce a defined, correct result at every one of the
four ordinals — not just the first two.

**Acceptance Scenarios**:

1. **Given** a scheduled PvP stage at any of the four ordinals,
   **When** `012-multi-ghost-contest`'s rival-profile resolution runs
   against it, **Then** it resolves a valid rival build for that ordinal
   without requiring any change to its own scaling formula.
2. **Given** a pending sponsor contract with a `"win-next-race"` or
   `"target-race-time"` objective accepted at any choice stage,
   **When** the run advances to the next scheduled PvP stage to resolve
   it, **Then** the existing "find the next PvP stage" lookup correctly
   finds it, regardless of how many PvP stages already occurred earlier
   in the run.
3. **Given** `013-race-spectacle`'s deterministic track-selection formula
   (keyed off run seed and PvP stage ordinal), **When** it is evaluated
   at any of the four ordinals, **Then** it produces a defined track
   selection for that ordinal — the formula's own domain already
   generalizes to any ordinal, this feature does not modify it.

---

### Edge Cases

- What happens to a sponsor contract's `"trigger-tagged-items"`
  objective (count 10 tagged-item events) across a longer run? Nothing
  changes — it already counts events across however many laps/stages
  remain until resolution; a longer run simply gives it more
  opportunity to resolve, using the exact same counting logic.
- What happens to existing tests and fixtures written against today's
  6-stage schedule? They are updated to the new 12-stage schedule as
  part of this feature's own implementation (not left silently
  inconsistent) — see Assumptions.
- What happens if a sponsor contract is accepted at the very last choice
  stage (the 11th, immediately before the 4th and final PvP stage)? The
  existing "find the next PvP stage" lookup still finds exactly one PvP
  stage ahead of it (the 12th) — no different from today's shortest case
  (accepted at stage 4, immediately before stage 6's PvP).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST extend the run schedule from 6 stages to
  12 stages, arranged as four repeating groups of [choice, choice, PvP]
  — the same 2:1 choice-to-PvP pattern today's 6-stage schedule already
  uses, repeated four times instead of two, so the season always ends on
  a PvP stage.
- **FR-002**: `RunStage.choiceOrdinal` MUST widen to support values 1
  through 8 (today: 1 through 4); `RunStage.pvpOrdinal` MUST widen to
  support values 1 through 4 (today: 1 or 2).
- **FR-003**: Every scheduled PvP stage MUST have a defined lap count;
  `RunStage.lapCount`'s type MUST widen to accommodate lap-count values
  beyond today's 10/12 pair. The exact lap-count progression across all
  four PvP stages is a balance decision, not fixed by this specification
  (see Assumptions).
- **FR-004**: The three existing non-PvP encounter types (Parts
  Supplier, Reward Draft, Sponsor Meeting) remain the complete set
  offered at every choice stage in the 12-stage schedule — this feature
  MUST NOT introduce any new encounter type.
- **FR-005**: Every existing mechanism that already reads
  `pvpOrdinal` to determine PvP-stage-relative behavior — rival
  difficulty/level scaling (`012-multi-ghost-contest`), sponsor
  `"win-next-race"`/`"target-race-time"` objective resolution
  (`009-run-progression`), and deterministic track selection
  (`013-race-spectacle`) — MUST continue to resolve correctly across
  all four widened ordinals without requiring a change to its own
  formula; this feature's job is to widen the type domain those
  mechanisms already operate over, not to re-derive any of them.
- **FR-006**: The season-length change MUST NOT vary by player entrant,
  vehicle, or purchasable content (Constitution Principle II, Fairness).

### Key Entities

- **Season Schedule**: The fixed, ordered sequence of 12 `RunStage`
  entries every run is created with — four repeating groups of two
  choice stages followed by one PvP stage. Replaces today's 6-stage
  schedule; still authored as a single fixed sequence, not
  player-configurable.
- **RunStage** (extended): `choiceOrdinal` now ranges 1-8, `pvpOrdinal`
  now ranges 1-4, `lapCount` now accommodates more than two distinct
  values — no new fields, only widened value domains on existing ones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A newly created run's stage schedule contains exactly 12
  stages in the fixed [choice, choice, PvP] × 4 pattern, in 100% of
  runs created.
- **SC-002**: Every one of the 4 scheduled PvP stages has a defined,
  resolvable ordinal and lap count — zero stages with an undefined or
  missing value.
- **SC-003**: Rival difficulty scaling, sponsor next-PvP-stage
  targeting, and deterministic track selection all resolve correctly at
  every one of the 4 PvP ordinals, with zero exceptions and zero changes
  required to any of their own formulas.
- **SC-004**: A run only reaches `"completed"` status after its 12th
  (final) stage resolves — zero cases of early completion at the old
  6-stage boundary.

## Assumptions

- Exact lap-count progression across the four PvP stages, and any
  economy/balance rebalancing appropriate to a longer season (credit
  amounts, reputation deltas, interest cadence from
  `015-economy-depth`), are separate tuning passes — not fixed by this
  specification, matching how this session's prior features
  (`015-economy-depth`, `016-duplicate-item-tiering`) already treat
  their own balance constants.
- Scrutineering, Factory Development, and Privateer Exchange remain
  unspecified phase-two encounter types, tracked in `specs/DEFERRED.md`,
  deferred to their own future design passes — this feature only grows
  the schedule's length using encounter types that already exist.
- Rival Scouting remains owned by the future `pre-race-setup` feature
  (`specs/skribidi-gap-decisions.md` §8), not touched by this feature.
- Event-type variety (Circuit/Drag/Drift/Demolition/Show-style scoring
  axes) remains a distinct, later follow-up per the original decision —
  not part of this feature.
- Test Day / Practice Mode (`011-build-test-day`) is entirely
  unaffected — it has no run-stage-progression concept and this feature
  does not add one there.
- `012-multi-ghost-contest`'s rival catalog already anticipated needing
  more than 2 distinct levels (its own spec references reusing a
  profile "at in-run level 6") and requires no design change of its own
  to serve ordinals 1 through 4.
- `013-race-spectacle`'s track-selection formula is keyed off run seed
  and PvP ordinal generically — it requires no change to serve ordinals
  3 and 4, since its domain was never hard-limited to 1-2.
- Existing tests/fixtures written against today's 6-stage schedule are
  updated to the new 12-stage schedule as part of this feature's own
  delivery, not left inconsistent.
