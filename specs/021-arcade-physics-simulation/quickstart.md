# Quickstart: Arcade Physics Simulation

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/physics-simulation-contract.md](./contracts/physics-simulation-contract.md).

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

1. `solveSpan`/`simulateLapPhysics` tests confirm: pure and deterministic;
   `totalSeconds` always exactly equals the sum of its own `phases[].seconds`;
   peak speed never exceeds `stats.topSpeed`; finite positive results for
   every valid input, including corners sharp enough or builds weak enough
   to require bounding.
2. `cornerArcLength`/`apexSpeed` tests confirm: apex speed decreases as
   `turnDegrees` increases (sharper is slower) and increases with the
   build's own `corneringSpeed` stat; both are pure functions of only their
   own arguments — no `Run`/player-identity access anywhere.
3. Shape-sensitivity tests confirm: two tracks with equal aggregate
   `corneringDemand`/`powerDemand`/`brakingDemand` scores but different
   real segment sequences produce different lap times for the same build
   — the specific property this feature exists to guarantee (SC-001).
4. Build-vs-track tests confirm: an item that trades cornering speed for
   straight-line pace is a net time gain on a corner-dominant generated
   track and a smaller gain (or a loss) on a straight-dominant one, for the
   same item (SC-002).
5. `simulatePlayerLaps` tests confirm: every existing one-/two-argument
   call (no `track`) is byte-for-byte unchanged from before this feature;
   every existing `timeModifier`-only item continues to fire and contribute
   exactly as it does today, with or without a track supplied.
6. Regression tests confirm every pre-existing `012-multi-ghost-contest`/
   `013-race-spectacle`/`018-track-generation` test passes unchanged, and
   that `018`'s `buildTrackLean`/`trackFit`/`TRACK_FIT_MAX_PERCENT` are
   referenced nowhere else in the codebase.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Track Shape Actually Matters

1. Reach a PvP stage; note the finishing order and gaps.
2. Reach several more PvP stages across a run (different generated tracks
   each time); confirm the same build's relative competitiveness visibly
   shifts from stage to stage — not always the same margin — consistent
   with different tracks now genuinely rewarding different physical
   strengths.
3. Inspect a race result's per-lap breakdown (once `020`'s item content
   exists to make this concrete, or via a build holding at least one
   `ItemPhysicsContribution` item authored for this quickstart); confirm a
   `physics` breakdown is visible and attributable, distinct from item
   contributions.

## Scenario B: Nothing That Didn't Opt In Changed

1. Run a Test Day/Practice session; confirm behavior (lap times, item
   firing, results) is indistinguishable from before this feature.
2. Confirm every existing PvP contest that predates any physics-stat item
   in a build still produces results consistent with the old flat-
   `timeModifier` math, since a build made entirely of `timeModifier`-only
   items reduces to `physicsLapTime(stock stats, track) + Σ(timeModifier)`,
   with the physics term identical for every such build on a given track.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS — see plan.md). Acceptance requires all automated checks and
scenarios above, plus zero regression in any existing `012`/`013`/`018`
test.
