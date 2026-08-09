# Feature Specification: Race Spectacle

**Feature Branch**: `013-race-spectacle`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Rebuild the watched race presentation: a real track shape instead of the bare oval, drift/motion visual cues and a live commentary ticker driven entirely by precomputed events (zero live randomness), a standings sidebar for the full field, and adjustable playback speed — all layered over the deterministic N-car result from 012-multi-ghost-contest. Decided direction recorded in specs/skribidi-gap-decisions.md §2 following the Skribidi Skids POC gap analysis. Flagged there as needing its own architecture pass: race results must be canonical across every viewer, which shapes how a track gets selected."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch a legible full-field race (Priority: P1)

A player who just resolved a scored PvP contest watches all 8 cars
(themselves plus 7 rivals) race on a real track shape with a live-updating
standings view, instead of two dots orbiting a bare oval — because a race
with a full field should look and feel like a real race, at a single,
well-paced watch duration that feels satisfying rather than rushed or
dragging (the owner's explicit reference point: how The Bazaar paces its
combat resolution).

**Why this priority**: This is the direct payoff of `012-multi-ghost-contest`
existing at all. An 8-car result nobody can actually watch has no more
spectator value than today's 1v1 oval. There is deliberately no playback
speed or skip control (resolved during `/speckit.clarify`) — the single
fixed-duration presentation has to be good enough on its own that a player
never wants one.

**Independent Test**: Resolve an 8-car contest and play its watched
presentation; confirm all 8 cars are visible and distinguishable throughout,
the track is not the current bare oval, a standings view shows every car's
live position as the race plays, and the single playback runs at one fixed,
tuned duration with no speed or skip control present.

**Acceptance Scenarios**:

1. **Given** a resolved 8-car contest result, **When** the player watches
   its presentation, **Then** all 8 cars are visible, individually
   distinguishable (name/color), and progress at a pace derived from their
   real computed lap times — not a synthetic constant-speed animation.
2. **Given** the watched presentation is playing, **When** the player looks
   at the standings view, **Then** it reflects each car's live position at
   that moment, updating as the race plays, not only a value shown at the
   end.
3. **Given** two different resolved contests, **When** their presentations
   are watched back to back, **Then** the track shown for each is
   selected deterministically from the same inputs that produced that
   contest's result — the same contest, replayed, always shows the same
   track.
4. **Given** the watched presentation, **When** the player looks for a
   speed or skip control, **Then** none exists — the single fixed watch
   duration is the only way to view a race, and its pacing is the feature's
   quality bar, not a control the player has to reach for.

---

### User Story 2 - Understand why a car is winning or losing while watching (Priority: P1)

While watching, a player wants to know *why* their own car is pulling ahead
or falling back, and wants a readable account of what the field around them
is doing — because a race that's watchable but unexplainable doesn't
satisfy this project's transparency bar any better than a results table
would.

**Why this priority**: Spectation without legibility is decoration, not the
"broadcast you can actually follow" this project is committed to
(Constitution Principle IV, building on what `006-race-visualizer` already
established for the 1v1 case).

**Independent Test**: Resolve a contest containing at least one direct item
firing and one buff firing on the player's own car; confirm a visible
board-flash cue and a matching commentary ticker line appear at the exact
moment each fires, confirm rival firings never produce a dedicated visual
cue of their own (only the player's board flashes), and confirm no cue or
ticker line ever appears for an event that isn't in the underlying
precomputed result.

**Acceptance Scenarios**:

1. **Given** the player's own item fires on a given lap (per its
   precomputed lap breakdown), **When** that lap plays, **Then** the
   existing board-flash cue appears on the player's own board at that exact
   moment, and a commentary ticker line names the event in the game's own
   voice (its item, its effect) — not Alex's POC copy, not a generic
   placeholder.
2. **Given** a rival's item fires, **When** that lap plays, **Then** no
   dedicated visual cue appears for it (the player's board-flash pattern is
   not extended to rivals); the event is narrated through the commentary
   ticker only, per the ticker's curation rule (FR-006).
3. **Given** the watched presentation is playing, **When** any visible cue
   or ticker line appears, **Then** it can be traced back to a fact already
   present in the precomputed contest result — nothing is invented at
   render time from randomness (Constitution Principle III).
4. **Given** a car with no discrete firing on a given lap (e.g. only a flat,
   always-on buff), **When** that lap plays, **Then** no false firing cue
   or ticker line is generated for it — matching the existing flat-buff
   no-flash rule from `006-race-visualizer`.

---

### Edge Cases

- What happens when two cars occupy visually adjacent positions on track at
  the same moment (no contact resolution exists — `012-multi-ghost-contest`
  FR-006)? They must render as visually distinct, non-overlapping cars, but
  their relative track position is presentation-only and never affects the
  already-computed outcome.
- What happens if the presentation is watched, then the same contest result
  is watched again (e.g. from a saved/shared result)? The track shown and
  every visual/ticker event must be identical both times, since both derive
  from the same result rather than fresh randomness.
- What happens to a rival whose entire race has no discrete firing events at
  all? It still renders and appears in the standings view; the ticker
  simply has nothing to say about it, not an error state.
- What happens when two or more cars fire an item on the exact same lap at
  the single fixed playback speed? Both are shown (at minimum, both remain
  individually inspectable afterward); neither is silently dropped,
  matching `006-race-visualizer`'s existing simultaneous-firing rule.
- What happens with a field where most cars finish close together versus
  one where the field is spread out? The single fixed watch duration must
  stay legible and well-paced in both cases — this is a tuning target for
  planning, not a per-race adjustable control.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render the watched presentation as a renderer
  over the already-computed `NCarContestResult`
  (`012-multi-ghost-contest`) — it MUST NOT compute or alter any outcome,
  position, or timing value; every visible fact must already exist in that
  result before playback begins (Constitution Principle I).
- **FR-002**: The system MUST show all cars in the result (player plus
  rivals) simultaneously, each individually distinguishable, progressing at
  a pace derived from their own real computed lap times.
- **FR-003**: The presentation MUST use a real track shape (not the current
  bare oval), deterministically selected from a pre-authored catalog of
  exactly 3 track shapes using inputs `012-multi-ghost-contest` already
  threads through contest resolution — the run seed and the current PvP
  stage ordinal — with no new identifier concept introduced. Track
  selection MUST be deterministic: the same contest, replayed, always shows
  the same track (Constitution Principle I/III).
- **FR-004**: The system MUST show a live standings view reflecting every
  car's position at the current moment of playback, updating continuously
  as the presentation plays — not only a value revealed at the end.
- **FR-005**: The system MUST show the existing per-lap board-flash cue only
  for the player's own item firings. This cue is NOT extended to rivals —
  rivals have no dedicated visual firing cue; their events are narrated
  through the commentary ticker only (FR-006).
- **FR-006**: The system MUST show a live commentary ticker narrating
  precomputed events in the game's own voice and mechanics — never copy
  ported from the Skribidi Skids POC, never inventing an event absent from
  the underlying result. The ticker MUST be curated, not exhaustive: the
  player's own events are always narrated; a rival's events are narrated
  only for notable moments (at minimum: taking the lead, and finishing) —
  not every rival firing.
- **FR-007**: The system MUST NOT introduce any live or non-deterministic
  randomness into the presentation. Every visible cue, ticker line, or
  motion effect MUST be derivable from the precomputed result and,
  where applicable, the deterministic track selection — never from an
  unseeded random draw at render time (Constitution Principle III).
- **FR-008**: A flat, always-on buff (one with no discrete per-lap firing)
  MUST NOT produce a per-lap firing cue or ticker line, matching the
  existing rule from `006-race-visualizer`.
- **FR-009**: The system MUST NOT include a playback-speed or skip-to-end
  control. There is exactly one fixed watch duration per presentation, and
  its pacing MUST be tuned to feel satisfying and readable to watch — not
  merely technically accurate — using the pacing quality of reference
  titles like The Bazaar's combat resolution as the bar, not a specific
  numeric target fixed by this spec. This explicitly supersedes the
  skip/fast-forward idea logged in `specs/DEFERRED.md` from
  `006-race-visualizer`'s own scoping: it was reconsidered when raised again
  via the Skribidi Skids gap analysis and rejected outright, not deferred
  again.
- **FR-010**: No car's contact/collision with another MUST be simulated or
  rendered as outcome-affecting — `012-multi-ghost-contest` FR-006
  explicitly excludes contact resolution, and this feature MUST NOT
  introduce it through the presentation layer either.
- **FR-011**: The presentation MUST remain watchable and legible at the
  existing 800x450 Phaser logical canvas size with no new minimum viewport
  requirement beyond what `010`/`011` already established.

### Key Entities

- **Track**: One pre-authored shape from a fixed catalog, deterministically
  selected per contest. Distinct from the current single fixed oval —
  carries enough shape information (at minimum, a closed path cars
  progress around) to look like a real circuit rather than a synthetic
  ellipse. Selection is presentation-only; it never affects lap times,
  standings, or any value already fixed by `012-multi-ghost-contest`'s
  result.
- **Playback Cue**: A visible, per-moment event derived from a precomputed
  lap breakdown. The player's own board-flash cue is the only dedicated
  Playback Cue in this feature; rivals have none — their events surface
  only as Ticker Lines. Never authored or randomized independently of the
  result it renders.
- **Ticker Line**: A single commentary entry, timestamped to a moment in
  the precomputed playback schedule, describing a firing, a finish, or a
  derived position change. Curated, not exhaustive: always present for the
  player's own events; present for a rival only at notable moments (taking
  the lead, finishing). Purely a text/voice layer over facts that
  already exist elsewhere in the result — carries no simulation authority
  of its own.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Watching the same resolved contest's presentation twice
  produces an identical track, identical cue timings, and identical ticker
  lines both times.
- **SC-002**: All 8 cars remain individually distinguishable and visible
  throughout every watched presentation, with zero cars silently missing
  or indistinguishable from another.
- **SC-003**: The live standings view's reported position for every car,
  sampled at any moment during playback, matches what a direct comparison
  of precomputed per-car progress at that same moment would show — zero
  discrepancies.
- **SC-004**: Every visible cue and ticker line traces back to a specific,
  precomputed fact in the contest result; zero cues or lines exist that
  cannot be attributed this way (spot-checked across a sample of resolved
  contests).
- **SC-005**: No playback-speed or skip control exists anywhere in the
  presentation — verified by inspection, not just absence of a bug report.
- **SC-006**: In playtesting, watchers report the single fixed-duration
  presentation's pacing feels satisfying and readable — comparable to
  reference titles like The Bazaar — rather than rushed or dragging,
  across both close-field and spread-out-field results. Validated
  qualitatively (player feedback), not by a hard technical timing
  assertion.

## Assumptions

- Depends on `012-multi-ghost-contest`'s `NCarContestResult`/`CarResult`
  shape (`specs/012-multi-ghost-contest/contracts/multi-ghost-contract.md`)
  as its sole simulation input. This feature adds no new simulation
  contract of its own beyond track selection.
- Contact/collision resolution between cars remains out of scope, per
  `012-multi-ghost-contest` FR-006. Nothing here reopens that decision.
- The existing fixed 20-second watch duration and proportional per-lap
  time-scaling pattern from `006-race-visualizer` is the starting point for
  extending to N cars; the exact duration and pacing curve for an 8-car
  field is a planning-level tuning question, not fixed here, guided by
  FR-009/SC-006's qualitative pacing bar rather than a specific number.
  There is no speed/skip control to fall back on if the tuning is off —
  getting this number right matters more here than it did for 006's 1v1
  case.
- Real async multiplayer (recording and sharing actual other players'
  ghosts) remains out of scope; this feature's "canonical across every
  viewer" requirement is about the presentation being reproducible from a
  shared result, not about live multiplayer infrastructure existing yet.
- The existing 800x450 Phaser canvas, `Phaser.Scale.FIT` scaling, and
  established accessibility floors (text size, non-color-only state,
  keyboard/touch parity per `010`/`011`) are inherited, not redesigned, by
  this feature.
