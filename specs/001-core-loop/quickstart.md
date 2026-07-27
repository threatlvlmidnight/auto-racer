# Quickstart: Core Loop — Baseline Build vs. Sample Ghost

A runnable guide to validate this feature end to end once implemented. Not a
tutorial and not implementation code — see `tasks.md` (Phase 2) for that.

## Prerequisites

- Node.js (LTS) and npm installed.
- Repository cloned locally; this feature's code lives under `src/` per
  `plan.md`'s Project Structure.

## Setup

```bash
npm install
```

## Run the game locally

```bash
npm run dev
```

Opens the Vite dev server; the game should load in a browser tab.

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` with no browser/canvas
required (contracts/simulation-contract.md's invariants are what these tests
check first, per strict TDD).

## Manual validation scenarios

Each maps to an acceptance scenario in `spec.md`.

1. **Decline the item, race, see a result** (User Story 1, Scenario 1)
   Launch the game → decline the offered item → start the contest → confirm a
   result screen appears immediately, showing a win, loss, or tie with a final
   time. No waiting, no live-watched race (Clarification Q1).

2. **Accept the item, race, see a different result** (User Story 1, Scenario 2)
   Restart → accept the offered item → start the contest → confirm the result
   differs from Scenario 1's (unless the illustrative item happens to be
   balanced to zero effect — it shouldn't be, per data-model.md's
   `timeModifier`).

3. **No input possible once a contest starts** (User Story 1, Scenario 3)
   Confirm there's no button, key, or interaction exposed during contest
   resolution that could change the outcome — trivially true given instant
   computation (FR-010), but worth a deliberate check that no such control was
   accidentally left in the UI.

4. **Result is legible** (User Story 2)
   After either scenario above, confirm the result screen shows: your time, the
   ghost's time, the gap, and a qualitative comparison to the baseline (FR-006,
   FR-007) — without needing to read code or ask anyone what happened
   (Success Criteria SC-002).

5. **Consistency check** (Success Criteria SC-003)
   Run the same accept/decline choice against the sample ghost twice. Confirm
   the two results are identical.

## What this feature does *not* cover

Do not use this quickstart to validate: team identity, the draft/acquisition
system, a ladder, real player ghosts, live/broadcast-style presentation, or any
retesting/"test day" mechanic — all explicitly out of scope here (see
`spec.md` Assumptions and `specs/DEFERRED.md`).
