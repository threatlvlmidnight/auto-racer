# Auto Racer — Vision Doc

*Living design record — updated as decisions are made, not a frozen pitch document.*

## High concept
An async auto-battler set at the dawn of an alternate Motor Age. In 1901,
shortly after the combustion engine's discovery, eccentric builders from across
society are invited to the first international Auto Race Championship. Their
machines need not resemble one another; they only need to cross the finish line
first.

Every entrant begins with a **mechanically equivalent baseline machine**: the
same starting pace, item capacity, storage, and contest rules. Character and
vehicle choice changes the player's identity, draft bias, silhouette, and
fiction, but grants no inherent statistical advantage. The game is about
building the best *way to win a race*, not converging on one ideal racecar.

## Theme and setting

### The world

- The championship takes place in an optimistic, dangerous alternate 1901,
  with the material culture and visual vocabulary of roughly the 1910s-1920s.
  Combustion arrived late and suddenly; standards, best practices, and modern
  motorsport categories do not exist yet.
- "Auto" means self-propelled, not specifically four-wheeled or road legal.
  Cars, motorcycles, carriage conversions, propeller-driven contraptions, and
  other experimental machines may enter the same event.
- The championship is a public spectacle and an invention contest disguised as
  a race. Suppliers, sponsors, mechanics, opportunists, and officials are all
  discovering what organized motor racing is alongside the entrants.
- The tone is adventurous, ingenious, and lightly hazardous rather than grim or
  historically exact. The world celebrates improvised problem-solving without
  treating injury or real-world war as a joke.

### Player fantasy

The player selects an invited **entrant**: a named owner-builder with a racing
background, point of view, and signature starting machine. The entrant may also
be depicted as the driver, but the player remains the planner: every decision is
made during preparation, and every race runs without live control.

The committed initial-release roster is:

- **Evelyn Mercer - Coachworks**: a master coachwright and carriage racer whose
  ecosystem covers craftsmanship, roadcraft, materials, appraisal, and resale.
- **Lucien Soto - Velodrome**: a champion cyclist whose ecosystem covers cadence,
  momentum, drafting, endurance, sporting prizes, and lightweight engineering.
- **Inez Rook - Fieldworks**: an expedition engineer and compulsive salvager whose
  ecosystem covers tools, repair, fuel, heat, transformation, and experimental machinery.
- **Nell Voss - Backroads**: a customs runner and illicit courier whose ecosystem
  covers contraband, evasion, wagers, information, distractions, and exposure.

These are thematic item ecosystems, not locked mechanical classes or prescribed
strategies. Each supports multiple approaches to pace, scaling, control,
economy, reliability, and risk. Entrants use the same generic slots and baseline
performance. Their origin weights what they are likely to find, while shared
synergy tags and off-origin offers enable intentional hybrid builds. See
`specs/launch-roster.md` for the authoritative roster and content guardrails.

### Theme pillars

1. **Win, do not merely go fastest.** Raw pace is one strategy among reliability,
   racecraft, interference, scoring, information, and strange synergies.
2. **No one knows what a race vehicle is yet.** The setting must make unlike
   machines feel plausible in the same contest instead of forcing every build
   toward a modern car.
3. **Improvisation is visible.** Items should read as physical inventions,
   borrowed expertise, favors, tactics, or dubious devices whose effects can be
   understood while spectating.
4. **Equivalent beginnings, divergent runs.** Character choice provides
   identity and draft direction, never more slots, better base statistics, or a
   private ruleset.
5. **Earnest spectacle with a wink.** The championship and its competitors take
   victory seriously; the humor comes from confident experimentation and the
   surprising machines it produces, not from parodying the whole world.

### Design boundaries

- Historical inspiration is a visual and material reference, not a requirement
  for strict real-world chronology or engineering simulation.
- Vehicle silhouettes may differ radically, but all must remain legible on the
  shared top-down track and use the same simulation contract.
- Flight is a build expression, item effect, or animated flourish unless a later
  feature explicitly designs another movement model; it does not bypass laps or
  create live steering.
- Character identity lives in authored content, weighted acquisition, and
  synergy. It does not change the generic container or grant a passive numerical
  advantage at run start.
- The fiction should broaden item design beyond modern automotive components
  without making outcome math opaque.

## Player role
The player acts through their selected entrant as the machine's builder and race
planner. The entrant may fictionally drive their own machine, but the player is
not steering it: they are responsible for components, acquisitions, and strategy
between races.

## Core loop
Async auto battler, structured as prepare → contest:

- **Contest:** a 1v1 race against another player's ghost.
- **Prepare:** between races, the player acquires new components, upgrades existing ones, and adjusts their setup to improve their odds next race.

## Race presentation
- Top-down view, presented like watching a race broadcast on TV.
- Design goal: make races transparent enough that players can extract meaningful insight from their own performance each race — the anti-Bazaar stance (visible numbers, not hidden math).
- Open question raised alongside this: whether *all* builds get full data visibility by default, or whether visibility itself is a build choice — i.e., some components/build paths expose more telemetry than others, making "clearer information" a tradeoff you build toward rather than a given. Still open even after shipping (below) — the current visualizer shows full telemetry to every build unconditionally.
- **Shipped as feature 006** (`specs/006-race-visualizer/`): a watched, ~20-second animated race — a simple oval track, both cars completing 10 literal laps paced by real per-lap simulation data, item-firing callouts, and a live leader/gap indicator. This satisfies Constitution Principle IV (Spectation-First) for the first time, rather than merely not violating it.

## Entrants and identity
- At the start, the player picks an entrant. Each entrant has a signature baseline
  machine. Every baseline has the same performance and total item capacity, but
  its vehicle distributes that capacity differently among Power, Chassis, and
  Flex slots. Identity changes draft weighting and vehicle topology, never total
  capacity or starting power.
- Each entrant represents a thematic item ecosystem, expressed through *which
  items they draw toward*. The ecosystem supplies a vocabulary and network of
  synergies, not a predetermined strategy or win condition.
- Entrant choice is an "identity vector" the player commits to at the start of a
  run: a bias on the draft, not a different set of rules. Any entrant can build
  outside their apparent specialty when the draft supports it.

## Vehicle and build constraints
- The player's active build surface is their named vehicle, not an abstract
  board. Every entrant has the same total number of active item slots and the
  same storage capacity.
- Active slots are Power, Chassis, or Flex. Each vehicle has a distinct
  distribution, but exact launch counts remain a balance decision.
- Every item is Power or Chassis and remains legal in every slot. Matching a
  typed slot activates that item's authored Fitted effect; Flex provides base
  behavior; a mismatch uses the item's visible Improvised behavior. There is no
  universal numerical alignment modifier.
- When offered a new item while all slots are full, the player must evict one currently-held item to accept it, or decline the new item and keep their current build.
- Hard item-type restrictions, unequal total capacity, and spatial packing
  remain rejected. Vehicle topology influences item behavior without forbidding
  a build. Full rules are in `specs/vehicle-topology.md`.
- Identity's mechanical homes are the **draft** and **vehicle topology**: origin
  weights what appears, while slot distribution changes how readily items reach
  their authored Fitted state.
- Where identity depth is *meant* to live going forward: item synergy (items that read and react to what else is in your slots). Not yet designed — tracked in `specs/DEFERRED.md`.

## Draft / acquisition system
- Component acquisition is randomized per run (draft of encounters), Bazaar-style random rolls.
- Items distinguish an entrant **origin tag** from one or more **synergy tags**.
  The draft is weighted by origin; item effects primarily interact through
  synergy tags, item state, and race events. Different origins deliberately
  share synergy tags so cross-character combinations can be authored and discovered.
- Because every item remains legal in every slot, a player can pursue a
  single-origin build, go all-in on another origin, or mix freely. Vehicle
  topology changes installation tradeoffs without prohibiting any composition.
- Occasionally, players roll items from *other* identities' tags — a deliberate reward for creative/hybrid deck-building, letting a run cross identity lines rather than staying purely in-lane.

## Item effects & simulation depth
- **Shipped as feature 005** (`specs/005-lap-tick-simulation/`): races resolve as `LAP_COUNT` (10, fixed) discrete laps. Every item carries a per-lap magnitude and a lap-based cooldown gating recurring effects. Buff items come in two kinds — **flat** (no cooldown, constant boost every lap) and **stacking** (cooldown-gated, each firing permanently adds to a cumulative boost, additive not compounding). The ghost is a fixed-pace "control car" (a per-lap `lapTime`, no items/modifiers, no variance). A minimum lap-time floor guards against degenerate (zero/negative) lap times from aggressive stacking. The result exposes a full lap-by-lap breakdown (`ContestResult.laps`), which feature 006's visualizer consumes directly.
- **Shipped as feature 006** (see Race presentation above): the connection between this lap-tick model and Spectation-First — explicitly unresolved at the time 005 was written — is now resolved. The visualizer derives real car pacing and item-firing callouts directly from `laps[]`.
- **Planned in feature 009**: PvP races use 10 then 12 laps within a six-stage run. The shipped implementation remains fixed at 10 until `009-run-progression` is built. A ghost with its own recorded build/items (rather than a fixed constant pace) is still out of scope — a much larger future feature (real async ghost recording), explicitly not this one.
- Item synergy beyond 003's original buff item and 005's flat/stacking mechanism (richer, multi-axis combos) remains open — tracked in `specs/DEFERRED.md`.

## Run structure / encounter system (planned in feature 009, not yet implemented)
- A run is not just "a sequence of contests" — it's divided into discrete encounters (The Bazaar's "day, ~10 encounters" structure is the reference point, though the intent is explicitly *not* to copy that system wholesale, just to borrow the shape).
- Encounter **type** determines both how many items are on offer and how they're offered — e.g., Parts Supplier lets the player buy as many displayed items as they can afford with one paid restock; Reward Draft offers three items and allows at most one; a PvP-type encounter *is* a contest (see Core loop); PvE-type encounters are a later design space.
- This creates two layers of player choice, not one: first, which encounter to engage with (or how to route through the day/run — "where to look"), and second, what to actually take once inside that encounter ("what to pick from what you found"). Item-slot decisions (see Build constraints) are the second layer; the first layer doesn't exist yet in any shipped feature.
- **Feature 009 plan**: six stages contain four one-of-two random choice stages and two scheduled PvP races. The first catalog is Parts Supplier, Reward Draft, Sponsor Meeting, and PvP Race, with run-scoped credits and authored item prices. Rival Scouting, Scrutineering, Factory Development, Privateer Exchange, and PvE remain later design work.
- Surfaced during `002-item-slots`'s clarify phase, when a question about "how many rounds before a contest" exposed that no run/encounter structure existed yet to answer it from.

## Status
Eight features shipped and playable:
- **001 core loop** (`specs/001-core-loop/`): the prepare→contest loop itself.
- **002 item slots** (`specs/002-item-slots/`): flat slot cap + evict-to-add, placeholder offer sequence.
- **003 item pool & draft** (`specs/003-item-pool-draft/`): a 10-20 item pool, Performance-identity draft weighting (~75%/25%), first item-synergy step (one buff item).
- **004 board & storage UI** (`specs/004-board-storage-ui/`): drag-and-drop board/storage prepare UI, Next/Refresh controls, one active-while-stored item.
- **005 lap-tick simulation** (`specs/005-lap-tick-simulation/`): races resolve as 10 discrete laps; per-lap item cooldowns; flat/stacking buffs; fixed-pace ghost; minimum lap-time floor.
- **006 race visualizer** (`specs/006-race-visualizer/`): a watched ~20-second animated race, item callouts, live leader/gap indicator — Constitution Principle IV (Spectation-First) is now **satisfied**, not just respected.
- **007 count-synergy buff** (`specs/007-count-synergy-buff/`): held-item-count scaling for matching direct items.
- **008 race UI polish** (`specs/008-race-ui-polish/`): buff contribution flashes, compact item logos/names, cooldown/dependency details, and hover tooltips.

**Planned next**: `009-run-progression` now specifies the run/encounter structure, variable lap counts, Supplier economy, Reward Draft, Sponsor Meeting, and scheduled PvP. It may complete against the current generic-board placeholder. Build Testing Access remains its mandatory immediate follow-up. The four-entrant initial roster and thematic ecosystems are committed in `specs/launch-roster.md`; the intended vehicle system is committed in `specs/vehicle-topology.md`. **Still open**: championship and game title; final character biographies and visual designs; exact visual style; topology implementation and final slot distributions; richer item synergy and final tag taxonomy; entrant selection; phase-two encounters; weight as a possible soft constraint; real async ghost recording; and whether data visibility itself should be a build choice.

The target interface, current-state gap analysis, persistent run HUD, menu flow,
responsive requirements, vehicle workshop, race/result overhaul, and phased
delivery sequence are specified in `specs/visual-overhaul.md`. Its first slice
is the constitutionally required Build Testing Access feature; the master spec
must not be implemented as one monolithic feature.
