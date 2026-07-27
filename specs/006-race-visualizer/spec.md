# Feature Specification: Race Visualizer — Watchable Contest Presentation

**Feature Branch**: `006-race-visualizer`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "An animated, watchable contest presentation: both cars travel around a simple oval track over a fixed ~20-second race, paced proportionally by each side's real per-lap times from 005's lap breakdown, with callouts for discrete item-firing events. Replaces the current instant ContestScene resolution."

## Clarifications

### Session 2026-07-26

- Q: How should item-firing events be shown without multiple notifications flooding the track? → A: Keep the player's three-slot board visible along the bottom and flash each firing item's own slot; simultaneous firings highlight simultaneously, with no transient text callouts.
- Q: Should the race animate at a fixed, consistent watch duration regardless of computed times, or in true real-time? → A: Fixed watch duration, proportionally scaled — each lap's on-screen share of the total stays proportional to its actual computed time, so a faster lap still visibly looks faster, but the whole race always takes a consistent, predictable length to watch.
- Q: What track shape? → A: A simple closed-loop oval — no corners, no track-specific behavior, no real track art (theme is still undecided, constitution `TODO(THEME)`).
- Q: Should the visualizer show which item caused a speed change, or just the resulting speed change? → A: Show which item fired each lap — a callout identifying the item (and its effect) whenever a discrete firing event happens.
- Q: Does this replace the current instant `ContestScene`, or is it a separate view? → A: Replace it — watching the race becomes the normal flow between prepare and results. This is what actually satisfies Constitution Principle IV (Spectation-First), not a demo of it.
- Q: Given 10 discrete laps and a desire for readable item callouts, should the track show one visual loop divided into 10 segments, or 10 literal loops? → A: 10 literal loops around the track, matching real racing more literally.
- Q: Given 10 literal loops need to stay individually readable, what should the total watch duration be pinned to? → A: 20 seconds (≈2s average per lap) — enough time to complete a loop and read a callout, without dragging.
- Q: Should both cars share one time-scale (based on the slower car's total, so the winner visibly finishes early), or does each car independently stretch its own 10 laps to fill the full 20 seconds? → A: Shared scale, based on the slower car's total simulated time — the 20-second budget is defined by whichever car takes longer (`max(playerTime, ghostTime)`), scaled down to 20 seconds; the faster car then finishes its own 10 laps *before* the 20-second mark lands, visibly earlier, while the slower car finishes exactly at 20 seconds. This is the same pattern the existing (soon-to-be-superseded) `buildTimeline` already used (`duration = max(playerTime, ghostTime)`, each side reaching its finish at `t / itsOwnTotal`) — carried forward rather than reinvented. Independent per-car scaling was rejected: it would make both cars always arrive at the same visual instant regardless of who actually won, undercutting FR-010.
- Q: Should the leader indicator (User Story 3) show just which car is ahead, or also the numeric time gap? → A: Show the numeric gap too (e.g., "+2.3s") — consistent with this project's "visible numbers, not hidden math" stance (Constitution Principle III), the same standard already applied to item effects and draft weighting in every prior feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The contest plays out as a watched race, not an instant result (Priority: P1)

Instead of jumping straight from the prepare phase to a results screen, the player watches their car and the ghost's car complete 10 laps around a track over a fixed ~20-second animation. Each lap's pace — for both cars — visibly reflects the real per-lap time computed by the simulation (`005-lap-tick-simulation`'s lap breakdown), not a synthetic constant-speed animation. The race ends with both cars' finishing order matching the already-determined outcome.

**Why this priority**: This is the direct fulfillment of Constitution Principle IV (Spectation-First, non-negotiable) and the item deferred from `001-core-loop`'s own clarify session (`specs/DEFERRED.md`) — every other story in this feature only matters once there's a real race to watch.

**Independent Test**: Resolve a contest and watch the animation play from start to finish; confirm it takes a consistent ~20 seconds regardless of the build, both cars complete exactly 10 visible laps, each car's per-lap pace visibly varies according to its actual computed lap times, and the finishing order matches the contest's computed outcome and gap.

**Acceptance Scenarios**:

1. **Given** a resolved contest, **When** the player advances from the prepare phase, **Then** an animated race plays instead of jumping directly to the result screen.
2. **Given** the animation is playing, **When** any two contests are compared, **Then** both take the same total (~20 second) wall-clock duration to watch, regardless of how different the underlying builds are.
3. **Given** the animation is playing, **When** the player's car completes a lap that was computed as faster (or slower) than another of its laps, **Then** that difference is visibly noticeable in how quickly (or slowly) the car completes that specific loop.
4. **Given** the animation finishes, **When** the player looks at the final positions, **Then** the car that finishes first matches the contest's computed `outcome`, and the visual gap between them is consistent with the computed `gap`.
5. **Given** the animation is playing, **When** the player watches it, **Then** no input from the player can change the outcome or any computed value — the animation is a presentation of an already-fully-determined result (Constitution Principle I).

---

### User Story 2 - Board-item flashes explain what's happening (Priority: P1)

The player's board remains visible along the bottom of the contest. Whenever a direct item or a stacking buff fires during one of the player's laps, that item's board slot flashes at the firing moment. Flat buffs — always active every lap by definition (`005-lap-tick-simulation`) — don't flash each lap, since they aren't discrete events.

**Why this priority**: This is the concrete Transparency (Constitution Principle III) payoff the animation exists to deliver — without it, the player sees their car speed up or slow down with no way to attribute why, which is exactly the "hidden math" failure mode this project is designed against.

**Independent Test**: Resolve a contest for a build holding at least one direct item and one stacking buff; confirm the board remains visible, each item's slot flashes on every lap where it fires, and a flat buff does not flash on laps where only it is active.

**Acceptance Scenarios**:

1. **Given** a held direct item with cooldown N, **When** the animation reaches one of that item's firing laps, **Then** its visible board slot flashes at that point.
2. **Given** a held stacking buff, **When** the animation reaches one of its firing laps, **Then** its visible board slot flashes.
3. **Given** a held flat buff and no other firing event on a given lap, **When** that lap plays, **Then** its board slot does not flash — it has no discrete firing moment.
4. **Given** more than one item fires on the same lap, **When** that lap plays, **Then** every firing item's board slot flashes simultaneously — none are silently dropped and no notification text floods the track.

---

### User Story 3 - The current leader is obvious at a glance (Priority: P2)

Beyond the two cars' relative positions on the track, an explicit indicator shows which car currently holds the lead and the numeric time gap between them at any point during playback.

**Why this priority**: The base race (User Story 1) already makes relative position visible by having both cars on the same track, so this is additional legibility polish, not a blocking requirement for the animation to be watchable and correct — hence P2.

**Independent Test**: Watch an animation where the lead changes at least once (a build whose early laps are slower than the ghost's pace but whose later laps pull ahead, or vice versa); confirm the leader indicator updates to reflect the change without the player needing to compare car positions themselves.

**Acceptance Scenarios**:

1. **Given** the animation is playing, **When** the player looks at the leader indicator at any point, **Then** it correctly names whichever car currently has less elapsed simulated time and shows the numeric gap between them, without requiring the player to visually compare track positions or do any math themselves.
2. **Given** the lead changes hands during the race, **When** it does, **Then** the indicator updates accordingly, at the same point in the animation the change actually happens.

---

### Edge Cases

- What happens if the player's build results in a loss (finishes behind the ghost the whole race)? (Rendered normally — the ghost's car simply finishes ahead, matching the computed outcome; no special-casing needed.)
- What happens on a near-tie (very small `gap`)? (The cars render finishing very close together, consistent with the small gap — the underlying `outcome` (win/loss/tie) is unaffected by how visually close the finish looks.)
- What happens when a lap's computed time is extremely short (near `005-lap-tick-simulation`'s `MIN_LAP_TIME` floor)? (That lap's on-screen segment is still proportionally short, but a minimum *visual* segment duration (distinct from the simulation's own floor) ensures it never becomes an unreadable instant blip — exact value is a planning/implementation detail.)
- What happens when multiple items fire on the exact same lap? (All corresponding board slots flash simultaneously; none are dropped, per User Story 2 AC4.)
- What happens if the player tries to interact with the animation (e.g., clicking)? (Nothing changes as a result — no input during the contest phase can alter the outcome or any computed value, per Constitution Principle I. Whether a future feature adds a skip/fast-forward control is explicitly not decided here — see Assumptions.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST play an animated race in `ContestScene`, replacing its current instant resolve-and-transition behavior, before handing off to the existing `ResultScene`.
- **FR-002**: The animation MUST always take the same fixed total wall-clock duration (20 seconds) to complete, regardless of the underlying build or ghost — defined as however long the *slower* of the two cars (the one with the greater total simulated time) takes to complete its 10 laps, scaled down to 20 seconds.
- **FR-003**: Both cars MUST share that single time-scale (derived from the slower car's total, per FR-002) rather than each being independently stretched to fill the full duration; each of the 10 laps' on-screen duration, for both cars, MUST be proportional to that lap's actual computed time from `005-lap-tick-simulation`'s lap breakdown under that shared scale — not a synthetic constant-speed interpolation, and not two independently-normalized timelines.
- **FR-004**: Both the player's car and the ghost's car MUST visibly complete exactly 10 discrete loops around the track over the course of the animation, matching `LAP_COUNT`.
- **FR-005**: At any point during playback, each car's position along the track MUST reflect its own actual cumulative simulated progress at that point — sourced from `ContestResult.laps`, not the prior synthetic `TimelineFrame`/`timeline` interpolation (which this feature supersedes for playback purposes).
- **FR-006**: The player's three-slot board MUST remain visible along the bottom of `ContestScene`; whenever a direct item or stacking buff fires on one of the player's laps (per that lap's `firedItems`), its own board slot MUST flash when that lap plays.
- **FR-007**: A flat buff's board slot MUST NOT flash per lap — its constant, always-on presence is not a discrete firing event.
- **FR-008**: The track MUST be rendered as a single, simple closed-loop oval shape — no corner-specific or track-segment-specific behavior is required.
- **FR-009**: The player's car and the ghost's car MUST be visually distinguished from each other at all times during playback (e.g., color or label).
- **FR-010**: The animation MUST end with both cars' finishing order and visual gap consistent with the contest's already-computed `outcome` and `gap` — concretely, the car with the lesser total simulated time MUST visibly complete its 10th lap *before* the 20-second mark (proportionally earlier, per FR-002/FR-003's shared time-scale), while the slower car completes its 10th lap exactly at the 20-second mark; on a tie, both complete their 10th lap at the same instant.
- **FR-011**: No player input during the animation may alter the outcome, the gap, or any other already-computed value — the animation is read-only presentation of a fully-determined result (Constitution Principle I).
- **FR-012**: The system MUST display an explicit, at-a-glance indicator of which car currently holds the lead during playback, including the current numeric time gap between them (e.g., "+2.3s"), updating at the correct point whenever the lead changes.
- **FR-013**: `ResultScene` and its existing content MUST remain unchanged — it is still shown after the animation completes, not altered by this feature.

### Key Entities

- **Track**: a single, fixed, simple closed-loop oval shape every race is rendered on. No variety or venue selection in this feature.
- **Car Marker**: the visual representation of a car on the track — one for the player's build, one for the ghost — distinguished from each other (FR-009).
- **Lap Segment Duration**: the on-screen time allotted to one car's one lap, derived by proportionally scaling that lap's real computed time against the shared 20-second time-scale (FR-002/FR-003) — the *same* scale factor applies to both cars (derived from the slower car's total), not independently-normalized per car, so a faster car finishes proportionally earlier rather than both cars always arriving together.
- **Player Board**: the persistent three-slot strip at the bottom of the contest; occupied slots identify held items and independently flash for discrete firing events.
- **Leader Indicator**: an explicit UI element (User Story 3) naming whichever car currently has less elapsed simulated time during playback, together with the current numeric time gap between them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every resolved contest's animation takes the same fixed ~20-second total duration to watch, regardless of build/ghost differences.
- **SC-002**: A viewer can identify, purely by watching, which of the player's 10 laps were relatively faster or slower — the pacing visibly varies, it is not constant.
- **SC-003**: Every discrete item-firing event (a direct item's or stacking buff's actual firing lap) produces exactly one visible flash on its board slot at the correct lap, including simultaneous flashes for every same-lap event.
- **SC-004**: No flat buff board slot ever produces a per-lap flash across any resolved contest.
- **SC-005**: The finishing order and visual gap at the end of every animation are consistent with that contest's computed `outcome` and `gap`, with zero exceptions — the winning car always visibly completes its 10th lap before the 20-second mark, proportional to the actual gap, never at the same instant as the losing car (except on an exact tie).
- **SC-006**: A viewer can correctly identify which car is currently ahead, and by roughly how much, at any paused/inspected point during playback without needing to compare track positions or do math themselves.

## Assumptions

- Track shape is a single fixed, simple closed-loop oval — no track variety, no corner-specific behavior, and no committed art style (theme remains undecided, constitution `TODO(THEME)`); this feature is about playback structure and timing, not final visual art.
- The 20-second total watch duration (Clarifications) is this feature's illustrative default, not a locked balance number — same status as `LAP_COUNT`, `SLOT_CAPACITY`, and other placeholder constants in prior features.
- A skip/fast-forward control is explicitly **not** included in this feature. It was raised and consciously deferred — not because it's undesirable, but because it wasn't asked for and adds scope beyond what's needed to satisfy Constitution Principle IV for the first time. Tracked in `specs/DEFERRED.md`. If added later, it must only affect presentation pacing, never reopen or alter any already-computed value (Constitution Principle I).
- The existing `TimelineFrame` type / `buildTimeline` synthetic interpolation is superseded by this feature for playback purposes — `005-lap-tick-simulation`'s own research.md anticipated exactly this, noting the real lap breakdown would let "the visualizer feature... derive a much better timeline directly." Whether the old type is formally removed, repurposed, or merely left unused is a planning-level decision, not fixed here.
- A minimum *visual* segment duration (distinct from the simulation's `MIN_LAP_TIME` floor) may be needed so an extremely fast computed lap doesn't render as an unreadable instant blip — the exact value is a planning/implementation detail, not fixed here.
- Simultaneous same-lap item firings flash their board slots concurrently so no event is dropped or queued as notification text (User Story 2 AC4).
- `ResultScene` is unchanged by this feature (FR-013) — this feature's scope is entirely `ContestScene`'s presentation between the prepare phase and the existing result screen.
- This feature does not touch simulation correctness, item/draft mechanics, board/storage rules, or `LAP_COUNT` itself (`002-item-slots` through `005-lap-tick-simulation` remain unchanged) — it is a presentation layer consuming `ContestResult` as already computed.
- This feature resolves/supersedes `specs/DEFERRED.md`'s "Live-paced / broadcast-style contest presentation" entry (deferred from `001-core-loop`) once it ships — Constitution Principle IV's non-negotiable requirement is satisfied by this feature, not merely advanced toward.
- Additional team identities, the real run/encounter structure, a shop/currency economy, and item-granted bonus refreshes remain out of scope, per `specs/DEFERRED.md` — unaffected by this presentation-layer feature.
