# Research: Stat-Targeted Amplifiers

## Decision 1: `StatTarget` — a new, small, additive discriminator

**Decision**:

```ts
export type StatTarget = "time" | "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";
```

`Buff` and `SynergyEffect` each gain an optional `targetStat?: StatTarget`.
Omitting it defaults to `"time"` — today's only behavior, unchanged.

**Rationale**: Mirrors `022`'s own `PhysicsCondition.kind` precedent (a
small closed set, deliberately not open-ended) and `014`'s `SynergyTarget`
discriminated-union pattern. `"time"` as an explicit member (not `undefined`
meaning something implicit) keeps every downstream branch exhaustive and
self-documenting — a switch/lookup over `StatTarget` never needs a silent
fallback case.

**Alternatives considered**:
- *`targetStat` required, no `"time"` member, legacy items migrated*:
  rejected — violates FR-001/FR-002's explicit "omitting it MUST default to
  time" zero-regression requirement, and would force a content migration
  this feature doesn't need.
- *Reuse `PhysicsCondition`'s stat-key naming (`accelerationDelta`, etc.)
  instead of bare stat names*: rejected — `targetStat` names a *stat*, not a
  *delta field*; keeping it as the bare `PhysicalStats` key names
  (`acceleration`, not `accelerationDelta`) reads correctly at both the
  contribution-evidence layer and the authoring layer, and a small internal
  `deltaKeyFor(stat)` mapping function bridges the two where needed (Decision
  6).

## Decision 2: Buff eligibility for a stat target is structural, not `identityTag`

**Decision**: `identityTag` continues to gate eligibility exclusively for
`"time"`-targeted Buffs, completely unchanged (`buffs.ts`'s existing
`hasMatchingDirectItem` check, byte-identical). A stat-targeted Buff's
eligibility is a new, independent structural check: does at least one other
active held item have a delta (flat `physics` or any `conditionalPhysics`
entry) for the targeted stat.

**Rationale**: `identityTag` is a single-value type (`"performance"` is the
only value that exists, `types.ts:15`) — it cannot discriminate by stat, and
repurposing it would be a breaking redefinition, not an extension. FR-005
requires this explicitly. A new pure helper analogous to `022`'s
`matchesPhysicsCondition` makes the structural check isolated and testable:

```ts
function hasDeltaForStat(item: ItemDefinition, stat: Exclude<StatTarget, "time">): boolean;
```

**Alternatives considered**:
- *Widen `IdentityTag` to a per-stat union and reuse it for both time and
  stat targeting*: rejected — conflates two genuinely different concerns
  (an opt-in Buff-eligibility flag vs. "what does this item's own delta
  shape actually contain") and would ripple into every existing
  `identityTag`-reading call site for no behavioral gain.

## Decision 3: `SynergyResolution.appliedDeltaPercent` becomes a per-stat map

**Decision**:

```ts
export interface SynergyApplication {
  sourceItemId: string;
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  targetStat: StatTarget;          // NEW
  description: string;
}

export interface SynergyResolution {
  appliedDeltaPercent: Partial<Record<StatTarget, number>>;  // was: number
  applications: SynergyApplication[];
}
```

**Rationale**: A single target item can receive synergy boosts from two
*different* source items targeting two *different* stats simultaneously
(item A tagged both `gearing` and `aerodynamics`; a `gearing`→`acceleration`
Boost-Others effect and an `aerodynamics`→`topSpeed` Boost-Others effect can
both legally match it at once). A single flat percent cannot represent that;
a per-`StatTarget` map can, and every existing consumer that only ever cared
about `"time"` reads `appliedDeltaPercent.time ?? 0` — one extra key lookup,
same value, same behavior.

**Alternatives considered**:
- *Keep one flat percent, restrict a synergy target item to matching at
  most one stat-targeted effect at a time*: rejected — an arbitrary,
  unmotivated authoring restriction with no basis in spec.md, and brittle
  against future content (two source items with overlapping tags targeting
  different stats is a completely ordinary authoring pattern, not an edge
  case).

## Decision 4: Percent composition stays compounding, not additive — same order as today

**Decision**: A stat-targeted Synergy percent folds into an item's own
`physics`/`conditionalPhysics` delta values **once**, before the per-lap
loop (Synergy is lap-invariant, `022`/`014` precedent, and FR-012 makes this
explicit for stat targets too). A stat-targeted Buff's accumulated percent
for that lap is applied **on top of** the already-synergy-adjusted delta,
inside the per-lap loop. Both stages use the exact same multiplicative
"percent of the value already there" pattern `foldPercentDelta` already uses
for `timeModifier`: `effective = base * (1 + synergyPercent/100) * (1 +
buffPercentThisLap/100)`.

**Rationale**: This is not a new math model — it is the literal existing
`effectiveItem` → per-lap-loop composition order (`laps.ts`), just extended
to a new field. Preserving the exact order (synergy folded once, buff
applied per lap) keeps the two mechanisms' existing, load-bearing precedent
intact rather than inventing a second composition rule that would only
apply to physics.

**Alternatives considered**:
- *Additive percent composition (synergy% + buff% applied once together)*:
  rejected — contradicts the existing, shipped `timeModifier` behavior this
  feature is extending, not replacing; would make `physics`-role items
  compose differently than legacy `timeModifier`-role items for no reason.

## Decision 5: Per-lap physics resolution needs no special-cased short-circuit

**Decision**: `resolvePhysicalStats`/`resolveConditionalPhysicsContributions`
are called fresh every lap, using that lap's own `boostsByStat` (usually the
empty object, meaning every stat's accumulated percent is `0`). No branch
detects "nothing varies this build, use the old code path instead."

**Rationale**: Multiplying a delta by `(1 + 0/100)` is `delta * 1`, which
IEEE754 guarantees is *exact* — no rounding, no re-association risk. Both
functions are already proven pure and deterministic (existing test:
"produces deeply equal results for identical (build, track) inputs across
repeated calls"). Calling a pure, deterministic function N times with
identical inputs (all-zero `boostsByStat`, every lap) therefore produces
`toEqual`-identical output N times — the fresh-each-lap computation
*reduces to* the old once-per-build computation exactly, without needing a
parallel legacy code path to maintain. FR-008's regression guarantee is
still explicitly verified by test (US3), not merely assumed from this
argument.

**Alternatives considered**:
- *Detect "no lap-varying amplifier active" and skip re-resolution,
  reusing lap 1's computed stats for every subsequent lap*: rejected as
  unnecessary — adds a second code path to keep in sync for a performance
  concern that doesn't exist (Technical Context: ≤160 calls worst case) and
  a correctness argument (IEEE754 exactness) that already guarantees
  identical output without it. Simpler to have one code path, always
  exercised, proven correct by test.

## Decision 6: Eligibility is structural (authored shape), not track-conditional

**Decision**: "Does a candidate item have a delta for stat X" (Buff
eligibility, Decision 2) is answered from the item's *authored* shape — its
flat `physics` field and the existence of `conditionalPhysics` entries
targeting that stat — never from whether a `conditionalPhysics` entry
actually fires on the specific track being raced.

**Rationale**: Keeps eligibility a stable, per-build fact (same answer on
every track), independent of `022`'s own per-corner condition matching,
which still governs whether a conditional delta actually contributes to a
given lap's kinematics. Mirrors this project's existing separation of
concerns: `resolvePhysicalStats` decides *what a build's items are capable
of*; `simulateLapPhysics` decides *what actually happens on this track*.
Conflating the two would make a Buff's own eligibility silently different
from track to track, which is exactly the kind of hard-to-explain modifier
Principle III (Transparency & Legibility) prohibits.

**Alternatives considered**:
- *Eligibility requires the conditionalPhysics entry to actually match the
  specific track/lap*: rejected — ties a Buff's basic "does it do anything"
  status to which track got generated, an unnecessary and confusing coupling
  with no spec requirement driving it.

## Decision 7: `simulateLapPhysics`/`solveSpan` (`tracks.ts`) are untouched

**Decision**: This feature changes only `simulatePlayerLaps`'s calling
pattern — invoking `simulateLapPhysics` once per lap instead of once per
build, with that lap's own resolved `PhysicalStats`/`conditionalPhysics`
list. `simulateLapPhysics`'s own four-line signature, `solveSpan`'s
four-argument contract, and every binding clause in `021`'s/`022`'s own
contracts on those two functions remain completely unchanged.

**Rationale**: Direct continuation of `022`'s own Decision 4 — "`solveSpan`
receives no task... only what its caller passes into it changes." This
feature is one more instance of the same shape: the callee's contract is
already general enough (a `PhysicalStats` argument, computed however the
caller likes) to support per-lap variance with zero modification.

**Alternatives considered**: None seriously considered — `022` already
proved this exact pattern works and is the established convention; there
was no reason to deviate.

## Decision 8: Tiering's fix is passive and independent — no `targetStat` of its own

**Decision**: `applyTierBonus` gains logic to also scale a held item's own
resolved `physics`/`conditionalPhysics` deltas by `TIER_BONUS_PERCENT *
(tier - 1)`, applied uniformly to whichever stat(s) the item's own deltas
already touch — no new authored field, no stat selection.

**Rationale**: Tiering boosts *the item itself* becoming a better copy of
what it already does — there is no "which stat does tiering favor" question
the way there is for an external Buff/Synergy choosing what to amplify.
Applying `applyTierBonus` before an item enters the located-items pipeline
(exactly where it already runs today) means a tiered item's *bigger* base
delta is what Buff/Synergy then potentially amplify further on top — correct
layering by construction, no special-casing needed between US5 and
US1-US4's mechanisms.

**Alternatives considered**:
- *Give Tiering its own `targetStat`-like selection, boosting only one
  chosen stat per tier*: rejected — no motivating use case in spec.md, and
  contradicts Tiering's existing, established semantics (it boosts
  everything the item already does, uniformly — see its current
  `timeModifier`/`buff.boostPercent` handling).
