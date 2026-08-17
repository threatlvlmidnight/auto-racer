# Quickstart: Feature 045 Verification

## Focused automated gates — DeepSeek

```sh
npm test -- tests/unit/tutorialPreference.test.ts \
  tests/unit/howToPlayPresentation.test.ts \
  tests/unit/installationPresentation.test.ts \
  tests/unit/regionalDemand.test.ts \
  tests/unit/regionalDemandPresentation.test.ts \
  tests/unit/playerFeatureVisibility.test.ts \
  tests/integration/how-to-play-flow.test.ts \
  tests/integration/contextual-help-flow.test.ts \
  tests/integration/acquisition-demand-flow.test.ts \
  tests/integration/improvised-visibility-flow.test.ts \
  tests/integration/test-day-visibility.test.ts \
  tests/integration/test-day-flow.test.ts \
  tests/integration/test-day-boundaries.test.ts
node scripts/audit-regional-demand.mjs
```

Then run:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run build:pages
```

## Required automated evidence

- Ten stable slides and no Test Day copy/reference.
- First-run routing, Skip from pages 1–10, Finish, completed/skipped preference,
  invalid/unavailable storage, Title replay, and Settings replay.
- Zero run/offer/RNG/transaction mutation from deck or contextual Help.
- Feature 041/042 slide compatibility uses authoritative typed models.
- Large Improvised badge on every required compact surface; exact canonical
  details for consequential, no-additional-effect, Flex, and Adapted Mount cases.
- Seven regional profiles reproduce the ≥1,000-circuit/region corpus within ±1.
- Every acquisition host uses the same four-axis chart model.
- Missing/invalid region, next-race snapshot, and optional plate remain operable.
- Chart regions/cards/actions pass deterministic layout-bound assertions.
- Normal player control enumeration contains zero Test Day entries/shortcuts.
- All existing Test Day domain/scene suites remain present and passing.
- No image/audio/screenshot outputs were created or modified by DeepSeek.

## Optional asset lane — not DeepSeek

If desired, a frontier model/tool may create and approve the decorative plate
defined in `optional-demand-plate.md`. The code gate does not wait for it.

## Manual gate — frontier model or owner only

After automated success, review the deck, Improvised badge, regional chart,
optional plate/fallback, Settings replay, contextual return, and Test Day absence
at supported viewports and with pointer/keyboard/touch-equivalent, monochrome,
reduced motion, and no-hover use. Run the comprehension check from SC-003.

Record build/commit, route/seed, viewport, input mode, optional-asset state,
findings, and pass/fail. DeepSeek must leave this gate open and must not capture
or compare screenshots.

