# Feature Specification: Arcade Physics Simulation

**Feature Branch**: `021-arcade-physics-simulation`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Replace the current flat-scalar lap time model with a real arcade-level physics simulation (acceleration, braking distance, cornering speed) that walks each track's actual segment sequence, so item bonuses genuinely depend on track shape and item-vs-item interaction, not aggregate build ratios. Arcade-racer complexity, not a full sim (not Gran Turismo). Visual presentation (the existing simplified 2D track overview) is unaffected — this is a backend simulation change only."

## Background

Today, `simulatePlayerLaps` computes lap time as one flat scalar: a
`baseLapTime` plus the sum of every held item's own `timeModifier` (each
possibly amplified by a buff percentage), clamped to a minimum. This is
identical every lap (barring cooldown-driven firing differences) and has no
concept of *where* in a lap that time is spent.

`018-track-generation` added `corneringDemand`/`powerDemand`/`brakingDemand`
— three 0-100 scores describing a track's overall character — plus the real
segment sequence (`TrackSegment[]`, alternating straights of a real length
and corners of a real `turnDegrees`) those scores are derived from. It also
added `buildTrackLean`/`trackFit`, a mechanic that scales a build's whole
lap time by a percentage derived purely from the *ratio* of Power to
Chassis items held — never from any specific item's own identity.

Two problems were identified with that ratio-based mechanic during this
project's own design review, both verified against the actual formulas in
`src/simulation/tracks.ts`:

1. **It violates this project's own stated principle** that every
   performance-affecting bonus or penalty must trace to a specific item —
   `buildTrackLean` traces to a count ratio instead.
2. **It is lossy by construction.** Every generated track's corner angles
   sum to exactly 360° (the closure guarantee `018` relies on), so even a
   carefully-designed non-linear scoring formula collapses tracks with
   genuinely different segment shapes — different numbers of corners,
   different straight-length distributions — onto the same three scores.
   An item whose effect trades cornering pace for straight pace cannot be
   evaluated correctly against a lossy aggregate; its real value depends on
   the track's actual segment-by-segment layout.

This feature replaces `buildTrackLean`/`trackFit` entirely with a lap-time
simulation that walks each track's real segment sequence and models speed
continuously across it — enough physics to make braking distance, corner
speed, and straight-line acceleration real, load-bearing quantities, without
building a full vehicle-dynamics simulator.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A stock build produces a real, segment-aware lap time (Priority: P1)

Before any item enters the picture, a car with only baseline ("stock")
physics stats must produce a sane, deterministic lap time on a real
generated track by actually traversing its segments — accelerating on
straights, braking before corners, holding a reduced speed through them —
rather than reading a single flat number.

**Why this priority**: This is the engine's own foundation. Every other
story depends on the core segment-walking simulation existing and producing
correct, deterministic results before any item-driven variation is layered
on top.

**Independent Test**: Simulate a stock build (no items) across a wide
sample of generated tracks; confirm every lap time is deterministic, finite,
positive, and that two structurally different tracks (same aggregate
`corneringDemand`/`powerDemand`/`brakingDemand`, different real segment
layout) produce **different** stock lap times — the specific defect the
old `trackFit` mechanic could not avoid.

**Acceptance Scenarios**:

1. **Given** a stock build and a generated track, **When** a lap is
   simulated, **Then** the result is a single deterministic lap time
   computed by traversing every segment in order.
2. **Given** two tracks whose aggregate `corneringDemand`/`powerDemand`/
   `brakingDemand` scores are equal but whose real segment sequences
   differ, **When** the same stock build's lap time is simulated on each,
   **Then** the two lap times differ.
3. **Given** a straight segment too short for the build to reach its top
   speed before the next corner's required entry speed, **When** that lap
   is simulated, **Then** the build never reaches top speed on that
   straight — braking begins as late as the segment allows, not at a fixed
   point.
4. **Given** identical `(build, track)` inputs, **When** simulated twice,
   **Then** the two results are deeply equal (no hidden randomness).

---

### User Story 2 - Items express real physical stats, and their value depends on the actual track (Priority: P1)

An item can modify one or more of a build's physical stats (at minimum:
top speed, braking power, cornering speed) instead of — or in addition to
— today's flat per-firing seconds delta. A build that trades cornering
pace for straight-line pace measurably wins more time on a straight-
dominant track and measurably loses time on a corner-dominant one, because
the simulation is now evaluating that trade against the track's real
segment content, not an aggregate label.

**Why this priority**: This is the actual payoff motivating the whole
feature — real, item-sourced, track-shape-sensitive build identity — and
it's why `020-character-item-pools`' content (cornering-focused items,
braking-focused items, etc.) has anything meaningful to plug into.

**Independent Test**: Give a build a physics-stat item that boosts
cornering speed at the cost of straight-line top speed; resolve it on a
corner-dominant generated track and a straight-dominant one; confirm the
item is a net time gain on the former and a net time loss (or smaller
gain) on the latter.

**Acceptance Scenarios**:

1. **Given** a build holding an item that increases cornering speed,
   **When** its lap time is simulated on a corner-dominant track, **Then**
   its lap time is faster than the same build without that item.
2. **Given** the same build and item, **When** simulated on a straight-
   dominant track, **Then** the cornering-speed item's benefit is smaller
   than on the corner-dominant track (proportional to how much of that
   specific track is actually corners).
3. **Given** an item that trades one physical stat for another (faster
   cornering, slower top speed), **When** simulated on tracks with
   different real segment layouts, **Then** the net effect differs by
   track in a way that traces to the track's actual segment content, not
   to a precomputed aggregate score.

---

### User Story 3 - Every physics-derived second remains fully attributable (Priority: P2)

Consistent with this project's existing transparency guarantee (every
outcome-determining value is inspectable — the same principle that gives
every item's `ContributionEvidence` an exact seconds figure today), a
simulated lap's time must be breakable down by phase (accelerating,
cruising, braking, cornering) and by which held item contributed how much
to each phase — never an opaque black-box total.

**Why this priority**: Without this, the feature regresses the one
principle this project has held consistently since its constitution was
written. It's P2 rather than P1 only because US1/US2 can be built and
internally verified first, with the inspectable breakdown layered on
before this feature is considered complete — not because it's optional.

**Independent Test**: Simulate a lap for a build with several physics-stat
items; confirm the result exposes, per lap, how much time was spent in
each phase and which item(s) affected each phase's outcome — sufficient to
reconstruct the total from its parts, the same guarantee
`ContributionEvidence`/`preClampLapTime`/`resultingLapTime` already provide
for the existing flat-time system.

**Acceptance Scenarios**:

1. **Given** a simulated lap, **When** its result is inspected, **Then**
   the total lap time is fully reconstructable as a sum of per-phase,
   per-item-attributed components — no unexplained remainder.
2. **Given** a build with zero physics-stat items, **When** its lap is
   simulated on a track, **Then** the breakdown still reports real
   accelerating/cruising/braking/cornering phase times derived from stock
   stats, even with nothing to attribute to an item.

---

### User Story 4 - Everything that doesn't opt in keeps working exactly as it does today (Priority: P2)

`simulatePlayerLaps(build, lapCount)` called without a track — the legacy
2-car `resolveContest` overload, Test Day/Practice, and every existing test
that constructs a `PlayerLap` result directly — must remain byte-for-byte
unchanged. Existing items authored with only `timeModifier` (no physics
stats) must continue to work exactly as they do today, contributing their
flat seconds delta regardless of which physics model, if any, is active.

**Why this priority**: Backward compatibility for ~700 existing tests and
every feature built on top of `simulatePlayerLaps` since `002-item-slots`.
Lower priority only because it's a non-negotiable constraint verified last,
not because it's optional — this project's established pattern (`014`,
`016`, `017`, `018`, `019` all did this) is additive-only change.

**Independent Test**: Run the full existing test suite unmodified; confirm
every pre-existing test passes, and confirm a build made entirely of
`timeModifier`-only items (the shape every item in the codebase has today)
produces a lap time via the new engine that's consistent with its
`timeModifier` sum, whether or not a track is supplied.

**Acceptance Scenarios**:

1. **Given** any existing test's call to `simulatePlayerLaps(build,
   lapCount)` with no `track` argument, **When** run against this
   feature's implementation, **Then** the result is identical to today's.
2. **Given** a `timeModifier`-only item (no physics-stat fields), **When**
   held in a build whose lap is simulated with a real track, **Then** its
   flat seconds contribution still applies, unaffected by which segment of
   the track it's "firing" during.

---

### Edge Cases

- **What replaces `018`'s `buildTrackLean`/`trackFit`/`TRACK_FIT_MAX_PERCENT`?**
  They are removed entirely, not deprecated alongside the new engine — this
  feature *is* the resolution the `018`/`019` session already flagged as
  required follow-up work. `resolveContest`'s N-car overload gains this
  feature's real per-segment simulation in trackFit's place.
- **What are a build's stock (pre-item) physical stats derived from?** Left
  to `plan.md`/`data-model.md` — `SpecCar` currently carries only
  `baseLapTime`; this feature needs baseline physics stats defined
  somewhere, additively, without breaking `SpecCar`'s existing meaning for
  any code that doesn't yet know about physics stats.
- **What happens across a lap boundary — does speed carry over from one
  lap into the next, or does every lap start from rest?** A real racing
  concept either way (rolling vs. standing start) — left to `plan.md` to
  decide, with the constraint that lap-to-lap results must remain
  deterministic either way.
- **What happens to a `timeModifier`-only item's contribution relative to
  the new phase-based time breakdown (US3)?** It must still be fully
  attributable — even a flat, physics-blind contribution needs a
  well-defined place in the per-phase breakdown (e.g., applied once per
  lap, independent of phase) so US3's "no unexplained remainder" guarantee
  holds for every existing item unmodified.
- **What happens on a corner sharp enough, or a build weak enough, that no
  achievable combination of braking power and cornering speed reaches a
  valid apex speed in the available distance?** Bounded, defined behavior
  is required (e.g., a floor on apex speed) — never an unbounded/negative-
  time/NaN result. Exact bounding behavior is a `plan.md`/`data-model.md`
  decision.
- **How much of a corner's own length belongs to entry vs. exit?** A real
  split is needed for FR-004's entry/apex/exit model to produce a time,
  not just a speed profile — left to `plan.md`/`data-model.md` as a
  balance-pass decision (e.g., a symmetric default), not fixed here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compute a track-aware lap time by traversing
  a track's actual `segments` sequence in order — never by reading only
  the precomputed aggregate `corneringDemand`/`powerDemand`/`brakingDemand`
  scores as simulation input (those remain valid as a human-readable track
  profile, just not as what the simulation itself consumes).
- **FR-002**: The system MUST model exactly four physical dimensions a
  build can be strong or weak in: **acceleration** (rate of speed gain),
  **top speed** (the ceiling speed reachable on a straight), **braking
  power** (rate of speed loss available before/into a corner), and
  **cornering speed** (how much lateral severity a corner can be taken at
  before a lower speed is required) — acceleration and top speed are
  deliberately separate stats, not one combined "straight speed," so a
  build can be quick off the line but capped low, or slow to build speed
  but fast once rolling.
- **FR-003**: On a straight segment, the system MUST model continuous speed
  change (acceleration toward a build's top-speed capability, governed by
  its acceleration stat) rather than an instantaneous jump, and MUST begin
  braking before a segment's end when the upcoming corner's entry/apex
  speed requirement is lower than the build's current speed, budgeted
  against the build's braking-power stat — a straight too short to both
  reach top speed and brake down in time MUST result in the build never
  reaching top speed on it, not in an invalid or clamped-away result.
- **FR-004**: A corner segment MUST be modeled as three phases — **entry**
  (continued braking, possibly carried over from the preceding straight's
  own braking zone, down toward the corner's minimum negotiable speed),
  **apex** (the corner's own minimum speed, derived from that corner's
  severity (`turnDegrees`) and the build's cornering-speed stat — sharper
  corners MUST require a lower apex speed than gentler ones, for the same
  build), and **exit** (acceleration away from the apex, governed by the
  build's acceleration stat, carrying speed into whatever segment follows)
  — never a single constant speed held across the corner's whole extent.
- **FR-005**: Every physics-affecting bonus or penalty MUST trace to a
  specific held item's own stats — no mechanism may derive a bonus purely
  from a build-composition ratio or count, independent of which items
  produced that composition (the exact defect this feature removes from
  `018`'s `buildTrackLean`).
- **FR-006**: The system MUST be capable of producing different net
  outcomes for the same item depending on the specific track it races —
  verified by FR requiring different lap times for the same build across
  tracks with equal aggregate characteristic scores but different real
  segment layouts (User Story 1, Acceptance Scenario 2).
- **FR-007**: `simulatePlayerLaps(build, lapCount)` called without a
  `track` argument MUST remain byte-for-byte identical to its behavior
  before this feature — this is the single most load-bearing invariant in
  this contract, matching the precedent `018`'s FR-007 already established
  for the very same function.
- **FR-008**: Every existing `timeModifier`-only `ItemDefinition` (every
  item authored in the codebase as of this feature) MUST continue to
  contribute its existing flat per-firing seconds delta unmodified, whether
  or not a track/physics model is engaged for that contest.
- **FR-009**: Every physics-derived lap time MUST be decomposable into
  inspectable components (at minimum: time attributable to each of
  accelerating/cruising/braking/cornering, and which held item affected
  each) — no opaque total (Constitution Principle III).
- **FR-010**: The N-car `resolveContest` overload MUST apply this feature's
  simulation, in place of `018`'s removed `buildTrackLean`/`trackFit`, to
  every car in the field identically — none exempt, matching `018`'s own
  FR-009 for the mechanic this replaces.
- **FR-011**: The legacy 2-car `resolveContest` overload and Test Day/
  Practice MUST remain unaffected — no track-aware physics simulation is
  introduced to either path, matching `018`'s own FR-007 precedent for the
  same two consumers.
- **FR-012**: `013-race-spectacle`'s rendering — `pointAtProgress`,
  standings, commentary — MUST require zero changes; this feature affects
  only how a lap's total time is computed, never the track's visual point
  path or how a race is presented.
- **FR-013**: No function this feature introduces or modifies may accept
  or read more than one player's `Run`/`Build` at a time (Constitution
  Principle I).

### Key Entities

- **Physical Stats**: A build's aggregate capability in each of the four
  modeled dimensions (acceleration, top speed, braking power, cornering
  speed — FR-002), derived from a stock baseline plus every held item's
  own contribution.
- **Stock Baseline**: The physical stats a car has with no items held —
  today's equivalent of `SpecCar.baseLapTime`, extended to cover all four
  dimensions.
- **Segment Traversal**: The act of computing time-to-cross for one
  `TrackSegment`, as a function of the build's physical stats, the
  segment's own geometry, and — for a corner — its own entry/apex/exit
  sub-phases (FR-004), continuous with whatever speed the preceding
  segment ended at.
- **Lap Phase**: A named portion of a lap's time — accelerating, cruising
  at top speed, braking, and a corner's own entry/apex/exit sub-phases —
  the unit US3's inspectability requirement decomposes a lap time into.
- **Item Physics Contribution**: A new, optional shape an `ItemDefinition`
  can carry (distinct from and additive to today's `timeModifier`) that
  affects one or more Physical Stats instead of contributing a flat
  seconds delta directly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two generated tracks with equal `corneringDemand`/
  `powerDemand`/`brakingDemand` scores but different real segment
  sequences produce different lap times for the same build — the specific
  failure mode this feature exists to fix.
- **SC-002**: A build that trades cornering-speed capability for straight-
  line pace produces a measurably different net time swing on a corner-
  dominant track than on a straight-dominant one, for the same item.
- **SC-003**: Every existing test in the repository (~700 as of this
  feature's start) continues to pass with zero modification.
- **SC-004**: Every physics-derived lap time is reconstructable from its
  own reported phase/item breakdown with no unexplained remainder.
- **SC-005**: `018`'s `buildTrackLean`/`trackFit`/`TRACK_FIT_MAX_PERCENT`
  are removed from the codebase with no remaining reference, and the N-car
  contest path shows zero regression against `012`/`013`'s own existing
  test suites.

## Assumptions

- Units (distance, speed, acceleration) are an internally-consistent
  abstract scale, calibrated for sensible lap times against this project's
  existing `baseLapTime`/track-segment-length conventions — not real-world
  SI calibration. This matches how every other simulation tuning constant
  in this project (`baseLapTime`, `018`'s scoring constants) has always
  been a balance-pass placeholder rather than a researched physical value.
- Arcade-level complexity is a deliberate ceiling: no tire wear, no fuel
  load, no weather, no slipstream/drafting, no collision — this feature
  models one car's own speed profile around a lap, nothing else. Any of
  those would be new, separate future features.
- `020-character-item-pools`'s item content is designed *against* this
  feature's physics-stat shape once it exists — this feature is a
  prerequisite for `020`'s items to have real dimension-specific identity,
  not a parallel, independent effort.
- Exact numeric formulas (how `turnDegrees` maps to max cornering speed,
  how braking distance is computed from current/target speed and braking
  power, the stock baseline values) are `plan.md`/`data-model.md`/balance-
  pass decisions, not fixed by this spec — mirrors how `018` left its own
  scoring-formula constants as an implementer's choice within stated
  behavioral bounds.
