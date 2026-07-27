# Internal Contract: Simulation Module (updated for 004-board-storage-ui)

This project has no external API, service, or other system consuming it — the only "interface" worth contracting is the boundary between `src/simulation/` (framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). This feature adds one new module (`storage.ts`), modifies `slots.ts`'s `addItem` signature, and modifies `resultingTime`'s/`resolveContest`'s handling of the new board/storage split. `drawItem` and `applyBuffs` are unchanged in signature and invariants and are not restated here.

## `hasOpenSlot` (MODIFIED — same name, new underlying shape)

```ts
function hasOpenSlot(build: Build): boolean
```

**Change**: now returns `build.board.some((slot) => slot === null)` instead of `build.heldItems.length < SLOT_CAPACITY`. Externally observable behavior is identical (true iff the board isn't full) — only the internal representation changed.

## `addItem` (MODIFIED — new parameter)

```ts
function addItem(build: Build, item: OfferedItem, boardIndex: number): Build
```

**Inputs**:
- `build`, `item` — unchanged in meaning.
- `boardIndex` (NEW) — the specific board slot to place `item` into.

**Precondition**: `build.board[boardIndex] === null`. Calling this on an occupied slot, or an out-of-range index, is a programming error in the caller (`PrepareScene` MUST only call this for the slot the player actually dropped onto, which the drop-zone event guarantees is a real board index).

**Postcondition**: returns a **new** `Build` whose `board` is identical to the input except index `boardIndex`, which now holds `item`. `storage` is untouched.

**Invariants (test these first, per strict TDD)**:
1. **Capacity is never exceeded**: `board.length` never changes — an item can only occupy a `null` slot, never grow the array (SC-001, unchanged from 002/003's capacity-never-exceeded guarantee, now expressed over a fixed-length array instead of list length).
2. **No side effects**: does not mutate `build`, `build.board`, or `item`.
3. **Other slots unaffected**: every board index other than `boardIndex` is unchanged, and `storage` is unchanged.

## `evictAndAdd` (unchanged)

```ts
function evictAndAdd(build: Build, evictIndex: number, item: OfferedItem): Build
```

Signature, precondition (`0 <= evictIndex < SLOT_CAPACITY`, that board slot is non-null), postcondition (that slot's item replaced by `item`), and invariants (no protected item, no side effects) are identical to `002-item-slots`'s contract — only `build.heldItems[evictIndex]` becomes `build.board[evictIndex]` internally.

## `hasOpenStorageSlot` (NEW)

```ts
function hasOpenStorageSlot(build: Build): boolean
```

Returns `build.storage.some((slot) => slot === null)`. Pure query, no side effects. Mirrors `hasOpenSlot` for the storage array.

## `moveToStorage` (NEW)

```ts
function moveToStorage(build: Build, boardIndex: number, storageIndex: number): Build
```

**Precondition**: `build.board[boardIndex] !== null` (there's an item to move) and `build.storage[storageIndex] === null` (the target is open). Caller (`PrepareScene`) MUST check `hasOpenStorageSlot`/target-slot-emptiness before calling — this function does not silently pick a different slot.

**Postcondition**: returns a **new** `Build` where `board[boardIndex]` becomes `null` and `storage[storageIndex]` becomes the item that was at `board[boardIndex]`. No other slot changes.

**Invariants (test these first, per strict TDD)**:
1. **Item is preserved, not duplicated or lost**: the exact item object that was on the board is what appears in storage afterward.
2. **Capacities unchanged**: both `board.length` and `storage.length` are unchanged (FR-008, User Story 4 AC1).
3. **No side effects**: does not mutate the input `build` or its arrays.

## `moveToBoard` (NEW)

```ts
function moveToBoard(build: Build, storageIndex: number, boardIndex: number): Build
```

**Precondition**: `build.storage[storageIndex] !== null` and `build.board[boardIndex] === null` (open board slot). For dropping a stored item onto an *occupied* board slot, see `swapBoardStorage` instead — this function is only for moves into an open board slot (FR-009, User Story 4 AC2).

**Postcondition**: returns a **new** `Build` where `storage[storageIndex]` becomes `null` and `board[boardIndex]` becomes the item that was at `storage[storageIndex]`.

**Invariants**: same three as `moveToStorage`, mirrored (item preserved, capacities unchanged, no side effects).

## `swapBoardStorage` (NEW)

```ts
function swapBoardStorage(build: Build, boardIndex: number, storageIndex: number): Build
```

**Precondition**: `build.board[boardIndex] !== null` and `build.storage[storageIndex] !== null` (both occupied — this is specifically the "dropped onto an occupied slot" case, FR-010, User Story 4 AC3).

**Postcondition**: returns a **new** `Build` where `board[boardIndex]` and `storage[storageIndex]` have traded contents. No item is lost; no capacity changes (a swap can never overflow either array, since it never changes how many non-null entries either array holds).

**Invariants (test these first, per strict TDD)**:
1. **Both items preserved**: the item that was on the board ends up in storage and vice versa — neither is lost or duplicated.
2. **No side effects**: does not mutate the input `build` or its arrays.
3. **Idempotent-pair property**: calling `swapBoardStorage` twice with the same indices returns a `Build` deep-equal to the original input (swap-of-a-swap is a no-op).

## `resultingTime` (MODIFIED from 003-item-pool-draft)

```ts
function resultingTime(build: Build): number
```

**Change**: now computes `collectActiveItems(build)` first (data-model.md — every non-null board item, plus every non-null storage item with `activeWhileStored === true`), then runs that list through the unchanged `applyBuffs`, then sums onto `build.car.baseTime`, exactly as 003 summed `heldItems`. The non-finite-result guard (002-item-slots, Polish T020) is unchanged and still applies to the final total.

**Invariants (test these first, per strict TDD)**:
1. **Ordinary storage items are fully excluded**: a build with an ordinary (non-flagged) item in storage produces the same `resultingTime` as the same build with that storage slot empty (FR-011, SC-003).
2. **Flagged storage items count exactly as board items would**: a build with the one `activeWhileStored` item in storage produces the same `resultingTime` as an otherwise-identical build with that item on the board instead (FR-011, SC-003).
3. All invariants from `003-item-pool-draft`'s `resultingTime` contract continue to hold over the *active* item set: determinism, outcome correctness, order-independence (SC-004, unchanged — `collectActiveItems`'s output order doesn't affect the sum), no side effects, purity.

## `resolveContest` (MODIFIED — `ContestResult` shape only)

```ts
function resolveContest(build: Build, ghost: SampleGhost): ContestResult
```

**Change**: `ContestResult.heldItems` is replaced by `ContestResult.board: OfferedItem[]` and `ContestResult.storage: OfferedItem[]` (both compacted — non-null entries only, in their array order), echoing `build.board`/`build.storage` for result-screen display (data-model.md). All other invariants (determinism, outcome correctness, no side effects, purity) are unchanged from 002/003's contract.

## `drawItem`, `applyBuffs` (unchanged)

Signatures, inputs, outputs, and invariants are identical to `003-item-pool-draft`'s contract. `applyBuffs` in particular needs no changes — it already just operates on whatever flat item list it's given; `build.ts` is what changed to give it a different (active-set-filtered) list.

## Non-goals for this contract

- No network calls, no persistence — unchanged from 001-003.
- No live/streamed output — unchanged from 001-003.
- No board-to-board reordering rule — the spec doesn't require it, and board position carries no rule-meaning (`002-item-slots` FR-001's "no per-slot typing" still holds; positional identity exists only to give drag targets stable addresses, not to give slots meaning).
- No Refresh-allowance logic in `src/simulation/` — Refresh's one-per-round tracking is `PrepareScene` state, not a simulation concern (research.md); nothing in this contract models it.
- No run/encounter structure, shop economy, or currency — Refresh is free and stateless across rounds, not a purchase.
