# Implementation Plan: Item Pool Expansion and Loot

**Branch**: `042-item-pool-expansion-loot` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

## Summary

Repair the current 70-item catalog, retrofit at least 12 named definitions,
add eight active items and four inert Loot items, and make rarity/offer
selection truthful. Loot is excluded from every normal entrant-origin source
and appears only through an explicit neutral acquisition lane. Selling Loot is
a versioned extension of the normal atomic sale/Undo transaction: it pays
half-price credits plus eligible economy bonuses and grants +1/+2/+3 normalized
points to the deterministic leftmost full-fit target instance. Automated
catalog and seeded-corpus gates freeze the roster for later art production.
DeepSeek performs no art generation or manual screenshot review.

## Technical Context

**Language/Version**: TypeScript 5.5, ES modules  
**Primary Dependencies**: Phaser 3.80 presentation, Vite 5.4, existing
framework-free simulation/content modules; no new runtime dependency  
**Storage**: In-memory run/item-instance state and existing serializable run
snapshots; no database  
**Testing**: Vitest with strict test-first work for offer, tier, stat, transaction,
Undo, and determinism authority  
**Target Platform**: Browser game and GitHub Pages production build  
**Performance Goals**: Bounded catalog validation at load/test time; offer draw
is `O(pool × visible count)`; Loot preview is `O(held instances)`; no per-frame
catalog or target recomputation  
**Constraints**: Simulation remains Phaser-free; no item-ID mechanical branches;
canonical normalized points only; Loot absent from normal character shops;
Feature 041 adjacency is consumed, not redefined; no new image/audio assets;
manual qualitative verification is frontier/owner-only  
**Scale/Scope**: 70-item truth audit, 12 locked retrofits plus justified copy/tag
repairs, 8 active definitions, 4 Loot definitions, one neutral-only acquisition
source, reusable offer/mechanic primitives, atomic sale/Undo integration,
catalog/offer reports, and existing scene presentation extensions

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **I. Prepare → Contest Integrity**: PASS. Acquiring, arranging, and selling
  happen during preparation. Locked contests consume resolved item-instance
  ledgers and admit no new input.
- **II. Fairness**: PASS. All items are ordinary run content. No external
  purchase or entitlement affects availability or outcomes.
- **III. Transparency & Legibility**: PASS and load-bearing. Typed card facts,
  live conditions, exact Loot preview, cap reasons, credits, and retained stat
  attribution are mandatory.
- **IV. Spectation-First**: PASS. Result evidence attributes permanent points
  without introducing a playback mechanic.
- **V. Build Testing Access**: PASS. Test Day and scored contests consume the
  same normalized Loot/item authority.
- **VI. Async-First Architecture**: PASS. Rules, commands, receipts, and ledgers
  are versioned and deterministic; no live opponent or service is added.
- **Mechanical parity/topology**: PASS. Every entrant gains equal access to
  shared Loot through neutral sources; active expansion is two items per origin;
  total capacities and base vehicles do not change. Loot remains Power/Chassis,
  legal in all slots, and simply authors no installation behavior.
- **2D constraint**: PASS. Existing code-native card/panel surfaces are extended;
  later artwork is expressly outside this package.

**Post-design result**: All gates pass. Test-first is locked for every
simulation-facing task in this feature. No complexity exception is required.

## Project Structure

### Documentation

```text
specs/042-item-pool-expansion-loot/
├── analysis.md
├── catalog-plan.md
├── clarification-questionnaire.md
├── current-item-pool-review-2026-08-17.md
├── data-model.md
├── intake.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
├── tasks.md
├── checklists/requirements.md
└── contracts/
    ├── catalog-and-offer-contract.md
    └── loot-sale-contract.md
```

### Source and tests

```text
src/
├── content/
│   ├── items/{mercer,soto,rook,voss,loot}.ts
│   ├── itemTagRoles.ts
│   └── encounterVariants.ts
├── simulation/
│   ├── types.ts
│   ├── itemPools.ts
│   ├── draft.ts
│   ├── itemCatalogAudit.ts       # NEW
│   ├── itemMechanics.ts          # NEW reusable typed conditions/effects
│   ├── itemInstances.ts
│   ├── liveItemInstances.ts
│   ├── statNormalization.ts
│   ├── laps.ts
│   ├── garage.ts
│   ├── loot.ts                   # NEW preview/validation/settlement helpers
│   ├── encounters.ts
│   ├── encounterOffers.ts
│   ├── encounterCadence.ts
│   ├── run.ts
│   ├── practice.ts
│   └── contest.ts
└── scenes/
    ├── itemPresentation.ts
    ├── lootPresentation.ts       # NEW pure projection models
    ├── encounterPresentation.ts
    ├── RunScene.ts
    ├── PrepareScene.ts
    ├── PreRaceScene.ts
    ├── TestDayScene.ts
    └── ResultScene.ts

tests/
├── fixtures/item-catalog-fixtures.ts
├── unit/
│   ├── itemCatalogAudit.test.ts
│   ├── itemPools.test.ts
│   ├── draft.test.ts
│   ├── itemMechanics.test.ts
│   ├── economyItems.test.ts
│   ├── itemInstances.test.ts
│   ├── loot.test.ts
│   ├── laps.test.ts
│   ├── itemPresentation.test.ts
│   └── lootPresentation.test.ts
└── integration/
    ├── item-expansion-flow.test.ts
    ├── loot-acquisition-flow.test.ts
    ├── loot-sale-flow.test.ts
    ├── practice.test.ts
    └── result-scene.test.ts
```

## Implementation sequence

1. Freeze fixtures, tag roles, catalog ledger, validators, and failing baseline
   truth/audit tests.
2. Replace rarity/display-only and with-replacement behavior with the shared
   deterministic weighted-without-replacement sampler.
3. Add reusable typed economy, threshold, lap-window, installation, and Buff
   tier primitives; migrate hardcoded economy behavior.
4. Apply the 12 retrofit ledger entries and validate the complete baseline.
5. Author and validate the eight active definitions.
6. Add typed Loot definitions/pools and explicit neutral acquisition source,
   proving absence from normal entrant shops/drafts.
7. Add instance ledger, full-fit target preview, atomic sale/receipt/Undo, and
   lifecycle validation.
8. Integrate normalized stats, Test Day/scored contest evidence, and pure
   presentation projections.
9. Generate deterministic catalog/offer/balance evidence and run all automated
   gates.
10. Stop before qualitative browser verification or any artwork work.

## Complexity tracking

No constitutional violation or justified complexity exception.

