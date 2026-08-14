# Contract: Pre-Race Setup

## 1. Eligibility

`deriveEligibleSetupControls(build)` returns Driver Aggression plus one entry per
unique `configurableSetup.family` found in installed vehicle slots. Storage is
ignored. Same-family source IDs are stable-sorted and magnitude equals source
count. The function is pure and does not read run, scene, or global state.

## 2. Position resolution

`resolveSetupDelta(family, position, magnitude)` returns the catalog delta
multiplied linearly by magnitude. Balanced is exactly all-zero. Low and high are
exact inverses. Unknown input returns a typed validation failure, never fallback.

## 3. Lock and validation

`lockRaceSetup(input)` validates the current build, track, encounter, eligible
families, selections, source IDs, and rules version, then returns a canonical
family-sorted selection set and summed delta. `validateLockedRaceSetup` can
reperform the same checks for ghost/replay input without trusting serialized
aggregate values.

## 4. Contest parity

For each car independently:

```text
validated build
  -> existing item/tier/installation/synergy/buff stat resolution
  -> add that car's validated LockedRaceSetup.totalDelta
  -> existing positive-stat clamp
  -> existing per-segment track physics
  -> immutable PlayerLap/CarResult evidence
```

No setup value is shared between cars. Identical build, track, setup, and rules
inputs produce deeply identical lap and contest evidence.

## 5. Legacy behavior

Missing setup is accepted only on explicitly legacy entry points/fixtures and
means all-zero behavior. New scored contests and new ghost records require
`race-setup-v1`. Balanced setup must preserve existing lap outputs exactly.

## 6. Generated rival adapter

`selectGeneratedRivalSetup(build, track, raceContext)` derives only legal
controls, enumerates all `3^N` legal position combinations, resolves the complete
race time for each by summing canonical `simulatePlayerLaps` output, and selects the lowest-time
combination. Exact time ties use canonical family order followed by `low`,
`balanced`, `high` position order. It delegates locking, validation, and lap
simulation to the same public functions used for player setup. It MUST NOT call
the N-car contest resolver recursively. The search is pure, contains no
randomness, and completes before playback.

## 7. Remember setup

Start Race updates run memory only when `enabled === true`. Memory is keyed by
family, never item. Initial selection uses remembered positions only for
currently eligible controls; otherwise Balanced. Dormant entries grant no
eligibility/effect and return when eligibility returns in the same run.

## 8. Test Day

Setup-origin Test Day receives the exact retained upcoming track and a temporary
locked setup. Practice applies it to the player through the same lap-stat fold,
does not update run memory or scored state, and restores draft selections,
checkbox, and focus on return.

## 9. Presentation boundary

The setup scene may receive player build, exact track, eligible controls, draft
selections, and remembered state. It must not receive or render scored opponent,
field, purse, sponsor, prediction, or odds presentation data. Start Race emits a
locked setup; it does not resolve math in the scene.

## 10. Result evidence

Results read `CarResult.setup` only. They list family label, position label,
source items, and exact applied signed deltas for each car. They never infer
setup from item names or regenerate it from current catalog content.
