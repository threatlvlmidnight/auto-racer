# Feature Specification: Pre-Race Setup

**Feature Branch**: `028-pre-race-setup`

**Created**: 2026-08-13

**Status**: Clarified — ready for planning

**Input**: User description: "Fully spec and build the pre-race setup screen we discussed: preview the real upcoming track and allow a small amount of item-driven setup before the immutable race begins."

## Clarifications

### Session 2026-08-13

- Q: Does every car receive a setup control, or only cars with configurable
  items? → A: Every car receives exactly one basic driver-behavior slider.
  Driver Aggression is the chosen concept. All additional controls come only
  from installed configurable items.
- Q: What engine dimension does Driver Aggression control? → A: It is a
  deterministic pace-versus-control redistribution. Moving aggressive raises
  Acceleration and Top Speed while lowering Braking Power and Cornering Speed;
  moving conservative does the inverse. Balanced contributes no change. The
  tradeoff must be large enough to require a track-aware choice, must create no
  free total performance, and introduces no random crash/error roll.
- Q: How much resolution does the universal Driver Aggression slider need at
  launch? → A: Three snap positions only: Conservative, Balanced, and
  Aggressive. Conservative applies Acceleration −6, Top Speed −1, Braking Power
  +13, and Cornering Speed +1. Balanced applies zero. Aggressive applies the
  exact inverse. These are existing basic item-stat increments, not new units.
- Q: How many existing items should add equipment sliders? → A: The existing
  catalog must be reviewed during this feature and an intentional launch set
  selected; configurable coverage must not be determined accidentally by the
  first proof item. The clarification session selected seven items.
- Q: Should configurable-item coverage be evenly distributed by entrant? → A:
  No. Evelyn Mercer and Lucien Soto should each receive one configurable item.
  Inez Rook should receive several because experimental adjustability is part of
  her ecosystem, and one of her items may unlock a second driver-behavior slider
  distinct from universal Driver Aggression. Nell Voss should receive two
  configurable items. The launch distribution target is therefore 1/1/3/2 for
  Evelyn/Lucien/Inez/Nell.
- Q: Which Nell Voss items are configurable at launch? → A:
  `voss-adjustable-bodywork-stay` exposes a bodywork-trim tradeoff between
  straight-line performance and cornering stability;
  `voss-split-circuit-brake-valve` exposes the shared brake-balance control.
- Q: Which Evelyn Mercer item is configurable at launch? → A:
  `mercer-hand-fitted-steering-knuckle` exposes a three-position
  `steering-response` control: Stable, Balanced, and Responsive. Stable trades
  1 Cornering Speed for 13 Braking Power; Responsive applies the inverse;
  Balanced is zero.
- Q: Which Lucien Soto item is configurable at launch? → A:
  `soto-two-speed-drive-hub` exposes a three-position `gearing` control: Short,
  Balanced, and Tall. Short trades 1 Top Speed for 6 Acceleration; Tall applies
  the inverse; Balanced is zero.
- Q: Which Inez Rook items are configurable at launch? → A: Differential
  Braking Valve and Gyroscopic Stabilizer are confirmed. Differential Braking
  Valve exposes shared brake balance. Gyroscopic Stabilizer exposes a distinct
  three-position racing-line behavior: Attack Apex (`Acceleration +6`,
  `Cornering Speed −1`), Balanced Line (zero), and Hold Line (the inverse).
  Variable-Pitch Propeller remains the intended third item, but its labels are
  Fine Pitch (`Acceleration +6`, `Top Speed −1`), Balanced Pitch (zero), and
  Coarse Pitch (the exact inverse).
- Q: What happens when multiple installed items expose the same control family?
  → A: They produce one shared slider, not duplicate controls, and their
  magnitudes stack linearly. Two brake-balance items therefore exchange 26
  Braking Power for 2 Cornering Speed at an extreme. The UI names every
  contributing installed item; stored items do not contribute.
- Q: Do setup choices carry between races? → A: By default every control resets
  to its Balanced midpoint before each race. The player may explicitly enable a
  simple "Remember setup" checkbox to carry settings forward within the current
  championship until changed. Remembered values are keyed by control family;
  they do not create an equipment control when no currently installed item
  enables it.
- Q: What happens to a remembered item setting while its enabling item is not
  installed? → A: The value remains dormant for the rest of the current
  championship. It grants no control or effect while ineligible, and returns if
  that control family is enabled again later. This behavior implements "until
  changed" without turning remembered state into item ownership.
- Q: Does Test Day use the currently selected pre-race setup? → A: Yes. Entering
  Test Day from this surface creates a temporary immutable snapshot of the
  current universal and equipment selections. Practice applies that snapshot,
  remains fully unscored, and returns to the exact uncommitted selections with
  no championship-state mutation.
- Q: Which track does Test Day use from pre-race setup? → A: The exact
  authoritative upcoming scored-race track, together with the temporary setup
  snapshot and the existing disclosed Test Day rival. Opponent information
  remains on Test Day surfaces, never on pre-race setup. This may be revisited
  if playtesting shows excessive optimization, but launch fairness comes from
  giving every player the same track evidence, controls, eligibility rules, and
  testing opportunity.
- Q: Do rivals receive equivalent setup choices and simulation effects? → A:
  Yes. The game is intended for real asynchronous multiplayer, so every human
  ghost record must retain the exact locked setup used with its build. Canonical
  contest resolution applies the same setup validation and physics rules to
  every car. Until multiplayer recording exists, generated rivals must produce
  deterministic, track-aware legal setup selections through the same resolver;
  they are a temporary adapter, not a player-only exemption.
- Q: How do generated rivals choose setup positions before real asynchronous
  ghost records exist? → A: For that rival's exact resolved build and the exact
  upcoming track, enumerate every legal three-position combination, resolve the
  complete lap set through canonical `simulatePlayerLaps`, sum total race time,
  and select the lowest total. Exact time ties use canonical family order and
  position order (`low`, `balanced`, `high`). No randomness or viewer-local
  choice participates.
- Q: What is Nell's Adjustable Bodywork Stay tradeoff? → A: `bodywork-trim`
  uses Corner Trim (`Top Speed −1`, `Cornering Speed +1`), Balanced Trim (zero),
  and Streamlined (the exact inverse).
- Q: Is there a maximum number of controls shown at once? → A: No arbitrary
  cap. Driver Aggression is always shown and every unique control family enabled
  by currently installed items is shown; same-family items aggregate. The four
  installed vehicle slots provide the natural mechanical bound, while content
  authoring and item-pool balance control typical setup density.

## Background

The run hub currently sends a scheduled PvP encounter directly into race
playback. The player has no deliberate opportunity to fine-tune the current
vehicle for the generated track before its build is locked. Generated tracks
now have authoritative segment structure and capability demands, so the player
has enough truthful information to make a small setup decision.

This feature adds a dedicated car-setup surface between the run hub and
`ContestScene`. Every build sees its current vehicle and the track information
needed to understand setup tradeoffs. Every car receives exactly one basic
driver-behavior control. Additional controls appear only when an installed item
explicitly authors them. Launch equipment scope contains seven configurable
items across six control families. Every control makes a symmetric exchange
between existing physical stats; none creates free performance. All selections
are locked into contest input and retained in immutable per-car result evidence.

Opponent information, Rival Intel, purse and sponsor information, a general
garage, live race controls, and an unbounded general tuning simulator remain out
of scope. This screen is for the player's car setup, not race briefing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the car and track setup context (Priority: P1)

Before committing to a scored race, the player sees the current vehicle's exact
four-stat profile beside the upcoming generated track's relevant composition
and demands. No opponent, purse, sponsor, or predicted-result information
appears on this setup surface.

**Independent Test**: Enter setup for a scheduled PvP encounter and compare its
track and build with the subsequently resolved contest. Both must match, while
the screen exposes no opponent identity, opponent stats, field, purse, sponsor,
or projected finishing information.

**Acceptance Scenarios**:

1. **Given** an active scheduled PvP encounter, **When** setup opens,
   **Then** it displays the exact track that the contest will use, including
   name, shape, straights, corners, distance, and four-stat demand summary.
2. **Given** any upcoming opponent field or pending sponsor contract, **When**
   setup opens, **Then** no opponent, field, purse, sponsor, or outcome-prediction
   information is shown.
3. **Given** the current vehicle, **When** setup opens, **Then** its exact current
   Acceleration, Top Speed, Braking Power, and Cornering Speed are visible before
   and after any prospective adjustment.
4. **Given** any selected entrant, **When** setup opens, **Then** the empty setup
   bay background is overlaid with that entrant's canonical vehicle art; no
   vehicle is baked into the shared background and no generic/default vehicle is
   substituted.
5. **Given** the player leaves setup without starting, **When** they
   return to the run hub, **Then** no encounter, sponsor, credits, reputation,
   history, or build state changes.

### User Story 2 - Make one universal driver adjustment (Priority: P1)

Every car has exactly one basic driver-behavior slider regardless of entrant,
vehicle, installed items, or storage. Its default is neutral and preserves the
current simulation exactly. Its non-neutral settings create a disclosed,
deterministic tradeoff rather than a hidden random chance.

Driver Aggression redistributes the vehicle's effective race stats. Aggressive
driving raises Acceleration and Top Speed while lowering Braking Power and
Cornering Speed. Conservative driving makes the inverse exchange. Because the
track simulation already values these four capabilities segment by segment,
the useful setting depends on the upcoming track rather than being a universal
upgrade.

**Acceptance Scenarios**:

1. **Given** any valid car and build, **When** setup opens, **Then** exactly one
   universal driver-behavior slider is available.
2. **Given** the slider remains at its neutral midpoint, **When** the race
   resolves, **Then** driver behavior contributes no change from the current
   simulation.
3. **Given** a non-neutral driver setting, **When** its prospective effects are
   shown, **Then** every gain and cost is explicit and the race applies them
   deterministically without live random rolls.
4. **Given** two entrants with equivalent mechanical inputs and the same driver
   setting, **When** they race, **Then** the setting follows the same shared rule;
   no entrant receives a stronger universal control.

### User Story 3 - Tune only what the installed equipment enables (Priority: P1)

An installed configurable item exposes one plainly labeled setup control. A
build without such an installed item receives only the universal driver control
and a clear "No adjustable equipment installed" message, without meaningless
equipment controls.

**Independent Test**: Open the same setup surface with and without each launch
configurable item installed. Confirm only eligible installed equipment exposes
its control family and that stored copies do not enable tuning.

**Acceptance Scenarios**:

1. **Given** an authored configurable item is installed in an active vehicle
   slot, **When** setup opens, **Then** its control family offers its three
   discrete keyboard/touch/mouse-operable positions.
2. **Given** the configurable item is only in storage, **When** setup opens,
   **Then** it grants no setup control because storage is not fitted race setup.
3. **Given** no configurable item is installed, **When** setup opens, **Then**
   Start Race remains available and no outcome-changing choice is fabricated.
4. **Given** more than one future item authors the same control family, **When**
   eligibility resolves, **Then** the screen shows one brake-balance control and
   attributes every contributing item; effects combine by an explicit shared
   resolver rather than rendering duplicate sliders.

### User Story 4 - Understand the exact tradeoff before committing (Priority: P1)

Each setting shows its exact stat deltas and a prospective four-stat vehicle
profile beside the authoritative track demands. No prediction claims a finish
position or guaranteed time gain.

**Independent Test**: Select every setting and reconcile the displayed
prospective stats with the pure setup resolver and the stats recorded on lap
one of the resulting contest.

**Acceptance Scenarios**:

1. **Given** Balanced is selected, **When** stats are compared, **Then** setup
   contributes zero delta to Braking Power and Cornering Speed.
2. **Given** Corner Entry is selected, **When** stats are compared, **Then** the
   exact authored amount moves from Braking Power to Cornering Speed.
3. **Given** Stability is selected, **When** stats are compared, **Then** the
   same exact amount moves from Cornering Speed to Braking Power.
4. **Given** a setting would reduce a stat, **When** shown, **Then** both the
   gain and cost are visible in text and signed numbers without relying on color.
5. **Given** the track favors one capability, **When** setup is inspected,
   **Then** the UI may describe alignment with track demand but MUST NOT promise
   a position, outcome, or unrecorded time delta.

### User Story 5 - Lock a canonical setup into the race (Priority: P1)

Starting the race creates an immutable setup selection bound to the active
encounter. Playback, simulation, and Results consume that selection rather than
reading mutable UI state.

**Independent Test**: Start races at all three settings. Confirm deterministic
repeatability, different physical phase results where the track exercises the
affected stats, and complete result attribution.

**Acceptance Scenarios**:

1. **Given** a selected setup, **When** Start Race is confirmed, **Then** the
   selection, source item IDs, exact deltas, encounter ID, and track ID are
   captured before contest resolution.
2. **Given** identical run, track, build, hidden contest field, and setup inputs, **When** the
   contest resolves repeatedly, **Then** results are deeply identical.
3. **Given** different legal brake-balance selections, **When** a relevant track
   is raced, **Then** phase times change only through the disclosed physical
   stat deltas; no hidden bonus or random roll is added.
4. **Given** Results opens, **When** setup evidence is inspected, **Then** it
   names each car's selected settings, source items, and exact applied deltas
   from canonical contest evidence.
5. **Given** playback has begun, **When** any input occurs, **Then** setup cannot
   be changed and contest outcome remains immutable.

### User Story 6 - Preserve Test Day and recovery boundaries (Priority: P2)

The scored setup surface continues to offer Test Day, while practice remains
unscored and cannot commit or leak scored setup state.

**Acceptance Scenarios**:

1. **Given** setup has an uncommitted selection, **When** Test Day is
   entered and exited, **Then** the exact setup selection and focus context
   are restored without changing run state.
2. **Given** non-Balanced selections, **When** Test Day resolves, **Then** its
   recorded practice physics applies those exact setup deltas and labels them
   unscored; the scored race remains uncommitted.
3. **Given** malformed or stale setup data, **When** Start Race is attempted,
   **Then** the flow routes to an explicit unavailable state rather than using a
   default, applying partial deltas, or resolving a different track.
4. **Given** a legacy contest path with no setup, **When** it resolves, **Then**
   it is equivalent to Balanced and retains current deterministic behavior.

## Requirements *(mandatory)*

- **FR-001**: Every scored PvP encounter MUST route through a dedicated
  pre-race car-setup surface before `ContestScene`.
- **FR-002**: Setup, contest, and result MUST share authoritative encounter,
  track, locked-build, and setup facts; consumers MUST NOT independently
  regenerate values that affect the player's setup decision.
- **FR-003**: The setup surface MUST show the current and prospective four-stat
  vehicle profile plus the track shape, composition, and relevant demands.
- **FR-003A**: The setup surface MUST NOT show opponent identity or stats, rival
  field composition, purse, sponsor stakes, projected position, or outcome odds.
- **FR-003B**: The setup surface MUST render the active run's canonical vehicle
  art over the shared vehicle-free setup-bay background. Vehicle selection MUST
  derive from validated run identity and MUST NOT default, guess, or use a
  vehicle baked into the background.
- **FR-004**: `ItemDefinition` MAY author one optional configurable setup effect;
  absence MUST be equivalent to no control.
- **FR-004A**: Every car MUST receive exactly one universal driver-behavior
  slider independent of items, entrant, vehicle, and storage.
- **FR-004B**: The universal control's midpoint MUST preserve current simulation
  behavior exactly; non-neutral settings MUST be deterministic, disclose their
  complete tradeoff, and MUST NOT introduce live random resolution.
- **FR-004C**: Moving Driver Aggression above its midpoint MUST raise effective
  Acceleration and Top Speed while lowering effective Braking Power and
  Cornering Speed. Moving below midpoint MUST apply the exact inverse. The
  mapping MUST be symmetric, zero-sum by authored stat-step value, identical for
  every entrant, and applied before per-segment track simulation.
- **FR-004D**: Driver Aggression MUST use exactly three snap positions at launch:
  Conservative (`Acceleration −6`, `Top Speed −1`, `Braking Power +13`,
  `Cornering Speed +1`), Balanced (all zero), and Aggressive (the exact inverse).
- **FR-005**: Launch MUST support universal `driver-aggression` plus six
  equipment families: `brake-balance`, `steering-response`, `gearing`,
  `propeller-pitch`, `racing-line`, and `bodywork-trim`. Every family MUST use
  exactly three discrete positions.
- **FR-006**: Brake balance MUST be zero-sum between Braking Power and Cornering
  Speed. Launch magnitude is one standard item-stat step: 13 Braking Power is
  exchanged for 1 Cornering Speed in either direction; Balanced is zero.
- **FR-007**: Only installed items enable setup. Storage MUST NOT enable or
  amplify a control.
- **FR-008**: Launch authoring MUST make `rook-differential-braking-valve` the
  first configurable item, preserving its existing base contribution.
- **FR-008A**: Before implementation planning completes, the full existing item
  catalog MUST be audited for plausible configurable equipment, and the launch
  set, control family, entrant distribution, and rationale MUST be recorded.
- **FR-008B**: The launch configurable-item set MUST contain exactly one Evelyn
  item, one Lucien item, three Inez items, and two Nell items. This intentional
  asymmetry expresses Inez's experimental ecosystem while preserving meaningful
  configuration access for every entrant.
- **FR-008C**: Nell's two launch items MUST be Adjustable Bodywork Stay
  (`bodywork-trim`) and Split-Circuit Brake Valve (`brake-balance`). Items that
  expose an existing control family MUST reuse its labels, deltas, aggregation,
  and result evidence rather than authoring a near-duplicate control.
- **FR-008C.1**: Bodywork trim MUST use Corner Trim (`Top Speed −1`, `Cornering
  Speed +1`), Balanced Trim (zero), and Streamlined (the exact inverse).
- **FR-008D**: Evelyn's launch item MUST be Hand-Fitted Steering Knuckle. Its
  steering-response control MUST use Stable (`Braking Power +13`, `Cornering
  Speed −1`), Balanced (zero), and Responsive (the exact inverse).
- **FR-008E**: Lucien's launch item MUST be Two-Speed Drive Hub. Its gearing
  control MUST use Short (`Acceleration +6`, `Top Speed −1`), Balanced (zero),
  and Tall (the exact inverse).
- **FR-008F**: Two of Inez's three launch items MUST be Differential Braking
  Valve (`brake-balance`) and Gyroscopic Stabilizer (`racing-line`). Racing line
  MUST use Attack Apex (`Acceleration +6`, `Cornering Speed −1`), Balanced Line
  (zero), and Hold Line (the exact inverse).
- **FR-008G**: Inez's third launch item MUST be Variable-Pitch Propeller. Its
  pitch control MUST use Fine Pitch (`Acceleration +6`, `Top Speed −1`),
  Balanced Pitch (zero), and Coarse Pitch (the exact inverse).
- **FR-009**: Setup eligibility, aggregation, deltas, validation, and presentation
  data MUST come from pure shared functions covered independently from Phaser.
- **FR-009A**: Installed items exposing the same control family MUST aggregate
  into one slider whose signed stat steps sum linearly. Presentation and result
  evidence MUST list all source item IDs. No per-item duplicate slider may be
  rendered, and storage MUST remain excluded.
- **FR-009B**: The setup surface MUST render every unique eligible installed
  control family in addition to Driver Aggression and MUST NOT silently suppress
  a legal control because of an arbitrary UI cap. Layout MUST support the
  natural maximum of Driver Aggression plus four distinct installed-item
  families.
- **FR-010**: Start Race MUST capture an immutable `LockedRaceSetup`; contest
  physics MUST apply its exact deltas before per-segment simulation and record
  them in result evidence. The same operation MUST apply independently to every
  car's own build and locked setup.
- **FR-011**: Per-car result evidence MUST retain setup kind, setting, source
  item IDs, and signed stat deltas. Results MUST label missing legacy evidence
  unavailable or Balanced as appropriate, never infer it from item names or
  copy the player's setup onto rivals.
- **FR-012**: Back/cancel and Test Day navigation MUST not advance or mutate the
  run. Only Start Race commits setup.
- **FR-012A**: Every control MUST initialize to Balanced for each race unless the
  player previously enabled Remember setup in the current championship.
- **FR-012B**: Remember setup MUST be an explicit checkbox, disabled by default,
  and scoped to the current championship. When enabled, Start Race MUST retain
  the committed position by control-family key for later races. A retained item
  control MUST be ignored while no currently installed item enables that family
  and MUST NOT itself grant eligibility or effects.
- **FR-012C**: Dormant remembered values MUST remain keyed by control family
  within the championship and become the initial selection if that family later
  becomes eligible again. Dormant values MUST contribute zero simulation effect
  and MUST NOT be shown as active controls.
- **FR-012D**: Test Day entered from pre-race setup MUST resolve against a
  temporary immutable snapshot of every current setup selection and MUST return
  to those uncommitted selections. It MUST NOT write remembered settings,
  commit the scored race, advance the encounter, or settle any run value.
- **FR-012E**: That Test Day snapshot MUST use the same retained `Track` as the
  upcoming scored contest. Practice MUST NOT regenerate or substitute another
  track. The disclosed sample rival remains a Test Day concern and MUST NOT leak
  onto the pre-race setup surface.
- **FR-015**: Every human player MUST receive identical universal-control,
  item-eligibility, track-evidence, Remember setup, and Test Day rules. The
  system MUST NOT vary their strength or availability by entrant except through
  the installed configurable items each player legitimately acquired.
- **FR-016**: A recorded asynchronous ghost MUST include its immutable build,
  locked setup selections, setup source-item identities, and the versioned
  setup-rule identity needed to reproduce its canonical race result.
- **FR-017**: Canonical contest resolution MUST calculate every car using that
  car's own validated build and locked setup under one shared ruleset. Setup MUST
  NOT be applied only to the viewing player, regenerated at view time, or
  inferred from current content after the ghost was recorded.
- **FR-018**: Before recorded multiplayer ghosts exist, generated rivals MUST
  receive deterministic, track-aware legal setups from the same eligibility,
  aggregation, and delta resolver used for the player. Generated rivals are a
  temporary compatibility path and MUST NOT define a weaker rival-only setup
  model.
- **FR-018A**: A generated rival MUST enumerate every legal combination of its
  eligible three-position controls, resolve its complete race time for each
  combination by summing canonical `simulatePlayerLaps` output for its exact
  build, lap count, setup, and authoritative upcoming track, and
  select the lowest-time combination. Exact time ties MUST use canonical family
  order followed by position order (`low`, `balanced`, `high`). The search MUST
  contain no randomness and MUST run before playback.
- **FR-013**: The screen and controls MUST work with mouse, touch, keyboard,
  visible focus, reduced motion, and without hover or color-only meaning.
- **FR-014**: This feature MUST NOT add opponent selection, Rival Intel encounter
  behavior, build editing, item movement, purchasing, live race input, general
  tuning, continuous sliders, or outcome predictions.

## Key Entities

- **RaceSetupInput**: Immutable encounter, track, build, and setup-eligibility
  facts assembled once for setup and contest consumption. It contains no rival,
  purse, sponsor, or prediction presentation data.
- **ConfigurableSetupEffect**: Optional item authoring declaring a control family
  and magnitude; launch supports the six equipment families defined by FR-005.
- **RaceSetupSelection**: The player's uncommitted discrete choice in setup.
- **LockedRaceSetup**: Validated selection set plus source items, exact deltas,
  encounter ID, track ID, and setup-rule version captured at Start Race or ghost
  recording time.
- **RaceSetupEvidence**: Per-car locked setup retained alongside that car's
  canonical contest evidence.

## Success Criteria

- **SC-001**: 100% of scored races pass through setup and reuse the exact
  previewed track, build, and locked setup.
- **SC-002**: 100% of legal setup selections reconcile displayed, simulated, and
  result-recorded deltas exactly.
- **SC-003**: Zero run mutations occur before Start Race.
- **SC-004**: Builds without configurable installed items receive only the one
  universal driver control; its midpoint produces byte-for-byte legacy behavior.
- **SC-005**: All setup controls are operable by mouse, touch, and keyboard and
  communicate gains/costs without color.
- **SC-006**: Zero opponent, field, purse, sponsor, prediction, or odds facts
  appear on the pre-race setup surface.

## Assumptions

- Feature 018's generated `Track` and feature 027's track/stat presentation are
  authoritative prerequisites and are reused rather than redesigned.
- Participation, win, sponsor, and opponent information belongs to other
  surfaces and is intentionally absent here.
- One discrete control is sufficient to validate the item-driven setup model;
  additional control families require separate balance and interaction specs.
