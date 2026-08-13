# Stat-Targeted Amplifiers Contract

This contract defines the framework-free interfaces this feature adds to
`src/simulation/`'s existing Buff, Synergy, physics, and Tiering modules.
Exact TypeScript names may follow repository conventions, but these inputs,
outputs, and invariants are binding. This contract extends `021 contracts/
physics-simulation-contract.md` and `022 contracts/contextual-physics-
contract.md` — every clause there that this contract doesn't explicitly
supersede still applies unchanged.

## 1. Stat Target Contract

```ts
type StatTarget = "time" | "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";
```

Binding behavior:

- `undefined` and `"time"` on `Buff.targetStat` / `SynergyEffect.targetStat`
  MUST be treated identically — both mean legacy `timeModifier`/
  `buff.boostPercent` targeting, unchanged from pre-feature behavior
  (FR-001, FR-002).
- A `StatTarget` other than `"time"` MUST name exactly one of the four
  `PhysicalStats` dimensions — no compound or multi-stat target exists
  (spec.md Edge Cases, Assumptions).

## 2. Buff Eligibility Contract

Binding behavior:

- A `"time"`-targeted Buff's eligibility MUST use `identityTag` exactly as
  today — no change to `isFlatBuff`/`isCountSynergyBuff`/`firesOnLap`'s
  existing role in that path (FR-005).
- A stat-targeted Buff's eligibility MUST be: at least one *other* active
  held item has a delta (flat `physics` or any `conditionalPhysics` entry)
  for the targeted stat. `identityTag` MUST NOT be consulted for this path
  (FR-005, research.md Decision 2).
- Eligibility MUST be evaluated against a candidate's *authored* delta
  shape, never against whether a `conditionalPhysics` entry's corner
  condition would actually be satisfied on a specific track (research.md
  Decision 6).

## 3. Amplification Contract

Binding behavior:

- When a Buff or Synergy effect's `targetStat` names a physical stat, its
  percentage MUST apply multiplicatively to the target item's resolved
  delta for that stat — its flat `physics` field's matching key, and every
  `conditionalPhysics` entry's matching key — using the same
  `value + value * (percent / 100)` pattern already used for `timeModifier`
  (FR-003).
- A stat-targeted amplifier applied to a candidate with no delta for the
  targeted stat MUST contribute exactly 0 for that candidate — no error, no
  fallback to a different stat, no partial credit (FR-004).
- Composition order MUST be: Synergy's stat-targeted percent folds into an
  item's own delta once, before the per-lap loop; a stat-targeted Buff's
  accumulated percent for the current lap is applied on top of that
  already-adjusted delta, inside the per-lap loop (research.md Decision 4).
  The two MUST compound multiplicatively, never sum additively before
  application.

## 4. Per-Lap Physics Resolution Contract

Binding behavior:

- A build's resolved `PhysicalStats` MUST be permitted to vary lap to lap
  when an active stacking Buff targets a physical stat — `simulateLapPhysics`
  is called once per lap, using that lap's own resolved stats, superseding
  `021`'s "resolved once per build, not re-derived per lap" clause for
  exactly this case (FR-007).
- `simulateLapPhysics`'s own signature (three parameters: `stats`,
  `segments`, `conditionalContributions`) and every binding clause on it
  (`021`/`022` contracts) MUST remain completely unchanged — only how often
  and with what `stats`/`conditionalContributions` its caller invokes it
  changes. `solveSpan` receives no change whatsoever (research.md Decision
  7).
- A build with no active lap-varying stat-targeted amplifier MUST resolve
  `PhysicalStats` — computed fresh each lap with an all-zero `boostsByStat`
  — to a value `toEqual`-identical, every lap, to today's shipped
  once-per-build computation (FR-008, research.md Decision 5).
- `PlayerLap.physics.stats` MUST report the actual effective `PhysicalStats`
  used for that lap's own `simulateLapPhysics` call (FR-009) — no assumption
  that it equals any other lap's value may be made by any consumer.

## 5. Inspectability Contract

Binding behavior:

- For any Buff or Synergy application, it MUST be possible to determine
  which `StatTarget` it amplified and whether it found a match, from
  `BuffApplication.targetStat` / `SynergyApplication.targetStat` directly —
  never re-derived from re-running the simulation (FR-010).
- `BuffApplication.appliedSeconds` MUST be populated only when
  `targetStat === "time"`; `appliedStatDelta` MUST be populated only when
  `targetStat !== "time"` — the two MUST NOT both carry a nonzero value for
  the same application.

## 6. Tiering Contract

Binding behavior:

- `applyTierBonus(item, tier)` MUST scale every present field of
  `item.physics` and every present field of each entry in
  `item.conditionalPhysics[].delta` by `TIER_BONUS_PERCENT * (tier - 1)`
  percent, using the same formula already applied to `timeModifier`/
  `buff.boostPercent` (FR-011).
- This scaling MUST apply uniformly to whichever stat(s) the item's own
  deltas already touch — `applyTierBonus` MUST NOT gain a stat-selection
  parameter of its own (research.md Decision 8).
- `applyTierBonus`'s own signature (`(item, tier) => ItemDefinition`) and
  its tier-1-is-a-no-op short circuit remain unchanged.

## 7. Non-Interference Requirements

- Every existing Buff/Synergy/Tiering/physics test MUST continue passing
  unchanged, or be updated only where this contract explicitly requires a
  shape change (`SynergyResolution.appliedDeltaPercent`,
  `BuffApplication`'s new fields) — never a behavioral regression for the
  `"time"`-targeted path.
- `SynergyTarget`/`SynergyCondition`/`matchesTarget`/`resolveConditionPercent`
  (`synergy.ts`) receive zero changes — targeting logic is completely
  orthogonal to what a match's resulting percent is applied to (FR-006).
- No function introduced or modified by this feature may accept or read
  more than one player's `Run`/`Build` at a time (Constitution Principle I,
  unchanged from `021`/`022`).
- `020-character-item-pools`' content authoring is explicitly out of scope
  — this contract defines the capability only; no shipped catalog item is
  authored by this feature.
