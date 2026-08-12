# Research: Contextual Physics Effects

## Decision 1: What "the corner a phase is associated with" means

**Decision**: `simulateLapPhysics` already flattens a lap into per-corner
inter-apex spans (`for (let i = 0; i < cornerCount; i += 1)`, `tracks.ts:350`),
where span `i` runs from `corners[previous]`'s exit through the intervening
straight to `corners[i]`'s entry and apex. Verified directly against the
current implementation: a span can produce up to three phases —
`accelerating`, `cruising`, `braking` — and each stat maps to exactly one
natural corner association within that span:

| Stat | Where it's consumed today | Natural corner association |
|---|---|---|
| `corneringSpeed` | `apexSpeed(turnDegrees, stat)` — computed once per corner, *before* any span is solved (`tracks.ts:345`) | That corner, directly — not phase-based at all |
| `acceleration` | The span's `accelerating` phase, ramping away from `entrySpeed` (`apexSpeeds[previous]`) | `corners[previous]` — the corner just exited |
| `brakingPower` | The span's `braking` phase, ramping down to `exitSpeed` (`apexSpeeds[i]`) | `corners[i]` — the corner about to be entered |
| `topSpeed` | The span's `cruising` phase — the only phase not adjacent to one specific corner | Both bounding corners (see below) |

**Rationale**: This isn't a new model layered on top of the engine — it's
the association the engine's own existing per-span/per-corner structure
already implies once you ask "which corner does this number belong to."
Acceleration and braking already read as "out of" and "into" a corner in
`021`'s own code comments; corneringSpeed already reads as a per-corner
value (`apexSpeeds[i]`, an array indexed by corner). Only `topSpeed` has no
single natural corner — a cruising phase is definitionally the part of the
straight *not* being spent accelerating or braking.

**topSpeed's rule**: a `topSpeed` condition matches a span's cruising phase
if **either** bounding corner (`previous` or `i`) satisfies the condition.
Rationale: a short straight boxed in by two hairpins reads naturally as
"tight-corner context" even though the cruising phase itself is mid-straight;
requiring *both* corners to qualify would make `topSpeed` conditions
activate far less often than the other three stats for the same authored
threshold, breaking the rough parity `021`'s point-budget calibration
already established between stats. This is documented as a deliberate
asymmetry, not an oversight — spec.md FR-008 requires all four stats be
usable, not that all four resolve identically.

**Alternatives considered**:
- *Require both bounding corners to qualify for topSpeed*: rejected — makes
  topSpeed conditions systematically weaker than the other three for an
  identical threshold, undermining balance without a compensating benefit.
- *Give topSpeed no corner association at all (conditions simply never
  apply to it)*: rejected — directly contradicts spec.md FR-008's explicit
  "MUST NOT be special-cased" requirement.
- *Split every span into finer sub-phases so topSpeed gets its own
  single-corner association*: rejected — would change `021`'s existing
  phase-emission contract (three phase kinds, `contracts/physics-
  simulation-contract.md` §3/§4) for no behavioral gain, and cruising is
  legitimately the one phase kind with no single owning corner.

## Decision 2: `apex` is a declared, unused `LapPhaseKind`

**Verified directly against the code** (`types.ts:108`,
`grep -n "\"apex\"" src/simulation/*.ts` → no matches outside the type
declaration): `LapPhaseKind` includes `"apex"`, but neither `SpanPhase`
(`tracks.ts:237`) nor `simulateLapPhysics`'s phase emission ever produces
one — only `"accelerating" | "cruising" | "braking"` are ever pushed.
`corneringSpeed`'s conditional resolution therefore cannot hook into "the
apex phase" as a breakdown entry, because no such entry exists at runtime.

**Decision**: `corneringSpeed` conditions are evaluated where `apexSpeed`
is actually computed (`tracks.ts:345`, once per corner, before spans are
solved) — not through the phase-breakdown array. US3's inspectability
(FR-006) surfaces this separately: a new field on the phase(s) belonging to
that corner's own span reports whether its `corneringSpeed` condition was
met, without requiring a dedicated "apex" phase entry to exist.

**Rationale**: Minimal, additive change — extending `apexSpeed`'s existing
per-corner call site is smaller than introducing a new phase kind that
`021`'s existing consumers (contracts §3/§4's `Σ phases[].seconds =
totalSeconds` invariant) never anticipated. Leaves the dead `"apex"` type
member exactly as-is; removing it is out of scope (no consumer depends on
its absence, and touching an unrelated `021` type is unnecessary blast
radius for this feature).

## Decision 3: Data shape — a new sibling field, not a change to `ItemPhysicsContribution`

**Decision**:

```ts
export interface PhysicsCondition {
  kind: "corner-tightness";
  direction: "at-least" | "at-most";
  turnDegrees: number;
}

export interface ConditionalPhysicsContribution {
  condition: PhysicsCondition;
  delta: ItemPhysicsContribution; // reuses the existing four-field delta shape
}
```

`ItemDefinition` gains one new optional field:
`conditionalPhysics?: readonly ConditionalPhysicsContribution[]` — an
array, since one item may condition different stats (or the same stat
under different thresholds) independently. `021`'s existing `physics?:
ItemPhysicsContribution` field is completely untouched.

**Rationale**: Matches spec.md FR-001's explicit framing ("in addition to
— not replacing") literally: the flat contribution and the conditional
list are two independent, optional fields, exactly mirroring how `014`
added `synergyEffects?: readonly SynergyEffect[]` alongside the pre-
existing `buff`/direct-item fields without touching either. `PhysicsCondition`
is a discriminated union of one kind today, deliberately shaped like `014`'s
own `SynergyCondition` (`types.ts:130`, itself documented as "open to a
third kind later") so FR-007's extensibility requirement is satisfied by
construction, not by a promise.

**Alternatives considered**:
- *Add an optional `condition` field directly onto `ItemPhysicsContribution`
  itself*: rejected — would force every consumer of the existing flat-only
  field (all of `021`'s shipped code) to reason about an optional condition
  that's almost always absent, and conflates "this item's baseline
  contribution" with "this item's conditional contribution" in one shape,
  when an item may legitimately want both simultaneously (e.g. a small flat
  `topSpeedDelta` plus a larger conditional `accelerationDelta`).
- *A single conditional contribution per item (not an array)*: rejected —
  unnecessarily forecloses items that condition more than one stat (spec.md
  US4 explicitly requires all four stats be independently usable, and
  nothing in the spec limits an item to one condition).

## Decision 4: Engine integration point — `simulateLapPhysics` gains one new optional parameter

**Decision**: `simulateLapPhysics`'s signature extends to:

```ts
export function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
  conditionalContributions: readonly ConditionalPhysicsContribution[] = [],
): { totalSeconds: number; phases: LapPhaseBreakdown[] }
```

Internally: per corner `i`, an effective `corneringSpeed` is resolved
(`stats.corneringSpeed` + every matching contribution's `corneringSpeedDelta`
for corner `i`) before calling `apexSpeed`. Per span `i`, an effective
`{ acceleration, brakingPower, topSpeed }` is resolved (base + matching
contributions per Decision 1's table) before calling `solveSpan` — so
`solveSpan` itself keeps its existing four-argument contract unchanged;
only its caller now passes a per-span-resolved `PhysicalStats` instead of
the single build-wide one.

In `laps.ts`, a new small function mirrors `resolvePhysicalStats`'s
existing active-item filtering to collect every active item's
`conditionalPhysics` entries into one flat list, passed as
`simulateLapPhysics`'s third argument.

**Rationale**: Default parameter value `[]` is what makes FR-005/SC-003's
zero-regression guarantee mechanical rather than aspirational — every
existing call site (including `021`'s entire test suite, none of which
passes a third argument) continues to resolve the exact same
per-span/per-corner `stats` object every time, because an empty
contributions list can never match any condition. `solveSpan` staying
untouched in its own signature keeps `021`'s existing `solveSpan`-specific
tests (contract §3) valid without modification.

**Alternatives considered**:
- *Resolve one build-wide "effective" `PhysicalStats` upfront by taking
  conditions' worst/best case*: rejected — this is exactly the kind of
  lossy aggregate `021` was built to replace `018`'s `trackFit` ratio with;
  reintroducing an aggregate here for conditional items would undo the
  whole point of this feature.
- *A parallel `simulateConditionalLapPhysics` function instead of extending
  the existing one*: rejected — `021` and `020` both established the
  precedent of extending the one real simulation function rather than
  forking a second path (`021` research.md Decision 7's "resolveContest
  requires zero changes" reasoning applies here in reverse: one true path
  is easier to keep correct than two).

## Decision 5: Stacking — pure additive, no interaction, no precedence

**Decision**: Multiple conditional contributions (from the same item or
different items) targeting the same stat and matching the same phase/corner
sum directly, exactly like `021`'s existing flat model (`021 contracts/
physics-simulation-contract.md` §1 — "MUST be derived from a stock
baseline plus every held item's own `ItemPhysicsContribution`, summed";
note this is a distinct claim from `021 research.md` Decision 6, which
covers `physicsLapTime + Σ(timeModifier)` additivity, not item-to-item
summation). No override, no "strongest wins," no precedence rules.
An unconditional (`physics`) delta and any number of matching conditional
(`conditionalPhysics`) deltas for the same stat simply add together for
whichever phases the conditional ones qualify for.

**Rationale**: Directly required by spec.md's Edge Cases section
("MUST sum additively... no interaction, no override, no precedence rules
needed") and FR-004. Consistent with every other additive fold in this
codebase (buff stacking aside, which is an intentionally different,
percent-based mechanic this feature does not touch).
