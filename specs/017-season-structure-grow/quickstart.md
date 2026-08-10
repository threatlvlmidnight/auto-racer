# Quickstart: Season Structure Growth

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/season-schedule-contract.md](./contracts/season-schedule-contract.md).

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

1. `createStages` tests confirm: exactly 12 entries; the fixed [choice,
   choice, pvp] × 4 order; `choiceOrdinal` 1-8 across the 8 choice
   entries; `pvpOrdinal` 1-4 across the 4 pvp entries; every pvp entry
   has a defined `lapCount`; the 12th entry is pvp-kind.
2. `advanceRun` tests confirm `"completed"` status is reached only after
   the 12th stage — not at the old 6-stage boundary.
3. Sponsor objective tests confirm the next-PvP-stage lookup correctly
   finds the right stage regardless of how many earlier PvP stages
   already occurred, including a contract accepted at the 11th (last)
   choice stage.
4. `012-multi-ghost-contest` integration tests confirm rival-profile
   resolution succeeds at `pvpOrdinal` 3 and 4 with zero change to that
   feature's own resolution logic.
5. Regression tests confirm every pre-existing `run.ts`/`RunScene.ts`
   test that depended on the 6-stage assumption now reflects the
   12-stage schedule, and that `tests/fixtures/practice-run-fixtures.ts`
   is updated to match.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: A Full 12-Stage Season

1. Create a new run; confirm the stage progress indicator reads "Stage 1
   of 12."
2. Play through every stage in order; confirm the 3rd, 6th, 9th, and
   12th stages are each a PvP race, and every other stage offers Parts
   Supplier / Reward Draft / Sponsor Meeting exactly as today.
3. Confirm the run reaches its completed outcome only after the 12th
   stage's race resolves — not earlier.

## Scenario B: Cross-Feature Correctness at Later Ordinals

1. Reach the 3rd scheduled PvP stage (ordinal 3, position 9); confirm a
   rival build resolves correctly for that stage (once
   `012-multi-ghost-contest` is implemented).
2. Accept a sponsor contract with a `"win-next-race"` or
   `"target-race-time"` objective at the 11th (last) choice stage;
   confirm it correctly targets the 12th (final) PvP stage.
3. Reach the 4th scheduled PvP stage (ordinal 4, position 12); confirm
   the same rival-resolution and (once implemented) track-selection
   behavior holds.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS). Acceptance requires all automated checks and scenarios above,
plus zero regression in any existing `run.ts`/`RunScene.ts` test and
confirmed non-interference with `012-multi-ghost-contest`'s
already-planned rival-scaling logic.
