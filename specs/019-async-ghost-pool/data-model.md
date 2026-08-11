# Data Model: Async Ghost Pool

## `GHOST_POOL`

```ts
export const GHOST_POOL: readonly RivalProfile[] = [...RIVAL_PROFILES, ...newEntries];
```

| Rule | Source |
|---|---|
| Contains every existing `RIVAL_PROFILES` entry, unchanged, plus new authored entries — never a widening or replacement of `RIVAL_PROFILES` itself. | Research Decision 1 |
| Every entry, old and new, reuses the existing `RivalProfile` shape (`id`, `name`, `color`, `vehicleId`, `levelScaling`) unchanged — no new field. | spec.md FR-008 |
| Every new entry's `vehicleId` MUST resolve to one of the 4 existing vehicle topologies — no new topology is authored (Constitution: mechanical parity). | Existing convention, `RIVAL_PROFILES` |
| Every new entry MUST have its own complete `levelTable(...)` covering the same levels the existing 7 already cover — a selected-but-unscaled profile is not a valid pool entry. | spec.md Edge Cases |
| Exact pool size beyond "more than 7" is a balance-pass placeholder, not fixed here. | spec.md Assumptions |

`RIVAL_PROFILES` (`src/content/rivals.ts`) is **unchanged** — same
export name, same exactly-7 content, same `validateRivalCatalog`
behavior.

## `validateGhostPool`

```ts
function validateGhostPool(pool: readonly RivalProfile[]): RivalCatalogValidation;
```

| Rule | Source |
|---|---|
| A new sibling function — `validateRivalCatalog` itself is never modified. | Research Decision 4 |
| Returns `{ kind: "invalid", code: "wrong-count" }` when `pool.length < 7` (minimum, not exact). | FR-006 |
| Returns `{ kind: "invalid", code: "duplicate-id" }` / `{ kind: "invalid", code: "unknown-vehicle" }` under the same conditions `validateRivalCatalog` already checks for. | FR-006 |
| Returns `{ kind: "valid" }` otherwise. | FR-006 |

## `selectGhostRoster`

```ts
function selectGhostRoster(pool: readonly RivalProfile[], seed: number, level: number): RivalProfile[];
```

Binding behavior:

- Pure and deterministic: identical `(pool, seed, level)` always
  returns a deeply equal 7-entry result (SC-002).
- Always returns exactly 7 **distinct** entries — no duplicate, no
  fewer (SC-001), guaranteed by construction via a partial Fisher-Yates
  shuffle (Research Decision 5), not verified after the fact.
- Accepts only `seed: number` and `level: number` — no `Run`, `Build`,
  or player-identity parameter, and reads nothing beyond its three
  arguments (FR-003, the load-bearing non-coupling requirement).
- Uses no randomness beyond a single local seeded PRNG derived purely
  from `(seed, level)` (Research Decision 2) — no injected
  `RandomSource`, no live call.

## `runPresentation.ts` Integration

```ts
// contestSceneInput, today — level is computed inline, inside the
// returned object literal itself:
const stage = run.stages.find((candidate) => candidate.id === encounter.stageId);
return {
  ...
  rivalRoster: RIVAL_PROFILES,
  level: stage?.pvpOrdinal ?? 1,
  seed: run.seed,
};

// contestSceneInput, after this feature — level MUST be hoisted into
// its own local `const` above the return statement, since an object
// literal's properties cannot reference a sibling property by name:
const stage = run.stages.find((candidate) => candidate.id === encounter.stageId);
const level = stage?.pvpOrdinal ?? 1;
return {
  ...
  rivalRoster: selectGhostRoster(GHOST_POOL, run.seed, level),
  level,
  seed: run.seed,
};
```

This is the **only** production call site requiring a change — verified
directly against the codebase (`src/scenes/runPresentation.ts:169-190`).
The inline-computed-`level`-cannot-be-referenced-by-a-sibling-property
issue above is a real syntactic constraint, not a style choice — it was
caught by reading the actual current implementation line by line, not
assumed from its public signature.

## `resolveContest` — Unchanged

`src/simulation/contest.ts` requires no modification. Its N-car
overload already:

- Accepts an arbitrary `rivalRoster: readonly RivalProfile[]` parameter
  from its caller, never referencing `RIVAL_PROFILES` by name.
- Throws `ContestResolutionError` (code `invalid-roster-size`) for any
  roster that isn't exactly 7 — already verified against
  `tests/unit/contest.test.ts:290-299` — which `selectGhostRoster`'s
  own contract (always exactly 7) satisfies without any change here.

## Validation Invariants

1. `RIVAL_PROFILES` is byte-for-byte identical before and after this
   feature ships — same length (7), same content, same export name
   (Research Decision 1).
2. `selectGhostRoster(pool, seed, level)` called twice with identical
   arguments always returns deeply equal results (SC-002).
3. `selectGhostRoster`'s result always has exactly 7 entries with no
   duplicate `id` (SC-001).
4. Every existing test that constructs a roster from `RIVAL_PROFILES`
   directly (`tests/unit/contest.test.ts`, `tests/unit/playback.test.ts`)
   continues to pass with zero modification (SC-004).
5. `selectGhostRoster` never reads `run.credits`, `identityTag`, or any
   purchasable-content flag — a pure function of `(pool, seed, level)`
   only (Constitution Principle II).
