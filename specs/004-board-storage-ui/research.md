# Phase 0 Research: Board & Storage — Drag-and-Drop Prepare UI

All unknowns from Technical Context are either inherited unchanged from `003-item-pool-draft` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: Board and storage become fixed-size arrays of nullable slots, not compact lists

**Decision**: `Build.heldItems: OfferedItem[]` (a compact list, 002-item-slots/003-item-pool-draft) is replaced by `Build.board: (OfferedItem | null)[]` and `Build.storage: (OfferedItem | null)[]`, both fixed at their respective capacities (`SLOT_CAPACITY`, `STORAGE_CAPACITY`), with `null` marking an open slot.

**Rationale**: `002-item-slots`'s own research.md explicitly rejected a nullable fixed-size array in favor of a compact list, reasoning that "slots are generic and interchangeable... a fixed-size array with nulls implies slot *identity*... that nothing in the spec cares about." That reasoning held when the only consumer of slot state was a scrolling text list. It no longer holds here: FR-001/FR-002 require a *visual* board and storage area, and every acceptance scenario in User Stories 2-4 describes dragging an item onto a *specific* slot (an open one, an occupied one, a particular storage position). A drop target needs stable positional identity to exist at all — a compact list can't say "the player dropped this onto board position 2" without inventing that identity ad hoc at the UI layer. Modeling it directly in `Build` keeps the simulation layer as the single source of truth for what's positionally true, rather than splitting that truth between `Build` and scene-local bookkeeping.

**Alternatives considered**:
- Keep the compact list and derive visual slot positions purely in `PrepareScene` (e.g., "item at list index 0 renders in the leftmost slot"). Rejected: this reintroduces exactly the kind of scene-layer game-state tracking that 001-003 deliberately avoided (`resolveContest`, `slots.ts` are framework-free precisely so game rules aren't buried in Phaser code) — and a swap (User Story 4 AC3) becomes awkward to express over a compact list without slot identity.

## Decision: `resultingTime`'s item set is board items union `activeWhileStored`-flagged storage items

**Decision**: `build.ts` gains a small step ahead of the existing `applyBuffs` call: collect every non-null board item, plus every non-null storage item where `activeWhileStored === true`; feed *that* combined list into `applyBuffs` and the summation, exactly as `resultingTime` already did for `heldItems` in 003.

**Rationale**: FR-011/FR-012 require ordinary storage items to have zero effect on the outcome, and the one exception item to behave exactly as if it were on the board. Filtering to an explicit "active set" before running the existing buff/sum pipeline satisfies both with no change to `applyBuffs` itself — a buff item's tag-matching logic doesn't need to know or care whether a matching item came from the board or from flagged storage, since by the time it runs, both look identical (they're just in the active set).

**Alternatives considered**:
- Give every storage item a runtime "contributes: true/false" check *inside* `applyBuffs`/`resultingTime`'s summation loop, rather than pre-filtering. Rejected: mixes "which items count at all" with "how counted items interact" in one function, harder to test in isolation, and breaks the order-independence guarantee's clean framing (summing over a filtered active set is trivially order-independent; branching mid-loop on location is not obviously so without a fresh proof).

## Decision: Refresh's per-round allowance lives in `PrepareScene`, not `Build`, and is a counter, not a boolean

**Decision**: `PrepareScene` tracks `private refreshesRemaining = 1`, reset to `1` every time the round advances (Next) and decremented (not just flipped) on each use. `Build` gains no new field for this.

**Rationale**: `round` itself has never been part of `Build` in 001-003 — it's prepare-flow bookkeeping, not car/item domain data, and `Build` is what flows into `resolveContest` at the end of prepare. Refresh's allowance is the same kind of thing: it's about *how the current round is being navigated*, not about the resulting car+items state. Keeping it out of `Build` means the simulation layer's contract (what `resolveContest` consumes) doesn't grow a field it will never read. It's modeled as a counter rather than a boolean specifically because spec.md's Key Entities describes "Refresh Allowance" as "a per-round counter (default: 1)," not a flag — and FR-007 explicitly requires the design not preclude a future item effect that grants *additional* refreshes. A boolean can only ever mean "used/not used"; a counter can hold any value a future item effect sets it to (e.g., an item that grants +1) without a later rework, even though this feature itself only ever sets it to exactly 1.

**Alternatives considered**:
- Model `refreshesRemaining` as part of `Build` so it round-trips through the same object `PrepareScene` already threads through. Rejected: `Build` would carry a field with no meaning to `resolveContest` or any simulation function — a smell that scene-local state is leaking into the domain model for convenience rather than correctness.
- Track it as a plain `refreshUsed: boolean`. Rejected: behaviorally identical for this feature's exact "one per round" rule, but contradicts spec.md's own Key Entity framing and would need a breaking rework (`boolean` → `number`) the moment a bonus-refresh item is built — exactly what FR-007 says the design shouldn't preclude.

## Decision: Drag-and-drop uses Phaser's native input drag/drop-zone system

**Decision**: Board slots, storage slots, and the current offer card are registered via `setInteractive({ draggable: true })` and Phaser's built-in `'drag'`/`'dragend'`/`'drop'` input events; board and storage slots are registered as drop zones (`this.add.zone(...).setRectangleDropZone(...)`) rather than computed via custom hit-testing.

**Rationale**: Phaser 3 ships a complete drag-and-drop input system specifically for this use case (draggable game objects, designated drop zones, drag-state events) — reimplementing pointer-position-to-slot-rect hit-testing by hand would duplicate functionality the engine already provides, for no behavioral benefit. This keeps `PrepareScene` idiomatic Phaser rather than a custom input layer bolted on top of it.

**Alternatives considered**:
- Track pointer position manually (`pointermove`/`pointerup`) and compute slot hits with custom rectangle-intersection math. Rejected: strictly more code for the same result Phaser's drop-zone system already provides natively.

## Decision: `addItem` gains an explicit target board index

**Decision**: `slots.ts`'s `addItem(build, item)` becomes `addItem(build, item, boardIndex)`, placing `item` at `board[boardIndex]` (precondition: that slot is `null`). `evictAndAdd(build, evictIndex, item)`'s signature is unchanged — it was already positional.

**Rationale**: Dragging the offer onto a specific open board slot is the whole interaction (User Story 2, AC1) — Phaser's drop-zone event hands the scene exactly which slot was the target. Passing that index straight into `addItem` keeps the visual drop location and the resulting domain state in agreement; auto-placing into "whichever slot happens to be first open" regardless of where the player actually dropped the card would visually desync the drop from the result.

**Alternatives considered**:
- Keep `addItem(build, item)` auto-placing into the first open slot, and have `PrepareScene` visually snap the card to wherever that turned out to be (ignoring the actual drop position for placement, only using it to detect *that* a valid drop occurred). Rejected: the position genuinely doesn't matter for game rules (no per-slot typing, per 002), but making the visible result diverge from where the player dropped the card would read as a bug, not a feature — "the card didn't go where I put it."

## Decision: Next and Refresh decouple "decide" from "advance," a deliberate behavior change from 002/003

**Decision**: Dragging the offer onto the board (accept) or onto a held item (evict) updates `Build` immediately, but no longer calls anything equivalent to 002/003's `nextRound()`. Only clicking Next advances the round; if the offer wasn't dragged onto the board by then, it's treated as declined (unchanged rule, `002-item-slots` FR-004).

**Rationale**: This is required by spec Clarifications, not an implementation preference — with no Accept/Decline buttons, *something* has to signal "I'm done with this offer," and the user's own design (Next + Refresh) makes that split explicit rather than inferred from a drag gesture alone. It also has a nice side effect: it makes User Story 4 (rearranging board/storage) safe to do *after* deciding on the current offer but before moving on, since deciding and advancing are no longer the same action.

**Alternatives considered**:
- Auto-advance the round as soon as *any* valid drop occurs (accept or evict), matching 002/003's behavior, and only add Next for the decline case. Rejected: this was explicitly not what the owner described — Next always governs advancement, regardless of whether a drop already happened, which is simpler to reason about and test than two different advancement paths depending on what the player did.

## Everything else

All other Technical Context values (language, dependencies, testing framework, target platform, project type, performance goals) are unchanged from `003-item-pool-draft`'s own `research.md`/`plan.md` — no new research was needed for them.
