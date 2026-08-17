# Feature Specification: Item Adjacency Buffs

**Feature Branch**: `[041-item-adjacency-buffs]`

**Created**: 2026-08-17

**Status**: Implementation-ready — Specify, Clarify, Plan, Tasks, and Analyze
complete; coding not started

**Input**: Add deterministic, legible item effects that reward intentional
placement beside qualifying installed items without making race resolution
order-dependent, recursive, or opaque.

## Clarifications

### Session 2026-08-17

- Q: What counts as adjacent in V1? → A: The immediately previous and next
  slots in the vehicle definition's stable authored slot order. End slots have
  one neighbor; inner slots have two. Runtime array order and rendered position
  are not authoritative.
- Q: What may an adjacency clause target? → A: Installation category and
  existing synergy tag only.
- Q: How do multiple sources stack? → A: Every qualifying immediate-neighbor
  contribution adds from the same pre-adjacency snapshot. Graph degree limits a
  target to two neighboring sources; there is no recursive propagation.
- Q: How does adjacency compose with tiers and amplifiers? → A: The source
  item's tier scales its authored adjacency magnitude. Existing Buff, Synergy,
  modification, setup, and other amplifier systems do not multiply adjacency.
- Q: How much playable content ships here? → A: Four representative items—one
  per origin ecosystem. Feature 042 owns the broader catalog expansion and
  synergy pass.

## User Scenarios & Testing

### User Story 1 — Build around meaningful neighbors (Priority: P1)

As a player, I can place an adjacency item beside qualifying equipment and gain
the exact promised effect, making slot order a meaningful preparation decision
in addition to Fitted, Flexible, and Improvised placement.

**Why this priority**: The feature has no value unless adjacency creates a
predictable build decision that changes the committed build through one shared
authoritative rule.

**Independent Test**: Starting from a fixed four-slot vehicle, move one authored
adjacency source among empty, qualifying, and non-qualifying neighbors. Confirm
only relationships in the canonical adjacency graph activate and that the
preview exactly matches the committed build and race evidence.

**Acceptance Scenarios**:

1. **Given** an adjacency source sits beside a qualifying installed item,
   **When** the build is previewed and committed, **Then** the qualifying target
   receives the authored effect and both source and target are identified.
2. **Given** a neighboring slot is empty or contains a non-qualifying item,
   **When** the same source is inspected, **Then** that link remains inactive
   and the unmet condition is visible without changing any stats.
3. **Given** an item moves between two legal slots, **When** the prospective
   build is previewed, **Then** only the relationships implied by the canonical
   before/after adjacency graph change.
4. **Given** the same slot contents are represented in a different array or UI
   traversal order, **When** adjacency resolves, **Then** the resulting build,
   evidence, and race result remain identical.

---

### User Story 2 — Understand adjacency before committing (Priority: P1)

As a player, I can see which slots and items an adjacency clause can affect,
which links are currently active, and the exact resulting contribution before I
install, move, replace, upgrade, or remove an item.

**Why this priority**: Spatial effects become trial-and-error without a truthful
preview. Transparency is required for the placement decision to be strategic.

**Independent Test**: With keyboard, pointer, and touch, inspect and preview a
dense build containing active, inactive, and competing adjacency clauses.
Confirm every target, condition, contribution, and total is discoverable without
hover or color alone.

**Acceptance Scenarios**:

1. **Given** an offered or held item has an adjacency clause, **When** it is
   inspected before placement, **Then** its target rule and possible neighboring
   destinations are stated even when no link is currently active.
2. **Given** a destination preview activates or breaks one or more links,
   **When** the player reviews it, **Then** the before/after view names every
   affected source, target, condition, and exact value.
3. **Given** multiple adjacency sources affect the same target, **When** the
   aggregate is shown, **Then** each individual contribution and the final total
   reconcile under the selected stacking rule.
4. **Given** the player cannot use hover or distinguish color, **When** they
   navigate adjacency information, **Then** text, icon/shape, focus, and
   persistent inspector evidence preserve the complete meaning.

---

### User Story 3 — Trust stable, bounded resolution (Priority: P1)

As a player, I get the same adjacency result from the same committed build every
time, with no recursive amplification, hidden ordering rule, or scene-specific
calculation.

**Why this priority**: Adjacency touches simulation-facing item values. An
order-dependent or presentation-owned resolver would violate fairness,
replayability, and async compatibility.

**Independent Test**: Resolve a corpus containing two sources, mutual targets,
chains, tiered items, modifications, configurable items, targeted amplifiers,
Fitted/Improvised states, and a maximum-density build under many stable
permutations. Confirm deep-equal contributions and contest results.

**Acceptance Scenarios**:

1. **Given** two adjacency sources can affect one target, **When** they resolve,
   **Then** the documented bounded stacking rule produces the same result in
   every resolver iteration order.
2. **Given** an item both receives an adjacency bonus and authors an adjacency
   clause, **When** the build resolves, **Then** the source cannot recursively
   propagate an already adjacency-amplified value unless the clarified contract
   explicitly and finitely permits it.
3. **Given** a committed build begins a contest, **When** playback runs at any
   speed or is skipped, **Then** adjacency cannot change and playback never
   recomputes it from scene state.
4. **Given** an existing item has no adjacency clause, **When** the feature is
   enabled, **Then** its resolved behavior and value remain unchanged.

---

### User Story 4 — Inspect adjacency contribution after the decision (Priority: P2)

As a player, I can inspect meaningful adjacency contributions during Test Day,
race playback, and Results when they affect an event or aggregate stat.

**Why this priority**: Post-commit evidence helps players connect arrangement
choices to outcomes without adding new outcome authority.

**Independent Test**: Commit a build with one active adjacency link, run Test
Day and a scored race, and confirm the immutable evidence names the source,
target, rule, value, and affected stat wherever the contribution is relevant.

**Acceptance Scenarios**:

1. **Given** an adjacency contribution changes a locked build stat, **When**
   pre-race or Test Day evidence is inspected, **Then** the source and target
   reconcile with the displayed aggregate.
2. **Given** the contribution affects a recorded race event, **When** playback
   or Results explains it, **Then** the explanation uses retained contest
   evidence rather than resolving adjacency again.
3. **Given** an adjacency clause is inactive, **When** Results is viewed,
   **Then** it is not presented as an outcome contribution.

### Edge Cases

- The source occupies an end slot with only one neighbor.
- The source's neighboring slot is empty, reserved, or temporarily unavailable.
- Two source items target the same item from opposite sides.
- Two adjacent sources target each other.
- A source matches multiple attributes on one target; one authored clause must
  not apply twice unless explicitly declared as two contributions.
- A target moves but retains the same item instance and modifications.
- A tier upgrade or Workshop Modification changes a source/target value without
  changing slot relationships.
- Adapted Mount preserves Fitted behavior in an Improvised slot while adjacency
  remains a separate contribution layer.
- A configured item's selected setup changes after adjacency preview but before
  contest lock.
- Storage items are physically near the rendered board but are not installed
  graph nodes.
- A legacy or malformed build lacks the topology evidence required to resolve
  adjacency.
- A maximum-density build fills every slot with adjacency-capable items.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST derive adjacency from one canonical graph over
  stable installed vehicle slot IDs.
- **FR-002**: Presentation and simulation MUST consume the same retained graph;
  neither Phaser coordinates nor visual card order may create relationships.
- **FR-003**: The V1 adjacency graph MUST connect each slot to the immediately
  previous and next slot in its vehicle definition's stable authored slot
  order. End slots have one neighbor and inner slots have two; the resolver
  MUST look up occupied state by stable slot ID rather than trust runtime array
  or visual order.
- **FR-004**: Storage positions MUST NOT count as adjacent installed nodes.
- **FR-005**: Each adjacency clause MUST identify its source, qualifying target
  rule, affected value/stat, magnitude, and player-readable description.
- **FR-006**: V1 target predicates MUST be limited to installation category and
  existing synergy tag.
- **FR-007**: A clause MUST state whether it affects qualifying neighbors, its
  source, or a vehicle aggregate; no target scope may be inferred from copy.
- **FR-008**: Adjacency MUST resolve from an immutable pre-adjacency build
  snapshot and be independent of iteration, drag, render, and scene order.
- **FR-009**: Every qualifying immediate-neighbor contribution MUST stack
  additively from one pre-adjacency snapshot. A target can receive at most two
  neighboring source applications under the V1 graph; mutual sources and
  chains MUST NOT recursively propagate adjacency-derived values.
- **FR-010**: An adjacency-derived value MUST NOT recursively increase the value
  of an outgoing adjacency clause during the same resolution.
- **FR-011**: Every active contribution MUST name source instance/slot, target
  instance/slot or vehicle, clause ID, condition, affected stat/value, and exact
  contribution.
- **FR-012**: The aggregate stat/effect ledger MUST reconcile base, placement,
  tier, modification, adjacency, and other amplifier layers without double
  applying any layer.
- **FR-013**: A source item's tier MUST scale its authored adjacency magnitude.
  Workshop Modifications, Fitted/Improvised behavior, configurable setup,
  existing Buff/Synergy percentages, and other amplifiers MUST NOT multiply or
  rewrite adjacency contributions; this composition order MUST be test-covered.
- **FR-014**: Items without adjacency clauses MUST retain identical resolved
  behavior and values.
- **FR-015**: Placement preview MUST show active, newly active, broken, and
  unchanged links before commitment.
- **FR-016**: Offer, garage, inventory, and inspector surfaces MUST expose an
  adjacency clause even when it is inactive.
- **FR-017**: Active/inactive links and valid/invalid targets MUST use text and
  non-color structure and remain discoverable without hover.
- **FR-018**: Keyboard, pointer, and touch users MUST receive equivalent target,
  preview, and contribution information.
- **FR-019**: Moving, replacing, upgrading, modifying, installing, or removing
  an item MUST recompute the prospective adjacency result without committing an
  invalid inventory mutation.
- **FR-020**: Contest lock MUST retain the resolved adjacency graph and
  contribution evidence required for deterministic simulation and explanation.
- **FR-021**: Race playback MUST NOT mutate or recompute adjacency from live
  presentation state.
- **FR-022**: Test Day and scored races MUST use the same locked adjacency
  authority for the same build/setup/rules inputs.
- **FR-023**: Async/ghost payloads MUST either version and retain required
  adjacency evidence or reject incompatible payloads explicitly; they MUST NOT
  guess missing relationships.
- **FR-024**: The system MUST reject unknown clause kinds, predicates, graph
  references, or non-finite values through typed validation.
- **FR-025**: The initial playable content slice MUST include exactly four
  representative adjacency items, one per origin ecosystem. Authored content
  plus deterministic fixtures MUST cover empty, single-target, two-target,
  competing-source, mutual-source, and maximum-density resolution without
  requiring every existing item to gain an adjacency clause.
- **FR-026**: Adjacency content and presentation MUST remain compatible with the
  later Feature 042 catalog/synergy audit and Feature 037 art overlay model.
- **FR-027**: DeepSeek implementation tasks MUST exclude screenshots and manual
  visual acceptance; those remain frontier/owner work.

### Key Entities

- **AdjacencyGraph**: The stable installed-slot nodes and undirected/directed
  neighbor relationships derived from the vehicle topology.
- **AdjacencyClause**: Authored source rule defining predicate, scope, affected
  value, magnitude, description, and stable clause ID.
- **AdjacencyContribution**: One resolved source-to-target application with
  exact evidence and composition layer.
- **AdjacencyResolution**: Complete deterministic set of active/inactive links,
  contributions, totals, and validation result for one build snapshot.
- **AdjacencyPreview**: Before/after projection used during a proposed placement
  without mutating the authoritative build.
- **LockedAdjacencyEvidence**: Immutable contest/Test Day evidence retained for
  simulation, playback explanation, Results, and async compatibility.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Across at least 1,000 permutations of each reference build's
  internal iteration order, adjacency resolutions and contest results are
  deeply equal.
- **SC-002**: Every active adjacency contribution in the corpus reconciles to
  exactly one source clause and target, with zero unexplained aggregate delta.
- **SC-003**: Preview and commit produce identical active links, targets, and
  values for 100% of valid reference placements.
- **SC-004**: Existing non-adjacency builds retain byte/deep-equal locked build
  values and deterministic race results across the regression corpus.
- **SC-005**: All empty, end-slot, incompatible, competing-source,
  mutual-source, chain, and maximum-density fixtures terminate within one
  bounded resolution pass with no recursive re-entry.
- **SC-006**: Controlled no-hover/color-disabled tests expose source, target,
  condition, active state, and exact contribution for every reference clause.
- **SC-007**: Test Day and scored-race locks for the same inputs retain the same
  adjacency graph and contribution evidence.
- **SC-008**: Unknown or incompatible adjacency payloads produce typed failures
  and never partially mutate a build or resolve a guessed race.

## Assumptions

- Launch vehicles retain four active ordered slots unless another feature
  explicitly changes capacity before implementation.
- Adjacency applies only to installed active slots in V1.
- Existing item instance IDs, slot IDs, tiering, modifications, setup, and
  locked-build authorities remain canonical.
- All numeric physical-stat contributions use normalized canonical points.
- Adjacency is computed during preparation/lock and remains immutable during a
  race.
- Initial content is deliberately bounded; Feature 042 owns the broader catalog
  and synergy balance pass.
- Final qualitative UI acceptance is performed by a frontier model or owner,
  not by the coding agent.

## Dependencies

- `specs/vehicle-topology.md`
- Feature 014 tag synergy and Feature 023 targeted amplifier contracts
- Feature 024 item presentation and Feature 025 vehicle-stat evidence
- Feature 028 pre-race setup and locked build
- Feature 034 item instances, modifications, and normalized stats
- Feature 038 owns later remote async payload transport; Feature 041 must expose
  versioned evidence and reject incompatible versions but does not wait on that
  feature.
- Feature 042 is the follow-up item-pool expansion and synergy audit, not a
  prerequisite for the four-item Feature 041 slice.
