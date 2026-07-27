import { describe, expect, it } from "vitest";
import {
  boardItemsLabel,
  gapLabel,
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

  it("distinguishes the item that remains active in storage", () => {
    const activeStorageItem = ITEM_POOL.find((item) => item.activeWhileStored);

    expect(activeStorageItem).toBeDefined();
    expect(storageItemsLabel(result({ storage: [activeStorageItem!] }))).toContain(
      "[Active in storage]"
    );
  });
});
