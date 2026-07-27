# Internal Contract: Simulation Module (updated for 005-lap-tick-simulation)

This project has no external API, service, or other system consuming it — the only "interface" worth contracting is the boundary between `src/simulation/` (framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This feature adds one new module (`laps.ts`), rewrites `buffs.ts`'s contract, and modifies `build.ts`/`contest.ts`'s internals. `drawItem`, `hasOpenSlot`/`addItem`/`evictAndAdd`, and `hasOpenStorageSlot`/`moveToStorage`/`moveToBoard`/`swapBoardStorage` are all unchanged and not restated here.

## `firesOnLap` (NEW)

```ts
function firesOnLap(cooldown: number, lap: number): boolean
```

Returns `(lap - 1) % cooldown === 0`. Pure, no side effects. `lap` is 1-indexed. A cooldown of 1 returns `true` for every lap; a cooldown of N returns `true` on laps `1, 1+N, 1+2N, …`.

**Invariants (test these first, per strict TDD)**:
1. Cooldown 1 fires on every lap from 1 to any `LAP_COUNT`.
2. Cooldown N (N > 1) fires on exactly the laps `1, 1+N, 1+2N, …` within a given range, and no others.
3. Pure: same inputs always produce the same output; no hidden state.

## `computeBoostsForLap` (NEW, replaces `applyBuffs`)

```ts
function computeBoostsForLap(
  activeItems: OfferedItem[],
  lap: number,
  stackingState: StackingState
): { boostsByTag: Partial<Record<IdentityTag, number>>; stackingState: StackingState }
```

**Inputs**:
- `activeItems` — the build's currently-active item set (board ∪ `activeWhileStored` storage, per 003/004's unchanged rules).
- `lap` — the 1-indexed lap being computed.
- `stackingState` — the cumulative stacking-buff state carried in from the previous lap (empty object on lap 1).

**Behavior**:
- For each item with a `buff` and **no** `cooldown` (flat buff): its `boostPercent` is added to `boostsByTag[item.identityTag]`, every lap, unconditionally.
- For each item with a `buff` **and** a `cooldown` (stacking buff): if `firesOnLap(item.cooldown, lap)`, its stored cumulative value (keyed by the item's index in `activeItems`, not its `id` — research.md) is incremented by `boostPercent`. Whether or not it fired this lap, its current cumulative value (0 if it has never fired) is added to `boostsByTag[item.identityTag]`.
- Items without a `buff` are ignored entirely by this function (they're handled by `laps.ts` as direct contributors, not boost sources).

**Output**: the combined `boostsByTag` for this lap (sum of every contributing flat and stacking buff sharing each tag), and the `stackingState` to pass into the next lap's call.

**Invariants (test these first, per strict TDD)**:
1. **Flat buffs never accumulate**: a flat buff's contribution to `boostsByTag` is identical on lap 1 and lap `LAP_COUNT` — it never grows.
2. **Stacking buffs only grow on firing laps, and never shrink**: for a stacking buff with cooldown N, its stored cumulative value is unchanged between firings and strictly increases (by exactly `boostPercent`) on each lap where `firesOnLap` is true.
3. **Multiple buffs on the same tag sum together**: two buffs (any mix of flat/stacking) sharing a tag contribute the sum of their individually-applicable amounts that lap.
4. **Duplicate-item independence**: two items with the same `id` (both stacking buffs) accumulate independent cumulative values, keyed by their distinct positions in `activeItems`.
5. **Inert when no match, either kind** (spec.md User Story 2 AC5): a flat or stacking buff whose tag matches no *other* active item contributes nothing observable — `boostsByTag` has no entry (or an entry of 0) for that tag, and no direct item's magnitude changes as a result. A stacking buff still advances its own cumulative counter on its firing laps even when inert this way (it has nothing to apply the boost *to* yet, not nothing to accumulate).
6. **No side effects**: does not mutate `activeItems`, any item within it, or the input `stackingState` — returns new objects.
7. **Purity enables isolation**: importable and testable under Vitest with no Phaser instance, canvas, or DOM.

## `simulatePlayerLaps` (NEW)

```ts
function simulatePlayerLaps(build: Build): { time: number; firedItemIds: string[] }[]
```

**Behavior**: computes `activeItems` from `build` (same active-item rule as 003/004). For each lap 1 through `LAP_COUNT`: calls `computeBoostsForLap` (threading `stackingState` forward across the loop); for each direct item (no `buff`) where `firesOnLap(item.cooldown, lap)` is true, computes `item.timeModifier * (1 + (boostsByTag[item.identityTag] ?? 0) / 100)` and sums these into that lap's raw total, plus `build.car.baseLapTime`; clamps the result to `MIN_LAP_TIME` (FR-016); records which items fired (direct items that fired this lap, flat buffs always, stacking buffs only on firing laps).

**Output**: exactly `LAP_COUNT` entries, one per lap, in lap order.

**Invariants (test these first, per strict TDD)**:
1. **Exactly `LAP_COUNT` entries**, regardless of how many or few items are held (including zero).
2. **Minimum floor never violated**: no entry's `time` is ever at or below `MIN_LAP_TIME`'s value minus floating-point epsilon — every raw computation below the floor is clamped up to it (FR-016, SC-008).
3. **Cooldown correctness**: a direct item with cooldown N appears in `firedItemIds` on exactly the laps `firesOnLap` predicts, and contributes to `time` only on those laps.
4. **Determinism**: calling this twice with the same `build` produces identical output arrays (SC-005 groundwork, combined with `resolveContest`'s existing determinism invariant).
5. **Order-independence**: permuting `build.board`'s non-null entries (holding the same final set) produces the same total time across all laps, though individual `firedItemIds` entries may differ in which array position (not item) is referenced internally (research.md — position only matters for stacking-state bookkeeping, not the computed result).
6. **No side effects**: does not mutate `build` or any item within it.

## `resultingTime` (MODIFIED from 004-board-storage-ui)

```ts
function resultingTime(build: Build): number
```

**Change**: now equals `simulatePlayerLaps(build).reduce((sum, lap) => sum + lap.time, 0)`. The existing non-finite-result guard (002-item-slots, Polish T020) is retained on this final sum as a defensive check for malformed content data — a distinct concern from the per-lap minimum floor, which guards against a *sensible but too-aggressive* combination of effects, not against authoring bugs like `NaN`/`Infinity`.

**Invariants**: all invariants from `004-board-storage-ui`'s `resultingTime` contract continue to hold (determinism, outcome correctness via `resolveContest`, order-independence, no side effects, purity) — computed now via lap summation instead of a single pass, but the externally observable contract (same build → same number) is unchanged.

## `resolveContest` (MODIFIED — `ContestResult` shape and internals)

```ts
function resolveContest(build: Build, ghost: SampleGhost): ContestResult
```

**Change**: builds `laps: LapBreakdown[]` by combining `simulatePlayerLaps(build)`'s per-lap player times/fired-items with `ghost.lapTime` (identical every lap) into full `LapBreakdown` entries (adding the 1-indexed `lap` number and `ghostLapTime`). `playerTime` = sum of `laps[].playerLapTime`; `ghostTime` = `ghost.lapTime × LAP_COUNT` (equivalently, the sum of `laps[].ghostLapTime`). `gap`/`outcome` computed exactly as before. `board`/`storage`/`timeline` fields are unchanged in derivation.

**Invariants (test these first, per strict TDD)**:
1. **`laps.length === LAP_COUNT`** for every resolved contest (SC-001).
2. **Ghost constancy**: every `laps[i].ghostLapTime` equals `ghost.lapTime` exactly, with no variance (FR-008, SC-003).
3. **Breakdown sums to reported totals**: `laps.reduce((s, l) => s + l.playerLapTime, 0) === playerTime` and the equivalent for `ghostTime` (FR-010, SC-004).
4. All invariants from `004-board-storage-ui`'s `resolveContest` contract continue to hold: determinism, outcome correctness (win iff playerTime < ghostTime, etc.), order-independence, no side effects, purity.

## `applyBuffs` (REMOVED)

003/004's one-shot `applyBuffs(heldItems): OfferedItem[]` is removed — superseded by `computeBoostsForLap`, which is lap-aware. Nothing else in the codebase calls `applyBuffs` after this feature ships (confirmed: only `build.ts`'s `resultingTime` called it, and that call site is rewritten).

## `buildTimeline` (unchanged)

Signature and behavior are unchanged from 003/004 — still a synthetic 20-frame interpolation between two final totals, now fed by lap-derived totals rather than one-shot totals, with no per-lap awareness (research.md — deliberately out of scope for this feature).

## Non-goals for this contract

- No network calls, no persistence — unchanged from 001-004.
- No live/streamed output — unchanged from 001-004. `TimelineFrame`/`buildTimeline` are not upgraded to be lap-accurate in this feature (research.md).
- No lap-count variation or run/encounter-structure scaling — `LAP_COUNT` is a fixed constant read by `laps.ts`/`contest.ts`, not a parameter derived from any run state.
- No changes to slot capacity, eviction, draft weighting, or board/storage movement rules (002-004) — this contract only covers how a final build's items resolve into a lap-by-lap outcome.
