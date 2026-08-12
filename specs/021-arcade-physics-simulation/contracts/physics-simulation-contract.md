# Physics Simulation Contract

This contract defines the framework-free interfaces used by arcade physics
lap simulation. Exact TypeScript names may follow repository conventions,
but these inputs, outputs, and invariants are binding.

## 1. Physical Stats Contract

```ts
interface PhysicalStats {
  acceleration: number;
  topSpeed: number;
  brakingPower: number;
  corneringSpeed: number;
}
```

Binding behavior:

- All four fields MUST be strictly positive for any resolved build, stock
  or item-modified (FR-002, Edge Cases).
- MUST be derived from a stock baseline plus every held item's own
  `ItemPhysicsContribution`, summed — never a ratio or count of items
  (FR-005, the specific defect this feature removes from `018`'s
  `buildTrackLean`).
- MUST be resolved once per build, before the per-lap loop — not
  re-derived per lap.

## 2. Corner Geometry Contract

```ts
function cornerArcLength(turnDegrees: number): number;
function apexSpeed(turnDegrees: number, corneringSpeedStat: number): number;
```

Binding behavior:

- MUST NOT read anything beyond `turnDegrees` and (for `apexSpeed`) the
  build's own `corneringSpeed` stat — no reference to a `Run`, player
  identity, other player's build, or any other player-scoped object
  (Constitution Principle I; matches `018`'s own non-coupling precedent for
  `generateTrack`).
- `apexSpeed` MUST decrease as `turnDegrees` increases, for a fixed
  `corneringSpeedStat` — sharper corners are always slower than gentler
  ones for the same build (FR-004).
- `apexSpeed` MUST increase as `corneringSpeedStat` increases, for a fixed
  `turnDegrees` — a build with more cornering-speed capability is always
  faster through the same corner (US2).
- Both functions MUST be pure and produce identical output for identical
  input, every call.

## 3. Inter-Apex Span Contract

```ts
function solveSpan(
  distance: number,
  entrySpeed: number,
  exitSpeed: number,
  stats: PhysicalStats,
): { totalSeconds: number; phases: { kind: string; seconds: number }[] };
```

Binding behavior:

- Pure and deterministic: identical `(distance, entrySpeed, exitSpeed,
  stats)` MUST always return a deeply equal result.
- `totalSeconds` MUST exactly equal the sum of the returned `phases[].seconds`
  — no unexplained remainder (FR-009, SC-004).
- MUST correctly bound the achievable peak speed to `stats.topSpeed` — a
  span whose algebraic solution would exceed `topSpeed` MUST instead
  produce an accelerate-cruise-brake profile, never a speed above
  `topSpeed` at any point (FR-003).
- MUST produce a finite, positive `totalSeconds` for every valid
  `(distance ≥ 0, entrySpeed ≥ 0, exitSpeed ≥ 0, stats with all-positive
  fields)` input — no NaN, no negative time, no infinite loop (Edge Cases).

## 4. Lap Assembly Contract

```ts
function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
): { totalSeconds: number; phases: LapPhaseBreakdown[] };
```

Binding behavior:

- MUST flatten `segments` into inter-apex spans and call `solveSpan` once
  per span, plus one apex-hold contribution per corner — never a
  per-segment-only computation that ignores the corner/straight coupling
  at each boundary (FR-003, FR-004).
- MUST produce different `totalSeconds` for two `segments` sequences that
  differ in real layout even when their `018`-computed aggregate
  `corneringDemand`/`powerDemand`/`brakingDemand` scores are equal
  (SC-001) — the specific property this feature exists to guarantee.
- MUST NOT read anything beyond `stats` and `segments` — no `Build`,
  `Run`, or item lookup inside this function (Constitution Principle I).
- `Σ phases[].seconds` MUST exactly equal `totalSeconds` (SC-004).

## 5. Simulation Integration Contract

```ts
function simulatePlayerLaps(build: Build, lapCount?: number, track?: Track): PlayerLap[];
```

Binding behavior:

- MUST remain callable with its existing one- and two-argument signatures,
  producing a result byte-for-byte identical to today's behavior when
  `track` is omitted (FR-007) — this is the single most load-bearing
  invariant in this contract, unchanged in wording from `018`'s own
  identical requirement for the same function.
- When `track` is supplied, MUST fold `simulateLapPhysics`'s result
  additively with every existing `timeModifier`-sourced contribution
  (Research Decision 6) — never replacing the flat-item contribution path,
  only adding to it.
- MUST record the physics breakdown as a new, inspectable field
  (`PlayerLap.physics`) rather than folding it invisibly into
  `resultingLapTime`/`time` with no trace (FR-009, Constitution Principle
  III).
- MUST NOT retain any `018` `trackFit` field or behavior — this feature
  fully supersedes it, not extends it.

## 6. `resolveContest` Integration Contract

```ts
function resolveContest(playerBuild: Build, rivalRoster: readonly RivalProfile[], level: number, seed: number, lapCount?: number): NCarContestResult;
function resolveContest(build: Build, ghost: SampleGhost, lapCount?: number): ContestResult;
```

Binding behavior:

- The N-car overload's existing `generateTrack(seed, level)` call and
  shared-`Track`-to-every-car wiring MUST require zero change — only its
  now-removed `trackFit`-related calls are deleted (Research Decision 7).
- The legacy 2-car overload MUST NOT generate or apply a track, or engage
  physics simulation — unchanged from `018`'s own identical requirement.

## 7. Non-Interference Requirements

- Every existing test asserting today's track-agnostic
  `simulatePlayerLaps`/`resolveContest` behavior (no track argument) MUST
  continue passing unchanged (FR-007).
- Every existing `timeModifier`-only `ItemDefinition` MUST continue
  contributing its flat seconds delta unmodified, with or without a track
  (FR-008).
- `013-race-spectacle`'s `pointAtProgress`, standings, and commentary code
  MUST require zero changes (FR-012).
- `012-multi-ghost-contest`'s rival-level-scaling formula MUST require zero
  changes.
- No function introduced or modified by this feature may accept or read
  more than one player's `Run`/`Build` at a time (Constitution Principle I,
  single-run scope).
