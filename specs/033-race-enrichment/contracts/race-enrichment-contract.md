# Race Enrichment Contract

## 1. Authority

Only pre-playback contest resolution may create or change enrichment events,
temporary timing/stat effects, Composure spends, incidents, or passes. Phaser
scenes and playback controllers read retained evidence and have no outcome authority.

## 2. Input identity

The authoritative input includes committed participant builds/setups, exact
track, lap count, entrant/profile identities, contest seed/identity, stable
roster order, and validated enrichment configuration. Equal input produces equal
phase schedules, events, lap times, ranks, and settlement.

## 3. Shared phases

Every participant uses the same phase schedule. Identity, items, and setup may
change behavior inside a phase but cannot move its boundaries for one car.

## 4. Identity and eligibility

Passives apply even below the active threshold. Active signature eligibility is
`resolved relevant stat >= configured threshold`. Every legal contribution counts
regardless of item origin. Eligibility alone does not activate a signature.

## 5. Composure

Composure is finite, race-local, non-replenishing, and economic-state neutral.
Every debit is atomic and evidenced. An unaffordable action is skipped without a
partial debit. Stable event priority decides simultaneous claims.

## 6. Passing

A completed pass requires a valid authoritative action window, configured
proximity, sufficient projected advantage, resolved attack/defense, and retained
before/after position evidence. Visual marker overlap is never passing evidence.

## 7. Incidents

When disabled, incident rules emit no event and apply no loss. When enabled, an
incident may apply only a configured bounded race-time loss. Its deterministic
stream is isolated. No persistent state or economy consequence is legal.

## 8. Event order

Events order by authoritative boundary, documented kind priority, and stable
roster/tie order. The same interval always yields the same event sequence.

## 9. Playback

New `1x` uses the legacy schedule rate; new `2x` uses twice that rate. Skip,
reduced motion, frame delay, and emphasis duration do not alter event identity,
order, or settlement. Every boundary is consumed exactly once.

## 10. Presentation

Full emphasis is limited to player signature activation, decisive player Final
Push overtake, and player incident. All information remains available in static
or compact form. Missing optional assets fall back without blocking navigation.

## 11. Results and testing

Results reads the retained event log and never recomputes it. Test Day uses the
same resolver and evidence without scored settlement. Corpus gates and every
balance lever are configuration-driven and reproducible.

## 12. Audio presentation

Engine and UI audio are optional presentation consumers. One engine loop may be
owned by an active scored/Test Day playback scene and must be cleaned up on
pause, Skip, finish, shutdown, or visibility loss. Shared semantic UI actions
emit at most one cue. Mute, browser rejection, missing assets, and playback-rate
changes cannot alter schedule time, events, navigation, result, or settlement.
Background music is outside this contract.

## 13. Circuit geometry and braking demand

Track generation is deterministic from seed, race ordinal, and region and uses
bounded candidate attempts. The accepted authoritative circuit must be closed,
in bounds, non-self-intersecting, sufficiently separated, and valid for the
documented segment/radius limits. Stable feature and braking-zone identities are
derived once from that geometry. Preparation, Test Day, contest physics,
playback, Results, run history, and async viewers consume the same track object.

Production braking demand is the aggregate of retained approach/severity/speed-
reduction evidence and must be positive. Rendering may smooth the retained
sampled centerline, but may not reconstruct a different polygon or infer
physics from screen coordinates.
