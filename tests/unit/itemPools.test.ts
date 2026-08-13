import { describe, expect, it } from "vitest";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import {
  poolForCrossPollination,
  poolForEntrant,
  poolForRival,
  resolveEntrantPool,
  validateItemPools,
  validatePoolContent,
} from "../../src/simulation/itemPools";
import type { EntrantId, ItemDefinition, ItemPhysicsContribution } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";

const ENTRANT_IDS: readonly EntrantId[] = ["evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss"];

// A Buff-role item carrying both SPONSOR_OBJECTIVE_TAGS entries, so a
// correctly-shaped fixture pool satisfies validatePoolContent's sponsor-tag
// invariant (run.ts SPONSOR_OBJECTIVE_TAGS) without needing to duplicate
// that real constant here.
const buffAnchor = testItem({
  id: "neutral-buff-anchor",
  name: "Buff Anchor",
  price: 2,
  timeModifier: 0,
  synergyTags: ["information", "momentum"],
  buff: { boostPercent: 5 },
});

function neutralFixture(): ItemDefinition[] {
  return [
    buffAnchor,
    ...Array.from({ length: 9 }, (_, index) =>
      testItem({ id: `neutral-filler-${index + 1}`, name: `Neutral Filler ${index + 1}`, price: 2, timeModifier: 0 })),
  ];
}

function exclusiveFixture(prefix: string, lean: Partial<ItemPhysicsContribution>): ItemDefinition[] {
  return Array.from({ length: 15 }, (_, index) =>
    testItem({
      id: `${prefix}-item-${index + 1}`,
      name: `${prefix} Item ${index + 1}`,
      price: 2,
      timeModifier: 0,
      ...(index === 0 ? { physics: lean } : {}),
    }));
}

function validFixturePools(): { neutral: ItemDefinition[]; exclusive: Record<EntrantId, ItemDefinition[]> } {
  return {
    neutral: neutralFixture(),
    exclusive: {
      "evelyn-mercer": exclusiveFixture("mercer", { accelerationDelta: 5 }),
      "lucien-soto": exclusiveFixture("soto", { topSpeedDelta: 5 }),
      "inez-rook": exclusiveFixture("rook", { brakingPowerDelta: 5 }),
      "nell-voss": exclusiveFixture("voss", { corneringSpeedDelta: 5 }),
    },
  };
}

describe("validatePoolContent (Foundational, synthetic fixtures — tasks.md T002)", () => {
  it("reports valid for correctly-shaped pools", () => {
    const { neutral, exclusive } = validFixturePools();
    expect(validatePoolContent(neutral, exclusive)).toEqual({ kind: "valid" });
  });

  it("flags wrong counts", () => {
    const { neutral, exclusive } = validFixturePools();
    const result = validatePoolContent(neutral.slice(0, 9), exclusive);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("NEUTRAL_ITEMS"))).toBe(true);
    }
  });

  it("flags a duplicate id across the catalog", () => {
    const { neutral, exclusive } = validFixturePools();
    const collided: Record<EntrantId, ItemDefinition[]> = {
      ...exclusive,
      "lucien-soto": [
        { ...exclusive["lucien-soto"][0], id: neutral[0].id },
        ...exclusive["lucien-soto"].slice(1),
      ],
    };
    const result = validatePoolContent(neutral, collided);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("duplicate"))).toBe(true);
    }
  });

  it("flags a neutral (all-zero) summed physics lean", () => {
    const { neutral, exclusive } = validFixturePools();
    const flattened: Record<EntrantId, ItemDefinition[]> = {
      ...exclusive,
      "inez-rook": exclusiveFixture("rook-flat", {}),
    };
    const result = validatePoolContent(neutral, flattened);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("neutral (all-zero)"))).toBe(true);
    }
  });

  it("flags two entrants sharing an identical summed physics lean", () => {
    const { neutral, exclusive } = validFixturePools();
    const collided: Record<EntrantId, ItemDefinition[]> = {
      ...exclusive,
      "nell-voss": exclusiveFixture("voss-dup", { accelerationDelta: 5 }),
    };
    const result = validatePoolContent(neutral, collided);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("identical summed physics lean"))).toBe(true);
    }
  });

  it("flags a SPONSOR_OBJECTIVE_TAGS entry with no matching Buff-role item", () => {
    const { exclusive } = validFixturePools();
    const noBuffAnchor = neutralFixture().map((item) => ({ ...item, buff: undefined, synergyTags: [] }));
    const result = validatePoolContent(noBuffAnchor, exclusive);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("SPONSOR_OBJECTIVE_TAGS"))).toBe(true);
    }
  });
});

describe("resolveEntrantPool (Foundational, synthetic fixtures — tasks.md T003)", () => {
  it("returns exactly neutral concatenated with the entrant's own exclusive pool, never a third party's", () => {
    const { neutral, exclusive } = validFixturePools();
    const mercerPool = resolveEntrantPool(neutral, exclusive, "evelyn-mercer");

    expect(mercerPool).toHaveLength(25);
    expect(mercerPool.slice(0, 10)).toEqual(neutral);
    expect(mercerPool.slice(10)).toEqual(exclusive["evelyn-mercer"]);

    const otherIds = new Set(
      [...exclusive["lucien-soto"], ...exclusive["inez-rook"], ...exclusive["nell-voss"]].map((item) => item.id),
    );
    expect(mercerPool.some((item) => otherIds.has(item.id))).toBe(false);
  });
});

describe("validateItemPools / poolForEntrant / poolForRival / poolForCrossPollination (real content)", () => {
  it("validateItemPools delegates to validatePoolContent against the real catalog", () => {
    expect(validateItemPools()).toEqual(validatePoolContent(NEUTRAL_ITEMS, EXCLUSIVE_ITEMS));
  });

  it("validates the complete real 70-item catalog", () => {
    expect(NEUTRAL_ITEMS).toHaveLength(10);
    for (const entrantId of ENTRANT_IDS) expect(EXCLUSIVE_ITEMS[entrantId]).toHaveLength(15);
    expect(validateItemPools()).toEqual({ kind: "valid" });
  });

  it("poolForEntrant returns NEUTRAL_ITEMS plus that entrant's own real exclusive pool", () => {
    for (const entrantId of ENTRANT_IDS) {
      expect(poolForEntrant(entrantId)).toEqual([...NEUTRAL_ITEMS, ...EXCLUSIVE_ITEMS[entrantId]]);
    }
  });

  it("poolForRival resolves via the vehicle's owning entrant", () => {
    expect(poolForRival("the-highwheel")).toEqual(poolForEntrant("evelyn-mercer"));
    expect(poolForRival("the-needle")).toEqual(poolForEntrant("lucien-soto"));
    expect(poolForRival("the-lark")).toEqual(poolForEntrant("inez-rook"));
    expect(poolForRival("the-hush")).toEqual(poolForEntrant("nell-voss"));
  });

  it("poolForCrossPollination never returns the caller's own pool, and is deterministic per (seed, encounterId)", () => {
    for (const ownEntrantId of ENTRANT_IDS) {
      const first = poolForCrossPollination(ownEntrantId, 7, "encounter-a");
      const again = poolForCrossPollination(ownEntrantId, 7, "encounter-a");

      expect(again).toEqual(first);
      expect(first.guestEntrantId).not.toBe(ownEntrantId);
      expect(first.pool).toEqual(EXCLUSIVE_ITEMS[first.guestEntrantId]);
    }
  });

  it("poolForCrossPollination can select a different guest entrant for a different encounterId in the same run", () => {
    const guests = new Set(
      Array.from({ length: 20 }, (_, index) =>
        poolForCrossPollination("evelyn-mercer", 7, `encounter-${index}`).guestEntrantId),
    );
    expect(guests.size).toBeGreaterThan(1);
  });
});
