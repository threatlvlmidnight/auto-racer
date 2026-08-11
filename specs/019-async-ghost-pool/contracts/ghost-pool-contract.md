# Ghost Pool Contract

This contract defines the framework-free interfaces used by the ghost
pool catalog and its per-contest selection. Exact TypeScript names may
follow repository conventions, but these inputs, outputs, and
invariants are binding.

## 1. Ghost Pool Contract

```ts
const GHOST_POOL: readonly RivalProfile[]; // superset of RIVAL_PROFILES
```

Binding behavior:

- MUST contain every entry of the existing `RIVAL_PROFILES` catalog,
  unchanged, plus at least one new authored entry (FR-001).
- `RIVAL_PROFILES` itself MUST NOT be modified, renamed, or removed —
  same export, same exactly-7 content, same behavior under
  `validateRivalCatalog` (FR-001, FR-006).
- Every entry (old and new) MUST use the existing `RivalProfile` shape
  unchanged — no new field (FR-008).
- Every new entry MUST resolve its `vehicleId` to one of the 4 existing
  vehicle topologies and MUST author a complete `levelTable(...)`
  covering the same levels the existing 7 entries cover.

## 2. Pool Validation Contract

```ts
function validateGhostPool(pool: readonly RivalProfile[]): RivalCatalogValidation;
```

Binding behavior:

- MUST be a new function, never a modification of the existing
  `validateRivalCatalog` (FR-006, Research Decision 4).
- MUST return `{ kind: "invalid", code: "wrong-count" }` for a pool of
  fewer than 7 entries — a minimum, not an exact count.
- MUST return the same `"duplicate-id"`/`"unknown-vehicle"` failure
  codes `validateRivalCatalog` already uses, under the same conditions.
- MUST return `{ kind: "valid" }` otherwise.

## 3. Selection Contract

```ts
function selectGhostRoster(pool: readonly RivalProfile[], seed: number, level: number): RivalProfile[];
```

Binding behavior:

- Pure and deterministic: identical `(pool, seed, level)` MUST always
  return a deeply equal result (FR-002).
- MUST return exactly 7 distinct entries (no duplicate `id`) for any
  pool of 7 or more valid entries (FR-002).
- MUST accept only `seed: number` and `level: number` — MUST NOT accept
  a `Run`, `Build`, or any other player-scoped object, and MUST NOT
  read anything beyond its three arguments (`pool`, `seed`, `level`).
  This is the single most load-bearing requirement in this contract —
  it is what keeps a future shared-lobby feature able to supply a
  lobby-scoped identifier instead of an individual player's own run
  seed, with zero change to this function (FR-003, FR-005).
- MUST NOT use any randomness source other than a single local seeded
  PRNG derived purely from its `(seed, level)` arguments — no injected
  `RandomSource`, no reference to `Date.now()`/`Math.random()`
  (Constitution Principle I).
- MUST NOT read `run.credits`, `identityTag`, or any purchasable-
  content flag (Constitution Principle II).

## 4. `resolveContest` Non-Interference Contract

```ts
function resolveContest(playerBuild: Build, rivalRoster: readonly RivalProfile[], level: number, seed: number, lapCount?: number): NCarContestResult;
```

Binding behavior:

- MUST require zero code changes. It already accepts an arbitrary
  `rivalRoster` parameter and already throws `ContestResolutionError`
  (code `invalid-roster-size`) for a roster that isn't exactly 7 —
  verified directly against `tests/unit/contest.test.ts:290-299`
  (FR-007).
- Every one of the 11+ existing tests that pass `RIVAL_PROFILES`
  directly into this function MUST continue to pass unmodified (FR-001,
  FR-006, SC-004).

## 5. Non-Interference Requirements

- Every existing test asserting today's `RIVAL_PROFILES`/
  `validateRivalCatalog`/`resolveContest` behavior MUST continue
  passing with zero modification — this feature adds a new catalog and
  a new selection function, never replaces existing ones (FR-001,
  FR-006, FR-007).
- `013-race-spectacle`'s standings/rendering and
  `018-track-generation`'s track-fit MUST require zero changes — both
  already operate on whatever `NCarContestResult`/roster they're given,
  never on `RIVAL_PROFILES` by name (FR-007).
- Practice/Test Day (`src/simulation/practice.ts`) MUST remain
  unaffected — it resolves contests through the legacy 2-car
  `resolveContest` overload, which has no roster/pool concept at all,
  verified directly against the codebase.
- No function introduced or modified by this feature may accept or
  read more than one player's `Run`/`Build` at a time (Constitution
  Principle I, single-run scope).
