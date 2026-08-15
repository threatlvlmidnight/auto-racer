# Internal Contract: Encounter Variety

## Generation

`generateEncounterPair(run, stage, definitions, rng) -> EncounterPairResult`
must be pure, bounded, deterministic, and return two retained legal instances or
a typed neutral fallback. It never mutates run state or consumes untracked RNG.

## Preview and confirmation

`previewEncounterAction(run, encounterId, action) -> ActionPreview` returns exact
costs, removals, additions, placement/stat/effect changes, reward/downside,
target/expiry, disabled reason, and a state fingerprint.

`confirmEncounterAction(run, preview) -> TransactionResult` returns either a new
run plus immutable history evidence or typed `stale`, `illegal`, `unavailable`,
or `already-settled` with the original run unchanged.

## Item identity and resolution

All garage APIs accept instance IDs. Definition IDs are insufficient mutation
targets. `resolveItemContributions(instance, placement, context)` emits separate
normalized contribution layers before physics adaptation.

## Pending effects

At most one unresolved Sponsor and one unresolved Scrutineering effect may exist.
Settlement is source-ID idempotent. Scrutineering reserves and restores its exact
slot/item; Test Day and Exhibition do not consume next-scored-race effects.

## Exhibition

`commitExhibitionTrial` retains inputs and objectives before entry.
`settleExhibitionTrial` consumes retained contest evidence, awards exactly one
reputation per completed objective, returns score 0–3, and cannot call normal
Championship standings/points/rival settlement.

## Presentation

Phaser scenes consume pure view models. Consequential text is available without
hover/color and includes item identity, tier, modification, fitted/improvised
effect, canonical stat deltas, price, state, and confirmation consequence.

## Determinism and compatibility

Named seed domains isolate encounter type, authored variant, stock, modification,
replacement, and objectives. Unknown versions or stale legacy structures return
typed recovery/unavailable states; no silent migration guesses are permitted.
