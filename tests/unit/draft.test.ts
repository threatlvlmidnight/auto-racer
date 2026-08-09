import { describe, expect, it } from "vitest";
import { drawItem } from "../../src/simulation/draft";
import type { OfferedItem } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";

const POOL: OfferedItem[] = [
  testItem({ id: "tagged-a", name: "Tagged A", price: 2, timeModifier: -1, identityTag: "performance" }),
  testItem({ id: "tagged-b", name: "Tagged B", price: 2, timeModifier: -2, identityTag: "performance" }),
  testItem({ id: "neutral-a", name: "Neutral A", price: 2, timeModifier: -3 }),
  testItem({ id: "neutral-b", name: "Neutral B", price: 2, timeModifier: -4 }),
];

function scriptedRng(...values: number[]): () => number {
  let index = 0;
  return () => values[index++];
}

describe("drawItem", () => {
  it("is deterministic for the same RNG sequence", () => {
    const first = drawItem(POOL, "performance", 0.75, scriptedRng(0.2, 0.8));
    const second = drawItem(POOL, "performance", 0.75, scriptedRng(0.2, 0.8));

    expect(first).toBe(POOL[1]);
    expect(second).toBe(first);
  });

  it("selects the tagged group below the weight boundary and neutral at it", () => {
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0.749, 0)).identityTag).toBe(
      "performance"
    );
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0.75, 0)).identityTag).toBeUndefined();
  });

  it("makes every item in either group reachable", () => {
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0, 0))).toBe(POOL[0]);
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0, 0.999))).toBe(POOL[1]);
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0.9, 0))).toBe(POOL[2]);
    expect(drawItem(POOL, "performance", 0.75, scriptedRng(0.9, 0.999))).toBe(POOL[3]);
  });

  it("draws tagged items within tolerance around the requested weight", () => {
    const trialCount = 10_000;
    let taggedCount = 0;

    for (let trial = 0; trial < trialCount; trial += 1) {
      const item = drawItem(POOL, "performance", 0.75, Math.random);
      if (item.identityTag === "performance") taggedCount += 1;
    }

    const taggedProportion = taggedCount / trialCount;
    expect(taggedProportion).toBeGreaterThanOrEqual(0.65);
    expect(taggedProportion).toBeLessThanOrEqual(0.85);
  });

  it("does not mutate the pool or its items", () => {
    const snapshot = structuredClone(POOL);

    drawItem(POOL, "performance", 0.75, scriptedRng(0.2, 0.5));

    expect(POOL).toEqual(snapshot);
  });
});