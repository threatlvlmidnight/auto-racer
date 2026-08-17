# Feature Specification: Roguelike Encounter Variety

**Feature Branch**: `[034-roguelike-encounter-variety]`

**Created**: 2026-08-15

**Status**: Implemented — all 78 tasks complete (reviewed 2026-08-16). The
stat-normalization follow-up (T012–T016) is delivered and evidenced in
`STAT-NORMALIZATION-FOLLOWUP.md`.

**Input**: Expand between-race choices beyond shops and reward drafts with solo
Exhibitions, voluntary sacrifices, transformations, upgrades, and build-responsive
shops; prevent destination choices from repeatedly collapsing into two acquisition
screens; and add a persistent item-modification layer that changes how selected
items behave without conflating modification with tier upgrades.

## Clarifications

### Session 2026-08-15

- Q: Which initial catalog direction should Feature 034 use? → A: Start from the
  smaller mechanically distinct catalog rather than four reserved names by
  default, but add a late-run tag-specialist shop when the player has committed
  to repeated copies of one synergy tag; the final seven-type catalog is recorded
  below.
- Q: What does Scrutineering do? → A: The player voluntarily gives up one item
  for the next scored race; that sacrifice permanently buffs the other items
  installed at commitment by an amount derived from the surrendered item's
  authored value and tier. The accepted formula and cap are recorded below.
- Q: What does Factory Development do? → A: Apply one run-persistent Workshop
  Modification from compatible item-specific choices. A separate encounter
  grants one free item-tier upgrade, with several offers guaranteed per run.
- Q: What does Privateer Exchange do? → A: Keep the same-tier foreign-item trade
  and add a separate transformation encounter for a higher-tier replacement.
- Q: How should family cadence work? → A: Use a two-stage type cooldown, require
  a non-acquisition option in every pair, and guarantee required new families
  across the run when eligible.
- Q: Which resources may be risked? → A: Credits and opportunity cost only;
  reputation is not staked and items cannot be lost without explicit exchange or
  Scrutineering confirmation.
- Q: What happens when no legal operation remains after entry? → A: Record the
  encounter as unavailable, consume nothing, and return to the route.
- Q: What content-volume gate applies? → A: Require at least three authored
  variants per new encounter type with entrant and early/mid/late route coverage.
- Q: What modification behaviors should the system support? → A: Support
  stat-graft modifications that add a second stat when the source effect applies,
  a stat-doubling modification, an overtake-defense modification, and a
  Fitted/Improvised-changing modification; the accepted behaviors are recorded
  below.
- Q: How do modifications interact with tiers? → A: Derive modification output
  from the item's tier-1 authored value, then apply tier scaling independently to
  both base and modification so tier upgrades preserve and scale both layers.
- Q: Can modified items be sold or exchanged? → A: Yes. The modification remains
  bound to the exact item while moved or stored, disappears when that item is
  sold or surrendered, adds no sale premium, and some vendors may explicitly
  sell already-modified items.
- Q: Which revised encounter catalog ships? → A: Ship Exhibition Trial,
  Scrutineering, Factory Development, Upgrade Workshop, Privateer Exchange,
  Experimental Rebuild, and Tag Specialist as seven distinct encounter types.
- Q: How does Exhibition Trial resolve? → A: Run one unscored solo race with
  three exact objectives drawn from time, item-activation, and track-demand
  families; award +1 reputation per completed objective, retain an Exhibition
  score, and award no Championship points.
- Q: How is Scrutineering's permanent bonus calculated? → A: Impound one selected
  installed item for the next scored race and mark the other currently installed
  items with `5% × surrendered tier + authored price` beneficial-race-effect
  bonus, capped at 25% cumulative Scrutineering bonus per item. Formula inputs,
  coefficients, and cap must be centrally configurable and validated.
- Q: How are stat-graft modifications normalized? → A: Normalize the engine's
  four player-facing physical stats onto one canonical point scale before
  authoring grafts. One point of Acceleration, Top Speed, Braking, or Cornering
  has comparable marginal value across the balanced reference-track corpus, so a
  one-point graft remains one point; track demand may still change contextual
  value on a particular circuit. No hidden cross-stat conversion ratio is shown
  or required.
- Q: Which non-graft Workshop Modifications ship? → A: Twin-Tuned doubles all
  signed base physical-stat contributions, Guarded converts the first otherwise
  successful overtake against the player into a defended attempt once per race,
  and Adapted Mount retains the item's Fitted behavior in an Improvised slot.
- Q: How broad is the Fitted/Improvised overhaul? → A: Audit every playable item,
  author meaningful Fitted behavior, use explicit Improvised consequences where
  appropriate, target roughly 20–30% Fitted value and 10–20% Improvised drawback,
  expose exact previews, and tune through corpus evidence rather than a hidden
  universal scalar.
- Q: How many free tier-upgrade offers are guaranteed? → A: Guarantee at least
  two Upgrade Workshop appearances per 40-stage championship, one during global
  stages 1–20 and one during global stages 21–40 when an eligible item exists;
  selection remains optional and extra random appearances are allowed.
- Q: How does Experimental Rebuild resolve? → A: Surrender one tier-1 or tier-2
  held item and pay 2 credits, then choose one of three any-origin replacements
  in the same installation category at one tier above the source. The replacement
  is unmodified and the source modification is destroyed.
- Q: Which vendor sells already-modified items? → A: Tag Specialist has exactly
  one modified entry among its three stock slots, previews the modification, and
  prices that entry 2 credits above its normal price. Other existing acquisition
  encounters remain unmodified in this feature.
- Q: When and how does Tag Specialist appear? → A: It is eligible during the
  final four choice stages when at least two held items across vehicle and
  storage share a tag. The player selects one qualifying tag, then sees three
  normally priced cross-origin matching items and may restock once within that
  same tag; exactly one stock entry is modified and costs 2 extra credits.
- Q: How may pending future effects coexist? → A: Allow one unresolved effect per
  category. One existing Sponsor contract and one Scrutineering impound may
  coexist and resolve independently, but a second pending effect of either same
  category makes its encounter ineligible until the predecessor resolves.
  Permanent modifications, completed Scrutineering bonuses, Exhibition Trials,
  and immediate shops/exchanges are not pending effects.

## User Scenarios & Testing

### User Story 1 — Choose between mechanically different encounters (Priority: P1)

As a player progressing through a championship, I choose between encounters that
ask genuinely different questions rather than differently labeled ways to obtain
another item.

**Why this priority**: Repeated acquisition choices are the reported failure.
The feature is not successful unless the route offers distinct verbs, costs, and
consequences.

**Independent Test**: Complete a seeded leg containing multiple choice stages;
verify that each presented pair is mechanically distinct, its preview identifies
the relevant cost/risk/outcome, and the selected encounter completes exactly once.

**Acceptance Scenarios**:

1. **Given** a choice stage, **When** two encounters are presented, **Then** the
   player can distinguish their interaction type, required input, possible cost,
   and consequence before entering either one.
2. **Given** the recent encounter history, **When** the next pair is generated,
   **Then** cadence rules prevent the route from repeatedly offering two
   acquisition encounters or immediately repeating the same encounter type.
3. **Given** the same run seed, stage, history, build, and economy state, **When**
   choices are generated again, **Then** their identities, order, previews, and
   committed outcomes are identical.
4. **Given** one encounter is selected, **When** it becomes active, **Then** the
   unselected encounter cannot mutate run state or later resolve as completed.

---

### User Story 2 — Modify, sacrifice, exchange, or transform an item (Priority: P1)

As a player, I can give one specific item a run-persistent Workshop Modification
or trade current value for a different strategic direction, with the complete
before/after consequence visible before confirmation.

**Why this priority**: Roguelike adaptation comes from changing the shape of a
build, not only adding more inventory.

**Independent Test**: Enter each initial build-changing encounter with empty,
partially filled, and full garages; preview and confirm or decline its operation;
verify legality, exact item/tier/placement/economy changes, and immutable history.

**Acceptance Scenarios**:

1. **Given** a legal held item, **When** the player previews an operation, **Then**
   the source item, destination or replacement, tier/effect changes, credit or
   reputation change, and expiry horizon are visible before confirmation.
2. **Given** the operation is confirmed, **When** it settles, **Then** all item,
   placement, tier, and economy changes commit atomically and appear once in run
   history.
3. **Given** no legal target exists, **When** the encounter opens, **Then** it
   explains why it is unavailable and provides a non-punitive exit without
   silently consuming an item or currency.
4. **Given** the player declines before confirmation, **When** the encounter is
   left, **Then** the build and economy remain unchanged and the decline is
   recorded as the encounter outcome.
5. **Given** an item is selected for Factory Development, **When** its compatible
   modifications are shown, **Then** each option explains the exact change to
   that item, its vehicle-stat/synergy/cooldown consequences, and any replacement
   of an existing modification before confirmation.
6. **Given** an item is upgraded by duplicate acquisition after modification,
   **When** the tier changes, **Then** tier scaling and modification behavior both
   remain visible, independently attributable, and deterministic.

---

### User Story 3 — Complete an Exhibition Trial (Priority: P2)

As a player, I can enter an unscored solo Exhibition Trial with three exact
objectives, earn reputation for the objectives I complete, and retain a clear
0–3 Exhibition score without changing Championship standings.

**Why this priority**: A driving encounter breaks up menu-only acquisition while
creating a low-stakes test of the current build and track-specific performance.

**Independent Test**: Enter a seeded Exhibition Trial, resolve fixtures completing
zero through three objectives, and verify exact objective evidence, reputation,
score, history, and unchanged Championship points/standings.

**Acceptance Scenarios**:

1. **Given** an Exhibition Trial offer, **When** it is inspected, **Then** one
   time, one item-activation, and one track-demand objective are exact and fixed
   before entry.
2. **Given** the solo race settles, **When** objective evidence is evaluated,
   **Then** each completed objective awards exactly 1 reputation and the retained
   Exhibition score equals the number completed.
3. **Given** any Exhibition result, **When** run progression resumes, **Then** no
   Championship points, standings, rival records, or scored-race effects changed.
4. **Given** the result is revisited, **When** evidence is inspected, **Then** the
   same committed inputs, race outcome, objective evidence, score, and reward are
   shown without rerolling.

---

### User Story 4 — Shop a committed synergy (Priority: P2)

As a player with a visible tag commitment, I can choose one qualifying tag and
shop a small cross-origin catalog tailored to it, including one clearly marked
modified item and one same-tag restock.

**Why this priority**: Build-responsive acquisition rewards intentional synergy
without giving every entrant unrestricted access to every item.

**Independent Test**: Enter Tag Specialist fixtures with zero, one, and multiple
qualifying tags; select a tag, restock, purchase or leave, and verify eligibility,
cross-origin filtering, prices, modification preview, and deterministic history.

**Acceptance Scenarios**:

1. **Given** fewer than two held items share a tag, **When** late-run eligibility
   is evaluated, **Then** Tag Specialist is not offered.
2. **Given** multiple tags qualify, **When** the encounter opens, **Then** the
   player selects the tag before stock is generated and every entry carries it.
3. **Given** stock is generated, **When** it is inspected, **Then** exactly one of
   three entries is modified, its exact modification is visible, and its price is
   exactly 2 credits above normal.
4. **Given** the player restocks, **When** replacement stock appears, **Then** all
   three entries still match the selected tag and no second restock is possible.

---

### User Story 5 — Understand cadence and encounter history (Priority: P2)

As a player, I can understand why an encounter is available, what it changed,
which effects are still pending, and when the route will return to acquisition,
preparation, or racing.

**Why this priority**: Variety without transparent cadence becomes noise and can
hide outcome-determining state.

**Independent Test**: Traverse a full deterministic championship route with
accepted, declined, unavailable, successful, and failed encounters; reconcile
every visible pending effect and history entry to authoritative run state.

**Acceptance Scenarios**:

1. **Given** a route overview, **When** the player inspects current status,
   **Then** completed encounter families, the active encounter, and every pending
   effect with its target/expiry are understandable without hover or color alone.
2. **Given** an encounter completes, **When** history is inspected, **Then** its
   inputs, choice, exact mutations, pending effect, and eventual resolution are
   recorded once and in chronological order.
3. **Given** a generation candidate conflicts with cadence, eligibility, or an
   existing pending effect, **When** choices are produced, **Then** deterministic
   fallback produces a legal pair without an infinite retry or empty route.

### Edge Cases

- Empty garage, full garage, max-tier duplicates, and no legal transformation or
  exchange target must produce explicit unavailable or decline paths.
- A pending effect cannot target a race/stage outside the current run, survive
  beyond its declared expiry, or resolve against Test Day/unscored evidence unless
  the effect explicitly says so.
- Multiple pending effects that can legally coexist use deterministic ordering;
  mutually exclusive effects prevent the later encounter from being offered.
- Credits and reputation never fall below their established legal minimums, and
  no encounter can remove the player's last legal race-ready configuration.
- Re-entering a scene, changing viewport, opening inventory, or replaying a race
  does not regenerate choices or resolve an encounter twice.
- A malformed legacy run or unknown encounter/pending-effect version routes to a
  typed unavailable/recovery state rather than silently guessing a migration.

## Requirements

### Functional Requirements

- **FR-001**: The initial release MUST add Exhibition Trial, Scrutineering,
  Factory Development, Upgrade Workshop, Privateer Exchange, Experimental
  Rebuild, and Tag Specialist as seven concrete encounter types spanning solo
  objectives, sacrifice, modification, upgrading, exchange, transformation, and
  build-responsive acquisition.
- **FR-002**: Each encounter type MUST declare a stable identity, family,
  eligibility rule, preview facts, legal actions, completion rule, authoritative
  outcome, and history projection.
- **FR-003**: Choice generation MUST be deterministic from retained run inputs and
  MUST store the offered pair before presentation; revisiting a scene MUST NOT
  reroll choices.
- **FR-004**: Cadence MUST prevent a choice pair from containing two encounters
  whose primary action is acquiring an item and MUST prevent immediate repetition
  of the same encounter type. A selected type remains on cooldown for the next
  two choice stages, every pair includes at least one non-acquisition option, and
  required new families are guaranteed across the run when eligible.
- **FR-005**: Encounter eligibility MUST be evaluated before selection using the
  current build, inventory capacity, credits, reputation, pending effects, stage,
  leg, and availability of a valid future target.
- **FR-006**: Deterministic bounded fallback MUST always yield a legal choice pair
  or a documented neutral continue option; generation MUST NOT use unbounded
  retries.
- **FR-007**: Choosing an encounter MUST remain distinct from confirming an
  operation within it. Entering an encounter MUST NOT automatically mutate items,
  credits, reputation, route state, or pending effects.
- **FR-008**: Every consequential option MUST present exact cost, reward, target,
  affected item/stat/effect, success condition, maximum downside, and expiry
  before confirmation without relying on hover, animation, or color alone.
- **FR-009**: Build-changing operations MUST use the authoritative garage,
  placement, tiering, acquisition, and transaction rules and MUST commit all
  related mutations atomically.
- **FR-010**: Declining or exiting before confirmation MUST leave build, economy,
  race inputs, and pending effects unchanged while completing or preserving the
  encounter according to one explicit rule.
- **FR-011**: An encounter with no legal operation MUST explain its unavailable
  state and provide a non-punitive exit; it MUST NOT consume currency, reputation,
  an item, or a scheduled opportunity.
- **FR-012**: Exhibition objectives and their thresholds MUST be generated and
  retained before race entry; objective identity or difficulty MUST NOT reroll
  when the scene is revisited or the retained race is replayed.
- **FR-013**: Exhibition settlement MUST retain objective-by-objective evidence,
  a 0–3 score, and reputation awarded while leaving Championship points,
  standings, rival records, and scored-race pending effects unchanged.
- **FR-014**: Voluntary risk propositions MUST declare their full success
  condition, reward, maximum downside, target evidence, and expiry before
  acceptance. Only credits and opportunity cost may be risked; reputation cannot
  be staked and no item can be lost without explicit confirmation.
- **FR-015**: Risk outcomes MUST resolve exactly once from retained race/run
  evidence after the relevant event and MUST NOT modify contest resolution or
  playback after commitment.
- **FR-016**: No encounter may produce negative credits/reputation, remove an item
  without explicit confirmation, create an illegal garage state, or make an
  otherwise valid run unable to enter its next required race.
- **FR-017**: Pending encounter effects MUST have stable IDs, source encounter,
  target/trigger, payload, state, expiry, and final resolution evidence.
- **FR-018**: Pending-effect ordering and incompatibility MUST be deterministic;
  the same source evidence cannot settle one effect more than once.
- **FR-019**: Encounter completion MUST advance the run exactly once and append an
  immutable history entry containing previews, selected action, immediate
  mutations, pending effect, and later resolution where applicable.
- **FR-020**: Existing Parts Supplier, Reward Draft, Cross-Pollination, Sponsor
  Meeting, Test Day, inventory, destination, race, and settlement authority MUST
  be reused rather than reimplemented by new encounter scenes.
- **FR-021**: Existing acquisition encounters MAY remain in the catalog but MUST
  participate in family-level cadence so they cannot dominate consecutive pairs.
- **FR-022**: Test Day MUST remain unscored and MUST NOT consume or resolve effects
  targeted at the next scored race unless an effect explicitly declares Test Day
  as its target before acceptance.
- **FR-023**: Every generated option and outcome MUST be reproducible for async
  viewers from retained state; live services, live opponents, and playback-time
  randomness are prohibited.
- **FR-024**: All four entrants MUST receive identical encounter-generation,
  legality, economy, and risk rules. Item-pool identity may affect only existing
  visible authored content rules.
- **FR-025**: New encounter presentation MUST remain within the established 2D
  visual medium and preserve keyboard, pointer, touch, reduced-motion, non-color,
  and supported-viewport access to every consequential action.
- **FR-026**: Feature 034 MUST NOT own global card rarity/upgrade spectacle,
  whole-game overlap remediation, circuit location display, or `Adjustable`
  vocabulary; those remain Feature 035 scope.
- **FR-027**: Feature 034 MUST NOT add race-phase, passing, incident, signature,
  track-generation, or audio authority; those remain Feature 033 scope.
- **FR-028**: Feature 034 MUST add one run-scoped Workshop Modification slot to
  each held item instance. Tier and modification MUST remain separate dimensions:
  tier strengthens authored values, while a modification adds or changes one
  declared behavior.
- **FR-029**: Factory Development MUST select a specific held item before showing
  a deterministic set of compatible modification choices; generic options whose
  effect cannot be previewed for that item MUST NOT be offered.
- **FR-030**: Every Workshop Modification MUST have a stable type, compatibility
  rule, exact item-level effect, presentation text, authoritative contribution,
  and retained source encounter.
- **FR-031**: The initial modification catalog MUST include four one-to-one
  canonical stat grafts plus Twin-Tuned, Guarded, and Adapted Mount, and MUST
  reject any item/modification pairing that would be illegal or a no-op.
- **FR-032**: An item MAY carry at most one Workshop Modification. Applying a
  different modification MUST preview replacement and require explicit
  confirmation; it MUST NOT silently stack or overwrite.
- **FR-033**: A modification MUST persist with its item instance across vehicle
  slots, storage, inventory inspection, races, and tier upgrades until replaced
  or the source item leaves the build.
- **FR-034**: Modification effects MUST be included in pre-race resolved stats,
  item inspection, live activation evidence, Results attribution, Test Day, and
  asynchronous race evidence wherever they affect contest outcome.
- **FR-035**: Modification eligibility and values MUST use centralized authored
  bounds and deterministic validation. A modification MUST NOT create zero/negative
  cooldowns, unsupported tags, illegal setup controls, recursive activations, or
  effects without complete attribution.
- **FR-036**: A late-run tag-specialist shop MUST become eligible only from the
  player's retained held-item tags during the final four choice stages and only
  when at least two held items across vehicle and storage share a tag. The player
  MUST select one qualifying tag before three normally priced cross-origin items
  carrying it are generated and MAY restock once within the same tag.
- **FR-037**: One separate guaranteed encounter MUST upgrade exactly one eligible
  held item by one tier at no credit cost; max-tier items are ineligible and the
  run guarantee counts offered opportunities rather than forced acceptance.
- **FR-038**: Scrutineering MUST temporarily withhold one explicitly selected
  installed item for the next scored race, return that exact item afterward, and
  attach a retained run-persistent bonus to the other installed item instances
  selected at commitment according to FR-042 and FR-053.
- **FR-039**: Privateer Exchange and higher-tier transformation MUST remain two
  distinct encounters with separate eligibility, preview, cost, source removal,
  replacement, modification-loss, and history evidence.
- **FR-040**: Fitted, Flexible, and Improvised placement MUST become more
  consequential and more immediately legible. Every changed contribution remains
  item-authored and visible before placement; no hidden universal alignment
  scalar is permitted.
- **FR-041**: Exhibition Trial MUST run an unscored solo race with three exact
  precommitted objectives selected from time, item-activation, and track-demand
  families; each completed objective awards exactly 1 reputation, the retained
  Exhibition score ranges from 0 through 3, and Championship points remain
  unchanged.
- **FR-042**: Scrutineering's bonus MUST initially equal `5% × source tier +
  source authored price`, apply to beneficial race contributions of the other
  installed item instances snapshotted at commitment, and cap at 25% cumulative
  Scrutineering bonus per target item. Every coefficient, affected-effect rule,
  and cap MUST be centralized, validated, and injectable for balance tests.
- **FR-043**: Stat grafts MUST operate on the canonical normalized stat scale. A
  tier-1 source contribution of N normalized points MUST produce N normalized
  target points in the same trigger/window, with tier scaling applied afterward;
  no stat-specific exchange ratio may be required for authoring or play.
- **FR-044**: Twin-Tuned MUST double all signed base physical-stat contributions
  of its item; Guarded MUST convert the first otherwise-successful overtake
  against the player into a retained defended attempt once per race; Adapted
  Mount MUST retain its item's Fitted behavior while installed Improvised. Each
  occupies the one Workshop Modification slot and requires full attribution.
- **FR-045**: Every playable item MUST receive a catalog review for meaningful
  Fitted behavior and appropriate authored Improvised consequence. Initial
  content targets SHOULD place Fitted value near 20–30% of base race contribution
  and Improvised drawback near 10–20%, with final values governed by deterministic
  balance corpus evidence and exact placement previews.
- **FR-046**: Upgrade Workshop MUST be offered at least twice per 40-stage
  championship, once during global stages 1–20 and once during global stages
  21–40 when at least one sub-tier-3 held item is eligible. It upgrades exactly
  one selected item by one tier for zero credits; declining is legal and
  additional random appearances are permitted.
- **FR-047**: Experimental Rebuild MUST accept one explicit tier-1 or tier-2 held
  source plus exactly 2 credits and offer three deterministic any-origin items
  matching its installation category at source tier plus one. Settlement removes
  the source/modification and installs or stores one unmodified replacement
  atomically through existing garage capacity rules.
- **FR-048**: Tag Specialist MUST stock three items carrying its selected
  qualifying tag, and exactly one stock entry MUST carry a compatible Workshop
  Modification and cost 2 credits above normal. All modifications and prices are
  visible before purchase; other existing acquisition encounters remain
  unmodified.
- **FR-049**: Pending effects that await a future scored race MUST use one
  per-category coexistence rule. One Sponsor contract and one Scrutineering
  impound MAY coexist and resolve independently, but a second pending effect in
  either category MUST make that category's encounter ineligible until its
  predecessor resolves. Immediate and already-settled effects do not count.
- **FR-050**: Acceleration, Top Speed, Braking, and Cornering MUST use one
  canonical player-facing point scale throughout stock vehicles, items, tiers,
  setup, modifications, inspection, race evidence, and Results.
- **FR-051**: One added canonical point in each physical stat MUST produce
  comparable marginal race-time value within a 10% spread across the
  deterministic balanced reference-track corpus. Track-specific demand MAY make
  one stat more valuable on a particular circuit and MUST remain visible.
- **FR-052**: Any internal physical coefficients needed by lap simulation MUST be
  derived behind the canonical stat boundary. UI, item content, encounter rules,
  and modification authoring MUST NOT expose or depend on hidden cross-stat
  conversion ratios.
- **FR-053**: Scrutineering MUST reserve the impounded item's original vehicle
  slot until the target scored race settles, prevent another item from occupying
  that slot, and restore the exact item instance to that slot before clearing the
  pending effect.

### Key Entities

- **Encounter Definition**: Authored type, family, eligibility, preview schema,
  available actions, completion rule, and outcome schema.
- **Encounter Instance**: Stable run/stage-scoped realization with retained
  choices, target, status, and deterministic content.
- **Encounter Family**: Cadence category such as acquisition, modification,
  sacrifice, transformation, upgrade, or Exhibition.
- **Encounter Operation Preview**: Exact pre-confirmation source, target, cost,
  reward, downside, mutations, and expiry.
- **Pending Encounter Effect**: Deferred deterministic consequence tied to a
  specific future run/race event with explicit lifecycle and resolution evidence.
- **Encounter Outcome**: Immediate mutations, decline/unavailable state, pending
  effect creation, and later resolution.
- **Cadence State**: Retained recent types/families, cooldowns, guarantees, and
  deterministic fallback evidence used to generate a legal pair.
- **Workshop Modification**: One run-persistent behavior patch attached to a
  specific held item instance, independent of tier and carrying compatibility,
  effect, provenance, and exact presentation evidence.
- **Modification Offer**: A deterministic item-specific option containing the
  exact before/after behavior and resolved build consequences if confirmed.
- **Canonical Stat Point**: Shared player-facing unit for Acceleration, Top
  Speed, Braking, and Cornering, calibrated for comparable marginal value across
  the balanced reference-track corpus while retaining circuit-specific demand.
- **Run History Entry**: Immutable chronological audit record extended with the
  new encounter's preview, selection, mutation, and deferred resolution.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Across the deterministic acceptance corpus, 0 choice pairs contain
  two acquisition-primary encounters and 0 immediately repeat the same type.
- **SC-002**: A complete representative championship route contains at least one
  build-changing non-acquisition encounter, one Exhibition Trial, and one
  voluntary sacrifice opportunity without requiring a specific seed.
- **SC-003**: In 100% of operation fixtures, the confirmed mutation exactly
  matches the pre-confirmation preview or the operation fails without mutation.
- **SC-004**: In 100% of repeat-generation fixtures, identical retained inputs
  produce byte-equivalent choice identities, ordering, content, and outcomes.
- **SC-005**: Every pending effect in the acceptance corpus resolves or expires
  exactly once at its declared target, and zero effects alter contest authority
  during playback.
- **SC-006**: In all empty/full/max-tier/unaffordable fixtures, the player can
  leave the encounter without illegal state, negative resources, or hidden loss.
- **SC-007**: Every completed new encounter and deferred resolution reconciles to
  one chronological history record with exact item/economy/route evidence.
- **SC-008**: At supported viewports and input modes, every consequential preview,
  confirm, decline, disabled reason, target, and expiry remains operable and
  readable without hover, motion, or color-only meaning.
- **SC-009**: Existing deterministic acquisition, sponsor, championship, Test Day,
  contest, settlement, and replay regression fixtures remain unchanged unless a
  fixture explicitly opts into a retained Feature 034 encounter effect.
- **SC-010**: The initial modification catalog contains at least three
  mechanically distinct behavior families, and 100% of offered modifications
  produce a legal, non-no-op change for the selected item.
- **SC-011**: In 100% of modification fixtures, item inspection and pre-race/live/
  Results evidence reconcile tier contribution and modification contribution
  separately to the final authoritative value or activation.
- **SC-012**: Moving, storing, upgrading, racing, replaying, or revisiting a
  modified item preserves the same modification identity and behavior until an
  explicit replacement or item-removal transition occurs.
- **SC-013**: At the reference build and across the balanced deterministic track
  corpus, the spread between the strongest and weakest one-point marginal
  race-time improvement is no greater than 10%, and every player-facing surface reports
  the same normalized delta without an exchange-rate explanation.

## Assumptions

- Feature 033 is implemented or its touched run/race contracts are reconciled
  before Feature 034 implementation edits shared authority.
- The current 40-stage, five-leg championship structure remains the baseline;
  this feature changes encounter variety and cadence, not season length. Its 20
  choice stages are the scheduling domain for cadence and run guarantees.
- One local active run remains the persistence boundary; no account/backend or
  cross-device save system is introduced.
- Existing deterministic seed injection and immutable history patterns are
  extended rather than replaced.
- New encounter content uses the existing entrant pools, garage topology,
  credits, reputation, tiering, and race evidence.
- Workshop Modifications are earned only through run encounters in this slice;
  ordinary shops and reward drafts continue to offer unmodified items.

## Out of Scope

- Live contest input, synchronous opponents, or network-dependent encounter
  resolution.
- New item rarity art, upgrade celebration, global responsive-layout remediation,
  circuit-location presentation, or naming audits owned by Feature 035.
- New race dynamics, track geometry, incidents, signatures, engine audio, or UI
  sound owned by Feature 033.
- Persistent damage, retirement, item theft without confirmation, permanent
  campaign metaprogression, or monetized competitive advantage.
- Copying The Bazaar's combat-status vocabulary or requiring a bespoke modifier
  effect for every item/modification pair; this feature establishes Auto Racer's
  Motor-Age behavior families and explicit compatibility rules.
- A backend-authored daily route, account inventory, or cross-session cloud save.
