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

`npm run typecheck` is defined in `package.json` (`tsc --noEmit`) for feature 036
(T056); the production build runs the same check through `npm run build`.

## Automated review evidence (Phase 7 remediation — T057)

The post-implementation review gaps (T046–T053, T055) were closed and validated
automatically. Exact commands run from the repository root, all passing:

```sh
npm test -- --run tests/unit/raceSpectaclePresentation.test.ts tests/unit/raceVisualProfiles.test.ts tests/integration/race-spectacle.test.ts
npm test                # full suite: 128 files / all tests across the repo
npm run lint            # eslint: clean
npm run typecheck       # tsc --noEmit: clean
npm run build           # vite build + tsc --noEmit: success
```

Artifacts regenerated with distinct 88×50 silhouettes (nose toward +x) via
`node scripts/generate-race-vehicles.mjs`; `vehicle-asset-manifest.md` records
silhouette and forward orientation. Evidence recorded in `tasks.md`
(`[X]` T046–T053, T055–T057) and this quickstart. T044 remains the sole pending,
owner-led manual verification below.

## Manual race matrix

This matrix is the owner visual sign-off for Feature 036. Each row records
observations; mark the final "owner review" row below once a human has
verified the rendered race at runtime.

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

### Owner review sign-off (T044 — manual only)

**2026-08-17 result: FAILED.** The deployed-build review found an oversized,
flat track treatment; unreadable dense-field labels; and overlapping HUD,
focus/PiP, evidence, installed-card, and playback-control regions. See
`owner-qa-findings-2026-08-17.md`. Complete T058–T062 before repeating this
matrix.

- [ ] Artifacts: four bespoke player vehicles visible and distinguishable by
      number/pattern/label and silhouette; rivals identifiable without color.
- [ ] Circuit: layered top-down road/verge/start-finish matches the retained
      track and stays a stable wide view.
- [ ] PiP: exactly the selected player-involved moments appear, within budget,
      with retained driver/headline/consequence text; no fabricated panels.
- [ ] Focus: named-car selection survives cut-ins and returns to the selection.
- [ ] Resilience: reduced motion, missing-art, and both playback speeds keep
      controls and the retained result reachable and equivalent.

_Record any visual-only findings and re-run the focused checks above before
marking this feature ready for owner acceptance._
