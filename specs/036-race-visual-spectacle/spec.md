# Feature Specification: Race Visual Spectacle

**Feature Branch**: [036-race-visual-spectacle]

**Created**: 2026-08-15

**Status**: Owner acceptance failed (2026-08-17); implementation remediation
reopened. T044 and T058–T062 remain. See
`owner-qa-findings-2026-08-17.md` and the manual matrix in `quickstart.md`.

**Input**: Enhance the watched race with credible circuit presentation, improved
vehicle models, picture-in-picture signature moments, and richer visual drama
while preserving the retained deterministic race result.

## Clarifications

### Session 2026-08-15

- Q: Which race events may receive dramatic picture-in-picture? → A: Only
  player-involved interactions—overtaking another car, being overtaken, a player
  signature, player defense, or a player incident—are eligible. Rival-only
  interactions remain in the normal broadcast layer.
- Q: What vehicle asset scope ships first? → A: Four bespoke player-vehicle
  models ship with reusable rival silhouette classes that remain individually
  identifiable through stable number, pattern, and label in addition to color.
- Q: What is the main-camera direction? → A: Keep a stable broadcast-wide
  circuit view with local emphasis rather than full event-driven camera cuts.
- Q: How does the picture-in-picture budget scale? → A: Allow two eligible
  player-involved moments at 8–10 laps, three at 12 laps, and four at 14–16
  laps; unused slots remain empty and never fabricate an event.
- Q: What main-track perspective ships first? → A: Use an enhanced top-down
  main view with illustrated depth, shadows, banking/landmark cues, and richer
  track materials; reserve three-quarter/isometric artwork for cut-ins.
- Q: How does a continuous focus view coexist with event cut-ins? → A: One
  persistent focus window defaults to the player and may select any named car
  as a presentation-only control. A selected event temporarily replaces that
  window, then it returns to the selected car; the main view remains the full
  circuit.


## User Scenarios & Testing

### User Story 1 — Watch a credible, readable race (Priority: P1)

As a player, I watch a race on a visually believable circuit and can follow the
player's vehicle, rivals, position changes, and finish without confusing
presentation for game authority.

**Why this priority**: The watched race is the game's core spectacle. Better
visuals matter only if they improve the feeling and legibility of the existing
precomputed contest.

**Independent Test**: Replay identical retained multi-car race results at both
supported playback speeds and confirm the circuit, vehicle positions, passes,
finish order, and results remain equal while the presentation is more readable
and dramatic.

**Acceptance Scenarios**:

1. **Given** a retained scored-race track and result, **When** playback begins,
   **Then** the circuit visibly communicates its geometry and driving character
   without regenerating or changing the track.
2. **Given** all cars are in playback, **When** a player watches at either
   supported speed, **Then** player and rivals remain visually distinct and their
   retained positions, passes, and finish order remain legible.
3. **Given** a player replays the same retained result, **When** it renders
   again, **Then** the same event sequence and final order are presented with no
   live randomness or physics change.

---

### User Story 2 — Feel consequential signature and pass moments (Priority: P1)

As a player, I see a brief, understandable visual payoff when a retained
signature activation or decisive player-involved pass occurs, without losing the
race state or control of playback.

**Why this priority**: Feature 033 gives important events authoritative meaning;
this feature should make those moments memorable to watch.

**Independent Test**: Use retained fixtures containing no event, a signature,
a player attack/defense/pass, and an incident; confirm every cut-in is selected
from immutable evidence, is bounded, and leaves race timing and controls intact.

**Acceptance Scenarios**:

1. **Given** a retained eligible signature activation, **When** its playback
   boundary occurs, **Then** a picture-in-picture treatment identifies the
   driver, signature, and consequence from retained evidence.
2. **Given** a decisive player-involved pass or defense, **When** its boundary
   occurs, **Then** the presentation emphasizes the position exchange without
   inventing an event or masking the current race state.
3. **Given** no selected consequential event occurs, **When** a race plays,
   **Then** no empty or fabricated cut-in is shown.
4. **Given** reduced motion is enabled or a player changes playback speed,
   **When** a selected moment occurs, **Then** its meaning remains available in
   text/non-motion form and normal playback controls remain usable.

---

### User Story 3 — Recognize machines and race context (Priority: P2)

As a player, I can distinguish the player's chosen vehicle and the competing
machines through readable visual models that fit the alternate Motor Age rather
than anonymous markers.

**Why this priority**: Differentiated machines make the race more engaging and
support following a multi-car field.

**Independent Test**: Watch fixtures using every player entrant and generated
rival identity; identify the player's machine and every rival's stable
race-marker identity at a glance, including non-color accessibility labels.

**Acceptance Scenarios**:

1. **Given** each player entrant, **When** their race begins, **Then** the
   selected vehicle model is recognizable and matches its established garage
   identity without implying unequal baseline performance.
2. **Given** generated rivals, **When** they race together, **Then** their
   models are distinguishable through stable silhouette, number, label, or
   pattern in addition to color.
3. **Given** a vehicle model cannot load, **When** playback begins, **Then** a
   labeled fallback marker preserves race identity and legibility.

### Edge Cases

- A retained event may be simultaneous with another event, a lap boundary, or
  finish boundary; the presentation must use deterministic priority and cannot
  delay/duplicate event consumption.
- A cut-in may be requested while another is visible; the policy must be
  deterministic and preserve the more consequential retained event; the
  persistent focus view returns to its previously selected car afterward.
- A race may contain no player signature or decisive pass; playback remains
  complete and visually coherent.
- The circuit may have hairpins, switchbacks, or an unusually compact geometry;
  camera/track presentation must preserve all retained marker paths.
- Asset loading failure, reduced motion, and narrow layout must retain current
  race facts and playback controls.

## Requirements

### Functional Requirements

- **FR-001**: The feature MUST render circuits only from retained resolved-track
  geometry and characteristics; it MUST NOT regenerate a track or alter race
  inputs, timing, positions, ranking, or settlement.
- **FR-002**: The feature MUST provide a visually readable road/circuit
  presentation for every supported retained track shape, including hairpins and
  switchbacks.
- **FR-003**: Every playback vehicle MUST have a stable visual identity with
  non-color distinguishing information and a labeled fallback.
- **FR-004**: The selected player vehicle MUST preserve the established entrant
  and garage identity while remaining mechanically neutral in presentation.
- **FR-005**: Picture-in-picture moments MUST be selected solely from retained
  Feature 033 event evidence and include driver, event/signature name, and
  consequence.
- **FR-006**: Only player-involved signatures, overtakes, defenses, and
  incidents may receive picture-in-picture; rival-only interactions remain in
  the normal broadcast layer. The maximum eligible-moment budget is two at
  8–10 laps, three at 12 laps, and four at 14–16 laps; unused budget never
  fabricates an event.
- **FR-007**: Picture-in-picture, camera, and motion treatments MUST preserve
  playback speed controls, pause/skip behavior, race-state visibility, and a
  reduced-motion text/non-motion equivalent.
- **FR-008**: The first release MUST provide four bespoke player-vehicle models
  plus reusable rival silhouette classes with stable number, pattern, and label
  identity in addition to color.
- **FR-009**: The feature MUST use deterministic event ordering and exact-once
  playback consumption for simultaneous/late-frame boundaries.
- **FR-010**: The feature MUST degrade to existing legible playback when an
  optional visual/cut-in asset is unavailable.
- **FR-011**: The main circuit view MUST remain a stable broadcast-wide camera
  with local emphasis and enhanced top-down illustrated depth; it MUST NOT use
  full event-driven circuit reframing. Three-quarter/isometric art is reserved
  for picture-in-picture cut-ins.
- **FR-012**: The feature MUST not add player steering, live opponent
  interaction, unseeded playback randomness, or a second contest resolver.
- **FR-013**: The feature MUST provide one persistent focus window that defaults
  to the player and may select any named car as a presentation-only control. A
  selected event may temporarily replace the focus window, after which it MUST
  return to the selected car without changing playback state.

### Key Entities

- **Race visual profile**: display-only vehicle model, marker identity, fallback
  label, and theme associated with a player entrant or rival identity.
- **Circuit visual model**: display-only projection of the already-resolved
  track geometry, road, landmarks, framing, and safe marker path.
- **Spectacle moment**: a retained event selected for a bounded cut-in with
  stable event ID, priority, timing, driver(s), consequence, and presentation
  status.
- **Cut-in policy**: display-only deterministic rules that choose, queue,
  suppress, or replace simultaneous spectacle moments.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In retained fixtures covering every supported track grammar,
  100% of rendered marker paths agree with the resolved track and complete
  playback in the recorded final order.
- **SC-002**: In event fixtures, 100% of rendered cut-ins correspond to one
  retained selected event and no retained event is displayed more than once.
- **SC-003**: In an owner-reviewed race matrix covering all player entrants and
  a full rival field, the player and every rival can be identified without color
  alone throughout playback.
- **SC-004**: At both supported playback speeds and with reduced motion enabled,
  pause, skip, results transition, and final race state remain reachable and
  equivalent to the same retained result without spectacle treatments.
- **SC-005**: In fixtures for 8, 10, 12, 14, and 16 laps, selected
  player-involved moments never exceed the 2/2/3/4/4 budget, and the focus
  window returns to its selected car after every event treatment.
- **SC-006**: Full automated tests, lint, type-check, and production build pass
  with no weakened retained-result or playback-boundary assertions.

## Assumptions

- Feature 033 supplies stable retained signatures, passes, defenses, incidents,
  and ordering/timing evidence before implementation begins.
- Feature 030 remains the authority for playback speeds and controls.
- Feature 037 may later replace temporary vehicle/cut-in artwork, but Feature
  036 must use a documented fallback visual set and cannot wait for final item
  art.
- Feature 026 owns broad responsive-host reflow; this feature preserves current
  safe fallbacks rather than redesigning the host.
