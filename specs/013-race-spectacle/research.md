# Research: Race Spectacle

## Decision 1: Tracks are hand-authored fixed point-path data, never generated

**Decision**: Each of the 3 catalog tracks is authored as a fixed, static
array of path points (a closed loop) — the same way `entrants.ts`/
`sample-data.ts` author fixed content today. No track shape is computed
from noise, splines, or any other runtime generation.

**Rationale**: The owner's clarify-phase answer chose "derive selection
from the existing run seed + PvP stage ordinal" specifically to avoid
inventing a new identifier concept — but selection determinism only solves
half the "canonical across every viewer" requirement. If the *shape itself*
were procedurally generated at render time (as Alex's POC does), even a
correctly-seeded generator risks subtle floating-point differences across
browsers/devices for the same inputs. Authoring the 3 shapes as fixed data
removes that entire risk class: there is nothing to (re)compute, only an
index to pick.

**Alternatives considered**:
- Procedural generation from a seed (Alex's convex-hull/spline approach):
  rejected — real algorithmic complexity for zero benefit at a 3-track
  catalog size, and reintroduces exactly the cross-client drift risk
  `specs/skribidi-gap-decisions.md` §2 flagged as needing its own
  architecture pass to avoid.

## Decision 2: Track selection is `(runSeed + pvpStageOrdinal) mod 3`

**Decision**: `selectTrack(runSeed: number, pvpStageOrdinal: number):
Track` indexes into the fixed 3-track catalog using a simple deterministic
formula over the two inputs `012-multi-ghost-contest` already threads
through `resolveContest` (its `seed` and `level` parameters). No new
identifier is introduced, per the specify-phase decision (FR-003).

**Rationale**: Simplest possible deterministic mapping from already-existing
inputs to a bounded catalog index. Reusing `012`'s own `seed`/`level`
means track selection requires no new state to be threaded anywhere new —
any code that can call `resolveContest` can also call `selectTrack` with
the same two values.

**Alternatives considered**:
- Hash-based selection (e.g. a proper hash of `(seed, level)`): rejected as
  unnecessary complexity — a 3-way modulo has no meaningful distribution
  concerns at this catalog size, and simplicity here is itself valuable
  given how much the "canonical across viewers" requirement depends on this
  function being trivially auditable.

## Decision 3: `PlaybackSchedule` extends to N cars, mirroring `012`'s `CarResult[]`

**Decision**: `PlaybackSchedule.player`/`.ghost` become a single
`cars: CarSchedule[]` array (one entry per `NCarContestResult.cars` entry,
same order). `frameStateAt` returns `cars: CarProgress[]` instead of
separate `player`/`ghost` fields, plus a derived `standingsAt` ordering
(see Decision 5) and `newCallouts` scoped to the player's own car only
(per the clarify-phase decision that rivals get no dedicated visual cue).

**Rationale**: Directly mirrors how `012` itself generalized from a
two-sided shape to an array — keeps the two features' data shapes
conceptually parallel, and every existing `buildCarSchedule`/
`carProgressAt`/`cumulativeSimulatedTimeAt` function in `playback.ts`
already operates per-`CarSchedule` and needs no logic change, only to be
mapped over `cars[]` instead of called twice by name.

**Alternatives considered**:
- Keep `player`/`ghost` and add a parallel `rivals: CarSchedule[]`:
  rejected for the same reason `012` rejected the equivalent split — it
  re-introduces a player/rival asymmetry the data itself doesn't have.

## Decision 4: Live standings and ticker "notable moments" share one derivation

**Decision**: A single pure function, `standingsAt(schedule, visualTimeSeconds):
RankedCar[]`, computes every car's live position at a moment in playback by
comparing `cumulativeSimulatedTimeAt` across all cars. Both the standings
sidebar (FR-004) and the ticker's "notable moment" detection (lead
changes, per FR-006) call this same function — never two independent
implementations of "what's the current order."

**Rationale**: `SC-003` requires the standings view to have zero
discrepancy with a direct comparison of precomputed per-car progress. The
only way to guarantee that by construction, not by careful duplication, is
for both consumers to call the same function.

**Alternatives considered**:
- Separate lead-change detection logic embedded in ticker code: rejected —
  duplicating "what's the current order" logic is exactly the kind of
  drift risk `SC-003` exists to rule out.

## Decision 5: Ticker "notable moments" are derived, not separately authored

**Decision**: A rival's ticker-worthy moments (taking the lead, finishing)
are detected by calling `standingsAt` at each rendered frame and comparing
against the previous frame's order — not by any new field stored on
`CarResult` or `PlayerLap`. The player's own firing events reuse the
existing `calloutEventsForLap` function unchanged.

**Rationale**: Keeps `012-multi-ghost-contest`'s contract completely
untouched — this feature is a pure consumer of `NCarContestResult`, adding
no new simulation-side data, matching this spec's own Assumptions ("adds
no new simulation contract of its own beyond track selection").

**Alternatives considered**:
- Have `012` record explicit "position change" events in the result:
  rejected — would make `012`'s contract depend on `013`'s presentation
  needs, backwards from the actual dependency direction the two specs
  already establish.

## Decision 6: Motion cues are presentation-only, no new physics model

**Decision**: Each car's heading is derived from the track path's tangent
at its current position (extending today's ellipse-angle rotation to an
arbitrary closed path); a short fading trail of recent rendered positions
is drawn behind each car as the sole "motion" flourish. No drifting,
slipstream, or cornering-speed concept is modeled — this project has no
per-corner physics today and none is introduced by this feature.

**Rationale**: Delivers a visibly "in motion" feel (the gap this spec's
User Story 1 asks for) without inventing any new outcome-affecting
mechanic. The trail is computed purely from already-rendered positions, so
it is trivially deterministic — same replay, same trail, every time.

**Alternatives considered**:
- Alex's drift-angle/slipstream-glow treatment: rejected — those are tied
  to a cornering-speed physics model this project doesn't have and isn't
  adding; porting the visual without the underlying mechanic would be
  decoration that implies a mechanic that doesn't exist, which cuts against
  Principle III (a visual cue should mean something real).

## Decision 7: Pacing tuning is a `/speckit.tasks`-time content pass, not new architecture

**Decision**: The exact watch-duration/pacing-curve tuning called for by
FR-009/SC-006 (the "make it feel like The Bazaar" qualitative bar) is
implemented as parameter tuning on the existing `RACE_ANIMATION_SECONDS`-
style constant and per-lap scaling formula in `playback.ts`, validated by
playtesting per SC-006 — not a new algorithm or a configurable-per-race
value.

**Rationale**: `006-race-visualizer`'s existing proportional-scaling
formula (`scaleFactor = duration / max(playerTime, ghostTime)`) already
does the core job; extending it to `max(...cars.map(c => c.time))` for N
cars is a direct generalization. The actual number (still 20 seconds? more,
given 8 cars racing together needs more visual room to read?) is a tuning
decision best made by playtesting against SC-006's qualitative bar, not
fixed by research/architecture work.

**Alternatives considered**:
- A pacing curve that varies by field spread (tighter finishes get more
  time, blowouts get less): rejected as unnecessary complexity for a first
  pass — a single fixed duration, well-tuned, is what FR-009 asks for.
