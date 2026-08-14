# Data Model: World Championship Expansion

## Enumerations

- `RegionId`: six selectable keys plus `paris-exhibition`.
- `RaceKind`: `local | championship` (internal only).
- `LocalRaceTier`: `qualifier | challenge`.
- `FinaleMode`: `normal | elite`.
- `LastChanceStatus`: `available | active | consumed | failed`.
- `StageKind`: existing encounter kinds plus `race`.

## WorldTourRun

- `scheduleVersion`
- `seed`, entrant/build/economy state
- `selectedRegions: RegionId[]` (0–4 selectable regions)
- `destinationOffer?: { transitionOrdinal, options: [RegionId, RegionId] }`
- `legs: TourLeg[]` (selected legs plus Paris when reached)
- `currentStageIndex` (0–39)
- `championshipRivals: ChampionshipRivalState[7]`
- `standings: StandingEntry[8]`
- `lastChanceStatus`, `reputation`
- existing remembered setup, sponsor, history, and inventory state

Invariant: an accepted run has the current schedule version; selected regions
are unique; Paris is only leg five; committed stages never change.

## TourLeg / TourStage

`TourLeg` holds ordinal, region, four lap counts, and eight ordered stages.
`TourStage` holds global/leg index, kind, optional encounter kind, and for races:
race kind, local tier where applicable, lap count, track fingerprint, and
presentation-only region theme.

## LocalTeamProfile / LocalSnapshot

Profile: stable ID, region, display identity, vehicle identity, tendency, and
deterministic authoring policy. Snapshot: stage/profile/version bindings,
canonical legal build, locked setup evidence, and provenance label. Snapshot
validation enforces occupied slots, tiers, and setup rules for its tier/leg.

## ChampionshipRivalState

Stable identity, stable ordering key, per-Championship-Race canonical snapshots,
finish history, points, wins, and podiums. Local results never mutate it.

## StandingEntry

Entrant ID, points, wins, podiums, recent Championship finish, and stable order.
Sort descending by points, wins, podiums; ascending by recent finish and stable
order. The elite qualification predicate runs after race nine against raw
points equality with the maximum points total, before secondary display
tie-breakers.

## RaceSettlement

Race kind, position, purse, reputation delta, sponsor delta, interest amount,
points, resulting reputation, Last Chance transition, and explicit explanation
tokens. Local settlement has zero points and zero interest.

## FinaleSelection

Mode, qualification evidence, frozen standings for elite mode, exact track
fingerprint, seven opponent records, and provenance per opponent (`recorded` or
`exhibition-fallback`). Elite classification uses player finish only.

## State Transitions

1. Run creation selects rivals and creates the first persistent offer.
2. Travel confirmation appends a leg; completing its eighth stage creates the
   next offer or appends Paris.
3. Race preparation locks a normal canonical eight-car contest input.
4. Result settlement mutates economy/reputation once; Championship results also
   mutate standings unless elite standings are frozen.
5. After Championship Race nine, derive finale mode exactly once.
6. Stage 40 settlement yields World Champion, Podium, Classified, or failure.
