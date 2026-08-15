# Feature Specification: Board & Storage — Drag-and-Drop Prepare UI

**Feature Branch**: `004-board-storage-ui`

**Created**: 2026-07-26

**Status**: Implementation complete

**Input**: User description: "The current UI doesn't feel like a game. I want a static 'board' where players put their active items, and a storage where they can store a couple of additional items."

## Clarifications

### Session 2026-07-26

- Q: Do items sitting in storage still contribute to the race, or only board items count? → A: By default, storage items are inert (no effect). The system must leave room for a per-item exception: an item can be flagged to remain active even while stored (illustrative example: a "Tyre Rack" that gives a small passive effect from inventory). Both the board and storage are capacity-limited.
- Q: How does moving an item to storage relate to the existing evict-to-add mechanic (`002-item-slots`)? → A: Independent. The existing offer/accept/decline/evict-to-add rules are unchanged and still apply only to the board. Separately, at any time during the prepare phase, a player can drag a board item to storage (bench it, keeping it instead of losing it) or drag a stored item back to the board.
- Q: What interaction model should replace the current text buttons? → A: Drag-and-drop for all item movement (accept, decline-by-not-dropping, evict-by-dropping-onto-a-held-item, board↔storage moves). A single button remains, but only to open/close the storage view — not to perform item actions.
- Q: How many storage spots should this feature use? → A: Storage capacity always equals the board's own flat slot capacity (currently 3, per `002-item-slots`).
- Q: With no Decline/Accept buttons left, how does a round conclude when the player doesn't want the offered item? → A: Two non-item-action controls are added: a **Next** button that advances to the next round regardless of whether anything was dragged (if the offer wasn't dragged onto the board by then, that's an implicit decline, unchanged from `002-item-slots` FR-004), and a **Refresh** button (see next clarification) that rerolls the current offer without ending the round. This decouples "deciding on the offer" from "moving on" — unlike `002-item-slots`/`003-item-pool-draft`'s original flow, where clicking Accept immediately advanced the round, dragging now only updates build state; the round itself advances only when Next is clicked.
- Q: Should Refresh be free/unlimited or limited-use? → A: Limited: exactly **one refresh per round** by default (not a run-wide budget) — it resets at the start of every round regardless of whether it was used the round before. No currency or economy is introduced. The design should leave room for a future item effect that grants extra refreshes (e.g., "an extra reroll at shops"), but no such item is built in this feature — tracked in `specs/DEFERRED.md`.
- Note on terminology: "encounter," used in design conversation for this feature, is synonymous with `002-item-slots`'s "round" (a single offer step in the existing fixed-length sequence). This spec keeps using "round" as the canonical term to avoid confusion with the distinct, still-undesigned multi-type encounter system (shop/reward/PvP/PvE) described in `specs/vision.md`'s "Run structure / encounter system," which remains fully out of scope here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The board and storage are distinct, visible areas (Priority: P1)

Instead of a scrolling text list of held items, the player sees a fixed-size **board** (where active items sit) as its own visual region, and a separate **storage** area (opened via a single control) where benched items are kept.

**Why this priority**: Every other story in this feature depends on the board and storage existing as distinct, addressable regions a player can see and target. Without this, there's nothing to drag items to or from.

**Independent Test**: Open the prepare phase and confirm the board is visible by default, showing its fixed capacity and current contents, and that a single control reveals a separate storage area with its own fixed capacity and contents.

**Acceptance Scenarios**:

1. **Given** the prepare phase, **When** the player views it, **Then** the board is displayed as a distinct region showing exactly `SLOT_CAPACITY` positions and which are occupied.
2. **Given** the prepare phase, **When** the player activates the single storage control, **Then** a separate storage region appears, showing exactly `SLOT_CAPACITY` positions (matching the board's own capacity) and which are occupied.

---

### User Story 2 - Item actions happen by dragging, not clicking buttons (Priority: P1)

Accepting an offered item and evicting a held item to make room are both performed by dragging — there are no "Accept" or "Replace X" text buttons for these actions anymore. Declining is simply not dragging the offer anywhere, finalized when the player moves on (User Story 3).

**Why this priority**: This is the direct fix for "doesn't feel like a game" — replacing the current button-list interaction is the core presentation change this feature exists to make, independent of the new storage mechanic.

**Independent Test**: Play through a full prepare phase using only drag gestures for item decisions — accept an item onto an open board slot, evict a held item by dragging an offer onto it, and leave an offer untouched to decline it — and confirm no item-specific button is needed for any of these three outcomes.

**Acceptance Scenarios**:

1. **Given** an open board slot and an offered item, **When** the player drags the offer onto that slot, **Then** the item is accepted into the board immediately (same rule as `002-item-slots` FR-002, new interaction only).
2. **Given** a full board and an offered item, **When** the player drags the offer onto a currently-held board item, **Then** that held item is evicted and the offer takes its place immediately (same rule as `002-item-slots` FR-003, new interaction only).
3. **Given** an offered item the player does not drag onto the board, **When** the player clicks Next (User Story 3), **Then** the offer is declined, the build is unchanged, and the next round begins (same rule as `002-item-slots` FR-004, new interaction only).

---

### User Story 3 - The round advances explicitly, and the offer can be rerolled (Priority: P1)

Two non-item controls govern the round itself: **Next** advances to the next round whenever the player is ready, whether or not they dragged the offer anywhere; **Refresh** rerolls the current round's offer for a new one, without ending the round, up to once per round by default.

**Why this priority**: Without an explicit way to move on, a round with no drag action would never end — Next is what makes User Story 2's decline case actually work. Refresh is the concrete new capability the player asked for ("a refresh shop button"), tied for P1 because the game isn't playable without Next and Refresh is simple enough to ship alongside it.

**Independent Test**: On a round the player hasn't dragged anything for, click Refresh and confirm a new offer appears without the round ending or the build changing; click Refresh again and confirm it has no further effect this round; click Next and confirm the round advances (declining the current offer) and Refresh becomes available again for the new round.

**Acceptance Scenarios**:

1. **Given** any round, **When** the player clicks Next, **Then** the round advances — if the offer wasn't dragged onto the board first, it's declined (User Story 2, AC3); if it was, the board change from that drag is preserved.
2. **Given** a round where Refresh hasn't been used yet, **When** the player clicks Refresh, **Then** the current offer is replaced with a new draw from the item pool, the round does not advance, and the build is unchanged.
3. **Given** a round where Refresh has already been used once, **When** the player clicks Refresh again, **Then** nothing happens — the control has no further effect until the next round.
4. **Given** the player has just advanced to a new round (via Next), **When** they view Refresh, **Then** it is available again, regardless of whether it was used the round before.

---

### User Story 4 - Board and storage items can be freely rearranged (Priority: P1)

At any point during the prepare phase — not just in response to a new offer — the player can drag a currently-held board item into an open storage slot to bench it, or drag a stored item back onto the board, independent of whatever offer is currently active.

**Why this priority**: This is the new capability storage exists to provide — a way to keep an item without it occupying a board slot, decoupled entirely from the accept/decline/evict-to-add flow. Ties for P1 with Stories 1-3 because storage with no way to move items into or out of it isn't a feature yet, just an empty region.

**Independent Test**: With at least one board item and at least one open storage slot, drag the board item into storage and confirm it leaves the board and appears in storage; then drag it back and confirm the reverse.

**Acceptance Scenarios**:

1. **Given** a held board item and an open storage slot, **When** the player drags the board item onto that storage slot, **Then** the item moves out of the board into storage, opening that board slot.
2. **Given** a stored item and an open board slot, **When** the player drags the stored item onto that board slot, **Then** the item moves out of storage into the board, opening that storage slot.
3. **Given** a stored item dragged onto an *occupied* board slot, **When** the drop completes, **Then** the two items swap locations (the board item moves to the storage slot just vacated, the stored item takes the board slot) — neither item is lost.
4. **Given** a board item dragged toward a full storage (no open slot), **When** the drop is attempted, **Then** nothing happens — the move is rejected and the build is unchanged, same as any other invalid drop.

---

### User Story 5 - Storage is inert by default, and that's visible (Priority: P2)

An item sitting in storage does not affect the contest outcome — unless it's one of the (rare) items flagged to remain active while stored. Either way, whether a given stored item is currently contributing is visible, not something the player has to guess.

**Why this priority**: This is the rule that makes storage meaningful rather than just a second board — without it, there'd be no reason to distinguish "on the board" from "in storage" at all. P2 because the visual/interaction work in Stories 1-4 can be built and tested before this specific rule is verified end-to-end.

**Independent Test**: Assemble a build with an ordinary item in storage and confirm the contest outcome is identical to an otherwise-identical build with that slot empty; then do the same with the one active-while-stored item and confirm its effect shows up in the outcome anyway.

**Acceptance Scenarios**:

1. **Given** a build with an ordinary item held in storage, **When** the contest resolves, **Then** that item's effect is not applied — the outcome is the same as if storage were empty.
2. **Given** a build with the one active-while-stored item held in storage, **When** the contest resolves, **Then** that item's effect is applied exactly as if it were on the board.
3. **Given** any item in storage, **When** the player views it, **Then** whether it's currently contributing (active-while-stored) or inert is visibly distinguishable — not left for the player to infer or remember (Constitution Principle III).

---

### Edge Cases

- What happens when a player tries to drag a newly offered item directly onto storage? (Not supported in this feature — offers can only be accepted onto the board or declined, per Clarifications. Dragging an offer toward storage is treated as a failed drop, same as any other invalid target.)
- What happens if both the board and storage are full when a new item is offered? (Unchanged from `002-item-slots`: the player must evict a board item to accept, or decline. Storage being full doesn't unlock any new option — it simply isn't a valid destination for an offer.)
- What happens if a player drags an item to the exact slot it already occupies? (No-op — the build is unchanged, same as declining.)
- What happens to a build where nothing is ever moved to storage? (Fully valid — storage is optional to use; a build can be completed using only the board, exactly as `002-item-slots`/`003-item-pool-draft` already work.)
- What happens if the player clicks Refresh after already dragging the current offer onto the board (accepting it) or using it to evict? (Refresh only rerolls a still-undecided offer; once it's been placed, there's nothing left to reroll — Refresh has no effect until the next round's offer appears.)
- What happens if the player rearranges board/storage items (User Story 4) without ever touching the current offer? (Fully independent — Refresh's one-per-round allowance and Next's round-advance are governed entirely by the offer/round state, not by unrelated board/storage moves.)
- What happens if Refresh is clicked when none remain this round? (No-op — the control is unavailable/disabled until Next starts a new round, per FR-007.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the board as its own visual region showing exactly `SLOT_CAPACITY` positions and their current contents, replacing the current scrolling text list.
- **FR-002**: The system MUST provide a storage region with a capacity equal to `SLOT_CAPACITY`, reachable via a single control that opens/closes it — the storage region is not required to be visible at all times.
- **FR-003**: The system MUST replace all button-driven *item* actions (accept, decline, evict) with drag-and-drop gestures; the only buttons remaining in the prepare phase are the storage toggle (FR-002), a Next control (FR-005), and a Refresh control (FR-006) — none of which act on a specific item the way the old Accept/Decline/Replace buttons did.
- **FR-004**: Accepting an offered item onto an open board slot, and evicting a held board item by dropping an offer onto it, MUST preserve the exact rules already established in `002-item-slots` (FR-002/FR-003) — only the interaction modality changes, and the drop takes effect on build state immediately (see FR-005 for how the round itself then advances).
- **FR-005**: The system MUST provide a Next control that advances from the current round to the next, regardless of whether the offer was dragged anywhere; if the offer was not dragged onto the board by the time Next is clicked, it is declined and the build is unchanged (preserving `002-item-slots` FR-004).
- **FR-006**: The system MUST provide a Refresh control that replaces the current round's offered item with a new draw from the item pool (`003-item-pool-draft`'s weighted draw), without ending the round or altering build state. Refresh has no effect if the current offer has already been placed onto the board (see Edge Cases).
- **FR-007**: The system MUST limit Refresh to one use per round by default, resetting at the start of every round regardless of prior use; using Refresh when none remain MUST have no effect. The design MUST NOT preclude a future item effect that grants additional refreshes, though no such item is built in this feature (see Assumptions).
- **FR-008**: The system MUST allow the player, at any point during the prepare phase independent of any active offer, to drag a held board item into an open storage slot, moving it out of active play without discarding it.
- **FR-009**: The system MUST allow the player, at any point during the prepare phase, to drag a held storage item into an open board slot, moving it back into active play.
- **FR-010**: When a stored item is dragged onto an *occupied* board slot, the system MUST swap the two items' locations rather than rejecting the drop.
- **FR-011**: An item held in storage MUST NOT affect the contest outcome unless it is flagged active-while-stored (FR-012) — this is the default behavior for every item lacking that flag.
- **FR-012**: The item data model MUST support flagging an item as active-while-stored, and the item pool MUST include at least one such item, so the exception is demonstrated, not just declared possible.
- **FR-013**: The system MUST visibly distinguish an active-while-stored item from an ordinary (inert-while-stored) item, wherever it appears in storage (Constitution Principle III).
- **FR-014**: The system MUST NOT allow an offered item to be accepted directly into storage — offers may only be accepted onto the board or declined (see Edge Cases).
- **FR-015**: The system MUST visibly indicate whether Refresh is currently available for the round (and disable or hide the control once it isn't), per Constitution Principle III.

### Key Entities

- **Board**: the existing flat, `SLOT_CAPACITY`-sized active area from `002-item-slots`, now presented as its own visual region. Items here contribute to the contest outcome exactly as today.
- **Storage**: a new capacity-limited area, sized to match the board (`SLOT_CAPACITY`), holding items that are inert by default. Revealed/hidden via a single control.
- **Item Location**: each held item now has a location — board or storage — in addition to its existing identity/effect data (`003-item-pool-draft`). A build's total held-item count spans both locations.
- **Active-While-Stored Flag**: a per-item property (default: not set, meaning inert-while-stored) that, when set, means the item's effect applies regardless of location.
- **Refresh Allowance**: a per-round counter (default: 1), reset at the start of every round, consumed by the Refresh control. Not a currency or run-wide budget — it has no memory across rounds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The board is visible by default and always shows its exact fixed capacity and current contents; the storage area, once opened, shows the same for its own capacity.
- **SC-002**: A player can complete an entire prepare phase — accepting, declining, and evicting across every round — using only drag gestures for item decisions, with zero clicks on an item-action button (the only buttons that exist — storage toggle, Next, Refresh — never act on a specific item).
- **SC-003**: A build with an ordinary item in storage produces an identical contest outcome to the same build with that storage slot empty; a build with the one active-while-stored item in storage produces the same outcome as if that item were on the board instead.
- **SC-004**: A player can move a given item from board to storage and back to the board at least once within a single prepare phase, ending with build state identical to never having moved it, other than the round trip itself.
- **SC-005**: A player can correctly identify, by looking, whether any given stored item is currently contributing to the outcome, without needing to recall which item was flagged active-while-stored.
- **SC-006**: A player can reroll a round's offer exactly once before Refresh becomes unavailable for that round, and the allowance is available again at the start of the next round, regardless of whether it was used previously.

## Assumptions

- Board capacity remains `SLOT_CAPACITY` (currently 3), unchanged from `002-item-slots`/`003-item-pool-draft`.
- Storage capacity equals the board's capacity (Clarifications) — an illustrative default, not a locked balance number.
- The existing offer/accept/decline/evict-to-add *rules* (`002-item-slots`) are unchanged; this feature only changes how those actions are performed (drag-and-drop instead of buttons), decouples "deciding on the offer" from "advancing the round" (Next), adds a reroll capability (Refresh), and adds the separate board↔storage movement capability.
- Offers can only be accepted onto the board, never directly into storage (FR-014) — moving an item into storage is only possible for items already held (on the board or, trivially, already in storage).
- Dragging a stored item onto an occupied board slot swaps the two items' locations (FR-010) rather than requiring the board slot to be emptied first — this keeps every drag gesture resolvable in one action given board and storage are equally sized.
- Exactly one item in the pool is flagged active-while-stored as an illustrative example (FR-012); every other item defaults to inert-while-stored. Richer or more numerous passive-storage items are a future content decision, not fixed here.
- The Next and Refresh controls are the sanctioned exceptions to FR-003's "no item-action buttons" rule — they act on the round itself, not on any specific item, which is the distinction FR-003 draws.
- Refresh Allowance is a per-round counter (default 1), not a run-wide or currency-based budget — it resets every round regardless of prior use. No economy (currency, prices, restock limits) is introduced by this feature.
- A future item effect that grants additional refreshes (e.g., "an extra reroll at shops") is an explicitly deferred idea, not built in this feature — tracked in `specs/DEFERRED.md` so it isn't lost.
- "Encounter," as used in design conversation for this feature, means the same thing as `002-item-slots`'s "round" — this feature does not build the distinct, still-undesigned multi-type encounter system (shop/reward/PvP/PvE) from `specs/vision.md`.
- Desktop mouse-based drag-and-drop is the target interaction; touch/mobile drag nuances are out of scope, consistent with the project's current desktop-first scope (mobile-via-Capacitor remains a later, untouched milestone per `001-core-loop`/`002-item-slots` plans).
- Visual/art treatment of the board and storage (card art, board graphics, item icons) is placeholder — theme remains undecided (constitution `TODO(THEME)`); this feature is about layout and interaction structure, not final art direction.
- Identity tags, draft weighting (`003-item-pool-draft`), and the buff/synergy mechanic are unaffected by this feature — an item's tag and buff behavior are unchanged regardless of whether it sits on the board or in storage (except for the active-while-stored exception itself, FR-008/FR-009).
- The real run/encounter structure, additional team identities, and richer item synergy remain out of scope, per `specs/DEFERRED.md` — this feature is presentation plus one new location-based mechanic, not a run-structure or content feature.
