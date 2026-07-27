# Quickstart: Lap-Tick Race Simulation (No Visuals)

A runnable guide to validate this feature end to end once implemented. Not a tutorial and not implementation code — see `tasks.md` (Phase 2) for that. This feature has **no visual component** — every scenario below is validated through the test suite or direct inspection of a `ContestResult`, not by playing the game.

## Prerequisites

- Node.js (LTS) and npm installed.
- `004-board-storage-ui` already implemented (this feature migrates its `SpecCar`/`SampleGhost`/`OfferedItem`/`ContestResult` shapes rather than starting fresh).

## Setup

```bash
npm install
```

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering `contest.ts`, `build.ts`, `slots.ts`, `storage.ts`, `draft.ts`, the rewritten `buffs.ts`, and the new `laps.ts` — with no browser/canvas required (contracts/simulation-contract.md's invariants are what these tests check first, per strict TDD).

## Run the game locally (regression check only)

```bash
npm run dev
```

The game should still run start-to-finish exactly as before (prepare phase, board/storage, contest, result screen) — this feature changes *how* the contest result is computed internally, not anything visible. If anything looks different on screen, that's a regression, not an intended change (FR-014).

## Manual validation scenarios

Each maps to an acceptance scenario in `spec.md`. Since there's no UI for this feature, "manual validation" here means inspecting test output or a scratch script's console output, not clicking through the game.

1. **A contest resolves as discrete laps** (User Story 1)
   Resolve a contest for an empty build → confirm the result's `laps` array has exactly `LAP_COUNT` (10) entries, each with the car's unmodified `baseLapTime`, and the final outcome matches the existing win/loss/tie rule against the ghost's total (FR-001, FR-009, SC-001).

2. **Direct items recur on their cooldown** (User Story 2, AC1-2)
   Hold one item with cooldown 1 and one with cooldown 3 → confirm the cooldown-1 item appears in `firedItemIds` on every lap, and the cooldown-3 item appears only on laps 1, 4, 7, 10 (FR-003, SC-002).

3. **Flat buffs are constant; stacking buffs grow and never shrink** (User Story 2, AC3-4)
   Hold a flat buff and a matching-tag direct item → confirm the boost is identical on lap 1 and lap 10. Separately, hold a stacking buff and a matching-tag item → confirm the cumulative boost increases by the same fixed increment each time the buff fires, and never decreases between firings (FR-005, FR-006, SC-007).

4. **Buffs with no matching item are inert** (User Story 2, AC5)
   Hold a buff item (flat or stacking) with no other active item sharing its tag → confirm it has no observable effect on any lap.

5. **The lap-time floor holds under aggressive stacking** (User Story 2, AC6)
   Construct a build combining enough recurring/stacking effects to drive a lap's raw computed time to zero or below → confirm the reported lap time is clamped to the minimum floor instead (FR-016, SC-008).

6. **The ghost is a constant-pace control car** (User Story 3)
   Inspect every `laps[i].ghostLapTime` in a resolved contest → confirm they're all identical to `SAMPLE_GHOST.lapTime`, and that `ghostTime` equals `lapTime × LAP_COUNT` exactly (FR-008, FR-009, SC-003).

7. **The lap breakdown reconstructs the totals** (User Story 4)
   Sum `laps[].playerLapTime` and `laps[].ghostLapTime` independently → confirm both match the result's own `playerTime`/`ghostTime` exactly, for several different builds (FR-010, SC-004).

8. **Determinism and order-independence hold** (SC-005, SC-006, regression from 002-004)
   Resolve the same build/ghost twice → confirm byte-for-byte identical results. Resolve two builds holding the same final item set acquired in different orders → confirm identical outcomes.

9. **002-004 mechanics are unaffected** (Regression check, FR-015)
   Confirm slot capacity, eviction, identity-weighted draft, and board/storage movement all still pass their existing test suites unchanged.

## What this feature does *not* cover

Do not use this quickstart to validate: anything visual (no track, no cars, no animation — that's a separate future feature), lap count varying or scaling across a run, a richer ghost with its own recorded build/items, additional team identities, or the real run/encounter structure — all explicitly out of scope here (see `spec.md` Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`).
