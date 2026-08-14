# Contract: World Tour Boundaries

## Determinism

Given the same schedule/content version, seed, committed destinations, player
choices, and recorded ghost evidence, every offer, stage, track, local snapshot,
rival snapshot, settlement, standing, finale field, and classification is equal.

## Schedule

- Exactly five legs and 40 stages for a completed route.
- Four unique chosen regional legs; Paris fifth.
- Each leg uses the locked eight-stage cadence and lap table.
- Destination choice never advances stage history.

## Contest parity

Both race kinds emit the existing canonical eight-car contest input. No Local-
only timing multiplier or regional modifier is allowed. Each opponent carries a
legal build and locked setup evidence inspectable in Results.

## Settlement

- Local: rep `+1,+1,0,0,0,-1,-1,-2`, purse `1 + win 1`, no interest, no points.
- Championship: rep `+3,+2,+1,0,-1,-2,-3,-4`, purse `2 + win 2`, normal
  interest, points `10,8,6,5,4,3,2,1`.
- Apply sponsor effects before one final Last Chance evaluation.
- Next-Championship contracts ignore Local results.

## Standings and finale

Sort by points, wins, podiums, most-recent Championship finish, stable order.
Player raw points equal to the highest raw points total after race nine select
elite mode regardless of secondary display tie-break order and freeze standings.
Elite field validation excludes invalid, duplicate, and player records and fills
to seven with labeled deterministic exhibition ghosts.

Normal finale classification uses final standings rank: 1 World Champion, 2–3
Podium, and 4–8 Classified. Elite classification uses finishing position with
the same 1 / 2–3 / 4–8 category bands.

## Presentation isolation

`regionTheme` may select visuals and labels only. Failure to load art invokes a
neutral fallback without changing contest evidence. Player copy uses Local Race
and Championship Race, never PvE/PvP.

## Compatibility

Runs whose schedule version predates feature 029 are rejected with a restart
path. Persistent settings and unlocks are not cleared or rewritten.
