# Phase 0 Research: Lap-Tick Race Simulation (No Visuals)

All unknowns from Technical Context are either inherited unchanged from `004-board-storage-ui` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: A new `laps.ts` module owns the per-lap loop; `buffs.ts` is rewritten to be lap-aware

**Decision**: `src/simulation/laps.ts` exports `firesOnLap(cooldown, lap)` and `simulatePlayerLaps(build)`, returning one entry per lap with that lap's clamped time and which items fired. `src/simulation/buffs.ts`'s `applyBuffs` (a one-shot function over a flat item list, 003/004) is replaced by `computeBoostsForLap(activeItems, lap, stackingState)`, which returns the boosts-by-tag applicable *this lap* plus the updated stacking state to carry into the next lap.

**Rationale**: The old `applyBuffs` computed a single, final boosts-by-tag map once, because every buff (in 003/004's model) was permanently active for the whole race. Under lap-ticking, "is this buff contributing right now" depends on the lap number and, for stacking buffs, on how many times it has already fired — genuinely per-lap state that a one-shot function can't express. Splitting "what fires this lap" (`laps.ts`) from "what do active buffs contribute this lap" (`buffs.ts`) keeps each function's job singular and testable in isolation, matching the project's existing pattern of small, focused pure functions (`slots.ts`, `storage.ts`, `draft.ts` each own one concern).

**Alternatives considered**:
- Fold everything into one large `laps.ts` function. Rejected: would mix "cooldown/firing logic" with "tag-boost bookkeeping" in one function body, harder to unit-test each concern independently, and loses the clean separation `buffs.ts` already established in 003.
- Keep `applyBuffs`'s one-shot shape and just call it once per lap with a recomputed "effectively active this lap" item list. Rejected: doesn't have anywhere to carry a stacking buff's cumulative state *between* calls — a one-shot pure function can't remember prior laps unless something outside it threads that state through, which is exactly what the new `computeBoostsForLap` signature does explicitly.

## Decision: Stacking-buff state is keyed by position in the active-item set, not by item `id`

**Decision**: `StackingState` is a plain object/map keyed by each held item's index within the active-item array for that build (the same array `collectActiveItems`-equivalent logic already produces), not by `OfferedItem.id`.

**Rationale**: `002-item-slots`'s Assumptions explicitly permit holding duplicate copies of the same item. If a player holds two copies of the same stacking-buff item, keying by `id` would silently conflate them into one shared counter — two physical copies would stack as if there were only one, which isn't obviously correct and isn't something the spec addresses directly. Keying by position treats each held copy as an independent instance with its own accumulating counter, which is the more intuitive reading ("two of this item" should do roughly twice as much, not the same as one) and requires no special-casing for the common (non-duplicate) case.

**Alternatives considered**:
- Key by `id`, treating duplicate copies as a single shared stack. Rejected: silently changes behavior the moment a player holds two copies of the same stacking buff, with no spec guidance that this is the intended reading, and no test would catch it since the pool currently has no duplicate-holding scenario exercised yet.

## Decision: Order-independence holds because per-lap contributions are still commutative sums

**Decision**: No special logic is needed to guarantee order-independence (FR-013) beyond what already holds structurally: each lap's total is a sum of independently-computed per-item contributions (direct items) plus tag-keyed boost sums (buffs), both of which are commutative regardless of the active-item array's order.

**Rationale**: Keying stacking state by array position (previous decision) could seem like it introduces an order dependency, but it doesn't change the *outcome* — every held item's own cooldown, tag, and boost data travel with it regardless of which index it lands on; the index is only an internal bookkeeping key for that one item's running counter, not something that feeds back into the computation's result. Two builds holding the "same set" of items in different acquisition order still produce identical per-lap sums.

**Alternatives considered**:
- Add an explicit sort/canonicalization step before simulating, to "guarantee" order-independence defensively. Rejected: unnecessary — the property already holds by construction (summation is commutative), and adding a sort step would be complexity with no behavioral payoff. Verified instead with a permutation test (tasks.md).

## Decision: `SpecCar`/`SampleGhost`'s per-lap values are derived by dividing the old totals by `LAP_COUNT`

**Decision**: `BASELINE_CAR.baseLapTime = 6` (was `baseTime: 60`, ÷ 10) and `SAMPLE_GHOST.lapTime = 5.85` (was `finishingTime: 58.5`, ÷ 10).

**Rationale**: Unlike item magnitudes (explicitly allowed to shift balance, since the original items were proof-of-concept content), the car's baseline and the ghost's pace aren't "content" in the same throwaway sense — they're the two reference points every build is measured against. Dividing the old totals evenly by `LAP_COUNT` preserves the exact same relative pace relationship that existed before (ghost still slightly faster than an unmodified car, by the same proportion), so this migration doesn't silently reset the game's baseline difficulty as a side effect of the architecture change.

**Alternatives considered**:
- Pick new arbitrary per-lap values. Rejected: no reason given in spec/clarify to change the baseline difficulty; dividing evenly is the more conservative, defensible default and requires no new judgment call.

## Decision: `buildTimeline`/`TimelineFrame` are not made lap-aware in this feature

**Decision**: `contest.ts`'s existing `buildTimeline(playerTime, ghostTime)` is left unchanged — still a synthetic 20-frame interpolation between the two final totals, now fed by lap-derived totals instead of one-shot totals, but with no awareness of individual lap boundaries.

**Rationale**: Nothing in this feature's FRs requires `TimelineFrame` to become lap-accurate — FR-010's lap breakdown is the new, explicit legibility surface; `TimelineFrame` was always documented as forward-compatibility scaffolding for a *future* live-playback feature, and upgrading its fidelity is naturally that future visualizer feature's concern (it can derive a much better timeline directly from the new lap breakdown data this feature produces). Changing it now would be scope not asked for.

**Alternatives considered**:
- Rebuild `buildTimeline` to interpolate between real per-lap cumulative positions. Rejected for this feature: no requirement calls for it, and the visualizer feature is the more natural, better-informed place to decide exactly what timeline granularity it needs.

## Decision: Content migration strategy for the existing pool

**Decision**: The existing buff item ("Performance Calibration Suite") needs no data change — it already has no `cooldown` field, which is exactly what makes an item a flat buff under the new model. One new stacking-buff item is added to the pool (smaller per-firing increment, a cooldown > 1) to demonstrate that mechanism concretely (spec Assumptions require at least one of each kind to exist, for SC-007 to be verifiable). All 12 existing direct items are assigned a `cooldown` — at least one item gets `cooldown: 1` and at least one gets `cooldown > 1` (SC-002), with the rest assigned during task execution as straightforward content authoring, not further design work.

**Rationale**: This is the minimal, lowest-risk path that satisfies every FR: it reuses existing content wherever the model already fits (the current buff item), and adds exactly one new illustrative item where a genuinely new mechanism (stacking) needs a real example — the same "prove it with one concrete instance" pattern `003-item-pool-draft` and `004-board-storage-ui` both used for their own new mechanics.

**Alternatives considered**:
- Convert the existing buff item into a stacking buff instead of adding a new one. Rejected: would leave no *flat* buff demonstrated unless yet another new item were added anyway — adding one new stacking buff and keeping the existing one flat covers both kinds with the least content churn.

## Everything else

All other Technical Context values (language, dependencies, testing framework, target platform, project type, performance goals) are unchanged from `004-board-storage-ui`'s own `research.md`/`plan.md` — no new research was needed for them.
