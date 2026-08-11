# Handoff

**Last updated**: 2026-08-11, end of the "implement 012-017, then spec 018/019" session.

**State**: `main` is in sync with `origin/main` (`285cb70`) — every
implementation commit below is already pushed. **The two newly-specced
features' planning documents are NOT yet committed** — `specs/
018-track-generation/`, `specs/019-async-ghost-pool/`, the updated
`specs/skribidi-gap-decisions.md`, and `.specify/feature.json` (pointing
at `019-async-ghost-pool`) are all untracked/modified in the working
tree as of this writing. **Commit and push these before doing anything
else next session** — the whole point of this handoff is the two specs
below, and right now they only exist locally.

## What happened this session, in order

1. Implemented all 6 features the previous handoff (`aeb7f13`) left
   "fully planned and ready to build": `012-multi-ghost-contest`,
   `013-race-spectacle`, `014-item-synergy-tags`, `015-economy-depth`,
   `016-duplicate-item-tiering`, `017-season-structure-grow`. Each
   followed strict test-first TDD per its own `tasks.md`, each was
   committed and pushed separately (see commit log,
   `014951a`..`285cb70`). Mid-`015`, the owner redesigned reputation
   from flat win/loss deltas to a position-based table (podium gains,
   back-of-field losses) — implemented as a same-day follow-up
   (`a7de930`), not a separate spec-kit pass.
2. Owner asked to build `pre-race-setup` (`specs/
   skribidi-gap-decisions.md` §8) next. Scoping conversation split it
   into three pieces: **Rival Intel** moves to its own future feature
   (unscoped, not started); the **item-driven configurable-control
   mechanic** (e.g. a brake-bias slider) is blocked on real track data,
   which didn't exist — `013`'s tracks were (and, until `018` is
   implemented, still are) decorative hand-plotted polylines with zero
   gameplay-affecting characteristics.
3. Specced **`018-track-generation`** to unblock that: tracks become a
   deterministic, seeded sequence of straight/corner segments (closed
   and non-self-intersecting *by construction* — uniform turn
   direction, turns summing to exactly 360°, never by post-generation
   validation), scored on three real-motorsport-grounded axes
   (`corneringDemand`/`brakingDemand`/`powerDemand`, researched against
   how F1 actually classifies circuits), wired into real lap-time
   simulation via a new optional `track` parameter on
   `simulatePlayerLaps` (a build's Power/Chassis item lean interacts
   with the track's own lean). Full specify → plan → tasks →
   `/speckit.analyze` pipeline. **Analyze caught one CRITICAL bug**:
   `tasks.md` named the wrong file for `selectTrack`'s real caller
   (claimed `src/simulation/contest.ts`; the actual, only production
   caller is `src/scenes/ContestScene.ts:80`, `resolveContest` itself
   never called it) — fixed, plus two related missing tasks and one
   overstated requirement. Separately, the owner raised a real
   architecture concern mid-review: track generation must never couple
   to one player's own `Run`, because a future async-multiplayer lobby
   will need to generate one track for a *group* of players, not one
   per individual run. The function signatures already satisfied this
   (`generateTrack(seed, pvpOrdinal)` takes bare numbers, never a
   `Run`), but the spec's *prose* said "run seed" in several places —
   reworded throughout and made binding (FR-002, a dedicated
   Assumption, contract §2).
4. Owner asked to spec async multiplayer itself. Scoped down (same
   session, same conversation) to **`019-async-ghost-pool`** — a
   "mechanism first, real backend later" slice: a new, separate,
   additive `GHOST_POOL` catalog (containing today's 7 authored rivals
   plus new ones) with deterministic per-contest selection
   (`selectGhostRoster(pool, seed, level)`, reusing `resolveContest`'s
   existing `seed`/`level` parameters — no new identifier concept),
   replacing the always-identical fixed 7-rival roster. Explicitly
   defers real player-recorded ghosts, accounts, and any actual backend
   to a later feature — this one only protects the extension point.
   Same non-coupling requirement as `018`, applied to
   `selectGhostRoster`'s own signature. **A pre-plan review (owner-
   requested, before writing plan.md) caught a real regression risk**
   before it became code: the original spec wording ("grow the roster")
   read as widening `RIVAL_PROFILES` itself, which would have broken
   11+ existing tests that pass it directly into `resolveContest`
   (verified directly against the codebase, not assumed) — fixed by
   making the pool an explicitly separate, additive catalog.
   `/speckit.analyze` then found 3 more small LOW/MEDIUM gaps (listed
   below, **not yet applied**).

## What's fully planned and ready to build

| # | Feature | What it does | Depends on |
|---|---|---|---|
| 1 | `018-track-generation` | Procedural, deterministic, seeded track generation (corner/straight segments, not points); 3 motorsport-grounded characteristics; wired into real lap-time simulation via a new `trackFit` fold | Nothing — independent |
| 2 | `019-async-ghost-pool` | Wider authored rival pool + deterministic per-contest 7-car selection, replacing the fixed roster; foundation for real async multiplayer later | Nothing — independent of `018` too (different files, each has its own small local seeded PRNG by design — see both `research.md`s' "no shared utility yet" decision) |

Both have the full artifact set in their `specs/NNN-.../` directory:
`spec.md`, `checklists/requirements.md`, `plan.md`, `research.md`,
`data-model.md`, `contracts/*.md`, `quickstart.md`, `tasks.md`. **Start
either by reading `tasks.md`** — it's the executable entry point, and
both already reflect their analyze-pass fixes (except `019`'s 3 pending
items below).

**Build order**: either first, or in parallel — there is no dependency
between them. `018` is the larger/riskier one (touches core
`simulatePlayerLaps`/`resolveContest` simulation math); `019` is
smaller and touches only `content/rivals.ts`, `simulation/rivals.ts`,
and one call site in `runPresentation.ts`.

### `019`'s 3 pending analyze findings — not yet applied

All LOW/MEDIUM, none blocking, all cheap:

1. Add a task confirming FR-009 (selected roster is inspectable) is
   already satisfied by `NCarContestResult.cars`'s existing
   `name`/`id`/`color` fields — no new task exists for this yet.
2. Add a one-line guardrail to `tasks.md`'s Notes: "no task here should
   add a field to `RivalProfile`/`ItemDefinition`" (FR-008).
3. Reword `tasks.md` T020 to also run `018`'s test suite if `018` has
   landed by the time `019` is implemented (currently only names
   `012`/`013`) — low-risk either way since Polish's `npm test` would
   catch it regardless.

## What's still blocked / not started

- **`pre-race-setup` itself** (the actual screen: track preview + the
  configurable-control UI) — blocked on `018` being *implemented*, not
  just planned, same as it was blocked on `013` before. Do not spec
  this until `018`'s track model actually exists in code.
- **Rival Intel** — deferred to its own future feature, entirely
  unscoped. Split out of `pre-race-setup` this session.
- **Real async multiplayer** (accounts, backend, player-recorded ghost
  upload, a genuine shared-lobby ID) — `019` is deliberately just the
  first, backend-free increment. The real thing is still a separate,
  much larger future feature; `019`'s own spec says so explicitly.
- **Rejected, no work planned**: garage slot count increase (§3 —
  stays at 4 active / 3 storage), sabotage/inspection risk items (§9).
- **Explicitly out of scope, tracked in `specs/DEFERRED.md`**:
  Scrutineering, Factory Development, Privateer Exchange, event-type
  variety.

## Critical process notes for whoever picks this up

- **Commit the untracked planning docs first** (see State above) —
  everything else in this doc assumes they're safely pushed.
- **This repo has no native Claude Code `/speckit.*` slash commands.**
  They're GitHub Copilot agent-format files at
  `.github/agents/speckit.{specify,clarify,plan,tasks,analyze}.agent.md`.
  Read the file and follow its documented steps exactly; use
  `.specify/scripts/bash/{create-new-feature,check-prerequisites,setup-plan,setup-tasks}.sh`
  for path resolution.
- **`/speckit.analyze` earns its keep — run it on every feature with
  real architectural surface**, and don't trust it blindly either:
  both `018` and `019` had real bugs (a wrong file-path claim; a
  catalog-widening design that would've broken a dozen tests) that
  were caught by cross-checking claims *against the actual codebase*,
  not by re-reading the planning documents' own internal consistency.
  Re-reading your own prose does not catch "I assumed the wrong
  function calls this."
- **The non-coupling pattern is now an established, protected
  convention, not a one-off**: any function that resolves a contest's
  track/roster/etc. must take a plain scalar seed, never a `Run` or
  player-identity object — both `018-track-generation` and
  `019-async-ghost-pool` bake this in as a binding FR specifically so a
  future multiplayer-lobby feature can supply a shared ID with zero
  rework. Preserve this in anything touched later.
- **Strict test-first (red-green TDD) is a hard project convention**
  for everything under `src/simulation/` — both new `tasks.md` files
  already encode this.
- **Simulation stays framework-free.** `src/simulation/` has zero
  Phaser imports; scenes only render/format precomputed results.
- **Balance constants are deliberately left unfixed** in both new
  specs (track generation's segment-count/angle ranges and scoring
  formula constants; `019`'s exact `GHOST_POOL` size) — each `plan.md`/
  `research.md` says where the placeholder lives; don't block on
  picking exact numbers before starting.
- **`018` and `019` each duplicate a small (~10-line) local seeded
  PRNG on purpose** (mulberry32-style) rather than sharing one module —
  neither feature depends on the other's implementation order. If both
  ship, extracting a shared `src/simulation/prng.ts` afterward is a
  safe, optional, purely mechanical cleanup — not a prerequisite for
  either.

## Where to look first

1. `specs/skribidi-gap-decisions.md` §1/§2/§8 — the original decisions
   `018`/`019` grew out of, with 2026-08-11 follow-up notes on how each
   was actually scoped
2. `specs/018-track-generation/tasks.md` and
   `specs/019-async-ghost-pool/tasks.md` — the actual next things to
   build
3. `specs/DEFERRED.md` — everything intentionally not done yet, and why
