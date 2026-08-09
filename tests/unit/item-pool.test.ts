import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { ORIGINS, type InstallationCategory, type Origin } from "../../src/simulation/types";

/**
 * The exact shipped base contest values for all 15 items before the feature-010
 * topology migration. The migration may add origin/category/tags/installation
 * behavior but MUST NOT change any of these (contract §8, T003).
 */
const SHIPPED_BASE_VALUES: ReadonlyArray<{
  id: string;
  price: number;
  timeModifier: number;
  cooldown?: number;
  identityTag?: "performance";
  buff?: { boostPercent: number; perCount?: boolean };
  activeWhileStored?: boolean;
}> = [
  { id: "item-001", price: 4, timeModifier: -3, identityTag: "performance", cooldown: 1 },
  { id: "item-002", price: 3, timeModifier: -1.25, identityTag: "performance", cooldown: 2 },
  { id: "item-003", price: 2, timeModifier: 0.75, cooldown: 3 },
  { id: "item-004", price: 4, timeModifier: -2.1, identityTag: "performance", cooldown: 2 },
  { id: "item-005", price: 5, timeModifier: -4.5, identityTag: "performance", cooldown: 4 },
  { id: "item-006", price: 2, timeModifier: -0.6, cooldown: 1 },
  { id: "item-007", price: 3, timeModifier: -1.8, identityTag: "performance", cooldown: 3 },
  { id: "item-008", price: 2, timeModifier: 0.4, cooldown: 2 },
  { id: "item-009", price: 4, timeModifier: -2.7, identityTag: "performance", cooldown: 4 },
  { id: "item-010", price: 2, timeModifier: 1.1, cooldown: 1 },
  { id: "item-011", price: 3, timeModifier: -0.9, cooldown: 2 },
  { id: "item-012", price: 4, timeModifier: 0, identityTag: "performance", buff: { boostPercent: 5 } },
  { id: "item-013", price: 2, timeModifier: -0.35, cooldown: 3, activeWhileStored: true },
  { id: "item-014", price: 4, timeModifier: 0, identityTag: "performance", cooldown: 3, buff: { boostPercent: 1 } },
  { id: "item-015", price: 5, timeModifier: 0, identityTag: "performance", buff: { boostPercent: 2, perCount: true } },
];

describe("ITEM_POOL", () => {
  it("contains exactly 20 items with authored integer prices from 2 through 5", () => {
    expect(ITEM_POOL).toHaveLength(20);
    ITEM_POOL.forEach((item) => {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThanOrEqual(2);
      expect(item.price).toBeLessThanOrEqual(5);
    });
  });

  it("contains 10 to 20 uniquely identified and named items", () => {
    expect(ITEM_POOL.length).toBeGreaterThanOrEqual(10);
    expect(ITEM_POOL.length).toBeLessThanOrEqual(20);
    expect(new Set(ITEM_POOL.map((item) => item.id)).size).toBe(ITEM_POOL.length);
    expect(new Set(ITEM_POOL.map((item) => item.name)).size).toBe(ITEM_POOL.length);
  });

  it("gives every direct item a unique modifier magnitude", () => {
    const directMagnitudes = ITEM_POOL.filter((item) => !item.buff).map((item) =>
      Math.abs(item.timeModifier)
    );

    expect(new Set(directMagnitudes).size).toBe(directMagnitudes.length);
  });

  it("contains flat, stacking, and count-synergy zero-modifier Performance buffs", () => {
    const buffItems = ITEM_POOL.filter((item) => item.buff);
    const flatBuff = buffItems.find((item) => item.cooldown === undefined && !item.buff?.perCount);
    const stackingBuff = buffItems.find((item) => item.cooldown !== undefined);
    const countBuff = buffItems.find((item) => item.buff?.perCount);

    expect(buffItems).toHaveLength(3);
    buffItems.forEach((item) => expect(item).toMatchObject({
      identityTag: "performance",
      timeModifier: 0,
    }));
    expect(flatBuff?.buff?.boostPercent).toBeGreaterThan(0);
    expect(stackingBuff?.buff?.boostPercent).toBeGreaterThan(0);
    expect(stackingBuff?.cooldown).toBeGreaterThan(1);
    expect(countBuff?.buff?.boostPercent).toBeGreaterThan(0);
    expect(countBuff?.cooldown).toBeUndefined();
  });

  it("gives every direct item a cooldown with both cadence kinds represented", () => {
    const directItems = ITEM_POOL.filter((item) => !item.buff);

    directItems.forEach((item) => expect(item.cooldown).toBeGreaterThanOrEqual(1));
    expect(directItems.some((item) => item.cooldown === 1)).toBe(true);
    expect(directItems.some((item) => (item.cooldown ?? 0) > 1)).toBe(true);
  });

  it("contains exactly one item that remains active in storage", () => {
    const activeStorageItems = ITEM_POOL.filter((item) => item.activeWhileStored);

    expect(activeStorageItems).toHaveLength(1);
  });
});

describe("ITEM_POOL feature-010 migration", () => {
  it("preserves every shipped ID, price, cooldown, buff link, storage flag, and base effect", () => {
    // Pins the original 15 in their shipped order; items added afterward
    // (the demo-depth expansion) are exercised by the tests below instead.
    expect(ITEM_POOL.slice(0, SHIPPED_BASE_VALUES.length).map((item) => item.id))
      .toEqual(SHIPPED_BASE_VALUES.map((entry) => entry.id));
    SHIPPED_BASE_VALUES.forEach((expected) => {
      const item = ITEM_POOL.find((candidate) => candidate.id === expected.id)!;
      expect(item.price).toBe(expected.price);
      expect(item.timeModifier).toBe(expected.timeModifier);
      expect(item.cooldown).toBe(expected.cooldown);
      expect(item.identityTag).toBe(expected.identityTag);
      expect(item.activeWhileStored).toBe(expected.activeWhileStored);
      expect(item.buff).toStrictEqual(expected.buff);
    });
  });

  it("gives every item exactly one of the four origins", () => {
    ITEM_POOL.forEach((item) => {
      expect(ORIGINS).toContain(item.origin);
    });
  });

  it("gives every item exactly one Power or Chassis installation category", () => {
    const categories: InstallationCategory[] = ["power", "chassis"];
    ITEM_POOL.forEach((item) => {
      expect(categories).toContain(item.installationCategory);
    });
  });

  it("keeps installation category independent of origin — every origin has both Power and Chassis items", () => {
    ORIGINS.forEach((origin: Origin) => {
      const ofOrigin = ITEM_POOL.filter((item) => item.origin === origin);
      expect(ofOrigin.length).toBeGreaterThan(0);
      expect(ofOrigin.some((item) => item.installationCategory === "power")).toBe(true);
      expect(ofOrigin.some((item) => item.installationCategory === "chassis")).toBe(true);
    });
  });

  it("gives every item a synergy tag list that may be shared across origins", () => {
    ITEM_POOL.forEach((item) => {
      expect(Array.isArray(item.synergyTags)).toBe(true);
      item.synergyTags.forEach((tag) => expect(typeof tag).toBe("string"));
    });
    const tagsByOrigin = new Map<Origin, Set<string>>();
    ITEM_POOL.forEach((item) => {
      const existing = tagsByOrigin.get(item.origin) ?? new Set<string>();
      item.synergyTags.forEach((tag) => existing.add(tag));
      tagsByOrigin.set(item.origin, existing);
    });
    // At least one tag must appear under more than one origin — cross-origin
    // builds are the stated point of the tag system (launch-roster.md).
    const tagOriginCounts = new Map<string, number>();
    tagsByOrigin.forEach((tags) => {
      tags.forEach((tag) => tagOriginCounts.set(tag, (tagOriginCounts.get(tag) ?? 0) + 1));
    });
    expect([...tagOriginCounts.values()].some((count) => count > 1)).toBe(true);
  });

  it("gives every item an authored Fitted behavior with inspector text and a typed operation", () => {
    ITEM_POOL.forEach((item) => {
      expect(item.fittedBehavior).toBeDefined();
      expect(item.fittedBehavior.description.length).toBeGreaterThan(0);
      expect(["time-modifier", "buff-boost", "none"]).toContain(item.fittedBehavior.kind);
    });
  });

  it("gives every item an explicit Improvised behavior or an explicit none disclosure", () => {
    ITEM_POOL.forEach((item) => {
      expect(item.improvisedBehavior).toBeDefined();
      expect(item.improvisedBehavior.description.length).toBeGreaterThan(0);
      expect(["time-modifier", "buff-boost", "none"]).toContain(item.improvisedBehavior.kind);
    });
    // "none" must be an authored disclosure, not an omission.
    const noneDisclosures = ITEM_POOL.filter((item) => item.improvisedBehavior.kind === "none");
    noneDisclosures.forEach((item) => {
      expect(item.improvisedBehavior.description).toMatch(/no additional/i);
    });
  });

  it("keeps typed behavior operations numeric and finite where present", () => {
    ITEM_POOL.forEach((item) => {
      [item.fittedBehavior, item.improvisedBehavior].forEach((behavior) => {
        if (behavior.kind === "time-modifier") {
          expect(Number.isFinite(behavior.timeModifier)).toBe(true);
        }
        if (behavior.kind === "buff-boost") {
          expect(Number.isFinite(behavior.buffBoostPercent)).toBe(true);
        }
        if (behavior.kind === "none") {
          expect(behavior.timeModifier).toBeUndefined();
          expect(behavior.buffBoostPercent).toBeUndefined();
        }
      });
    });
  });
});