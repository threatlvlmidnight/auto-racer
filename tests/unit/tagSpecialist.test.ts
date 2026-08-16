import { describe, expect, it } from "vitest";
import {
  generateTagSpecialistStock,
  heldTagCounts,
  qualifyingTags,
  TAG_SPECIALIST_MODIFIED_PREMIUM,
  TAG_SPECIALIST_ELIGIBLE_WINDOW,
} from "../../src/simulation/tagSpecialist";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { instanceBuild, seededRng } from "../fixtures/encounter-variety-fixtures";

function taggedDef(id: string, tags: readonly string[], hasPhysics = true): ItemDefinition {
  return testItem({
    id,
    name: id,
    price: id.length,
    timeModifier: 0,
    synergyTags: tags,
    physics: hasPhysics ? { accelerationDelta: 2 } : undefined,
  });
}

describe("heldTagCounts / qualifyingTags — eligibility (T059/T060/FR-048)", () => {
  it("counts tags shared by items across slots and storage", () => {
    const defs = [taggedDef("a", ["twin"]), taggedDef("b", ["twin"]), taggedDef("c", ["twin"])];
    const build = instanceBuild([{ id: "a" }, { id: "b" }], [{ id: "c" }]);
    const count = heldTagCounts(build, defs).find((entry) => entry.tag === "twin");
    expect(count?.heldCount).toBe(3);
  });

  it("qualifies only tags held by at least two items", () => {
    const defs = [taggedDef("a", ["single"]), taggedDef("b", ["multi"]), taggedDef("c", ["multi"])];
    const build = instanceBuild([{ id: "a" }, { id: "b" }], [{ id: "c" }]);
    expect(qualifyingTags(build, defs)).toEqual(["multi"]);
  });

  it("exposes the final-four-choice later-run window", () => {
    expect(TAG_SPECIALIST_ELIGIBLE_WINDOW).toBe(4);
  });
});

describe("generateTagSpecialistStock — stock shaping (T059/T061/T062/FR-048)", () => {
  it("stocks three matching cross-origin items with exactly one modified premium entry", () => {
    const pool = [
      taggedDef("x1", ["twin"]),
      taggedDef("x2", ["twin"]),
      taggedDef("x3", ["twin"]),
      taggedDef("x4", ["twin"], false),
      taggedDef("unrelated", ["solo"]),
    ];
    const stock = generateTagSpecialistStock("twin", pool, seededRng(3), 40, "run-1");
    expect(stock).toHaveLength(3);
    stock.forEach((entry) => {
      expect(entry.item.synergyTags).toContain("twin");
    });
    const modified = stock.filter((entry) => entry.modified);
    expect(modified).toHaveLength(1);
    expect(modified[0].price).toBe(modified[0].normalPrice + TAG_SPECIALIST_MODIFIED_PREMIUM);
    stock.filter((entry) => !entry.modified).forEach((entry) => {
      expect(entry.price).toBe(entry.normalPrice);
    });
  });

  it("is deterministic for identical retained inputs", () => {
    const pool = [taggedDef("a", ["twin"]), taggedDef("b", ["twin"]), taggedDef("c", ["twin"])];
    const first = generateTagSpecialistStock("twin", pool, seededRng(11), 40, "run-2");
    const second = generateTagSpecialistStock("twin", pool, seededRng(11), 40, "run-2");
    expect(second.map((entry) => entry.entryId)).toEqual(first.map((entry) => entry.entryId));
  });
});
