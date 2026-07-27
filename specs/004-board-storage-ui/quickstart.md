# Quickstart: Board & Storage — Drag-and-Drop Prepare UI

A runnable guide to validate this feature end to end once implemented. Not a tutorial and not implementation code — see `tasks.md` (Phase 2) for that.

## Prerequisites

- Node.js (LTS) and npm installed.
- `003-item-pool-draft` already implemented (this feature extends its `OfferedItem`/`ITEM_POOL`/`PrepareScene` rather than starting fresh).

## Setup

```bash
npm install
```

## Run the game locally

```bash
npm run dev
```

Opens the Vite dev server; the prepare phase now shows a board (fixed slots) and a storage toggle, with drag-and-drop replacing the old Accept/Decline/Replace buttons, plus new Next and Refresh controls.

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering `contest.ts`, `build.ts`, `slots.ts`, `draft.ts`, `buffs.ts`, and the new `storage.ts` — with no browser/canvas required (contracts/simulation-contract.md's invariants are what these tests check first, per strict TDD).

## Manual validation scenarios

Each maps to an acceptance scenario in `spec.md`.

1. **Board and storage are distinct, visible areas** (User Story 1)
   Launch the prepare phase → confirm the board is visible by default showing `SLOT_CAPACITY` positions and their contents → click the storage control → confirm a separate storage region appears showing the same capacity (FR-001, FR-002, SC-001).

2. **Accept and evict via drag** (User Story 2, Scenarios 1-2)
   With an open board slot, drag the current offer onto it → confirm it's accepted immediately. Later, with a full board, drag an offer onto a held item → confirm that item is evicted and the offer takes its place immediately (FR-004).

3. **Decline via Next, without dragging** (User Story 2, Scenario 3)
   Leave an offer untouched → click Next → confirm the offer is declined, the build is unchanged, and the next round begins (FR-005).

4. **Next always advances** (User Story 3, Scenario 1)
   Whether or not you dragged the offer this round, click Next → confirm the round advances either way, preserving whatever board change (if any) already happened.

5. **Refresh rerolls without ending the round** (User Story 3, Scenarios 2-3)
   Without dragging anything, click Refresh → confirm a new offer appears, the round hasn't advanced, and the build is unchanged. Click Refresh again the same round → confirm nothing happens (FR-006, FR-007).

6. **Refresh resets every round** (User Story 3, Scenario 4)
   After using Refresh, click Next → confirm Refresh is available again on the new round, regardless of whether it was used the round before (SC-006).

7. **Board ↔ storage movement** (User Story 4, Scenarios 1-4)
   With a held board item and open storage, drag the board item into storage → confirm it moves out of the board. Drag it back onto an open board slot → confirm the reverse. Drag a stored item onto an *occupied* board slot → confirm the two items swap. Try dragging a board item into full storage → confirm nothing happens.

8. **Storage is inert by default, with one visible exception** (User Story 5, Scenarios 1-3)
   Hold an ordinary item in storage → confirm the contest outcome matches an otherwise-identical build with that slot empty. Hold the one `activeWhileStored` item in storage instead → confirm its effect shows up in the outcome anyway (SC-003). Confirm you can tell which is which just by looking (FR-013, SC-005).

9. **002/003 mechanics still hold** (Regression check)
   Confirm identity tags (003) and the buff item's tag-matching behavior (003) are unaffected by board/storage placement (except the one flagged exception item) — a buff item on the board still boosts matching-tag board items exactly as before.

10. **Determinism/order-independence still hold** (SC-004, regression)
    Reach the same final board+storage contents via two different paths in two separate runs → confirm both produce identical contest results against the sample ghost.

## What this feature does *not* cover

Do not use this quickstart to validate: additional team identities, richer item synergy beyond 003's one buff item, a shop economy/currency/restock system, item-granted bonus refreshes, per-lap/per-tick effects or item cooldowns, touch/mobile drag input, or a real run/encounter structure — all explicitly out of scope here (see `spec.md` Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`).
