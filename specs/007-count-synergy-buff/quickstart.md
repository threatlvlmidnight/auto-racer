# Quickstart: Count-Synergy Buff — A Third Buff Kind

A runnable guide to validate this feature end to end once implemented. Not a tutorial and not implementation code — see `tasks.md` (Phase 2) for that. This feature has no visual component beyond one line of description text — most scenarios are validated through the test suite or direct inspection, not by watching the race.

## Prerequisites

- Node.js (LTS) and npm installed.
- `006-race-visualizer` already implemented (this feature extends `OfferedItem.buff`/`computeBoostsForLap`, which the visualizer's `contribution` pipeline already consumes unchanged).

## Setup

```bash
npm install
```

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering `contest.ts`, `build.ts`, `slots.ts`, `storage.ts`, `draft.ts`, `laps.ts`, `playback.ts`, and the extended `buffs.ts` — with no browser/canvas required.

## Manual validation via `simulation:log`

```bash
npm run simulation:log
```

Adjust the script's illustrative build to include the new count-synergy item alongside a few matching-tag direct items, then inspect `logs/simulation-result.json` → confirm `laps[].firedItems` shows the count-synergy item's `contribution` scaling with however many matching items the fixture build holds.

## Run the game locally (regression + display check)

```bash
npm run dev
```

1. **The mechanism works end to end** (User Story 1)
   Build a run holding the new count-synergy item and 2-3 matching-tag direct items (mixed board/storage) → play through to the result screen → confirm the outcome reflects a larger boost than an otherwise-identical build with fewer matching items (FR-003, SC-001).

2. **Zero matching items means no effect** (User Story 1, AC2)
   Hold only the count-synergy item, no other matching-tag items → confirm the result is identical to a build without the count-synergy item at all (FR-006, SC-002).

3. **Inert storage items still count** (User Story 1, AC3)
   Hold the count-synergy item and one matching-tag direct item active on the board, then move an *additional* matching-tag item into storage without flagging it active-while-stored → confirm the outcome changes compared to not holding that extra item at all (FR-004, SC-003).

4. **The buff must itself be active** (User Story 1, AC4)
   Move the count-synergy item itself into storage (not active-while-stored) while holding several matching-tag items → confirm it has no effect on the outcome (FR-005).

5. **The description reflects the real mechanism** (User Story 2)
   View the count-synergy item in the prepare-phase board/storage display or the result screen's item list → confirm its description reads as a per-item rate (e.g., "per Performance item held"), not a bare flat percentage (FR-009, SC-004).

## What this feature does *not* cover

Do not use this quickstart to validate: combining count-scaling with a cooldown/stacking (explicitly out of scope), specific item-to-item pairing synergy (the original, more ambitious `specs/DEFERRED.md` idea, still deferred), additional team identities, or the real run/encounter structure — all explicitly out of scope here (see `spec.md` Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`).
