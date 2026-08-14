# Research: Race Playback Controls

## Decision 1: Keep immutable schedules at the legacy 20-second basis

**Decision**: Preserve `RACE_ANIMATION_SECONDS = 20` and all existing schedule construction. A scene-local clock multiplier advances schedule time at `0.5` for displayed `1×` and `1.0` for displayed `2×`.

**Rationale**: The schedules already encode deterministic lap boundaries, minimum visual-lap duration, tracks, and retained contest evidence. Scaling the consumer clock gives the requested 40-second default and 20-second fast playback without rewriting or reclassifying evidence.

**Alternatives considered**: Change the schedule constant to 40 and use multipliers `1`/`2`; rejected because it alters every schedule boundary and broadens regression risk. Mutate lap times; rejected because presentation must never touch result evidence.

## Decision 2: Use direct speed selection, not a cycle

**Decision**: Model exactly `1×` and `2×` as direct, idempotent selections. Both scenes expose two persistent controls and keys `1` and `2`.

**Rationale**: Direct selection makes active state, keyboard parity, and tests unambiguous. It also avoids Test Day's existing three-state cycle landing on an unintended value.

**Alternatives considered**: One cycling button; rejected because it hides the inactive option and makes keyboard semantics less direct. Slider; rejected because the domain has two discrete values.

## Decision 3: Speed selection is scene-local and resets in `create()`

**Decision**: Do not add speed to Run, contest results, recovery payloads, settings, or browser storage.

**Rationale**: Speed has no game authority and the owner explicitly chose a readable default for every race. Scene-local state prevents stale selections from leaking between races or affecting deterministic equality.

**Alternatives considered**: Remember the last selection globally; explicitly out of scope. Store it in run state; rejected as outcome-irrelevant state pollution.

## Decision 4: Derive all crossed boundaries from a monotonic interval

**Decision**: Clock advancement exposes previous and next schedule time. Pure boundary helpers enumerate any player-lap and car-finish boundaries in `(previous, next]` exactly once and in deterministic time/order sequence. Normal frames usually return zero or one boundary; delayed frames may return several.

**Rationale**: Comparing only the latest lap index can omit intermediate events after a delayed frame, while equality comparisons can duplicate boundary events. Interval derivation makes rate changes irrelevant to event correctness.

**Alternatives considered**: Cap render delta; rejected because it makes the race lag behind real time after stalls. Queue visual messages; rejected by clarification. Re-simulate events; rejected because playback must consume recorded evidence only.

## Decision 5: Message replacement remains event-driven

**Decision**: Race-clock speed does not run a dismissal timer. When one update produces several messages, process them in deterministic recorded order and leave the final message visible; do not queue messages beyond that update or delay Results.

**Rationale**: This exactly reflects the clarification: messages persist until replaced, with no guaranteed duration and no queue.

**Alternatives considered**: Minimum real-time visibility and queued delivery; rejected by the owner. Speed-scaled timeout; rejected because speed must not independently erase text.

## Decision 6: Preserve previously shipped Test Day controls outside speed

**Decision**: Test Day retains Cancel, Pause, Skip, and focus navigation. Its old `1× → 2× → 4×` cycle is replaced by direct displayed `1×`/`2×` selection using the new shared rates. Scored races gain speed only—no pause or skip.

**Rationale**: Feature 030's “must not add” boundary should not silently remove previously accepted Test Day utilities, while the exact two-speed contract must eliminate Test Day's incompatible 4× speed state.

**Alternatives considered**: Remove Test Day pause/skip; rejected as unrelated regression. Leave Test Day's old speed meanings; rejected as inconsistent with FR-001 through FR-003.

## Decision 7: Active state uses label plus shape/stroke

**Decision**: The selected control visibly includes a selected marker and persistent outline/background treatment; hover color alone is insufficient. Controls occupy existing open race HUD space and retain the 800×450 logical fit.

**Rationale**: Non-color state is required, and the canvas UI has no native semantic selected widget.

**Alternatives considered**: Color only; violates FR-006. Status text only; weaker pointer discoverability and separates state from its control.
