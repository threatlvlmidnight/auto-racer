# Quickstart: Track Generation

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/track-generation-contract.md](./contracts/track-generation-contract.md).

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

1. `generateTrack` tests confirm: determinism across repeated calls
   with the same `(seed, pvpOrdinal)`; every generated segment sequence
   closes (returns to its start position/heading) with no
   degenerate/self-intersecting shape possible; accepts any integer
   `pvpOrdinal`, not just 1-4.
2. `trackCharacteristics` tests confirm: all three scores are integers
   in `[0, 100]`; `corneringDemand`/`powerDemand` are near-complementary
   and move in the directions FR-005 requires as corner/straight
   composition changes; `brakingDemand` varies independently — a
   corner-heavy-but-gentle track and a corner-light-but-sharp track
   produce different `brakingDemand` values.
3. `buildTrackLean` tests confirm: derives purely from installed items'
   `installationCategory`; returns exactly `0` for an empty or
   perfectly balanced build; ignores storage items and purchasable-
   content/identity state entirely.
4. `simulatePlayerLaps` tests confirm: every existing one-/two-argument
   call (no `track`) is byte-for-byte unchanged from before this
   feature; supplying a `track` produces a `trackFit`-adjusted result in
   the direction the build's lean and the track's bias predict, and a
   neutral/empty build sees `appliedPercent === 0` regardless of track.
5. `resolveContest` tests confirm: the N-car overload generates exactly
   one track per contest and applies it identically to the player and
   every rival; the legacy 2-car overload is untouched.
6. Regression tests confirm every pre-existing `012-multi-ghost-contest`
   and `013-race-spectacle` test passes unchanged against generated
   tracks, and that the removed `content/tracks.ts`/`TRACKS`/
   `selectTrack` are referenced nowhere else in the codebase.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Every Race Has a Real, Different Track

1. Start a run and play through to the first PvP stage; watch the
   race. Confirm the track is a closed loop of straights and visibly
   distinct corners (not the old smooth hand-authored ovals) and that
   the standings sidebar/commentary render exactly as before.
2. Replay the exact same seed/ordinal pair's first PvP stage again
   (e.g. by restarting with the same entrant/seed if the harness allows
   it, or by inspecting the generated track's data directly); confirm
   the track is identical every time.
3. Reach the second, third, and fourth PvP stages in the same run;
   confirm each is visibly different in shape from the others and from
   the first.

## Scenario B: Build Composition Measurably Matters

1. Build a Power-heavy vehicle (mostly Power-category items installed)
   and resolve a contest; note the finishing time.
2. Build a Chassis-heavy vehicle with an otherwise equivalent set of
   items and resolve a contest on a track with a similar
   power/cornering bias; confirm the two builds' relative performance
   differs in the direction their composition predicts.
3. Inspect the race result's per-lap breakdown; confirm a `trackFit`
   value is visible and attributable, distinct from item contributions.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS). Acceptance requires all automated checks and scenarios above,
plus zero regression in any existing `012-multi-ghost-contest` or
`013-race-spectacle` test.
