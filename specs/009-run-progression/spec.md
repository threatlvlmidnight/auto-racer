# Feature Specification: Run Progression — Encounter Structure

**Feature Branch**: `009-run-progression`

**Created**: 2026-08-08

**Status**: Planned - tasks ready for implementation

**Input**: User description: "Create the smallest coherent run-progression slice that replaces the placeholder five-offer prepare sequence with multiple discrete encounters and contests. The first encounter catalog contains Parts Supplier, Reward Draft, Sponsor Meeting, and PvP Race. Later encounter expansion will add Rival Scouting, Scrutineering, Factory Development, and potentially Privateer Exchange."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Progress through a run of discrete encounters (Priority: P1)

A player starts a run and advances through a visible sequence of discrete encounters. Each completed encounter advances run progress exactly once while preserving the player's current board and storage for the next encounter. The run contains both opportunities to improve the build and PvP contests, replacing the existing fixed sequence of five single-item offer rounds.

**Why this priority**: This is the minimum progression loop the feature exists to establish. Without durable run progress and encounter boundaries, the game remains a repeated prepare screen followed by a contest rather than a run.

**Independent Test**: Start a run, complete at least one build-changing encounter and more than one PvP contest, and confirm the encounter position advances once after each completion while the resulting build persists until the run reaches its defined end.

**Acceptance Scenarios**:

1. **Given** a newly started run, **When** the player views their next step, **Then** they can identify the available encounter choice or choices, each encounter's type, and current run progress before committing.
2. **Given** an encounter has been completed, **When** the next encounter becomes available, **Then** the run advances exactly one encounter and preserves the player's resulting board and storage.
3. **Given** a run in progress, **When** the player completes successive acquisition and PvP encounters, **Then** each is recorded as a distinct encounter rather than as another round of one repeated offer sequence.
4. **Given** the final required encounter is completed, **When** progression resolves, **Then** the run ends once and no additional encounter can be entered from that completed run.

---

### User Story 2 - Choose where to engage, then what to take (Priority: P1)

At each decision point, the player first chooses which available encounter to engage with. After entering an acquisition encounter, the player makes a separate choice about which offered item, if any, to take using the existing board, storage, decline, and eviction rules. The encounter type controls how many items are offered and the rules for receiving them; entrant identity continues to weight which item tags appear.

**Why this priority**: The two-layer decision is the defining addition over the placeholder flow. Merely wrapping the same offer in an encounter label would not deliver the requested structure.

**Independent Test**: At one progression step, choose between at least two visible encounter options; enter an acquisition encounter; then independently choose among its item outcome or outcomes. Confirm the encounter choice does not itself choose or place an item.

**Acceptance Scenarios**:

1. **Given** a run decision point, **When** the player reviews available encounters, **Then** they can distinguish their encounter types and choose one without making an item decision at the same time.
2. **Given** the player enters an acquisition encounter, **When** its offers are revealed, **Then** the encounter's type determines both the number of items offered and the rules by which the player may receive them.
3. **Given** an acquisition encounter offers items, **When** those items are selected for presentation, **Then** the current entrant's identity weights their tags without changing board or storage capacity.
4. **Given** an offered item, **When** the player accepts, declines, stores, or replaces an item, **Then** the shipped generic board, storage, and eviction rules remain in force.

---

### User Story 3 - Enter a PvP encounter as a complete contest (Priority: P1)

When the player chooses or reaches a PvP encounter, the encounter runs the existing 1v1 race against a ghost from start to finish without live player input. The race result is attached to that encounter, after which the player returns to run progression with the same build.

**Why this priority**: PvP encounters connect the new progression structure to the shipped prepare-to-contest game. A run with acquisition but no contests would not be a coherent vertical slice of Auto Racer.

**Independent Test**: Enter a PvP encounter from an active run, watch the existing race complete, inspect its result, and continue to a later encounter without losing or mutating the build used for that race.

**Acceptance Scenarios**:

1. **Given** an active run and a PvP encounter, **When** the player enters it, **Then** the shipped ghost race starts with the player's current active build and permits no live build changes or race control.
2. **Given** a PvP race finishes, **When** its result is shown, **Then** the result remains inspectable through the shipped race and result presentation and is associated with the completed encounter.
3. **Given** the player continues after a PvP result, **When** the next run decision appears, **Then** their board and storage match the build that entered the contest.

---

### User Story 4 - Understand run status and completion (Priority: P2)

Throughout a run, the player can tell where they are, what encounter types they have completed, what is currently available, and what remains before the run ends. At completion, they receive a concise run summary covering their encounter path and PvP outcomes.

**Why this priority**: Progression must be legible to be strategically meaningful, but the encounter loop can be validated before the final summary is polished.

**Independent Test**: Complete a run and verify that its displayed history contains every completed encounter in order, identifies all PvP outcomes, and clearly distinguishes the completed state from an active run.

**Acceptance Scenarios**:

1. **Given** an active run, **When** the player views run status, **Then** they can identify completed encounters in order, the current decision point, and the remaining progression required.
2. **Given** a completed run, **When** the summary appears, **Then** it shows the encounter path and every PvP win/loss/tie outcome in chronological order.
3. **Given** a completed run, **When** the player leaves its summary, **Then** they can start a fresh run without carrying encounter progress from the completed run.

### Edge Cases

- Declining every item in an acquisition encounter is valid; the encounter still completes and the unchanged build carries forward.
- An acquisition encounter may produce no eligible item after applying its defined offer rules; the player must be able to leave it without corrupting run progress or build state.
- Entering, refreshing, or returning from a view must not complete the same encounter twice or skip the next encounter.
- A PvP result does not directly add, remove, or rearrange items; only an encounter whose defined outcome changes the build may do so.
- Duplicate-item acquisition keeps the current distinct-copy behavior until the deferred duplicate/upgrade rule is designed.
- A run may end with empty board slots, unused storage, or no accepted items; none of these states blocks progression.
- If run state cannot be resumed, the player must be shown that the run is unavailable rather than silently starting at a different encounter or reconstructing a different path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent a run as an ordered progression of individually identifiable encounters with a start, current position, completed history, and terminal completed state.
- **FR-002**: The first implementation MUST support completing multiple encounters and more than one PvP contest within one run.
- **FR-003**: The system MUST replace the fixed five-round single-item offer sequence as the top-level progression structure; item offers MUST occur only as outcomes of acquisition encounters.
- **FR-004**: At each choice stage, the system MUST randomly present two distinct encounters selected from Parts Supplier, Reward Draft, and Sponsor Meeting before the player commits, including enough information to distinguish their types and outcomes.
- **FR-005**: A run MUST contain six encounter stages: four choice stages where the player chooses one of two presented encounters, plus two scheduled PvP Race stages after the second and fourth choice stages.
- **FR-006**: Choosing an encounter MUST be separate from choosing an item or other reward within that encounter.
- **FR-007**: Every acquisition encounter type MUST define both how many items it offers and the rules by which the player may receive, decline, or reroll those items.
- **FR-008**: The first implementation MUST contain exactly four encounter types: Parts Supplier, Reward Draft, Sponsor Meeting, and PvP Race. PvE and the phase-two encounter catalog are outside this feature.
- **FR-009**: Item generation within acquisition encounters MUST preserve the shipped identity-weighted draft behavior, including occasional off-identity offers.
- **FR-010**: Entrant identity MUST NOT change total active item capacity or storage capacity. This feature MUST preserve the currently shipped generic-slot placeholder and MUST NOT implement or contradict the future Power/Chassis/Flex topology defined in `specs/vehicle-topology.md`.
- **FR-011**: Accepted items and all board/storage changes MUST persist across subsequent encounters in the same run.
- **FR-012**: Acquisition decisions MUST preserve the shipped accept, decline, eviction, board, storage, and active-while-stored rules except where an explicitly selected encounter rule changes offer quantity or acquisition method.
- **FR-013**: A PvP encounter MUST use the shipped 1v1 ghost contest loop, lap-by-lap simulation, race presentation, and result review without live player input.
- **FR-014**: Completing a PvP encounter MUST record its outcome in run history and return the player to progression without directly changing their build.
- **FR-015**: The first PvP race MUST use 10 laps and the second PvP race MUST use 12 laps. Build Testing Access MUST remain explicitly scheduled as the immediate follow-up feature rather than being represented by an incomplete interaction in this slice.
- **FR-016**: An encounter MUST advance run progress at most once, and only after its completion conditions are met.
- **FR-017**: The system MUST visibly distinguish available, active, completed, and unavailable encounters and MUST show the player's current run progress.
- **FR-018**: Completing the run MUST prevent further encounter entry from that run and MUST provide an ordered summary of encountered types and PvP outcomes.
- **FR-019**: Starting a new run after completion MUST reset encounter progress while retaining the same total capacities and identity-weighting rules.
- **FR-020**: This feature MUST NOT introduce live opponents, live contest input, additional entrant identities, final item uniqueness/upgrade rules, a theme-wide content or art conversion, or monetized competitive advantages.
- **FR-021**: Every item MUST have an authored integer price from 2 through 5 credits. A new run MUST start with 5 credits.
- **FR-022**: Reward Draft MUST present three identity-weighted items using the shipped weighted draft behavior and MUST allow the player to accept at most one or decline all three.
- **FR-023**: Parts Supplier MUST present three stock entries carrying the player's chosen identity tag, drawing with replacement when fewer than three eligible definitions exist. If no eligible definition exists, it MUST present an empty unavailable-stock state that the player can leave without spending credits. The player MAY buy any number of displayed items they can afford and MAY restock once per visit for 1 credit; restocking replaces all unpurchased stock.
- **FR-024**: At most one sponsor contract MAY be active at a time. Sponsor Meeting MUST NOT appear among random encounter choices while a contract is awaiting its next PvP result.
- **FR-025**: Every PvP race MUST award a 2-credit participation purse after its result, plus a 2-credit win bonus when the player wins.
- **FR-026**: Sponsor Meeting MUST offer one guaranteed immediate payout of 2 credits and two distinct conditional contracts selected from win-next-race, target-race-time, and trigger-tagged-items objectives. A successful conditional contract MUST award 7 credits after the next PvP race; a failed contract MUST award none.
- **FR-027**: A target-race-time contract MUST derive from the run seed and store a whole-second target from 3 through 6 seconds below the unmodified spec car's total time for that race's lap count, and MUST show that exact target before acceptance.
- **FR-028**: A tagged-item-trigger contract MUST require 10 firing events from items carrying the player's chosen identity tag during the next PvP race and MUST show current and required counts in the resulting contract outcome.

### Key Entities

- **Run**: One bounded progression attempt; records its current position, available encounter choices, completed encounter history, active build, and completion state.
- **Encounter**: One discrete step in a run; has a type, availability state, completion conditions, and an outcome. Its type determines whether it changes the build, runs a contest, or provides another defined interaction.
- **Encounter Choice**: A player-visible option to enter a particular available encounter. This is the first decision layer and is resolved before any within-encounter acquisition decision.
- **Acquisition Encounter**: An encounter whose rules define the number, selection, and receipt of item offers. Identity weighting affects the offered items; the current placeholder capacity remains unchanged in this feature.
- **PvP Encounter**: A scored 1v1 ghost race using the existing contest loop; records the race outcome but does not itself alter the build.
- **Run History Entry**: The immutable record of one completed encounter, including its type, chosen path position, relevant acquisition outcome, and PvP result when applicable.
- **Credits**: Run-scoped currency used at Parts Supplier; starts at 5, changes only through purchases, restocks, race purses, and sponsor payouts, and resets with a new run.
- **Sponsor Contract**: At most one run-scoped arrangement awaiting the next PvP result; records its objective, threshold when applicable, payout, and pending/succeeded/failed state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can start and complete one run containing multiple discrete encounters and at least two PvP contests without encountering the former five-offer top-level sequence.
- **SC-002**: At every choice stage, a player can identify both randomly selected, distinct encounter types and commit to one in no more than two deliberate actions.
- **SC-003**: In every acquisition encounter, a player makes an encounter choice and an item choice as two independently observable decisions; selecting the encounter never automatically accepts an item.
- **SC-004**: Across a complete run, 100% of accepted, declined, moved, stored, and evicted item decisions produce the same board/storage state in the next encounter that they produced when the prior encounter ended.
- **SC-005**: Every completed encounter appears exactly once and in the correct chronological position in run history; every PvP entry includes its win/loss/tie outcome.
- **SC-006**: For identical entrant identity and controlled item-draw inputs, acquisition encounter offers preserve the established identity weighting while board and storage capacities remain identical across all entrants.
- **SC-007**: A player reviewing run status can correctly state the current progression point, completed encounter types, and whether the run is active or complete without consulting external instructions.
- **SC-008**: All shipped PvP encounter outcomes and race breakdowns remain identical to the existing contest loop when given the same build, ghost, and lap-count rule.
- **SC-009**: For a controlled run seed, every credit balance after a supplier purchase, restock, race purse, and sponsor resolution exactly matches the specified transaction history and never falls below zero.
- **SC-010**: Every accepted sponsor contract resolves exactly once against the next PvP result, awards either 7 or 0 credits, records its outcome, and allows Sponsor Meeting to return to the random encounter pool.

## Assumptions

- The scope is a progression framework plus the selected Parts Supplier, Reward Draft, Sponsor Meeting, and PvP Race catalog, not a complete long-term content system.
- The run exposes a real first-layer encounter choice through two random, distinct non-PvP options at each choice stage. PvP stages remain scheduled rather than entering the random option pool.
- Existing item content, identity tags, approximately 75/25 identity weighting, board/storage capacities, duplicate-copy behavior, and item effects remain unchanged unless an encounter's clarified acquisition rule necessarily governs how offers are presented.
- Parts Supplier is the only shop in this slice. Its authored prices, stock, purchases, and restock rules replace rather than inherit the current one-refresh-per-round placeholder.
- Item prices are authored content rather than calculated dynamically from effect magnitude. Balance within the 2–5 range can change without changing the economy rules.
- Random encounter options and sponsor objective selection do not require cross-session reproducibility. A target-time contract is derived from the run seed and its accepted threshold is stored so returning to a view cannot change it.
- PvE has no assumed meaning. It is excluded unless clarification supplies a concrete player-facing purpose and completion rule for the first slice.
- PvP continues to use the current fixed-pace ghost; recording and selecting real player ghosts remains outside this feature.
- Build Testing Access is explicitly assigned to the feature immediately following this one because Constitution Principle V makes the capability non-negotiable. This slice does not use the Test Day name for a different or incomplete interaction.
- The alternate-1901 inaugural championship theme is established in `specs/vision.md`. This feature may use its vocabulary, but a theme-wide content and art conversion is not required for the run-progression slice.
- Run interruption/resume behavior is limited to preventing silent corruption or path changes; durable cross-session persistence is not required by this slice unless selected during planning.

## Out of Scope

- Designing additional entrant identities or changing identity-weight calculations.
- Changing generic board or storage capacity.
- Implementing Power/Chassis/Flex vehicle topology or migrating item content to installation categories and authored Fitted/Improvised behavior.
- Real asynchronous player-build recording, matchmaking, or live multiplayer.
- Final duplicate-item, item-upgrade, weight, or richer synergy systems.
- Final shop or PvE systems unless explicitly selected through clarification for the first encounter catalog.
- Rival Scouting, Scrutineering, Factory Development, and Privateer Exchange; these are reserved for the phase-two encounter catalog.
- Final balance tuning beyond the clarified run and encounter rules needed to make this slice testable.