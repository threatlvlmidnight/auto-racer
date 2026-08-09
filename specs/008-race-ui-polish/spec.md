# Feature Specification: Race UI Polish — Buff Flashes, Item Clarity, Race Tooltips

**Feature Branch**: `008-race-ui-polish`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "There are a couple of ui items I'd like to tidy up before we move on to the run setup. First, let's add animations when items fire. Also, if you have an item that buffs another performance item, that item should also flash when it goes off like the performance item, that way its easy to see its impacts. I'd also like to improve the items. We need to list the item cooldowns when picking items. So like a performance item that triggers every lap would have a 1 lap cooldown. Per lap bonus need to be indicated as well and if it buffs when another item goes off we need to include that too. We also need item tooltips when the player mouses over their items during the race."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A buff's impact is visible the moment it happens (Priority: P1)

While watching a race, a player has a buff item on their board (say, a Performance-boosting item) alongside the direct items it boosts. Today, when a boosted direct item fires and flashes, the buff item that made that firing stronger sits there inert — nothing on screen ties the buff to the outcome it just caused. The player wants the buff item to flash in the same moment as the item(s) it's boosting, so the connection between "I built around this buff" and "here's it paying off" is visible in real time, not just inferable from the final time.

**Why this priority**: This is the core legibility gap driving the whole feature — buffs are currently the *least* visible items on the board even though they can be the biggest contributors to a build's outcome. Fixing this delivers value on its own, independent of the other two stories.

**Independent Test**: Run a race with a build holding at least one buff item and at least one matching direct item on the board. Confirm the buff item visibly flashes on every lap where it contributes to a direct item's firing, and does not flash on laps where no matching item fires (nothing for it to have boosted that lap).

**Acceptance Scenarios**:

1. **Given** a board holding a buff item and a matching direct item, **When** the direct item fires on a lap, **Then** both the direct item and the buff item flash at the same time.
2. **Given** a board holding a buff item with no matching direct item present, **When** any lap passes, **Then** the buff item never flashes (it has nothing to boost).
3. **Given** a board holding a buff item and two matching direct items that both fire on the same lap, **When** that lap plays, **Then** the buff item flashes once for that lap (not once per direct item it boosted).
4. **Given** a stacking buff item, **When** it flashes because a matching item fired, **Then** this is visually the same flash treatment as a direct item firing — the player doesn't need to know "buff" vs. "direct" to read the board.

---

### User Story 2 - Item cards explain cooldown, effect, and dependencies in plain language (Priority: P2)

While choosing items during the prepare phase (and while reviewing the board/storage lists on the result screen), a player currently sees an item's raw effect (e.g. "-3s" or "Boosts Performance items by 5%") but has no way to tell how often it fires, or that a buff item does nothing unless paired with a matching item. The player wants every item's card to state its cooldown in laps (including "1 lap" for items that fire every lap), and — for buff items — a plain statement that the boost only applies to matching items that are also active.

**Why this priority**: This builds directly on User Story 1 — once buffs visibly flash, players need the text on the card itself to explain *why* (their dependency on a matching item) and *how often* (cooldown). It's independently valuable even without Story 1, since cooldown is currently not shown anywhere at all.

**Independent Test**: View any item's card (prepare-phase offer, prepare-phase held item, or result-screen board/storage list) and confirm it states the item's cooldown in laps and, for buff items, that the boost requires a matching active item.

**Acceptance Scenarios**:

1. **Given** a direct item with an authored cooldown of N laps, **When** its card is shown anywhere, **Then** the card states "N lap" / "N laps" cooldown alongside its effect.
2. **Given** an item with no authored cooldown (fires every lap), **When** its card is shown, **Then** the card states a "1 lap" cooldown rather than omitting cooldown information.
3. **Given** a buff item (flat, stacking, or count-synergy), **When** its card is shown, **Then** the card states that its boost only applies while a matching item is active, in addition to its existing effect description.
4. **Given** the same item shown in the prepare phase and on the result screen, **When** its card renders in either place, **Then** the cooldown and dependency text read identically (one shared description, not two).

---

### User Story 3 - Item tooltips during the race (Priority: P3)

While watching a race, a player wants to mouse over an item on their board to see its full card (name, tag, effect, cooldown, dependency note) without needing to remember it from the prepare phase or wait for the result screen.

**Why this priority**: Useful polish that completes the "always legible" goal, but the race is already watchable and result-screen-reviewable without it — lowest priority of the three.

**Independent Test**: During a race, hover the pointer over a board item and confirm a tooltip appears showing that item's full card; move the pointer away and confirm it disappears.

**Acceptance Scenarios**:

1. **Given** a race in progress, **When** the player hovers over a board item, **Then** a tooltip appears showing that item's full details (same content as its prepare-phase card).
2. **Given** a tooltip is showing, **When** the player moves the pointer off the item, **Then** the tooltip disappears.
3. **Given** an empty board slot (a build with fewer than 3 items), **When** the player hovers over it, **Then** no tooltip appears.

---

### Edge Cases

- A flat buff and a stacking buff sharing the same tag both contribute to the same firing direct item on the same lap — both flash simultaneously, each independently, alongside the direct item (User Story 1).
- A stacking buff flashes for its own cooldown tick (existing behavior, unchanged) in addition to flashing whenever its accumulated boost applies to a firing matching item — these can be the same lap or different laps.
- Storage items are never visible during the race (unchanged from the existing race view), so User Story 3's tooltip only applies to board items — storage items keep getting their full card treatment on the prepare screen and result screen only.
- An item with `activeWhileStored` that's actually sitting in storage during a race is not rendered on the race board at all today, so it cannot flash or receive a tooltip in this feature — its contribution remains visible only in the result screen's per-lap breakdown, unchanged from today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST flash a buff item on any lap where its boost is applied to at least one direct item that fires that lap, at the same time as the direct item(s) it boosted flash.
- **FR-002**: The system MUST NOT flash a buff item on a lap where it has no matching active direct item to boost.
- **FR-003**: The system MUST flash a buff item at most once per lap, even when it boosted multiple direct items firing that same lap.
- **FR-004**: The system MUST use the same visual flash treatment for buff items as it already uses for direct items, so no new visual language is introduced.
- **FR-005**: The system MUST display every item's cooldown, in laps, on its card wherever item details are already shown (prepare-phase offer card, prepare-phase held-item card, result-screen board/storage lists).
- **FR-006**: The system MUST display a cooldown of "1 lap" for items that fire every lap rather than omitting cooldown information for them.
- **FR-007**: The system MUST state, on a buff item's card, that its boost only applies while a matching item is active — in addition to the existing effect description (flat / stacking / count-synergy wording).
- **FR-008**: The system MUST source cooldown and dependency text from the same shared formatting used across the prepare phase, result screen, and race tooltip, so the description never diverges by screen.
- **FR-009**: The system MUST show a tooltip when the player hovers the pointer over a board item during a race, containing that item's full card (name, tag, effect, cooldown, dependency note).
- **FR-010**: The system MUST hide the tooltip when the pointer leaves the item.
- **FR-011**: The system MUST NOT show a tooltip for an empty board slot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Watching any race with at least one buff item on the board, a player can identify every lap that buff contributed to without consulting the result screen — the buff's flash is the only evidence they need.
- **SC-002**: Reading any single item's card, a player can state how often it fires and, if it's a buff, what it requires to have any effect — without cross-referencing another screen or asking someone else.
- **SC-003**: A player can inspect any board item's full details during a race within one hover, with no navigation away from the race view.

## Assumptions

- Cooldown/effect/dependency text is a presentation-layer change only — no changes to `src/simulation/`'s actual cooldown, boost, or gating logic. The mechanism described in 005/007 is unchanged; only its legibility improves.
- "1 lap cooldown" for always-firing items is a display convention, not a data-model change — items with no authored cooldown still mean "fires every lap" internally, this feature only changes how that's worded.
- The dependency note on buff cards states the mechanic ("requires a matching active item") as a static fact, not a live indicator of whether that condition is currently true for the player's present build — matching the existing effect-description convention, which also describes the mechanic rather than the build's current state.
- Race tooltips apply to board items only, since storage items are not rendered during the race today (unchanged scope boundary from `006-race-visualizer`).
- Tooltip interaction is pointer-hover only, consistent with this project's existing desktop/mouse-driven input model (drag-and-drop item placement already assumes a mouse).
- The flash animation itself keeps its existing visual style (highlight + fade); this feature extends *which* items flash and *when*, not the animation's look.
