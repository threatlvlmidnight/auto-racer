# Feature Specification: Contextual Physics Effects

**Feature Branch**: `022-contextual-physics-effects`

**Created**: 2026-08-11

**Status**: Implementation complete

**Input**: User description: "Extend the 021 arcade physics simulation so item effects can be conditional on track context (e.g. corner tightness), not just flat global stat deltas. Concrete motivating case: an item that only improves acceleration exiting tight corners, contributing nothing on gentle corners or straights."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An item's stat boost can be scoped to tight corners only (Priority: P1)

Today, `021-arcade-physics-simulation` resolves one flat `PhysicalStats` object for
a whole build, and applies it identically to every phase of every lap — an
item's `accelerationDelta` boosts acceleration out of a hairpin exactly as
much as it boosts acceleration off the start/finish line. This story adds a
second way for an item to contribute: a stat delta paired with a condition,
so an item can boost `acceleration` (or any of the four stats) only for
phases associated with a corner whose sharpness meets a threshold — e.g. "a
further +25 acceleration, but only exiting corners of 90° or sharper" —
contributing exactly nothing elsewhere.

**Why this priority**: This is the mechanical core the whole feature exists
for. Without it, "conditional" items are indistinguishable from flat ones,
and the concrete motivating case (a tight-corner acceleration specialist)
cannot be authored at all.

**Independent Test**: Author a test item with an acceleration delta
conditioned on a corner-tightness threshold; simulate it on a real generated
track with a mix of sharp and gentle corners; confirm its delta measurably
changes lap time only through phases associated with qualifying corners, and
that an otherwise-identical build without the item produces a different,
predictable total.

**Acceptance Scenarios**:

1. **Given** an item with `accelerationDelta: 25` conditioned on corners
   ≥90°, **When** a lap is simulated on a track containing both a 120°
   corner and a 40° corner, **Then** the accelerating phase following the
   120° corner reflects the boosted acceleration and the accelerating phase
   following the 40° corner does not.
2. **Given** the same item, **When** simulated on a track with zero corners
   meeting the threshold, **Then** the item contributes exactly 0 to lap
   time — no error, no fallback to always-applying.
3. **Given** two items with the same delta magnitude — one unconditional,
   one conditioned to tight corners only — **When** both are simulated on
   the same track, **Then** the conditional item's total lap-time
   contribution is less than or equal to the unconditional item's, and
   strictly less whenever the track has any phase the condition excludes.

---

### User Story 2 - Existing flat, unconditional items are completely unaffected (Priority: P1)

Every item `021` shipped (and every item that never declares a condition)
must keep behaving exactly as it does today: one flat delta, summed once
per build, applied uniformly to every phase. This story is the zero-
regression guarantee that lets conditional and unconditional contributions
coexist on the same build without the presence of one changing the other's
behavior.

**Why this priority**: Equal to US1 — a capability that silently changes
existing item behavior is not a safe foundation for `020`'s upcoming
70-item pool, most of which may still be authored as unconditional.

**Independent Test**: Run the full existing `021` physics regression suite
unmodified; confirm every test still passes byte-for-byte. Simulate a build
containing only unconditional items before and after this feature lands;
confirm identical lap times.

**Acceptance Scenarios**:

1. **Given** a build with only unconditional physics items, **When** a lap
   is simulated, **Then** the resulting lap time is identical to what
   `021`'s shipped model would have produced.
2. **Given** a build mixing one conditional and one unconditional item,
   **When** a lap is simulated, **Then** the unconditional item's delta
   applies to every phase exactly as it always has, independent of whether
   the conditional item's condition is met anywhere on the track.

---

### User Story 3 - A conditional item's activity is fully inspectable (Priority: P2)

The existing per-lap physics breakdown (`LapBreakdown.physics`) already
exposes phase-by-phase seconds. This story extends that inspectability so a
player or tester can see, for each phase, whether a held conditional item's
delta actually applied there — not just the aggregate time, matching the
project's existing transparency standard for every other item mechanic
(buffs, synergy, tiering).

**Why this priority**: Real value once US1 exists, but the feature is
mechanically complete without it — inspectability is a legibility layer on
top of a working simulation, matching this session's precedent of shipping
the mechanism before its full inspector polish (e.g. `021`'s own US1 before
US3).

**Independent Test**: Simulate a lap with a conditional item held; inspect
the returned phase breakdown; confirm it identifies which specific phases
the item's condition matched, verifiable directly against the track's own
corner angles without re-deriving the simulation.

**Acceptance Scenarios**:

1. **Given** a simulated lap with a conditional item held, **When** its
   phase breakdown is inspected, **Then** each phase indicates whether that
   item's condition was met for that phase.
2. **Given** the same build simulated on a different track shape, **When**
   the two breakdowns are compared, **Then** the set of phases where the
   condition matched differs in a way that is traceable to the two tracks'
   different corner angles.

---

### User Story 4 - The condition isn't limited to "tight corners only" (Priority: P3)

The threshold direction and stat aren't fixed to the single motivating
example. A "gentle-corner specialist" (condition met when a corner is
*below* a threshold) and conditional deltas on any of the four stats (not
only `acceleration`) must be equally expressible from the same mechanism,
so item design isn't limited to one narrow shape.

**Why this priority**: Real design-space value, but the feature is
shippable and demonstrates the core capability without it — a single
threshold direction and stat already proves the mechanism works end to end.

**Independent Test**: Author one item conditioned on "corner ≥ threshold"
and one on "corner ≤ threshold" for two different stats; simulate both on
the same track; confirm each applies to the complementary set of qualifying
corners its own condition implies.

**Acceptance Scenarios**:

1. **Given** a `corneringSpeedDelta` item conditioned on corners ≤40°,
   **When** simulated on a track with both sharp and gentle corners,
   **Then** it changes only the gentle corners' own apex speed.
2. **Given** items conditioned on each of the four stats in turn, **When**
   each is simulated, **Then** each correctly restricts its own stat's
   delta to its own qualifying phases, independent of the other three
   stats' resolution.

---

### Edge Cases

- What happens to the very first accelerating phase of a lap, which follows
  the finish-line straight rather than a corner within the same lap? Since
  track segments form a closed loop (`018-track-generation`), every
  accelerating phase already has an associated preceding corner via its
  existing `segmentIndex` (the last corner before the line, on wraparound) —
  this feature MUST reuse that existing association, not introduce a
  special-cased "no corner" phase.
- What happens when a conditional item's condition can never be met on a
  given track (e.g., a tight-corner specialist on an all-gentle-corner
  track)? The item MUST contribute exactly 0 for that entire race — this is
  expected, track-shape-dependent behavior (the same principle `021` was
  built to establish), not an error state.
- What happens when multiple conditional items target the same stat with
  overlapping conditions? Their deltas MUST sum additively for any phase
  where both conditions are met, mirroring `021`'s existing flat-summation
  model (`021 contracts/physics-simulation-contract.md` §1 — "MUST be
  derived from a stock baseline plus every held item's own
  `ItemPhysicsContribution`, summed") — no interaction, no override, no
  precedence rules needed.
- What happens to `LapBreakdown.physics.stats` — today a single resolved
  `PhysicalStats` object per lap — once a build's effective stats can vary
  phase to phase? This feature MUST still expose a build's base
  (unconditional-only) resolved stats at that same field, and MUST expose
  conditional activity through the phase-level breakdown (US3) — the exact
  shape is a `plan.md`/`data-model.md` decision, not fixed here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an item's physics contribution to
  declare an optional condition that scopes where its delta applies, in
  addition to — not replacing — `021`'s existing unconditional/flat
  contribution model.
- **FR-002**: A condition MUST, at minimum, support a corner-tightness
  threshold (a corner's turn angle at or above, or at or below, an authored
  value), evaluated against the specific corner each accelerating/braking/
  cruising phase is associated with — a `corneringSpeed` condition is
  evaluated directly against its own corner rather than through a phase
  (no phase entry represents "the apex"; see Edge Cases).
- **FR-003**: A conditional contribution's delta MUST apply only to phases
  whose associated corner satisfies its condition, and MUST contribute
  exactly 0 to every other phase — no averaging, no partial credit, no
  fallback to always-applying.
- **FR-004**: Conditional and unconditional contributions — from the same
  item or different items, targeting the same or different stats — MUST
  stack additively for any phase where all their respective conditions (if
  any) are satisfied, exactly matching `021`'s existing flat-summation
  precedent (`021 contracts/physics-simulation-contract.md` §1) at finer
  granularity.
- **FR-005**: Every currently-passing `021` physics behavior MUST be
  unaffected — a build using zero conditional items MUST simulate
  identically before and after this feature.
- **FR-006**: The per-lap physics breakdown MUST remain fully inspectable
  under conditional contributions — it MUST be possible to determine, per
  phase, which conditional item(s) actually applied there (constitution III
  Transparency & Legibility).
- **FR-007**: The condition representation MUST be structured for
  extension to future condition dimensions (e.g., straight length, phase
  kind) without redesigning the corner-tightness kind — mirroring
  `014-item-synergy-tags`' `SynergyCondition` discriminated-union precedent
  (explicitly documented there as "open to a third kind later").
- **FR-008**: The condition mechanism MUST apply uniformly to all four
  `PhysicalStats` (`acceleration`, `topSpeed`, `brakingPower`,
  `corneringSpeed`) and to both threshold directions (at-or-above,
  at-or-below) — it MUST NOT be special-cased to acceleration or to a
  single direction.

### Key Entities

- **Physics Condition**: an optional qualifier on a stat delta, restricting
  the phases where it applies. v1 supports a corner-tightness threshold
  (direction + angle); structured to admit further kinds later without
  breaking existing conditions.
- **Conditional Physics Contribution**: an item's stat delta paired with a
  Physics Condition. Applies additively wherever the condition is met;
  contributes 0 elsewhere. Coexists with `021`'s existing unconditional
  contributions on the same item or build.
- **Phase Corner Context**: the specific corner (and its turn angle) that a
  given accelerating/braking/cruising phase is associated with — already
  partially present via `LapPhaseBreakdown.segmentIndex`; this feature
  makes that association usable for condition evaluation. `corneringSpeed`
  conditions are the one exception: no phase entry represents "the apex" —
  `LapPhaseKind` declares an `"apex"` member but the simulation never
  actually emits one — so `corneringSpeed` conditions are evaluated
  directly against a corner at the point its own apex speed is computed,
  not through this phase-association mechanism.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given two items of identical delta magnitude — one
  unconditional, one conditioned to tight corners only — simulating both
  independently on the same real generated track shows the conditional
  item's total lap-time contribution is never greater in magnitude than the
  unconditional item's, and is strictly smaller whenever the track contains
  any phase the condition excludes.
- **SC-002**: A generated lap's phase breakdown, inspected after simulating
  a build with a conditional item, correctly identifies every phase where
  the condition matched, verifiable directly against the track's own
  authored corner angles without re-running the simulation.
- **SC-003**: Every pre-existing `021` physics test continues to pass
  unmodified (`npm test`), and a build containing zero conditional items
  produces byte-identical lap times to `021`'s shipped behavior.
- **SC-004**: Items conditioned on each of the four stats, and on both
  threshold directions, can each be independently authored and correctly
  simulated — demonstrated by at least one working example per stat and
  per direction.

## Assumptions

- v1's condition vocabulary is scoped to a single dimension — corner
  tightness (a turn-angle threshold) — evaluated per phase via its existing
  corner association. Other dimensions raised during design (straight
  length, lap position, phase kind beyond corner-association) are
  explicitly out of scope for this feature; FR-007 only requires the
  representation not preclude adding them later.
- This feature is a direct, additive extension of
  `021-arcade-physics-simulation`'s simulation internals
  (`simulateLapPhysics`/`resolvePhysicalStats` move from resolving one
  `PhysicalStats` per build to resolving per-phase wherever a condition is
  present) — it is expected to touch `src/simulation/tracks.ts` and
  `src/simulation/laps.ts`, unlike `020`, which was scoped to avoid engine
  changes entirely.
- This feature does not itself author any conditional items. Content
  authoring — including `020-character-item-pools`' upcoming 70-item pool,
  which may use this capability for "corner specialist"-flavored items — is
  a separate, later concern; this spec only builds the capability.
- Whether existing buff/synergy/tiering percent-scaling mechanisms should
  also reach into physics deltas (conditional or not) — raised but left
  unresolved during `020`'s design discussion — remains explicitly out of
  scope for this feature. That is a separate decision for when `020`
  resumes, independent of whether conditions exist.
- The exact authored magnitude/threshold values used in any example or test
  item are an implementer's choice during `tasks.md`, not fixed here —
  mirrors every prior feature's convention in this project (e.g. `018`'s
  scoring constants, `021`'s balance-pass placeholders).
