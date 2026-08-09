# Internal Contract: Simulation Module (updated for 007-count-synergy-buff)

This project has no external API, service, or other system consuming it — the only "interface" worth contracting is the boundary between `src/simulation/` (framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This feature modifies `buffs.ts`'s `computeBoostsForLap` and `laps.ts`'s `simulatePlayerLaps`, and adds two new exported `buffs.ts` helpers. `firesOnLap`, `isFlatBuff`, `drawItem`, `hasOpenSlot`/`addItem`/`evictAndAdd`, `hasOpenStorageSlot`/`moveToStorage`/`moveToBoard`/`swapBoardStorage`, `buildPlaybackSchedule` and the rest of `playback.ts` are all unchanged and not restated here.

## `isCountSynergyBuff` (NEW, in `buffs.ts`)

```ts
function isCountSynergyBuff(item: OfferedItem): boolean
```

Returns `!!item.buff?.perCount`. Pure, no side effects.

## `matchingDirectItemCount` (NEW, in `buffs.ts`)

```ts
function matchingDirectItemCount(allHeldItems: OfferedItem[], item: OfferedItem): number
```

Returns the count of items in `allHeldItems` where `candidate !== item && !candidate.buff && candidate.identityTag === item.identityTag`.

**Invariants (test these first, per strict TDD)**:
1. **Excludes the item itself**: an `allHeldItems` array containing only `item` returns `0`.
2. **Excludes other buffs**: a matching-tag buff item in `allHeldItems` does not count toward the total.
3. **Excludes non-matching tags**: an item with a different (or absent) `identityTag` does not count.
4. **Counts duplicates individually**: two separate matching-tag direct items (even with the same `id`, i.e. duplicate copies) both count.
5. **Order-independent, no side effects**: result doesn't depend on array order; does not mutate `allHeldItems` or any item within it.

## `computeBoostsForLap` (MODIFIED signature and behavior)

```ts
function computeBoostsForLap(
  activeItems: OfferedItem[],
  allHeldItems: OfferedItem[],
  lap: number,
  incomingState: StackingState
): LapBoosts
```

**Change**: for a buff item where `isCountSynergyBuff(item)` is true, `applicableBoost = item.buff.boostPercent * matchingDirectItemCount(allHeldItems, item)` — computed fresh every lap (though the value never actually changes lap-to-lap, since `allHeldItems` can't change mid-contest). This item does **not** write to `stackingState` (that's exclusively for cooldown-gated stacking buffs). The existing `boostsByTag`-application gate (at least one *active* direct item must share the tag) is unchanged and still evaluated against `activeItems`, not `allHeldItems` (research.md).

**Invariants (test these first, per strict TDD)**:
1. **Boost scales linearly with count**: for a count-synergy buff with per-item rate R and qualifying count N, its contribution to `boostsByTag` (when the existing active-receiver gate is satisfied) is exactly `R × N`.
2. **Inert at zero count**: when `matchingDirectItemCount` returns `0`, the buff's `applicableBoost` is `0`.
3. **Count spans inert storage**: a matching-tag direct item held only in storage, without `activeWhileStored`, still contributes to `matchingDirectItemCount` (and therefore to the boost), even though it's absent from `activeItems`.
4. **The buff itself must be active**: a count-synergy buff that is *not* in `activeItems` (inert in storage) does not appear in this function's processing at all — `computeBoostsForLap` only iterates `activeItems`, unchanged from before.
5. **Sums with other buff kinds**: a count-synergy buff and a flat or stacking buff sharing a tag both contribute to the same `boostsByTag[tag]` entry, additively (existing rule, `003-item-pool-draft`).
6. **`stackingState` untouched by count-synergy buffs**: processing a count-synergy buff does not add or modify any entry in the returned `stackingState`.
7. All prior invariants from `006-race-visualizer`'s contract (flat buffs never accumulate, stacking buffs only grow on firing laps, inert-when-no-active-match for flat/stacking, duplicate-item independence, no side effects, purity) continue to hold unchanged for flat and stacking buffs.

## `simulatePlayerLaps` (MODIFIED)

```ts
function simulatePlayerLaps(build: Build): PlayerLap[]
```

**Change**: now also builds `allHeldItems` (every non-null `board` and `storage` item, unconditionally — unlike `activeItems`, which excludes inert storage) and passes it to `computeBoostsForLap`. When building `firedItems` for a count-synergy buff, its `contribution` is computed via the same `matchingDirectItemCount(allHeldItems, item) * item.buff.boostPercent` — reusing the exported helper, not re-deriving the filter inline.

**Invariants (test these first, per strict TDD)**:
1. **A count-synergy buff's `firedItems` contribution equals `matchingDirectItemCount(allHeldItems, item) * item.buff.boostPercent`** exactly, on every lap it's active (every lap, since it has no cooldown).
2. **Direct items' contributions are unaffected**: this change doesn't alter how direct items' own boosted magnitudes are computed, beyond the `boostsByTag` value they read possibly now including a count-synergy contribution.
3. All prior invariants from `006-race-visualizer`'s `simulatePlayerLaps` contract (exactly `LAP_COUNT` entries, minimum floor, cooldown correctness, determinism, order-independence, no side effects) continue to hold.

## `resolveContest` (unchanged)

No changes to `resolveContest`'s own logic — it already calls `simulatePlayerLaps` and passes through whatever `firedItems`/totals it computes. `ContestResult`'s shape is unchanged.

## Non-goals for this contract

- No changes to `playback.ts` — `isFlatBuff` (unchanged) already correctly classifies count-synergy buffs (no cooldown) for callout-exclusion purposes; no new invariant needed there.
- No combining of count-scaling with a cooldown/stacking — `isCountSynergyBuff` items are assumed (by content authoring, not enforced by a runtime check) to never also carry a `cooldown`; this contract doesn't define behavior for that combination.
- No changes to slot capacity, eviction, draft weighting, or board/storage movement rules (002-004) — this contract only covers how a count-synergy buff's magnitude is computed and displayed.
