# Quickstart: Item Stat Presentation

## Goal

Verify one visual and verbal item language from offer through placement, race,
result review, and Test Day without changing simulation or garage outcomes.

## Representative catalog set

Use at least one item for each shape:

1. One direct single-stat item.
2. One multi-stat tradeoff item.
3. One track-conditional item.
4. One flat stat-targeted Buff.
5. One stacking Buff with cooldown.
6. One count- or fitted-value-scaled Buff.
7. One exact-count or linear-per-count Synergy item.
8. One tier-two or tier-three held item.
9. One active-while-stored item and one inert stored item.
10. One economy-only/no-contest-effect placeholder if any remains in the catalog.

## Verification flow

1. Open Reward Draft and Parts Supplier.
   - Confirm all offer cards show identity, category/origin, consequential
     effects/tradeoffs, condition/target/scaling, and price where applicable.
   - Select each offer by click/tap and keyboard; selection opens the persistent
     inspector without accepting it.
   - Hover another offer, then exit; the inspector returns to the selection.

2. Preview placement.
   - Test matching, Flex, mismatched, storage, and occupied destinations.
   - Confirm Fitted/Flexible/Improvised/Stored behavior and incoming/outgoing
     comparison before commitment.
   - Repeat once with drag-and-drop and once with select-then-destination; the
     resulting authoritative build must be identical.
   - Cancel and make an invalid drop; neither may change the build.

3. Inspect held items.
   - Confirm tier-adjusted values are prominent and authored tier-one values are
     still labeled and reachable.
   - Confirm carried synergy tags and performed Synergy rules are separate.
   - Confirm satisfied/unsatisfied relationships match the current build.

4. Run a track-aware contest.
   - Inspect the same item during playback and on results.
   - Move between laps for conditional/stacking effects; confirm resolved state
     changes while identity and authored rules stay constant.
   - Confirm zero-contribution items remain present with a reason.
   - Confirm physical contribution lines reconcile from recorded per-item
     evidence; do not accept a presentation-side reconstruction.

5. Repeat through Test Day briefing, playback, and results.
   - Confirm the same item language and lap context are used.
   - Confirm physical-stat items say `Not evaluated in this Test Day` on the
     current legacy practice path rather than showing zero or estimated evidence.
   - Confirm scored-run state remains unchanged by Test Day.

6. Verify accessibility and responsive behavior.
   - Repeat required inspection and placement using keyboard only and touch only.
   - Run the integrated scene at the current 800×450 logical canvas.
   - Verify the pure layout model at 1920×1080, 1366×768, 1024×768, 800×450,
     and 390×844. Actual non-current canvas integration belongs to feature 026.
   - Confirm minimums of 10px compact text, 11px inspector text, 14px primary
     action labels, and 40×32 logical-pixel destinations on the current canvas.
   - Review without color and with reduced motion; no state may become ambiguous.

## Automated checks

```sh
npm test
npm run lint
npm run build
```

Feature 024 uses the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint
toolchain and adds no runtime dependency.

## Completion record

- The 70-item catalog sweep covers authored physical, conditional, time, Buff,
  Synergy, tier, storage, and economy-only states. The current catalog contains
  no economy-only placeholder; the formatter retains an explicit no-race-effect
  state for future content.
- Feature 025 can import `ITEM_STAT_ORDER`, `statDefinition`, and
  `formatStatDelta` from the Phaser-free presentation module without importing
  card or inspector renderers.
- The integrated runtime remains the 800×450 Phaser canvas. Wide and portrait
  modes are pure layout contracts for feature 026; full Phaser integration and
  the art-resolution pass remain intentionally deferred there.
- Automated completion run: 762 tests, ESLint, TypeScript, and production build
  pass. Vite continues to report the existing large-chunk advisory.

Catalog coverage tests should fail if a consequential `ItemDefinition` field is
not represented by the full inspector or if a compact card silently omits a
penalty, condition, target stat, scaling mode, or no-effect state.

## Expected invariants

- Identical run inputs still produce identical acquisition, garage, tier, race,
  and Test Day outputs.
- Scene renderers contain no independent item-rule formatting.
- Every screen derives accessible item text from the same pure model.
- Feature 025 may share stat definitions but remains the owner of aggregate
  vehicle stat panels.
