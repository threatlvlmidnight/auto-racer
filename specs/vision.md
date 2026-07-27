# Auto Racer — Vision Doc

*Living design record — updated as decisions are made, not a frozen pitch document.*

## High concept
Open-wheel racing, **spec series** — every team/player starts from the *same* base car. The game is about what you add, remove, and change from that shared starting point, not about engineering a car from scratch.
- "Spec rules" (in the real-world racing sense) matter only insofar as they define that identical starting car — not otherwise simulated or enforced as a ruleset.

## Player role
The player is not the driver. They act as the team's builder/decision-maker (working title: "team manager," name TBD) — responsible for the car, the components, and team strategy between races.

## Core loop
Async auto battler, structured as prepare → contest:

- **Contest:** a 1v1 race against another player's ghost.
- **Prepare:** between races, the player acquires new components, upgrades existing ones, and adjusts their setup to improve their odds next race.

## Race presentation
- Top-down view, presented like watching a race broadcast on TV.
- Design goal: make races transparent enough that players can extract meaningful insight from their own performance each race — the anti-Bazaar stance (visible numbers, not hidden math).
- Open question raised alongside this: whether *all* builds get full data visibility by default, or whether visibility itself is a build choice — i.e., some components/build paths expose more telemetry than others, making "clearer information" a tradeoff you build toward rather than a given. Still open even after shipping (below) — the current visualizer shows full telemetry to every build unconditionally.
- **Shipped as feature 006** (`specs/006-race-visualizer/`): a watched, ~20-second animated race — a simple oval track, both cars completing 10 literal laps paced by real per-lap simulation data, item-firing callouts, and a live leader/gap indicator. This satisfies Constitution Principle IV (Spectation-First) for the first time, rather than merely not violating it.

## Teams and identity
- At the start, the player picks a race team — but all teams start from the same spec car *and the same number of item slots*. Identity does not change the container (see Build constraints below); it changes what you're likely to be offered to put in it.
- Each team represents a distinct strategic identity, expressed through *which items it draws toward*, with examples floated:
  - **Performance team** — draws mostly toward car/performance-tagged items (raw stats, handling, top speed).
  - **Driver/strategy team** — draws mostly toward driver-skill and race-craft-tagged items.
  - **"Unsportsmanlike"/scoring team** — draws mostly toward items that interfere with the opponent or scoring rather than out-performing them.
- Team choice = an "identity vector" the player commits to at the start of a run — a bias on the draft, not a different set of rules. A Performance-identity player could still fill every slot with strategy-tagged items if that's what they draw and choose; nothing structurally stops a hybrid or an all-in build in either direction.

## Build constraints (decided, post-prototype design pass)
- Every team has the same flat number of generic item slots (illustrative default: 3) — no categories, no per-slot typing (no fixed "engine slot" vs. "aero slot"), and identity does **not** change the slot count.
- When offered a new item while all slots are full, the player must evict one currently-held item to accept it, or decline the new item and keep their current build.
- This was settled after running several design personas (an auto-battler veteran, a motorsport-regulations engineer, a Backpack-Battles-style spatial designer, and a minimalist) against each other. Two alternatives were seriously explored and both rejected: named capacity pools split by identity (e.g., "Chassis" vs. "Team" slots) was ruled out as a categorical system wearing a different label; varying total slot count by identity was ruled out because in a single undifferentiated item pool, more slots is strictly better with no offsetting tradeoff — a dominant strategy, not an asymmetry (unlike, say, Hearthstone Battlegrounds' hero powers, which differ in kind, not just in scalar advantage). Full reasoning logged in `specs/DEFERRED.md`.
- Identity's mechanical home is the **draft**, not the container: items carry identity tags, and a team's identity weights which tags it's more likely to be offered — see Draft / acquisition system below.
- Where identity depth is *meant* to live going forward: item synergy (items that read and react to what else is in your slots). Not yet designed — tracked in `specs/DEFERRED.md`.

## Draft / acquisition system
- Component acquisition is randomized per run (draft of encounters), Bazaar-style random rolls.
- Items carry identity tags (e.g., a "strategy" tag, a "car"/performance tag, etc.). The draft is weighted by the player's chosen team identity: players mostly see items tagged toward their identity.
- Because slots are flat and generic (see Build constraints), a player can lean entirely into their identity's tag (e.g., all-strategy, relying on the untouched baseline car to get them across the line), go all-in on the opposite tag, or mix freely — the constraint system doesn't privilege any of those choices structurally.
- Occasionally, players roll items from *other* identities' tags — a deliberate reward for creative/hybrid deck-building, letting a run cross identity lines rather than staying purely in-lane.

## Item effects & simulation depth
- **Shipped as feature 005** (`specs/005-lap-tick-simulation/`): races resolve as `LAP_COUNT` (10, fixed) discrete laps. Every item carries a per-lap magnitude and a lap-based cooldown gating recurring effects. Buff items come in two kinds — **flat** (no cooldown, constant boost every lap) and **stacking** (cooldown-gated, each firing permanently adds to a cumulative boost, additive not compounding). The ghost is a fixed-pace "control car" (a per-lap `lapTime`, no items/modifiers, no variance). A minimum lap-time floor guards against degenerate (zero/negative) lap times from aggressive stacking. The result exposes a full lap-by-lap breakdown (`ContestResult.laps`), which feature 006's visualizer consumes directly.
- **Shipped as feature 006** (see Race presentation above): the connection between this lap-tick model and Spectation-First — explicitly unresolved at the time 005 was written — is now resolved. The visualizer derives real car pacing and item-firing callouts directly from `laps[]`.
- **Still not designed**: how `LAP_COUNT` is set and how/whether it scales across a run — this remains tied to the still-undesigned run/encounter structure below, deliberately left as a fixed constant in 005 rather than solved prematurely. A ghost with its own recorded build/items (rather than a fixed constant pace) is also still out of scope — a much larger future feature (real async ghost recording), explicitly not this one.
- Item synergy beyond 003's original buff item and 005's flat/stacking mechanism (richer, multi-axis combos) remains open — tracked in `specs/DEFERRED.md`.

## Run structure / encounter system (long-term direction, not yet designed)
- A run is not just "a sequence of contests" — it's divided into discrete encounters (The Bazaar's "day, ~10 encounters" structure is the reference point, though the intent is explicitly *not* to copy that system wholesale, just to borrow the shape).
- Encounter **type** determines both how many items are on offer and how they're offered — e.g., a shop-type encounter lets the player buy as many items as they can afford, with a limited number of restocks; a reward-type encounter simply hands over one item; a PvP-type encounter *is* a contest (see Core loop); PvE-type encounters are a third thing entirely, not yet designed.
- This creates two layers of player choice, not one: first, which encounter to engage with (or how to route through the day/run — "where to look"), and second, what to actually take once inside that encounter ("what to pick from what you found"). Item-slot decisions (see Build constraints) are the second layer; the first layer doesn't exist yet in any shipped feature.
- **Explicitly not designed yet**: how many encounters make up a run, the mix/ratio of encounter types, whether the player has any say over which encounter comes next or it's fixed/random, what a shop's economy (currency, prices, restock rules) looks like, and what PvE encounters even are in this game. All of this is real design work for a dedicated future feature — not something to retrofit into the item-slot mechanic (`002-item-slots`), which uses a simple placeholder offer sequence specifically so it doesn't have to wait on this.
- Surfaced during `002-item-slots`'s clarify phase, when a question about "how many rounds before a contest" exposed that no run/encounter structure existed yet to answer it from.

## Status
Six features shipped and playable:
- **001 core loop** (`specs/001-core-loop/`): the prepare→contest loop itself.
- **002 item slots** (`specs/002-item-slots/`): flat slot cap + evict-to-add, placeholder offer sequence.
- **003 item pool & draft** (`specs/003-item-pool-draft/`): a 10-20 item pool, Performance-identity draft weighting (~75%/25%), first item-synergy step (one buff item).
- **004 board & storage UI** (`specs/004-board-storage-ui/`): drag-and-drop board/storage prepare UI, Next/Refresh controls, one active-while-stored item.
- **005 lap-tick simulation** (`specs/005-lap-tick-simulation/`): races resolve as 10 discrete laps; per-lap item cooldowns; flat/stacking buffs; fixed-pace ghost; minimum lap-time floor.
- **006 race visualizer** (`specs/006-race-visualizer/`): a watched ~20-second animated race, item callouts, live leader/gap indicator — Constitution Principle IV (Spectation-First) is now **satisfied**, not just respected.

**Still open**: the run/encounter structure (above) — the single biggest remaining gap, since `LAP_COUNT`, the offer sequence, and the Refresh allowance all currently use placeholder constants pending this design; theme (constitution `TODO(THEME)`); item synergy beyond 003/005's illustrative examples; additional team identities (Driver/Strategy, Unsportsmanlike/Scoring) and the team-selection UI to choose between them; weight as a possible future soft constraint; Build Testing Access (Constitution Principle V, non-negotiable, not yet designed at all); a richer ghost with its own recorded build (real async ghost recording); and whether data-visibility itself should be a build choice (Race presentation, above).
