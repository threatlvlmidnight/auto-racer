# Research: Async Ghost Pool

## Decision 1: `GHOST_POOL` is a new, separate catalog containing `RIVAL_PROFILES`, never a widening of it

**Decision**: `GHOST_POOL: readonly RivalProfile[] = [...RIVAL_PROFILES, ...newEntries]`
is a new exported constant in `src/content/rivals.ts`. `RIVAL_PROFILES`
itself is never modified, renamed, or removed.

**Rationale**: Verified directly against the codebase (not assumed)
that 11+ existing tests across `tests/unit/contest.test.ts` and
`tests/unit/playback.test.ts` pass `RIVAL_PROFILES` directly into
`resolveContest`, which itself throws a typed `ContestResolutionError`
(code `invalid-roster-size`) for any roster that isn't exactly 7. If
`RIVAL_PROFILES` had grown past 7 in place, every one of those tests
would fail immediately — a large, avoidable regression for a feature
whose own success criteria (SC-004) require zero regression. Keeping
`RIVAL_PROFILES` untouched and adding `GHOST_POOL` as a strict superset
means every existing test, and every existing behavior that reads
`RIVAL_PROFILES` by name, is provably unaffected.

**Alternatives considered**:
- Widen `RIVAL_PROFILES` in place: rejected — this is the exact
  mistake this decision exists to document and avoid; see spec.md Edge
  Cases and the checklist notes recorded during spec review
  (2026-08-11).
- Rename `RIVAL_PROFILES` to `GHOST_POOL` and update every call site:
  rejected — spec.md's own Assumptions already reject renaming
  `RivalProfile` for the same reason (large, low-value refactor with no
  functional benefit); the same logic applies to the catalog constant's
  name.

## Decision 2: A separate, local seeded PRNG — not shared with `018-track-generation`'s

**Decision**: `selectGhostRoster` implements its own small
(~10-line) local seeded PRNG (the same well-known `mulberry32`-style
algorithm `018-track-generation`'s own research independently arrived
at), rather than importing a shared utility from `018`'s
`generateTrack`.

**Rationale**: `018-track-generation` is fully specified but not yet
implemented — there is no shipped module to import from, and this
feature has no structural dependency on `018` landing first or in any
particular order (they modify entirely different files: `tracks.ts` vs
`rivals.ts`/`runPresentation.ts`'s `rivalRoster` field). Inventing a
shared PRNG module now, before either feature has shipped, would create
an artificial coupling between two otherwise-independent features for a
~10-line utility — contradicting this project's established preference
for small, local, duplicated logic over premature shared abstraction
(mirrors this session's own working conventions). If both features ship
and a shared utility later proves worthwhile, that is a small,
low-risk, purely mechanical refactor at that point — not a decision
either feature's spec should force on the other.

**Alternatives considered**:
- Extract a shared `src/simulation/prng.ts` now, used by both this
  feature and `018`: rejected for the reasons above — premature, and
  makes this feature's own delivery depend on `018`'s implementation
  order for no functional reason.
- Use `Math.random()` seeded via some global side effect: rejected
  outright — violates Constitution Principle I (no live/unseeded
  randomness) exactly as `018`'s own research already established for
  the same category of problem.

## Decision 3: Selection reuses `resolveContest`'s existing `seed`/`level` parameters — no new "race ID" concept

**Decision**: `selectGhostRoster(pool: readonly RivalProfile[], seed: number, level: number): RivalProfile[]`
takes the same `seed`/`level` values `resolveContest`'s N-car overload
already receives and already threads into `resolveRivalBuild(profile,
level, seed)` for every rival (an existing `012-multi-ghost-contest`
contract). No new identifier concept (e.g. a distinct "race ID") is
introduced.

**Rationale**: `resolveContest` already carries exactly the two values
this feature needs, already flowing to every rival's build resolution.
Inventing a separate identifier would mean two different numbers
notionally both meaning "which race is this," for no benefit — one
first-class shared `(seed, level)` pair per contest is simpler, matches
`018-track-generation`'s identical reuse of the same two parameters for
`generateTrack(seed, level)`, and keeps `resolveContest`'s existing
signature completely untouched (spec.md FR-007).

**Alternatives considered**:
- A dedicated `raceId` parameter, distinct from `seed`: rejected — spec.md
  deliberately uses the more abstract "plain numeric identifier"
  language precisely so either naming works; reusing the existing,
  already-threaded `seed`/`level` pair is the simpler, already-proven
  choice, consistent with `018`'s own resolved design.

## Decision 4: `validateGhostPool` is a new sibling function — `validateRivalCatalog` is never modified

**Decision**: A new function, `validateGhostPool(pool: readonly RivalProfile[]): RivalCatalogValidation`,
enforces a minimum size (`>= 7`) plus the same integrity rules
(`validateRivalCatalog`'s existing `"duplicate-id"`/`"unknown-vehicle"`
checks). `validateRivalCatalog` itself keeps its exact existing
`"exactly 7"` behavior, unchanged, still validating `RIVAL_PROFILES`
exactly as it does today.

**Rationale**: `validateRivalCatalog(RIVAL_PROFILES)` is itself asserted
against directly in `tests/unit/rivals.test.ts` (`"validates as a valid
catalog"`), and its `"exactly 7"` count check is explicitly tested
(`"fails loudly on a catalog that is not exactly 7 profiles"`). Changing
its count semantics to "at least 7" would silently weaken an existing,
already-passing invariant test for the untouched `RIVAL_PROFILES`
catalog. A new sibling function keeps both catalogs' own validation
rules exactly matched to what each one actually needs.

**Alternatives considered**:
- Add an optional `{ exactCount?: boolean }` parameter to
  `validateRivalCatalog` and call it two ways: rejected — changes an
  existing, tested function's signature for a distinction (`exactly 7`
  vs `at least 7`) that a second, purpose-named function expresses more
  clearly and with zero risk to the first function's existing callers
  and tests.

## Decision 5: Selection algorithm — a seeded partial Fisher-Yates shuffle

**Decision**: `selectGhostRoster` seeds a local PRNG from
`seed * 1000003 + level` (the same combination formula
`018-track-generation`'s research already established for its own
`generateTrack`), performs a partial Fisher-Yates shuffle of the pool
(only the first 7 positions need to be finalized), and returns those
first 7 entries.

**Rationale**: Fisher-Yates is the standard, well-understood algorithm
for an unbiased random permutation; taking only its first 7 output
positions is a direct, minimal-code way to get "7 distinct entries,
uniformly likely across the pool" without a separate distinctness check
— distinctness is guaranteed by the shuffle's own invariant (every
element appears exactly once), not verified after the fact.

**Alternatives considered**:
- Repeatedly draw a random index and retry on collision: rejected —
  correct but strictly more code and a variable (if bounded) number of
  PRNG draws for the same guarantee a partial shuffle gives in exactly
  7 steps.
- Hash-rank every pool entry by `(seed, level, entry.id)` and take the
  top 7: rejected — works, but requires as many hash computations as
  the pool has entries (vs. Fisher-Yates's fixed 7 swaps) for no
  behavioral difference visible to any requirement in this feature.

## Decision 6: `resolveContest` requires zero changes

**Decision**: No change to `src/simulation/contest.ts`. This feature's
entire surface is: a new catalog, a new selection function, and one
call-site update in `runPresentation.ts`.

**Rationale**: `resolveContest`'s N-car overload already accepts an
arbitrary `rivalRoster: readonly RivalProfile[]` parameter from its
caller and already validates that parameter's length itself
(`ContestResolutionError`, `invalid-roster-size`) — verified directly
against `tests/unit/contest.test.ts:290-299`. It has never referenced
`RIVAL_PROFILES` by name. `selectGhostRoster`'s own contract (always
exactly 7 distinct entries) is precisely what keeps this existing
validation satisfied without any change on `resolveContest`'s side.

**Alternatives considered**:
- Move selection *into* `resolveContest` itself (accept a pool +
  seed/level instead of a pre-selected roster): rejected — would change
  `resolveContest`'s existing, widely-tested signature for no
  functional benefit; keeping selection as a caller-side concern (same
  as `018-track-generation`'s own track generation, called by
  `runPresentation.ts`/`contest.ts` rather than baked into
  `resolveContest`'s parameter list) is the smaller, safer change.
