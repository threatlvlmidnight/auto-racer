# Feature Specification: Multi-Ghost Contest

**Feature Branch**: `012-multi-ghost-contest`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Extend contest resolution from 1v1 (player vs. one recorded ghost) to a full field of 6-8 simultaneous recorded ghosts, fully deterministic (no live/non-deterministic randomness), producing a complete ranked finishing order. Decided direction recorded in specs/skribidi-gap-decisions.md §1 following the Skribidi Skids POC gap analysis and a guided decision session with the project owner. Constitution Principle I already amended (v1.3.0) to permit this."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Race against a full field, not one ghost (Priority: P1)

A player enters a scheduled PvP contest expecting to race against a full
grid of opponents — not a single recorded ghost — because that's what
"race" is supposed to mean, and it's what makes the result worth watching
or comparing notes about.

**Why this priority**: This is the core value of the feature. Everything
else (standings detail, rival scaling) only matters once there's a real
field to race against.

**Independent Test**: Resolve a contest for a given player build; confirm
the result contains the player plus 7 rival cars (an 8-car field), each
with its own finishing time, and that the result is produced by a single
deterministic function call (no async/live step).

**Acceptance Scenarios**:

1. **Given** a player build and the current run's rival roster, **When** a
   PvP contest is resolved, **Then** the result contains the player and
   every rival car (7 total opponents, 8 cars in the field), each with a
   computed finishing time and lap breakdown.
2. **Given** the same player build, rival roster, run level, and seed,
   **When** the contest is resolved twice, **Then** both resolutions
   produce identical results in every field (Constitution Principle I/III
   determinism).
3. **Given** a resolved contest, **When** inspected for live or
   non-deterministic behavior, **Then** no value in the result depends on
   anything not already fixed by the build, rival roster, level, and seed
   at the moment resolution was called.

---

### User Story 2 - See exactly where you finished, against everyone (Priority: P1)

After a race, a player wants to know their exact finishing position among
every car that raced — "3rd of 8" — and be able to compare their time
against any specific rival, not just get a single win/loss verdict against
one opponent the way the game reports it today.

**Why this priority**: This is the direct payoff of racing a full field.
Without a real standings view, adding more cars has no player-visible
value over today's 1v1 result.

**Independent Test**: Resolve a contest, confirm the result exposes a
complete ranked order (1st through last) covering every car, and confirm
the existing result presentation (`ResultScene`) can render that full
order rather than only a player-vs-ghost gap.

**Acceptance Scenarios**:

1. **Given** a resolved multi-ghost contest, **When** the player views the
   result, **Then** they see their exact finishing position, their time,
   and their gap to every other car in the field — not only the fastest or
   only one designated rival.
2. **Given** two cars finish with identical total time, **When** the
   standings are computed, **Then** their relative order is decided by a
   documented, deterministic tie-break rule (never left ambiguous or
   randomized).
3. **Given** the existing single-ghost result consumers (`ResultScene`,
   `contestFormatting`, `playback`), **When** this feature ships,
   **Then** they either present the full N-car standings or are explicitly
   migrated/superseded — no consumer silently keeps assuming exactly one
   opponent.

---

### User Story 3 - Face rivals that scale as the run progresses (Priority: P2)

A rival a player recognizes from earlier in a run (or from a previous run)
should feel like the same "character" every time — but meaningfully
tougher later on — rather than every race drawing from an unrelated,
one-off set of opponent stats.

**Why this priority**: Without this, "7 rivals" is just a bigger fixed
list with no sense of progression. With it, the rival roster becomes
reusable content instead of one-off race-by-race authoring.

**Independent Test**: Resolve the same authored rival profile at two
different in-run levels; confirm it produces different, level-appropriate
stats from the one authored definition, and that resolving it twice at the
same level with the same seed produces identical stats.

**Acceptance Scenarios**:

1. **Given** an authored rival profile, **When** it is resolved at a
   higher in-run level than a previous resolution, **Then** its computed
   stats are measurably stronger, derived from the same profile rather
   than a different authored entry.
2. **Given** an authored rival profile, a level, and a seed, **When** it is
   resolved twice, **Then** both resolutions produce identical stats
   (Principle I/III determinism — no unseeded jitter).

---

### Edge Cases

- What happens if fewer authored rival profiles exist than the field needs
  (e.g. content ships with 6 profiles but a race calls for 8 opponents)?
  The system must fail loudly with a typed, inspectable error rather than
  silently duplicating a profile or racing with an incomplete field.
- What happens when two or more cars finish with exactly equal computed
  time? Resolved by a documented, deterministic tie-break (see FR-007) —
  never an unresolved or random ordering.
- What happens to a rival profile's stats at an in-run level below or
  above its authored range? Must produce a defined, bounded result (no
  negative/undefined stats), not an unhandled edge value.
- What happens to existing tests and callers written against the current
  1v1 `ContestResult` shape? They are migrated to the new shape or
  explicitly superseded — this feature must not ship with two silently
  divergent result contracts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST resolve a contest between the player and
  exactly 7 recorded rival ghosts (an 8-car field total) as a single
  deterministic, precomputed function call. No value in the result may
  depend on live input, wall-clock timing, or unseeded randomness
  (Constitution Principle I, amended v1.3.0; Principle III).
- **FR-002**: The contest result MUST include a complete ranked finishing
  order across every car in the field (player plus every rival), including
  each car's finishing time and lap breakdown — not only a player-vs-one
  comparison.
- **FR-003**: Every rival in the field MUST count toward the finishing
  order and any scoring/standings derived from it. The system MUST NOT
  include a car that races but is excluded from standings ("decorative"
  filler).
- **FR-004**: The system MUST author a reusable catalog of 7 rival stat
  profiles (archetypes: a name, identity, and stat-weighting), each
  resolvable at a given in-run level to produce concrete, level-scaled
  stats from that one authored definition — mirroring how a single vehicle
  topology is authored once and reused, not one fixed build per race.
  "In-run level" is the ordinal of the current scheduled PvP stage within
  the run (today: 1st or 2nd of the six-stage run's two PvP stages). This
  is intentionally low-resolution today and is expected to gain more
  distinct levels once the season-length growth in
  `specs/skribidi-gap-decisions.md` §7 lands — no new progression concept
  needs to be invented for this feature.
- **FR-005**: Resolving a rival profile at a given level and seed MUST be
  deterministic — identical inputs always produce identical stats.
- **FR-006**: This feature MUST NOT include live contact, collision, or
  wrecking resolution between cars. Cars race the same track without
  affecting each other's outcome; this is explicitly out of scope here
  (`specs/skribidi-gap-decisions.md` §1).
- **FR-007**: Ties in finishing time MUST resolve via a documented,
  deterministic rule (e.g. stable ordering by each car's fixed identity),
  never an undefined or random ordering.
- **FR-008**: Existing consumers of the current single-ghost
  `ContestResult` shape (`ResultScene`, `contestFormatting`, `playback`,
  and their tests) MUST be migrated to the new N-car result shape, or
  explicitly and visibly superseded — none may silently continue assuming
  exactly one opponent after this feature ships.
- **FR-009**: The existing contest visualization MUST be extended to show
  every car in the field progressing and finishing (at minimum: the
  current simple track presentation, extended from 2 markers to N).
  The richer procedural-track/particle/ticker presentation is explicitly
  out of scope for this feature — tracked separately as the `race-spectacle`
  feature (`specs/skribidi-gap-decisions.md` §2).
- **FR-010**: The rival profile pool MUST be identical across all four
  player entrants — no entrant/origin choice changes which 7 rival
  profiles a player can face. This extends the project's existing "identity
  changes draft weighting and vehicle topology, never total capacity or
  starting power" stance (Constitution Principle II, Fairness) to rival
  composition as well, and rival roster composition MUST NOT vary by any
  purchasable content, currency, or subscription either.
- **FR-011**: Test Day / Practice mode (`TestDayScene`, `PracticeContestScene`,
  `PracticeResultScene`, shipped in `011-build-test-day`) is explicitly
  OUT OF SCOPE for this feature and MUST NOT be changed by it. Practice
  continues to test a build against a single fixed-pace reference — its
  job is validating the player's own build numbers (Constitution Principle
  V), not mirroring the scored contest's field size.

### Key Entities

- **Rival Profile**: An authored, reusable stat-weight archetype (name,
  visual identity, relative weighting across the game's performance
  stats) that resolves, at a specific in-run level, into a real item-based
  build — not an abstract pace number. A resolved rival runs through the
  exact same lap simulation pipeline as the player's own build (same
  per-lap cooldown/buff/installation math), so a rival's strength is
  always inspectable as "what it has installed," consistent with
  Constitution Principle III. This replaces today's single fixed-pace
  `SampleGhost` for scored PvP contests (see Assumptions for Test Day/
  Practice mode, which is explicitly out of scope here).
- **N-Car Contest Result**: Extends today's `ContestResult` to carry a
  complete ranked list of every finisher (the player plus every rival),
  each with its own time, lap breakdown, and computed finishing position —
  rather than a single player-vs-one-ghost gap and outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every resolved contest produces a complete ranked order
  covering the player and every rival in the field, with zero ties left
  unresolved.
- **SC-002**: The same player build, rival roster, run level, and seed
  produce an identical finishing order and identical times across repeated
  resolutions, with zero exceptions (Constitution Principle I/III).
- **SC-003**: Players can state their exact finishing position (e.g. "3rd
  of 8") and their time gap to any specific other car in the field, not
  only a single win/loss verdict.
- **SC-004**: Every authored rival profile produces measurably different,
  level-appropriate stats when resolved at two different in-run levels,
  from the same one authored definition — no profile requires separate
  authoring per level.
- **SC-005**: Zero existing automated tests are left silently exercising
  the old 1v1-only contract after this feature ships — every test either
  passes against the new N-car shape or is deliberately and visibly
  updated/removed.

## Assumptions

- Real async multiplayer (recording and sharing actual other players'
  ghosts) is explicitly out of scope. Every non-player car in this feature
  is an authored NPC rival profile (`specs/skribidi-gap-decisions.md` §1).
- Live contact, collision, and wrecking between cars are explicitly out of
  scope for this feature, per the same recorded decision.
- The richer race presentation (procedural track, drift trails, sparks,
  commentary ticker, adjustable playback speed) is scoped to the separate
  `race-spectacle` feature (§2). This feature's own visualization only
  needs to extend the existing simple track presentation to show every car
  in the field.
- Track shape/selection and the "canonical shared results across every
  viewer" requirement (needed once real async multiplayer exists) are
  explicitly deferred to `race-spectacle`/its own architecture spec and
  are not solved here — this feature can proceed against the existing
  single fixed oval track unchanged.
- Tie-break ordering defaults to a stable rule based on each car's fixed
  identity (e.g. roster order) unless a clarification response says
  otherwise — chosen because it requires no new authored data and is
  trivially deterministic.
- Test Day / Practice mode (`011-build-test-day`) is unaffected by this
  feature and keeps racing against a single fixed-pace reference; only
  scored PvP contests move to the 8-car field (FR-011).
