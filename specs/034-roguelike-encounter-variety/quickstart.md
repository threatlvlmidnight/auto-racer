# Quickstart Validation: Roguelike Encounter Variety

## Prerequisites

Implement Feature 033 shared race-enrichment contracts first or reconcile its
retained overtake evidence before `Guarded`. Install existing dependencies with
`npm install` if needed.

## Automated validation

```bash
npm test
npm run lint
npm run build
```

Focused development runs:

```bash
npx vitest run tests/unit/itemInstances.test.ts tests/unit/statNormalization.test.ts
npx vitest run tests/unit/itemModifications.test.ts tests/unit/encounterCadence.test.ts
npx vitest run tests/unit/exhibition.test.ts tests/integration/encounter-variety-flow.test.ts
```

## Required deterministic scenarios

1. Generate all 20 choice stages for repeated seeds; verify no acquisition pair,
   two-stage selected-type cooldown, bounded fallback, and byte-stable replay.
2. Verify one Upgrade Workshop offer in global stages 1–20 and one in 21–40 when
   eligible, with optional decline and no forced upgrade.
3. Move, store, tier, race, replace, sell, exchange, and rebuild duplicate item
   instances; verify modification follows only the exact instance.
4. Confirm each Workshop Modification with before/after evidence; validate graft
   1:1 canonical points, Twin-Tuned signed contributions, Guarded once/race, and
   Adapted Mount placement behavior.
5. Impound an installed item, verify its slot is reserved, race with a concurrent
   Sponsor effect, and verify exact return plus independent exact-once settlement.
6. Resolve Exhibition scores 0–3 and verify matching reputation with unchanged
   Championship points, standings, rival records, and scored-race effects.
7. Exercise Privateer Exchange, Experimental Rebuild, Upgrade Workshop, and all
   unavailable/decline/stale paths; every failed confirmation must be atomic.
8. Trigger Tag Specialist with multiple qualifying tags, restock once, and verify
   three matching entries with exactly one modified item at normal price +2.
9. Run the normalized-stat corpus; the strongest/weakest one-point marginal
   improvements must differ by no more than 10% on the balanced reference corpus.
10. Audit every playable item for exact Fitted/Improvised preview and verify the
    authored contribution ledger matches pre-race, Test Day, live evidence, and
    Results.

## Owner acceptance

The owner performs browser visual acceptance. Implementation validation should
still cover keyboard/pointer/touch actions and supported viewport layout through
presentation-contract tests; this planning cycle does not require automated
visual screenshots.
