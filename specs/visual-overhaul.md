# Visual Overhaul - Master Experience Specification

**Created**: 2026-08-08

**Status**: Approved product direction; implementation must be split into
feature-sized vertical slices through the normal Spec Kit workflow.

**Related decisions**:

- `specs/vision.md`
- `specs/launch-roster.md`
- `specs/vehicle-topology.md`
- `.specify/memory/constitution.md`

## Purpose

Transform the functional prototype into a coherent game interface for the 1901
Auto Race Championship. The overhaul must make the entrant, named vehicle, run
state, economy, item interactions, and race consequences legible on every
screen without replacing the completed simulation and progression systems.

The interface should feel like operating a strange early racing machine within
a newly organized sporting championship, not like managing an abstract row of
cards on a generic autobattler board.

## Current-state audit

The audit was performed against the running build at `http://127.0.0.1:5174/`
and the owning Phaser scenes on 2026-08-08.

### What already works

- A complete six-stage run can progress through encounter choices, Supplier,
  Reward Draft, Sponsor Meeting, two watched PvP races, results, and summary.
- Credits, item prices, affordability, sponsor objectives, race progress,
  leader gap, board items, storage, and ordered history all exist as domain data.
- Item cards have icons, cooldowns, effect text, and hover tooltips.
- Drag-and-drop acquisition and board/storage movement work.
- The race is resolved before playback and already exposes lap/item contribution
  data suitable for richer presentation.
- Missing run context has an explicit unavailable state.

### Gap analysis

| Priority | Gap | Current evidence | Required direction |
|---|---|---|---|
| P0 | Canvas is clipped on narrower display surfaces | The fixed 800x450 canvas rendered with a negative horizontal offset in the shared browser; both edges and controls became unreachable | Responsive scaling and layout constraints with no horizontal clipping |
| P0 | No title or start flow | `RunScene` creates a fresh run immediately on boot | Title menu, deliberate New Championship action, settings, and valid resume handling |
| P0 | No entrant selection | Every run silently uses the Performance identity and baseline car | Four-entrant selection with machine and ecosystem preview before run creation |
| P0 | Board contradicts vehicle-topology decision | Prepare and race screens render three generic boxes labeled BOARD | Named vehicle workshop with Power, Chassis, and Flex slots plus installation states |
| P1 | Credits are not persistent | Run and acquisition headers show credits; contest and result omit them | One run HUD present on every screen carrying active run context |
| P1 | Entrant and vehicle identity disappear | Screens use PLAYER, BOARD, and baseline content | Entrant portrait/name, machine name, origin, and vehicle silhouette persist through the run |
| P1 | Run hub lacks hierarchy | Stage labels, encounter choices, history, status, and sponsor text compete as similarly weighted text | Route map, clear current stage, encounter summaries, persistent resources, and build snapshot |
| P1 | Acquisition hides critical comparison data | Item name/icon/price are visible, but full effects require hover and no fit state exists | Comparable item cards, explicit category, Fitted effect, mismatch consequence, and placement preview |
| P1 | Race lacks identity and context | Competitors are colored dots labeled PLAYER and GHOST; stage, credits, machine, sponsor, and stakes are absent | Illustrated vehicle markers, named competitors, race stakes, topology-aware item tray, and subdued persistent HUD |
| P1 | Result does not settle the run economically | Outcome, time, gap, board, and storage are shown; purse, sponsor resolution, and resulting balance wait until later | Result settlement with before/earned/after credits, sponsor result, key contributions, and next action |
| P1 | Build Testing Access is absent | No low-stakes test path exists | Test Day entry and result flow before broader overhaul release, per Constitution Principle V |
| P2 | UI depends on hover and drag | Tooltips and placement assume a mouse | Click/tap selection plus destination placement, keyboard focus, and persistent detail panel |
| P2 | Text is small and presentation is monochrome | Most hierarchy uses 10-18px type on a near-black field | Period-specific visual system, readable type scale, icons, texture, and stronger hierarchy |
| P2 | Disabled and unavailable states are weak | State is often communicated by dim text alone | Icon, label, affordance, and reason for every disabled state |
| P2 | No pause/settings surface | No global controls outside scene-specific actions | Settings overlay for audio, playback speed, accessibility, and return-to-title confirmation |

## Experience principles

### 1. The vehicle is the build

The named machine is the central build surface. Items must appear installed on
or carried by it. The interface may abstract exact physical mounting locations,
but it must never revert to calling the active build a board.

### 2. Persistent run context

On every screen with an active run, the player must be able to identify:

- selected entrant and named vehicle;
- current credits;
- current stage and total stages;
- pending sponsor contract, when one exists;
- how to reach item details, settings, and the next primary action.

### 3. Decisions before decoration

The most visually prominent elements must be the current decision, vehicle
state, race state, or outcome. Period styling supports those elements and must
not make values, fit states, prices, or controls harder to read.

### 4. One fact, one source

Credits, stage progress, item behavior, installation state, sponsor objectives,
and race outcomes must come from domain or presentation models shared by every
screen. Scenes must not reconstruct or restyle contradictory versions of the
same fact.

### 5. Spectation includes explanation

Race presentation must show not only who leads but which installed items and
installation effects are producing meaningful changes. Results must preserve
that explanatory thread.

## Information architecture

```text
Boot
  -> Title Menu
      -> New Championship
          -> Entrant Selection
              -> Championship Introduction
                  -> Run Hub
      -> Continue Championship (only with valid resumable state)
      -> Test Day (after an entrant/build exists)
      -> Settings

Run Hub
  -> Encounter Detail
      -> Vehicle Workshop / Reward Draft / Parts Supplier
      -> Sponsor Meeting
      -> PvP Race Briefing -> Contest -> Race Result -> Run Hub
  -> Test Day -> Practice Contest -> Practice Result -> prior run state
  -> Run Summary -> New Championship / Title Menu
```

No menu or overlay may allow build changes after a scored contest begins.

## Global application shell

### Run HUD

Every active-run screen must use the same HUD model and visual placement. It
contains:

- entrant portrait or compact emblem;
- entrant name and vehicle name;
- stage position, such as `Stage 3 / 6`;
- credits with a coin/chit icon and exact integer balance;
- pending sponsor indicator with objective and payout tooltip/detail;
- settings button.

Credits must remain visible during encounter choice, workshop/acquisition,
Sponsor Meeting, race briefing, contest playback, result settlement, Test Day,
and run summary. A screen before run creation may show no balance because no
run-scoped credits exist yet; it must not invent a zero balance.

Credit changes animate once at the shared HUD and show a signed source label,
for example `+2 Participation Purse` or `-1 Restock`. Animation must not delay or
alter the underlying transaction.

### Responsive frame

- Reference composition: 1280x720, landscape.
- Required supported checks: 1920x1080, 1366x768, 1024x768, and 390x844.
- No viewport may horizontally clip the canvas, primary action, resource HUD,
  vehicle slots, or item details.
- The game may letterbox to preserve a designed aspect ratio on wide screens,
  but the letterbox must not crop interaction regions.
- On narrow portrait screens, the interface reflows into vertically stacked
  regions and supports tap-select-then-place. It must not merely shrink desktop
  text and slots until unreadable.
- Text must remain at least 14 CSS pixels for supporting UI and 16 CSS pixels for
  interactive labels at the final rendered size.
- Safe-area insets must be respected on mobile devices.

### Input model

- Mouse: drag items or click an item then click a destination.
- Touch: tap an item, inspect its persistent detail panel, then tap a destination.
- Keyboard: tab through controls and items, Enter/Space selects, arrow keys move
  between slots, Escape cancels selection or closes the top overlay.
- Hover may reveal a shortcut tooltip, but no required information may exist
  only on hover.

## Screen specifications

### Title menu

The first screen presents the championship as the first-viewport signal using a
full-bleed illustrated race-start scene or animated in-engine tableau. The title
is not placed inside a card.

Required actions:

- **New Championship**: primary action; continues to Entrant Selection.
- **Continue Championship**: shown only when valid resumable state exists;
  disabled state must explain why if persistence is not yet implemented.
- **Test Day**: available only when a valid entrant/build context exists.
- **Settings**: icon button with tooltip/accessible label.

The title screen must not automatically create or mutate a run.

### Entrant selection

Present Evelyn Mercer, Lucien Soto, Inez Rook, and Nell Voss as four selectable
entrants. Selection changes one shared detail region rather than nesting cards.

The detail region must show:

- portrait, entrant name, background, and short approach-to-racing statement;
- named vehicle and large inspectable silhouette;
- ecosystem vocabulary and representative item imagery;
- Power/Chassis/Flex slot distribution visualized as a compact topology strip;
- explicit statement that every entrant has equal total capacity and baseline pace;
- primary **Enter Championship** action.

Do not summarize entrants as one mechanical strategy. Copy should describe the
item ecosystem and several possible directions.

### Championship introduction

A brief skippable illustrated sequence establishes the inaugural 1901 event,
the selected invitation, and the entrant arriving with their machine. It may be
one to three panels and must lead directly to the run hub. It cannot hide a
loading step behind unskippable animation.

### Run hub

The run hub is an operational championship screen, not a marketing dashboard.
It contains:

- shared Run HUD;
- a six-stage route with completed, current, upcoming, and unavailable states;
- current encounter choices as two clear options with icon, type, concise rules,
  possible economic consequence, and primary action;
- compact vehicle summary showing occupied topology slots and storage count;
- pending sponsor contract and progress/stakes;
- collapsible chronological history or ledger.

The current decision must dominate. Completed history and future stages remain
available for inspection but use lower visual weight.

### Vehicle workshop and acquisition

Reward Draft and Parts Supplier share a workshop frame so the player's vehicle
does not jump between unrelated layouts.

Layout regions:

1. Shared Run HUD.
2. Encounter inventory: draft choices or supplier stock with price and state.
3. Central named vehicle silhouette with installed slots anchored consistently.
4. Storage/tool tray.
5. Persistent selected-item inspector.
6. Encounter actions: decline, restock, leave, or confirm where applicable.

Supplier stock must expose price, affordability, purchased state, and restock
cost without requiring hover. Reward Draft must state `Choose one` and make
declining all equally deliberate.

### Sponsor Meeting

Use a dedicated negotiation composition with one immediate payout and two
conditional contracts. Each option shows:

- objective in plain language;
- exact threshold where applicable;
- payout;
- next-race expiry;
- current build relevance where it can be computed without prediction;
- confirmation before replacing or creating a pending obligation.

Credits remain in the Run HUD, and accepting the immediate payout animates the
transaction there.

### Test Day

Build Testing Access is presented diegetically as a Test Day or proving-ground
session and must be the first implementation slice after run progression.

The player can:

- enter from an appropriate pre-contest run surface;
- test the current immutable build against at least one disclosed sample rival;
- inspect the same lap, item, Fitted, and Improvised contribution data as a
  scored contest;
- return with run stage, credits, encounter state, and build unchanged.

The UI must label the session **Unscored** before, during, and after playback.
No purse, sponsor resolution, encounter completion, or run-history result may be
created by Test Day.

### Race briefing

Before a scored race, show:

- player entrant and named vehicle;
- known opponent/ghost identity and machine when available;
- lap count;
- participation purse and win bonus;
- pending sponsor objective and payout;
- installed build summary and installation states;
- **Start Race** action.

Starting the race locks the build and transitions to input-free playback.

### Contest playback

The race remains the primary full-width visual. Required presentation:

- illustrated track and recognizable vehicle sprites/silhouettes instead of dots;
- entrant/opponent names, lap progress, leader, and numeric gap;
- subdued Run HUD including credits and stage;
- topology-aware installed-item tray using Power/Chassis/Flex slot treatments;
- item firing, buff relationship, Fitted effect, and Improvised consequence
  callouts sourced from immutable contest data;
- pause and presentation-speed controls that do not change simulation outcome;
- persistent **Scored Race** or **Unscored Test Day** label.

The interface must remain understandable with animation reduced or disabled.

### Race result and settlement

The result continues the visual identity of the race and must show:

- outcome, both named competitors, times, gap, and lap count;
- credit balance before race, participation purse, win bonus, sponsor payout,
  and resulting balance;
- sponsor success/failure with actual versus required values;
- two to four most consequential item or installation contributions, with access
  to the complete lap breakdown;
- installed vehicle and storage state used for that immutable result;
- one clear **Continue Championship** action.

An unscored Test Day result replaces settlement with an explicit `No run state
changed` message and returns to the prior screen.

### Run summary

Show the selected entrant and vehicle, complete route, PvP record, final credit
balance, sponsor outcomes, major build changes, and final installed vehicle.
Provide **New Championship** and **Title Menu** actions. Starting a new run must
be explicit and must not occur by merely leaving the summary.

### Settings and recovery

Settings must cover master/music/effects volume, race presentation speed,
reduced motion, text scale where feasible, and fullscreen. Returning to title
during an active run requires confirmation.

Unavailable or corrupt run state must present a clear recovery surface with
Title Menu and New Championship actions. It must never silently generate a
replacement path.

## Vehicle-topology UI

This section is binding for the future replacement of the generic board.

### Vehicle presentation

- The named vehicle is shown as an unframed illustrated silhouette or cutaway,
  not inside a decorative card.
- Slots may be arranged around or over stable mounting regions, but exact screen
  coordinates carry no gameplay meaning.
- Slots of the same type are interchangeable. No adjacency or spatial-packing
  mechanics are implied.
- The slot layout remains stable while items are hovered, selected, fired,
  moved, or inspected.

### Slot language

Slot state must use icon, label, shape treatment, and color; color alone is not
sufficient.

- **Power**: energy/drive icon and a warm metal accent.
- **Chassis**: frame/suspension icon and a structural cool accent.
- **Flex**: split Power/Chassis icon and a neutral enamel treatment.
- **Occupied**: installed item art remains primary; slot type remains visible at
  the edge or mounting plate.
- **Selected destination**: strong focus ring.
- **Invalid action**: used only for genuinely illegal operations such as a full
  destination without an eviction choice, never for category mismatch.

### Item card information

Every item card and inspector must expose:

- name and art/icon;
- origin emblem;
- Power or Chassis category;
- synergy tags;
- base effect and cooldown/trigger;
- authored Fitted effect;
- authored Improvised consequence, or explicit `No additional mismatch effect`;
- price and affordability in economic encounters;
- active-while-stored state where applicable.

Compact cards may abbreviate effect text, but selecting one must open the full
inspector without leaving the screen.

### Placement preview

Before commitment, every candidate destination reports one of:

- **Fitted**: base effect plus the exact authored Fitted effect;
- **Flexible**: base effect only;
- **Improvised**: base effect, lost Fitted effect, and exact visible consequence.

The preview must show changed numbers or trigger text, not merely the state
name. Mismatch remains a valid action and cannot be styled as an error.

When the destination is occupied, the player sees the displaced item and must
confirm eviction or swap through the existing rules. Cancel returns both items
to their prior state.

### Race and result continuity

The workshop slot order and type treatment must carry into race playback and
results. Fitted and Improvised activations use distinct but restrained callout
badges, and their exact contribution remains inspectable after the race.

## Visual direction

### Character

The interface draws from early sporting programs, coachbuilder plates,
machinist catalogs, enamel instrument panels, stamped race credentials, and
illustrated newspapers. It should feel newly standardized: official typography
and route markings coexist with hand-authored notes, patched machinery, and
entrant-specific materials.

### Palette

Use a balanced material palette rather than a monochrome dark UI:

- ink black and warm paper for structural contrast;
- brass/yellow for championship actions and credits;
- oxblood/red for risk, loss, and Backroads accents;
- oxidized teal/green for mechanical status and Fieldworks accents;
- porcelain white and steel blue for timing/data;
- entrant-specific accents that never replace shared semantic colors.

Avoid gradients, decorative color blobs, excessive sepia, and a uniformly brown
or slate interface.

### Typography

- Display: expressive period slab or condensed serif for championship names and
  outcomes.
- Operational UI: highly readable humanist or grotesque face for values,
  controls, and item effects.
- Numeric telemetry: tabular numerals.
- Type must not use viewport-width scaling or negative letter spacing.
- The current typewriter treatment may remain as a minor flavor voice, not the
  only font for all UI.

### Motion

Use motion to explain state changes:

- route marker advances;
- credits move once from transaction source to balance;
- item physically settles into a slot and reveals its installation state;
- race callouts connect an effect to the installed item;
- result contributions resolve in chronological order.

Reduced-motion mode replaces travel and flourish with short fades or immediate
state changes. No essential information depends on motion.

## Functional requirements

- **UI-FR-001**: Boot MUST open the Title Menu without creating a run.
- **UI-FR-002**: New Championship MUST require entrant selection before run creation.
- **UI-FR-003**: All active-run screens MUST render one shared HUD containing entrant, vehicle, stage, credits, sponsor state, and settings access.
- **UI-FR-004**: Credits MUST be visible throughout every active-run screen and every change MUST identify amount, source, and resulting balance.
- **UI-FR-005**: The interface MUST render without horizontal clipping at all required target viewports.
- **UI-FR-006**: Every primary workflow MUST be usable by mouse, touch without hover, and keyboard.
- **UI-FR-007**: Required item information MUST NOT be available only through hover.
- **UI-FR-008**: The Run Hub MUST distinguish completed, current, upcoming, and unavailable stages and make the current choice visually dominant.
- **UI-FR-009**: Entrant selection MUST describe thematic ecosystems and topology without prescribing a single strategy.
- **UI-FR-010**: The active build surface MUST be labeled and presented as the entrant's named vehicle, never as a board.
- **UI-FR-011**: Vehicle slots MUST communicate Power, Chassis, and Flex through more than color.
- **UI-FR-012**: Every item MUST visibly communicate origin, installation category, synergy tags, base effect, Fitted effect, and Improvised behavior.
- **UI-FR-013**: Placement preview MUST show the exact resulting installation state and behavior before commitment.
- **UI-FR-014**: Category mismatch MUST remain visibly legal and MUST NOT be styled as an invalid drop.
- **UI-FR-015**: Flex placement MUST clearly communicate base behavior without a Fitted effect or Improvised consequence.
- **UI-FR-016**: Storage MUST remain visually separate from installed vehicle slots and MUST NOT imply installation affinity.
- **UI-FR-017**: Race briefing MUST disclose lap count, purse, win bonus, sponsor stakes, opponent information, and locked build.
- **UI-FR-018**: Contest playback MUST use recognizable vehicle presentations and named competitors rather than anonymous dots and generic PLAYER/GHOST labels.
- **UI-FR-019**: Contest playback MUST preserve topology slot order and explain item, Fitted, and Improvised contributions from immutable result data.
- **UI-FR-020**: Result settlement MUST show complete credit and sponsor resolution before the player continues.
- **UI-FR-021**: Full lap and item attribution MUST remain inspectable from results.
- **UI-FR-022**: Build Testing Access MUST be delivered before later overhaul slices are treated as a release boundary.
- **UI-FR-023**: Test Day MUST leave credits, stage, encounter, sponsor, build, and scored history unchanged.
- **UI-FR-024**: Settings MUST include audio, reduced motion, race presentation speed, and fullscreen controls.
- **UI-FR-025**: Missing or corrupt run context MUST never silently create a replacement run.
- **UI-FR-026**: Visual state MUST not be communicated through color alone.
- **UI-FR-027**: All dynamic labels, item names, values, and translated-length text MUST remain within their allocated regions without overlap.

## Measurable outcomes

- **UI-SC-001**: At each required viewport, 100% of primary controls and active
  vehicle slots are visible or reachable through intentional vertical scrolling,
  with zero horizontal page scrolling or clipping.
- **UI-SC-002**: From any active-run screenshot, a reviewer can identify entrant,
  vehicle, stage, credits, and pending sponsor state without navigating.
- **UI-SC-003**: Before placing any item, a player can state whether it will be
  Fitted, Flexible, or Improvised and describe the exact behavior difference.
- **UI-SC-004**: A player can complete acquisition using touch or keyboard without
  invoking hover or drag.
- **UI-SC-005**: After a race, the displayed transaction breakdown reconciles
  exactly to the new credit balance in 100% of win, loss, tie, and sponsor cases.
- **UI-SC-006**: Test Day produces identical run state before and after except for
  presentation-local practice results.
- **UI-SC-007**: A spectator unfamiliar with the build can name the leader,
  current lap, gap, both vehicles, and the source of the latest meaningful item
  effect from one race frame.
- **UI-SC-008**: Automated screenshot checks at desktop, tablet, and mobile show
  no overlapping UI, blank canvas, missing assets, or text outside containers.

## Implementation sequence

This master spec MUST NOT be implemented as one feature. Each slice requires its
own `/speckit.specify -> /speckit.plan -> /speckit.tasks -> /speckit.implement`
cycle and executable/browser validation.

### Slice 1 - Build Testing Access and shell foundation

- Title Menu and minimum shared responsive frame.
- Persistent active-run HUD, including credits.
- Test Day entry, unscored race/result labeling, and unchanged-run invariant.
- Basic settings access needed for playback and reduced motion.

This is the mandatory immediate follow-up to run progression.

### Slice 2 - Entrant selection and run identity

- Four-entrant selection.
- Named vehicle and ecosystem presentation.
- Run identity carried through all scene/presentation models.
- Championship introduction and title-menu return flow.

### Slice 3 - Vehicle topology vertical slice

- Power/Chassis item migration and Fitted/Improvised domain result data.
- Vehicle slot distributions with equal total capacity.
- Workshop, storage, placement preview, touch/keyboard placement.
- Topology-aware race tray and result attribution.

This slice changes simulation-facing item contracts and therefore requires
strict test-first coverage before presentation work.

### Slice 4 - Run hub and encounter overhaul

- Route map, encounter presentation, Supplier, Reward Draft, Sponsor Meeting.
- Transaction animation and persistent selected-item inspector.
- Full responsive and non-hover acquisition workflows.

### Slice 5 - Race broadcast and result settlement

- Illustrated tracks and vehicle sprites.
- Named opponent presentation and race briefing.
- Effect callouts, presentation controls, settlement, and detailed breakdown.

### Slice 6 - Completion, accessibility, and art integration

- Run summary, recovery, settings completion, text/input accessibility.
- Final character/vehicle/environment assets and loading states.
- Cross-viewport screenshot, interaction, and canvas-pixel validation.

## Out of scope for this master decision

- Changing contest math, run economy values, encounter schedule, or sponsor rules.
- Adding live race control or synchronous multiplayer.
- Final item balance or exact per-vehicle slot distributions.
- Durable save design beyond defining honest Continue availability.
- A 3D rendering migration.
- Adjacency, item rotation, or Backpack-Battles-style spatial packing.