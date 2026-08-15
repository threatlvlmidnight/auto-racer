# Quickstart: Demo Feedback Bug Pass

## Implementation sequence

1. Add failing pure tests for the catalog audit, live evidence, economy
   transactions, podium settlement, W/L projection, supplier receipts, and Undo.
2. Implement consequential simulation/content changes until those tests pass.
3. Add failing presentation-model tests for stats, tags, upgrades, inventory,
   transactions, and chrome regions.
4. Integrate scenes one surface at a time, retaining existing commands and host
   context.
5. Run balance fixtures before and after each pool tuning change; preserve Nell
   and baseline stat snapshots.
6. Crop/map the approved sheet only after region metadata tests exist; integrate
   championship indicators, pre-race controls, then shared buttons.

## Focused verification

```bash
npm test -- --run tests/unit/liveStatPresentation.test.ts
npm test -- --run tests/unit/economyItems.test.ts
npm test -- --run tests/unit/inventoryPresentation.test.ts
npm test -- --run tests/unit/balance.test.ts
npm test -- --run tests/integration/demo-regressions.test.ts
```

## Full gate

```bash
npm test
npm run lint
npm run build
npm run build:pages
```

## Manual acceptance matrix

- Watch controlled direct, amplified, composition, fitted-value, and cooldown
  builds at `1×` and `2×`; reconcile every displayed change to result evidence.
- Inspect/pin every tag using pointer, touch emulation, and keyboard; verify all
  matching board/storage items highlight.
- Purchase, tier, restock, skip, move, sell, Undo, then transition; verify each
  mutation occurs once and stale Undo cannot restore.
- Open/close inventory from destination, acquisitions, pre-race, Results, and hub
  at wide and narrow safe bounds; verify exact context restoration.
- Resolve positions 1–8 across race kinds and reconcile wording, reputation,
  economy receipt, and final W/L.
- Review approved chrome at supported landscape viewports with normal, hover,
  focus, pressed, and disabled states; confirm items remain visually dominant.

## Asset source

- Transparent working master:
  `public/assets/ui/feature-032-controls-sheet.png`
- Preserved chroma source:
  `public/assets/ui/source/feature-032-controls-sheet-chroma.png`
- Do not generate the remaining decoration sheets until the first controls have
  passed in-game readability and nine-slice validation.
