# Track Generation Contract

This contract defines the framework-free interfaces used by track
generation, characteristic scoring, and its simulation integration.
Exact TypeScript names may follow repository conventions, but these
inputs, outputs, and invariants are binding.

## 1. Track Segment & Track Contract

```ts
type TrackSegment =
  | { kind: "straight"; length: number }
  | { kind: "corner"; turnDegrees: number; direction: "left" | "right" };

interface Track {
  id: string;
  name: string;
  segments: readonly TrackSegment[];
  points: readonly { x: number; y: number }[];
  characteristics: TrackCharacteristics;
}
```

Binding behavior:

- Every corner in a single `Track.segments` sequence MUST share the
  same `direction` (FR-003, Research Decision 1).
- Every corner's `turnDegrees` MUST be in `(0, 150)`, and the full
  sequence's `turnDegrees` MUST sum to exactly `360` (FR-003).
- Every straight's `length` MUST be positive and at least
  `MIN_STRAIGHT_LENGTH`.
- `points` MUST be derived from `segments` alone, and MUST fall within
  the same bounding box `013-race-spectacle`'s three former
  hand-authored tracks shared (FR-011).
- `characteristics` MUST be derived from `segments` alone — never
  authored or set independently of it (FR-004).

## 2. Generation Contract

```ts
function generateTrack(seed: number, pvpOrdinal: number): Track;
```

Binding behavior:

- Pure and deterministic: identical `(seed, pvpOrdinal)` MUST always
  return a deeply equal `Track` (FR-002).
- MUST NOT use any randomness source other than a single local seeded
  PRNG derived purely from its two inputs — no injected
  `RandomSource`, no reference to `Date.now()`/`Math.random()`
  (Constitution Principle I).
- MUST accept any integer `pvpOrdinal`, not just the four values
  `017-season-structure-grow` currently schedules — no hardcoded upper
  bound (Edge Cases).
- MUST produce a structurally closed, non-self-intersecting segment
  sequence for every valid input — by construction, never by
  post-generation validation/rejection (FR-003).
- MUST take only `(seed: number, pvpOrdinal: number)` — MUST NOT accept
  a `Run`, player identity, or any other player-scoped object, and MUST
  NOT internally read anything beyond these two arguments. This is
  what keeps a future shared-lobby race (8 real players racing one
  generated track from one shared seed, per Constitution Principle VI)
  a caller-side change only, never a change to generation itself
  (FR-002, spec.md Assumptions). `resolveContest`'s `seed` parameter is
  under the same constraint — it is "a seed for this contest," not "the
  player's run seed," even though today's only caller happens to
  supply the latter.

## 3. Characteristic Scoring Contract

```ts
function trackCharacteristics(segments: readonly TrackSegment[]): TrackCharacteristics;

interface TrackCharacteristics {
  corneringDemand: number;  // 0-100
  brakingDemand: number;    // 0-100
  powerDemand: number;      // 0-100
}
```

Binding behavior:

- All three fields MUST be integers in `[0, 100]` for every
  structurally-valid segment sequence (FR-004).
- `corneringDemand` MUST increase with the total magnitude/tightness of
  a track's corners relative to its total length (FR-005).
- `powerDemand` MUST increase with the proportion of the track spent on
  straights, and MUST be near-complementary to `corneringDemand`
  (FR-005, SC-003).
- `brakingDemand` MUST be computed independently of the other two, from
  the number/severity of sharp-angle corners only — a track with many
  gentle corners and a track with few sharp corners MUST be able to
  produce different `brakingDemand` values at the same
  `corneringDemand` value (FR-005).
- MUST NOT read anything other than `segments` — no reference to a
  build, run, or player state (Constitution Principle II).

## 4. Build Track-Fit Contract

```ts
function buildTrackLean(build: Build): number; // range [-1, 1]
```

Binding behavior:

- Pure function of `build.slots`' installed items' existing
  `installationCategory` only — no new `ItemDefinition` field is read
  or required (FR-006).
- MUST exclude storage items (only installed/board items count),
  matching their existing inert-by-default treatment elsewhere in
  simulation.
- MUST return exactly `0` for a build with zero categorized installed
  items (FR-008, Edge Cases).
- MUST NOT read `run.credits`, `identityTag`, or any purchasable-
  content flag (Constitution Principle II).

## 5. Simulation Integration Contract

```ts
function simulatePlayerLaps(build: Build, lapCount?: number, track?: Track): PlayerLap[];
```

Binding behavior:

- MUST remain callable with its existing one- and two-argument
  signatures, producing a result byte-for-byte identical to today's
  behavior when `track` is omitted (FR-007) — this is the single most
  load-bearing invariant in this contract, since dozens of existing
  tests and every production call site not yet updated for this
  feature depend on it.
- When `track` is supplied, MUST fold a bounded, deterministic
  `trackFit` adjustment into every lap's result, derived from
  `buildTrackLean(build)` and `track.characteristics`
  (`powerDemand`/`corneringDemand`) only (FR-008).
- MUST record the applied effect as a new, inspectable field on the
  lap result (`PlayerLap.trackFit`/`LapBreakdown.trackFit`) rather than
  folding it invisibly into `resultingLapTime`/`time` with no trace
  (FR-012, Constitution Principle III).
- A build with `buildTrackLean(build) === 0` (empty or exactly
  balanced) MUST see `trackFit.appliedPercent === 0` on every lap,
  regardless of which track is supplied (FR-008, Edge Cases).

## 6. `resolveContest` Integration Contract

```ts
function resolveContest(playerBuild: Build, rivalRoster: readonly RivalProfile[], level: number, seed: number, lapCount?: number): NCarContestResult;
function resolveContest(build: Build, ghost: SampleGhost, lapCount?: number): ContestResult;
```

Binding behavior:

- The N-car overload MUST call `generateTrack(seed, level)` exactly
  once per contest and pass the identical `Track` to every car's
  `simulatePlayerLaps` call — the player and all seven rivals race the
  same generated track, none exempt (FR-009).
- The legacy 2-car overload MUST NOT generate or apply a track — it
  keeps today's track-agnostic behavior unchanged (FR-007).

## 7. Non-Interference Requirements

- Every existing test asserting today's track-agnostic
  `simulatePlayerLaps`/`resolveContest` behavior (no track argument)
  MUST continue passing unchanged — this feature adds an opt-in
  parameter, never replaces existing behavior (FR-007).
- `013-race-spectacle`'s `pointAtProgress`, standings (`standingsAt`),
  and commentary code MUST require zero changes — they continue to
  consume `Track.points`/`NCarContestResult` exactly as they do today
  (FR-011).
- `012-multi-ghost-contest`'s rival-level-scaling formula MUST require
  zero changes — this feature's `level`/`seed` reuse is additive, not a
  replacement of that formula's own inputs.
- No function introduced or modified by this feature may accept or
  read more than one player's `Run`/`Build` at a time (Constitution
  Principle I, single-run scope).
