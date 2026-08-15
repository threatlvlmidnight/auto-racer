import { describe, expect, it } from "vitest";
import { NEUTRAL_ITEMS } from "../../src/content/items";
import { economyContributions } from "../../src/simulation/garage";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const item = (id: string) => NEUTRAL_ITEMS.find((entry) => entry.id === id)!;

describe("Feature 032 economy item contributions", () => {
  it("scans installed and stored Chit, Nameplate, and Plaque by tier", () => {
    const build = vehicleBuild([item("neutral-bookmakers-chit"), item("neutral-engine-builders-nameplate")]);
    build.slots[0].tier = 3;
    build.storage[0].item = item("neutral-patrons-brass-plaque");
    build.storage[0].tier = 2;
    expect(economyContributions(build, "scored-win").map((entry) => entry.amount)).toEqual([3]);
    expect(economyContributions(build, "item-sale").map((entry) => entry.amount)).toEqual([1]);
    expect(economyContributions(build, "sponsor-success").map((entry) => entry.amount)).toEqual([4]);
  });
});
