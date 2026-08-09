# Feature Specification: Entrant Selection & Named-Vehicle Garage

**Feature Branch**: `010-entrant-vehicle-garage`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Add a character selection screen for the four committed launch entrants and replace the generic board with each entrant's actual named-car topology garage, preserving equal capacity, open item legality, deterministic contests, and the prepare-to-contest structure."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose an entrant and named vehicle (Priority: P1)

Before a new run begins, the player chooses Evelyn Mercer with *The Highwheel*, Lucien Soto with *The Needle*, Inez Rook with *The Lark*, or Nell Voss with *The Hush*. A shared inspection area communicates each entrant's identity, background, origin ecosystem, named vehicle, and topology while making clear that the choice biases opportunities rather than locking a strategy.

**Why this priority**: The entrant is the player's identity for the entire run and determines both the vehicle they prepare and the origin weighting applied to acquisition. A run cannot carry the intended identity without this deliberate first choice.

**Independent Test**: Start a new run, inspect all four entrants, select one, and confirm that no run state is created until the player explicitly enters the championship with the selected entrant.

**Acceptance Scenarios**:

1. **Given** no run has started, **When** the player opens entrant selection, **Then** all four committed entrants and their named vehicles are available and none is presented as locked, stronger, or a required strategy class.
2. **Given** the player highlights an entrant, **When** the shared details are shown, **Then** the player can identify the entrant's background, origin ecosystem, several supported strategic directions, named vehicle, and Power/Chassis/Flex distribution.
3. **Given** any entrant is highlighted, **When** the player compares them with another entrant, **Then** the screen states that baseline pace, four active slots, three storage spaces, and contest rules are equal for all entrants.
4. **Given** an entrant is selected, **When** the player confirms Enter Championship, **Then** a new run begins with that entrant, named vehicle, origin weighting, and topology.
5. **Given** the player has not confirmed a selection, **When** they leave and return to the screen, **Then** no run progress, credits, offers, or contest result has been created.

---

### User Story 2 - Prepare the named vehicle in a real garage (Priority: P1)

During preparation, the player works on the selected entrant's named machine in a garage or workshop rather than placing items on a generic board. The vehicle silhouette, its four authored mounting slots, and separate three-space storage area remain legible while the player acquires, compares, installs, stores, swaps, or evicts items.

**Why this priority**: The vehicle is the build. Replacing only the selection screen while retaining an abstract board would fail to carry entrant identity into the core preparation decision.

**Independent Test**: Enter a preparation encounter with each entrant and verify that the correct named vehicle and topology appear, that all four active positions and three storage spaces are usable, and that no active build region is called a board.

**Acceptance Scenarios**:

1. **Given** an active run, **When** the player enters a Parts Supplier or Reward Draft, **Then** the selected named vehicle is the central build surface and its slot types and occupied states are visible before any item is selected.
2. **Given** the four launch vehicles, **When** their garages are compared, **Then** each has exactly four active slots and three storage spaces with these distributions: Highwheel 1 Power/2 Chassis/1 Flex; Needle 2 Power/1 Chassis/1 Flex; Lark 1 Power/1 Chassis/2 Flex; Hush 2 Power/2 Chassis/0 Flex.
3. **Given** two open slots of the same type, **When** an item moves between them, **Then** its contest behavior is unchanged because same-type position, adjacency, and screen coordinates have no gameplay meaning.
4. **Given** an item is moved between the vehicle and storage, **When** the move completes, **Then** the vehicle and storage update atomically and the item is neither duplicated nor lost.
5. **Given** an offered item and no acceptable open destination, **When** the player chooses to keep it, **Then** the displaced item and the consequences of replacement are shown before confirmation; cancellation restores the prior build.

---

### User Story 3 - Understand installation behavior before committing (Priority: P1)

Every item can be installed into every active slot. Before committing a placement, the player sees whether the result is Fitted, Flexible, or Improvised and the exact item-authored behavior that state produces. The comparison includes the currently installed item when a destination is occupied.

**Why this priority**: Topology is only a meaningful, fair decision when players can predict its visible consequences. Hidden or universal fit math would violate the project's transparency requirement.

**Independent Test**: Take one Power item and preview it in Power, Flex, and Chassis slots, then repeat with one Chassis item. Verify that all destinations remain legal and each preview describes the exact resulting behavior before placement.

**Acceptance Scenarios**:

1. **Given** an item matches a typed destination, **When** the destination is previewed, **Then** it is labeled Fitted and shows the base effect plus that item's authored Fitted effect.
2. **Given** an item is previewed in a Flex slot, **When** the player inspects the result, **Then** it is labeled Flexible and shows base behavior without a Fitted effect or Improvised consequence.
3. **Given** an item conflicts with a typed destination, **When** the destination is previewed, **Then** it remains a legal destination labeled Improvised and shows the lost Fitted effect plus the item's exact authored Improvised behavior or its explicit lack of an additional consequence.
4. **Given** an occupied destination, **When** the player compares the offered or stored item with the installed item, **Then** both items' resulting effects, installation states, and displacement outcome are visible before confirmation.
5. **Given** the same item in two different installation states, **When** the player opens its details, **Then** the authored item definition is unchanged and only the state-dependent behavior differs.

---

### User Story 4 - Use the garage without relying on drag or hover (Priority: P2)

Mouse players may drag items, while touch and keyboard players can select an item, inspect it persistently, and choose a destination. Required item and topology information is available without hover, and focus, selection, disabled, storage, and installation states use more than color alone.

**Why this priority**: The workshop is a repeated core workflow. Interaction parity and persistent information are necessary for accessibility and for the narrow displays identified in the experience audit.

**Independent Test**: Complete the same acquire, install, move, swap, store, compare, cancel, and evict sequence once with drag, once with selection-and-destination controls, and once with keyboard navigation; confirm all three produce the same build.

**Acceptance Scenarios**:

1. **Given** an item can be moved by dragging, **When** the player instead selects it and activates a destination, **Then** the same preview, confirmation rules, and final build apply.
2. **Given** keyboard-only input, **When** the player navigates the workshop, **Then** every offer, active slot, storage space, item detail, cancel action, and encounter action is reachable with a visible focus state.
3. **Given** a touch device or reduced-motion preference, **When** the player completes preparation, **Then** no required information or action depends on hover, precision dragging, or motion.
4. **Given** Power, Chassis, Flex, Fitted, Flexible, Improvised, selected, and unavailable states, **When** they are displayed, **Then** each uses a label or icon and a structural treatment in addition to color.

---

### User Story 5 - Carry entrant and topology through the run and contest (Priority: P2)

The chosen entrant, named vehicle, origin weighting, and current installed topology persist through every encounter in the run. Starting a contest locks an immutable build; playback and results retain the vehicle identity and explain meaningful Fitted or Improvised contributions without accepting contest input.

**Why this priority**: Selection and installation choices must affect the complete run and remain explainable at the moment their effects matter, while preserving deterministic, input-free races.

**Independent Test**: Select each entrant in a controlled run, acquire from the same controlled offer sequence, arrange a topology-aware build, and complete a contest. Verify the expected origin weighting and installation states persist and that identical locked contest inputs produce identical results.

**Acceptance Scenarios**:

1. **Given** a selected entrant, **When** a weighted draft draw is resolved, **Then** the deterministic branch selects eligible items from that entrant's origin at weight 0.75 and otherwise selects from eligible items carrying any other origin, while all offered items remain legal for every entrant and slot.
2. **Given** a prepared vehicle, **When** the player moves through the run hub, another encounter, race briefing, contest, result, and run summary, **Then** the entrant, vehicle, item locations, and installation states remain consistent.
3. **Given** the player starts a scored contest, **When** playback begins, **Then** the locked vehicle resolves to completion without steering, item movement, tuning, or other contest input.
4. **Given** a Fitted effect or Improvised consequence changes a contest event, **When** playback or results explain that event, **Then** the responsible item, installation state, authored behavior, and contribution are inspectable.
5. **Given** identical entrant, build, item states, opponent, lap count, and run inputs, **When** the contest is repeated, **Then** its simulation outcome is identical regardless of presentation speed, input method, viewport, or animation preference.
6. **Given** a run has been completed or abandoned, **When** its final screen is shown, **Then** no different entrant or replacement run is created or selected, and entrant selection remains unavailable until the player explicitly chooses the return or new-run action that leads to entrant selection.

### Edge Cases

- If no entrant is selected, Enter Championship remains unavailable and explains that an entrant must be chosen; no default entrant is silently committed.
- Reconfirming or revisiting the selected entrant during an active run cannot change entrant, vehicle, topology, origin weighting, or already generated run state.
- A category mismatch is never an invalid placement. Only capacity or state conflicts, such as replacing an occupied destination without confirmation, may block commitment.
- An item with no additional Improvised consequence still visibly loses its Fitted effect and explicitly reports that no further mismatch consequence applies.
- A vehicle with no Flex slots remains fully playable because every item is legal in every typed slot; the absence of Flex is shown before entrant confirmation.
- Moving an item to storage removes its installation state. Stored items use their authored storage behavior only: inert by default, with any active-while-stored behavior shown explicitly and without a Fitted or Improvised state.
- If active slots and storage are full, accepting an offer requires a visible eviction/replacement decision or an explicit decline; no item is discarded implicitly.
- Cancelling a drag, selection, comparison, swap, or eviction returns all affected items to their prior locations and states.
- Duplicate items remain distinct copies and may occupy separate slots; this feature does not introduce combining or upgrading.
- Long item names, effect text, and translated-length labels must not cover slots, controls, or other required values.
- Missing or inconsistent entrant/topology run state produces an unavailable recovery state rather than substituting another entrant, vehicle, or generic board.
- Completing or abandoning a run preserves the ended run's entrant context until the player explicitly chooses a return or new-run action; reaching entrant selection never creates or preselects a replacement entrant.
- The Lark's propeller and all other silhouette differences remain presentation and build identity; they do not create flight, alternate movement, or private contest rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every new run MUST require deliberate selection and confirmation of exactly one of four entrants before run creation: Evelyn Mercer, Lucien Soto, Inez Rook, or Nell Voss.
- **FR-002**: Entrant selection MUST pair Evelyn with *The Highwheel* and Coachworks, Lucien with *The Needle* and Velodrome, Inez with *The Lark* and Fieldworks, and Nell with *The Hush* and Backroads.
- **FR-003**: Entrant selection MUST communicate each entrant's identity, approach to racing, origin/item-pool weighting, named vehicle, vehicle silhouette, and topology without describing any entrant as a locked strategy class or sole owner of a broad strategy.
- **FR-004**: Entrant comparison MUST state that all four choices have equal baseline pace, exactly four active slots, exactly three storage spaces, and identical contest rules.
- **FR-005**: The confirmed entrant MUST be immutable for the duration of the run and MUST control the run's named vehicle, origin weighting, presentation identity, and authored slot distribution.
- **FR-006**: Each weighted draft draw MUST use the existing deterministic draft contract with a 0.75 home-origin branch that selects from eligible items carrying the selected entrant's origin; the remaining 0.25 branch MUST select from eligible items carrying any other origin. Origin MUST NOT determine item legality, installation category, exclusive strategy access, or a locked character class.
- **FR-007**: The active preparation surface MUST be presented and labeled as the selected named vehicle in a garage or workshop and MUST replace generic BOARD terminology and presentation wherever the player manages the active build.
- **FR-008**: Every vehicle MUST have exactly four active slots distributed as follows: Highwheel 1 Power/2 Chassis/1 Flex; Needle 2 Power/1 Chassis/1 Flex; Lark 1 Power/1 Chassis/2 Flex; Hush 2 Power/2 Chassis/0 Flex.
- **FR-009**: Every vehicle MUST have exactly three storage spaces governed by the same storage, movement, swap, capacity, and active-while-stored rules; storage MUST have no Power, Chassis, Flex, Fitted, Flexible, or Improvised affinity.
- **FR-010**: Every playable item MUST have exactly one origin, exactly one installation category of Power or Chassis, its existing base behavior, an authored Fitted behavior, and either an authored Improvised consequence or an explicit statement that mismatch only forfeits the Fitted behavior.
- **FR-011**: Every item MUST remain legal in every active slot regardless of category, origin, vehicle, entrant, or current build composition.
- **FR-012**: Matching a Power or Chassis item to the same typed slot MUST create the Fitted state and apply the item's base behavior plus its authored Fitted behavior.
- **FR-013**: Installing any item in a Flex slot MUST create the Flexible state and apply base behavior only, without its Fitted behavior or an Improvised consequence.
- **FR-014**: Installing an item in a conflicting typed slot MUST create the Improvised state and apply base behavior plus the item's visible authored Improvised consequence when one exists; mismatch MUST NOT be styled or treated as an illegal action.
- **FR-015**: The feature MUST NOT introduce a universal fit bonus, mismatch penalty, hidden alignment modifier, or other installation math not authored and displayed on the individual item.
- **FR-016**: Before placement commitment, every candidate destination MUST show its slot type, resulting Fitted/Flexible/Improvised state, exact changed effect or trigger text, lost behavior where applicable, and any item that would be displaced.
- **FR-017**: Item details MUST expose name, origin, Power/Chassis category, synergy tags, base effect, trigger or cooldown, Fitted effect, Improvised behavior, active-while-stored behavior, and encounter price or affordability when relevant; required details MUST NOT depend on hover.
- **FR-018**: The garage MUST support offered-item placement, active-slot rearrangement, vehicle-to-storage movement, storage-to-vehicle movement, swaps, comparisons, eviction, decline, and cancellation without duplicating or losing items.
- **FR-019**: Position among slots of the same type, adjacency, silhouette mounting coordinates, and item ordering MUST have no gameplay meaning in this feature.
- **FR-020**: Mouse users MUST be able to drag or select then place; touch users MUST be able to select, inspect, and choose a destination without dragging; keyboard users MUST be able to reach and activate every item, slot, storage space, inspector action, and encounter action.
- **FR-021**: Power, Chassis, Flex, Fitted, Flexible, Improvised, focus, selection, occupied, storage-active, disabled, and unavailable states MUST be distinguishable without color alone.
- **FR-022**: The garage MUST provide persistent item comparison that shows the candidate and current occupant, their resulting installation behavior, and the exact swap, storage, or eviction outcome before an irreversible replacement.
- **FR-023**: The selected entrant, named vehicle, installed items, storage, topology, and installation states MUST persist across all encounters, race briefing, contest playback, results, and run summary until the run ends.
- **FR-024**: Starting a contest MUST lock an immutable snapshot of the current installed vehicle and storage. The contest MUST run to completion without steering, tuning, item actions, or other outcome-changing player input.
- **FR-025**: Installation behavior MUST be part of deterministic contest resolution. Identical locked inputs MUST produce identical outcomes, and presentation controls or viewport changes MUST NOT affect simulation results.
- **FR-026**: Contest playback and results MUST preserve recognizable entrant/vehicle identity and topology ordering and MUST identify consequential Fitted effects and Improvised consequences from immutable contest data.
- **FR-027**: The feature MUST preserve the established six-stage run, encounter economy, acquisition rules, scheduled 10- and 12-lap contests, sponsor resolution, and fixed-pace ghost behavior except where the generic board is directly replaced by the named vehicle topology.
- **FR-028**: The feature MUST fit the demo's existing 800x450 landscape game architecture while ensuring that all primary controls, four active slots, storage, and item details are visible or intentionally reachable at 1920x1080, 1366x768, 1024x768, and 390x844 without horizontal page scrolling or clipped interaction regions.
- **FR-029**: On narrow portrait displays, the selection and garage regions MUST reflow into an intentional reading and interaction order with touch selection parity; they MUST NOT rely on shrinking labels or targets below legible and operable sizes.
- **FR-030**: Supporting interface text MUST render at no less than 14 CSS pixels and interactive labels at no less than 16 CSS pixels at final display size; dynamic content MUST remain within its allocated region without overlap.
- **FR-031**: Vehicle silhouettes, workshop materials, typography, labels, and transitions MUST express the alternate-history 1901 championship through legible 2D presentation while preserving stable slot locations and shared semantic state treatments.
- **FR-032**: Motion MUST explain selection, installation, displacement, storage, and phase transitions without carrying exclusive information; reduced-motion presentation MUST preserve the same decisions and outcomes.
- **FR-033**: Confirming an entrant MUST transition into the existing run flow, and preparation MUST transition into the existing contest flow only through its defined encounter actions. Completing or abandoning a run MUST NOT create, select, or preselect a different entrant or replacement run; the player MUST explicitly choose the provided return or new-run action before entrant selection becomes available.
- **FR-034**: Missing or invalid entrant, vehicle, topology, item-installation, or run context MUST show an explicit unavailable or recovery state and MUST NOT silently create a replacement run, substitute generic slots, or choose a default entrant.
- **FR-035**: This feature MUST NOT introduce entrant active/passive abilities, unequal capacity or baseline statistics, spatial packing, adjacency effects, item combining/upgrading, live opponents, live contest control, a private movement model, or a universal installation modifier.

### Key Entities

- **Entrant**: One committed owner-builder available before a run; carries a name, identity presentation, origin ecosystem, approach-to-racing copy, named vehicle relationship, and selection state. It does not carry a statistical passive or exclusive strategy.
- **Origin**: Coachworks, Velodrome, Fieldworks, or Backroads; weights acquisition offers and communicates thematic source independently of installation category and synergy tags.
- **Named Vehicle**: The Highwheel, The Needle, The Lark, or The Hush; has an entrant owner, silhouette identity, equal baseline performance, four authored active slots, and three storage spaces.
- **Vehicle Topology**: The immutable per-vehicle distribution of Power, Chassis, and Flex slots selected with the entrant. Screen coordinates and ordering among same-type slots are presentation only.
- **Vehicle Slot**: One active installation position with a Power, Chassis, or Flex type and at most one installed item.
- **Stored Position**: One of three non-installed holding spaces. Storage is inert by default and has no installation state; item-authored storage exceptions remain visible.
- **Item Definition**: Authored content containing origin, Power/Chassis installation category, synergy tags, base behavior, Fitted behavior, Improvised behavior disclosure, and existing trigger, cooldown, price, and storage properties.
- **Installed Item**: A distinct item copy associated with one vehicle slot and a derived visible state of Fitted, Flexible, or Improvised. Moving it does not mutate its definition.
- **Run Identity**: The run-scoped immutable association among selected entrant, origin weighting, named vehicle, and topology that is carried through encounters and results.
- **Locked Contest Build**: An immutable contest input containing the installed vehicle, installation states, and storage used to resolve and explain one scored race.

### Dependency and Release Gate

- Feature 010 implementation and release are blocked until the constitution-required Build Testing Access/Test Day slice is implemented and validated. The authoritative dependency is `specs/visual-overhaul.md` **UI-FR-022**, which requires Build Testing Access before later overhaul slices are treated as a release boundary.
- Feature 010 does not implement, redefine, partially absorb, or waive Test Day. Its unchanged-run behavior remains owned by the separately scoped visual-overhaul requirement **UI-FR-023** and its dedicated slice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **Participant observation protocol for SC-001, SC-002, SC-003, and SC-011**: Use at least 5 representative first-time or demo users who have not received external instruction on the evaluated workflow. For each participant, record task completion, elapsed time where applicable, each requested identification or explanation, each observed placement prediction, and the moderator's visual-review responses. Calculate and retain the pass rate for each criterion against its stated threshold; these are moderated user-observation outcomes, not substitutes for or results from automated tests.
- **SC-001**: In the participant protocol, at least 90% of participants inspect all four entrants, explain that selection biases the draft rather than locking a strategy, and begin a run with their intended entrant in under 2 minutes without external instructions.
- **SC-002**: In the participant protocol, 100% of participants identify each entrant's named vehicle and exact topology and correctly state that all entrants have four active slots, three storage spaces, and equal baseline pace.
- **SC-003**: In the participant protocol, at least 95% of recorded placement decisions correctly identify before commitment whether the result is Fitted, Flexible, or Improvised and the exact behavior gained, retained, or lost.
- **SC-004**: Across the complete playable item catalog, 100% of items are legally previewable and installable in every active slot, and every preview discloses its resulting behavior without a hidden universal modifier.
- **SC-005**: The same acquisition, install, move, swap, store, compare, cancel, and evict workflow produces an identical final build when completed by drag, non-drag pointer/touch selection, or keyboard input.
- **SC-006**: Across one complete run for each entrant, 100% of encounters, contests, results, and summaries retain the confirmed entrant, named vehicle, correct topology, origin weighting, item locations, and installation states without reverting to generic-board identity.
- **SC-007**: For identical locked contest inputs, 100 repeated resolutions produce identical race outcomes regardless of presentation speed, reduced motion, viewport, or player input during playback.
- **SC-008**: In every contest where a Fitted effect or Improvised consequence changes a recorded event, playback or results identify the responsible item, state, and authored contribution; unexplained installation-derived outcome modifiers occur zero times.
- **SC-009**: At 1920x1080, 1366x768, 1024x768, and 390x844, all primary actions, entrant choices, four active slots, storage spaces, and item details are reachable with zero horizontal page scrolling and zero clipped interaction targets.
- **SC-010**: Acceptance requires completing entrant selection and one full preparation encounter independently through a keyboard-only path and through a touch-only path. Each path MUST expose 100% of required information without hover, and all state distinctions MUST remain understandable in monochrome review.
- **SC-011**: In the participant protocol's moderated visual review, at least 4 of every 5 participants identify the screen as an early-motoring garage or workshop and distinguish all four vehicle silhouettes without period styling obscuring item values or controls.

## Assumptions

- This feature is the dedicated balance decision anticipated by `specs/vehicle-topology.md`; four active slots provide enough room for four distinct launch topologies while preserving a compact demo-scale workshop. The increase from the prototype's three active positions is intentional and applies equally to every entrant.
- Storage remains at the shipped capacity of three for every entrant. Equal active capacity and equal storage are required across entrants, but active capacity and storage capacity need not equal each other.
- The Highwheel's Chassis emphasis, Needle's Power emphasis, Lark's additional Flex capacity, and Hush's fully typed balance express machine construction rather than character strategy ownership. Every origin must still contain meaningful Power and Chassis items.
- Existing playable items are migrated into the independent origin, installation-category, and synergy-tag model needed by this feature. A complete final launch catalog, rarity distribution, and final synergy taxonomy remain separate content work.
- The selected entrant persists for the active run, not across a newly started run. Durable cross-session resume remains governed by the run-progression feature and is not added here.
- Existing item acquisition, prices, credits, sponsor contracts, duplicate-copy behavior, storage movement, active-while-stored exceptions, and run history remain authoritative unless a requirement above explicitly adapts their presentation to topology.
- Storage-active items use their visible authored storage behavior only while stored; they receive no installation-derived Fitted, Flexible, or Improvised behavior until installed.
- Representative ecosystem language and strategic breadth come from `specs/launch-roster.md`; final biographies, nationalities, dialogue, costume sheets, and production character art remain content/art decisions.
- The current 800x450 game architecture remains the logical landscape composition constraint. Responsive presentation may reflow information for portrait use but does not change contest rules or create a separate mobile game mode.
- The championship introduction, full title menu, settings suite, Test Day, race settlement overhaul, and broader visual-overhaul screens remain separately scoped unless required to connect this feature to the currently existing run and contest transitions. This scope boundary does not relax the Build Testing Access/Test Day release gate above.

## Out of Scope

- Entrants beyond Evelyn Mercer, Lucien Soto, Inez Rook, and Nell Voss.
- Entrant-specific numerical passives, activated abilities, private item legality, exclusive strategies, or different contest rules.
- A complete four-origin launch item catalog, final rarity/price balance, final synergy taxonomy, or comprehensive character biographies and dialogue.
- Spatial packing, adjacency, directional mounting, slot-order effects, vehicle weight as a shared rule, or item combining and upgrades.
- Real player ghost recording, matchmaking, live multiplayer, steering, or any contest-phase build intervention.
- Title-menu, Continue Championship, Test Day, global settings, full run-HUD, race-settlement, and run-summary redesign work not needed to preserve entrant/vehicle continuity. Test Day remains an external prerequisite under `specs/visual-overhaul.md` UI-FR-022 rather than work absorbed into feature 010.
- Final production illustrations, animation sets, audio, localization, or a theme-wide replacement of every existing screen.