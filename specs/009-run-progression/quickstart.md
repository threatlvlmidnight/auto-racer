# Quickstart: Validate Run Progression

## Prerequisites

- Node.js compatible with the repository's Vite 5/Vitest 2 toolchain
- Dependencies installed with `npm install`
- Feature 009 implementation completed from the later `tasks.md` phase

## Automated validation

```bash
npm test
npm run build
npm run lint
```

Expected: all existing simulation, storage, playback, and presentation tests
remain green; new run/encounter tests pass; TypeScript and ESLint report no
errors.

## Scenario 1: Complete the six-stage run

1. Run `npm run dev` and start a new run.
2. Confirm progress shows stage 1 of 6 and 5 credits.
3. At each choice stage, confirm two distinct non-PvP encounter types appear.
4. Complete four selected choice encounters and both scheduled PvP races.
5. Confirm PvP occurs only after choice stages 2 and 4, with 10 then 12 laps.
6. Inspect the final summary.

Expected: history contains exactly six chronological entries, both PvP outcomes
are visible, board/storage changes persist, and completed run actions are
disabled. Starting a new run resets history and credits to 5.

## Scenario 2: Reward Draft preserves acquisition rules

1. Enter Reward Draft from a choice pair.
2. Confirm three identity-weighted items are visible before any item is chosen.
3. Place one using board/storage rules, including eviction if full.
4. In another controlled run, decline all three.

Expected: encounter selection and item selection are separate; at most one item
is accepted; decline advances with an unchanged build; the next encounter sees
the exact resulting board/storage state.

## Scenario 3: Supplier economy and restock

1. Enter Parts Supplier with a controlled balance.
2. Confirm three chosen-identity-tagged items and authored prices from 2-5.
3. Buy affordable items and verify each purchase balance immediately.
4. Pay 1 credit to restock once.
5. Attempt a second restock and an unaffordable purchase, then leave.

Expected: only unpurchased stock is replaced; purchased slots stay empty; the
second restock and unaffordable purchase make no changes; credits never become
negative; all purchased placements persist.

Automated Supplier fixtures also cover one/two eligible definitions drawing
with replacement and a no-eligible-item payload that can be left unchanged.

## Scenario 4: Sponsor objectives

Use the deterministic unit fixtures from T037-T040 to exercise every objective
kind and both success/failure outcomes. In the browser, smoke-test whichever
stored Sponsor Meeting options the run naturally generates.

1. Confirm Sponsor Meeting shows immediate +2 and two distinct conditional
   7-credit objectives.
2. Select immediate payout and verify no contract remains.
3. In automated fixtures, accept win-next-race, target-time, and tagged-trigger.
4. Before PvP, confirm Sponsor Meeting is absent from random choices.
5. Complete the next PvP with success and failure fixtures.

Expected: target time is a stable displayed whole second 3-6 below baseline for
that race's lap count; tagged-trigger reports actual/10; each contract resolves
once, pays exactly 7 or 0, then Sponsor Meeting becomes eligible again.

## Scenario 5: PvP regression and payouts

1. Resolve a controlled build/ghost pair at 10 laps using the pre-feature
   expected fixture.
2. Resolve the same inputs again and compare every lap, firing event, total,
   gap, playback state, and result label.
3. Repeat at 12 laps and inspect the watched race/result view.
4. Verify participation and win/loss/tie payout cases.

Expected: identical inputs and lap count produce identical race data; 12 laps
adds only the two scheduled laps; presentation remains shipped behavior; payout
is +2 for participation and +2 more only for a win.

## Scenario 6: Exactly-once and unavailable-state guards

1. Dispatch the same encounter completion twice.
2. Dispatch a stale completion ID from a prior stage.
3. Attempt entry after run completion.
4. Open a run-dependent scene without valid run context.

Expected: no duplicate history, credits, sponsor payout, or skipped stage; a
completed run rejects entry; missing context displays unavailable/new-run
recovery instead of silently generating a different path.

## Scope checks

- No Build Testing Access interaction is partially represented in 009; it is
  named as the immediate follow-up feature.
- Rival Scouting, Scrutineering, Factory Development, and Privateer Exchange do
  not appear.
- No live race input, live opponents, new identity, capacity change, item
  upgrade/merge rule, persistence subsystem, monetization, or theme-wide content
  or art conversion is introduced.