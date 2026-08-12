# Data Model: Arcade Physics Simulation

## `PhysicalStats`

```ts
export interface PhysicalStats {
  acceleration: number;   // speed units per second^2
  topSpeed: number;       // speed units per second
  brakingPower: number;   // speed units per second^2 (deceleration magnitude)
  corneringSpeed: number; // coefficient feeding the apex-speed formula
}
```

| Rule | Source |
|---|---|
| All four fields are positive for any build, stock or modified — a build can never reach zero/negative capability in any dimension (a floor applies after summing item contributions). | spec.md FR-002, Edge Cases |
| Derived once per build (stock baseline + every held item's `ItemPhysicsContribution`, summed), before the per-lap loop — a build's stats don't vary lap to lap, matching `014`'s existing "resolved once, not re-derived per lap" precedent for synergy. | Research Decision 6 |

## `STOCK_PHYSICAL_STATS`

```ts
export const STOCK_PHYSICAL_STATS: PhysicalStats = { /* balance-pass constants */ };
```

The physics-path equivalent of `SpecCar.baseLapTime` for the no-track
path — used only when a `track` is supplied to `simulatePlayerLaps`.
`SpecCar.baseLapTime` itself is untouched and keeps meaning exactly what it
means today for the no-track path (FR-007). Exact stock values are a
balance-pass placeholder (research.md Decision 4's convention) — calibrated
so a stock build's lap time on a typical generated track lands in a
reasonable range, not fixed by this document.

## `ItemPhysicsContribution`

```ts
export interface ItemPhysicsContribution {
  accelerationDelta?: number;
  topSpeedDelta?: number;
  brakingPowerDelta?: number;
  corneringSpeedDelta?: number;
}
```

| Rule | Source |
|---|---|
| A new, optional field on `ItemDefinition` (`physics?: ItemPhysicsContribution`) — additive and independent of `timeModifier`; an item may carry either, both, or neither. | FR-008, Research Decision 6 |
| Every present field is a plain delta, summed directly into the build's `PhysicalStats` alongside every other held item's — no buff/synergy interaction is introduced by this feature (Research Decision 6's explicit scope boundary). | Research Decision 6 |
| No new required field is added to `ItemDefinition` — every item authored before this feature remains valid, unmodified. | FR-008 |

## Corner Arc-Length and Apex Speed

```ts
function cornerArcLength(turnDegrees: number): number; // physics-only, distinct from rendering geometry
function apexSpeed(turnDegrees: number, corneringSpeedStat: number): number;
```

| Rule | Source |
|---|---|
| `cornerArcLength` is a tunable function of `turnDegrees` alone (same general shape as `018`'s `corneringDemand` scoring formula — an exponent of `turnDegrees` — but its own separate constants, calibrated for physical distance, not scoring variance). | Research Decision 2 |
| `apexSpeed = corneringSpeedStat × sqrt(referenceAngle / turnDegrees)`, bounded to a positive floor for the sharpest legal corner (`turnDegrees` approaching 150°, `018`'s own upper bound). | Research Decision 3 |
| Every corner's arc-length splits into an entry portion (feeds the span ending at that corner's own apex) and an exit portion (feeds the span starting from that corner's own apex) via one tunable ratio, applied uniformly to every corner. | Research Decision 4 |
| Neither formula reads anything beyond `turnDegrees`/the build's own `corneringSpeed` stat — no reference to a `Run`, player identity, or other player's data (Constitution Principle I). | contracts/physics-simulation-contract.md §2 |

## Inter-Apex Span Solver

```ts
interface SpanResult {
  peakSpeed: number;
  phases: { kind: "accelerating" | "cruising" | "braking"; seconds: number; distance: number }[];
  totalSeconds: number;
}

function solveSpan(
  distance: number,
  entrySpeed: number,
  exitSpeed: number,
  stats: PhysicalStats,
): SpanResult;
```

| Rule | Source |
|---|---|
| Pure function of its four arguments — no track/build/item lookup inside it; every span in a lap calls this once. | Research Decision 1 |
| `peakSpeed² = (2·a·b·D + b·v0² + a·v1²) / (a + b)`, clamped to `stats.topSpeed` — if the clamped peak is below the algebraic solution, the span has a genuine cruise phase at `topSpeed` between the accelerate and brake phases; otherwise only two phases (or one, if `entrySpeed` already exceeds the algebraic peak and the whole span is braking). | Research Decision 1 |
| `totalSeconds` is the exact sum of its own `phases[].seconds` — the per-span building block that ultimately makes a lap's total time fully reconstructable from parts (FR-009). | Research Decision 5 |

## Lap Assembly

```ts
function simulateLapPhysics(stats: PhysicalStats, segments: readonly TrackSegment[]): {
  totalSeconds: number;
  phases: LapPhaseBreakdown[];
};

export type LapPhaseKind = "accelerating" | "cruising" | "braking" | "apex";

export interface LapPhaseBreakdown {
  phase: LapPhaseKind;
  /** Index into the track's own segments array this phase occurred within/around. */
  segmentIndex: number;
  seconds: number;
}
```

| Rule | Source |
|---|---|
| Flattens `segments` into the sequence of inter-apex spans (Research Decision 1), calling `solveSpan` once per span, plus one fixed apex-hold contribution per corner (Research Decision 4). | Research Decision 1 |
| `Σ phases[].seconds === totalSeconds` exactly — no unexplained remainder (FR-009, SC-004). | Research Decision 5 |
| Called once per car per lap by `simulatePlayerLaps` when a `track` argument is supplied; not called at all otherwise (FR-007). | Research Decision 6 |

## `simulatePlayerLaps` Extension

```ts
function simulatePlayerLaps(build: Build, lapCount?: number, track?: Track): PlayerLap[];
```

| Rule | Source |
|---|---|
| `track` omitted → behavior is byte-for-byte identical to today, including every existing test's expectations — `simulateLapPhysics` is never invoked. | FR-007 |
| `track` supplied → `time = simulateLapPhysics(build's resolved PhysicalStats, track.segments).totalSeconds + Σ(existing timeModifier contributions, buffed exactly as today)`, then clamped to `MIN_LAP_TIME` exactly as today. | Research Decision 6 |
| `018`'s `trackFit` fold is removed entirely from this function — not left dormant, not optional-flag-gated. | spec.md Edge Cases, plan.md Summary |

## `PlayerLap` / `LapBreakdown` Extension

```ts
export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
  contributions: ContributionEvidence[];
  /** 021-arcade-physics-simulation: present only when simulatePlayerLaps was called with a track. */
  physics?: {
    stats: PhysicalStats;
    phases: LapPhaseBreakdown[];
  };
}
```

`018`'s `trackFit?: { appliedPercent, appliedSeconds }` field is **removed**
from `PlayerLap`/`LapBreakdown` — superseded by `physics`, not kept
alongside it (Research Decision 6, spec.md Edge Cases).

`LapBreakdown.physics` is populated by exactly one code path:
`src/scenes/runPresentation.ts`'s `toLegacyContestResult`, which bridges an
`NCarContestResult`'s `PlayerLap`s into `ContestResult.laps` for
`run.history`. This is a deliberate, explicit task (data-model note added
after `/speckit.analyze` finding I1) — verified directly against the
current code that this bridge function's `laps` mapping does not
automatically forward new `PlayerLap` fields; each one, including `018`'s
now-removed `trackFit`, has always needed an explicit line in that mapping.
`ResultScene.ts`, the primary post-race-review surface, is unaffected
either way — it reads `NCarContestResult`/`PlayerLap` directly, never
through this bridge.

## `resolveContest` Integration

| Overload | Behavior |
|---|---|
| N-car (`resolveContest(playerBuild, rivalRoster, level, seed, lapCount?)`) | Its existing `generateTrack(seed, level)` call and the resulting shared `Track` passed to every car's `simulatePlayerLaps` call are **unchanged** (Research Decision 7) — the only edit is removing the now-deleted `trackFitPercent`/`buildTrackLean` references. |
| Legacy 2-car (`resolveContest(build, ghost, lapCount?)`) | Unchanged — no track generated or applied, exactly as `018` already established (FR-011). |

## Validation Invariants

1. `simulateLapPhysics` is pure and deterministic: identical
   `(stats, segments)` always produces a deeply equal result.
2. Every span's `totalSeconds` equals the sum of its own `phases[].seconds`
   (SC-004).
3. A build's `PhysicalStats`, once resolved, are all strictly positive
   (spec.md Edge Cases' bounding requirement).
4. `simulatePlayerLaps(build, lapCount)` (no track) produces a result
   deeply equal to what it produced before this feature existed, for every
   existing test fixture (FR-007).
5. `ItemPhysicsContribution` never reads `run.credits`, `identityTag`, or
   any purchasable-content flag (Constitution Principle II).
6. Two tracks with equal `corneringDemand`/`powerDemand`/`brakingDemand`
   but different real segment sequences produce different
   `simulateLapPhysics` results for the same `PhysicalStats` (SC-001) —
   the property this whole feature exists to guarantee.
