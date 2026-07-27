# Phase 0 Research: Race Visualizer — Watchable Contest Presentation

All unknowns from Technical Context are either inherited unchanged from `005-lap-tick-simulation` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: A single shared time-scale, derived from `max(playerTime, ghostTime)`

**Decision**: `buildPlaybackSchedule` computes one `scaleFactor = RACE_ANIMATION_SECONDS / Math.max(result.playerTime, result.ghostTime)`, applied identically to both cars' lap boundaries.

**Rationale**: This is exactly what the spec's own clarify session settled on after catching that independent per-car scaling would make both cars always finish at the same visual instant regardless of who won. It's also exactly the pattern the existing (now-removed) `buildTimeline` already used (`duration = Math.max(playerTime, ghostTime)`, each side reaching position 1 at `t / itsOwnTotal`) — this feature generalizes that same idea from a single synthetic start/end interpolation to real per-lap boundaries.

**Alternatives considered**:
- Independent per-car scaling. Rejected per spec Clarifications — would break FR-010's finishing-order requirement.

## Decision: Each lap's visual duration is clamped to a minimum, distinct from the simulation's `MIN_LAP_TIME`

**Decision**: `playback.ts` defines `MIN_VISUAL_LAP_SECONDS = 0.5`. When `buildPlaybackSchedule` computes each lap's proportional visual duration (`scaleFactor * lapTime`), it clamps that individual segment to at least `MIN_VISUAL_LAP_SECONDS` before accumulating it into `visualLapBoundaries`. A side whose laps never need clamping still finishes at exactly its `scaleFactor`-derived total (the slower side still lands on `RACE_ANIMATION_SECONDS` exactly); a side with one or more laps clamped this way may finish slightly *after* its unclamped target, in the rare case where compounding stacking effects push a lap's simulated time down near `005-lap-tick-simulation`'s `MIN_LAP_TIME` floor.

**Rationale**: `scaleFactor` (≈0.35-0.4 for a typical build, `20 / max(playerTime, ghostTime)`) applied to a lap already at `MIN_LAP_TIME` (0.1s) produces a visual segment around 0.03-0.04 real seconds — a couple of frames at 60fps, nowhere near enough time to read a callout naming what fired. This is exactly the risk spec.md's own Edge Cases/Assumptions anticipated ("a minimum visual segment duration... ensures it never becomes an unreadable instant blip") but which nothing downstream of the spec actually implemented until this decision (caught by `/speckit.analyze`, finding F1). 005's stacking-buff mechanic makes hitting `MIN_LAP_TIME` a real, not hypothetical, scenario — this project's whole "visible numbers, not hidden math" stance is undermined if the exact feature built to show those numbers can render them illegibly fast.

**Alternatives considered**:
- Redistribute the clamped time by shrinking other, longer laps proportionally so the total always lands exactly on `RACE_ANIMATION_SECONDS`. Rejected for now: meaningfully more complex (a second normalization pass, and shrinking an already-fast lap's neighbors to compensate could itself create a new lap near the floor), for a benefit (exact total duration in an already-rare edge case) that doesn't outweigh the complexity. Accepting a slightly longer total only in extreme cases is a reasonable, bounded trade-off.
- Leave it unaddressed, relying entirely on content tuning to avoid hitting `MIN_LAP_TIME` in practice. Rejected: this is exactly the "no floor, pure content/tuning responsibility" option `005-lap-tick-simulation`'s own clarify session considered and rejected in favor of a structural guard — the same reasoning applies one layer up, at the visual level.

## Decision: `LapBreakdown` gains per-item `contribution`, computed by `laps.ts` with no new derivation

**Decision**: `firedItemIds: string[]` becomes `firedItems: { id: string; contribution: number }[]`. For a direct item, `contribution` is its actual boosted per-lap magnitude that lap (already computed in `simulatePlayerLaps`'s existing loop). For a buff item, `contribution` is its currently-applicable boost percent that lap — for a flat buff, simply `item.buff.boostPercent` (static, no state needed); for a stacking buff, `lapBoosts.stackingState[index]` (the cumulative value `computeBoostsForLap` already tracks and returns, keyed by the item's position in `activeItems`).

**Rationale**: Spec.md's own User Story 2 AC2 requires callouts to show a stacking buff's "new cumulative effect" — data that isn't derivable from `firedItemIds` alone. Rather than have `playback.ts` re-run cooldown/stacking logic independently (duplicating `laps.ts`/`buffs.ts`'s existing computation and risking drift), the module that already has this data during its own computation attaches it directly. No new state or pass is introduced — every value `firedItems` needs is already sitting in local variables inside `simulatePlayerLaps`'s existing loop body.

**Alternatives considered**:
- Have `playback.ts` independently re-simulate cooldowns/stacking to derive contribution values from `firedItemIds` alone. Rejected: duplicates `005-lap-tick-simulation`'s logic in a second place, a maintenance/drift risk for zero benefit — the original computation already has the answer.
- Add a completely separate "callout data" field to `ContestResult`, parallel to `laps`. Rejected: `firedItems` already needs to exist per-lap for exactly this purpose; a parallel structure would just be `laps` with extra steps.

## Decision: `TimelineFrame`/`buildTimeline`/`ContestResult.timeline` are removed, not deprecated

**Decision**: Delete the `TimelineFrame` interface, `contest.ts`'s `buildTimeline` function, and `ContestResult.timeline` field outright. Confirmed via full-repo search: the only references anywhere are the definitions themselves plus two test assertions (`tests/unit/contest.test.ts`'s "retains the synthetic timeline" check, and `tests/integration/result-scene.test.ts`'s fixture setting `timeline: []`) — no scene or script reads `.timeline` for any real purpose.

**Rationale**: `TimelineFrame` was explicitly documented since `001-core-loop` as forward-compatibility scaffolding for exactly this future live-playback feature. Now that this feature exists and derives everything it needs directly from `laps[]` (which is strictly more accurate — real per-lap data, not synthetic start/end interpolation), keeping the old synthetic timeline around would be dead code with no path to ever being read again. The project's own standing guidance is to delete code once confirmed unused rather than leave it "just in case."

**Alternatives considered**:
- Leave `TimelineFrame`/`timeline` in place, unused, for hypothetical future consumers. Rejected: no plausible future consumer exists once `playback.ts` derives richer data directly from `laps[]`; keeping unused fields around contradicts the project's explicit anti-cruft stance.

## Decision: A single `frameStateAt` aggregator, so `ContestScene.ts` contains no timing math

**Decision**: `playback.ts` exports one aggregating function, `frameStateAt(schedule, visualTimeSeconds): FrameState`, bundling both cars' track progress, the live gap/leader, and which (if any) callout events just became visible — everything `ContestScene.ts` needs to render one frame, as plain data.

**Rationale**: Every prior feature that touched `src/scenes/` kept scene classes as thin as possible, with all real logic (rules, computation) living in framework-free `src/simulation/` modules callable and testable without Phaser. An animated scene is the biggest risk yet of that discipline eroding, since "update every frame" invites doing computation inline in the scene. Concentrating all of it behind one pure, testable entry point keeps `ContestScene.ts` mechanical: call `frameStateAt` each tick, set sprite/text properties from its return value, nothing more.

**Alternatives considered**:
- Expose the smaller functions (`carProgressAt`, `liveGapAt`, `calloutEventsForLap`) directly to `ContestScene.ts` and have it call each separately every frame. Rejected: not wrong, but spreads frame-assembly logic (which callouts are "new" this frame vs. already shown, converting the shared gap into a leader label) across the scene instead of keeping it in one pure, unit-testable place.

## Decision: `isFlatBuff` lives in `buffs.ts`, reused by `playback.ts` for callout filtering

**Decision**: `buffs.ts` exports `isFlatBuff(item: OfferedItem): boolean` (`!!item.buff && item.cooldown === undefined`). `playback.ts`'s callout-event derivation filters `firedItems` through this before turning them into visible callouts (FR-007).

**Rationale**: `buffs.ts` already owns the domain distinction between flat and stacking buffs (that's the entire premise of `computeBoostsForLap`'s branching). Centralizing the predicate there — rather than redefining the same check inline in `playback.ts` — keeps that knowledge in one place, avoiding the two modules silently drifting out of sync if the flat/stacking distinction ever changes shape.

**Alternatives considered**:
- Define the predicate locally in `playback.ts`. Rejected: duplicates domain knowledge `buffs.ts` already encodes, for no isolation benefit (both modules are already in the same strictly-tested layer).

## Everything else

All other Technical Context values (language, dependencies, testing framework, target platform, project type, performance goals) are unchanged from `005-lap-tick-simulation`'s own `research.md`/`plan.md` — no new research was needed for them.
