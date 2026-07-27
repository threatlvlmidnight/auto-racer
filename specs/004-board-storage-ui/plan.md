# Implementation Plan: Board & Storage — Drag-and-Drop Prepare UI

**Branch**: `004-board-storage-ui` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-board-storage-ui/spec.md`

## Summary

Replace `PrepareScene`'s scrolling text-and-buttons presentation with a visual board (the existing `SLOT_CAPACITY` active slots) plus a same-sized storage area, both addressed by drag-and-drop. This requires migrating `Build` from a flat `heldItems: OfferedItem[]` list into two fixed-size, index-addressable collections (`board`, `storage`) so each visual slot is a stable drag target — a deliberate revision of `002-item-slots`'s "flat list, no per-slot identity" decision, justified by this feature's need for concrete drop targets. Storage items are inert by default (`resultingTime` only sums board items plus any storage item flagged `activeWhileStored`); one new item in the pool carries that flag. Two non-item controls — **Next** (advances the round) and **Refresh** (rerolls the current offer, one use per round) — replace the implicit "accept/decline immediately advances" behavior from 002/003 with an explicit decouple of "decide" from "move on."

## Technical Context

Unchanged from `003-item-pool-draft` except where noted below.

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged). This feature is the first to lean on Phaser's native input drag/drop-zone system (`setInteractive({ draggable: true })`, `input.on('drag'/'dragend', ...)`, drop zones) rather than the simple `pointerdown` button pattern used in 001-003 — no new package dependency, just a different part of the existing Phaser API surface.

**Storage**: N/A — still no backend; item pool and ghost remain static content bundled with the client.

**Testing**: Vitest, strict TDD for `src/simulation/` — now also covering a new `storage.ts` module alongside modified `slots.ts`/`build.ts`/`contest.ts`. `PrepareScene`'s drag-and-drop rendering stays presentation-layer (lightly/manually tested), per the constitution's simulation-only strict-TDD decision, unchanged since 001.

**Target Platform**: Web (unchanged). Desktop mouse-driven drag-and-drop is the target interaction (spec Assumptions) — touch/mobile drag nuances are out of scope, consistent with mobile-via-Capacitor remaining an untouched later milestone.

**Project Type**: Single-project web game client (unchanged) — this feature modifies existing simulation/content/scene files more than it adds new ones.

**Performance Goals**: Unchanged — board/storage moves and contest resolution are synchronous and effectively instant; no new performance profile.

**Constraints**:
- All constraints from `003-item-pool-draft`'s plan carry forward unchanged (no live multiplayer, no player input during a contest, no purchasable outcome-affecting content, framework-free simulation core, internal time-series retained, identity/draft/buff mechanics from 003 untouched).
- New: `Build.board` and `Build.storage` MUST be fixed-length arrays of `OfferedItem | null` (not compact lists) so each visual slot has stable positional identity for drag targets — see research.md for why 002's original flat-list decision doesn't hold once a real board exists.
- New: `resultingTime` MUST compute its input item set as board items **union** storage items flagged `activeWhileStored` — an inert storage item MUST be excluded entirely from that computation, not merely zero-weighted, so `applyBuffs`'s order-independence guarantee (002/003) still holds over exactly the active set.
- New: Refresh's one-per-round allowance is prepare-flow bookkeeping (scene-level state), not part of `Build` — mirroring how `round` itself was never part of `Build` in 001-003.
- New: Drag-and-drop uses Phaser's native drag/drop-zone events rather than a custom pointer-tracking implementation.

**Scale/Scope**: Unchanged solo/small-team scope. Board and storage are each `SLOT_CAPACITY`-sized (currently 3, kept equal per spec Clarifications); one pool item is flagged `activeWhileStored` as an illustrative example. No shop economy, currency, or run/encounter structure is introduced — Refresh is a free, per-round action, not a purchase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Every board/storage move, Next, and Refresh action happens during prepare; the contest itself still resolves once, with no input surface, unchanged from 001-003. |
| II. Fairness | PASS | No monetization; Refresh is free and unlimited-per-round-reset, not a purchase — nothing to violate. |
| III. Transparency & Legibility | PASS | Board/storage show fixed capacity and contents (US1); active-while-stored items are visibly distinguished from inert ones (FR-013); Refresh availability is visibly shown (FR-015) — no hidden state. |
| IV. Spectation-First | DEFERRED, not violated | Still no live/broadcast presentation, carried from 001-003's deferral — unchanged. |
| V. Build Testing Access as Core | DEFERRED, not violated | Still no retesting/"test day" mechanic — unchanged. |
| VI. Async-First Architecture | PASS | Still one fixed sample ghost, no live opponent. |
| Product Constraints — Visual medium | PASS | Still Phaser 2D — this feature is a direct step toward a more game-like presentation, not a departure from the 2D commitment. |
| Product Constraints — Spec series | PASS | Board and storage capacities remain flat and identical for every team; no identity-based capacity variance introduced. |
| Development Workflow | PASS | Small vertical slice; Refresh was deliberately kept free/unlimited-per-round rather than becoming a currency-gated shop mechanic, so this feature doesn't quietly absorb the still-undesigned run/encounter/shop-economy system (spec Assumptions, `specs/DEFERRED.md`). |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract confirm the board/storage migration and active-item computation are both pure, order-independent, and contained entirely within `src/simulation/` — no live-input surface or hidden state is introduced. Table above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/004-board-storage-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

This feature **modifies** most existing simulation/content/scene files (a `Build`-shape migration, like 002's own item-slots migration) and adds one new pure simulation module. Existing files are marked (MODIFIED) or (unchanged); new files are marked (NEW).

```text
src/
├── simulation/
│   ├── types.ts           (MODIFIED) — Build becomes {car, board: (OfferedItem|null)[], storage: (OfferedItem|null)[]}; OfferedItem gains activeWhileStored?: boolean; new STORAGE_CAPACITY constant (= SLOT_CAPACITY); ContestResult gains board/storage (replacing heldItems)
│   ├── slots.ts           (MODIFIED) — hasOpenSlot/evictAndAdd adapt to the new board array; addItem gains an explicit target board index (positional placement, research.md)
│   ├── storage.ts         (NEW) — hasOpenStorageSlot, moveToStorage, moveToBoard, swapBoardStorage; strict TDD, same standard as slots.ts
│   ├── build.ts           (MODIFIED) — resultingTime computes its item set as board ∪ activeWhileStored-flagged storage, then applies buffs.ts and sums, same as before
│   ├── buffs.ts           (unchanged) — already operates on a flat item list; fed a different list now, no internal change
│   ├── draft.ts           (unchanged) — drawItem is agnostic to board/storage placement
│   └── contest.ts         (MODIFIED) — resolveContest's ContestResult now echoes board/storage separately instead of a single heldItems list
├── content/
│   └── sample-data.ts     (MODIFIED) — one pool item gains activeWhileStored: true (the "Tyre Rack" example from Clarifications)
├── scenes/
│   ├── PrepareScene.ts     (MODIFIED, substantial) — board/storage rendered as fixed visual slot grids; drag-and-drop replaces item-action buttons; new Next/Refresh/storage-toggle controls; refresh-used-this-round tracked as scene state
│   ├── ResultScene.ts      (MODIFIED) — shows board and storage sections separately, distinguishing active-while-stored items
│   ├── resultFormatting.ts (MODIFIED) — heldItemsLabel split into boardItemsLabel/storageItemsLabel (or equivalent), showing active-while-stored distinction
│   └── ContestScene.ts     (unchanged) — passes the final Build through, agnostic to its internal board/storage split
└── main.ts                 (unchanged)

tests/
├── unit/
│   ├── storage.test.ts     (NEW) — strict TDD against src/simulation/storage.ts
│   ├── slots.test.ts       (MODIFIED) — updated for the new board-array Build shape and addItem's index parameter
│   ├── contest.test.ts     (MODIFIED) — extended for storage-aware outcome computation (inert vs. activeWhileStored)
│   ├── draft.test.ts       (unchanged)
│   ├── buffs.test.ts       (unchanged)
│   └── item-pool.test.ts   (MODIFIED) — asserts the pool includes the activeWhileStored item (mirrors 003's buff-item invariant)
└── integration/
    └── result-scene.test.ts (MODIFIED) — board/storage sections and active-while-stored display
```

**Structure Decision**: Board↔storage movement rules get their own framework-free module (`src/simulation/storage.ts`), held to the same strict-TDD standard as `slots.ts`, rather than folding them into `PrepareScene` or overloading `slots.ts` with a second, differently-shaped concern. `slots.ts` keeps its existing name/contracts (`hasOpenSlot`, `evictAndAdd`) since board-fill/eviction rules are otherwise unchanged from 002 — only `addItem`'s signature grows an explicit index, and only because positional drag-and-drop now exists.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
