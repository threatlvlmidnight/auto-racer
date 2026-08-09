# Tasks: 008 Race UI Polish

**Status**: Ready for implementation

---

## T001 — Update `calloutEventsForLap` to flash buff items alongside matching direct items

**File**: `src/simulation/playback.ts`
**Story**: US1 (FR-001 / FR-002 / FR-003 / FR-004)

Replace the current `isFlatBuff` exclusion with tag-aware logic:
- Collect all direct-item IDs that fired this lap and record their identity tags.
- Include a buff item from `firedItems` in the result only if at least one direct item with a matching tag also fired that lap.
- A buff item is included at most once per lap (it appears at most once in `firedItems`, satisfying FR-003 automatically).
- Remove the `isFlatBuff` import once it is no longer needed here.

**Acceptance check**: No changes to `src/simulation/` — this is display-layer only.

---

## T002 — Unit tests for updated `calloutEventsForLap`

**File**: `tests/unit/playback.test.ts`
**Story**: US1

Add a new `describe("calloutEventsForLap")` block (or extend the existing one) with tests
that exercise each acceptance scenario from spec.md US1:

1. Direct item fires and its matching buff item fires on same lap → both appear in callout events.
2. Buff item on board, no matching direct item fires → buff does not appear in callout events.
3. Buff item and two matching direct items all fire same lap → buff appears exactly once.
4. Stacking buff fires on its own cooldown tick but no direct item fires → buff excluded from callouts.
5. Two buffs (flat + stacking) with same tag both appear when a matching direct item fires.

---

## T003 — Add `itemCooldownLabel` to `resultFormatting.ts`

**File**: `src/scenes/resultFormatting.ts`
**Story**: US2 (FR-005 / FR-006 / FR-008)

Add a pure function `itemCooldownLabel(item: OfferedItem): string`:
- Items with no authored cooldown (`cooldown === undefined`) → `"1 lap"` (fires every lap convention).
- Items with `cooldown === 1` → `"1 lap"`.
- Items with `cooldown > 1` → `"${item.cooldown} laps"`.

---

## T004 — Add `itemDependencyNote` to `resultFormatting.ts`

**File**: `src/scenes/resultFormatting.ts`
**Story**: US2 (FR-007 / FR-008)

Add a pure function `itemDependencyNote(item: OfferedItem): string | null`:
- Returns `null` for direct (non-buff) items.
- Returns a plain-language note for buff items, e.g.:
  `"Requires an active Performance item to have any effect"` (using `itemIdentityLabel` for the tag name).

---

## T005 — Update `itemDetailsLabel` to include cooldown and dependency note; update tests

**Files**: `src/scenes/resultFormatting.ts`, `tests/integration/result-scene.test.ts`
**Story**: US2 (FR-005 / FR-006 / FR-007 / FR-008)

Extend `itemDetailsLabel` to append:
1. `· ${itemCooldownLabel(item)} cooldown` after the effect text.
2. If `itemDependencyNote(item)` is non-null, append it on a new line (or as ` · ${note}`).

Update `result-scene.test.ts` to cover:
- A direct item's card includes its cooldown in laps.
- An always-firing item (no authored cooldown) shows "1 lap cooldown".
- A buff item's card includes the dependency note.
- `itemDetailsLabel` output is identical regardless of where it's called (one source of truth).

---

## T006 — Implement board-item hover tooltip in `ContestScene.ts`

**File**: `src/scenes/ContestScene.ts`
**Story**: US3 (FR-009 / FR-010 / FR-011)

- In `renderBoard`, for each occupied slot add an interactive zone (same position and size as the slot rectangle) that responds to `pointerover` / `pointerout`.
- On `pointerover`: create a `Phaser.GameObjects.Text` tooltip showing `itemDetailsLabel(item)` positioned near the slot (e.g. above it, clamped to canvas bounds).
- On `pointerout`: destroy the tooltip.
- Empty slots get no interactive zone and no tooltip (FR-011).
- Store a reference to the active tooltip so only one shows at a time.
- No unit test required (Phaser pointer events are presentation-layer, per constitution); manual acceptance check via the independent test in spec.md US3.
