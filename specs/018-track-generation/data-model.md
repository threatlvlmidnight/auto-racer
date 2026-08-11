# Data Model: Track Generation

## `TrackSegment`

```ts
export type TrackSegment =
  | { kind: "straight"; length: number }
  | { kind: "corner"; turnDegrees: number; direction: "left" | "right" };
```

| Rule | Source |
|---|---|
| A track's segment sequence alternates straight, corner, straight, corner, ... and closes back to its own start (FR-001, FR-003). | Research Decision 1 |
| Every corner in one track shares the same `direction` (Research Decision 1) — this is what guarantees the resulting shape is simple/non-self-intersecting by construction. | Research Decision 1 |
| Every corner's `turnDegrees` is in `(0, 150)`; the full sequence's `turnDegrees` sum to exactly `360`. | Research Decision 1 |
| Every straight's `length` is positive and at least `MIN_STRAIGHT_LENGTH` — a balance-pass constant (Research Decision 3), not fixed here. | Research Decision 1/3 |

## `Track` (extended from `013-race-spectacle`)

```ts
export interface Track {
  id: string;
  name: string;
  segments: readonly TrackSegment[];
  points: readonly { x: number; y: number }[];
  characteristics: TrackCharacteristics;
}
```

| Field | Rule |
|---|---|
| `id`/`name` | Deterministically derived from `(seed, pvpOrdinal)` (e.g. `track-{seed}-{pvpOrdinal}`) — no authored catalog exists to draw a name from anymore. |
| `segments` | The generated closed sequence (`TrackSegment[]`) — the authoritative shape. |
| `points` | Derived once, at generation time, by walking `segments` (a heading-and-position "turtle walk": advance by each straight's length along the current heading, rotate by each corner's `turnDegrees` in its `direction`), then uniformly scaled/translated into the same bounding box (`x: 70-560, y: 84-320`) `013`'s three former hand-authored tracks already shared (Research Decision 3). `013-race-spectacle`'s `pointAtProgress` reads this field exactly as it reads today's hand-authored `points` — no change to that function. |
| `characteristics` | Derived once, at generation time, from `segments` alone (Research Decision 4) — never authored or set independently. |

`ItemDefinition`, `VehicleBuild`, `installationCategory` are **unchanged**
— no new authored field is introduced anywhere in this feature
(FR-006).

## `TrackCharacteristics`

```ts
export interface TrackCharacteristics {
  corneringDemand: number;  // 0-100
  brakingDemand: number;    // 0-100
  powerDemand: number;      // 0-100
}
```

| Field | Formula (Research Decision 4) |
|---|---|
| `corneringDemand` | `round(100 * totalCorneringLength / totalNotionalLength)`, where `totalCorneringLength = Σ turnDegrees * CORNER_LENGTH_PER_DEGREE` over every corner. |
| `powerDemand` | `round(100 * totalStraightLength / totalNotionalLength)`. Near-complementary to `corneringDemand` by construction (both derive from the same length split), matching the real high-downforce-vs-power classification this feature is grounded in. |
| `brakingDemand` | `round(100 * clamp(Σ turnDegrees over corners above SHARP_CORNER_DEGREES / BRAKING_REFERENCE, 0, 1))` — independent of the other two (a corner-heavy track of only gentle corners scores low here; a track with few but hairpin-sharp corners scores high). |

All three are bounded `[0, 100]` for every structurally-valid generated
track (Decision 1's closure/bounds guarantees keep the underlying sums
finite and positive).

## `generateTrack`

```ts
function generateTrack(seed: number, pvpOrdinal: number): Track;
```

Binding behavior:

- Pure and deterministic (FR-002): identical `(seed, pvpOrdinal)` always
  returns a deeply equal `Track`, including `segments`, `points`, and
  `characteristics`.
- Uses no randomness beyond a single local seeded PRNG derived purely
  from its two inputs (Research Decision 2) — no injected
  `RandomSource`, no live/unseeded call.
- Accepts any integer `pvpOrdinal`, not just `1-4` — no hardcoded bound
  on the ordinal domain (Edge Cases; matches
  `017-season-structure-grow`'s own "unbounded scan" convention).

## Build Track Fit (derived, never stored)

```ts
function buildTrackLean(build: Build): number; // range [-1, 1]
```

| Rule | Source |
|---|---|
| `lean = (powerCount - chassisCount) / (powerCount + chassisCount)`, counting only *installed* (board) items by `installationCategory`; storage items are excluded, matching their existing inert-unless-`activeWhileStored` treatment elsewhere in simulation. | Research Decision 5 |
| `lean = 0` when `powerCount + chassisCount === 0` (an empty build, or a build holding only neutral/uncategorized state — though every real `ItemDefinition` is always Power or Chassis today, so this is effectively "empty board only"). | Research Decision 5, spec.md Edge Cases |

## `simulatePlayerLaps` Extension

```ts
function simulatePlayerLaps(build: Build, lapCount?: number, track?: Track): PlayerLap[];
```

| Rule | Source |
|---|---|
| `track` omitted → behavior is byte-for-byte identical to today (FR-007) — every existing call site across `laps.test.ts`, `contest.test.ts`, `playback.test.ts`, and every production call site not yet updated for this feature stays green with zero changes. | FR-007 |
| `track` supplied → for every lap, `fitPercent = buildTrackLean(build) * ((track.characteristics.powerDemand - track.characteristics.corneringDemand) / 100) * TRACK_FIT_MAX_PERCENT`, applied as `adjustedTime = time * (1 - fitPercent / 100)` after every other existing fold (tier, installation, synergy, buffs) — track-fit is the last, whole-lap adjustment, not folded into any single item's own contribution. | Research Decision 5 |
| The applied effect is recorded as a new field, not silently absorbed into the total. | FR-012 |

## `PlayerLap` / `LapBreakdown` Extension

```ts
export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
  contributions: ContributionEvidence[];
  trackFit?: { appliedPercent: number; appliedSeconds: number };
}

export interface LapBreakdown {
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItems: FiredItem[];
  contributions?: ContributionEvidence[];
  trackFit?: { appliedPercent: number; appliedSeconds: number };
}
```

`trackFit` is present only when `simulatePlayerLaps` was called with a
`track` argument (i.e. only for contests resolved through
`resolveContest`'s N-car overload, per Research Decision 6) — absent
for the legacy 2-car path and for any pre-existing constructed test
fixture, which is exactly what makes this an additive, optional field
rather than a breaking one.

## `resolveContest` Integration

| Overload | Behavior |
|---|---|
| N-car (`resolveContest(playerBuild, rivalRoster, level, seed, lapCount?)`) | Gains a **new** call: `generateTrack(seed, level)` once per contest, passing the same `Track` to the player's and every rival's `simulatePlayerLaps` call (Research Decision 6, FR-009). `resolveContest` has no track concept today — this is new behavior, not a migration of an existing call. |
| Legacy 2-car (`resolveContest(build, ghost, lapCount?)`) | Unchanged — no track generated or applied, since there is no `seed`/`level` to generate one from and no existing call site expects one (FR-007). |

**Distinct from the above**: `src/scenes/ContestScene.ts:80` already calls
`selectTrack(input.seed, input.level)` today, for rendering only
(`013-race-spectacle`) — entirely separate from `resolveContest`. That
existing call is a straight rename to `generateTrack`, verified as the
*only* production caller of `selectTrack` (confirmed by direct codebase
search during `/speckit.analyze`, not assumed). Since `generateTrack` is
pure and deterministic, `ContestScene.ts`'s independent call and
`resolveContest`'s new internal call — both given the same
`(seed, level)` — always agree on the same track without needing to
thread a `Track` through `NCarContestResult`.

## Validation Invariants

1. `generateTrack(seed, ordinal)` called twice with identical arguments
   always returns deeply equal results (SC-002).
2. Every generated `Track.segments` sequence closes (returns to its
   start position and heading) and contains no segment below its
   minimum length/angle bound, for every `(seed, ordinal)` pair
   (SC-001).
3. `TrackCharacteristics`' three fields are always integers in `[0,
   100]` for every generated track.
4. `simulatePlayerLaps(build, lapCount)` (two-argument call, no track)
   produces a result deeply equal to what it produced before this
   feature existed, for every existing test fixture (FR-007).
5. `buildTrackLean` never reads `run.credits`, `identityTag`, or any
   purchasable-content flag — a pure function of a build's installed
   items only (Constitution Principle II).
