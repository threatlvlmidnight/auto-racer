import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { firesOnLap, simulatePlayerLaps } from "../../src/simulation/laps";
import { generateTrack, simulateLapPhysics, STOCK_PHYSICAL_STATS } from "../../src/simulation/tracks";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type Build,
  type OfferedItem,
} from "../../src/simulation/types";
import {
  buffDependentPracticeBuild,
  minimumClampPracticeBuild,
  storageActivePracticeBuild,
} from "../fixtures/practice-fixtures";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function emptyBuild(): Build {
  return vehicleBuild();
}

function catalogItem(id: string): OfferedItem {
  return structuredClone(ITEM_POOL.find((candidate) => candidate.id === id)!);
}

describe("simulatePlayerLaps", () => {
  it("emits complete per-held-item source, trigger, buff, storage, and timing evidence", () => {
    const lap = simulatePlayerLaps(buffDependentPracticeBuild())[0];

    expect(lap.contributions).toHaveLength(6);
    lap.contributions.forEach((entry) => {
      expect(entry).toMatchObject({
        lap: 1,
        sourceItemId: expect.any(String),
        sourceLocation: { area: expect.stringMatching(/board|storage/), index: expect.any(Number) },
        effectKind: expect.any(String),
        triggerState: expect.any(String),
        baseContribution: expect.any(Number),
        buffApplications: expect.any(Array),
        resultingContribution: expect.any(Number),
        preClampLapTime: expect.any(Number),
        clampAdjustment: expect.any(Number),
        resultingLapTime: lap.time,
        storageActive: expect.any(Boolean),
      });
    });
    expect(lap.contributions.find(({ sourceItemId }) => sourceItemId === "item-001")?.buffApplications)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceItemId: "item-012", targetItemId: "item-001", type: "flat" }),
        expect.objectContaining({ sourceItemId: "item-014", targetItemId: "item-001", type: "stacking" }),
      ]));
  });

  it("distinguishes storage-active and inactive storage evidence", () => {
    const evidence = simulatePlayerLaps(storageActivePracticeBuild())[0].contributions;
    expect(evidence.find(({ sourceItemId }) => sourceItemId === "item-013")).toMatchObject({
      sourceLocation: { area: "storage", index: 0 },
      storageActive: true,
      triggerState: "fired",
    });
    expect(evidence.find(({ sourceItemId }) => sourceItemId === "item-001")).toMatchObject({
      sourceLocation: { area: "storage", index: 1 },
      storageActive: false,
      triggerState: "inactive-storage",
      resultingContribution: 0,
    });
  });

  it("reports pre-clamp time and exact minimum-time adjustment", () => {
    const lap = simulatePlayerLaps(minimumClampPracticeBuild())[0];
    expect(lap.time).toBe(MIN_LAP_TIME);
    expect(lap.contributions[0]).toMatchObject({
      preClampLapTime: -14,
      clampAdjustment: 14.1,
      resultingLapTime: MIN_LAP_TIME,
    });
  });

  it("returns exactly LAP_COUNT unmodified laps for an empty build", () => {
    const build = emptyBuild();
    const result = simulatePlayerLaps(build);

    expect(result).toHaveLength(LAP_COUNT);
    result.forEach((lap) => {
      expect(lap.time).toBe(build.car.baseLapTime);
      expect(lap.firedItems).toEqual([]);
    });
  });

  it("is deterministic for an identical build", () => {
    const build = emptyBuild();

    expect(simulatePlayerLaps(build)).toEqual(simulatePlayerLaps(build));
  });

  it("accepts explicit 10 and 12 lap counts without changing the first ten laps", () => {
    const item: OfferedItem = testItem({
      id: "variable-periodic",
      name: "Variable Periodic",
      price: 2,
      timeModifier: -1,
      cooldown: 3,
    });
    const build = vehicleBuild([item, null, null]);
    const ten = simulatePlayerLaps(build, 10);
    const twelve = simulatePlayerLaps(build, 12);

    expect(ten).toHaveLength(10);
    expect(twelve).toHaveLength(12);
    expect(twelve.slice(0, 10)).toEqual(ten);
    expect(twelve[10].firedItems).toEqual([]);
    expect(twelve[11].firedItems).toEqual([]);
    expect(twelve.every(({ time }) => time >= MIN_LAP_TIME)).toBe(true);
    expect(simulatePlayerLaps(build, 12)).toEqual(twelve);
  });

  it("applies and records a cooldown-1 direct item every lap", () => {
    const item: OfferedItem = testItem({
      id: "every-lap",
      name: "Every Lap",
      price: 2,
      timeModifier: -1,
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([item, null, null]));

    result.forEach((lap) => {
      expect(lap.time).toBe(5);
      expect(lap.firedItems).toEqual([{ id: item.id, contribution: -1 }]);
    });
  });

  it("applies and records a cooldown-3 direct item only on predicted laps", () => {
    const item: OfferedItem = testItem({
      id: "periodic",
      name: "Periodic",
      price: 2,
      timeModifier: -1,
      cooldown: 3,
    });
    const result = simulatePlayerLaps(vehicleBuild([item, null, null]));

    expect(result.map((lap) => lap.firedItems)).toEqual([
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
    ]);
    expect(result.map((lap) => lap.time)).toEqual([5, 6, 6, 5, 6, 6, 5, 6, 6, 5]);
  });

  it("clamps aggressive recurring and stacking effects to MIN_LAP_TIME", () => {
    const direct: OfferedItem = testItem({
      id: "aggressive-direct",
      name: "Aggressive Direct",
      price: 2,
      timeModifier: -10,
      identityTag: "performance",
      cooldown: 1,
    });
    const stackingBuff: OfferedItem = testItem({
      id: "aggressive-stack",
      name: "Aggressive Stack",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 1,
      buff: { boostPercent: 100 },
    });
    const result = simulatePlayerLaps(vehicleBuild([direct, stackingBuff, null]));

    result.forEach((lap) => expect(lap.time).toBe(MIN_LAP_TIME));
  });

  it("records flat and stacking buff contributions on their firing laps", () => {
    const direct: OfferedItem = testItem({
      id: "boosted-direct",
      name: "Boosted Direct",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 3,
    });
    const flatBuff: OfferedItem = testItem({
      id: "flat-buff",
      name: "Flat Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    });
    const stackingBuff: OfferedItem = testItem({
      id: "stacking-buff",
      name: "Stacking Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    });
    const result = simulatePlayerLaps(vehicleBuild([direct, flatBuff, stackingBuff]));

    expect(result[0].firedItems).toEqual([
      { id: direct.id, contribution: -1.06 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 1 },
    ]);
    expect(result[1].firedItems).toEqual([{ id: flatBuff.id, contribution: 5 }]);
    expect(result[3].firedItems).toEqual([
      { id: direct.id, contribution: -1.07 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 2 },
    ]);
  });

  it("records a count-synergy buff's contribution as rate times qualifying count, including inert storage matches", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 3, perCount: true },
    });
    const activeMatch: OfferedItem = testItem({
      id: "active-match",
      name: "Active Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });
    const inertMatch: OfferedItem = testItem({
      id: "inert-match",
      name: "Inert Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([countBuff, activeMatch, null], [inertMatch, null, null]));

    // qualifying count = 2 (activeMatch + inertMatch, inertMatch not active-while-stored);
    // contribution = 3 * 2 = 6, unaffected by activeMatch's own lap-to-lap firing.
    result.forEach((lap) => {
      const countBuffFired = lap.firedItems.find((fired) => fired.id === countBuff.id);
      expect(countBuffFired).toEqual({ id: countBuff.id, contribution: 6 });
    });
  });

  it("leaves direct items' own contributions unaffected by an unrelated count-synergy buff", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 100, perCount: true },
    });
    const unrelatedDirect: OfferedItem = testItem({
      id: "unrelated",
      name: "Unrelated",
      price: 2,
      timeModifier: -2,
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([countBuff, unrelatedDirect, null]));

    result.forEach((lap) => {
      const unrelatedFired = lap.firedItems.find((fired) => fired.id === unrelatedDirect.id);
      expect(unrelatedFired).toEqual({ id: unrelatedDirect.id, contribution: -2 });
    });
  });
});

describe("simulatePlayerLaps — installation-aware behavior (010 US3)", () => {
  it("adds the item's Fitted behavior on top of its base effect in a matching-category slot", () => {
    // item-001 is a Power item; The Highwheel's slot 1 is Power.
    const item = catalogItem("item-001");
    const lap = simulatePlayerLaps(vehicleBuild([item, null, null, null]))[0];

    expect(lap.firedItems).toEqual([{ id: item.id, contribution: -3.4 }]);
    expect(lap.contributions.find((entry) => entry.sourceItemId === item.id)?.installation).toEqual({
      state: "fitted",
      behavior: item.fittedBehavior.description,
    });
  });

  it("adds the item's Improvised behavior on top of its base effect in a conflicting-category slot", () => {
    // item-001 is a Power item; The Highwheel's slot 2 is Chassis.
    const item = catalogItem("item-001");
    const lap = simulatePlayerLaps(vehicleBuild([null, item, null, null]))[0];

    expect(lap.firedItems).toEqual([{ id: item.id, contribution: -2.7 }]);
    expect(lap.contributions.find((entry) => entry.sourceItemId === item.id)?.installation).toEqual({
      state: "improvised",
      behavior: item.improvisedBehavior.description,
    });
  });

  it("applies only the base effect in a Flex slot, regardless of the item's category", () => {
    // The Highwheel's slot 4 is Flex.
    const item = catalogItem("item-001");
    const lap = simulatePlayerLaps(vehicleBuild([null, null, null, item]))[0];

    expect(lap.firedItems).toEqual([{ id: item.id, contribution: -3 }]);
    expect(lap.contributions.find((entry) => entry.sourceItemId === item.id)?.installation).toEqual({
      state: "flexible",
      behavior: expect.stringContaining("Base"),
    });
  });

  it("invents no penalty for an explicit no-consequence Improvised item in a conflicting slot", () => {
    // item-003 is a Chassis item with improvisedBehavior kind "none"; slot 1 is Power.
    const item = catalogItem("item-003");
    const lap = simulatePlayerLaps(vehicleBuild([item, null, null, null]))[0];

    expect(lap.firedItems).toEqual([{ id: item.id, contribution: item.timeModifier }]);
    expect(lap.contributions.find((entry) => entry.sourceItemId === item.id)?.installation?.state)
      .toBe("improvised");
  });

  it("amplifies a buff item's own boost by its Fitted buff-boost when installed in a matching slot", () => {
    // item-012 is a Power buff item (boostPercent 5, Fitted +2); slot 1 is Power.
    const buffItem = catalogItem("item-012");
    const companion = testItem({
      id: "companion-direct", name: "Companion", price: 1, timeModifier: -1,
      identityTag: "performance", cooldown: 1,
    });
    const lap = simulatePlayerLaps(vehicleBuild([buffItem, companion, null, null]))[0];

    expect(lap.firedItems.find((fired) => fired.id === companion.id)).toEqual({
      id: companion.id,
      contribution: -1.07,
    });
  });

  it("reduces a buff item's own boost by its Improvised buff-boost when installed in a conflicting slot", () => {
    // item-012 is a Power buff item (boostPercent 5, Improvised -2); slot 2 is Chassis.
    const buffItem = catalogItem("item-012");
    const companion = testItem({
      id: "companion-direct", name: "Companion", price: 1, timeModifier: -1,
      identityTag: "performance", cooldown: 1,
    });
    const lap = simulatePlayerLaps(vehicleBuild([null, buffItem, companion, null]))[0];

    expect(lap.firedItems.find((fired) => fired.id === companion.id)).toEqual({
      id: companion.id,
      contribution: -1.03,
    });
  });

  it("never applies installation behavior to a stored item, even one active while stored", () => {
    // item-013 (Tyre Rack) is activeWhileStored; storage has no slot type or installation state.
    const item = catalogItem("item-013");
    const lap = simulatePlayerLaps(vehicleBuild([], [item, null, null]))[0];
    const evidence = lap.contributions.find((entry) => entry.sourceItemId === item.id);

    expect(lap.firedItems).toEqual([{ id: item.id, contribution: item.timeModifier }]);
    expect(evidence?.installation).toBeUndefined();
  });

  it("produces identical results regardless of which same-type slot holds the item", () => {
    // item-004 is a Chassis item; The Highwheel's slots 2 and 3 are both Chassis.
    const item = catalogItem("item-004");
    const inSlotTwo = simulatePlayerLaps(vehicleBuild([null, item, null, null]));
    const inSlotThree = simulatePlayerLaps(vehicleBuild([null, null, item, null]));

    expect(inSlotTwo.map((lap) => lap.time)).toEqual(inSlotThree.map((lap) => lap.time));
    expect(inSlotTwo.map((lap) => lap.firedItems)).toEqual(inSlotThree.map((lap) => lap.firedItems));
  });

  it("keeps existing cooldown and buff firing order stable for inert (non-catalog) test items", () => {
    const direct = testItem({
      id: "boosted-direct", name: "Boosted Direct", price: 2, timeModifier: -1,
      identityTag: "performance", cooldown: 3,
    });
    const flatBuff = testItem({
      id: "flat-buff", name: "Flat Buff", price: 2, timeModifier: 0,
      identityTag: "performance", buff: { boostPercent: 5 },
    });
    const result = simulatePlayerLaps(vehicleBuild([direct, flatBuff, null, null]));

    expect(result[0].firedItems).toEqual([
      { id: direct.id, contribution: -1.05 },
      { id: flatBuff.id, contribution: 5 },
    ]);
  });
});

describe("firesOnLap", () => {
  it("fires cooldown 1 on every lap", () => {
    expect(Array.from({ length: LAP_COUNT }, (_, index) => firesOnLap(1, index + 1))).toEqual(
      Array(LAP_COUNT).fill(true)
    );
  });

  it("fires cooldown N on laps 1, 1+N, 1+2N and no others", () => {
    const firingLaps = Array.from({ length: LAP_COUNT }, (_, index) => index + 1).filter((lap) =>
      firesOnLap(3, lap)
    );

    expect(firingLaps).toEqual([1, 4, 7, 10]);
    expect(firesOnLap(3, 4)).toBe(firesOnLap(3, 4));
  });
});

describe("simulatePlayerLaps — synergy fold (014-item-synergy-tags, Foundational)", () => {
  it("folds a Boost-Others effect into the target direct item's own contribution, attributed to the source", () => {
    const source = testItem({
      id: "boost-source",
      name: "Boost Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 10 },
          description: "Boosts gearing items by 10% per matching item.",
        },
      ],
    });
    const target = testItem({
      id: "boost-target",
      name: "Boost Target",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      synergyTags: ["gearing"],
    });
    const lap = simulatePlayerLaps(vehicleBuild([source, target]))[0];
    const targetContribution = lap.contributions.find((entry) => entry.sourceItemId === "boost-target")!;

    expect(targetContribution.resultingContribution).toBeCloseTo(-11);
    expect(targetContribution.synergy).toEqual([
      {
        sourceItemId: "boost-source",
        target: { kind: "tag", tag: "gearing" },
        conditionKind: "linear-per-count",
        appliedPercent: 10,
        description: source.synergyEffects![0].description,
      },
    ]);
  });

  it("leaves a target item's contribution unchanged and synergy undefined when nothing shares its target tag", () => {
    const source = testItem({
      id: "boost-source",
      name: "Boost Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 10 },
          description: "Boosts gearing items by 10% per matching item.",
        },
      ],
    });
    const unrelated = testItem({
      id: "unrelated",
      name: "Unrelated",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      synergyTags: ["momentum"],
    });
    const lap = simulatePlayerLaps(vehicleBuild([source, unrelated]))[0];
    const contribution = lap.contributions.find((entry) => entry.sourceItemId === "unrelated")!;

    expect(contribution.resultingContribution).toBe(-10);
    expect(contribution.synergy).toBeUndefined();
  });

  it("folds a Self-Conditional bonus into the item's own contribution when its lone-item condition is met", () => {
    const loneItem = testItem({
      id: "lone-power",
      name: "Lone Power",
      price: 1,
      timeModifier: -4,
      cooldown: 1,
      installationCategory: "power",
      synergyEffects: [
        {
          target: { kind: "category", category: "power" },
          appliesTo: "self",
          condition: { kind: "exact-other-count", count: 0, bonusPercent: 50 },
          description: "+50% if the only Power item held.",
        },
      ],
    });
    const alone = simulatePlayerLaps(vehicleBuild([loneItem]))[0];
    const aloneContribution = alone.contributions.find((entry) => entry.sourceItemId === "lone-power")!;

    expect(aloneContribution.resultingContribution).toBeCloseTo(-6);
    expect(aloneContribution.synergy).toEqual([
      {
        sourceItemId: "lone-power",
        target: { kind: "category", category: "power" },
        conditionKind: "exact-other-count",
        appliedPercent: 50,
        description: loneItem.synergyEffects![0].description,
      },
    ]);
  });

  it("stops applying the Self-Conditional bonus once a second matching item is held, keeping the base effect", () => {
    const loneItem = testItem({
      id: "lone-power",
      name: "Lone Power",
      price: 1,
      timeModifier: -4,
      cooldown: 1,
      installationCategory: "power",
      synergyEffects: [
        {
          target: { kind: "category", category: "power" },
          appliesTo: "self",
          condition: { kind: "exact-other-count", count: 0, bonusPercent: 50 },
          description: "+50% if the only Power item held.",
        },
      ],
    });
    const otherPower = testItem({
      id: "other-power",
      name: "Other Power",
      price: 1,
      timeModifier: -2,
      cooldown: 1,
      installationCategory: "power",
    });
    const paired = simulatePlayerLaps(vehicleBuild([loneItem, otherPower]))[0];
    const pairedContribution = paired.contributions.find((entry) => entry.sourceItemId === "lone-power")!;

    expect(pairedContribution.resultingContribution).toBe(-4);
    expect(pairedContribution.synergy).toBeUndefined();
  });

  it("folds a Boost-Others effect into a buff item's boostPercent, changing what it grants downstream", () => {
    const source = testItem({
      id: "boost-source",
      name: "Boost Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "avionics" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 10 },
          description: "Boosts avionics items by 10% per matching item.",
        },
      ],
    });
    const flatBuff = testItem({
      id: "flat-buff",
      name: "Flat Buff",
      price: 1,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
      synergyTags: ["avionics"],
    });
    const directRecipient = testItem({
      id: "direct-recipient",
      name: "Direct Recipient",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      identityTag: "performance",
    });
    const lap = simulatePlayerLaps(vehicleBuild([source, flatBuff, directRecipient]))[0];
    const buffContribution = lap.contributions.find((entry) => entry.sourceItemId === "flat-buff")!;
    const recipientContribution = lap.contributions.find((entry) => entry.sourceItemId === "direct-recipient")!;

    expect(buffContribution.synergy).toEqual([
      {
        sourceItemId: "boost-source",
        target: { kind: "tag", tag: "avionics" },
        conditionKind: "linear-per-count",
        appliedPercent: 10,
        description: source.synergyEffects![0].description,
      },
    ]);
    // boostPercent 5 + 10 synergy points = 15% applied to the recipient's -10s base.
    expect(recipientContribution.resultingContribution).toBeCloseTo(-11.5);
  });

  it("is pure — identical builds always produce identical synergy-folded contributions", () => {
    const source = testItem({
      id: "boost-source",
      name: "Boost Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 10 },
          description: "Boosts gearing items by 10% per matching item.",
        },
      ],
    });
    const target = testItem({
      id: "boost-target",
      name: "Boost Target",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      synergyTags: ["gearing"],
    });
    const build = vehicleBuild([source, target]);

    expect(simulatePlayerLaps(build)).toEqual(simulatePlayerLaps(build));
  });
});

describe("simulatePlayerLaps — tier fold (016-duplicate-item-tiering US2, FR-006)", () => {
  it("folds a board item's tier bonus in before its installation delta", () => {
    const item = testItem({
      id: "tiered-power",
      name: "Tiered Power",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      installationCategory: "power",
      fittedBehavior: { kind: "time-modifier", timeModifier: -1, description: "Fitted: extra 1s." },
    });
    const build = vehicleBuild([item]);
    build.slots[0].tier = 2;
    const contribution = simulatePlayerLaps(build)[0].contributions.find((entry) => entry.sourceItemId === "tiered-power")!;

    // tier 2: -10 * 1.15 = -11.5, then Fitted's flat -1 => -12.5
    expect(contribution.resultingContribution).toBeCloseTo(-12.5);
  });

  it("folds a storage item's tier bonus even though storage has no installation state", () => {
    const item = testItem({
      id: "tiered-storage",
      name: "Tiered Storage",
      price: 1,
      timeModifier: -4,
      cooldown: 1,
      activeWhileStored: true,
    });
    const build = vehicleBuild([], [item]);
    build.storage[0].tier = 3;
    const contribution = simulatePlayerLaps(build)[0].contributions.find((entry) => entry.sourceItemId === "tiered-storage")!;

    // tier 3: -4 * 1.30 = -5.2
    expect(contribution.resultingContribution).toBeCloseTo(-5.2);
  });

  it("composes tier, installation, and synergy together without dropping any layer", () => {
    const target = testItem({
      id: "tiered-target",
      name: "Tiered Target",
      price: 1,
      timeModifier: -10,
      cooldown: 1,
      installationCategory: "power",
      fittedBehavior: { kind: "time-modifier", timeModifier: -1, description: "Fitted: extra 1s." },
      synergyTags: ["gearing"],
    });
    const source = testItem({
      id: "synergy-source",
      name: "Synergy Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 10 },
          description: "Boosts gearing items by 10% per matching item.",
        },
      ],
    });
    const build = vehicleBuild([target, null, null, source]);
    build.slots[0].tier = 2;
    const contribution = simulatePlayerLaps(build)[0].contributions.find((entry) => entry.sourceItemId === "tiered-target")!;

    // tier 2: -10 * 1.15 = -11.5; + Fitted -1 => -12.5; + 10% synergy => -13.75
    expect(contribution.resultingContribution).toBeCloseTo(-13.75);
  });

  it("leaves a tier-1 item's contribution identical to today's untiered value", () => {
    const item = testItem({ id: "untiered", name: "Untiered", price: 1, timeModifier: -6, cooldown: 1 });
    const contribution = simulatePlayerLaps(vehicleBuild([item]))[0].contributions
      .find((entry) => entry.sourceItemId === "untiered")!;
    expect(contribution.resultingContribution).toBe(-6);
  });
});

describe("authored synergy example items (014 US1/US2, sample-data.ts)", () => {
  it("US1: item-011 (Compact Data Logger) boosts other held gearing items, attributed to it", () => {
    const dataLogger = catalogItem("item-011");
    const gearingItem = catalogItem("item-001"); // Close-Ratio Gearset: synergyTags ["gearing", "momentum"]
    const withLogger = simulatePlayerLaps(vehicleBuild([dataLogger, gearingItem]))[0];
    const withoutLogger = simulatePlayerLaps(vehicleBuild([null, gearingItem]))[0];
    const boostedContribution = withLogger.contributions.find((entry) => entry.sourceItemId === "item-001")!;
    const baseContribution = withoutLogger.contributions.find((entry) => entry.sourceItemId === "item-001")!;

    expect(dataLogger.synergyEffects).toBeDefined();
    expect(boostedContribution.synergy?.[0]).toMatchObject({ sourceItemId: "item-011" });
    expect(Math.abs(boostedContribution.resultingContribution)).toBeGreaterThan(
      Math.abs(baseContribution.resultingContribution),
    );
  });

  it("US2: item-002 (Lightweight Flywheel) gains its lone-Power bonus alone, loses it with a second Power item", () => {
    const flywheel = catalogItem("item-002");
    const otherPower = catalogItem("item-005"); // Blueprinted Engine: installationCategory "power"
    const alone = simulatePlayerLaps(vehicleBuild([flywheel]))[0];
    const paired = simulatePlayerLaps(vehicleBuild([flywheel, otherPower]))[0];
    const aloneContribution = alone.contributions.find((entry) => entry.sourceItemId === "item-002")!;
    const pairedContribution = paired.contributions.find((entry) => entry.sourceItemId === "item-002")!;

    expect(flywheel.synergyEffects).toBeDefined();
    expect(aloneContribution.synergy?.[0]).toMatchObject({ sourceItemId: "item-002" });
    expect(pairedContribution.synergy).toBeUndefined();
    // The unconditional base effect (Fitted -0.25s, on lap 1 of a Fitted power slot) survives either way.
    expect(pairedContribution.resultingContribution).toBeLessThan(0);
  });
});

// 018-track-generation: simulatePlayerLaps's optional track parameter
// (021-arcade-physics-simulation replaced 018's original trackFit fold with
// real physics — see the "PlayerLap.physics inspectability" and
// "build-vs-track payoff" describe blocks further down).

function powerHeavyBuild(): Build {
  return vehicleBuild([
    testItem({ id: "th-p1", name: "Power 1", price: 0, timeModifier: -1, cooldown: 1, installationCategory: "power" }),
    testItem({ id: "th-p2", name: "Power 2", price: 0, timeModifier: -1, cooldown: 1, installationCategory: "power" }),
    testItem({ id: "th-c1", name: "Chassis 1", price: 0, timeModifier: -1, cooldown: 1, installationCategory: "chassis" }),
  ]);
}

describe("simulatePlayerLaps omitted-track parity (T025, FR-007)", () => {
  it("produces a byte-for-byte identical result to a two-argument call for every existing fixture", () => {
    expect(simulatePlayerLaps(buffDependentPracticeBuild())).toEqual(
      simulatePlayerLaps(buffDependentPracticeBuild(), LAP_COUNT),
    );
    expect(simulatePlayerLaps(emptyBuild())).toEqual(simulatePlayerLaps(emptyBuild(), LAP_COUNT));
  });

  it("omits physics entirely when no track is supplied", () => {
    const laps = simulatePlayerLaps(powerHeavyBuild());
    laps.forEach((lap) => expect(lap.physics).toBeUndefined());
  });
});

// 021-arcade-physics-simulation Polish (T031-T034): 018's buildTrackLean/
// trackFit ratio-based fold is fully removed, not deprecated — superseded
// by the real physics simulation, already covered end-to-end by the
// "PlayerLap.physics inspectability" and "build-vs-track payoff" describe
// blocks below (US2/US3). No replacement needed here beyond the parity
// test above.

// 021-arcade-physics-simulation: stock-build physics wired into
// simulatePlayerLaps (T012-T015, US1).
describe("simulatePlayerLaps stock-build physics (T012-T015, US1)", () => {
  it("for a build with zero physics-stat items, the physics-derived component matches simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments)", () => {
    const track = generateTrack(5, 1);
    const expected = simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments);
    const lap = simulatePlayerLaps(emptyBuild(), LAP_COUNT, track)[0];

    // The physics contribution is additive on top of the (empty-build) item
    // total, which is exactly BASELINE_CAR.baseLapTime for an empty build.
    expect(lap.time).toBeCloseTo(emptyBuild().car.baseLapTime + expected.totalSeconds, 9);
  });

  it("two generated tracks with equal characteristics but different real segments produce different lap times for the same stock build (SC-001, end-to-end)", () => {
    const trackA = generateTrack(0, 1);
    const trackB = generateTrack(0, 2);
    expect(trackA.characteristics).toEqual(trackB.characteristics);

    const timeA = simulatePlayerLaps(emptyBuild(), LAP_COUNT, trackA)[0].time;
    const timeB = simulatePlayerLaps(emptyBuild(), LAP_COUNT, trackB)[0].time;
    expect(timeA).not.toBeCloseTo(timeB, 6);
  });

  it("never reaches top speed on a straight too short to both reach it and brake down for the next corner", () => {
    // Deliberately tiny straights between moderate corners — too little
    // distance to accelerate up to STOCK_PHYSICAL_STATS.topSpeed and still
    // brake back down in time. simulateLapPhysics zips corners/straights
    // positionally by kind, so this doesn't need real closure (turnDegrees
    // summing to 360) — just matching corner/straight counts.
    const tightSegments = [
      { kind: "straight" as const, length: 1 },
      { kind: "corner" as const, turnDegrees: 30, direction: "left" as const },
      { kind: "straight" as const, length: 1 },
      { kind: "corner" as const, turnDegrees: 30, direction: "left" as const },
    ];
    const result = simulateLapPhysics(STOCK_PHYSICAL_STATS, tightSegments);
    const everyPeakBelowTopSpeed = result.phases.every((phase) => phase.phase !== "cruising");

    expect(everyPeakBelowTopSpeed).toBe(true);
    expect(result.totalSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(result.totalSeconds)).toBe(true);
  });

  it("produces deeply equal results for identical (build, track) inputs across repeated calls", () => {
    const track = generateTrack(9, 3);
    const first = simulatePlayerLaps(emptyBuild(), LAP_COUNT, track);
    const second = simulatePlayerLaps(emptyBuild(), LAP_COUNT, track);
    expect(second).toEqual(first);
  });
});

// 021-arcade-physics-simulation: zero-regression guard (T018-T020, US4) —
// proven before US2 adds item-driven physics behavior.
describe("simulatePlayerLaps zero regression for timeModifier-only items (T019, FR-008)", () => {
  it("a timeModifier-only item contributes its exact flat seconds delta whether or not a track is supplied", () => {
    // Balanced Power/Chassis — a leftover from when this test needed to
    // stay neutral against 018's trackFit fold before Polish removed it;
    // harmless to keep as the build shape now.
    const build = vehicleBuild([
      testItem({ id: "reg-p1", name: "Power 1", price: 0, timeModifier: -1, cooldown: 1, installationCategory: "power" }),
      testItem({ id: "reg-c1", name: "Chassis 1", price: 0, timeModifier: -1, cooldown: 1, installationCategory: "chassis" }),
    ]);
    const track = generateTrack(7, 2);
    const withoutTrack = simulatePlayerLaps(build)[0].time;
    const withTrack = simulatePlayerLaps(build, LAP_COUNT, track)[0].time;
    const physicsSeconds = simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments).totalSeconds;

    expect(withTrack - physicsSeconds).toBeCloseTo(withoutTrack, 9);
  });
});

// 021-arcade-physics-simulation: items express real physical stats
// (T021-T024, US2) — the actual build-vs-track payoff.
function findPhysicsBiasedTrack(direction: "power" | "cornering") {
  for (let seed = 0; seed < 100; seed += 1) {
    const track = generateTrack(seed, 1);
    const diff = track.characteristics.powerDemand - track.characteristics.corneringDemand;
    if (direction === "power" && diff > 15) return track;
    if (direction === "cornering" && diff < -15) return track;
  }
  throw new Error(`no ${direction}-biased track found in a 100-seed sample`);
}

describe("simulatePlayerLaps item-driven PhysicalStats (T021, US2)", () => {
  it("an item's physics deltas measurably change the physics-derived lap time relative to an identical build without it", () => {
    const track = generateTrack(11, 2);
    const boosted = vehicleBuild([
      testItem({
        id: "phys-accel-1", name: "Turbo", price: 0, timeModifier: 0,
        physics: { accelerationDelta: 30 },
      }),
    ]);
    const plain = vehicleBuild();

    const boostedTime = simulatePlayerLaps(boosted, LAP_COUNT, track)[0].time;
    const plainTime = simulatePlayerLaps(plain, LAP_COUNT, track)[0].time;
    expect(boostedTime).toBeLessThan(plainTime);
  });

  it("excludes an inactive stored item's physics deltas (matching the existing active-item filtering convention)", () => {
    const track = generateTrack(11, 2);
    const buildWithInactiveStorage = vehicleBuild(
      [],
      [testItem({
        id: "phys-stored-1", name: "Stashed Turbo", price: 0, timeModifier: 0,
        physics: { accelerationDelta: 500 }, activeWhileStored: false,
      })],
    );
    const plain = vehicleBuild();

    const storedTime = simulatePlayerLaps(buildWithInactiveStorage, LAP_COUNT, track)[0].time;
    const plainTime = simulatePlayerLaps(plain, LAP_COUNT, track)[0].time;
    expect(storedTime).toBeCloseTo(plainTime, 9);
  });
});

describe("simulatePlayerLaps build-vs-track payoff (T022-T024, US2, SC-002)", () => {
  it("a cornering-speed item is a bigger net time gain on a corner-dominant track than on a power-dominant one", () => {
    const powerTrack = findPhysicsBiasedTrack("power");
    const corneringTrack = findPhysicsBiasedTrack("cornering");
    const buildWithoutItem = vehicleBuild();
    const buildWithItem = vehicleBuild([
      testItem({
        id: "phys-corner-1", name: "Sport Suspension", price: 0, timeModifier: 0,
        physics: { corneringSpeedDelta: 30 },
      }),
    ]);

    const gainOnPower = simulatePlayerLaps(buildWithoutItem, LAP_COUNT, powerTrack)[0].time
      - simulatePlayerLaps(buildWithItem, LAP_COUNT, powerTrack)[0].time;
    const gainOnCornering = simulatePlayerLaps(buildWithoutItem, LAP_COUNT, corneringTrack)[0].time
      - simulatePlayerLaps(buildWithItem, LAP_COUNT, corneringTrack)[0].time;

    expect(gainOnCornering).toBeGreaterThan(gainOnPower);
  });

  it("an item trading cornering speed for top speed nets differently across tracks with different real segment layouts, not just different aggregate scores", () => {
    // generateTrack(0, 1) / generateTrack(0, 2): verified equal
    // trackCharacteristics, genuinely different real segments (021 T005).
    const trackA = generateTrack(0, 1);
    const trackB = generateTrack(0, 2);
    expect(trackA.characteristics).toEqual(trackB.characteristics);

    const tradeBuild = vehicleBuild([
      testItem({
        id: "phys-trade-1", name: "Aero Kit", price: 0, timeModifier: 0,
        physics: { corneringSpeedDelta: 20, topSpeedDelta: -10 },
      }),
    ]);
    const plainBuild = vehicleBuild();

    const deltaOnA = simulatePlayerLaps(tradeBuild, LAP_COUNT, trackA)[0].time
      - simulatePlayerLaps(plainBuild, LAP_COUNT, trackA)[0].time;
    const deltaOnB = simulatePlayerLaps(tradeBuild, LAP_COUNT, trackB)[0].time
      - simulatePlayerLaps(plainBuild, LAP_COUNT, trackB)[0].time;

    expect(deltaOnA).not.toBeCloseTo(deltaOnB, 6);
  });
});

// 021-arcade-physics-simulation: full inspectability (T027-T028, US3).
describe("PlayerLap.physics inspectability (T027-T028, US3, SC-004)", () => {
  it("reports the build's resolved PhysicalStats and a phase breakdown that sums exactly to the lap's physics-derived time", () => {
    const track = generateTrack(4, 1);
    const build = vehicleBuild([
      testItem({
        id: "phys-insp-1", name: "Turbo", price: 0, timeModifier: 0,
        physics: { accelerationDelta: 15 },
      }),
    ]);
    const lap = simulatePlayerLaps(build, LAP_COUNT, track)[0];

    expect(lap.physics).toBeDefined();
    expect(lap.physics!.stats.acceleration).toBeCloseTo(STOCK_PHYSICAL_STATS.acceleration + 15, 9);
    const summed = lap.physics!.phases.reduce((sum, phase) => sum + phase.seconds, 0);
    const expectedPhysicsSeconds = simulateLapPhysics(lap.physics!.stats, track.segments).totalSeconds;
    expect(summed).toBeCloseTo(expectedPhysicsSeconds, 9);
  });

  it("still reports a real, non-empty phase breakdown for a build with zero physics-stat items", () => {
    const track = generateTrack(4, 1);
    const lap = simulatePlayerLaps(emptyBuild(), LAP_COUNT, track)[0];

    expect(lap.physics).toBeDefined();
    expect(lap.physics!.stats).toEqual(STOCK_PHYSICAL_STATS);
    expect(lap.physics!.phases.length).toBeGreaterThan(0);
  });

  it("omits physics entirely when no track is supplied", () => {
    const lap = simulatePlayerLaps(emptyBuild())[0];
    expect(lap.physics).toBeUndefined();
  });
});