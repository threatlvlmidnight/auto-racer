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

## Expected invariants

- Identical inputs produce byte-identical builds, laps, results, and run state.
- No scene imports or calls the simulation to manufacture display values.
- Aggregate deltas reconcile to feature 024 item evidence where available.
- Missing authority is labeled, never guessed.
