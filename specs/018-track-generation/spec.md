# Feature Specification: Track Generation

**Feature Branch**: `018-track-generation`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Give tracks real structure and depth, grounded in real motorsport concepts, so every PvP stage races on a track built from a deterministic sequence of corners (with turn angles) and straights (with lengths) instead of a hand-authored decorative polyline. Score each generated track along three axes drawn from how F1 teams and broadcasters actually classify circuits — corneringDemand, brakingDemand, and powerDemand — and wire those scores into real lap-time simulation, so a build's own power/chassis composition measurably performs differently from one track to the next. Tracks are procedurally generated from a seed (not hand-authored, not randomized live), replacing the fixed 3-track catalog from 013-race-spectacle. Split off from the original pre-race-setup gap-analysis item (`specs/skribidi-gap-decisions.md` §8): Rival Intel moves to its own future feature, and the item-driven configurable pre-race control mechanic is deferred until this track model exists to tune against."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every track has a real, scoreable shape (Priority: P1)

A track raced in any PvP stage is no longer a decorative hand-plotted
oval-ish shape — it's built from an ordered sequence of straights (each
with a length) and corners (each with a turn angle and direction),
generated deterministically from a numeric seed and the PvP stage's
ordinal. The same seed and ordinal always produce the exact same track,
so every viewer of the same contest sees an identical shape, and the
track is scored along three axes real racing teams already use to tell
circuits apart: how much it rewards nimble cornering
(`corneringDemand`), how demanding its braking zones are
(`brakingDemand`), and how much it rewards straight-line speed
(`powerDemand`).

**Why this priority**: This is the foundation everything else in this
feature depends on. Without a real, scoreable track structure, there is
nothing for a build's own composition to measurably interact with, and
nothing for the future `pre-race-setup` tuning screen to tune against.

**Independent Test**: Generate tracks for several different (seed,
pvpOrdinal) pairs; confirm each is a closed sequence of straight/corner
segments, confirm the same pair always regenerates an identical track,
confirm different pairs produce visibly different structures, and
confirm each track's three characteristic scores are derived from its
own structure (not authored or randomized independently of it).

**Acceptance Scenarios**:

1. **Given** a numeric seed and a PvP stage ordinal, **When** the track
   for that stage is generated, **Then** the result is an ordered,
   closed sequence of straight and corner segments that returns to its
   starting point and heading.
2. **Given** the same seed and ordinal generated twice, **When** both
   results are compared, **Then** they are deeply equal — same segment
   sequence, same characteristic scores.
3. **Given** two different (seed, ordinal) pairs, **When** their
   generated tracks are compared, **Then** their segment sequences (and
   in the overwhelming majority of cases their characteristic scores)
   differ.
4. **Given** a generated track, **When** its `corneringDemand`,
   `brakingDemand`, and `powerDemand` are computed, **Then** each is a
   bounded score (0-100) derived purely from that track's own segment
   sequence, and a track with more/tighter corners and less straight
   length scores measurably higher on `corneringDemand` than one with
   long straights and few, shallow corners (and the inverse for
   `powerDemand`).

---

### User Story 2 - A build's composition fits some tracks better than others (Priority: P1)

A build's mix of installed Power-category and Chassis-category items
(the existing `installationCategory` field every item already has —
no new authored field is introduced) now measurably affects its race
time differently depending on which track it races: a Power-heavy build
gains time on a `powerDemand`-heavy track and loses time on a
`corneringDemand`-heavy one, and the reverse for a Chassis-heavy build.
A perfectly balanced build (equal Power/Chassis, or an empty build) sees
no net effect either way.

**Why this priority**: This is the actual gameplay payoff the owner
asked for — the reason to generate real track structure at all, rather
than leaving it as inert flavor data. Without this story, User Story 1
produces numbers nobody's race outcome depends on.

**Independent Test**: Resolve the same build's contest on a
`powerDemand`-heavy generated track and on a `corneringDemand`-heavy
one; confirm its finishing time differs between the two in the
direction its Power/Chassis composition predicts, all else (items,
seed for rival builds, ghost/rival difficulty) held equal.

**Acceptance Scenarios**:

1. **Given** a build weighted toward Power-category items, **When** it
   races a `powerDemand`-heavy track versus a `corneringDemand`-heavy
   one (all else equal), **Then** its resulting lap times are faster on
   the power-heavy track.
2. **Given** a build weighted toward Chassis-category items, **When**
   it races the same two tracks, **Then** the effect is reversed.
3. **Given** a build with no installed items, or an exactly equal
   Power/Chassis split, **When** it races either track, **Then** its
   lap times match today's track-agnostic baseline (no bonus, no
   penalty).
4. **Given** any existing call to `simulatePlayerLaps`/`resolveContest`
   that does not pass a track, **When** it runs, **Then** its result is
   byte-for-byte identical to before this feature — track-fit is purely
   additive and opt-in per call site.

---

### User Story 3 - Every existing track consumer keeps working (Priority: P2)

`013-race-spectacle`'s race visualization, standings sidebar, and
commentary ticker all render a generated track exactly as they render
today's hand-authored ones — same closed-loop rendering path, same
per-progress position/heading lookup — with zero changes to that
feature's own presentation code.

**Why this priority**: Confirms this feature is additive to `013`, not
a breaking rework of it. Lower priority than US1/US2 because it's
verification of an existing contract, not new player-facing value.

**Independent Test**: Render a generated track through
`013-race-spectacle`'s existing rendering path; confirm cars trace a
closed loop with no visual discontinuity, and every existing
`013`/`012` test that depends on `Track`'s shape continues to pass
unchanged.

**Acceptance Scenarios**:

1. **Given** a generated track, **When** `pointAtProgress` is called
   across a full lap (progress 0 to 1), **Then** it returns a
   continuous, closed path with no gaps or jumps, exactly as it does
   for today's hand-authored tracks.
2. **Given** the existing fixed 3-track catalog is replaced by
   generation, **When** every existing `013-race-spectacle` and
   `012-multi-ghost-contest` test runs, **Then** none reference the
   removed catalog by name/id, and all pass unchanged against generated
   tracks.

---

### Edge Cases

- What happens when a generated segment sequence would produce a
  self-intersecting or degenerate (near-zero-length) shape? The
  generator's own constraints (minimum segment length, minimum segment
  count, bounded turn angles) must make this structurally
  unreachable — not caught after the fact.
- What happens for a build with items but zero of either Power or
  Chassis category installed (an all-Flex-slot, all-neutral build)?
  Same as an empty build — no net track-fit effect (Acceptance Scenario
  US2.3), independent of each item's own installation state
  (Fitted/Improvised), which already governs a different effect
  entirely.
- What happens if a future call site requests a track for a
  (seed, ordinal) pair outside the four PvP ordinals `017` schedules
  (e.g. ordinal 5)? Generation is a pure function of any integer
  ordinal — it must not special-case or fail for values beyond 4,
  matching `017-season-structure-grow`'s own "unbounded scan, no
  hardcoded terminal assumption" convention.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent a track as an ordered, closed
  sequence of typed segments: a straight segment (with a length) and a
  corner segment (with a turn angle and a left/right direction) — not a
  hand-plotted list of coordinate points.
- **FR-002**: The system MUST generate a track deterministically from a
  plain numeric seed and a PvP stage ordinal: identical (seed, ordinal)
  always produces a deeply equal segment sequence and characteristic
  scores. No live/unseeded randomness may be used (Constitution
  Principle I). Generation MUST accept only this bare `(seed, ordinal)`
  pair — never a `Run` or player-identity object — so a future shared
  race (e.g. an async-multiplayer lobby of 8 real players, per
  Constitution Principle VI) can supply one seed shared by the whole
  lobby instead of any single participant's own run seed, with zero
  change to generation itself. Today's caller happens to pass a
  player's own run seed; that is a caller-side choice this feature
  MUST NOT bake in as an assumption.
- **FR-003**: A generated segment sequence MUST form a closed loop —
  it returns to its starting position and original heading — and MUST
  satisfy minimum segment-count and minimum segment-length constraints
  so no degenerate (self-intersecting or near-zero-length) shape is
  reachable.
- **FR-004**: The system MUST score every generated track along exactly
  three bounded (0-100) characteristics derived purely from its own
  segment sequence: `corneringDemand`, `brakingDemand`, and
  `powerDemand`. No characteristic may be authored or randomized
  independently of the segment sequence that produced it.
- **FR-005**: `corneringDemand` MUST increase with the total magnitude
  and tightness of a track's corners relative to its length;
  `powerDemand` MUST increase with the proportion of the track spent on
  straights; `brakingDemand` MUST increase with the number and severity
  of sharp-angle corners (the zones demanding the heaviest
  deceleration) — mirroring the real-motorsport classification this
  feature is grounded in (high-downforce/cornering vs. power circuits;
  braking-zone severity as an independent axis).
- **FR-006**: The system MUST derive a build's track-fit profile from
  its already-installed items' existing `installationCategory` field
  (`"power"` vs `"chassis"`) — no new authored field is introduced on
  `ItemDefinition` for this purpose.
- **FR-007**: `simulatePlayerLaps` MUST accept an optional track
  parameter. When omitted, its result MUST be identical to today's
  track-agnostic behavior — this feature is strictly additive and never
  changes any existing call site that doesn't opt in.
- **FR-008**: When a track is supplied, the system MUST fold a
  deterministic, bounded per-lap timing effect into simulation based on
  the interaction between the build's track-fit profile (FR-006) and
  the track's three characteristics (FR-004): a Power-leaning build
  MUST perform measurably better on a `powerDemand`-heavy track and
  measurably worse on a `corneringDemand`-heavy one, and the reverse for
  a Chassis-leaning build; a neutral or empty build MUST see no net
  effect.
- **FR-009**: `resolveContest`'s existing N-car path MUST generate one
  track per contest (from its existing `seed`/`level` parameters,
  reusing `017-season-structure-grow`'s pvpOrdinal) and apply it
  identically to the player's build and every rival build in that
  contest — no car is exempt from track-fit.
- **FR-010**: The system MUST replace `013-race-spectacle`'s fixed
  3-track hand-authored catalog and `selectTrack` with generation —
  every PvP stage races a freshly generated track for its own (seed,
  ordinal) pair, not a pick from a fixed set.
- **FR-011**: The system MUST derive a renderable closed point path
  from a track's segment sequence, so `013-race-spectacle`'s existing
  `pointAtProgress`-based rendering, standings, and commentary continue
  to consume `Track` exactly as they do today, with no change to how
  that code *consumes* `Track` — the sole exception is the mechanical
  `selectTrack`→`generateTrack` rename at that code's one call site
  (`ContestScene.ts`), required because `selectTrack` itself is removed
  (FR-010).
- **FR-012**: Every value this feature introduces or changes (segment
  sequence, characteristic scores, track-fit timing effect) MUST be
  inspectable after a race resolves, the same way installation,
  synergy, and tier contributions already are (Constitution Principle
  III) — a per-lap timing effect from track-fit is attributed, not
  folded invisibly into an unexplained total.

### Key Entities

- **TrackSegment**: A single piece of a track's closed loop — either a
  straight (with a length) or a corner (with a turn angle and
  direction). A track is an ordered array of these.
- **Track**: Extended from `013-race-spectacle`'s existing entity — now
  authoritatively a segment sequence, with its rendering `points` and
  its three `TrackCharacteristics` both derived from that sequence, not
  independently authored.
- **TrackCharacteristics**: The three bounded (0-100) scores
  (`corneringDemand`, `brakingDemand`, `powerDemand`) computed from a
  track's segment sequence.
- **Build Track Fit**: A derived value — not stored, always recomputed
  — expressing a build's Power-vs-Chassis lean from its installed
  items' existing `installationCategory`, consumed only when a track is
  supplied to simulation (FR-007/FR-008).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every generated track, across a wide sample of (seed,
  ordinal) pairs, forms a valid closed loop with no degenerate segment,
  100% of the time.
- **SC-002**: Regenerating the same (seed, ordinal) pair at any later
  point produces a byte-for-byte identical track and characteristic
  scores, 100% of the time.
- **SC-003**: Across a wide sample of generated tracks, `corneringDemand`
  and `powerDemand` are observably (not just theoretically) inversely
  correlated, matching the real high-downforce-vs-power classification
  this feature is grounded in.
- **SC-004**: A Power-leaning build's measured finishing time on a
  strongly `powerDemand`-heavy generated track is faster than its own
  finishing time on a strongly `corneringDemand`-heavy one, all else
  equal, in every sampled comparison — and the reverse holds for a
  Chassis-leaning build.
- **SC-005**: Every pre-existing automated test in this codebase that
  does not itself change continues to pass unchanged after this
  feature lands — zero regression in `012`/`013`/`014`/`015`/`016`/`017`
  behavior.

## Assumptions

- **Track generation is scoped to one race, not one player's run**
  (owner's explicit concern, 2026-08-11): today's only caller happens
  to pass a player's own `Run.seed`, because today's contests are
  solo-vs-7-authored-ghosts (Constitution Principle I). But
  `generateTrack`/`resolveContest` themselves take a bare numeric
  `seed` — never a `Run` object — specifically so that when
  async-multiplayer lobbies land (a fixed, already-anticipated later
  feature per `specs/HANDOFF.md` and Constitution Principle VI: "no
  hard dependency on live matchmaking"), a lobby of 8 real players can
  share one server-issued or agreed-upon seed for their shared race,
  and every participant's client generates the identical track from
  it — without any change to this feature's generation, scoring, or
  simulation code. This feature does not build any lobby/matchmaking
  concept itself; it only guarantees it won't have to be reworked when
  one exists (FR-002).
- **Scope boundary confirmed with the owner**: Rival Intel (from the
  original `specs/skribidi-gap-decisions.md` §8 scope) is out of scope
  here and moves to its own future feature. The item-driven
  configurable pre-race control mechanic (a brake-bias-style slider) is
  also out of scope here — this feature exists specifically to give
  that future feature real track data to tune against, but does not
  build the control/screen itself.
- **Tyre degradation and elevation change** are real, well-documented
  motorsport classification axes this feature's research also
  surfaced, but are deliberately left out of `TrackCharacteristics` for
  now (owner's choice, 2026-08-11) — they can be added later without a
  redesign, since characteristics are an open set, not a fixed tuple.
- **Exact generation algorithm and scoring formulas** (segment-count
  bounds, per-segment length/angle ranges, the precise
  weighting/normalization behind each characteristic score, and the
  exact per-lap timing-effect magnitude from track-fit) are a
  planning-phase engineering decision, not fixed by this specification
  — FR-002 through FR-005 and FR-008 constrain their *behavior and
  invariants*, not their exact numbers. Recorded in `research.md`
  during `/speckit.plan`.
- **Braking-demand build fit**: this feature's build-side track-fit
  model (FR-006) is a single Power-vs-Chassis axis, reusing the
  existing two-category item system as-is. Braking performance is
  treated as part of the Chassis side of that axis (braking is a
  handling/chassis system in real motorsport, not a powertrain one) —
  no third, independent build-side "braking fit" axis is introduced.
  This is a deliberate simplification; revisit only if playtesting
  shows it reads as wrong.
- **The existing hand-authored `TRACKS` catalog and `selectTrack`**
  (`013-race-spectacle`) are removed/replaced by this feature, not kept
  alongside generation as a curated subset — no request was made to
  preserve them, and keeping both would mean maintaining two divergent
  track systems.
- **Practice/Test Day mode**: reuses whatever this feature's public
  `generateTrack`/track-fit functions expose, the same way `009`'s
  Test Day already reuses scored-mode simulation primitives — no
  separate practice-only track logic is introduced.
