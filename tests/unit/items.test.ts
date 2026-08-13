import { describe, expect, it } from "vitest";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { simulatePlayerLaps } from "../../src/simulation/laps";
import { applyTierBonus } from "../../src/simulation/tiering";
import { generateTrack } from "../../src/simulation/tracks";
import type { EntrantId, VehicleId } from "../../src/simulation/types";

const VEHICLE_FOR: Record<EntrantId, VehicleId> = {
  "evelyn-mercer": "the-highwheel",
  "lucien-soto": "the-needle",
  "inez-rook": "the-lark",
  "nell-voss": "the-hush",
};

describe("complete 70-item catalog", () => {
  it("installs, tiers, and simulates every item on a real generated track", () => {
    const track = generateTrack(20, 1);
    const catalogs = [
      ...Object.entries(EXCLUSIVE_ITEMS).map(([entrantId, items]) => ({ entrantId: entrantId as EntrantId, items })),
      { entrantId: "evelyn-mercer" as const, items: NEUTRAL_ITEMS },
    ];

    for (const { entrantId, items } of catalogs) {
      for (const item of items) {
        const build = createEmptyVehicleBuild(VEHICLE_FOR[entrantId]);
        build.slots[0].item = applyTierBonus(item, 3);
        const laps = simulatePlayerLaps(build, 10, track);
        expect(laps, item.id).toHaveLength(10);
        expect(laps.every((lap) => Number.isFinite(lap.time)), item.id).toBe(true);
        expect(laps.every((lap) => lap.physics !== undefined), item.id).toBe(true);
      }
    }
  });

  it("simulates an off-origin cross-pollinated item identically", () => {
    const item = EXCLUSIVE_ITEMS["inez-rook"][0];
    const home = createEmptyVehicleBuild("the-lark");
    const guest = createEmptyVehicleBuild("the-highwheel");
    home.slots[2].item = item;
    guest.slots[3].item = item;
    const track = generateTrack(33, 2);
    const guestLaps = simulatePlayerLaps(guest, 10, track);
    const homeLaps = simulatePlayerLaps(home, 10, track);
    expect(guestLaps.map(({ time, physics }) => ({ time, physics })))
      .toEqual(homeLaps.map(({ time, physics }) => ({ time, physics })));
  });
});
