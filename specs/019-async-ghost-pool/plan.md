# Implementation Plan: Async Ghost Pool

**Branch**: `019-async-ghost-pool` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-async-ghost-pool/spec.md`

## Summary

Add a new, separate `GHOST_POOL` catalog (`src/content/rivals.ts`) that
contains today's existing 7-entry `RIVAL_PROFILES` roster plus new
authored profiles — `RIVAL_PROFILES` itself is never modified. Add a new
`selectGhostRoster(pool, seed, level)` function (`src/simulation/
rivals.ts`, alongside the existing `resolveRivalBuild`) that
deterministically shuffles the pool with a small local seeded PRNG and
takes the first 7 distinct entries — reusing `resolveContest`'s own
existing `seed`/`level` parameters (already threaded into
`resolveRivalBuild` per `012-multi-ghost-contest`'s contract), not a
new identifier concept. The only production call site
(`runPresentation.ts`'s `contestSceneInput`) swaps
`rivalRoster: RIVAL_PROFILES` for
`rivalRoster: selectGhostRoster(GHOST_POOL, run.seed, level)`.
`resolveContest` itself requires no change — it already accepts an
arbitrary 7-entry roster as a parameter, never referencing
`RIVAL_PROFILES` by name.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency
— the seeded PRNG is a small (~10 line) pure function local to this
feature, deliberately not shared with `018-track-generation`'s own
seeded PRNG (see Research Decision 2) since neither feature depends on
the other landing first.

**Storage**: N/A — selection is recomputed on demand from
`(seed, level)`, never persisted; identical inputs always reselect an
identical roster, so there is nothing to store. No backend, no
accounts, no player-recorded data (spec.md Assumptions).

**Testing**: Vitest. Strict test-first coverage for every changed
`src/simulation/`/`src/content/` contract: `GHOST_POOL`'s own catalog
validation, `selectGhostRoster`'s determinism/distinctness/variety, and
`contestSceneInput`'s wiring. Full regression pass confirming every
pre-existing `012`/`013`/`018` test — including the 11+ tests that pass
`RIVAL_PROFILES` directly into `resolveContest` — still passes
unmodified.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: One `selectGhostRoster` call per resolved
N-car contest (not per car, not per lap) — a single pass shuffle over a
small (dozens-of-entries) array, trivial cost, same order of magnitude
as today's direct `RIVAL_PROFILES` reference.

**Constraints**:
- `RIVAL_PROFILES` MUST remain completely unchanged — same name, same
  exactly-7 content, same `validateRivalCatalog` behavior — so every
  existing test that depends on it (11+ call sites across
  `contest.test.ts`/`playback.test.ts`, plus `rivals.test.ts`'s own
  catalog tests) requires zero modification (FR-001, FR-006).
- `selectGhostRoster` MUST accept only a plain numeric `seed` and
  `level` — MUST NOT accept a `Run`, `Build`, or player-identity object
  (FR-003, mirrors `018-track-generation`'s identical, already-planned
  requirement for `generateTrack`).
- `resolveContest` MUST NOT change — it already accepts an arbitrary
  7-entry `rivalRoster` parameter and already throws
  `ContestResolutionError` (`invalid-roster-size`) for anything else;
  `selectGhostRoster`'s own output contract (exactly 7, always) is what
  keeps this working (FR-007).
- No new field on `RivalProfile` or `ItemDefinition` (FR-008).
- No mechanic introduced here may vary by player entrant or purchasable
  content (Constitution Principle II) — pool composition and selection
  are identical for every player.

**Scale/Scope**: One new authored catalog constant, one new small
selection function plus its local seeded PRNG, one new catalog
validation function (a sibling to `validateRivalCatalog`, not a
modification of it), one production call-site change
(`runPresentation.ts`), zero changes to `resolveContest`,
`013-race-spectacle`, or `018-track-generation`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Selection is pure, deterministic, resolved before/at contest time — no live input, no live randomness. Every selected car is still precomputed, recorded data (Constitution's own definition of a "ghost"). |
| II. Fairness | PASS | Pool composition and selection logic are identical for every player/entrant/purchasable-content state (FR-003, Constraints). |
| III. Transparency & Legibility | PASS | The selected 7 ghosts are inspectable via the existing `CarResult`/`NCarContestResult` shape, unchanged (FR-009). |
| IV. Spectation-First | PASS | Not touched — no change to contest presentation; the field is still exactly 8 named, distinguishable cars. |
| V. Build Testing Access | PASS | Untouched — practice/Test Day uses the legacy 2-car `resolveContest` overload, which has no roster concept at all (spec.md Assumptions, verified against `src/simulation/practice.ts`). |
| VI. Async-First Architecture | PASS | No live service, no matchmaking, no network call — the entire point of this feature is proving the mechanism without introducing any live-infrastructure dependency. |
| Product - 2D medium | PASS | No visual/presentation change. |
| Product - mechanical parity and topology | PASS | Selected profiles reuse the same 4 existing vehicle topologies every profile already uses; no new topology, no player-specific advantage. |
| Product - theme | PASS | No new vocabulary; new authored profiles follow the exact pattern (`levelTable(...)`) the existing 7 already establish. |
| Development Workflow | PASS | Vertically sliced: US1 (pool + selection) and US2 (non-coupling contract) are both independently testable before US3 (regression verification) runs. Strict test-first applies to every changed `src/simulation/`/`src/content/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model adds one new catalog constant
and one new function; `RivalProfile` itself is unchanged, `RIVAL_PROFILES`
is unchanged, `resolveContest` is unchanged. All additive. All
principles above remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/019-async-ghost-pool/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ghost-pool-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── content/
│   └── rivals.ts                    (MODIFIED) - adds GHOST_POOL
│                                       (RIVAL_PROFILES + new authored
│                                       entries) and validateGhostPool;
│                                       RIVAL_PROFILES/validateRivalCatalog
│                                       untouched
├── simulation/
│   └── rivals.ts                    (MODIFIED) - adds
│                                       selectGhostRoster(pool, seed,
│                                       level) and its local seeded
│                                       PRNG; resolveRivalBuild
│                                       untouched
└── scenes/
    └── runPresentation.ts           (MODIFIED) - contestSceneInput's
                                        `rivalRoster: RIVAL_PROFILES`
                                        becomes
                                        `rivalRoster:
                                        selectGhostRoster(GHOST_POOL,
                                        run.seed, level)` — the only
                                        production call site, verified
                                        directly against the codebase

tests/
├── unit/
│   ├── rivals.test.ts               (MODIFIED) - new describe blocks
│   │                                   for GHOST_POOL/validateGhostPool/
│   │                                   selectGhostRoster; every
│   │                                   existing RIVAL_PROFILES-focused
│   │                                   test is untouched
│   ├── contest.test.ts              (UNCHANGED) - its 11+ direct
│   │                                   RIVAL_PROFILES→resolveContest
│   │                                   call sites keep passing as-is,
│   │                                   verified as a regression gate,
│   │                                   not modified by this feature
│   └── playback.test.ts             (UNCHANGED) - same as above
└── integration/
    └── run-flow.test.ts             (MODIFIED as needed) - confirms
                                        contestSceneInput's rivalRoster
                                        now comes from selection
```

**Structure Decision**: Mirrors `013-race-spectacle`'s established
content/simulation split (`content/tracks.ts` authored data vs.
`simulation/tracks.ts` geometry/selection logic) — `GHOST_POOL` (data)
lives in `content/rivals.ts` alongside `RIVAL_PROFILES`;
`selectGhostRoster` (selection logic) lives in `simulation/rivals.ts`
alongside `resolveRivalBuild`. No new module.

## Delivery Order

1. Author `GHOST_POOL` in `src/content/rivals.ts`
   (`[...RIVAL_PROFILES, ...newEntries]`, each new entry with its own
   complete `levelTable(...)`) and `validateGhostPool` (minimum-size +
   existing integrity checks, a sibling function — `validateRivalCatalog`
   itself is never modified). Test-first: pool size, uniqueness,
   resolvable vehicles, zero change to `RIVAL_PROFILES`'s own tests.
2. Implement `selectGhostRoster(pool, seed, level)` in
   `src/simulation/rivals.ts` — a local seeded PRNG plus a partial
   Fisher-Yates shuffle, taking the first 7 entries. Test-first:
   determinism, always-exactly-7-distinct, real variety across
   different `(seed, level)` pairs, no `Run`/player object in its
   signature.
3. Update `runPresentation.ts`'s `contestSceneInput` to call
   `selectGhostRoster(GHOST_POOL, run.seed, level)` instead of
   referencing `RIVAL_PROFILES` directly.
4. Run the full existing test suite; confirm every pre-existing test —
   especially the 11+ direct `RIVAL_PROFILES`→`resolveContest` call
   sites — passes completely unmodified.
5. Run `npm test`, `npm run build`, `npm run lint` green.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
