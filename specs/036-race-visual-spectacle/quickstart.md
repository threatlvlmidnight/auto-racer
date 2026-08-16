# Quickstart: Verify Race Visual Spectacle

## Prerequisites

Run commands from `/Users/micah/Documents/repos/auto-racer` with the normal
project dependencies installed. Feature 033 retained event evidence must be
available before integrating PiP behavior.

## Focused checks

```sh
npm test -- --run tests/unit/raceSpectaclePresentation.test.ts tests/unit/raceVisualProfiles.test.ts
npm test -- --run tests/integration/race-spectacle.test.ts
npm run lint
npm run typecheck
npm run build
```

## Manual race matrix

1. Start a retained 8-car race for each of the four player entrants. Confirm
   the main view remains wide top-down, every car has a non-color identity, and
   the player vehicle matches garage identity without implying stat changes.
   Confirm `vehicle-asset-manifest.md` records all four loaded art files and
   their provenance.
2. Use fixtures for 8, 10, 12, 14, and 16 laps. Confirm selected PiP counts
   are capped at 2, 2, 3, 4, and 4 respectively; eventless races show no empty
   panel.
3. Use player signature, completed pass, defense, incident, rival-only, and
   simultaneous-event fixtures. Confirm PiP content is retained evidence only,
   rival-only events stay in the normal broadcast, and a conflict follows the
   deterministic suppression policy.
4. Change selected focus between named cars before and during an eligible
   moment. The event temporarily replaces the window, then the selected car
   returns; neither choice changes standings, timing, or result.
5. Repeat at 1× and 2×, with reduced motion, and with an optional profile/PiP
   texture disabled. Confirm controls, textual event meaning, skip/results, and
   final order remain available and match the baseline retained result.
