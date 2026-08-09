# Quickstart: Race Spectacle

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/race-spectacle-contract.md](./contracts/race-spectacle-contract.md).

## Prerequisites

- `012-multi-ghost-contest` implemented (this feature is a pure consumer
  of its `NCarContestResult`)
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

1. `selectTrack` tests confirm determinism (identical `(runSeed,
   pvpStageOrdinal)` -> identical `Track`) and that the catalog contains
   exactly 3 fixed, non-generated tracks.
2. `buildPlaybackSchedule`/`frameStateAt` tests confirm the schedule always
   carries exactly 8 `CarSchedule`s in `NCarContestResult.cars` order, and
   that `scaleFactor` derives from the slowest of all 8 cars.
3. `standingsAt` tests confirm a contiguous 1..8 `position` permutation at
   any sampled `visualTimeSeconds`, matching a direct comparison of
   `cumulativeSimulatedTimeAt` across all cars (SC-003) — with zero
   discrepancy against what the ticker's lead-change detection sees, since
   both call the same function.
4. `newCallouts` tests confirm it is populated only for the player's car,
   never for a rival, across a sample of resolved contests.
5. Ticker curation tests confirm: the player's own firings always produce
   a `"player-fired"` line; a rival produces a line only on taking the
   lead or finishing; a rival with zero notable moments and zero firings
   produces zero ticker lines (not an error).
6. Migrated `ContestScene`/`contestFormatting.ts` tests confirm no
   remaining assumption of exactly one opponent.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Track and Field Legibility

1. Complete entrant selection and reach a scheduled PvP contest.
2. Watch the resulting presentation; confirm a real track shape renders
   (not the old bare oval) and all 8 cars are visible and individually
   distinguishable throughout.
3. Confirm the live standings sidebar updates continuously as the race
   plays, not only at the end.
4. Resolve and watch two different contests; confirm each shows a track
   consistent with `(runSeed + pvpStageOrdinal) mod 3` — replay the same
   contest and confirm the same track appears again.

## Scenario B: Player-Only Cues, Curated Ticker

1. During playback, confirm the player's board flashes at the exact
   moment one of the player's own items fires.
2. Confirm no equivalent flash appears anywhere for a rival's firing.
3. Confirm the commentary ticker narrates every one of the player's own
   firings, plus rival lines only when a rival takes the lead or finishes
   — not a line for every rival firing.
4. Confirm no ticker line or visual cue appears that cannot be traced back
   to a fact already present in the underlying `012` result.

## Scenario C: No Speed Control, Pacing Feel

1. Confirm no playback-speed or skip-to-end control exists anywhere in the
   presentation UI.
2. Watch several resolved contests with different field spreads (a close
   finish and a spread-out finish); confirm the single fixed watch
   duration stays legible and well-paced in both — this is a subjective
   playtesting judgment against SC-006, not a pass/fail assertion.

## Scenario D: Determinism Across Replays

1. Resolve a contest once and record its track, cue timings, and ticker
   lines.
2. Replay the same resolved result a second time (not a new contest —
   the same `NCarContestResult`).
3. Confirm the track, every cue timing, and every ticker line are
   identical to the first playback.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all PASS).
Acceptance requires all automated checks and scenarios above, plus zero
remaining tests exercising the pre-feature two-car
`PlaybackSchedule`/`leaderLabel` shapes.
