# Handoff

**Last updated**: 2026-08-11, end of the "implement 018/019" session.

**State**: `main` is in sync with local history through `3f0bff7`
("Implement feature 019: async ghost pool") — not yet pushed to
`origin/main` as of this writing; push before starting anything else.
Working tree is otherwise clean.

## What happened this session, in order

1. Implemented **`018-track-generation`** per its `tasks.md` (35 tasks,
   T001-T035), strict test-first throughout. `src/simulation/tracks.ts`
   now generates every track procedurally — a closed, non-self-
   intersecting segment sequence guaranteed *by construction* (uniform
   turn direction, corner angles scaled to sum to exactly 360°, straight
   lengths solved via a least-squares closure fit — never by post-
   generation validation/retry). `src/content/tracks.ts`/`TRACKS`/
   `selectTrack` are deleted entirely. Three characteristics
   (`corneringDemand`/`powerDemand`/`brakingDemand`) score every track,
   and a build's Power/Chassis lean now measurably affects lap time via
   a new `trackFit` fold on `simulatePlayerLaps` (optional `track` param,
   zero change to any call site that omits it). `resolveContest`'s N-car
   overload generates one track per contest and applies it identically
   to the player and all 7 rivals.
   - **Two real bugs found and fixed during implementation** (not just
     planning-stage issues): (a) the original `corneringDemand` formula
     was linear in `turnDegrees`, but every track's corner angles always
     sum to exactly 360° by the closure invariant — so total cornering
     length was accidentally *constant* across every track, and
     corneringDemand could never exceed powerDemand. Fixed with a
     super-linear (concentration-sensitive) formula, empirically tuned
     so both power-dominant and cornering-dominant tracks genuinely
     occur (`CORNER_LENGTH_EXPONENT`/`CORNER_LENGTH_SCALE` in
     `tracks.ts`). (b) `buildTrackLean` crashed on real rival builds —
     filtered on `item !== null`, but this codebase's established
     convention (`!slot.item`, used throughout `laps.ts`/`slots.ts`/
     `storage.ts`) treats slot items as falsy-checkable, and one
     construction path left `item` as `undefined` rather than `null`.
   - Verified live in the browser: PvP contests render a real generated
     polygon track (visibly distinct straights/corners, not the old
     smooth ovals), standings update live, `npm test`/`build`/`lint` all
     clean (622 tests).
2. Implemented **`019-async-ghost-pool`** per its `tasks.md` (23 tasks,
   T001-T023), same discipline. `GHOST_POOL` (`src/content/rivals.ts`)
   is a new, additive catalog — the original 7 `RIVAL_PROFILES` plus 5
   new authored rivals (Wren Thorne, Ottoline Halden, Casimir Espinoza,
   Perpetua Linden, Delphine Okoye), 12 entries total. `RIVAL_PROFILES`
   itself is byte-for-byte untouched — confirmed by every one of the
   11+ existing tests that pass it directly into `resolveContest`
   passing with zero modification. `selectGhostRoster(pool, seed,
   level)` (`src/simulation/rivals.ts`) is a partial Fisher-Yates
   shuffle reusing the file's own pre-existing local `mulberry32` (no
   new PRNG needed — it already lived in that file for
   `resolveRivalBuild`). `contestSceneInput`
   (`src/scenes/runPresentation.ts`) now draws `rivalRoster` from
   `selectGhostRoster(GHOST_POOL, run.seed, level)` instead of a fixed
   `RIVAL_PROFILES` reference — the only production call site.
   `resolveContest` itself required zero changes, exactly as planned.
   - Verified live in the browser: the standings sidebar showed three
     of the five new rivals (Ottoline Halden, Perpetua Linden, Wren
     Thorne) mixed in with the classic roster in the same race — direct
     visual proof the wider pool is live. 642 tests, clean build/lint.
3. Committed as two feature-scoped commits (`1a170fe` for 018,
   `3f0bff7` for 019), matching this project's established one-feature-
   per-commit convention. Not yet pushed.

## What's fully done, live, and playable

Both `018-track-generation` and `019-async-ghost-pool` are implemented,
tested, and verified in the browser. There is nothing left to build for
either — only the not-yet-pushed commit.

## What's still blocked / not started

- **`pre-race-setup` itself** (the actual screen: track preview + the
  item-driven configurable-control mechanic, e.g. a brake-bias slider)
  — this was the *reason* `018` got built. It is now genuinely
  unblocked: real track data with real characteristics exists in code.
  This is very likely the natural next feature to spec.
- **Rival Intel** — deferred to its own future feature, entirely
  unscoped. Split out of `pre-race-setup` earlier this arc.
- **Real async multiplayer** (accounts, backend, player-recorded ghost
  upload, a genuine shared-lobby ID) — `019` is deliberately just the
  first, backend-free increment (a wider deterministic pool + per-
  contest selection). The real thing — an actual shared lobby where 8
  real players race the same generated track together — is still a
  separate, much larger future feature. Both `018`'s `generateTrack`
  and `019`'s `selectGhostRoster` were deliberately built to accept only
  a plain numeric seed (never a `Run`/player-identity object) precisely
  so that future feature can supply a shared lobby ID with zero rework
  to either function.
- **Rejected, no work planned**: garage slot count increase (§3 of
  `skribidi-gap-decisions.md` — stays at 4 active / 3 storage),
  sabotage/inspection risk items (§9).
- **Explicitly out of scope, tracked in `specs/DEFERRED.md`**:
  Scrutineering, Factory Development, Privateer Exchange, event-type
  variety.

## Critical process notes for whoever picks this up

- **Push `3f0bff7` to `origin/main` before anything else** if it hasn't
  happened yet — check `git status`/`git log origin/main..HEAD` first.
- **This repo has no native Claude Code `/speckit.*` slash commands.**
  They're GitHub Copilot agent-format files at
  `.github/agents/speckit.{specify,clarify,plan,tasks,analyze}.agent.md`.
  Read the file and follow its documented steps exactly; use
  `.specify/scripts/bash/{create-new-feature,check-prerequisites,setup-plan,setup-tasks}.sh`
  for path resolution.
- **Strict test-first (red-green TDD) is a hard project convention**
  for everything under `src/simulation/` and `src/content/`. Both `018`
  and `019` followed it throughout this session with zero exceptions —
  every implementation task had its RED test confirmed first.
- **Even a fully-planned, analyze-passed spec can still hide a real bug
  that only surfaces at implementation time.** `018`'s corneringDemand
  formula and `buildTrackLean`'s null-check both looked correct on
  paper (and matched the plan's documented formulas/contracts exactly)
  but failed on first real test run — caught by running the actual test
  suite against a wide sample of seeds, not by re-reading the spec.
  Empirical verification (a Node probe script sweeping many parameter
  combinations for the cornering formula) found working constants
  faster than reasoning about it analytically.
- **Simulation stays framework-free.** `src/simulation/` has zero
  Phaser imports; scenes only render/format precomputed results.
- **Balance constants remain genuinely unfixed/tunable**: `018`'s
  `MIN_CORNER_COUNT`/`MAX_CORNER_COUNT`/`RAW_CORNER_DEGREES_*`/
  `CORNER_LENGTH_EXPONENT`/`CORNER_LENGTH_SCALE`/`SHARP_CORNER_DEGREES`/
  `BRAKING_REFERENCE`/`TRACK_FIT_MAX_PERCENT` (all in `tracks.ts`) and
  `019`'s `GHOST_POOL` size (currently 12) are working values chosen to
  satisfy the contracts' behavioral invariants, not authoritative
  final balance — a later tuning pass remains free to adjust them.
- **The non-coupling pattern is now proven in shipped code, not just
  spec prose**: `generateTrack(seed, pvpOrdinal)` and
  `selectGhostRoster(pool, seed, level)` both take only plain numbers,
  verified by real TypeScript signatures compiling and real tests
  calling them with no `Run` in scope anywhere. Preserve this in
  anything touched later, especially the eventual real-multiplayer-lobby
  feature both were built to anticipate.
- **Automated browser testing note**: the in-app Browser pane's
  screenshot pixel space is 800×450 regardless of how large the image
  renders visually — click coordinates should target that 800×450
  space directly, not whatever size the image appears at in your own
  reading of it. Also: this project's dev server (`vite`) may already
  be running in the background from a prior session on port 5173;
  check before starting a new one.

## Where to look first

1. `specs/skribidi-gap-decisions.md` §8 — `pre-race-setup`'s own
   decisions record, now genuinely unblocked by `018`
2. `src/simulation/tracks.ts` / `src/simulation/rivals.ts` — the actual
   shipped `018`/`019` implementations, if you need to build on them
3. `specs/DEFERRED.md` — everything intentionally not done yet, and why
