# Research: Track Generation

## Decision 1: Guarantee closure and non-self-intersection by construction — uniform turn direction, exact 360° turn sum

**Decision**: Every generated track turns the same direction throughout
(chosen once per track, from the seed) and its corners' `turnDegrees`
are scaled so they sum to exactly 360°. Each corner's angle is bounded
to `(0°, 150°)` and every straight has a positive minimum length
(`MIN_STRAIGHT_LENGTH`), so no segment can degenerate toward zero.

**Rationale**: A closed polygonal path where every turn is in the same
rotational direction and the turns sum to exactly one full revolution
(360°) is a well-known sufficient condition for a **simple (non-self-
intersecting) convex polygon** — this is a geometric guarantee, not a
property that needs runtime detection. Combined with a positive minimum
length on every segment, FR-003's "no degenerate or self-intersecting
shape reachable" is satisfied structurally, by the generator's own
invariants, exactly as FR-003 requires — never by generating first and
validating/rejecting after.

**Alternatives considered**:
- Allow mixed left/right turns (more "realistic" chicanes/esses):
  rejected for v1 — guaranteeing simplicity with mixed turn direction
  requires real self-intersection detection (and a retry/repair loop),
  which is meaningfully more implementation risk for a first version.
  Nothing in FR-001 through FR-005 requires mixed-direction corners;
  revisit only if a future feature specifically wants chicane-style
  track variety.
- Generate raw points via noise/splines and validate simplicity after
  the fact: rejected — reopens exactly the runtime-generation risk
  `013-race-spectacle`'s own Decision 1 (hand-authored, never
  generated/splined) was written to avoid, and validation-after-
  generation means an unbounded retry loop instead of a guarantee.

## Decision 2: A small local seeded PRNG (mulberry32), not a library

**Decision**: `generateTrack(seed, pvpOrdinal)` derives a single integer
seed from its two inputs (`seed * 1000003 + pvpOrdinal`, matching this
codebase's existing hash-combination convention in
`encounters.ts`'s `seededTargetSeconds`), seeds a small (~10-line) local
`mulberry32`-style PRNG with it, and draws every random value —
corner count, each corner's raw angle, each straight's length, the
overall turn direction — from that single deterministic sequence. The
PRNG itself is pure: same seed always produces the same sequence, no
external state, no dependency injected from a caller.

**Rationale**: Every existing "random" value in this codebase
(`drawItem`, `generateEncounterChoices`, `objectiveForKind`) is produced
either via an injected `RandomSource = () => number` (for values a
*caller* controls test determinism over) or a pure hash formula (for
values that must be reproducible from data alone, like
`seededTargetSeconds`). Track generation is the second kind — nothing
about "what track does stage 3 use" should depend on call-order or an
injected function a test can swap; it must be a pure function of
`(seed, pvpOrdinal)` alone, matching `selectTrack`'s existing contract
being replaced. A single small PRNG seeded once, then drawn from
repeatedly within one `generateTrack` call, is simpler and more
readable than re-deriving a fresh hash for every individual value the
way `seededTargetSeconds` does for its one output.

**Alternatives considered**:
- Re-derive every value from its own hash formula (no PRNG object at
  all), matching `seededTargetSeconds`'s exact style: rejected — a
  track needs 15-25 independent random draws (corner count, direction,
  N corner angles, N straight lengths); writing that many distinct hash
  formulas is more code and harder to review than one seeded generator
  drawn from repeatedly, for no determinism benefit (both approaches
  are equally pure and equally deterministic).
- A published PRNG npm package: rejected — no new runtime dependency is
  needed for ten lines of well-known, public-domain PRNG code
  (Technical Context).

## Decision 3: Segment count and size bounds

**Decision**: `cornerCount` is drawn uniformly from `[6, 10]` (and an
equal number of straights, one between each pair of consecutive
corners). Each corner's angle is drawn from a range centered so the
pre-scaling sum lands close to 360° (avoiding an extreme scale factor),
then scaled to sum to exactly 360°. Each straight's length is drawn from
a fixed range independent of corner count. The resulting abstract shape
is then uniformly scaled and translated to fit within the same
bounding box `013-race-spectacle`'s three hand-authored tracks already
share (`x: 70-560, y: 84-320`), so `013`'s existing fixed-layout
rendering (standings sidebar position, etc.) needs no change.

**Rationale**: 6-10 corners is comparable in visual density to today's
hand-authored tracks (which use ~20 raw points to approximate smooth
curves) while staying small enough to keep every characteristic score
meaningfully sensitive to any one corner. Preserving the existing
bounding box is what makes FR-011 ("zero changes to `013`'s own
rendering code") actually true — `013`'s layout code was written
assuming a fixed track footprint, not a dynamic one.

**Alternatives considered**:
- Let generated tracks use an arbitrary/unbounded footprint and update
  `013`'s layout to be footprint-aware: rejected — directly contradicts
  FR-011 and this feature's own "additive, zero changes to `013`'s own
  code" constraint; normalizing the generated shape into the existing
  footprint is strictly simpler than making three other files
  footprint-aware.

## Decision 4: Characteristic scoring formulas

**Decision**: Every corner is given a notional "length" proportional to
its own turn angle (`cornerLength = turnDegrees * CORNER_LENGTH_PER_DEGREE`),
so a track's total notional length is its straight length plus this
cornering length. From that:

- `powerDemand = round(100 * totalStraightLength / totalNotionalLength)`
- `corneringDemand = round(100 * totalCorneringLength / totalNotionalLength)`
  (so these two are near-complementary, mirroring the real
  high-downforce-vs-power spectrum research for this feature already
  confirmed — spec.md FR-005/SC-003)
- `brakingDemand = round(100 * clamp(sharpCornerAngleSum / BRAKING_REFERENCE, 0, 1))`,
  where `sharpCornerAngleSum` sums `turnDegrees` only for corners above
  a fixed sharpness threshold (`SHARP_CORNER_DEGREES`), and
  `BRAKING_REFERENCE` is calibrated so a track with the maximum corner
  count all at a very sharp angle scores at or near 100 — kept
  independent of `powerDemand`/`corneringDemand` since a track can be
  corner-heavy with only gentle sweeping corners (low braking demand,
  matching Silverstone's real classification) or have few corners that
  are each a hairpin (high braking demand despite a lower overall
  cornering share).

**Rationale**: Directly implements FR-005's three behavioral
constraints and the real-motorsport grounding from this feature's own
spec research (high-downforce/cornering vs. power circuits as the
primary classification axis; braking-zone severity as a genuinely
independent secondary axis, since a track's corner *count/tightness*
and its braking *severity* are different physical quantities in real
circuits).

**Alternatives considered**:
- Derive `brakingDemand` as a fixed function of `corneringDemand`
  (e.g. `brakingDemand = corneringDemand`): rejected — collapses two
  axes research showed are genuinely independent (Silverstone:
  high-speed corners, low braking; Baku: a mix of very sharp corners
  and brutal braking zones alongside the longest straight on a real
  calendar) into one, defeating the purpose of scoring them separately.

**Exact constant values** (`CORNER_LENGTH_PER_DEGREE`,
`SHARP_CORNER_DEGREES`, `BRAKING_REFERENCE`, the corner-count and
segment-length ranges) are balance-pass placeholders — chosen to
produce sane, well-distributed 0-100 scores across the full range of
generatable tracks, not fixed by this specification, matching how prior
features (e.g. `016`'s `TIER_BONUS_PERCENT`) leave tuning constants open
for a later pass.

## Decision 5: Build track-fit derives from existing `installationCategory` only, folded as a new per-lap `trackFit` field

**Decision**: A build's "lean" is
`(powerItemCount - chassisItemCount) / totalCategorizedItemCount`
(range `[-1, 1]`; `0` for an empty or exactly-balanced build) over its
*installed* items only (board slots, matching how installation/synergy
already only consider installed items — storage items are inert for
this purpose, consistent with their existing "inert unless
`activeWhileStored`" rule). A track's "bias" is
`(powerDemand - corneringDemand) / 100` (range `[-1, 1]`).
`simulatePlayerLaps`'s new optional `track` parameter, when supplied,
computes `fitPercent = lean * bias * TRACK_FIT_MAX_PERCENT` once per
lap and applies it as a lap-time scale
(`adjustedTime = time * (1 - fitPercent / 100)`), then records the
result as a new `trackFit: { appliedPercent: number; appliedSeconds:
number }` field directly on that lap's result (`PlayerLap`/
`LapBreakdown`) — a lap-level value, not an item-level one, mirroring
the existing precedent that `preClampLapTime`/`clampAdjustment`/
`resultingLapTime` are already lap-level (not item-level) inspectable
quantities threaded through every lap's result.

**Rationale**: Reuses `installationCategory`, already authored on every
item, satisfying FR-006 with zero new `ItemDefinition` fields. Applying
the effect as a lap-time *scale* (not a flat per-lap seconds constant)
keeps its magnitude proportional to how much time is already on the
table, avoiding a fixed-seconds bonus that would matter far more on a
short lap count than a long one. Recording it as its own named field
(rather than silently folding it into `resultingLapTime` with no
trace) is what makes FR-012/Constitution Principle III actually true —
a player (or a future pre-race-setup screen) can see exactly how much a
given race's outcome came from track-fit versus items.

**Alternatives considered**:
- Fold track-fit into `ContributionEvidence` (today's item-level
  attribution shape): rejected — every existing field on
  `ContributionEvidence` (`sourceItemId`, `sourceLocation`) assumes the
  contribution belongs to one specific held item; track-fit belongs to
  the build/car as a whole, not any single item, so forcing it into
  that shape would mean inventing a fake synthetic item to attribute it
  to.
- A flat per-lap seconds bonus/penalty instead of a percentage scale:
  rejected — a flat bonus would be worth a different fraction of total
  lap time depending on lap count/base pace, making its felt impact
  inconsistent across the four widened PvP stages
  (`017-season-structure-grow`'s 10/12/14/16 lap-count progression).

## Decision 6: Both `resolveContest` overloads generate exactly one track per contest and apply it identically to every car

**Decision**: The N-car `resolveContest` overload calls
`generateTrack(seed, level)` once (reusing its own existing `seed`/
`level` parameters — `level` already *is* `pvpOrdinal`, per
`012-multi-ghost-contest`'s existing contract) and passes the same
`Track` to every `simulatePlayerLaps` call it makes, for the player and
all seven rivals alike. This is a **new** call added to `resolveContest`
by this feature — `resolveContest` has no track concept today. It is
separate and distinct from `src/scenes/ContestScene.ts:80`'s existing
`selectTrack(input.seed, input.level)` call (013-race-spectacle,
rendering-only, today's only production caller of `selectTrack`,
confirmed by direct codebase search) — that call is migrated to
`generateTrack` on its own, in US1 (tasks.md T017), independently of
`resolveContest`'s new US2 call (tasks.md T031). The legacy 2-car
overload does not generate or apply a track at all — it keeps today's
track-agnostic behavior unchanged, since it has no `pvpOrdinal`/`level`
concept to generate from and nothing in this feature's scope requires
changing it.

**Rationale**: FR-009 requires no car be exempt from track-fit within a
contest that has one — using one shared track for the whole field is
the only way every car races "the same race," matching how the track
itself already renders identically for every viewer
(`013-race-spectacle`'s own canonical-result requirement). The legacy
overload is exercised by dozens of existing unit tests
(`resolveContest(build, ghost, lapCount)`) that have no seed/ordinal to
generate from; leaving it untouched is both correct (it predates the
N-car/track concept entirely) and required by FR-007's "every existing
call site that doesn't opt in stays unchanged."

**Alternatives considered**:
- Generate a fresh track per car (asymmetric tracks per car in the same
  contest): rejected — contradicts the premise of a single race with a
  single field; no real motorsport or existing project concept
  supports different cars racing different physical tracks
  simultaneously.
