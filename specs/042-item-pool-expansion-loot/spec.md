# Feature Specification: Item Pool Expansion and Loot

**Feature Branch**: `[042-item-pool-expansion-loot]`

**Created**: 2026-08-17

**Status**: Implementation-ready — analyzed; coding not started

**Input**: Repair and deepen the current playable item pool before art
production, then add a bounded payoff-focused expansion and inert Loot items
whose atomic conversion permanently grants a normalized stat bonus to the
deterministic leftmost applicable held item.

## Clarifications

### Session 2026-08-17 — post-review re-specification

- Q: How much current content should be revised? → A: Repair defects and target
  at least 8–12 retrofits across all origins. This is not a hard ceiling; the
  audit may justify revising additional items when each change has a distinct
  documented purpose.
- Q: How much new content ships? → A: Eight active items plus four Loot items.
- Q: How should tags be handled? → A: Preserve stable tag IDs but classify a
  smaller payoff-bearing build-family set, bridge/utility tags, and
  flavor/acquisition descriptors.
- Q: What happens to exact-count effects? → A: Exact-count becomes primarily a
  clearly previewed Voss rulebook signature. Soto/Rook exact-two effects convert
  to at-least, range, or graduated thresholds.
- Q: How do Buff tiers scale? → A: Multiplicatively by the same 15%/30% factors
  as direct stats. Existing cooldown-stacking bases at 2–3% must be rebalanced
  above 3% so their chase value is perceptible; the technical plan must validate
  final magnitudes against normalized stat and race-length evidence.
- Q: What does rarity mean? → A: Rarity drives weighted availability and
  consistent complexity/build-around bands; visible offers suppress duplicate
  definition IDs.
- Q: Where does Loot appear? → A: All four Loot types are shared neutral
  content, excluded from normal entrant-origin shops/drafts. They may appear in
  explicitly neutral-only shops, neutral acquisition/reward contexts, or other
  authored rewards that declare Loot eligibility, with a bounded/capped lane.
- Q: Where is Loot held and what does conversion do? → A: Loot occupies normal
  installed or storage capacity, remains inert, and is sold. Sale pays the
  normal half-price credit value plus its permanent stat bonus.
- Q: How do Loot duplicates work? → A: Normal duplicate tiering; tier 1/2/3
  grants +1/+2/+3 normalized points on sale.
- Q: What are targeting/lifecycle defaults? → A: Authored vehicle slots then
  storage; first non-Loot authored/modification stat contributor; automatic
  leftmost target; +3 cap per target instance/stat; full atomic Undo; bonus
  follows retained identity and leaves with removed/replaced identity.

## User Scenarios & Testing

### User Story 1 — Trust every current item offer (Priority: P1)

As a player, every offered current-catalog item has a real, correctly described
purpose, and its tags, economy behavior, targeting, tier scaling, installation
state, and conditions behave as the card promises.

**Why this priority**: Adding cards to a pool containing dead offers,
misreported tags, misleading “held” copy, and disproportionate tier rules would
dilute rather than deepen the game. The existing catalog must become a reliable
foundation before expansion.

**Independent Test**: Audit all 70 baseline definitions and their compact/full
presentation against authoritative simulation/economy behavior; verify no item
is effectless unintentionally, no mechanical tag or trigger is hidden or
misstated, and every tier/condition preview reconciles with resolution.

**Acceptance Scenarios**:

1. **Given** any offered item, **When** its compact and full details are viewed,
   **Then** its actual synergy tags, targets, active/inactive effect, economy
   trigger, installation behavior, and tier-scaled value are stated accurately.
2. **Given** Trade Ledger Chit or Bookmaker's Declared Margin, **When** the
   baseline audit runs, **Then** each has a real authored effect or is explicitly
   removed/replaced; neither remains a purchasable dead card.
3. **Given** a Synergy counts only installed items, **When** its copy and live
   count are shown, **Then** it says installed rather than held and storage does
   not appear to qualify.
4. **Given** multiple offers are generated together, **When** the offer is
   displayed, **Then** each visible choice has a distinct definition ID.
5. **Given** an item has an exact-count, cooldown-stacking, target-dependent, or
   economy rule, **When** it is previewed, **Then** activation, shutoff,
   accumulation, eligible recipients, and trigger are visible before purchase.

---

### User Story 2 — Discover materially broader build paths (Priority: P1)

As a player, I encounter enough mechanically distinct equipment across every
origin to assemble currently under-supported synergy and adjacency builds
without merely seeing renamed copies of existing effects.

**Why this priority**: The catalog must be mechanically settled before item art
production. Expansion without measured archetype coverage would add volume but
not meaningful run variety.

**Independent Test**: Audit the current and expanded catalogs by origin,
category, rarity, price, tag, mechanic, stat, Fitted/Improvised behavior,
adjacency predicate, and pool eligibility; verify the selected coverage targets
improve without any origin or character pool becoming strictly dominant.

**Acceptance Scenarios**:

1. **Given** the current 70-item baseline has highly uneven tag support,
   **When** the expansion is authored, **Then** every new active item fills a
   documented coverage or mechanical-role gap rather than duplicating an
   existing item with cosmetic copy changes.
2. **Given** each entrant pool has an origin weighting and cross-origin access,
   **When** deterministic offer corpora are generated, **Then** every entrant
   can encounter the newly supported builds without being guaranteed them.
3. **Given** Feature 041 adds four adjacency sources, **When** the expanded
   catalog is audited, **Then** adjacency targets and source availability are
   measured alongside Buff, Synergy, conditional, setup, economy, and direct
   stat mechanics.
4. **Given** an existing catalog item is not intentionally rebalanced,
   **When** Feature 042 is enabled, **Then** its definition, odds, economy, and
   race behavior remain unchanged.

---

### User Story 3 — Hold Loot at a real opportunity cost (Priority: P1)

As a player, I can acquire and inspect Loot that provides no race effect while
held, understand what capacity it consumes, and decide whether preserving it
for a later target is worth the lost space or conversion opportunity.

**Why this priority**: Loot only creates a meaningful hold-versus-liquidate
decision if its inertness and capacity cost are explicit and mechanically true.

**Independent Test**: Place each Loot item in every permitted location, run
current-stat projection, Test Day, and a scored race, and confirm it changes no
stat, cooldown, event, setup control, economy trigger, or result before conversion.

**Acceptance Scenarios**:

1. **Given** Loot is offered or held, **When** it is inspected, **Then** it is
   unmistakably labeled `LOOT`, states that it is inert while held, identifies
   its conversion effect, and states the capacity/location rules.
2. **Given** Loot is held in any permitted installed or storage position,
   **When** the build resolves, **Then** it contributes exactly zero active race
   value and creates no adjacency source/target unless explicitly permitted by
   the clarified capacity contract.
3. **Given** a player lacks room, **When** Loot is considered, **Then** normal
   replacement/eviction confirmation and transaction safety apply; Loot never
   enters a hidden extra inventory.

---

### User Story 4 — Preview a deterministic Loot conversion (Priority: P1)

As a player, I can see the exact recipient, stat increase, credit settlement,
and no-target reason before confirming a Loot conversion.

**Why this priority**: Automatic leftmost targeting is only strategic when the
topology and applicability rule are predictable before an irreversible action.

**Independent Test**: Reorder visual/runtime arrays while retaining stable slot
and instance identities, then preview every Loot stat against installed,
storage, empty, inapplicable, and stale states; recipient and receipt remain
identical or fail with the exact typed reason.

**Acceptance Scenarios**:

1. **Given** one or more applicable held targets, **When** a Loot conversion is
   previewed, **Then** the deterministic leftmost recipient is named by item,
   instance, and location with the exact normalized stat delta and credits.
2. **Given** no applicable target exists, **When** conversion is previewed, **Then**
   confirmation is unavailable and the unmet applicability rule is stated.
3. **Given** the target moves without changing its instance identity before a
   fresh preview, **When** preview runs again, **Then** canonical topology—not
   prior location, render order, or selection history—determines the recipient.
4. **Given** state changes after preview, **When** the stale command is
   submitted, **Then** it fails without consuming Loot, paying credits, or
   applying any permanent bonus.

---

### User Story 5 — Settle the conversion atomically and retain its history (Priority: P1)

As a player, confirming a valid Loot conversion applies the promised permanent bonus
once, consumes the exact Loot instance, settles the exact credits, and leaves a
receipt that can explain the target's improved stat later.

**Why this priority**: Partial settlement or identity loss would duplicate
value, destroy items incorrectly, and make permanent bonuses impossible to
trust.

**Independent Test**: Submit valid, stale, duplicate, undo, move, tier-upgrade,
modify, transform, target-removal/sale, and run-reload fixtures. Verify all-or-nothing
state transitions and source/target receipt reconciliation.

**Acceptance Scenarios**:

1. **Given** a valid confirmed preview, **When** it settles, **Then** target
   modification, Loot consumption, credit delta, history, and receipt commit as
   one authoritative transaction or none commit.
2. **Given** the same command is submitted twice, **When** the duplicate is
   processed, **Then** the second submission cannot grant stats or credits.
3. **Given** an improved target moves or tiers up, **When** its stats resolve,
   **Then** the retained Loot bonus remains attached to the same instance and is
   separately attributable rather than being re-targeted.
4. **Given** a complete conversion is undone under the clarified policy, **When** Undo
   succeeds, **Then** Loot, credits, target bonus, receipt/history state, and
   prior locations return atomically.

---

### User Story 6 — Understand expanded synergies before art production (Priority: P2)

As the product owner, I have a reproducible catalog and offer-distribution
report that shows what the expansion changed and provides a stable mechanical
roster for the later item-art pass.

**Why this priority**: Asset generation should begin from frozen identities,
not from a catalog whose names, roles, or counts are still moving.

**Independent Test**: Run the catalog audit and seeded acquisition corpus,
compare the report to locked thresholds, and verify every final item has a
stable ID, name, origin, category, tags, rarity, price, mechanic summary,
installation copy, and art-handoff descriptor.

**Acceptance Scenarios**:

1. **Given** the expanded catalog, **When** the audit runs, **Then** it reports
   counts and offer rates by every required axis and flags threshold failures.
2. **Given** a new item requires bespoke art later, **When** the mechanic roster
   is approved, **Then** it exposes a stable labeled descriptor without asking
   the coding agent to generate, crop, or approve an image.
3. **Given** a proposed item is mechanically redundant or destabilizes a pool,
   **When** the audit fails, **Then** the roster remains unapproved for Feature
   037 production art until the data issue is resolved.

### Edge Cases

- Loot is the only held item.
- Loot is visually first but excluded from its own target candidates.
- Multiple Loot items are held; none may target another Loot item unless a
  later explicit rule permits it.
- The first canonical candidate is empty, the next is inapplicable, and a later
  storage item is applicable.
- The target has positive, negative, conditional-only, modification-derived, or
  previously Loot-derived contribution to the requested stat.
- The target moves between installed and storage after preview.
- The target tiers up or receives/replaces a Workshop Modification.
- The target is transformed while its instance is retained or replaced.
- The target is sold, surrendered, impounded, or otherwise removed later.
- The Loot source is tier 2/3 through duplicate acquisition.
- Multiple bonuses target the same instance/stat or different stats.
- The target is at the selected cap when another Loot is previewed.
- Undo destination is no longer available or credits have since changed.
- A saved/async payload has an unknown Loot rules version or missing receipt.
- Catalog expansion changes seeded offer ordering merely by adding IDs.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST audit all 70 baseline items against authoritative
  race, economy, installation, Synergy, tier, and presentation behavior before
  expansion content is approved.
- **FR-002**: Trade Ledger Chit and Bookmaker's Declared Margin MUST receive a
  real authored effect or be explicitly removed/replaced; no unintended dead
  item may remain offerable.
- **FR-003**: Compact and full item surfaces MUST show actual `synergyTags`,
  economy triggers, installed-versus-storage counting scope, Buff eligibility,
  cooldown accumulation, exact-count shutoff, and effective tier values without
  deriving mechanics from prose.
- **FR-004**: Every multi-card offer MUST contain distinct definition IDs; draw
  attempts MAY repeat internally but presentation MUST receive distinct choices
  or a typed exhausted-pool state.
- **FR-005**: Feature 042 MUST retrofit at least 8–12 current items across all
  origins with meaningful payoff, bridge, Fitted/Improvised, economy, tradeoff,
  or sequencing roles before roster approval. The audit MAY justify additional
  retrofits beyond 12 when each is individually recorded and non-redundant.
- **FR-006**: The expansion MUST add exactly eight active items plus four Loot
  items and justify their distribution through the catalog-gap report.
- **FR-007**: Every added or retrofitted active item MUST fill a documented tag,
  mechanic, stat, category, price, rarity, installation, adjacency, or pool gap
  and MUST NOT be a cosmetic rename of an existing effect package.
- **FR-008**: The current 19 tag IDs MUST remain stable but be explicitly
  classified as payoff-bearing build families, cross-origin bridge/utility
  tags, or flavor/acquisition descriptors. Only build-family tags promise
  dedicated payoff density.
- **FR-009**: Each origin MUST support at least three distinguishable build
  directions, and shared tags MUST create intentional cross-origin bridges
  without making every item in a home pool an automatic match.
- **FR-010**: Exact-other-count MUST remain primarily a clearly previewed Voss
  rulebook/loophole signature. Soto and Rook's current exact-two effects MUST
  convert to at-least, range, or graduated thresholds that do not simply shut
  off when another matching item is acquired.
- **FR-011**: Buff tiers MUST scale authored percentages multiplicatively by
  15%/30%, matching direct-stat tier factors. All cooldown-stacking Buffs at or
  below 3% base MUST be rebalanced to a validated base greater than 3%, with
  final values recorded against race length and normalized-stat outcomes.
- **FR-012**: Rarity MUST drive authored offer weights and consistent
  complexity/build-around bands. Standard appears most often, Notable less, and
  Rare least; rarity MUST NOT promise strictly greater raw power.
- **FR-013**: The system MUST produce a deterministic catalog audit covering
  origin, reachable pool, category, rarity, price, tags, stats, mechanics,
  Fitted/Improvised behavior, adjacency, Loot, duplicate visibility, and tier
  attainment before/after the expansion.
- **FR-014**: Seeded offer corpora MUST measure new-item access, duplicate
  suppression, build-around visibility, and tier attainment for every entrant
  and flag starvation or dominance against explicit planning thresholds.
- **FR-015**: Every existing rebalance, copy repair, removal, or replacement
  MUST be recorded per item in an expansion ledger; unrelated definitions and
  deterministic behavior MUST remain unchanged.
- **FR-016**: Loot MUST be a typed authored capability/item kind, not inferred
  from name or description.
- **FR-017**: All four Loot types MUST be shared neutral content and MUST be
  excluded from normal entrant-origin shop/draft stock. Loot MAY appear only in
  explicitly neutral-only shops, neutral acquisition/reward sources, or other
  authored rewards that declare Loot eligibility, using a bounded/capped lane.
- **FR-018**: Loot MUST occupy ordinary installed or storage positions. An
  installed Loot item remains inert and activates no Fitted, Improvised, or
  adjacency behavior.
- **FR-019**: Holding Loot MUST add no time, physical stat, Buff, Synergy,
  adjacency, setup, economy trigger, lap event, sponsor progress, Tag Specialist
  eligibility, modification target, Scrutineering value, or contest effect.
- **FR-020**: Loot conversion MUST be presented as `Sell` and MUST grant the
  normal half-price credit payout plus the permanent normalized stat bonus in
  one atomic transaction, including existing sale-economy modifiers where the
  normal sale contract applies.
- **FR-021**: Duplicate Loot MUST use normal tiering; selling a tier 1/2/3 Loot
  item applies +1/+2/+3 normalized points respectively before the target cap.
- **FR-022**: Loot inspection MUST state `LOOT`, inertness, capacity cost,
  conversion effect, normalized stat, targeting/applicability rule, tier or
  charge magnitude, settlement value, and current target/failure reason.
- **FR-023**: Loot target order MUST traverse authored vehicle slot IDs followed
  by storage indexes. The first non-Loot item with an authored or Workshop-
  modification-derived non-zero contribution to the Loot stat is applicable
  only if it can accept the entire tier magnitude without exceeding the cap; a
  non-fitting candidate is skipped rather than partially consuming the reward.
  Prior Loot bonuses alone do not create eligibility. Bonuses stack additively
  to +3 per target instance/stat. Immediate Undo reverses Loot, bonus, credits,
  locations, receipt, and history atomically when normal Undo preconditions hold.
  Bonuses follow retained identity and leave the run with removed/replaced
  identity; transformations preserve them only when identity is preserved.
- **FR-024**: Target selection MUST be automatic and choose the leftmost
  applicable instance; rearrangement changes the target, while the confirmation
  dialog cannot override it.
- **FR-025**: Loot and other Loot items MUST be excluded from target candidates.
- **FR-026**: A no-target or cap-reached preview MUST block settlement with a
  typed readable reason and leave the Loot instance unchanged.
- **FR-027**: Preview MUST name source instance, target instance/location, stat,
  magnitude, credit delta, cap effect, and complete resulting transaction.
- **FR-028**: Preview and settlement MUST use the same versioned command and
  current-state validation so stale or duplicate commands cannot apply value.
- **FR-029**: Valid settlement MUST atomically apply the target bonus, consume
  Loot, settle credits, and append receipt/history evidence; failure MUST leave
  all state unchanged.
- **FR-030**: A permanent Loot bonus MUST bind to the target's stable run-scoped
  instance and follow legal moves/storage transitions.
- **FR-031**: Loot bonuses MUST remain a separate normalized ledger layer and
  MUST NOT be multiplied by adjacency, Buff, Synergy, installation,
  modification, Scrutineering, setup, or Loot itself.
- **FR-032**: Tier upgrades and Workshop Modification replacement on the target
  MUST preserve separately attributed Loot bonuses without mutating catalog
  definitions.
- **FR-033**: Every retained Loot contribution MUST identify source definition
  and instance, conversion transaction, target instance, stat, magnitude,
  stage, and rules version.
- **FR-034**: Current build, pre-race, Test Day, scored race, and Results MUST
  reconcile Loot-derived points while never treating unsold held Loot as a
  contributor.
- **FR-035**: Unknown versions, non-finite values, missing identities, forged
  receipts, and evidence mismatches MUST fail typed validation and MUST NOT be
  repaired or guessed.
- **FR-036**: The approved mechanical roster MUST expose stable IDs, names, and
  labeled art-handoff descriptors before Feature 037 production art begins.
- **FR-037**: DeepSeek tasks MUST exclude image generation, asset selection,
  cropping, screenshot comparison, and qualitative browser acceptance; those
  remain frontier/owner responsibilities.

### Key Entities

- **CatalogAudit**: Deterministic counts, coverage, distributions, thresholds,
  gaps, and approved/rejected expansion ledger.
- **LootDefinition**: Typed inert held item capability defining target stat,
  magnitude, applicability, settlement, copy, and stable version.
- **LootConversionPreview**: Immutable current-state projection naming source,
  recipient, topology evidence, value, credits, cap, and failure state.
- **LootConversionCommand**: Versioned idempotent confirmation referencing the exact
  previewed source and expected target/state.
- **PermanentLootBonus**: Run-scoped target-instance ledger contribution that
  remains separate from catalog definitions and other modification systems.
- **LootConversionReceipt**: Atomic settlement/history evidence connecting source,
  target, bonus, credits, locations, stage, and command identity.
- **ExpansionLedgerEntry**: Per-new-item explanation of the catalog gap filled,
  pool exposure, mechanic identity, and later art-handoff descriptor.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 70 baseline items pass the truth audit: zero unintended dead
  offers and zero mismatches between displayed tags/targets/triggers/conditions/
  tiers and authoritative behavior.
- **SC-002**: 100% of new active items have a unique documented mechanical role
  and pass automated non-duplication/coverage review against the current
  catalog.
- **SC-003**: In the approved seeded offer corpus, every entrant sees every new
  origin/mechanic family within the planned access bounds, with zero failed
  starvation or dominance thresholds.
- **SC-004**: Holding any Loot fixture produces deep-equal current stats, laps,
  events, setup eligibility, and contest results to the same build with that
  location empty.
- **SC-005**: Preview and settlement match source, target, stat, magnitude,
  credit delta, cap behavior, and receipt for 100% of valid reference commands.
- **SC-006**: Across at least 1,000 runtime-array/render-order permutations, the
  same stable topology selects the same target and creates deep-equal receipts.
- **SC-007**: Stale and duplicate command corpora apply zero duplicate bonuses,
  credits, consumption, or history entries.
- **SC-008**: Every applied Loot point reconciles to exactly one valid source
  transaction and target instance throughout move, tier, modify, persistence,
  and removal fixtures.
- **SC-009**: The final catalog audit has no unexplained item, pool, tag,
  category, rarity, stat, or mechanic threshold failure before the roster is
  declared ready for Feature 037 art production.
- **SC-010**: Every visible three-card reference offer contains three distinct
  definition IDs whenever at least three eligible definitions exist.
- **SC-011**: Seeded pre/post-expansion corpora meet the clarified availability
  and tier-attainment bounds for all four entrants.

## Assumptions

- The current baseline contains 15 items per origin ecosystem plus 10 neutral
  items (70 total) before Feature 041's four clauses and Feature 042 additions.
- All permanent stat values use Feature 034's normalized canonical points.
- `Permanent` means for the current run and target instance, never account-wide.
- Feature 041 adjacency clauses are locked inputs to this audit; Feature 042 may
  tune catalog distribution but does not change adjacency authority casually.
- Loot is inert before conversion and cannot be an adjacency source or target
  in V1.
- Final qualitative UI and art-handoff acceptance is performed by a frontier
  model or owner, not the coding agent.

## Dependencies

- Feature 034 item instances, atomic encounters, modifications, Undo receipts,
  and normalized stat ledger
- Feature 041 adjacency contract and four representative source items
- Features 014/023 synergy and targeted-amplifier contracts
- Feature 020 character/item pool weighting
- Feature 037 production item artwork remains gated on this roster
