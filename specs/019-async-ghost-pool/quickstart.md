# Quickstart: Async Ghost Pool

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/ghost-pool-contract.md](./contracts/ghost-pool-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. `GHOST_POOL` tests confirm: contains every `RIVAL_PROFILES` entry
   unchanged, plus new entries; `RIVAL_PROFILES` itself is untouched
   (same length, same content, same `validateRivalCatalog` behavior).
2. `validateGhostPool` tests confirm: fails on fewer than 7 entries,
   fails on a duplicate id, fails on an unresolvable vehicle id,
   otherwise valid — without changing `validateRivalCatalog`'s own
   existing test results.
3. `selectGhostRoster` tests confirm: determinism across repeated calls
   with the same `(pool, seed, level)`; always exactly 7 distinct
   entries; real variety across different `(seed, level)` pairs; its
   own signature accepts only `pool`/`seed`/`level` — no `Run` or
   player object anywhere.
4. `runPresentation.ts` tests confirm `contestSceneInput`'s
   `rivalRoster` now comes from `selectGhostRoster`, not a direct
   `RIVAL_PROFILES` reference.
5. Regression tests confirm every pre-existing test — especially the
   11+ direct `RIVAL_PROFILES`→`resolveContest` call sites in
   `tests/unit/contest.test.ts`/`tests/unit/playback.test.ts` — passes
   completely unmodified.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Different Races, Different Fields

1. Start a run and play through to the first PvP stage; note the names
   of the 7 rival cars.
2. Reach the second, third, and fourth PvP stages in the same run;
   confirm the rival lineup differs from stage to stage (not always the
   same 7).
3. Confirm every rival still counts toward standings — no decorative
   filler car — exactly as today.

## Scenario B: Determinism

1. Using the same seed/entrant, reach a given PvP stage and note the 7
   rivals selected.
2. If the harness allows restarting with the same seed, confirm the
   exact same 7 rivals are selected again for the same stage.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS). Acceptance requires all automated checks and scenarios above,
plus zero regression in any existing `012-multi-ghost-contest`,
`013-race-spectacle`, or `018-track-generation` test — in particular,
the 11+ tests that construct a roster directly from `RIVAL_PROFILES`
must remain completely unmodified.
