# Research: Arcade Physics Simulation

## Decision 1: The lap flattens into inter-apex spans, each solved by the standard trapezoidal velocity-profile formula

**Decision**: A closed lap has exactly one apex point per corner. Between
two consecutive apex points (wrapping around the start/finish for the last
corner back to the first) is one **span** — the exit portion of one
corner's arc-length, plus any intervening straight's full length, plus the
entry portion of the next corner's arc-length. Each span is solved
independently and identically, given only: its own total distance `D`,
entry speed `v0` (the previous apex speed, or the finish-line carry-over
speed for the first span of a lap), a **required** exit speed `v1` (the
next apex speed), the build's `topSpeed`, `acceleration`, and
`brakingPower`.

The closed-form solution (a standard motion-profile result — accelerate,
optionally cruise at `topSpeed`, then brake, such that the car covers
exactly `D` and ends at exactly `v1`) is:

```
v_peak² = (2·a·b·D + b·v0² + a·v1²) / (a + b)
```

where `a` = acceleration, `b` = braking power (deceleration magnitude).
If `v_peak > topSpeed`, the car accelerates to `topSpeed`, cruises, then
brakes to `v1` — three phases. Otherwise `v_peak` is reached with no
cruise phase — two phases (or the car may even need to brake from the
very start, if `v0 > v_peak`). Each phase's own time is then derived from
the standard `t = Δv / rate` (accelerate/brake phases) or `t = d / topSpeed`
(cruise phase) relations. Total lap time is the sum of every span's time
plus a small, tunable per-corner apex-hold time (Decision 4).

**Rationale**: This is real, closed-form kinematics — not a per-tick
physics loop, not a hand-waved percentage. It is the same trapezoidal
motion-profile result used by real point-mass lap-time simulation tools in
motorsport engineering, scaled down to exactly the "arcade, not Gran
Turismo" ceiling this feature's own spec sets: no lateral-G tire model, no
weight transfer, no slip angles — just accelerate/cruise/brake against
three build stats and a target speed. It directly satisfies FR-003's
"straight too short to reach top speed" requirement (the formula naturally
produces `v_peak < topSpeed` when `D` is small) and FR-004's entry/apex/
exit requirement (the braking half of one span *is* the next corner's
entry phase; the accelerating half of the following span *is* that
corner's exit phase).

**Alternatives considered**:
- A per-tick numerical integration (advance speed by a small time-step,
  accumulate distance until the segment is covered): rejected — same
  physical result as the closed-form formula but non-deterministic
  performance-wise, harder to unit-test exactly (floating-point step-size
  sensitivity), and no behavioral benefit over an exact algebraic solution
  that exists for constant acceleration/braking rates.
- Treat straights and corner entry/exit as fully separate, independently-
  solved segments rather than flattening into one continuous span:
  rejected — this is exactly the seam that would make a short straight
  between two corners behave incorrectly (the naive per-segment approach
  can't express "never reached full speed because the corner right after
  needed braking too soon" without first computing how much of the
  straight the braking zone consumes, which the span formulation handles
  for free).

## Decision 2: Corners get a new, physics-only arc-length — separate from their zero-length geometric representation

**Decision**: `018`'s existing turtle-walk (`deriveTrackPoints`) treats a
corner as an instantaneous heading change at a single point — zero
geometric length, by design, since that's what makes `pointAtProgress`'s
straight-line-interpolation-between-vertices rendering model correct
(FR-012 requires this stays untouched). This feature adds a **second,
independent** notion of corner length used only by physics: an arc-length
derived from the corner's own `turnDegrees`, in the same abstract distance
units as straight segment lengths, split into an entry portion and an exit
portion (Decision 4 covers the split ratio). The two representations
coexist without conflict — rendering reads `Track.points` (unchanged);
physics reads `Track.segments` directly and derives its own arc-length from
each corner's `turnDegrees` on demand.

**Rationale**: Real cornering behavior (FR-004) requires a corner to *take
distance and time* to traverse, distinct from the straights around it —
otherwise "entry/apex/exit" has nothing to measure across. Since `018`'s
existing geometry never needed this (a polygon's vertices are dimensionless
by definition), it has to be introduced fresh, not repurposed from
anything that already exists.

**Alternatives considered**:
- Derive corner arc-length from the same formula `trackCharacteristics`
  already uses for `corneringDemand` scoring
  (`turnDegrees^CORNER_LENGTH_EXPONENT * CORNER_LENGTH_SCALE`): considered,
  but rejected as the literal formula — that formula was tuned to produce
  well-distributed *scores* across generatable tracks (a relative-ranking
  concern), not calibrated to produce physically sensible distances at the
  same scale as real straight lengths (an absolute-magnitude concern). The
  same *shape* of formula (a tunable exponent of `turnDegrees`) is reused,
  but with its own separate, physics-calibrated constants — kept as a
  distinct named formula in `data-model.md` rather than a shared function,
  the same way `018`'s scoring formula and this feature's physics formula
  are allowed to diverge in tuning even if they rhyme in shape.
- Treat corner length as always zero (all entry/exit deceleration and
  acceleration happens on the adjacent straights only): rejected — this is
  simpler but contradicts the explicit ask for entry/apex/exit as phases
  *within* a corner, not phases of the straights bordering it.

## Decision 3: Apex speed is a `sqrt`-shaped function of corner severity and the build's cornering-speed stat

**Decision**: `apexSpeed = corneringSpeedStat × sqrt(referenceAngle / turnDegrees)`,
bounded to a sane floor so it never reaches zero or negative for the
sharpest legal corner (`turnDegrees` is already bounded to `(0, 150)` by
`018`'s own closure contract). `referenceAngle` is a tunable constant
representing "the angle at which the build's own `corneringSpeedStat`
value is exactly its apex speed" (i.e., a normalization point).

**Rationale**: Real cornering physics has max speed roughly proportional to
`sqrt(radius)` (from `v² = μgr`); a sharper turn implies a smaller radius,
and `turnDegrees` is inversely related to radius for a fixed corner
"footprint." A `sqrt(1/turnDegrees)` shape is the arcade-appropriate nod to
that real relationship — enough to feel physically grounded (sharper
really does mean slower, in a smoothly diminishing way, not linearly) —
without requiring an actual radius/friction-coefficient model.

**Alternatives considered**:
- Linear (`apexSpeed = corneringSpeedStat × (referenceAngle / turnDegrees)`):
  rejected — falls off too aggressively for sharp corners relative to real
  cornering-speed intuition, and produces a less natural-feeling spread
  across the generatable `(0,150)` corner range than the square-root form.

## Decision 4: Entry/exit split and apex hold time are tunable constants, not fixed by this research

**Decision**: Each corner's own arc-length splits into entry and exit
portions via a single tunable ratio (a symmetric 50/50 default is a
reasonable starting point); an apex itself may optionally hold a small,
separately-tunable "at minimum speed" distance/time rather than being a
literal zero-duration instant. Exact values are `data-model.md`/balance-pass
decisions, following this project's established convention (`018`'s own
segment-count/angle-range/scoring constants were left the same way).

**Rationale**: Neither choice is observable or testable at the contract
level — the spec's binding requirements (FR-003, FR-004, SC-001, SC-002)
hold for any reasonable choice of these two ratios. Fixing them here would
be premature precision without a behavioral reason to prefer one number
over another.

## Decision 5: Item attribution happens at the physical-stat level; phase attribution happens at the lap level — not per-item-per-phase-seconds

**Decision**: Every item that carries an `ItemPhysicsContribution` reports
its contribution as a plain delta to one or more of the four physical
stats (e.g., "+2 acceleration") — directly inspectable, the same
transparency guarantee `ContributionEvidence` already gives every existing
item. Separately, each simulated lap reports a phase breakdown (time spent
accelerating/cruising/braking/cornering, per `018` segment) at the
**build** level, not per-item. A player can see exactly which items
produced the build's four stats, and exactly how those stats played out
phase-by-phase against a given track — but not a literal "item X saved
exactly 0.3s in the braking phase" figure.

**Rationale**: Satisfies FR-009's "no opaque total" requirement without
requiring a counterfactual per-item marginal computation (re-simulating
the whole lap once per held item, with that item's contribution removed,
to isolate its exact seconds effect) — which would be both expensive
(`O(items)` full-lap simulations instead of one) and, more importantly,
ill-defined the moment two items' stat contributions interact non-linearly
inside the trapezoidal formula (removing one item can change *which*
phases exist at all for a given span, not just their durations, making
"this item's seconds" a genuinely ambiguous quantity to assign). Stat-level
attribution is exact, cheap, and consistent with how every existing buff/
synergy contribution in this codebase is already shown as a percentage/
delta rather than a literal isolated seconds figure.

**Alternatives considered**:
- Per-item marginal seconds via counterfactual re-simulation: rejected for
  the cost and non-linearity reasons above.
- No phase breakdown at all, only a final total: rejected outright — this
  is the literal defect (`buildTrackLean`'s opaque ratio) that motivated
  removing `018`'s mechanic in the first place; repeating it here for the
  richer replacement would be a regression on Constitution Principle III.

## Decision 6: `timeModifier` items keep contributing exactly as today, additively on top of the physics-computed time

**Decision**: `finalLapTime = physicsLapTime(build's 4 stats, track.segments) + Σ(existing flat timeModifier contributions, buffed exactly as today) `, then clamped to `MIN_LAP_TIME` exactly as today. When no track is supplied, `physicsLapTime` is not computed at all — the formula collapses to today's exact `baseLapTime + Σ(timeModifier contributions)`, satisfying FR-007 by construction rather than by a parallel code path that has to be kept in sync.

**Rationale**: This is the same additive-parameter pattern `018`'s own
`trackFit` used, and the same reasoning applies: every item authored before
this feature keeps meaning exactly what it means today, with zero
migration required. `020-character-item-pools`' new items are free to use
`ItemPhysicsContribution` instead of (or alongside) `timeModifier`, but
nothing forces existing content to change.

**Alternatives considered**:
- Convert every existing item's `timeModifier` into an equivalent
  physics-stat contribution automatically: rejected — this is real content
  migration work with real balance risk (a flat seconds delta has no
  single "correct" physics-stat equivalent), explicitly out of this
  feature's scope, and unnecessary since the additive coexistence above
  already satisfies FR-008 without it.
- Whether a buff item (`buff.boostPercent`) can amplify another item's
  `ItemPhysicsContribution` the way it amplifies `timeModifier` today: left
  **out of scope** for this feature — no existing item combination
  exercises this interaction, and `020`'s own content-authoring pass is
  the natural place to decide whether a buff should reach into physics
  stats at all, once real physics-stat items exist to test it against.

## Decision 7: `resolveContest`'s N-car overload calls this feature's physics simulation exactly where it called `trackFit`'s inputs today

**Decision**: `018`'s `resolveContest` already calls `generateTrack(seed, level)`
once per contest and passes the same `Track` to every car's
`simulatePlayerLaps` call. This feature requires zero change to *that*
wiring — `simulatePlayerLaps` itself now does more with the `track`
argument it already receives. The only change inside `contest.ts` is
deleting the (now-removed) `trackFitPercent`/`buildTrackLean` references
this feature supersedes.

**Rationale**: `018`'s own contract already put the track exactly where
this feature needs it (one shared track per contest, applied identically
to every car) — this feature only changes what `simulatePlayerLaps` does
with a track it was already being handed, not who calls it or with what.

**Alternatives considered**: None — this is a direct, mechanical
consequence of `018`'s existing, already-shipped wiring; no design choice
exists here beyond confirming it needs no change.
