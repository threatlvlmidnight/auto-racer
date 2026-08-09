# Multi-Ghost Contest Contract

This contract defines the framework-free interfaces used by rival content,
rival build resolution, and extended contest resolution. Exact TypeScript
names may follow repository conventions, but these inputs, outputs, and
invariants are binding.

## 1. Rival Profile Contract

```ts
interface RivalProfile {
  id: string;
  name: string;
  color: string;
  vehicleId: VehicleId;               // reuses an existing named-vehicle topology
  levelScaling: RivalLevelScaling;     // authored per-level fill/price-tier rule
}

// Exact shape is an implementation/content-authoring detail (deferred to
// /speckit.tasks); binding requirement is only that it is a pure function
// of (profile, level) with no external state.
type RivalLevelScaling = (level: number) => {
  slotsToFill: number;      // <= vehicleId's total capacity (4 active + 3 storage)
  priceBias: "low" | "mid" | "high";
};
```

The authored catalog MUST contain exactly 7 `RivalProfile`s (FR-004).
Catalog validation MUST fail loudly for duplicate `id`s or a `vehicleId`
that does not resolve to an existing vehicle definition — it MUST NOT
substitute a default.

## 2. Rival Build Resolution Contract

```ts
function resolveRivalBuild(
  profile: RivalProfile,
  level: number,
  seed: number,
): VehicleBuild;
```

Binding behavior:

- Pure and deterministic: identical `(profile, level, seed)` always
  produces a deeply equal `VehicleBuild`.
- Reuses `createEmptyVehicleBuild(profile.vehicleId)` and the existing
  `drawItem` deterministic draw (`src/simulation/draft.ts`) — introduces no
  second item-selection mechanism.
- The returned build is installed via the existing `addItem`/storage
  helpers, so it is subject to the same Fitted/Flexible/Improvised
  resolution as any player build — no rival-only installation rule exists.
- Never reads global/mutable state, wall-clock time, or unseeded
  randomness.

## 3. Extended Contest Resolution Contract

```ts
type CarRole = "player" | "rival";

interface CarResult {
  id: string;              // "player" or a RivalProfile.id
  role: CarRole;
  name: string;
  color: string;
  time: number;
  laps: PlayerLap[];        // existing per-lap breakdown type, unchanged shape
  position: number;         // 1-indexed, contiguous, no duplicates
  gapToLeader: number;      // 0 for position 1
}

interface NCarContestResult {
  lapCount: number;
  cars: CarResult[];         // exactly 8, ordered by position ascending
  outcome: ContestOutcome;   // "win" iff the player's CarResult.position === 1
  board: OfferedItem[];      // player's own installed items, unchanged meaning
  storage: OfferedItem[];    // player's own stored items, unchanged meaning
}

function resolveContest(
  playerBuild: VehicleBuild,
  rivalRoster: readonly RivalProfile[],  // exactly 7
  level: number,
  seed: number,
  lapCount?: number,
): NCarContestResult;
```

Binding behavior:

- Pure and deterministic (Constitution Principle I, amended v1.3.0;
  Principle III): identical inputs always produce a deeply equal result.
  No value in the result may depend on anything not fixed by the
  arguments at the moment of the call.
- Every entry in `rivalRoster` produces exactly one `CarResult` with
  `role: "rival"`; none is excluded from `cars`/standings (FR-003).
- Ties in `time` are broken by fixed roster order (player, then rivals in
  authored catalog order) — never randomized, never left ambiguous
  (FR-007).
- `rivalRoster.length !== 7` is a typed failure, not a silently
  incomplete field (Edge Cases, spec.md).
- This function is additive: it does not replace or alter the existing
  single-`SampleGhost` resolution path Test Day/Practice mode calls
  (`011-build-test-day` is unaffected, FR-011).

## 4. Migration Requirements

Every existing consumer of the old two-sided `ContestResult`
(`playerTime`/`ghostTime`/`gap`) MUST be migrated to read from
`cars`/`outcome`, or MUST be explicitly and visibly superseded — none may
silently continue assuming exactly one opponent (FR-008):

- `src/scenes/ContestScene.ts` — extends its markers from 2 to
  `cars.length`; at minimum renders every car progressing on the existing
  oval track (richer visuals are `race-spectacle`'s scope, not this
  contract's).
- `src/scenes/contestFormatting.ts` — gains N-car label/gap formatting.
- `src/scenes/ResultScene.ts` — renders full ranked standings, not a
  single player-vs-ghost verdict.
- Every test asserting the old `playerTime`/`ghostTime`/`gap` shape is
  updated to the new shape or deliberately removed (SC-005).
