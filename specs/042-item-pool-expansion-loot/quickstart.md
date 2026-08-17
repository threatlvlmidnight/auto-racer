# Quickstart: Feature 042 Verification

## Automated focused gates — DeepSeek

```sh
npm test -- tests/unit/itemCatalogAudit.test.ts \
  tests/unit/itemPools.test.ts \
  tests/unit/draft.test.ts \
  tests/unit/itemMechanics.test.ts \
  tests/unit/economyItems.test.ts \
  tests/unit/itemInstances.test.ts \
  tests/unit/loot.test.ts \
  tests/unit/laps.test.ts \
  tests/unit/itemPresentation.test.ts \
  tests/unit/lootPresentation.test.ts \
  tests/integration/item-expansion-flow.test.ts \
  tests/integration/loot-acquisition-flow.test.ts \
  tests/integration/loot-sale-flow.test.ts \
  tests/integration/practice.test.ts \
  tests/integration/result-scene.test.ts
```

Then run:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run build:pages
```

DeepSeek records commands, exit status, catalog counts, seeded-corpus summary,
and balance-matrix summary here. It must not add screenshots or claim the
manual gate.

## Required automated evidence

- 70/70 baseline definitions pass truth audit after recorded repairs.
- Exactly 8 active and 4 Loot definitions are added.
- All visible reference offers contain distinct IDs.
- Normal entrant-origin corpora contain zero Loot.
- Explicit neutral corpora contain at most one Loot per offer.
- Standard/Notable/Rare availability orders correctly under the fixed seed set.
- All cooldown-stack and tier values pass 8/10/12/14/16-lap bounds.
- Held Loot produces deep-equal outcomes to an empty location.
- All target order, full-fit cap, stale/duplicate, transaction, Undo, and
  lifecycle fixtures pass.
- Test Day, scored contest, and Results reconcile the same Loot ledger.
- No image/audio files, generated assets, or screenshot outputs are changed.

## Manual gate — frontier model or owner only

After automated success, inspect representative desktop and narrow layouts for:

- normal character shops contain no Loot;
- neutral acquisition clearly distinguishes its optional Loot lane;
- rarity, tags, installed-count scope, exact shutoff, lap window, economy
  trigger, Fitted/Improvised behavior, and effective tier values are readable;
- Loot cards prominently say `LOOT`, inert while held, capacity cost, stat,
  tier magnitude, normal credit payout, selected target, and full-cap reason;
- sale confirmation and Undo feedback fit without overlap or hidden controls;
- current build, Pre-Race, Test Day, and Results attribute Loot points clearly;
- dense item text remains usable without hover and without relying on color.

Record the date, build/commit, route/seed, viewport, input method, findings, and
pass/fail disposition. This gate is `[MANUAL-FRONTIER-OR-OWNER]`; DeepSeek must
leave it open.

