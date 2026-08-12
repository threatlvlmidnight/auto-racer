# Contextual Physics Effects Contract

This contract defines the framework-free interfaces this feature adds to
`021-arcade-physics-simulation`'s existing physics module. Exact TypeScript
names may follow repository conventions, but these inputs, outputs, and
invariants are binding. This contract extends
`021/contracts/physics-simulation-contract.md` — every clause there that
this contract doesn't explicitly modify still applies unchanged.

## 1. Physics Condition Contract

```ts
interface PhysicsCondition {
  kind: "corner-tightness";
  direction: "at-least" | "at-most";
  turnDegrees: number;
}
```

Binding behavior:

- `"at-least"` MUST match a corner whose own `turnDegrees` is greater than
  or equal to the condition's `turnDegrees`. `"at-most"` MUST match when
  less than or equal.
- MUST be evaluated purely against a single corner's `turnDegrees` — no
  reference to a `Run`, `Build`, other corner, or any player-scoped object
  (Constitution Principle I, matching `021`'s own Corner Geometry Contract
  §2).
- The shape MUST remain a discriminated union on `kind`, so a future kind
  can be added as a new union member without modifying this one (FR-007).

## 2. Conditional Physics Contribution Contract

```ts
interface ConditionalPhysicsContribution {
  condition: PhysicsCondition;
  delta: ItemPhysicsContribution; // 021's existing four-field delta shape
}
```

Binding behavior:

- `delta` MUST reuse `021`'s existing `ItemPhysicsContribution` shape
  unchanged — no new delta fields introduced.
- `ItemDefinition.conditionalPhysics` (a new optional
  `readonly ConditionalPhysicsContribution[]`) MUST coexist with the
  existing `ItemDefinition.physics?: ItemPhysicsContribution` field without
  either one implying, limiting, or overriding the other (FR-001).
- `undefined` and `[]` for `conditionalPhysics` MUST be treated identically
  — both mean "no conditional contributions."

## 3. Conditional Resolution Contract

```ts
function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
  conditionalContributions?: readonly ConditionalPhysicsContribution[],
): { totalSeconds: number; phases: LapPhaseBreakdown[] };
```

Binding behavior:

- Omitting the third argument (or passing `[]`/`undefined`) MUST produce a
  result byte-for-byte identical to `021`'s shipped two-argument behavior —
  this is this feature's single most load-bearing invariant (FR-005,
  SC-003).
- For each corner `i`, the effective `corneringSpeed` used to compute that
  corner's `apexSpeed` MUST equal `stats.corneringSpeed` plus every
  matching contribution's `corneringSpeedDelta` where `condition` matches
  corner `i`'s own `turnDegrees` (FR-002, FR-003, research.md Decision 1).
- For each span `i` (from `corners[previous]` to `corners[i]`), the
  effective `acceleration` MUST equal `stats.acceleration` plus every
  matching contribution's `accelerationDelta` whose `condition` matches
  `corners[previous]`'s `turnDegrees` (FR-002, FR-003).
- For each span `i`, the effective `brakingPower` MUST equal
  `stats.brakingPower` plus every matching contribution's
  `brakingPowerDelta` whose `condition` matches `corners[i]`'s
  `turnDegrees` (FR-002, FR-003).
- For each span `i`, the effective `topSpeed` MUST equal `stats.topSpeed`
  plus every matching contribution's `topSpeedDelta` whose `condition`
  matches **either** `corners[previous]`'s or `corners[i]`'s `turnDegrees`
  (research.md Decision 1's documented asymmetry).
- A contribution whose condition is not met for a given corner/span MUST
  contribute exactly 0 there — no partial credit, no averaging, no
  fallback to unconditional application (FR-003).
- Multiple contributions matching the same stat and the same corner/span
  MUST sum additively, with `021`'s existing unconditional `physics`
  contribution, with no interaction or precedence (FR-004, research.md
  Decision 5).
- `solveSpan`'s own four-argument signature and every binding clause in
  `021`'s Inter-Apex Span Contract (§3 there) MUST remain unchanged — this
  feature's callers resolve an effective `PhysicalStats` before calling
  `solveSpan`, never inside it.
- `Σ phases[].seconds` MUST still exactly equal `totalSeconds` (extends
  `021`'s §4 invariant unchanged).

## 4. Inspectability Contract

Binding behavior:

- The per-lap physics breakdown MUST make it possible to determine, for
  any phase, which conditional contribution(s) (if any) were applied to
  produce that phase's `seconds` value (FR-006, Constitution Principle
  III). Exact field shape is a `tasks.md`/implementation choice
  (data-model.md, LapPhaseBreakdown extension) — this contract only binds
  that the information MUST be derivable, not its exact representation.
- This inspectability MUST be verifiable directly against the track's own
  authored corner angles, without re-running or re-deriving the simulation
  (SC-002).

## 5. Non-Interference Requirements

- Every existing `021` physics test MUST continue passing unchanged
  (FR-005, SC-003).
- `solveSpan`'s existing contract-bound behavior (`021` contracts §3) MUST
  require zero modification to its own function body's external behavior —
  only its callers change what `stats` they pass in.
- `simulatePlayerLaps`'s existing integration contract (`021` contracts
  §5) MUST require zero changes beyond passing the new, optional
  conditional-contributions list through to `simulateLapPhysics` — its own
  one/two-argument call compatibility (FR-007 there) is unaffected.
- No function introduced or modified by this feature may accept or read
  more than one player's `Run`/`Build` at a time (Constitution Principle I,
  single-run scope — unchanged from `021`).
- `020-character-item-pools`' content authoring is explicitly out of scope
  — this contract defines the capability only; no item using
  `conditionalPhysics` is authored by this feature.
