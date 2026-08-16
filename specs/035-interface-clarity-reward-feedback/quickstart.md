# Quickstart Validation: Interface Clarity and Reward Feedback

## Automated validation

Run the complete gate:

    npm test
    npm run lint
    npm run build

Focused presentation runs:

    npx vitest run tests/unit/circuitPresentation.test.ts tests/unit/cardFeedbackPresentation.test.ts tests/unit/itemPresentation.test.ts
    npx vitest run tests/integration/result-scene.test.ts tests/integration/run-flow.test.ts tests/integration/supplier-feedback.test.ts

## Required scenarios

1. Start Local and Championship races in two regions. Confirm each selection,
   briefing, playback, Result, and history identity agrees on track name and
   LOCATION.
2. Enter Test Day from setup. Confirm its borrowed track is labeled fixed and
   unscored, never presented as a scored geographic event.
3. Inspect installed configurable, stored configurable, and non-configurable
   items. Only an eligible installed item displays ADJUSTABLE and its shared
   setup control.
4. Inspect Standard, Notable, and Rare offers with color disabled. Confirm text,
   icon, frame, and accessibility label distinguish all three.
5. Purchase a duplicate upgrade and confirm eligibility before purchase, then
   the exact Feature 032 receipt and values after purchase. Repeat with reduced
   motion enabled.
6. At 1920×1080, 1366×768, 1024×768, and 800×450, exercise title, entrant,
   destination/run, supplier/reward, inventory, pre-race, race, Result, Test
   Day, and encounter scenes. Record the audit matrix in acceptance-evidence.md.

## Owner acceptance

Use pointer, touch, and keyboard paths. Record any layout failure with scene,
state, viewport, input mode, screenshot, and disposition. Route true host/reflow
work to Feature 026 rather than weakening this feature's acceptance criteria.

