# Research: Vehicle Stat Display

## Decision 1: Reuse feature 024's vocabulary

Feature 024 already exports the authoritative physical-stat ordering, labels,
units, signs, and precision. Feature 025 imports that metadata instead of
creating a second formatter.

**Why**: Item deltas and aggregate totals must use identical language.

**Rejected**: Scene-specific abbreviations or units. They make reconciliation
harder and allow preparation and race views to disagree.

## Decision 2: Preparation totals are unconditional and build-authoritative

The current panel starts from `STOCK_PHYSICAL_STATS` and adds only physical
contributions active in the current build without a track/lap/segment context.
Conditional potential is summarized separately and links to feature 024's item
inspector.

**Why**: A single preparation number cannot honestly claim a corner-only or
lap-stacking benefit is active.

**Rejected**: Best-case totals, average-track estimates, or silent omission of
conditional items.

## Decision 3: Preview by applying existing garage authority

The preview adapter consumes `PlacementPreview` and the noncommitting
prospective build produced through the same garage command path used by commit.
It compares prospective totals with current totals.

**Why**: Swap, replacement, eviction, tiering, and installation behavior are
already centralized and must not be reimplemented in presentation.

**Rejected**: Adding the selected card's visible deltas directly to the panel.
That fails for occupied destinations and installation-dependent behavior.

## Decision 4: Race values are recorded evidence

`PlayerLap.physics.stats` is the aggregate lap-effective source.
`PlayerLap.physics.itemContributions` provides source reconciliation. The panel
changes when the inspected player lap changes, not every animation frame.

**Why**: Recorded evidence is immutable and already reflects tiers, placement,
Buffs, Synergies, clamps, and conditions used by the contest.

**Rejected**: Calling `simulatePlayerLaps` or rebuilding physics in a scene.

## Decision 5: Separate whole-lap stats from segment conditions

The four main race values show `physics.stats`, which intentionally represents
the whole-lap base physical profile. Segment-conditional contributions appear
as labeled potential/activation detail because one scalar cannot represent
different effective values across every segment.

**Why**: This matches the simulation evidence model and avoids presenting a
fictional aggregate.

## Decision 6: Player-first, stable panel

The player's four values remain in a fixed order. Value changes use signed
text, source labels, and restrained emphasis. Rivals do not displace the player
panel. Feature 027 owns live ranking and ghost-relative timing.

**Why**: Stable spatial position makes lap-to-lap changes scannable during a
watched contest.

## Decision 7: Test Day reports its evidence ceiling

Where current Test Day output lacks track-aware physical stats, the shared
model returns `unavailable` with a reason. It does not substitute stock or
preparation values.

**Why**: An explicit limitation preserves transparency and creates a clean
upgrade path when Test Day gains track-aware evidence.
