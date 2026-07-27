# Quickstart: Item Slots — Flat Cap with Evict-to-Add

A runnable guide to validate this feature end to end once implemented. Not a
tutorial and not implementation code — see `tasks.md` (Phase 2) for that.

## Prerequisites

- Node.js (LTS) and npm installed.
- `001-core-loop` already implemented (this feature migrates its `Build`
  model and scenes rather than starting fresh).

## Setup

```bash
npm install
```

## Run the game locally

```bash
npm run dev
```

Opens the Vite dev server; the prepare phase should now present 5 sequential
item offers (illustrative placeholder count, per Clarification Q2) before the
contest starts.

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering both
`contest.ts` and the new `slots.ts` — with no browser/canvas required
(contracts/simulation-contract.md's invariants are what these tests check
first, per strict TDD).

## Manual validation scenarios

Each maps to an acceptance scenario in `spec.md`.

1. **Fill every slot without eviction** (User Story 1, Scenarios 1-2)
   Launch the game → accept each of the first `SLOT_CAPACITY` (3) offered
   items in turn → confirm all 3 occupy the build with no eviction prompt at
   any point, and the held-items display grows by one each time (FR-002).

2. **Decline while slots remain open** (User Story 1, Scenario 3)
   Restart → decline an early offer while under capacity → confirm the build
   is unchanged and the next round's offer proceeds normally (FR-004).

3. **Evict to accept once full** (User Story 2, Scenario 1)
   Fill all 3 slots → on the 4th offer, choose to accept → confirm you're
   required to pick one currently-held item to give up, and the new item
   takes exactly that slot (FR-003). Confirm any held item can be chosen,
   including trying each of the 3 in separate runs, to check none is
   protected (FR-005, Scenario 3).

4. **Decline while full** (User Story 2, Scenario 2)
   Fill all 3 slots → on a later offer, decline → confirm the build is
   unchanged and no eviction occurred.

5. **Build state is legible at every point** (User Story 3)
   At each of the 5 rounds, confirm the currently-held items and remaining
   open slot count are both plainly visible without needing to infer state
   from prior actions (FR-006, SC-003).

6. **Order-independence check** (Success Criteria SC-004)
   Play once accepting items in order A, B, C (filling all 3 slots, no
   eviction needed). Play again reaching the same final 3 items via a
   different path (e.g., accept A, B, D, then evict D for C). Confirm both
   runs produce identical contest results against the sample ghost.

7. **No error at either boundary** (Success Criteria SC-001, Edge Cases)
   Confirm reaching a full build never errors, and confirm declining every
   single offer (ending with an empty build) is also accepted without error.

## What this feature does *not* cover

Do not use this quickstart to validate: identity-weighted drafting (which
items are offered based on team identity), item synergy, a real run/encounter
structure (shops, rewards, PvE, restocks, or how many rounds a real run has),
weight as a soft constraint, or any retesting/"test day" mechanic — all
explicitly out of scope here (see `spec.md` Assumptions and
`specs/DEFERRED.md`).
