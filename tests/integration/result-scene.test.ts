import { describe, expect, it } from "vitest";
import {
  boardItemsLabel,
  gapLabel,
  itemCooldownLabel,
  itemDependencyNote,
  itemDetailsLabel,
  outcomeLabel,
  positionLabel,
  standingsRow,
  storageItemsLabel,
  timesLabel,
} from "../../src/scenes/resultFormatting";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import type { CarResult, NCarContestResult } from "../../src/simulation/types";

// Lighter check (not strict TDD, per constitution's presentation-layer
// decision) confirming ResultScene's required fields (FR-006, FR-007) are
// all produced from a given NCarContestResult. tasks.md T018 (012-multi-
// ghost-contest T014/T020).

function car(overrides: Partial<CarResult>): CarResult {
  return {
    id: "player",
    role: "player",
    name: "Player",
    color: "#ffd447",
    time: 57,
    laps: [],
    position: 1,
    gapToLeader: 0,
    ...overrides,
  };
}

function result(overrides: Partial<NCarContestResult>): NCarContestResult {
  return {
    lapCount: 10,
    cars: [car({})],
    outcome: "win",
    board: [],
    storage: [],
    ...overrides,
  };
}

describe("ResultScene required fields (FR-006, FR-007)", () => {
  it("shows the player's position and a signed gap to the leader (FR-006)", () => {
    const player = car({ id: "player", role: "player", time: 57, position: 1, gapToLeader: 0 });
    const rival = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 2, gapToLeader: 1.5 });
    const r = result({ cars: [player, rival], outcome: "win" });

    expect(timesLabel(r)).toContain("57.0s");
    expect(positionLabel(r)).toBe("1st of 2");
    expect(gapLabel(r)).toBe("Leading the field");
  });

  it("labels a loss as behind the leader, with the player's own gap", () => {
    const player = car({ id: "player", role: "player", time: 60, position: 2, gapToLeader: 1.5 });
    const leader = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 1, gapToLeader: 0 });
    const r = result({ cars: [leader, player], outcome: "loss" });

    expect(gapLabel(r)).toBe("1.5s behind the leader");
    expect(positionLabel(r)).toBe("2nd of 2");
  });

  it("labels a tie distinctly (FR-011 heritage)", () => {
    const player = car({ id: "player", role: "player", time: 58.5, position: 2, gapToLeader: 0 });
    const leader = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 1, gapToLeader: 0 });
    const r = result({ cars: [leader, player], outcome: "tie" });

    expect(outcomeLabel(r)).toBe("Tie — Win for Both!");
  });

  it("renders every car in fixed finishing order via standingsRow", () => {
    const player = car({ id: "player", role: "player", name: "Player", time: 57, position: 1, gapToLeader: 0 });
    const rival = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 2, gapToLeader: 1.5 });

    expect(standingsRow(player)).toContain("Player");
    expect(standingsRow(player)).toContain("57.0s");
    expect(standingsRow(rival)).toContain("Torres");
    expect(standingsRow(rival)).toContain("+1.5s");
  });

  it("renders empty board and storage sections", () => {
    const emptyResult = result({ board: [], storage: [] });
    expect(boardItemsLabel(emptyResult)).toBe("Board: None");
    expect(storageItemsLabel(emptyResult)).toBe("Storage: None");
  });

  it("renders a single board item with its modifier", () => {
    const label = boardItemsLabel(result({ board: [LEGACY_ITEM_POOL[0]] }));

    expect(label).toContain("Board (1)");
    expect(label).toContain(LEGACY_ITEM_POOL[0].name);
    expect(label).toContain("Lap Time");
  });

  it("renders every item across board and storage", () => {
    const board = LEGACY_ITEM_POOL.slice(0, 2);
    const storage = LEGACY_ITEM_POOL.slice(2, 3);
    const boardLabel = boardItemsLabel(result({ board, storage }));
    const storageLabel = storageItemsLabel(result({ board, storage }));

    board.forEach((item) => expect(boardLabel).toContain(item.name));
    storage.forEach((item) => expect(storageLabel).toContain(item.name));
  });

  it("renders category and origin rather than legacy identity labels", () => {
    const taggedItem = LEGACY_ITEM_POOL.find((item) => item.identityTag === "performance");
    const neutralItem = LEGACY_ITEM_POOL.find((item) => !item.identityTag);

    expect(taggedItem).toBeDefined();
    expect(neutralItem).toBeDefined();
    expect(itemDetailsLabel(taggedItem!)).toContain("Coachworks");
    expect(itemDetailsLabel(neutralItem!)).toMatch(/power|chassis/);
  });

  it("renders a buff's target tag and boost percentage", () => {
    const buffItem = LEGACY_ITEM_POOL.find((item) => item.buff);

    expect(buffItem).toBeDefined();
    expect(itemDetailsLabel(buffItem!)).toContain("Boost Lap Time");
    expect(itemDetailsLabel(buffItem!)).toContain("+5%");
  });

  it("renders a count-synergy buff's per-item rate, distinct from a flat buff's phrasing", () => {
    const countBuff = LEGACY_ITEM_POOL.find((item) => item.buff?.perCount);

    expect(countBuff).toBeDefined();
    expect(itemDetailsLabel(countBuff!)).toContain("+2% per eligible item");
  });

  it("distinguishes the item that remains active in storage", () => {
    const activeStorageItem = LEGACY_ITEM_POOL.find((item) => item.activeWhileStored);

    expect(activeStorageItem).toBeDefined();
    expect(storageItemsLabel(result({ storage: [activeStorageItem!] }))).toContain(
      "Active while stored"
    );
  });
});

describe("itemCooldownLabel — US2 FR-005 / FR-006", () => {
  it("returns '1 lap' for an item with no authored cooldown (fires every lap)", () => {
    const flatBuff = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
    expect(itemCooldownLabel(flatBuff)).toBe("1 lap");
  });

  it("returns '1 lap' for an item with cooldown: 1", () => {
    const everyLap = LEGACY_ITEM_POOL.find((item) => item.cooldown === 1)!;
    expect(itemCooldownLabel(everyLap)).toBe("1 lap");
  });

  it("returns 'N laps' for an item with cooldown > 1", () => {
    const every2 = LEGACY_ITEM_POOL.find((item) => item.cooldown === 2)!;
    const every4 = LEGACY_ITEM_POOL.find((item) => item.cooldown === 4)!;
    expect(itemCooldownLabel(every2)).toBe("2 laps");
    expect(itemCooldownLabel(every4)).toBe("4 laps");
  });

  it("keeps cooldown compatibility while shared details express authored cadence", () => {
    LEGACY_ITEM_POOL.forEach((item) => {
      expect(itemCooldownLabel(item)).toMatch(/lap/);
      expect(itemDetailsLabel(item)).toContain(item.name);
    });
  });
});

describe("itemDependencyNote — US2 FR-007", () => {
  it("returns null for a direct (non-buff) item", () => {
    const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
    expect(itemDependencyNote(directItem)).toBeNull();
  });

  it("returns a non-null note for every buff item", () => {
    const buffItems = LEGACY_ITEM_POOL.filter((item) => item.buff);
    expect(buffItems.length).toBeGreaterThan(0);
    buffItems.forEach((item) => {
      const note = itemDependencyNote(item);
      expect(note).not.toBeNull();
      expect(note).toMatch(/EVERY|PER|TARGET|WHEN/);
    });
  });

  it("includes shared rule text in itemDetailsLabel for buff items", () => {
    const buffItems = LEGACY_ITEM_POOL.filter((item) => item.buff);
    buffItems.forEach((item) => {
      expect(itemDetailsLabel(item)).toContain(itemDependencyNote(item)!);
    });
  });

  it("does not include a dependency note in itemDetailsLabel for direct items", () => {
    const directItems = LEGACY_ITEM_POOL.filter((item) => !item.buff);
    directItems.forEach((item) => {
      expect(itemDetailsLabel(item)).not.toContain("Requires");
    });
  });
});
