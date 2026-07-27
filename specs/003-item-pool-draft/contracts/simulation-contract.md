# Internal Contract: Simulation Module (updated for 003-item-pool-draft)

This project has no external API, service, or other system consuming it — the only "interface" worth contracting is the boundary between `src/simulation/` (framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This feature adds two new modules (`draft.ts`, `buffs.ts`) to that boundary and modifies `resultingTime`'s internal computation; all three are documented here since all are written test-first (Constitution Development Workflow). `resolveContest`, `hasOpenSlot`, `addItem`, and `evictAndAdd` are unchanged from `002-item-slots`'s contract and are not restated in full here — only their invariants relevant to this feature's changes are called out below.

## `drawItem` (NEW)

```ts
function drawItem(
  pool: OfferedItem[],
  targetTag: IdentityTag,
  tagWeight: number,
  rng: () => number
): OfferedItem
```

**Inputs**:
- `pool` — the full item pool to draw from (data-model.md). MUST be non-empty, and MUST contain at least one item with `identityTag === targetTag` and at least one item without it (both groups non-empty) — this is a precondition on the *content* (`ITEM_POOL`), not something `drawItem` itself validates at runtime.
- `targetTag` — the identity tag to weight toward (this feature: always `ACTIVE_IDENTITY_TAG`, `"performance"`).
- `tagWeight` — fraction of draws that should land in the tagged group (this feature: `TAG_WEIGHT`, `0.75`).
- `rng` — a function returning a number in `[0, 1)` each call. Production code passes `Math.random`; tests pass fixed or scripted values.

**Output**: a single `OfferedItem` from `pool`.

**Invariants (test these first, per strict TDD)**:

1. **Determinism given fixed input**: calling `drawItem` with the same `pool`, `targetTag`, `tagWeight`, and a `rng` that returns the same sequence of values MUST return the same item every time — no hidden state, no dependency on wall-clock or call history.
2. **Group selection respects `tagWeight`**: if the first `rng()` call returns a value `< tagWeight`, the returned item MUST have `identityTag === targetTag`; if `>= tagWeight`, the returned item MUST NOT have that tag (i.e., neutral). This is the precise, testable meaning of "weighted" — asserted directly with mocked `rng` values on both sides of the boundary.
3. **Uniform pick within the chosen group**: within whichever group is selected, every item in that group MUST be reachable via some value of the second `rng()` call — no item in a non-empty group is structurally unreachable.
4. **Distribution over many trials** (FR-005/SC-002): across a large sample (N ≥ 1000) of calls using real `Math.random()` (or a wide sweep of stubbed values), the proportion of draws landing in the tagged group MUST fall within an explicit tolerance band around `tagWeight` (e.g., 65%-85% for a 75% target) — see research.md for why this is a tolerance-band assertion, not an exact count.
5. **No side effects**: `drawItem` does not mutate `pool` or any item within it.
6. **Purity enables isolation**: importable and testable under Vitest with no Phaser instance, no canvas, no DOM — same as every other `src/simulation/` function.

## `applyBuffs` (NEW)

```ts
function applyBuffs(heldItems: OfferedItem[]): OfferedItem[]
```

**Inputs**: `heldItems` — a build's held items (0 to `SLOT_CAPACITY`), each possibly carrying `identityTag` and/or `buff`.

**Output**: a new array, same length and order as the input. Each non-buff item's `timeModifier` is scaled by `(1 + totalMatchingBoostPercent / 100)`, where `totalMatchingBoostPercent` is the sum of `boostPercent` across every held buff item sharing that item's `identityTag`. Buff items pass through with their `timeModifier` unchanged (always 0, per data-model.md's invariant on buff items).

**Invariants (test these first, per strict TDD)**:

1. **Boost applies when tags match** (FR-009, US4 AC1): given a held buff item (`identityTag: "performance"`, `buff: { boostPercent: X }`) and a held direct item (`identityTag: "performance"`, `timeModifier: M`), the direct item's output `timeModifier` MUST equal `M * (1 + X / 100)`.
2. **Inert when no tag matches** (FR-010, US4 AC2): given a held buff item and a held direct item with a *different* `identityTag` (or neutral), the direct item's output `timeModifier` MUST equal its input `timeModifier`, unchanged.
3. **Additive stacking** (Edge Cases): given two held buff items both targeting the same tag (`boostPercent: X` and `Y`), a matching direct item's output MUST equal `M * (1 + (X + Y) / 100)`.
4. **Order-independence preserved**: `applyBuffs` followed by summing MUST produce the same total regardless of `heldItems`' order — required because `resultingTime` feeds directly into `resolveContest`'s existing order-independence invariant (SC-004, unchanged from 002-item-slots). This holds by construction (the boost calculation only depends on *which* items are held, via a tag-keyed sum, never on array position).
5. **No side effects**: does not mutate the input array or any item within it; returns new objects.
6. **Purity enables isolation**: importable and testable under Vitest with no Phaser instance, canvas, or DOM.

## `resultingTime` (MODIFIED from 002-item-slots)

```ts
function resultingTime(build: Build): number
```

**Change**: now computes `applyBuffs(build.heldItems)` first, then sums the resulting `timeModifier` values onto `build.car.baseTime` (previously summed `build.heldItems`' `timeModifier` values directly). The non-finite-result guard (`002-item-slots`, Polish T020) is unchanged and still applies to the final total.

**Invariants**: all invariants from `002-item-slots`'s contract for `resultingTime`/`resolveContest` continue to hold (determinism, outcome correctness, detectable effect of held items, order-independence, no side effects, purity) — this feature does not weaken any of them; it only inserts a new, equally pure computation step ahead of the existing sum.

## `resolveContest`, `hasOpenSlot`, `addItem`, `evictAndAdd` (unchanged)

Signatures, inputs, outputs, and invariants are identical to `002-item-slots`'s contract. This feature does not touch slot capacity or eviction rules (FR-007) and does not change `resolveContest`'s signature — only what `resultingTime` computes internally, which `resolveContest` already calls without knowing its internals.

## Non-goals for this contract

- No network calls, no persistence — unchanged from 001/002.
- No live/streamed output — unchanged from 001/002.
- No per-lap/per-tick effect resolution or item cooldowns — `applyBuffs` runs once per build resolution, not on any kind of loop or timer (see `specs/vision.md`, "Item effects & simulation depth"; `specs/DEFERRED.md`).
- No team-identity selection logic — `ACTIVE_IDENTITY_TAG` is a hardcoded constant this feature reads, not a value `drawItem` or any other function derives from player input.
- No second, independent "target tag" concept for buff items — a buff item's target is always its own `identityTag` (data-model.md).
