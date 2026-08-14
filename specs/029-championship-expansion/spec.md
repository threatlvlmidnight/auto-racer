# Feature Specification: World Championship Expansion

**Feature Branch**: `029-championship-expansion`  
**Created**: 2026-08-13  
**Status**: Clarified  
**Input**: Extend the championship into a meaningful world tour with regional
identity, lower-stakes local competition, asynchronous player races, and a
prestigious Paris finale.

## Clarifications

### Session 2026-08-13

- The championship is a five-leg world tour containing 40 stages: four selected
  regional legs followed by the fixed Paris International Exhibition finale.
- Each leg follows: Arrival encounter → Local Qualifier → preparation →
  Championship Race → preparation → Local Challenge → preparation →
  Championship Race.
- **Local Race** is the player-facing term for authored PvE. **Championship
  Race** is the player-facing term for asynchronous PvP; internal `pvp` labels
  must never leak into player copy.
- The selectable regions are British Isles, Continental Europe, North America,
  South America, Northern Europe, and Mediterranean & North Africa. The player
  chooses four progressively from deterministic pairs, then travels to Paris.
- Region changes presentation, local identity, and authored opponent tendencies
  only. It never changes hidden physics, player stats, item odds, reward tables,
  or economy rules.
- All races use the same setup, simulation, playback, and Results pipeline.
  PvE difficulty comes only from inspectable legal builds and setups.
- Each selectable region has seven persistent local teams; Paris has seven
  international exhibition teams. Launch therefore requires 49 PvE profiles.
- Local Qualifiers use 2–3 tier-1 occupied slots and Balanced setup. Local
  Challenges use 3–4 occupied slots, may use tier 2, and use a deterministic
  track-aware legal setup. PvE never uses tier 3.
- Local Race reputation by positions 1–8 is `+1,+1,0,0,0,-1,-1,-2`; purse is
  one participation credit plus one win credit. Championship Race reputation
  remains `+3,+2,+1,0,-1,-2,-3,-4`; purse remains two plus two.
- Interest accrues only after Championship Races. Local Race settlement does
  not pay interest, preventing twenty-race compounding from overwhelming the
  economy.
- Only ten Championship Races award standings points: `10,8,6,5,4,3,2,1`.
  Seven championship rival identities persist through the season; local teams
  never enter the standings.
- Standings ties resolve by most Championship Race wins, then most podiums,
  then best finish in the most recent Championship Race, then stable
  deterministic entrant order.
- If the player's raw points equal the highest points total after Championship
  Race nine, standings freeze and the final Paris race becomes an elite title
  challenge against the
  top seven eligible records for that exact track. Prototype gaps use visibly
  labeled deterministic exhibition ghosts. A win earns World Champion;
  positions 2–3 earn Podium; positions 4–8 earn Classified.
- Otherwise the final race is a normal points-paying Championship Race against
  the seven season rivals. Final standings rank 1 earns World Champion, ranks
  2–3 earn Podium, and ranks 4–8 earn Classified.
- Lap counts by leg, ordered Local Qualifier, Championship Race, Local
  Challenge, Championship Race, are: `8,10,8,10`; `8,10,10,12`;
  `10,12,10,12`; `10,14,12,14`; Paris `12,14,12,16`.
- Reputation starts at 12. The first arrival at zero activates one Last Chance
  per run; preparation may continue, but the next race must settle above zero.
  Failure to recover, ending at zero, or returning to zero after consuming Last
  Chance ends the run. Reputation has a floor of zero and no cap.
- Contracts explicitly targeting the next Championship Race skip Local Races.
  Race-agnostic objectives may progress in either race type and must say so.
- The hub is a world-map itinerary: selected route, visible locked Paris,
  inspectable completed-leg history, and an expanded eight-stage current leg.
- Seven approved regional race backgrounds live in
  `public/assets/backgrounds/regions` with neutral fallback and presentation-only
  `regionTheme` selection.
- Existing active runs using the old schedule are explicitly unavailable and
  must restart. Entrant unlocks and settings remain preserved; active run state
  is never silently migrated.

## User Scenarios & Testing

### User Story 1 — Travel through a full world championship (Priority: P1)

A player chooses four of six regional legs, develops a build across twenty
races and twenty preparation encounters, and concludes at Paris.

**Independent Test**: Complete a seeded run and verify four persistent
destination choices, the fixed eight-stage cadence in every leg, automatic
Paris travel, and completion only after stage 40 or explicit reputation failure.

**Acceptance Scenarios**:

1. A new run offers two deterministic regions after entrant selection and
   commits the chosen region only after confirmation.
2. Backing out preserves the same offered pair; completed regions are never
   offered again.
3. After four selected legs, Paris begins automatically as leg five.
4. Every successful run contains exactly 20 preparation outcomes and 20 race
   outcomes; the final stage is a Championship Race.

### User Story 2 — Understand Local and Championship competition (Priority: P1)

The player can immediately tell whether a race is lower-stakes authored local
competition or asynchronous championship competition.

**Acceptance Scenarios**:

1. Local and Championship labels appear consistently in hub, setup, results,
   history, contracts, and settlement explanations; `PvE` and `PvP` do not.
2. Local opponents expose legal builds and setup evidence and use no hidden
   pace modifier.
3. Local settlement uses its reduced reputation and purse tables, pays no
   interest, and awards no championship points.
4. A contract for the next Championship Race ignores intervening Local Races;
   race-agnostic objectives progress according to their disclosed wording.

### User Story 3 — Follow a meaningful championship table (Priority: P1)

Seven persistent rivals and the player accumulate points across ten
Championship Races, with deterministic classification and tie-breaking.

**Acceptance Scenarios**:

1. Every Championship Race awards `10,8,6,5,4,3,2,1`; Local Races award none.
2. Ties resolve by wins, podiums, most-recent Championship Race finish, then
   stable entrant order.
3. The same run seed and decisions reproduce rival evolution, results,
   standings, route offers, tracks, and local fields.
4. If not leading after race nine, the final points-paying race produces the
   final World Champion, Podium, or Classified outcome.

### User Story 4 — Earn and contest the elite Paris finale (Priority: P1)

A player leading after nine Championship Races faces the strongest eligible
recorded field for the exact Paris track without increasing the eight-car field.

**Acceptance Scenarios**:

1. Player points equal to the highest raw points total after race nine qualify,
   regardless of the secondary display tie-break order; a lower total receives
   the normal finale.
2. Qualification freezes standings and selects seven eligible exact-track
   records, filling shortages with visibly labeled deterministic exhibition
   ghosts.
3. Elite ghosts never enter standings and all eight cars use the same canonical
   setup/simulation/result rules.
4. Elite finishing position alone yields World Champion, Podium, or Classified.

### User Story 5 — Read the tour and regional identity (Priority: P2)

The hub presents the route as a legible world itinerary, while each race looks
appropriate to its region without changing mechanical integrity.

**Acceptance Scenarios**:

1. Paris is visible but locked from the beginning; completed legs open their
   histories; only the current leg expands into eight stages.
2. The shared header shows credits, reputation, championship points, leg, and
   stage at the 800×450 logical viewport without clipping.
3. Destination cards show theme, cadence, and broad engineering tendency but
   not exact tracks, builds, opponent stats, or predictions.
4. Missing regional art uses a neutral fallback while retaining canonical
   region, track geometry, characteristics, and result.

### User Story 6 — Survive one Last Chance (Priority: P1)

A player reaching zero reputation gets one clearly communicated opportunity to
recover in the next race, rather than suffering an abrupt first elimination.

**Acceptance Scenarios**:

1. New runs begin at 12 reputation and warn at four or less.
2. The first settlement at zero activates Last Chance; preparation can continue
   but the next race must finish settlement above zero.
3. Recovery permanently consumes Last Chance. Any later zero ends the run.
4. Remaining at zero after the recovery race, or completing Paris at zero,
   ends the run with an explicit explanation.

## Edge Cases

- A destination screen is revisited repeatedly: its pair and ordering remain
  unchanged until explicit confirmation.
- A regional backdrop fails to load: gameplay continues with neutral art.
- A local profile cannot form its preferred build: deterministic legal fallback
  fills within its allowed slot/tier band and is disclosed.
- Exact-track elite records include duplicates, invalid evidence, or the player:
  filter them before ranking and fill any shortage with exhibition ghosts.
- A sponsor penalty and race reputation change cross zero in one settlement:
  Last Chance evaluates the final settled reputation exactly once.
- A contract accepted before a Local Race still points to the next Championship
  Race, including the Paris finale.
- Old active championship state is detected: explain incompatibility and offer a
  new run without deleting persistent unlocks or settings.

## Requirements

- **FR-001**: New runs MUST contain five eight-stage legs and exactly 40 stages.
- **FR-002**: The first four legs MUST be unique player-selected regions from six
  deterministic two-card offers; leg five MUST be Paris.
- **FR-003**: Destination offers MUST be seed-derived, persistent, and committed
  only by explicit travel confirmation; destination selection is not a stage.
- **FR-004**: Every leg MUST use the locked Arrival/Local/prepare/Championship/
  prepare/Local/prepare/Championship cadence.
- **FR-005**: Preparation MUST use the existing two-choice encounter catalog;
  regional changes are flavor copy only.
- **FR-006**: All races MUST share one authoritative setup, simulation, playback,
  and Results pipeline with immutable per-car evidence.
- **FR-007**: Region MUST be presentation/content metadata only and MUST NOT be
  read as a simulation, player-stat, item-weight, reward, or economy modifier.
- **FR-008**: The system MUST provide 42 regional and seven Paris local profiles
  with deterministic legal Qualifier and Challenge builds.
- **FR-009**: PvE build bands MUST follow the clarified slot, tier, setup, and
  leg-scaling rules and MUST NOT use tier 3 or hidden pace modifiers.
- **FR-010**: Local and Championship settlement MUST use the clarified reputation
  and purse tables; interest MUST apply only after Championship Races.
- **FR-011**: Only Championship Races MUST award standings points using
  `10,8,6,5,4,3,2,1`.
- **FR-012**: Seven deterministic season rivals MUST persist and evolve across
  the first nine Championship Races and the normal finale.
- **FR-013**: Standings MUST use wins → podiums → most-recent Championship Race
  finish → stable entrant order as tie-breakers.
- **FR-014**: A player whose raw points equal the highest raw points total after
  race nine MUST receive the elite Paris finale regardless of secondary
  tie-break order; all players with a lower points total MUST receive the normal
  finale.
- **FR-015**: Elite selection MUST use seven valid exact-track records with
  deterministic labeled exhibition fallbacks and MUST freeze season standings.
- **FR-016**: Finale classification MUST follow the clarified normal-standings or
  elite-finishing-position rules.
- **FR-017**: Lap counts MUST exactly match the five clarified four-race arrays
  and MUST never exceed 16.
- **FR-018**: Player-facing copy MUST use Local Race and Championship Race, with
  explicit contract eligibility and no leaked internal PvE/PvP terminology.
- **FR-019**: Reputation MUST start at 12 and implement a single-use Last Chance
  after final settlement, a zero floor, no cap, and warning states.
- **FR-020**: The hub MUST render the selected route, locked Paris, completed-leg
  history access, current eight-stage leg, and shared resource/progress header.
- **FR-021**: The seven approved regional masters MUST use stable preload keys,
  crop-safe rendering, neutral fallback, and viewport QA.
- **FR-022**: Existing legacy active runs MUST be rejected explicitly rather than
  silently migrated; persistent unlocks and settings MUST remain intact.
- **FR-023**: All route, field, build, track, standings, settlement, and finale
  decisions MUST be deterministic for the same versioned seed and choices.

## Key Entities

- **World Tour**: Versioned five-leg route, run seed, offers, selected regions,
  current progress, history, reputation state, and standings.
- **Tour Leg**: One region and its authoritative eight-stage schedule.
- **Destination Offer**: Persistent ordered pair of eligible unvisited regions.
- **Race Classification**: Local Race or Championship Race rules and settlement.
- **Local Team Profile**: Authored identity plus deterministic legal build/setup
  tendencies and Qualifier/Challenge evolution.
- **Championship Rival**: Persistent standings identity with evolving canonical
  snapshots and Championship Race history.
- **Championship Standing**: Points, wins, podiums, recent finish, and stable
  order used for deterministic ranking.
- **Finale Mode**: Normal points-paying finale or standings-frozen elite title
  challenge with exact-track records and exhibition fallbacks.
- **Last Chance State**: Available, active, consumed, or failed reputation gate.
- **Region Theme**: Presentation-only art/dressing key retained with race data.

## Success Criteria

- **SC-001**: Every successful seeded run contains exactly 40 correctly ordered
  stages, four unique selected regions, and Paris as leg five.
- **SC-002**: All 20 races resolve through the same canonical contest pipeline;
  tests find zero region-dependent physics or hidden PvE pace modifiers.
- **SC-003**: 100% of Local and Championship settlements produce the specified
  reputation, purse, interest, points, and contract behavior.
- **SC-004**: Standings and finale qualification reproduce identically for the
  same versioned seed/evidence, including every tie-break level.
- **SC-005**: All 49 authored profiles produce valid, inspectable fields within
  their allowed slot, tier, setup, and evolution constraints.
- **SC-006**: The itinerary, destination choice, current leg, warnings, and
  histories remain usable without clipping at 800×450 and required responsive
  viewport checks.
- **SC-007**: No successful run can complete with fewer than 20 recorded race
  commitments and 20 recorded preparation decisions; observed wall-clock pacing
  is measured after feature 030 playback-speed controls land.
- **SC-008**: Focused and full regression suites contain no stale 12/24-stage,
  four/eight-race, immediate-zero-failure, or every-race-interest assumptions.

## Assumptions

- Real asynchronous infrastructure is out of scope; deterministic canonical
  rival snapshots and exhibition fallbacks preserve the future record contract.
- Feature 030 separately changes watched playback timing and speed controls.
- Regional portraits and a bespoke world-map bitmap are not required; existing
  portrait treatment and a code-rendered map may be used.
- Economy values are otherwise unchanged for the first full-tour playtest.
