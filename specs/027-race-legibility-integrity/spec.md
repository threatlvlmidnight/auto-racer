# Feature Specification: Race Legibility and Playback Integrity

**Feature Branch**: `027-race-legibility-integrity`

**Created**: 2026-08-13

**Status**: Implementation complete

**Input**: User description: "Make the time-attack ghost race easier to read,
update projected position once per lap instead of constantly reshuffling, verify
that rendered cars and standings agree, and explain track composition in the
post-race result."

## Background

Scored contests are time attacks against several recorded ghosts presented
together on one track. The current race sidebar continuously ranks all cars by
interpolated cumulative time. Small gap changes can reorder eight entries many
times per second, making the information effectively unreadable. Cars also wrap
around the rendered circuit independently, so their physical left-to-right or
along-track appearance can seem inconsistent with a time-based ranking when
they occupy different laps.

Results currently show final times and gaps but only name the generated track.
They do not expose the track composition that determined the value of
Acceleration, Top Speed, Braking Power, and Cornering Speed. A player therefore
cannot readily connect a build's profile to its outcome.

This feature establishes an explicit time-attack presentation model. It first
verifies the integrity of playback progress, marker placement, checkpoint
ranking, finish handling, and final standings. It then replaces the continuously
reshuffling leaderboard with a stable player-centered projection updated once
per completed player lap, and adds authoritative track composition and
build-versus-track explanation to Results.

Feature 025 owns aggregate vehicle-stat panels. Feature 027 consumes those
values where useful but owns projected position, ghost-relative gaps, track
composition, and race/result explanation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a stable projected position (Priority: P1)

During race playback, the player sees a projected finishing position that
changes only when the player completes a lap. Between those checkpoints, the
display remains stable enough to read while the cars continue moving.

**Why this priority**: The existing continuously reordered eight-car list
creates noise rather than useful race information.

**Independent Test**: Watch a ten-lap, eight-car contest containing frequent
interpolated lead changes. Confirm the projected position and comparison rows
change only at the start and completed player-lap checkpoints, while the final
result remains identical.

**Acceptance Scenarios**:

1. **Given** a race has started before the player completes lap one, **When**
   playback advances, **Then** the display uses a clearly labeled starting
   projection or awaiting-first-split state and does not reshuffle per frame.
2. **Given** the player completes lap N, **When** the lap checkpoint is recorded,
   **Then** every car is compared by its authoritative cumulative simulated time
   through lap N and one projected rank is published.
3. **Given** cars exchange interpolated order between player lap checkpoints,
   **When** the race view updates, **Then** the published projected rank and
   comparison rows remain unchanged.
4. **Given** the projection changes at a checkpoint, **When** it is displayed,
   **Then** wording identifies it as projected rather than final and communicates
   the prior-to-current change without depending on animation or color.
5. **Given** the final lap completes, **When** playback transitions to Results,
   **Then** the authoritative final position replaces the projection and matches
   the immutable contest result.

---

### User Story 2 - Understand the relevant ghost comparison (Priority: P1)

Instead of tracking a full continuously moving field table, the player sees a
compact, player-centered comparison: current projected place, the nearest ghost
ahead, the nearest ghost behind where one exists, and signed checkpoint gaps.

**Why this priority**: Time-attack drama comes from whether the player's pace is
gaining or losing against a meaningful benchmark, not from reading eight rows
that reorder too quickly.

**Independent Test**: Place the player first, last, and in the middle at
successive lap checkpoints. Confirm the comparison selects the adjacent
projected competitors, labels all gaps correctly, and handles missing ahead or
behind rows without stale data.

**Acceptance Scenarios**:

1. **Given** the player projects into a middle position, **When** a checkpoint
   publishes, **Then** the view identifies the closest ranked ghost immediately
   ahead and immediately behind plus each cumulative-time gap at the same lap.
2. **Given** the player projects first, **When** the view updates, **Then** it
   communicates the lead and nearest trailing ghost without inventing an ahead
   comparison.
3. **Given** the player projects last, **When** the view updates, **Then** it
   communicates the gap to the nearest ghost ahead without showing a stale
   behind comparison.
4. **Given** two cars have equal cumulative checkpoint times, **When** ranked,
   **Then** the deterministic contest tie policy is used and explained
   consistently with final standings.
5. **Given** the race is viewed without color or motion, **When** the projection
   changes, **Then** labels, signs, arrows, or structure preserve the meaning.

---

### User Story 3 - Trust what the watched cars represent (Priority: P1)

The rendered markers, lap labels, checkpoint projection, finish events, and
final standings all derive from consistent immutable contest evidence. The
presentation makes clear that a marker's location on a looping circuit is not a
literal road-position ranking across different laps.

**Why this priority**: A clearer interface cannot compensate for contradictory
playback. Integrity must be proven before presentation is changed.

**Independent Test**: Exercise varied lap times, overtakes, lap wrapping, ties,
early finishers, and the final transition. At sampled frames and every
checkpoint, independently calculate progress/rank from the recorded schedules
and confirm marker progress, labels, projection, and final order agree.

**Acceptance Scenarios**:

1. **Given** a recorded lap schedule, **When** playback is sampled at a visual
   time, **Then** each marker's lap index, fractional lap progress, and finished
   state match the shared playback authority.
2. **Given** two markers occupy visually ambiguous points on the closed circuit,
   **When** their lap counts differ, **Then** the presentation does not imply
   that along-track screen order is their time-attack rank.
3. **Given** a car crosses a visual lap or finish boundary, **When** progress is
   rendered, **Then** it neither jumps backward incorrectly nor emits duplicate
   checkpoint/finish events.
4. **Given** all cars finish, **When** Results opens, **Then** final ranking,
   times, and gaps equal the precomputed contest result and are not derived from
   the last rendered frame.
5. **Given** an integrity test reveals a mismatch, **When** it is corrected,
   **Then** the fix changes playback/presentation only unless separate evidence
   proves the authoritative contest result itself is wrong.

---

### User Story 4 - Understand the track after the race (Priority: P1)

On Results, the player sees the generated track's authoritative composition and
a concise explanation of which vehicle capabilities its segments emphasized.
This gives the outcome mechanical context beyond the track name.

**Why this priority**: Players need to understand why one build profile
performed better than another to make the next preparation decision.

**Independent Test**: Complete races on tracks with materially different
straight and corner composition. Confirm Results displays exact authored counts
and stable derived summaries from the same immutable track used by simulation.

**Acceptance Scenarios**:

1. **Given** a completed contest, **When** Results opens, **Then** it shows the
   track name, lap count, straight count, corner count, and total track distance
   from immutable contest/playback evidence.
2. **Given** corners carry authored angles or severity, **When** summarized,
   **Then** useful corner breakdowns are derived by a shared documented rule and
   reconcile to the displayed total corner count.
3. **Given** a track contains long straights, heavy braking zones, or many tight
   corners, **When** Results explains its character, **Then** the explanation
   maps those facts to the four established vehicle capabilities without
   claiming a capability caused an exact time delta that was not recorded.
4. **Given** the player inspects aggregate vehicle stats from feature 025, **When**
   track context is shown alongside them, **Then** both surfaces use identical
   stat names and the same completed contest context.
5. **Given** track evidence is unavailable in a legacy result, **When** Results
   renders, **Then** it labels the summary unavailable instead of regenerating a
   track or inferring composition from its name.

---

### User Story 5 - Preserve spectation and accessibility (Priority: P2)

The revised race view remains understandable to a third-party viewer and across
mouse, touch, keyboard, narrow layouts, reduced motion, and monochrome use.

**Independent Test**: Watch without interacting at every supported viewport and
confirm a viewer can identify the player, lap, projected position, relevant
comparison, recent checkpoint change, and final outcome.

**Acceptance Scenarios**:

1. **Given** no user interaction, **When** the race plays, **Then** all essential
   projection and comparison information remains visible without hover.
2. **Given** a narrow viewport, **When** the race view reflows, **Then** the
   player marker, lap, projected rank, and primary gap remain readable.
3. **Given** reduced motion, **When** a checkpoint changes the projection,
   **Then** the new state appears without required animated movement.
4. **Given** the player marker overlaps rivals, **When** rendered, **Then**
   identity remains distinguishable without relying on color alone.

## Edge Cases

- Several cars tie at a checkpoint, including ties involving the player.
- The player has not completed the first lap.
- The player finishes while one or more ghosts are still visually running.
- A ghost finishes before the player; its checkpoint comparison remains fixed
  to equal-lap evidence and its finish is not mistaken for the player's rank.
- A car crosses more than one boundary between low-frame-rate updates; each
  relevant checkpoint/event is emitted at most once and the latest projection
  is correct.
- Minimum visual lap duration causes interpolation to differ from raw wall-clock
  scale; projected rank still uses simulated lap times, not rendered distance.
- A closed track makes a later-lap car appear spatially behind an earlier-lap
  car after wrapping; labels prevent screen position from claiming rank.
- Track segments are malformed, empty, or use an unknown future segment kind;
  validation or an unavailable summary prevents misleading counts.
- Result data originates from an older snapshot without retained track evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Playback progress, marker placement, lap labels, checkpoint
  projection, finish events, and final transition MUST be covered by integrity
  tests against the same immutable contest and schedule evidence.
- **FR-002**: The system MUST distinguish fractional position on the closed
  track from time-attack rank across completed and partial laps.
- **FR-003**: The race view MUST NOT present a full leaderboard that continuously
  reorders every animation frame.
- **FR-004**: Projected player position MUST update no more than once per
  completed player lap and remain stable between player lap checkpoints.
- **FR-005**: At player lap N, projected position MUST compare every car's
  cumulative simulated time through exactly lap N.
- **FR-006**: The initial pre-lap-one state MUST be explicitly labeled and MUST
  NOT imply a measured checkpoint rank exists.
- **FR-007**: Every nonfinal rank MUST be labeled `Projected` or equivalent.
- **FR-008**: The live comparison MUST prioritize the player and include the
  adjacent projected ghost ahead and behind when each exists.
- **FR-009**: Ghost comparison gaps MUST be signed cumulative-time differences
  through the same completed lap used for projection.
- **FR-010**: Checkpoint ties MUST use the same deterministic tie policy as the
  authoritative contest result.
- **FR-011**: Projection changes MUST remain understandable without color or
  animation and MUST NOT fire continuously between checkpoints.
- **FR-012**: Final position, time, and gaps MUST come directly from the
  precomputed contest result, never from visual marker order or the last frame.
- **FR-013**: The player marker, lap state, and relevant comparison identity MUST
  remain distinguishable when markers overlap and without color alone.
- **FR-014**: Result evidence MUST retain or receive the exact generated track
  used to resolve the contest; Results MUST NOT regenerate it independently.
- **FR-015**: Results MUST show track name, contest lap count, straight count,
  corner count, and total distance from authoritative track evidence.
- **FR-016**: Any corner-severity or straight-length breakdown MUST use one
  documented pure classification rule and reconcile to the aggregate counts.
- **FR-017**: Track-character explanation MUST use the established Acceleration,
  Top Speed, Braking Power, and Cornering Speed vocabulary.
- **FR-018**: Track explanation MUST distinguish descriptive suitability from
  exact causal time attribution and MUST NOT invent unrecorded time savings.
- **FR-019**: Missing or invalid legacy track evidence MUST produce a labeled
  unavailable state, not inferred or regenerated values.
- **FR-020**: Feature 025 aggregate vehicle stats and feature 027 track context
  shown together MUST refer to the same player, build, track, and lap/result.
- **FR-021**: The race view and Results MUST preserve required information at
  all supported viewports without hover and with reduced motion.
- **FR-022**: This feature MUST NOT alter authored car performance, item effects,
  physics formulas, recorded ghost laps, contest timing, or final outcomes
  unless an integrity diagnosis separately proves an authoritative defect.

### Key Entities

- **Player Lap Checkpoint**: A completed player lap number N and the immutable
  cumulative player time through that lap.
- **Checkpoint Projection**: A ranked comparison of every car's cumulative
  simulated time through the same lap number N, held stable until the next
  player checkpoint.
- **Adjacent Ghost Comparison**: The projected competitor immediately ahead of
  and behind the player, with same-checkpoint signed gaps.
- **Playback Progress**: A car's lap index, fractional lap progress, and finished
  state at one presentation time. It controls marker placement but is not the
  checkpoint ranking source.
- **Track Composition Evidence**: The immutable track identity, segments,
  distance, and derived counts/classifications used to explain a completed race.

## Success Criteria *(mandatory)*

- **SC-001**: In a race designed to cause frequent frame-level order changes,
  the published projected rank changes at most once per completed player lap.
- **SC-002**: At every checkpoint across deterministic test fixtures, 100% of
  projected positions and adjacent gaps match independent cumulative-time-
  through-lap calculations.
- **SC-003**: At sampled playback frames and all lap/finish boundaries, 100% of
  marker progress states match the shared schedule authority.
- **SC-004**: Across all tested contests, final Results position, time, and gaps
  remain byte-identical to the pre-feature contest result.
- **SC-005**: At least 90% of observed players can identify their projected
  place and whether they trail or lead the relevant adjacent ghost within five
  seconds of viewing the race.
- **SC-006**: For every generated-track fixture, displayed segment counts and
  total distance reconcile exactly with the authoritative track.
- **SC-007**: At least 90% of observed players can identify whether the completed
  track principally rewarded straights, acceleration/braking transitions, or
  cornering within ten seconds of viewing Results.
- **SC-008**: All essential race and track-summary information remains readable
  at supported viewports, without color, without motion, and without hover.

## Assumptions

- All scored cars have the same lap count and retain a per-lap time list.
- A checkpoint projection is an estimate of final placement, not a claim about
  physical wheel-to-wheel road order.
- Projection is triggered by completed player laps, including processing missed
  boundaries after a low-frame-rate update.
- Existing generated `Track` segments are the authoritative source for
  composition; the implementation plan will determine the minimal immutable
  evidence carried into Results.
- Track detail reuses exact angles, physical distances, and the existing demand
  scores; this feature introduces no new severity or length thresholds.
- Feature 025 may be implemented before or alongside Feature 027. Feature 027
  must not duplicate its aggregate vehicle panel.

## Out of Scope

- Live synchronous opponents, contact, collision, blocking, or overtaking rules.
- Changing final standings to reward visual road position.
- Exact numerical attribution of final time to each stat or item beyond evidence
  already recorded by the simulation.
- Race skip, fast-forward, rewind, or free scrub controls.
- Changing generated-track algorithms or track balance.
- Rival build/stat disclosure beyond information already authorized by the run.
