# Internal Contract: Simulation Module (updated for 002-item-slots)

This project has no external API, service, or other system consuming it — the
only "interface" worth contracting is the boundary between `src/simulation/`
(framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This
feature adds one new module (`slots.ts`) to that boundary and modifies
`resolveContest`'s input shape; both are documented here since both are
written test-first (Constitution Development Workflow).

## `resolveContest` (modified from 001-core-loop)

```ts
function resolveContest(build: Build, ghost: SampleGhost): ContestResult
```

**Inputs**:
- `build: Build` — see data-model.md. `Build.heldItems` is the *final* build
  state (0..`SLOT_CAPACITY` items) — `resolveContest` never receives the
  sequence of accept/decline/evict decisions that produced it, only the end
  result.
- `ghost: SampleGhost` — unchanged, this feature's one fixed sample ghost.

**Output**: `ContestResult` — see data-model.md. `itemAccepted: boolean` from
001 is replaced by `heldItems: OfferedItem[]` (the final build's items,
echoed through for result-screen display).

**Invariants (test these first, per strict TDD)**:

1. **Determinism**: calling `resolveContest` twice with the same `build` and
   `ghost` MUST return deep-equal results, including `timeline` (unchanged
   from 001).
2. **Outcome correctness**: `outcome` MUST be `"win"` iff `playerTime < ghostTime`,
   `"loss"` iff `playerTime > ghostTime`, `"tie"` iff `playerTime === ghostTime`
   (unchanged from 001).
3. **Detectable effect of held items** (updated for multi-item builds):
   for any two builds with the same `car` and ghost, if their `heldItems` sets
   differ in total `timeModifier` sum, `playerTime` MUST differ accordingly.
   Concretely: `resolveContest({car, heldItems: []}, ghost)` and
   `resolveContest({car, heldItems: [item]}, ghost)` MUST produce different
   `playerTime` whenever `item.timeModifier !== 0` (generalizes 001's
   single-item version of this invariant).
4. **Order-independence** (NEW, from spec SC-004): for any permutation of a
   given `heldItems` array, `resolveContest` MUST return the same
   `playerTime`, `gap`, and `outcome`. This MUST hold by construction — summing
   `timeModifier` values is commutative — and is tested directly to guard
   against a future refactor accidentally introducing order-sensitivity (e.g.,
   if per-item effects ever stop being simple additive modifiers).
5. **No side effects**: unchanged from 001 — no mutation of inputs, no global
   state, no wall-clock/randomness/DOM dependency.
6. **Purity enables isolation**: unchanged from 001 — importable and testable
   under Vitest with no Phaser instance, no canvas, no DOM.

## `slots.ts` (NEW)

```ts
function hasOpenSlot(build: Build): boolean
function addItem(build: Build, item: OfferedItem): Build
function evictAndAdd(build: Build, evictIndex: number, item: OfferedItem): Build
```

**`hasOpenSlot(build)`**:
- Returns `build.heldItems.length < SLOT_CAPACITY`.
- Pure query, no side effects.

**`addItem(build, item)`**:
- **Precondition**: `hasOpenSlot(build)` is `true`. Calling this when full is
  a programming error in the caller (`PrepareScene` MUST check `hasOpenSlot`
  first and route to `evictAndAdd` instead) — this function does not silently
  evict on the caller's behalf.
- **Postcondition**: returns a **new** `Build` (does not mutate the input)
  whose `heldItems` is the input's `heldItems` plus `item` appended, length
  exactly one greater than the input.

**`evictAndAdd(build, evictIndex, item)`**:
- **Precondition**: `0 <= evictIndex < build.heldItems.length`. No item is
  protected from eviction (FR-005) — any valid index is acceptable, including
  every possible index; the function has no concept of a "locked" item.
- **Postcondition**: returns a **new** `Build` whose `heldItems` has the same
  length as the input, with the item at `evictIndex` replaced by `item`
  (order of other items preserved, though order is not semantically
  meaningful per the order-independence invariant above).

**Invariants (test these first, per strict TDD)**:

1. **Capacity is never exceeded**: no sequence of `addItem`/`evictAndAdd`
   calls can produce a `Build` with `heldItems.length > SLOT_CAPACITY`
   (SC-001).
2. **Decline is a true no-op**: a round where the player declines (neither
   function is called) leaves `Build` reference-unchanged — trivially true
   since `PrepareScene` simply doesn't call into `slots.ts` on decline, but
   worth asserting so the "decline never mutates" guarantee (FR-004) has an
   explicit test.
3. **Eviction never loses more than one item**: `evictAndAdd` always returns
   a `Build` with the same `heldItems.length` as its input — no accidental
   double-removal or off-by-one (SC-002).
4. **No side effects**: neither function mutates the `build` or `item`
   arguments passed in — both return new objects/arrays.
5. **Purity enables isolation**: both functions, like `resolveContest`, are
   importable and testable under Vitest with no Phaser instance, canvas, or
   DOM.

## Non-goals for this contract

- No network calls, no persistence — unchanged from 001.
- No live/streamed output — unchanged from 001.
- No offer-generation logic — which item is offered in a given round is
  content/sequencing decided by `PrepareScene` reading `ITEM_POOL` in a fixed
  order (see research.md); `slots.ts` only reacts to accept/evict decisions
  once an item is already offered, it does not decide what's offered.
