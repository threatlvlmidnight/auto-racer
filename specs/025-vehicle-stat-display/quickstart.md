# Quickstart: Vehicle Stat Display

## Goal

Verify that one four-stat vocabulary explains the player's vehicle from build
decisions through recorded lap evidence without changing gameplay outcomes.

## Verification flow

1. Open a preparation encounter with an empty build. Confirm all four current
   values equal stock and show zero change.
2. Install representative direct, tradeoff, tiered, Fitted, Flexible,
   Improvised, active-storage, and inert-storage items. Confirm current totals
   update and reconcile to item details.
3. Add track-, segment-, or lap-conditional items. Confirm their potential is
   labeled separately and not included in the unconditional total.
4. Preview matching, Flex, mismatched, storage, occupied, swap, replacement,
   eviction, and tier-up destinations. Confirm prospective totals match the
   noncommitting authoritative prospective build. Cancel and verify no mutation.
5. Run a track-aware race with a flat item, conditional item, and stacking
   stat-targeted Buff. At each player lap boundary, confirm all four values
   equal `PlayerLap.physics.stats` and changed sources reconcile to recorded
   contribution evidence.
6. Inspect a completed lap and Results. Confirm both views use the same lap and
   evidence context.
7. Open current Test Day surfaces. Where track-aware evidence is unavailable,
   confirm the panel says so rather than showing stock or stale values.
8. Repeat supporting-detail access with mouse, touch, and keyboard. Check all
   supported viewports, monochrome, and reduced motion.

## Automated checks

```sh
npm test
npm run lint
npm run build
```

## Confirmed feature-024 imports (T001)

`src/scenes/itemPresentation.ts` exports the authoritative physical-stat
vocabulary this feature reuses without redefinition:

- `ITEM_STAT_ORDER`, `statDefinition(stat)`, `formatStatDelta(stat, value, opts)`
- `ItemStatKey` (= simulation `StatTarget`)

`src/simulation/tracks.ts` exports the stock baseline:

- `STOCK_PHYSICAL_STATS`, `PhysicalStats`

`src/simulation/laps.ts` exports the current-build resolution authority added
for this feature (mirrors `resolvePhysicalStats`'s per-lap formula without
duplicating it — see data-model.md):

- `resolvePhysicalStats(activeItems, boostsByStat)` (now exported)
- `resolveCurrentBuildPhysicalStats(build)` → `CurrentBuildPhysicalStatsResult`
  `{ stats, contributions, conditionalPotential }`

## Consumer inventory (T002)

| Surface | Build/lap evidence source | Notes |
| --- | --- | --- |
| `PrepareScene.ts` (Reward Draft, Parts Supplier, garage) | `context.build` (current), `previewGarageCommand` (prospective) | US1/US2 |
| `ContestScene.ts` | inspected `PlayerLap.physics` | US3, player-first |
| `ResultScene.ts` | completed-run `PlayerLap.physics` | US3, same lap/context as inspector |
| `TestDayScene.ts` | Test Day run laps — may lack `physics` | US3 unavailable-ceiling case |
| `PracticeContestScene.ts` / `PracticeResultScene.ts` | practice run laps | same vocabulary, no ranked stakes |

## Expected invariants

- Identical inputs produce byte-identical builds, laps, results, and run state.
- No scene imports or calls the simulation to manufacture display values.
- Aggregate deltas reconcile to feature 024 item evidence where available.
- Missing authority is labeled, never guessed.

## Completion evidence

- `npm test`: 797 passed (0 failed), including 29 tests in
  `tests/unit/vehicleStatPresentation.test.ts` (US1-US4 + catalog-wide
  reconciliation for all 70 items, both installed and stored), 5 layout tests
  in `tests/unit/vehicleStatVisuals.test.ts` across all five supported
  viewports, and the cross-screen vocabulary-parity test added to
  `tests/integration/result-scene.test.ts`.
- `npm run lint` / `npm run build`: clean.
- Manual browser verification (dev server, real click-through, not just unit
  tests): empty-build stock display, item-install delta, live placement
  preview (hover a destination → `PREVIEW` line with prospective totals →
  commit → reverts to plain current line), a real 10-lap PvP race showing the
  player's lap-effective stats and the installed item's contribution, the
  Test Day briefing's current-build panel, and both Practice scenes' honest
  "no track-aware physical-stat evidence" state. `ResultScene`'s panel was
  verified by type-check + unit tests + code review only — a live 10-lap
  race runs in real time in this environment and was impractical to sit
  through for a second scene reusing an already-verified renderer/model pair.
- One scoped deviation from the literal contract, recorded in
  `specs/DEFERRED.md`: Reward Draft/Parts Supplier use a compact single-line
  readout (same model, different chrome) instead of the full tile panel,
  because those screens have no free vertical band for it without shrinking
  already-tuned layouts — deferred to feature 026's responsive frame, which
  contract §6 already names as the owner of viewport reflow work.
