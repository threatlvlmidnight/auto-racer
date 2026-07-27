# Quickstart: Race Visualizer — Watchable Contest Presentation

A runnable guide to validate this feature end to end once implemented. Not a tutorial and not implementation code — see `tasks.md` (Phase 2) for that. Unlike `005-lap-tick-simulation`, this feature has a real visual component — most scenarios here *are* meant to be watched, not just inspected via test output.

## Prerequisites

- Node.js (LTS) and npm installed.
- `005-lap-tick-simulation` already implemented (this feature consumes its `ContestResult.laps` and extends `LapBreakdown`).

## Setup

```bash
npm install
```

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering `contest.ts`, `build.ts`, `slots.ts`, `storage.ts`, `draft.ts`, `buffs.ts`, `laps.ts`, and the new `playback.ts` — with no browser/canvas required.

## Run the game locally

```bash
npm run dev
```

Play through the prepare phase to a contest and confirm:

1. **The race plays as a watched animation, not an instant jump** (User Story 1)
   Instead of landing on the result screen immediately, an animated race should play for a consistent ~20 seconds — both cars visibly complete 10 laps around an oval track (FR-001, FR-002, FR-004).

2. **Every race takes the same total time to watch** (User Story 1, SC-001)
   Play a few contests with very different builds → confirm each animation takes the same ~20-second total duration, regardless of how different the underlying times are.

3. **Pace visibly varies lap to lap** (User Story 1, SC-002)
   Build a run holding at least one item with a short cooldown and one with a longer cooldown → confirm the car's speed around the track visibly changes from lap to lap, not a constant pace.

4. **The winner finishes first, not simultaneously** (User Story 1, SC-005)
   Confirm the car with the lower total time crosses its 10th lap *before* the 20-second mark, and the loser finishes right at 20 seconds — they should never appear to arrive at exactly the same instant unless the contest is an exact tie.

5. **Board items flash on firing laps only** (User Story 2)
   Hold a direct item and a stacking buff with different cooldowns → confirm the player's board remains visible at the bottom and each item's slot flashes exactly on the laps it fires. Confirm a flat buff (if held) never flashes even though it's contributing every lap (FR-006, FR-007).

6. **Multiple same-lap firings are all shown** (User Story 2, AC4)
   Arrange a build where two items share a firing lap (e.g., both cooldown-1, or a coincidence of a cooldown-2 and cooldown-4 item on lap 5) → confirm both board slots flash simultaneously and neither event is dropped.

7. **The leader indicator is always accurate** (User Story 3)
   Watch the full animation → confirm the leader indicator names the correct car and shows a numeric gap at any point you check, updating immediately if the lead changes hands (FR-012, SC-006).

8. **The result screen is unaffected** (Regression, FR-013)
   Confirm `ResultScene` still shows exactly what it did before this feature — outcome banner, times, gap, board/storage lists — reached now after watching the animation instead of instantly.

9. **No input changes the outcome** (Constitution Principle I, FR-011)
   Try clicking/interacting during the animation → confirm nothing about the outcome, gap, or animation changes as a result.

## Manual validation via `simulation:log` (no visuals needed for data-level checks)

```bash
npm run simulation:log
```

Inspect `logs/simulation-result.json` → confirm `laps[].firedItems` now includes `contribution` values (not just ids), and that `timeline`/`TimelineFrame` no longer appears anywhere in the output.

## What this feature does *not* cover

Do not use this quickstart to validate: a skip/fast-forward control (explicitly deferred, `specs/DEFERRED.md`), track variety or corner geometry, a richer ghost with its own recorded build, additional team identities, or the real run/encounter structure — all explicitly out of scope here (see `spec.md` Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`).
