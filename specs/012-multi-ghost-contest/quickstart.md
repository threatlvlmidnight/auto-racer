# Quickstart: Multi-Ghost Contest

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/multi-ghost-contract.md](./contracts/multi-ghost-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`
- Feature implementation complete; this planning artifact does not add
  runtime code

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. Rival profile catalog tests confirm exactly 7 profiles, unique IDs, and
   every `vehicleId` resolving to an existing vehicle definition.
2. `resolveRivalBuild` tests confirm determinism (identical
   `(profile, level, seed)` -> deeply equal builds), level-scaling produces
   measurably different stats at different levels from the same profile,
   and the resolved build installs/resolves through the existing
   Fitted/Flexible/Improvised path with no rival-only rule.
3. `resolveContest` tests confirm: exactly 8 `CarResult`s per resolution;
   every rival counts toward `cars`/standings (no decorative car);
   `position` is a contiguous 1..8 permutation with no duplicates even on
   a forced tie; determinism across repeated resolutions with identical
   inputs; a rival roster of length != 7 fails loudly and typed rather than
   silently.
4. Migrated consumer tests (`ContestScene`, `contestFormatting`,
   `ResultScene`) confirm zero remaining assumption of exactly one
   opponent, and confirm no test still asserts the old
   `playerTime`/`ghostTime`/`gap` shape (SC-005).
5. Test Day/Practice mode regression: `TestDayScene`,
   `PracticeContestScene`, `PracticeResultScene`, and their existing tests
   pass unchanged, still resolving against `SAMPLE_GHOST` only (FR-011).

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Full Field Resolution

1. Complete entrant selection and reach a scheduled PvP contest.
2. Confirm the race resolves the player against 7 rivals (8 cars total).
3. Confirm every one of the 8 cars completes the race and appears in the
   result — none is missing, none is purely decorative.
4. Resolve the same build/roster/level/seed a second time (e.g. via a
   scripted repeat, not just replaying the same UI session) and confirm an
   identical result.

## Scenario B: Full Standings

1. After a race, open the result screen.
2. Confirm the player's exact finishing position (e.g. "3rd of 8") is
   shown, along with their time and gap to every other car — not only a
   single win/loss verdict against one designated rival.
3. Confirm every rival's name/color/position is visible and distinguishable
   from the player's own row.

## Scenario C: Rival Build Inspectability

1. Pick any rival appearing in a race result.
2. Confirm its installed items (per the Rival Intel direction already
   recorded in `specs/skribidi-gap-decisions.md` §8, once built) are
   real, inspectable items from the same catalog the player draws from —
   not an abstract numeric strength rating.
3. Confirm the same rival profile, resolved at two different in-run PvP
   stage ordinals (level 1 vs. level 2), produces a measurably different
   (stronger at the later level) build from the one authored profile.

## Scenario D: Test Day Regression

1. From the prepare phase, open Test Day/Practice mode.
2. Confirm it still races the player's current build against the single
   fixed-pace reference — no rival roster, no 8-car field, unchanged from
   before this feature.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all PASS).
Acceptance requires all automated checks and scenarios above, plus zero
remaining tests exercising the pre-feature 1v1-only `ContestResult` shape.
