# Feature Specification: Stat-Targeted Amplifiers

**Feature Branch**: `023-stat-targeted-amplifiers`

**Created**: 2026-08-12

**Status**: Implementation complete

**Input**: User description: "Give Buff and Synergy items a way to amplify a specific physical stat (acceleration, top speed, braking power, or cornering speed) delta on other held items, instead of only amplifying the legacy flat timeModifier field, since physics-first items now leave timeModifier at zero and are otherwise unreachable by any amplification mechanism. Extended in design discussion: a stacking buff's stat amplification must be able to grow — or, with a negative magnitude, shrink — over the course of a race, not just apply a single fixed value; this requires a build's resolved physical stats to vary lap to lap for the first time, superseding `021`'s existing 'resolved once per build' contract for this case specifically. Tiering must also scale a held item's own physics contribution, closing the same gap for duplicate-copy progression."

## Clarifications

### Session 2026-08-12

- Q: Does Synergy gain lap-varying (stacking) growth too, or stay lap-invariant? → A: Synergy stays lap-invariant — stat-targeted, resolved once per build, same cadence as flat Buffs. Stacking/growth is Buff-only in this feature; `SynergyEffect` gains no new per-lap accumulated state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Buff or Synergy item amplifies a specific physical stat (Priority: P1)

Today, `buff.boostPercent` and every `synergyEffects` entry only ever multiply a
matching item's `timeModifier`. Since `021`/`022` made `physics`/
`conditionalPhysics` deltas the primary way a new item expresses a real
performance effect (per `020`'s FR-009), and those items typically leave
`timeModifier` at `0`, a Buff or Synergy item authored today has nothing left
to amplify on most new content — it is functionally inert against the very
items the current authoring pass is producing.

This story lets a Buff or Synergy effect name which of the four physical
stats (`acceleration`, `topSpeed`, `brakingPower`, `corneringSpeed`) it
amplifies, and have that percentage apply to the matching stat's resolved
delta (flat `physics` plus any matching `conditionalPhysics` entries) on each
matching held item — the same multiplicative percent-of-own-value pattern
already used for `timeModifier`, just pointed at a different field.

**Why this priority**: This is the concrete, immediate blocker for the rest
of `020`'s 70-item authoring pass — without it, every Buff/Synergy item
authored from here forward is either legacy-`timeModifier`-only (increasingly
rare and discouraged) or silently does nothing.

**Independent Test**: Author a test item with a `physics.accelerationDelta`
and no `timeModifier`; author a second test item whose `buff` (flat, no
cooldown) targets `acceleration`; simulate both held together on a real
generated track; confirm the first item's effective acceleration — and
therefore simulated lap time — measurably changes relative to holding it
alone.

**Acceptance Scenarios**:

1. **Given** a held item with a `physics.corneringSpeedDelta` and a second
   held item whose flat Buff targets `corneringSpeed`, **When** a lap is
   simulated, **Then** the first item's effective `corneringSpeed`
   contribution is measurably larger than it would be without the Buff.
2. **Given** a held item with a `synergyTags` entry and a second held item
   whose Synergy effect (Boost-Others) targets that tag *and* the
   `brakingPower` stat, **When** a lap is simulated, **Then** the first
   item's effective `brakingPower` contribution is measurably larger than
   without the Synergy effect.
3. **Given** a stat-targeted Buff or Synergy effect and a held item that has
   no delta at all for the targeted stat, **When** a lap is simulated,
   **Then** that item's contribution from the amplifier is exactly zero — no
   error, no fallback to a different stat.
4. **Given** a Buff or Synergy effect authored with no explicit stat target,
   **When** a lap is simulated, **Then** it amplifies `timeModifier` exactly
   as it does today (the legacy default).

---

### User Story 2 - A stacking Buff's stat amplification grows or shrinks over the race (Priority: P1)

A stacking Buff (one with a `cooldown`) already accumulates its boost each
time it fires — `previousBoost + boostPercent`, lap over lap. Today that
accumulation only ever amplifies `timeModifier`. This story lets that same
growth (or, with a negative `boostPercent`, shrinkage) apply to a targeted
physical stat instead — meaning a build's resolved physical stats can now
genuinely differ from lap to lap for the first time, when a lap-varying
stat-targeted amplifier is active.

**Why this priority**: This is the specific capability the design discussion
identified as requiring the larger architectural change (physics stats
resolved per lap, not once per build) — without it, stacking Buffs are stuck
targeting only legacy `timeModifier`, and "an item that gets stronger (or
weaker) the longer you hold it" stays impossible for any physics-driven
build.

**Independent Test**: Author a stat-targeted stacking Buff with a positive
`boostPercent` and a short `cooldown`; hold it alongside an item with a
matching stat delta; simulate a multi-lap run; confirm the targeted stat's
effective value strictly increases at each firing across the run. Repeat
with a negative `boostPercent`; confirm it strictly decreases.

**Acceptance Scenarios**:

1. **Given** a stat-targeted stacking Buff with a positive `boostPercent`
   and a matching held item, **When** a multi-lap run is simulated,
   **Then** the targeted stat's effective value at lap 10 is strictly
   greater than at lap 1 (assuming at least one intervening firing).
2. **Given** the same setup with a negative `boostPercent`, **When** the
   same run is simulated, **Then** the targeted stat's effective value at
   lap 10 is strictly less than at lap 1.
3. **Given** a build with *no* active lap-varying stat-targeted amplifier
   (only flat/count-synergy Buffs, Synergy effects, or nothing at all),
   **When** a multi-lap run is simulated, **Then** the resolved
   `PhysicalStats` are identical across every lap (US3 covers this as its
   own regression guard).

---

### User Story 3 - Builds unaffected by this feature simulate identically to today (Priority: P1)

Every existing test, every existing item, and every build that doesn't
happen to hold a lap-varying stat-targeted amplifier must continue to
produce byte-for-byte identical simulation output — proven, not assumed,
before US4/US5 build further on top of US1/US2. Mirrors this project's
own established "regression guard before enrichment" ordering (`021`'s US4,
`022`'s US2).

**Why this priority**: US2 changes a binding invariant from `021`'s own
contract (`physics-simulation-contract.md` §1 — "resolved once per build,
not re-derived per lap"). That change must be proven to fully preserve every
build that doesn't use the new capability before this feature can be
considered safe to build content against.

**Independent Test**: Run the full existing regression suite unmodified;
confirm every test still passes. Simulate a build using only flat/
count-synergy Buffs, Synergy effects, or legacy `timeModifier` items before
and after this feature; confirm identical per-lap results, lap for lap.

**Acceptance Scenarios**:

1. **Given** any build with no active stacking Buff that targets a physical
   stat, **When** its laps are simulated, **Then** `PhysicalStats` is
   resolved exactly once and every lap's `physics.stats` is the same value.
2. **Given** the same build, **When** compared against its pre-feature
   simulated output, **Then** every lap's time and phase breakdown is
   byte-for-byte identical.

---

### User Story 4 - A stat-targeted amplifier's activity is fully inspectable, lap by lap (Priority: P2)

`PlayerLap.physics.stats` currently reports one shared value, identical
across every lap. Once stats can genuinely vary lap to lap (US2), each lap
must report its own real effective stats — otherwise the inspector would
show a stale, sometimes-wrong snapshot, violating this project's unbroken
Transparency & Legibility standard for every other item mechanic. Per-item
contribution evidence must also make clear which stat (or legacy time) an
amplifier targeted, and whether it found a match.

**Why this priority**: Real value once US1/US2 exist, but not the blocking
mechanism itself — inspectability follows correctness, matching `021` US3's
and `022` US3's own ordering after their respective US1/US2.

**Independent Test**: Simulate a multi-lap run holding a lap-varying
stat-targeted stacking Buff; inspect `PlayerLap.physics.stats` across
several laps; confirm the values themselves change and are individually
correct for that lap's own accumulated stacking state, verifiable directly
against the buff's own authored `boostPercent`/`cooldown` without
re-deriving from the simulation.

**Acceptance Scenarios**:

1. **Given** a lap-varying stat-targeted stacking Buff, **When** two
   different laps' `PlayerLap.physics.stats` are compared, **Then** they
   differ in exactly the targeted stat, by an amount traceable to the
   buff's own authored magnitude and how many times it has fired.
2. **Given** a stat-targeted Buff or Synergy effect, **When** its
   contribution evidence is inspected, **Then** it identifies which stat
   (or legacy time) was targeted and whether a match was found that lap.

---

### User Story 5 - Duplicate-tiered items scale their own physical contribution too (Priority: P3)

`applyTierBonus` already boosts a tier-2/tier-3 duplicate's `timeModifier`/
`buff.boostPercent` by `TIER_BONUS_PERCENT` per tier above 1. It never
touches `physics`/`conditionalPhysics` — so today, holding three copies of a
Physics-role item gives zero extra benefit over holding one. This story
closes that gap: a held item's own tier scales its own resolved physics
contribution the same way it already scales `timeModifier`.

**Why this priority**: Real, but the smallest and most self-contained of
the five stories — a duplicate-copy progression detail, not a blocker for
authoring new Buff/Synergy content the way US1/US2 are.

**Independent Test**: Hold a tier-3 copy of a Physics-role item; compare its
resolved stat delta against a tier-1 copy of the same item; confirm the
tier-3 delta is measurably larger by the same `TIER_BONUS_PERCENT`-per-tier
formula already used for `timeModifier`.

**Acceptance Scenarios**:

1. **Given** a tier-3 duplicate of an item with a `physics.topSpeedDelta`,
   **When** its build resolves `PhysicalStats`, **Then** its contribution
   is `TIER_BONUS_PERCENT * 2` percent larger than a tier-1 copy's.
2. **Given** a tier-3 duplicate of an item with `conditionalPhysics`,
   **When** a phase matching its condition is simulated, **Then** its
   matched contribution is scaled the same way.

---

### Edge Cases

- A stat-targeted amplifier whose candidate item has no delta at all for the
  targeted stat MUST contribute exactly 0 for that item — no error, no
  fallback to a different stat, no partial credit (mirrors `022`'s own
  "never matches" precedent).
- A stacking Buff with a negative `boostPercent` targeting a stat can drive
  that item's own contribution negative over the course of a race — no new
  floor is introduced beyond the existing build-level `MIN_PHYSICAL_STAT`
  clamp already enforced on the build's overall resolved stats.
- A stat-targeted amplifier amplifies *both* an item's flat `physics` delta
  and every matching `conditionalPhysics` delta for that same stat — never
  only one or the other.
- A single `buff` or `SynergyEffect` targets exactly one stat (or legacy
  time) — an item wanting to amplify two different stats needs two separate
  `synergyEffects` entries; `buff` itself stays a single, non-array field,
  so a Buff-role item is limited to one target.
- `identityTag`'s existing type and behavior are completely unchanged —
  it continues to gate legacy time-targeted Buff eligibility exactly as
  today. A stat-targeted Buff's eligibility is a different, independent
  rule: does the candidate item have a delta for the targeted stat.
- A build with no active lap-varying stat-targeted amplifier resolves
  `PhysicalStats` exactly once, exactly as today — the per-lap resolution
  this feature introduces MUST reduce to the old single-resolution behavior
  whenever nothing actually varies lap to lap.
- A stat-targeted Synergy effect never varies lap to lap, even in a build
  that also holds an unrelated lap-varying stacking Buff — Synergy's own
  resolution stays once-per-build regardless of what else is held
  (Clarifications, Session 2026-08-12).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ItemDefinition.buff` MUST gain an optional stat-target field
  identifying which of the four `PhysicalStats` dimensions it amplifies;
  omitting it MUST default to amplifying `timeModifier`, preserving every
  existing authored Buff's behavior exactly.
- **FR-002**: Every `SynergyEffect` MUST gain the same optional stat-target
  field, with the same legacy-`timeModifier` default when omitted.
- **FR-003**: When a Buff or Synergy effect targets a physical stat, its
  percentage MUST apply multiplicatively to that stat's resolved delta
  (flat `physics` delta plus every matching `conditionalPhysics` delta for
  that stat) on each matching held item — the same percent-of-own-value
  pattern already used for `timeModifier`.
- **FR-004**: A stat-targeted Buff or Synergy effect whose candidate item
  has no delta for the targeted stat MUST contribute exactly 0 for that
  item.
- **FR-005**: A stat-targeted Buff's matching eligibility MUST be "does the
  candidate item have a delta for the targeted stat" — never `identityTag`,
  which MUST retain its exact current behavior and matching role for
  legacy time-targeted Buffs.
- **FR-006**: Synergy's existing targeting mechanism (`synergyTags`/
  `installationCategory` via `SynergyTarget`) MUST remain completely
  unchanged — stat-targeting only changes what a matched effect amplifies,
  never which items match.
- **FR-007**: A build's resolved `PhysicalStats` MUST be permitted to vary
  lap to lap when an active stacking Buff targets a physical stat —
  superseding `021 contracts/physics-simulation-contract.md` §1's "resolved
  once per build, not re-derived per lap" clause for exactly this case —
  computed fresh for each lap from that lap's own accumulated stacking
  state.
- **FR-008**: A build with no active lap-varying stat-targeted amplifier
  MUST resolve `PhysicalStats` exactly once and reuse it for every lap,
  producing byte-for-byte identical output to today's shipped behavior.
- **FR-009**: `PlayerLap.physics.stats` MUST report the actual effective
  `PhysicalStats` used for that specific lap's own physics simulation — no
  longer guaranteed to be the same object or value across every lap in a
  build holding a lap-varying stat-targeted amplifier.
- **FR-010**: Per-item contribution evidence MUST make it possible to
  determine which stat (or legacy time) a Buff/Synergy effect targeted, and
  whether it found a match, matching this project's existing Transparency &
  Legibility standard for every other item mechanic.
- **FR-011**: `applyTierBonus` MUST also scale a held item's own resolved
  `physics`/`conditionalPhysics` stat deltas by the same per-tier bonus
  percent it already applies to `timeModifier`/`buff.boostPercent`.
- **FR-012**: A stat-targeted `SynergyEffect` MUST always resolve once per
  build, exactly like a stat-targeted flat Buff — this feature introduces no
  new per-lap accumulated state to Synergy, and lap-to-lap variance (FR-007)
  is exclusively a property of stacking Buffs (Clarifications, Session
  2026-08-12).

### Key Entities

- **Stat Target**: which of the four `PhysicalStats` dimensions (or legacy
  `timeModifier`) a Buff or `SynergyEffect` amplifies. New optional field on
  both shapes; absent means legacy `timeModifier` targeting, unchanged from
  today.
- **Per-Lap Physical Stats** *(behavior change to an existing entity)*:
  `PlayerLap.physics.stats` — previously one value shared identically
  across every lap in a build; now the real, potentially lap-varying,
  effective stats for that specific lap.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A stat-targeted flat or count-synergy Buff, or a stat-targeted
  Synergy effect, measurably changes the targeted stat's resolved value —
  and therefore simulated lap time — for a matching held item, verified
  end-to-end on a real generated track.
- **SC-002**: A stat-targeted stacking Buff's effect on the targeted stat
  measurably grows across a run's laps when its own `boostPercent` is
  positive, and measurably shrinks when negative — verified by comparing
  early-lap vs. late-lap resolved stats for the same build.
- **SC-003**: A stat-targeted amplifier whose candidate item has no delta
  for the targeted stat produces zero measurable change for that item.
- **SC-004**: Every pre-existing test in the repository continues to pass;
  a build with no lap-varying stat-targeted amplifier produces byte-for-byte
  identical `PlayerLap` output (stats and totals, every lap) to current
  shipped behavior.
- **SC-005**: A tier-3 duplicate of a Physics-role item produces a
  measurably larger stat delta than a tier-1 copy of the same item.
- **SC-006**: Per-lap contribution evidence for a stat-targeted amplifier
  identifies the targeted stat and whether a match was found, verifiable
  directly from the evidence without re-deriving from the simulation.

## Assumptions

- A single `buff` or `SynergyEffect` targets exactly one stat (or legacy
  time); an item wanting to amplify multiple stats needs multiple
  `synergyEffects` entries. `buff` itself stays a single, non-array field —
  a Buff-role item is limited to one target per item.
- Exact percent/threshold values for specific catalog items remain a `020`
  content-authoring decision, not fixed here.
- `identityTag`'s existing single-value type and behavior are unchanged by
  this feature — it is not repurposed, extended, or removed.
- No new floor/clamp is introduced beyond the existing `MIN_PHYSICAL_STAT`
  floor already enforced on a build's overall resolved stats — a decaying
  stacking Buff can legitimately drive one item's own stat contribution
  negative before that build-level floor applies.
- Tiering's fix (US5) is a passive, automatic scaling of an item's own
  deltas — it does not gain a stat-target concept of its own, since it
  already applies uniformly to whatever the item itself already
  contributes.
- `018-track-generation` and `019-async-ghost-pool` require no changes —
  neither reads Buff/Synergy/Tier resolution.
