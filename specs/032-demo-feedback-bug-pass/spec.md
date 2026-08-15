# Feature Specification: Demo Feedback Bug Pass

**Feature Branch**: `[032-demo-feedback-bug-pass]`

**Created**: 2026-08-14

**Status**: Tasks generated — ready for `/speckit.analyze`

**Input**: Consolidate hosted-demo feedback covering race-stat feedback,
item/synergy clarity, scaling progression, acquisition and inventory UX,
placement language, balance, setup styling, economy content, and visual polish.

## Clarifications

### Session 2026-08-14

- Q: How should live vehicle stats communicate item activations and
  amplification? → A: Use a compact current-value panel. Highlight a changed
  number and place a small directional arrow beside it; retain a brief item
  source and numeric delta so the arrow is not the only explanation.
- Q: How should persistent scaling be shown throughout a run? → A: Update the
  scaling item’s card with its current value and show a brief post-race message
  when progression occurs. Do not add a separate run-wide progression panel.
- Q: How should finishing positions map to win/loss language and the final
  tally? → A: Positions 1–3 count as wins; positions 4–8 count as losses.
  Placement-specific wording may distinguish a narrow podium result, but the
  final tally remains binary Wins versus Losses.
- Q: Which races count toward the final Wins/Losses tally? → A: Every scored
  contest counts, including Local qualifiers, Championship races, and the Elite
  Finale. Each settled race contributes exactly once.
- Q: What makes third place a “slight win”? → A: Third place grants +1
  reputation in every scored race, including Local races. Existing credit
  payouts and Championship points remain unchanged.
- Q: How should universal non-race inventory access adapt across viewports? →
  A: Use an overlay when enough layout space is available, but switch the same
  inventory interaction to a full-window presentation on narrow/mobile
  viewports. Choose from measured available space rather than device detection;
  this does not expand Feature 032 into a project-wide mobile redesign.
- Q: Should Variable-Pitch Propeller become a persistent run-scaling item? →
  A: No. Keep it as a build-composition scaling item: each other held item with
  the `airflow` tag adds +15% to its top-speed effect. Its presentation must
  expose item tags, current matching-item count, current bonus, and the next
  match’s effect so composition scaling cannot be mistaken for time progression.
- Q: Should Feature 032 add or convert items to persistent cross-race scaling? →
  A: No. Audit and expose the shipped composition-scaling, fitted-build-value
  scaling, and cooldown/lap-activation mechanics; repair their execution or
  presentation where necessary and remove wording that incorrectly promises
  race-, encounter-, day-, or run-persistent growth. Do not invent persistent
  progression content in this bug pass.
- Q: How should item tags appear and teach synergy relationships? → A: Use
  compact tag icons on item cards. Hover may preview a tag; click/tap or keyboard
  selection pins it. Inspection shows the full tag name and matching-item count,
  and highlights every matching item on the board and in storage. Meaning and
  matching MUST remain available without hover.
- Q: How should a duplicate-purchase tier upgrade be communicated? → A: Use two
  layers: replace/dim the purchased offer slot with an immediate upgrade
  confirmation, then show a compact dismissible overlay with the item’s old
  tier, new tier, and every effect value that changed.
- Q: Should Reward Draft retain a separate `Decline all` action? → A: No.
  Replace its label with `SKIP REWARDS` and retain the same authoritative
  no-acquisition transition.
- Q: How should the non-race inventory sell target settle a drop? → A: Sell
  immediately, show a brief result with the exact payout, and provide a bounded
  Undo action that restores the exact item, tier, placement, and credits. Undo
  MUST expire before another inventory mutation or scene transition.
- Q: What balance lever should help Evelyn, Lucien, and Inez catch Nell? → A:
  Improve their exclusive item pools through item values, synergies, and
  internal combinations. Do not reduce Nell and do not alter stock vehicle
  stats; all four entrants must begin with identical physical stats.
- Q: How broadly may existing exclusive pools be changed for balance? → A:
  Tune values and synergy rules across Evelyn, Lucien, and Inez’s existing
  exclusive items. Add no new exclusive item unless deterministic testing shows
  the agreed parity bands cannot be reached through those existing pools.
- Q: What balance target should govern the item-pool pass? → A: Require both
  representative-run parity and optimized-ceiling parity. Deterministic legal
  build/draft samples must produce similar average performance, and no entrant’s
  strongest optimized legal build may remain clearly dominant.
- Q: What numeric tolerance defines balance parity? → A: Representative
  deterministic performance rates must remain within 5 percentage points
  across entrants, and optimized legal-build performance ceilings must remain
  within 2% across entrants.
- Q: What roles should the unfinished economy items serve? → A: Give each a
  distinct deterministic role: Bookmaker’s Chit modifies race income, Engine
  Builder’s Nameplate modifies selling/acquisition value, and Patron’s Brass
  Plaque modifies sponsor rewards. None resolves through live randomness.
- Q: What initial values should the three economy items use? → A: Bookmaker’s
  Chit grants +1 credit after any scored win (1st–3rd); Engine Builder’s
  Nameplate adds +1 credit to each item sale; Patron’s Brass Plaque adds +2
  credits when a sponsor contract is completed.
- Q: When should economy items be active? → A: Their economy behavior remains
  active whenever the item is held, whether installed or stored. They still
  consume limited vehicle/storage capacity, and their transaction contribution
  must identify the source item and held location.
- Q: How should higher tiers improve economy items? → A: Scale their economic
  value linearly by tier. Chit grants +1/+2/+3 win credits, Nameplate grants
  +1/+2/+3 sale credits, and Plaque grants +2/+4/+6 sponsor credits at tiers
  1/2/3 respectively.
- Q: On which surfaces should Inventory be available? → A: Every active-run
  surface except live race playback, including destination selection,
  acquisition screens, pre-race setup, Results, and the run hub. Inventory is
  temporarily unavailable only while another modal confirmation or transaction
  is unresolved, and closing it restores the exact underlying scene state.
- Q: Does deterministic crash design belong in this bug pass? → A: No. Move
  crashes, driver signature/skill exploration, overtaking drama, and other
  outcome-affecting mid-race enrichment into Feature 033. Feature 032 may expose
  existing race evidence but MUST NOT introduce those mechanics.
- Q: Which visual-polish surfaces come first? → A: Replace championship
  leg/round indicators first, then pre-race controls, then shared primary
  buttons.
- Q: What reusable art direction should govern those surfaces? → A: Use the
  approved neutral controls sheet as the initial baseline: simple readable
  silhouettes, broad calm centers, minimal outlines, and restrained
  embellishment so item art and the player build remain the focus. Use mostly
  ivory/stone/graphite UI neutrals; reserve blue, red, pale gold, and other color
  for meaningful state or content. Express the alternate world through subtle
  World's Fair technological optimism, precise near-mystical geometry, and
  occasional newspaper-inspired editorial rules or registration details—not
  literal newspaper surfaces, ornate heritage hardware, or UI-as-spectacle.
- Q: Should Feature 032 be split before planning? → A: No. Keep one feature and
  one implementation sequence, organized into independently testable
  correctness/feedback, inventory/acquisition, balance/economy, and visual-polish
  workstreams.

## Clarifications Needed

- Which exact existing exclusive-item values and synergy rules should change is
  determined by the required deterministic balance audit, within the clarified
  no-Nell-nerf and no-new-item-by-default boundary.
- Feature 033 owns deterministic crashes, driver signature/skill exploration,
  overtaking drama, and other new outcome-affecting race-enrichment mechanics.

## User Scenarios & Testing

### User Story 1 — See item and stat progression (Priority: P1)

As a player, I can see my vehicle’s live effective stats and understand exactly
when an item, amplifier, synergy, or scaling effect changes them.

**Why this priority**: Build feedback is the core learning loop. Amplification
and progression mechanics are functionally invisible if their resulting stats
cannot be observed.

**Independent Test**: Run controlled builds containing direct, amplification,
synergy, composition-scaled, fitted-value-scaled, and cooldown/lap-activation
items; reconcile every displayed stat change with immutable simulation evidence.

**Acceptance Scenarios**:

1. **Given** an item changes an effective vehicle stat during a watched race,
   **When** its recorded activation is reached, **Then** the live stat display
   shows the resulting current value, highlights the changed number, displays a
   small up/down arrow beside it, and identifies the source and numeric delta
   without recomputing it.
2. **Given** an amplifier increases another item’s effect, **When** both effects
   resolve, **Then** the player can identify the target, source, percentage or
   amount, and final effective stat.
3. **Given** a cooldown/lap item activates, **When** its recorded boundary is
   consumed, **Then** live and result presentation identify the item, stat
   change, current value, and activation cadence without claiming permanent
   race/day progression.
4. **Given** Variable Pitch Propeller or another scaling item progresses,
   **When** its card or detail view is inspected, **Then** its scaling category,
   current count/value, and next condition are explicit. Variable-Pitch
   Propeller specifically shows Airflow composition count rather than race/day
   progression.

---

### User Story 2 — Understand item rules, synergies, and tags (Priority: P1)

As a player, I can inspect an item and understand its complete rule, what
“synergy” means for that item, and every tag used to determine interactions.

**Independent Test**: Inspect representative direct, buff, amplifier, economy,
scaling, and synergy items on acquisition, inventory, race, and result surfaces;
verify authored rules, tags, activation conditions, and resolved evidence agree.

**Acceptance Scenarios**:

1. **Given** an item has tags, **When** its details are opened, **Then** every
   tag is represented by a compact icon and is not encoded by color alone.
2. **Given** a tag icon is hovered or selected, **When** inspection is active,
   **Then** its full name and matching-item count are shown and every matching
   board/storage item is highlighted.
3. **Given** touch or keyboard input, **When** a tag is selected, **Then** the
   same full-name, count, and matching-item highlights are available without
   requiring hover.
4. **Given** an item has synergy text, **When** inspected, **Then** the text names
   the triggering relationship, target stat/effect, threshold, and resulting
   behavior in player-readable language.
5. **Given** Interchangeable Test Mounts is inspected, **When** its synergy is
   described, **Then** no malformed phrase such as “synergy cornering at 50%”
   appears and the displayed rule matches its authored mechanic.
6. **Given** an economy item is available, **When** inspected and resolved,
   **Then** its economic rule is complete, observable, deterministic, and tested.

---

### User Story 3 — Acquire, upgrade, move, and sell items clearly (Priority: P1)

As a player, I can tell which offers are still purchasable, receive three fresh
offers after restocking, understand tier upgrades, rearrange parts outside a
race, and drag unwanted parts to an obvious sell target.

**Independent Test**: Purchase, upgrade, restock, rearrange, and sell items with
pointer, touch, and keyboard paths while verifying credits, build, storage,
tiers, stock, and run progression exactly once.

**Acceptance Scenarios**:

1. **Given** a Supplier item was purchased, **When** the stock remains visible,
   **Then** its slot is dimmed and disabled so it cannot be purchased twice.
2. **Given** stock contains a purchased item, **When** Restock is used, **Then**
   all three slots contain newly generated purchasable offers.
3. **Given** acquiring a duplicate increases an item’s tier, **When** acquisition
   resolves, **Then** the purchased offer slot immediately confirms the upgrade
   and a compact dismissible overlay identifies the item, old tier, new tier,
   and changed effects before play continues.
4. **Given** the player is outside active race playback, **When** inventory is
   opened, **Then** eligible parts can be rearranged using the same authoritative
   placement rules, including from pre-race setup.
5. **Given** inventory is opened on a sufficiently wide viewport, **When** it is
   presented, **Then** it appears as an overlay that preserves visible context
   beneath it.
6. **Given** inventory is opened on a narrow/mobile viewport, **When** an overlay
   would compromise readability or interaction space, **Then** the same inventory
   opens as a full-window layout and returns to the exact prior context when closed.
7. **Given** an item is dragged on an eligible inventory surface, **When** drag
   begins, **Then** an obvious sell zone appears and dropping there previews and
   performs the existing deterministic sale exactly once.
8. **Given** Reward Draft is open, **When** the player chooses `SKIP REWARDS`,
   **Then** no item is accepted and build, storage, and credits remain unchanged.

---

### User Story 4 — Receive correct outcome and balance feedback (Priority: P1)

As a player, I receive placement language and character power that match the
game’s intended reward structure.

**Independent Test**: Resolve representative championship placements and
equivalent builds for all four entrants; verify outcome labels, rewards, and
balance targets against the clarified policy.

**Acceptance Scenarios**:

1. **Given** the player finishes first, second, or third, **When** Results
   appears, **Then** it is presented as a win rather than “You lose” and adds
   exactly one win to the final run tally.
2. **Given** the player finishes fourth through eighth, **When** Results
   appears, **Then** it is presented as a loss and adds exactly one loss to the
   final run tally.
3. **Given** equivalent legal builds across entrants, **When** balance cases are
   evaluated, **Then** Evelyn, Lucien, and Inez receive additive improvements
   toward the agreed power band without weakening Nell.
4. **Given** a fresh run for any entrant, **When** stock vehicle stats are
   compared before items or setup effects, **Then** all four vehicles have the
   same starting physical stats.
5. **Given** a run reaches its final summary, **When** the player reviews the
   run, **Then** the screen shows at minimum the run’s wins and losses alongside
   final championship points and reputation.
6. **Given** a race is included in the clarified record policy, **When** it is
   settled, **Then** its outcome contributes exactly once to the final tally.

---

### User Story 5 — Use a clearer, more finished interface (Priority: P2)

As a player, I see intentional controls and championship progress decoration
instead of placeholder borders and primitive shapes.

**Independent Test**: Review the pre-race screen and representative run/tour
surfaces at supported viewports; verify controls remain legible, accessible,
and consistent after visual replacement.

**Acceptance Scenarios**:

1. **Given** pre-race setup is open, **When** controls are viewed unfocused,
   **Then** no unintended blue border surrounds its buttons; keyboard focus
   remains clearly visible when actually focused.
2. **Given** championship leg progress is displayed, **When** viewed, **Then**
   authored decorative indicators replace placeholder shapes without changing
   progression meaning.
3. **Given** a shared button or decoration is replaced, **When** used with
   pointer, touch, or keyboard, **Then** its state and action remain clear
   without relying on color alone.

## Functional Requirements

- **FR-001**: Watched races MUST display recorded live effective vehicle stats
  in a compact current-value panel and publish attributable changes at
  item/event boundaries.
- **FR-001A**: A changed stat MUST highlight its current number and show a small
  directional arrow beside it. The direction MUST also be communicated by a
  signed numeric delta and source label rather than arrow or color alone.
- **FR-002**: Live-stat presentation MUST consume immutable race evidence and
  MUST NOT influence simulation or settlement.
- **FR-003**: Amplification presentation MUST identify source, target, applied
  magnitude, and resulting effective value.
- **FR-004**: Every item detail view MUST expose all authored tags and expanded,
  mechanic-accurate synergy explanations.
- **FR-004A**: Item cards MUST represent every authored tag with a compact,
  distinguishable icon. Hover MAY preview tag inspection, but click/tap and
  keyboard selection MUST pin the same inspection state.
- **FR-004B**: Tag inspection MUST show the full tag name, display the current
  matching-item count, and highlight all matching items on the board and in
  storage without relying on color alone.
- **FR-005**: Every shipped scaling-like item MUST be audited and classified as
  composition scaling, fitted-build-value scaling, or cooldown/lap activation.
  Its rule text, card state, live evidence, and result evidence MUST agree with
  that authoritative category and MUST NOT imply race/day persistence it lacks.
  Feature 032 MUST NOT add or convert an item to cross-race progression.
- **FR-005B**: When an audited lap activation changes an effective stat, the
  compact live-stat feedback from FR-001 MUST expose the current value, source,
  and delta. Composition and fitted-value scaling MUST expose their current
  input count/value and resolved effect on item inspection.
- **FR-005A**: Variable-Pitch Propeller MUST remain composition-scaled, gaining
  +15% top-speed effect per other held `airflow` item. It MUST NOT gain permanent
  race/day stacks. Its card/details MUST show the `airflow` tag, matching-item
  count, applied bonus, and next-match effect.
- **FR-006**: Variable-Pitch Propeller and Interchangeable Test Mounts MUST have
  mechanic-accurate, verifiable presentation.
- **FR-007**: Purchased Supplier stock MUST become visibly unavailable and
  cannot be purchased again before restock.
- **FR-008**: Supplier Restock MUST replace all three stock positions with three
  fresh eligible offers, including positions previously purchased.
- **FR-009**: Duplicate tier upgrades MUST show a prominent before/after result
  and changed item effects through both an immediate purchased-slot confirmation
  and a compact dismissible upgrade overlay.
- **FR-010**: Reward Draft MUST expose clear `SKIP REWARDS` behavior backed by
  the existing declined acquisition outcome and MUST NOT retain a second,
  semantically duplicate `Decline all` action.
- **FR-011**: First through third place MUST use win presentation and count as
  wins; fourth through eighth MUST use loss presentation and count as losses.
- **FR-011A**: Third place MUST award +1 reputation in every scored race,
  including Local races, while retaining the existing credit payout and
  Championship-point table.
- **FR-012**: Character balance MUST improve Evelyn, Lucien, and Inez toward the
  agreed target exclusively through improvements to their exclusive item pools,
  without reducing Nell or changing any stock vehicle stats. All four entrants
  MUST begin with identical physical stats. Balance acceptance MUST cover both
  representative deterministic run performance and optimized legal-build
  ceilings within the 5-percentage-point and 2% bands respectively.
  Exact item changes MUST be selected from reproducible balance evidence during
  implementation rather than preselected without measurement.
- **FR-012A**: The final run summary MUST display a win/loss tally in addition
  to final championship points and reputation.
- **FR-012B**: The win/loss tally MUST derive from retained authoritative race
  history and count every scored Local qualifier, Championship race, and Elite
  Finale exactly once. With eight-car ordered placement there is no separate tie
  bucket; the retained placement determines the binary win/loss classification.
- **FR-013**: Pre-race setup MUST remove unintended persistent blue borders while
  preserving a visible keyboard-focus state.
- **FR-014**: Players MUST be able to rearrange inventory from pre-race setup and
  every active-run surface except live race playback using authoritative garage
  placement rules. Entry MUST be disabled while another modal confirmation or
  transaction is unresolved.
- **FR-014A**: Inventory MUST use an overlay where measured layout space safely
  supports it and a full-window presentation on narrow/mobile layouts. Both
  presentations MUST expose equivalent actions and return to the exact prior
  context; viewport selection MUST NOT depend on user-agent/device detection.
- **FR-014B**: Opening and closing Inventory MUST preserve the exact underlying
  destination, acquisition, setup, Results, or run-hub context, including
  selections, focus, offers, and navigation state that Inventory did not
  explicitly mutate.
- **FR-015**: Eligible drag surfaces MUST reveal a sell drop target during item
  drag and use the existing authoritative sale-value and inventory rules.
- **FR-015A**: Dropping an eligible held item onto the sell target MUST settle
  the sale immediately and expose a brief Undo action with the exact payout.
  Undo MUST atomically restore the item ID, tier, prior installed/storage
  position, and pre-sale credits, and MUST expire before any subsequent
  inventory mutation or scene transition.
- **FR-016**: Remaining economy items MUST receive complete deterministic
  behavior and evidence. Bookmaker’s Chit MUST own race-income behavior, Engine
  Builder’s Nameplate MUST own selling/acquisition behavior, and Patron’s Brass
  Plaque MUST own sponsor-reward behavior.
- **FR-016A**: Bookmaker’s Chit MUST grant +1 credit exactly once after an
  eligible scored finish in positions 1–3 at tier 1, +2 at tier 2, and +3 at
  tier 3.
- **FR-016B**: Engine Builder’s Nameplate MUST add +1 credit to the authoritative
  sale value of each eligible sold item at tier 1, +2 at tier 2, and +3 at tier 3.
- **FR-016C**: Patron’s Brass Plaque MUST add +2 credits exactly once when an
  eligible sponsor contract completes successfully at tier 1, +4 at tier 2,
  and +6 at tier 3.
- **FR-016D**: Economy effects MUST be shown in transaction breakdowns and MUST
  never resolve through live randomness.
- **FR-016E**: Chit, Nameplate, and Plaque economy behavior MUST remain active
  while installed or stored, provided the item is authoritatively held when the
  eligible transaction resolves.
- **FR-017**: Selected placeholder shapes and buttons MUST be replaced by reusable
  authored decorations/assets without changing their semantic state, prioritized
  as championship leg/round indicators, pre-race controls, then shared primary
  buttons.
- **FR-017A**: New UI chrome MUST keep items, builds, vehicles, and race action
  visually dominant through neutral surfaces, simple silhouettes, broad label
  space, restrained state accents, and sparse World's Fair/editorial geometry.
  It MUST NOT apply a literal newspaper skin or ornate mechanical frame to the
  whole interface.
- **FR-018**: Reward Draft MUST hide Test Day until DEMO-001’s exact-return defect
  is permanently resolved.
- **FR-019**: All changes MUST preserve deterministic race, acquisition,
  settlement, and run-state authority.
- **FR-020**: Feature 032 MUST NOT add crashes, driver signature/skill mechanics,
  overtaking rules, comeback rules, or other new outcome-affecting race events;
  those concerns are deferred to Feature 033 Race Enrichment.

## Deferred to Feature 033 — Race Enrichment

Deterministic crashes, driver signature/skill mechanics, overtaking drama, and
mid-race comeback opportunities now have a dedicated exploratory intake at
`specs/033-race-enrichment/intake.md`. Feature 032 does not implement or balance
them.

## Success Criteria

- **SC-001**: Controlled race cases show 100% agreement between displayed live
  stats/amplification and recorded lap evidence, and every shipped scaling-like
  item is reconciled to its audited category with no false persistence claim.
- **SC-002**: All shipped item details expose 100% of authored tags and no known
  malformed synergy descriptions.
- **SC-003**: Purchase/restock tests produce zero repeat purchases and exactly
  three fresh eligible offers after every successful restock.
- **SC-004**: Tier-up, sell, skip, and inventory operations mutate authoritative
  state exactly once across pointer, touch, and keyboard paths.
- **SC-005**: Third-place language and settlement agree in every tested result.
- **SC-006**: Balance evidence places all four entrants within the clarified
  average-performance band of 5 percentage points and optimized-ceiling band of
  2% without reducing Nell’s authored power or changing stock vehicle stats.
- **SC-007**: Every final run summary shows wins and losses whose total and
  individual counts exactly reconcile with the eligible retained race history.
- **SC-008**: Replaced controls and decorations have no overlap, clipping, or
  lost focus indication at supported landscape viewports.

## Assumptions

- This feature fixes and exposes existing mechanics before adding new ones.
- Existing simulation, garage, tiering, and economy authorities are reused.
- Mobile-specific work is limited to the inventory component’s full-window
  adaptation; broader project-wide responsive/mobile redesign remains separate.
- Stock vehicles remain statistically identical; entrant identity and balance
  differences come from exclusive items rather than baseline vehicle power.
- Generated UI assets will be specified and produced during planning/tasks,
  using `public/assets/ui/source/feature-032-controls-sheet-chroma.png` and its
  transparent working copy `public/assets/ui/feature-032-controls-sheet.png` as
  the approved initial control-language source. Cropping, nine-slice regions,
  runtime integration, and responsive validation remain implementation work.
- Multiplayer parity remains mandatory: every outcome-affecting fact is
  deterministic, retained, and available to every player under the same rules.
