# Data Model: Stat-Targeted Amplifiers

## StatTarget

Which stat a Buff or Synergy effect amplifies. `"time"` is the legacy
default (research.md Decision 1).

```ts
export type StatTarget = "time" | "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";
```

| Value | Meaning |
|---|---|
| `"time"` | Legacy behavior — amplifies `timeModifier` (or `buff.boostPercent`, for a buff-of-a-buff — unchanged from today). Default when `targetStat` is absent. |
| `"acceleration"` \| `"topSpeed"` \| `"brakingPower"` \| `"corneringSpeed"` | Amplifies the matching `ItemPhysicsContribution` delta field (flat `physics` plus every matching `conditionalPhysics` entry) on each eligible held item. |

**Validation invariant**: `undefined` and `"time"` MUST be treated
identically everywhere this field is read — both mean "legacy targeting,"
matching this project's existing "absent optional field = neutral default"
convention (`conditionalPhysics`, `021`/`022`).

## `Buff` extension

```ts
export interface Buff {
  boostPercent: number;
  perCount?: boolean;
  targetStat?: StatTarget;   // NEW — absent means "time"
}
```

No other field changes. `perCount`'s existing count-synergy semantics
(`matchingDirectItemCount`) are unaffected by `targetStat` — a count-synergy
buff can target a physical stat exactly as a flat buff can (research.md
Decision 2's eligibility rule applies identically to both).

## `SynergyEffect` extension

```ts
export interface SynergyEffect {
  target: SynergyTarget;
  appliesTo: "others" | "self";
  condition: SynergyCondition;
  description: string;
  targetStat?: StatTarget;   // NEW — absent means "time"
}
```

`target`/`appliesTo`/`condition` are completely unchanged (FR-006) —
`targetStat` only changes what a matched effect amplifies, never which items
match or how the match-count math works.

## `SynergyApplication` / `SynergyResolution` — restructured

**Current shape** (`types.ts`, pre-feature):

```ts
export interface SynergyApplication {
  sourceItemId: string;
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  description: string;
}

export interface SynergyResolution {
  appliedDeltaPercent: number;
  applications: SynergyApplication[];
}
```

**Extension** (research.md Decision 3):

```ts
export interface SynergyApplication {
  sourceItemId: string;
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  targetStat: StatTarget;                            // NEW, always present
  description: string;
}

export interface SynergyResolution {
  appliedDeltaPercent: Partial<Record<StatTarget, number>>;   // was: number
  applications: SynergyApplication[];
}
```

**Migration note**: every existing call site that read
`synergyResolution.appliedDeltaPercent` as a bare number now reads
`synergyResolution.appliedDeltaPercent.time ?? 0` for the equivalent legacy
value — a mechanical, one-line change at each of the (small, known) set of
call sites in `laps.ts`. `resolveSynergyEffects` itself sums each
application's `appliedPercent` into the bucket keyed by its own
`targetStat`, instead of one flat sum.

**Validation invariant**: `appliedDeltaPercent` MUST contain a key only for
stats that had at least one matching, condition-satisfying application that
lap-invariant resolution — no zero-valued keys are inserted (matches the
existing `applications.length > 0 ? synergy : undefined` convention already
used in `laps.ts`'s `LocatedItem.synergy` assignment).

## `BuffApplication` extension

**Current shape**:

```ts
export interface BuffApplication {
  sourceItemId: string;
  targetItemId: string;
  type: "flat" | "stacking" | "count";
  appliedPercent: number;
  appliedSeconds: number;
}
```

**Extension**:

```ts
export interface BuffApplication {
  sourceItemId: string;
  targetItemId: string;
  type: "flat" | "stacking" | "count";
  appliedPercent: number;
  targetStat: StatTarget;             // NEW, always present
  appliedSeconds: number;             // meaningful only when targetStat === "time"; 0 otherwise
  appliedStatDelta?: number;          // NEW — meaningful only when targetStat !== "time"
}
```

**Rationale for two separate applied-amount fields rather than one
overloaded number**: `appliedSeconds` is a *time* quantity; a stat-targeted
buff's applied amount is a *delta-in-that-stat's-own-units* quantity — they
are not interchangeable, and giving them separate, individually-optional
fields keeps each one's meaning unambiguous at every read site (matches
Principle III — a reader must never have to infer which unit a number is in
from context).

## `LapBoosts` (`buffs.ts`) extension

**Current shape**:

```ts
export interface LapBoosts {
  boostsByTag: Partial<Record<IdentityTag, number>>;
  stackingState: StackingState;
}
```

**Extension**:

```ts
export interface LapBoosts {
  boostsByTag: Partial<Record<IdentityTag, number>>;                          // unchanged — "time"-targeted buffs only
  boostsByStat: Partial<Record<Exclude<StatTarget, "time">, number>>;         // NEW
  stackingState: StackingState;
}
```

`computeBoostsForLap` branches per active buff item on its own
`targetStat`: absent/`"time"` → existing `boostsByTag` logic, byte-identical
code path. One of the four physical stats → new `boostsByStat` logic,
eligibility per research.md Decision 2's `hasDeltaForStat` helper instead of
`identityTag` equality; magnitude math (flat / stacking accumulation via
`firesOnLap` / count-synergy via `matchingDirectItemCount`) is the same
arithmetic, just keyed and eligibility-checked differently.

## `resolvePhysicalStats` / `resolveConditionalPhysicsContributions` (`laps.ts`) — signature extension

**Current signatures** (called once per build, outside the per-lap loop):

```ts
function resolvePhysicalStats(activeItems: readonly OfferedItem[]): PhysicalStats;
function resolveConditionalPhysicsContributions(activeItems: readonly OfferedItem[]): ConditionalPhysicsContribution[];
```

**Extension** (called once per lap, inside the loop):

```ts
function resolvePhysicalStats(
  activeItems: readonly OfferedItem[],
  boostsByStat: Partial<Record<Exclude<StatTarget, "time">, number>>,
): PhysicalStats;

function resolveConditionalPhysicsContributions(
  activeItems: readonly OfferedItem[],
  boostsByStat: Partial<Record<Exclude<StatTarget, "time">, number>>,
): ConditionalPhysicsContribution[];
```

Both apply `boostsByStat[stat] ?? 0` multiplicatively to the relevant delta
field(s) — `resolvePhysicalStats` to each active item's own flat `physics`
field before summing into the build total; `resolveConditionalPhysicsContributions`
to each collected contribution's `delta` fields before they're passed into
`simulateLapPhysics`. Synergy's stat-targeted percent is folded in earlier,
once, via `effectiveItem` (research.md Decision 4) — by the time these two
functions run, an item's `physics`/`conditionalPhysics` already reflect any
synergy adjustment; `boostsByStat` (this lap's Buff-only accumulated
percent) is the only thing these two functions apply themselves.

**Zero-regression invariant** (FR-008, research.md Decision 5): called with
`boostsByStat = {}` (every key absent, `?? 0` everywhere), both functions
produce `toEqual`-identical output to their pre-feature, no-parameter
selves, for identical `activeItems` — proven by direct test, not merely
asserted.

## `PlayerLap.physics.stats` — behavior change to an existing field

No shape change (`stats: PhysicalStats`, unchanged type) — but it is no
longer guaranteed to be the same object or value across every lap in one
build's result array. Each lap's entry now reports that specific lap's own
resolved `PhysicalStats`, which differs from other laps' only when an active
lap-varying (stacking, stat-targeted) Buff is present; otherwise every lap's
value is `toEqual`-identical to every other lap's (Decision 5).

## `applyTierBonus` (`tiering.ts`) — extension

**Current signature and behavior** (unchanged): boosts `timeModifier`/
`buff.boostPercent` by `TIER_BONUS_PERCENT * (tier - 1)` percent.

**Extension**: the same percent additionally scales `item.physics`'s
present delta fields and every `item.conditionalPhysics[].delta`'s present
fields, in place, using the identical `value + value * (percent / 100)`
formula already used for `timeModifier`. No new parameters, no new return
shape — `applyTierBonus(item, tier)` still returns one `ItemDefinition`.
