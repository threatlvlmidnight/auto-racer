# Feature Specification: Race Playback Controls

**Feature Branch**: `[030-race-playback-controls]`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Slow watched races by 50% so the action is readable, and add 1× and 2× controls so the player can speed playback up. Playback controls must never change race outcomes."

## Clarifications

### Session 2026-08-14

- Q: At 2×, should informational callouts and ticker messages disappear twice as quickly? → A: No. Race motion and event timing scale, but message replacement is event-driven rather than timed by playback speed.
- Q: How long should each informational callout or ticker message remain visible, even during 2× playback? → A: Keep it visible until the next message replaces it, with no guaranteed minimum duration and no message queue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow the race at a readable pace (Priority: P1)

As a player watching a race, I see it begin at a deliberately slower pace so I can follow lap progress, item activations, projections, and changes in the field without needing to react immediately.

**Why this priority**: The current race visualization finishes too quickly to communicate why the result happened, undermining the game's spectation-first goal.

**Independent Test**: Watch the same recorded race at the new default and verify that its presentation lasts twice as long as the current presentation while every recorded lap, finish, event, and final result remains unchanged.

**Acceptance Scenarios**:

1. **Given** a newly opened scored race, **When** playback begins, **Then** it runs at 1× and takes twice the pre-feature presentation duration.
2. **Given** a newly opened Test Day race, **When** playback begins, **Then** it uses the same 1× default and timing meaning as a scored race.
3. **Given** a race playing at 1×, **When** no input is provided, **Then** every recorded event is shown in its original order and the race advances to Results only after all cars finish.

---

### User Story 2 - Speed up a race without changing it (Priority: P1)

As a player who has seen enough detail, I can switch between 1× and 2× while the race is playing, shortening the remaining watch without skipping the result or changing any simulated evidence.

**Why this priority**: A slower default only works if experienced players can recover the current faster pace whenever they want it.

**Independent Test**: Replay one immutable result under multiple speed-change sequences and verify identical event order, finish order, lap evidence, item evidence, outcome, and Results payload.

**Acceptance Scenarios**:

1. **Given** playback at 1×, **When** the player selects 2×, **Then** presentation time advances twice as quickly from that moment onward.
2. **Given** playback at 2×, **When** the player selects 1×, **Then** presentation returns to the default readable pace without restarting or jumping backward.
3. **Given** two playbacks of the same result using different speed selections, **When** both finish, **Then** their Results evidence is deeply identical.
4. **Given** a speed change near a lap or finish boundary, **When** playback crosses that boundary, **Then** its callout, projection, and finish event appears exactly once.

---

### User Story 3 - Understand and operate the controls (Priority: P2)

As a keyboard, pointer, or touch user, I can immediately see the current playback speed and operate either speed without obscuring the track or race information.

**Why this priority**: Controls that are ambiguous, inaccessible, or visually compete with race evidence would trade one legibility problem for another.

**Independent Test**: At each supported landscape viewport, use pointer and keyboard input to select both speeds and verify a persistent non-color active state and unobstructed race information.

**Acceptance Scenarios**:

1. **Given** the race view, **When** it appears, **Then** both `1×` and `2×` are visible and `1×` is visibly selected using more than color alone.
2. **Given** keyboard input, **When** the player presses `1` or `2`, **Then** the matching speed is selected with the same effect as pointer or touch input.
3. **Given** an unavailable or completed race, **When** no playback is active, **Then** speed input cannot mutate run or result state.

### Edge Cases

- Repeatedly selecting the already-active speed is idempotent.
- Rapid alternation between speeds cannot duplicate or omit checkpoint events.
- A large or delayed render frame may cross multiple presentation boundaries; all required immutable events remain represented exactly once.
- Speed changes during the final moments cannot prevent Results navigation or trigger it twice.
- Leaving and opening another race resets playback to 1×; speed is not remembered between races in this feature.
- Missing legacy timing evidence uses the existing deterministic playback construction and the same 1×/2× meanings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every newly opened scored race and Test Day race MUST begin at the default `1×` playback speed.
- **FR-002**: `1×` MUST advance presentation at 50% of the pre-feature playback rate, making an unchanged race take twice as long to watch.
- **FR-003**: `2×` MUST advance presentation at twice the `1×` rate, matching the pre-feature playback duration for an unchanged race.
- **FR-004**: Players MUST be able to switch between `1×` and `2×` at any time during active playback without restarting, rewinding, or jumping the race.
- **FR-005**: Playback speed MUST affect presentation time only and MUST NOT change simulation, setup, track, lap evidence, item evidence, event order, finish order, outcome, settlement, standings, reputation, contracts, or run progression.
- **FR-006**: The watched-race screen MUST show both speed choices and MUST identify the active choice through text or shape in addition to color.
- **FR-007**: Pointer, touch, and keyboard input MUST provide equivalent access; keyboard keys `1` and `2` MUST select their corresponding speeds.
- **FR-008**: Speed selection MUST be race-local and MUST reset to `1×` whenever a new watched race or Test Day playback begins.
- **FR-009**: Crossing a lap, checkpoint, item activation, projection, or finish boundary after any speed change MUST publish each associated presentation event exactly once.
- **FR-010**: Results navigation MUST occur exactly once after all cars finish, regardless of the active speed or the number of speed changes.
- **FR-011**: The controls MUST fit the existing supported landscape race viewport without covering the track, projection, lap label, ticker, item evidence, or vehicle-stat display.
- **FR-012**: This feature MUST NOT add pause, rewind, skip, automatic speed selection, remembered speed, or overtake dramatization.
- **FR-013**: Speed selection MUST scale the presentation clock, vehicle motion, and when recorded events are reached, while the current informational callout or ticker message MUST remain visible until the next message replaces it; playback MUST NOT shorten messages with a separate timer or build a message queue.

### Key Entities

- **Playback Speed**: A race-local presentation setting with exactly two values, `1×` and `2×`; it scales watched time but carries no simulation authority.
- **Presentation Clock**: The monotonic watched-race time used to query immutable playback evidence. Its rate may change, but it never moves backward and never alters that evidence.
- **Playback Event Boundary**: A recorded lap, checkpoint, activation, projection, or finish transition that must be presented once even when one rendered frame crosses it at higher speed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fixed recorded race watched entirely at `1×` takes `2.00 ± 0.05` times its pre-feature presentation duration.
- **SC-002**: The same race watched entirely at `2×` takes `1.00 ± 0.05` times its pre-feature presentation duration.
- **SC-003**: Across representative races and speed-change sequences, 100% of final result and settlement evidence is deeply identical to the unchanged-speed control.
- **SC-004**: Automated boundary tests observe zero duplicated or omitted lap, projection, item, or finish events under rapid and final-moment speed changes.
- **SC-005**: Pointer and keyboard users can select either speed in one action, and the active speed is identifiable without relying on color.
- **SC-006**: Both controls and all existing race evidence remain visible without overlap at the canonical 800×450 landscape viewport.
- **SC-007**: At both speeds, a displayed informational callout or ticker message remains unchanged until another recorded message replaces it, and no queued messages delay race completion or Results navigation.

## Assumptions

- The user's earlier “slow it down by 50%” means halving the current presentation rate, so the new `1×` duration is double today's duration and `2×` restores today's duration.
- Consistent watched-race behavior is more understandable than limiting controls to scored races, so Test Day playback is included.
- Every race begins at the readable default; persistence or a remembered preference can be considered later after playtesting.
- Existing immutable contest results remain the sole authority. This feature changes only how quickly playback consumes them.
- Overtake dramatization remains recorded in `specs/DEFERRED.md` for a separate spectacle/legibility feature.
