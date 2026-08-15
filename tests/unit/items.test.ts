import { describe, expect, it } from "vitest";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { simulatePlayerLaps } from "../../src/simulation/laps";
import { applyTierBonus } from "../../src/simulation/tiering";
import { generateTrack } from "../../src/simulation/tracks";
import type { EntrantId, VehicleId } from "../../src/simulation/types";
import {
  amplifierFixture,
  compositionScaledFixture,
  configurableFixture,
  cooldownLapFixture,
  countSynergyBuffFixture,
  directFixture,
  economyFixtures,
  exactCountSynergyFixture,
  EXPECTED_CATALOG_SIZE,
  fittedValueScaledFixture,
  fullCatalogFixture,
} from "../fixtures/demo-feedback-fixtures";

describe("feature 032 demo-feedback fixtures (T002)", () => {
  it("every fixture resolves to a real shipped catalog item", () => {
    const catalogIds = new Set(fullCatalogFixture.map((item) => item.id));
    [
      directFixture,
      amplifierFixture,
      compositionScaledFixture,
      countSynergyBuffFixture,
      fittedValueScaledFixture,
      cooldownLapFixture,
      exactCountSynergyFixture,
      configurableFixture,
      economyFixtures.bookmakersChit,
      economyFixtures.engineBuildersNameplate,
      economyFixtures.patronsBrassPlaque,
    ].forEach((item) => expect(catalogIds.has(item.id), item.id).toBe(true));
  });

  it("fixtures carry the mechanic shape their category name claims", () => {
    expect(directFixture.physics).toBeDefined();
    expect(amplifierFixture.buff?.targetStat).toBeDefined();
    expect(amplifierFixture.buff?.perCount).toBeFalsy();
    expect(compositionScaledFixture.synergyEffects?.[0].condition.kind).toBe("linear-per-count");
    expect(countSynergyBuffFixture.buff?.perCount).toBe(true);
    expect(fittedValueScaledFixture.buff?.scalesWithFittedValue).toBe(true);
    expect(cooldownLapFixture.cooldown).toBeGreaterThan(1);
    expect(exactCountSynergyFixture.synergyEffects?.[0].condition.kind).toBe("exact-other-count");
    expect(configurableFixture.configurableSetup).toBeDefined();
    // Economy placeholders are complete definitions with no race effect yet.
    Object.values(economyFixtures).forEach((item) => {
      expect(item.timeModifier).toBe(0);
      expect(item.buff).toBeUndefined();
      expect(item.physics).toBeUndefined();
    });
  });

  it("the shipped catalog matches the audited size", () => {
    expect(fullCatalogFixture).toHaveLength(EXPECTED_CATALOG_SIZE);
  });
});


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
    const comparableOutcome = ({ time, physics }: (typeof guestLaps)[number]) => ({
      time,
      physics: physics && { stats: physics.stats, phases: physics.phases },
    });
    expect(guestLaps.map(comparableOutcome)).toEqual(homeLaps.map(comparableOutcome));

    // Provenance remains specific to the build that supplied the item.
    expect(guestLaps[0]?.physics?.itemContributions?.[0]?.slotId).not
      .toBe(homeLaps[0]?.physics?.itemContributions?.[0]?.slotId);
  });
});

// 028-pre-race-setup T031: the launch configurable-item set is exactly the
// authored 1/1/3/2 matrix (spec.md FR-008B) — nothing more, nothing less.
describe("028-pre-race-setup launch configurable-item matrix", () => {
  it("matches data-model.md's launch authoring matrix exactly, with no unintended configurable items", () => {
    const expected: Record<string, string> = {
      "mercer-hand-fitted-steering-knuckle": "steering-response",
      "soto-two-speed-drive-hub": "gearing",
      "rook-variable-pitch-propeller": "propeller-pitch",
      "rook-differential-braking-valve": "brake-balance",
      "rook-gyroscopic-stabilizer": "racing-line",
      "voss-adjustable-bodywork-stay": "bodywork-trim",
      "voss-split-circuit-brake-valve": "brake-balance",
    };

    const configurable = Object.values(EXCLUSIVE_ITEMS)
      .flat()
      .filter((item) => item.configurableSetup)
      .map((item) => [item.id, item.configurableSetup!.family] as const);

    expect(Object.fromEntries(configurable)).toEqual(expected);
    expect(configurable).toHaveLength(7);
  });

  it("distributes exactly 1/1/3/2 configurable items across Evelyn/Lucien/Inez/Nell (FR-008B)", () => {
    const counts = Object.fromEntries(
      Object.entries(EXCLUSIVE_ITEMS).map(([entrantId, items]) =>
        [entrantId, items.filter((item) => item.configurableSetup).length] as const),
    );
    expect(counts).toEqual({
      "evelyn-mercer": 1,
      "lucien-soto": 1,
      "inez-rook": 3,
      "nell-voss": 2,
    });
  });

  it("every configurable item's launch magnitude is exactly 1", () => {
    const configurable = Object.values(EXCLUSIVE_ITEMS).flat().filter((item) => item.configurableSetup);
    configurable.forEach((item) => expect(item.configurableSetup!.magnitude).toBe(1));
  });

  it("no neutral item is configurable", () => {
    expect(NEUTRAL_ITEMS.some((item) => item.configurableSetup)).toBe(false);
  });
});
