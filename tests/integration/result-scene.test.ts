import { describe, expect, it } from "vitest";
import {
  boardItemsLabel,
  gapLabel,
  itemCooldownLabel,
  itemDependencyNote,
  itemDetailsLabel,
  outcomeLabel,
  storageItemsLabel,
  timesLabel,
} from "../../src/scenes/resultFormatting";
import { ITEM_POOL } from "../../src/content/sample-data";
import type { ContestResult } from "../../src/simulation/types";

// Lighter check (not strict TDD, per constitution's presentation-layer
// decision) confirming ResultScene's required fields (FR-006, FR-007) are
// all produced from a given ContestResult. tasks.md T018.

function result(overrides: Partial<ContestResult>): ContestResult {
  return {
    lapCount: 10,
    playerTime: 57,
    ghostTime: 58.5,
    gap: -1.5,
    outcome: "win",
    board: [],
    storage: [],
    laps: [],
    ...overrides,
  };
}

describe("ResultScene required fields (FR-006, FR-007)", () => {
  it("shows both times and a signed gap (FR-006)", () => {
    const r = result({ playerTime: 57, ghostTime: 58.5, gap: -1.5 });
    expect(timesLabel(r)).toContain("57.0s");
    expect(timesLabel(r)).toContain("58.5s");
    expect(gapLabel(r)).toBe("1.5s ahead of the ghost");
  });

  it("labels a loss as behind the ghost", () => {
    const r = result({ playerTime: 60, ghostTime: 58.5, gap: 1.5, outcome: "loss" });
    expect(gapLabel(r)).toBe("1.5s behind the ghost");
  });

  it("labels an exact tie distinctly, not as a 0.0s gap either direction", () => {
    const r = result({ playerTime: 58.5, ghostTime: 58.5, gap: 0, outcome: "tie" });
    expect(gapLabel(r)).toBe("Exact tie");
    expect(outcomeLabel(r)).toBe("Tie — Win for Both!"); // FR-011
  });

  it("renders empty board and storage sections", () => {
    const emptyResult = result({ board: [], storage: [] });
    expect(boardItemsLabel(emptyResult)).toBe("Board: None");
    expect(storageItemsLabel(emptyResult)).toBe("Storage: None");
  });

  it("renders a single board item with its modifier", () => {
    const label = boardItemsLabel(result({ board: [ITEM_POOL[0]] }));

    expect(label).toContain("Board (1)");
    expect(label).toContain(ITEM_POOL[0].name);
    expect(label).toContain(`${ITEM_POOL[0].timeModifier}s`);
  });

  it("renders every item across board and storage", () => {
    const board = ITEM_POOL.slice(0, 2);
    const storage = ITEM_POOL.slice(2, 3);
    const boardLabel = boardItemsLabel(result({ board, storage }));
    const storageLabel = storageItemsLabel(result({ board, storage }));

    board.forEach((item) => expect(boardLabel).toContain(item.name));
    storage.forEach((item) => expect(storageLabel).toContain(item.name));
  });

  it("renders identity labels for tagged and neutral items", () => {
    const taggedItem = ITEM_POOL.find((item) => item.identityTag === "performance");
    const neutralItem = ITEM_POOL.find((item) => !item.identityTag);

    expect(taggedItem).toBeDefined();
    expect(neutralItem).toBeDefined();
    expect(itemDetailsLabel(taggedItem!)).toContain("[Performance]");
    expect(itemDetailsLabel(neutralItem!)).toContain("[Neutral]");
    expect(boardItemsLabel(result({ board: [taggedItem!, neutralItem!] }))).toContain(
      "[Performance]"
    );
    expect(boardItemsLabel(result({ board: [taggedItem!, neutralItem!] }))).toContain(
      "[Neutral]"
    );
  });

  it("renders a buff's target tag and boost percentage", () => {
    const buffItem = ITEM_POOL.find((item) => item.buff);

    expect(buffItem).toBeDefined();
    expect(itemDetailsLabel(buffItem!)).toContain("[Performance]");
    expect(itemDetailsLabel(buffItem!)).toContain("Boosts Performance items by 5%");
  });

  it("renders a count-synergy buff's per-item rate, distinct from a flat buff's phrasing", () => {
    const countBuff = ITEM_POOL.find((item) => item.buff?.perCount);

    expect(countBuff).toBeDefined();
    expect(itemDetailsLabel(countBuff!)).toContain("[Performance]");
    expect(itemDetailsLabel(countBuff!)).toContain(
      "Boosts Performance items by 2% per Performance item held"
    );
    // Distinct from a flat buff's plain "Boosts Performance items by N%" (no trailing "per item held").
    expect(itemDetailsLabel(countBuff!)).not.toMatch(/items by \d+%$/);
  });

  it("distinguishes the item that remains active in storage", () => {
    const activeStorageItem = ITEM_POOL.find((item) => item.activeWhileStored);

    expect(activeStorageItem).toBeDefined();
    expect(storageItemsLabel(result({ storage: [activeStorageItem!] }))).toContain(
      "[Active in storage]"
    );
  });
});

describe("itemCooldownLabel — US2 FR-005 / FR-006", () => {
  it("returns '1 lap' for an item with no authored cooldown (fires every lap)", () => {
    const flatBuff = ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
    expect(itemCooldownLabel(flatBuff)).toBe("1 lap");
  });

  it("returns '1 lap' for an item with cooldown: 1", () => {
    const everyLap = ITEM_POOL.find((item) => item.cooldown === 1)!;
    expect(itemCooldownLabel(everyLap)).toBe("1 lap");
  });

  it("returns 'N laps' for an item with cooldown > 1", () => {
    const every2 = ITEM_POOL.find((item) => item.cooldown === 2)!;
    const every4 = ITEM_POOL.find((item) => item.cooldown === 4)!;
    expect(itemCooldownLabel(every2)).toBe("2 laps");
    expect(itemCooldownLabel(every4)).toBe("4 laps");
  });

  it("includes the cooldown label in itemDetailsLabel for every item (FR-008 single source)", () => {
    ITEM_POOL.forEach((item) => {
      expect(itemDetailsLabel(item)).toContain(itemCooldownLabel(item));
    });
  });
});

describe("itemDependencyNote — US2 FR-007", () => {
  it("returns null for a direct (non-buff) item", () => {
    const directItem = ITEM_POOL.find((item) => !item.buff)!;
    expect(itemDependencyNote(directItem)).toBeNull();
  });

  it("returns a non-null note for every buff item", () => {
    const buffItems = ITEM_POOL.filter((item) => item.buff);
    expect(buffItems.length).toBeGreaterThan(0);
    buffItems.forEach((item) => {
      const note = itemDependencyNote(item);
      expect(note).not.toBeNull();
      expect(note).toContain("active");
      expect(note).toContain("Performance");
    });
  });

  it("includes the dependency note in itemDetailsLabel for buff items (FR-008 single source)", () => {
    const buffItems = ITEM_POOL.filter((item) => item.buff);
    buffItems.forEach((item) => {
      expect(itemDetailsLabel(item)).toContain(itemDependencyNote(item)!);
    });
  });

  it("does not include a dependency note in itemDetailsLabel for direct items", () => {
    const directItems = ITEM_POOL.filter((item) => !item.buff);
    directItems.forEach((item) => {
      expect(itemDetailsLabel(item)).not.toContain("Requires");
    });
  });
});
