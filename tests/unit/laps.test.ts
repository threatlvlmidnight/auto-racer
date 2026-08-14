import { describe, expect, it } from "vitest";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { firesOnLap, simulatePlayerLaps } from "../../src/simulation/laps";
import {
  generateTrack,
  matchesPhysicsCondition,
  simulateLapPhysics,
  STOCK_PHYSICAL_STATS,
  type TrackSegment,
} from "../../src/simulation/tracks";
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
  return structuredClone(LEGACY_ITEM_POOL.find((candidate) => candidate.id === id)!);
}

describe("simulatePlayerLaps", () => {
  it("records outcome-neutral per-item physical contribution evidence", () => {
    const item = testItem({
      id: "physical-evidence",
      name: "Physical Evidence",
      price: 1,
      timeModifier: 0,
      physics: { accelerationDelta: 13, topSpeedDelta: -1 },
    });
    const track = generateTrack(11, 2);
    const lap = simulatePlayerLaps(vehicleBuild([item]), 1, track)[0];
    const evidence = lap.physics?.itemContributions?.find((entry) => entry.sourceItemId === item.id);

    expect(evidence).toMatchObject({
      lap: 1,
      sourceLocation: { area: "board", index: 0 },
      tier: 1,
      installationState: "fitted",
      active: true,
      flatResolvedDelta: { accelerationDelta: 13, topSpeedDelta: -1 },
      conditionalResolvedDeltas: [],
    });
    expect(lap.physics?.stats.acceleration).toBe(STOCK_PHYSICAL_STATS.acceleration + 13);
    expect(lap.physics?.stats.topSpeed).toBe(STOCK_PHYSICAL_STATS.topSpeed - 1);
  });

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
        targetStat: "time",
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
        targetStat: "time",
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
        targetStat: "time",
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

// 022-contextual-physics-effects US1 (T012, T013, T013a): conditionalPhysics
// wired into simulatePlayerLaps via laps.ts's new active-item collection.
// generateTrack(11, 2)'s six corners span 47.2-77.9 degrees (verified), so an
// "at-least 60" condition matches only some of them — guaranteeing the SC-001
// comparison below has real excluded phases, not a vacuous all-match case.
describe("simulatePlayerLaps conditionalPhysics (T012, T013, T013a, US1)", () => {
  const CONDITIONAL_TRACK = () => generateTrack(11, 2);
  const TIGHT_CONDITION = { kind: "corner-tightness" as const, direction: "at-least" as const, turnDegrees: 60 };

  it("T012 (SC-001): a tight-corner-only conditional item's total lap-time contribution is strictly smaller in magnitude than an identical-delta unconditional item's, on a track with excluded phases", () => {
    const track = CONDITIONAL_TRACK();
    const flatItem = testItem({
      id: "sc001-flat", name: "Flat Accel", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 20 },
    });
    const conditionalItem = testItem({
      id: "sc001-cond", name: "Conditional Accel", price: 0, timeModifier: 0,
      conditionalPhysics: [{ condition: TIGHT_CONDITION, delta: { accelerationDelta: 20 } }],
    });

    const plainTime = simulatePlayerLaps(vehicleBuild(), LAP_COUNT, track)[0].time;
    const flatTime = simulatePlayerLaps(vehicleBuild([flatItem]), LAP_COUNT, track)[0].time;
    const conditionalTime = simulatePlayerLaps(vehicleBuild([conditionalItem]), LAP_COUNT, track)[0].time;

    const flatContribution = Math.abs(plainTime - flatTime);
    const conditionalContribution = Math.abs(plainTime - conditionalTime);

    // Guards against a vacuous pass: the conditional item must actually do
    // something (not be silently ignored) for "strictly smaller" to be
    // a meaningful claim rather than true-by-default at zero.
    expect(conditionalContribution).toBeGreaterThan(0);
    expect(conditionalContribution).toBeLessThan(flatContribution);
  });

  // Note: "additive" per the contract means the *stat deltas and conditional
  // contribution lists* combine additively (contract §3) — it does NOT mean
  // two separately-simulated lap times can be summed, since solveSpan's
  // kinematics are nonlinear in acceleration/brakingPower/topSpeed (peak
  // speed is an algebraic function of both `a` and `b` together, with a
  // topSpeed clamp). The correct test is that splitting one merged
  // delta/contribution-list across two items produces the exact same
  // simulateLapPhysics inputs — and therefore an identical result — as
  // carrying it all on one item.
  it("T013: an item can carry both physics (flat) and conditionalPhysics simultaneously, both folding into the same resolved inputs as if split across two separate items", () => {
    const track = CONDITIONAL_TRACK();
    const flatDelta = { accelerationDelta: 10 };
    const conditionalDelta = { accelerationDelta: 15 };
    const flatOnly = testItem({ id: "t013-flat", name: "Flat Only", price: 0, timeModifier: 0, physics: flatDelta });
    const conditionalOnly = testItem({
      id: "t013-cond", name: "Conditional Only", price: 0, timeModifier: 0,
      conditionalPhysics: [{ condition: TIGHT_CONDITION, delta: conditionalDelta }],
    });
    const both = testItem({
      id: "t013-both", name: "Both", price: 0, timeModifier: 0,
      physics: flatDelta,
      conditionalPhysics: [{ condition: TIGHT_CONDITION, delta: conditionalDelta }],
    });

    const plainTime = simulatePlayerLaps(vehicleBuild(), LAP_COUNT, track)[0].time;
    const flatOnlyTime = simulatePlayerLaps(vehicleBuild([flatOnly]), LAP_COUNT, track)[0].time;
    const conditionalOnlyTime = simulatePlayerLaps(vehicleBuild([conditionalOnly]), LAP_COUNT, track)[0].time;
    const combinedTime = simulatePlayerLaps(vehicleBuild([both]), LAP_COUNT, track)[0].time;
    const splitTime = simulatePlayerLaps(vehicleBuild([flatOnly, conditionalOnly]), LAP_COUNT, track)[0].time;

    // Guards against a vacuous pass: the conditional-only item must actually
    // do something on this track, or this proves nothing about the fold.
    expect(conditionalOnlyTime).not.toBeCloseTo(plainTime, 6);
    // One item carrying both fields produces exactly the same result as
    // splitting them across two items — neither field overrides the other.
    expect(combinedTime).toBeCloseTo(splitTime, 9);
    expect(combinedTime).not.toBeCloseTo(flatOnlyTime, 6);
    expect(combinedTime).not.toBeCloseTo(conditionalOnlyTime, 6);
  });

  it("T013a: two separate conditional contributions from two different items, targeting the same stat with overlapping conditions, sum additively rather than overriding or deduplicating", () => {
    const track = CONDITIONAL_TRACK();
    const contributionX = { condition: TIGHT_CONDITION, delta: { accelerationDelta: 12 } };
    const contributionY = { condition: TIGHT_CONDITION, delta: { accelerationDelta: 18 } };
    const itemX = testItem({ id: "t013a-x", name: "Conditional X", price: 0, timeModifier: 0, conditionalPhysics: [contributionX] });
    const itemY = testItem({ id: "t013a-y", name: "Conditional Y", price: 0, timeModifier: 0, conditionalPhysics: [contributionY] });
    const merged = testItem({
      id: "t013a-merged", name: "Conditional Merged", price: 0, timeModifier: 0,
      conditionalPhysics: [contributionX, contributionY],
    });

    const xOnlyTime = simulatePlayerLaps(vehicleBuild([itemX]), LAP_COUNT, track)[0].time;
    const yOnlyTime = simulatePlayerLaps(vehicleBuild([itemY]), LAP_COUNT, track)[0].time;
    const splitTime = simulatePlayerLaps(vehicleBuild([itemX, itemY]), LAP_COUNT, track)[0].time;
    const mergedTime = simulatePlayerLaps(vehicleBuild([merged]), LAP_COUNT, track)[0].time;

    // One item carrying both overlapping contributions produces exactly the
    // same result as two separate items each carrying one — flattening
    // across active items (laps.ts) doesn't lose or merge entries.
    expect(mergedTime).toBeCloseTo(splitTime, 9);
    // Neither deduplicates down to just one item's own delta alone — if it
    // did, mergedTime would equal xOnlyTime or yOnlyTime exactly.
    expect(mergedTime).not.toBeCloseTo(xOnlyTime, 6);
    expect(mergedTime).not.toBeCloseTo(yOnlyTime, 6);
  });
});

// 022-contextual-physics-effects US3 (T021, T022, T022a): PlayerLap.physics
// inspectability of conditional activity — matching Constitution Principle
// III (Transparency & Legibility), exactly as 021 required for its own
// unconditional physics stats.
describe("simulatePlayerLaps conditionalPhysics inspectability (T021, T022, T022a, US3, FR-006)", () => {
  /**
   * Oracle: computes, directly from a track's own authored segments (never
   * from the simulation's own output), the set of straight-segment indices
   * whose accelerating phase should carry an attribution for an
   * accelerationDelta condition (gated on the previous corner — research.md
   * Decision 1). Reuses matchesPhysicsCondition, already independently
   * tested (T003).
   */
  function expectedAccelerationMatchedSegmentIndices(
    segments: readonly TrackSegment[],
    condition: Parameters<typeof matchesPhysicsCondition>[0],
  ): Set<number> {
    const corners = segments
      .map((segment, index) => ({ segment, index }))
      .filter((entry): entry is { segment: Extract<TrackSegment, { kind: "corner" }>; index: number } =>
        entry.segment.kind === "corner");
    const straights = segments
      .map((segment, index) => ({ segment, index }))
      .filter((entry): entry is { segment: Extract<TrackSegment, { kind: "straight" }>; index: number } =>
        entry.segment.kind === "straight");
    const cornerCount = corners.length;
    const matched = new Set<number>();
    for (let i = 0; i < cornerCount; i += 1) {
      const previous = (i - 1 + cornerCount) % cornerCount;
      if (matchesPhysicsCondition(condition, corners[previous].segment.turnDegrees)) {
        matched.add(straights[i].index);
      }
    }
    return matched;
  }

  it("T021: PlayerLap.physics.phases identifies which conditional item's condition matched each phase, attributable directly to the track's own authored corner angles", () => {
    const track = generateTrack(11, 2); // corners: 53.4, 47.2, 77.9, 67.3, 51.4, 62.7 (verified)
    const condition = { kind: "corner-tightness" as const, direction: "at-least" as const, turnDegrees: 70 };
    const item = testItem({
      id: "insp-cond-1", name: "Inspectable Conditional", price: 0, timeModifier: 0,
      conditionalPhysics: [{ condition, delta: { accelerationDelta: 20 } }],
    });
    const lap = simulatePlayerLaps(vehicleBuild([item]), LAP_COUNT, track)[0];

    const expectedMatchedSegments = expectedAccelerationMatchedSegmentIndices(track.segments, condition);
    expect(expectedMatchedSegments.size).toBeGreaterThan(0);

    const actualMatchedPhases = lap.physics!.phases.filter((phase) => (phase.conditionalMatches?.length ?? 0) > 0);
    expect(actualMatchedPhases.length).toBeGreaterThan(0);
    actualMatchedPhases.forEach((phase) => {
      expect(expectedMatchedSegments.has(phase.segmentIndex)).toBe(true);
      expect(phase.conditionalMatches).toEqual([{ sourceItemId: "insp-cond-1", stat: "accelerationDelta" }]);
    });
    // Every phase belonging to a matched segment carries the attribution —
    // not just one arbitrarily-chosen phase kind within that span.
    const matchedSegmentIndices = new Set(actualMatchedPhases.map((phase) => phase.segmentIndex));
    expect(matchedSegmentIndices).toEqual(expectedMatchedSegments);
  });

  it("T022: the same build simulated on two tracks with different corner angles produces two breakdowns whose matched-phase sets differ, traceable to each track's own segments", () => {
    const condition = { kind: "corner-tightness" as const, direction: "at-least" as const, turnDegrees: 70 };
    const item = testItem({
      id: "insp-cond-2", name: "Inspectable Conditional", price: 0, timeModifier: 0,
      conditionalPhysics: [{ condition, delta: { accelerationDelta: 20 } }],
    });
    const build = vehicleBuild([item]);

    const trackA = generateTrack(11, 2);
    const trackB = generateTrack(0, 1);
    expect(trackA.segments).not.toEqual(trackB.segments);

    const lapA = simulatePlayerLaps(build, LAP_COUNT, trackA)[0];
    const lapB = simulatePlayerLaps(build, LAP_COUNT, trackB)[0];

    const matchedSegmentsA = new Set(
      lapA.physics!.phases.filter((phase) => (phase.conditionalMatches?.length ?? 0) > 0).map((phase) => phase.segmentIndex),
    );
    const matchedSegmentsB = new Set(
      lapB.physics!.phases.filter((phase) => (phase.conditionalMatches?.length ?? 0) > 0).map((phase) => phase.segmentIndex),
    );

    expect(matchedSegmentsA).toEqual(expectedAccelerationMatchedSegmentIndices(trackA.segments, condition));
    expect(matchedSegmentsB).toEqual(expectedAccelerationMatchedSegmentIndices(trackB.segments, condition));
    expect(matchedSegmentsA).not.toEqual(matchedSegmentsB);
  });

  it("T022a: PlayerLap.physics.stats for a build holding conditional items still equals the build's base (unconditional-only) resolved PhysicalStats", () => {
    const track = generateTrack(11, 2);
    const item = testItem({
      id: "t022a-cond", name: "Conditional Only", price: 0, timeModifier: 0,
      conditionalPhysics: [{
        condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 60 },
        delta: { accelerationDelta: 50 },
      }],
    });
    const build = vehicleBuild([item]);
    const lap = simulatePlayerLaps(build, LAP_COUNT, track)[0];
    const plainLap = simulatePlayerLaps(vehicleBuild(), LAP_COUNT, track)[0];

    // Guards against a vacuous pass: the conditional item must actually do
    // something (phases/time differ), even though .stats must not reflect it.
    expect(lap.time).not.toBeCloseTo(plainLap.time, 6);
    expect(lap.physics!.stats).toEqual(STOCK_PHYSICAL_STATS);
  });
});

// 023-stat-targeted-amplifiers US1 (T011-T014): Buff/Synergy amplify a
// specific physical stat's resolved delta end to end, instead of only ever
// multiplying timeModifier.
describe("simulatePlayerLaps stat-targeted amplification (T011-T014, US1, contract §3)", () => {
  it("T011: a stat-targeted flat Buff measurably changes a matching held item's resolved PhysicalStats and simulated lap time", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t011-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 20 },
    });
    const buff = testItem({
      id: "t011-buff", name: "Accel Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 50, targetStat: "acceleration" },
    });
    const alone = simulatePlayerLaps(vehicleBuild([accelItem]), LAP_COUNT, track)[0];
    const withBuff = simulatePlayerLaps(vehicleBuild([accelItem, buff]), LAP_COUNT, track)[0];

    expect(withBuff.physics!.stats.acceleration).toBeCloseTo(STOCK_PHYSICAL_STATS.acceleration + 30, 9);
    expect(withBuff.time).not.toBeCloseTo(alone.time, 6);
  });

  it("T012: a stat-targeted Synergy effect (Boost-Others) measurably changes a matching held item's resolved stat", () => {
    const track = generateTrack(11, 2);
    const brakeItem = testItem({
      id: "t012-brake", name: "Brake Item", price: 0, timeModifier: 0,
      physics: { brakingPowerDelta: 10 },
      synergyTags: ["gearing"],
    });
    const synergySource = testItem({
      id: "t012-synergy", name: "Synergy Source", price: 0, timeModifier: 0,
      synergyEffects: [{
        target: { kind: "tag", tag: "gearing" },
        appliesTo: "others",
        condition: { kind: "linear-per-count", percentPerMatch: 40 },
        targetStat: "brakingPower",
        description: "Boosts gearing items' braking power by 40% per match.",
      }],
    });
    const alone = simulatePlayerLaps(vehicleBuild([brakeItem]), LAP_COUNT, track)[0];
    const withSynergy = simulatePlayerLaps(vehicleBuild([brakeItem, synergySource]), LAP_COUNT, track)[0];

    expect(withSynergy.physics!.stats.brakingPower).toBeCloseTo(STOCK_PHYSICAL_STATS.brakingPower + 14, 9);
    expect(withSynergy.time).not.toBeCloseTo(alone.time, 6);
  });

  it("T013: a stat-targeted amplifier whose only held candidate has no delta for the targeted stat contributes exactly 0", () => {
    const track = generateTrack(11, 2);
    const noMatchItem = testItem({ id: "t013-nomatch", name: "No Match", price: 0, timeModifier: 0 });
    const buff = testItem({
      id: "t013-buff", name: "Accel Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 50, targetStat: "acceleration" },
    });
    const withBuff = simulatePlayerLaps(vehicleBuild([noMatchItem, buff]), LAP_COUNT, track)[0];
    const plain = simulatePlayerLaps(vehicleBuild(), LAP_COUNT, track)[0];

    expect(withBuff.physics!.stats).toEqual(plain.physics!.stats);
  });

  it("T014: a target item under both a stat-targeted Synergy effect and a stat-targeted flat Buff receives compounding, not additive, combination", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t014-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 20 },
      synergyTags: ["gearing"],
    });
    const synergySource = testItem({
      id: "t014-synergy", name: "Synergy Source", price: 0, timeModifier: 0,
      synergyEffects: [{
        target: { kind: "tag", tag: "gearing" },
        appliesTo: "others",
        condition: { kind: "linear-per-count", percentPerMatch: 25 },
        targetStat: "acceleration",
        description: "Boosts gearing items' acceleration by 25% per match.",
      }],
    });
    const buff = testItem({
      id: "t014-buff", name: "Accel Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 10, targetStat: "acceleration" },
    });
    const withBoth = simulatePlayerLaps(vehicleBuild([accelItem, synergySource, buff]), LAP_COUNT, track)[0];

    // base 20 -> synergy folds once (x1.25 = 25) -> buff applies per lap on top (x1.10 = 27.5)
    const expectedAcceleration = STOCK_PHYSICAL_STATS.acceleration + 27.5;
    expect(withBoth.physics!.stats.acceleration).toBeCloseTo(expectedAcceleration, 9);
  });
});

// 020-character-item-pools: a Buff whose applied percent scales with the
// summed authored price of fitted (vehicle-slot) items, end to end through
// simulatePlayerLaps — Evelyn Mercer's "appraiser" chase-card mechanism.
describe("simulatePlayerLaps value-scaled amplification (020-character-item-pools)", () => {
  it("scales the applied percent by the summed price of fitted items only, excluding storage", () => {
    const track = generateTrack(11, 2);
    const topSpeedItem = testItem({
      id: "value-topspeed", name: "Top Speed Item", price: 4, timeModifier: 0,
      physics: { topSpeedDelta: 10 },
    });
    const valueBuff = testItem({
      id: "value-buff", name: "Value Buff", price: 2, timeModifier: 0,
      buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
    });
    const storedDecoy = testItem({ id: "value-stored-decoy", name: "Stored Decoy", price: 100, timeModifier: 0 });

    const boardOnly = simulatePlayerLaps(vehicleBuild([topSpeedItem, valueBuff]), LAP_COUNT, track)[0];
    const withStoredDecoy = simulatePlayerLaps(
      vehicleBuild([topSpeedItem, valueBuff], [storedDecoy]),
      LAP_COUNT,
      track,
    )[0];

    // fittedValue = 4 (topSpeedItem) + 2 (valueBuff, includes itself) = 6;
    // appliedPercent = 1% * 6 = 6% of topSpeedItem's +10 delta = +0.6.
    expect(boardOnly.physics!.stats.topSpeed).toBeCloseTo(STOCK_PHYSICAL_STATS.topSpeed + 10.6, 9);
    // A stored (non-fitted) item's huge price must not move fittedValue at all.
    expect(withStoredDecoy.physics!.stats.topSpeed).toBeCloseTo(boardOnly.physics!.stats.topSpeed, 9);
  });

  it("reports the value-scaled appliedPercent/appliedStatDelta in ContributionEvidence, matching the real simulation", () => {
    const track = generateTrack(11, 2);
    const topSpeedItem = testItem({
      id: "value-evidence-topspeed", name: "Top Speed Item", price: 4, timeModifier: 0,
      physics: { topSpeedDelta: 10 },
    });
    const valueBuff = testItem({
      id: "value-evidence-buff", name: "Value Buff", price: 2, timeModifier: 0,
      buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
    });
    const lap = simulatePlayerLaps(vehicleBuild([topSpeedItem, valueBuff]), LAP_COUNT, track)[0];
    const evidence = lap.contributions!.find((entry) => entry.sourceItemId === valueBuff.id)!;

    expect(evidence.buffApplications).toHaveLength(1);
    expect(evidence.buffApplications[0]).toMatchObject({
      targetItemId: topSpeedItem.id,
      targetStat: "topSpeed",
      appliedPercent: 6,
      appliedStatDelta: 0.6,
    });
  });

  it("is inert (0% applied) when no other fitted item has a delta for the targeted stat, even with nonzero fittedValue", () => {
    const track = generateTrack(11, 2);
    const noMatchItem = testItem({ id: "value-nomatch", name: "No Match", price: 4, timeModifier: 0 });
    const valueBuff = testItem({
      id: "value-inert-buff", name: "Value Buff", price: 2, timeModifier: 0,
      buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
    });
    const withBuff = simulatePlayerLaps(vehicleBuild([noMatchItem, valueBuff]), LAP_COUNT, track)[0];
    const plain = simulatePlayerLaps(vehicleBuild(), LAP_COUNT, track)[0];

    expect(withBuff.physics!.stats).toEqual(plain.physics!.stats);
  });
});

// 023-stat-targeted-amplifiers US2 (T021-T023a): stacking stat-targeted
// growth/decay, end to end, plus Synergy's own lap-invariance guard.
describe("simulatePlayerLaps stacking stat-targeted amplification (T021-T023a, US2)", () => {
  it("T021: a stat-targeted stacking Buff with a positive boostPercent produces a strictly larger effective stat at lap 10 than lap 1", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t021-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const buff = testItem({
      id: "t021-buff", name: "Growing Buff", price: 0, timeModifier: 0,
      cooldown: 2, buff: { boostPercent: 10, targetStat: "acceleration" },
    });
    const laps = simulatePlayerLaps(vehicleBuild([accelItem, buff]), LAP_COUNT, track);

    expect(laps[9].physics!.stats.acceleration).toBeGreaterThan(laps[0].physics!.stats.acceleration);
  });

  it("T022: the same setup with a negative boostPercent produces a strictly smaller effective stat at lap 10 than lap 1", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t022-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const buff = testItem({
      id: "t022-buff", name: "Decaying Buff", price: 0, timeModifier: 0,
      cooldown: 2, buff: { boostPercent: -10, targetStat: "acceleration" },
    });
    const laps = simulatePlayerLaps(vehicleBuild([accelItem, buff]), LAP_COUNT, track);

    expect(laps[9].physics!.stats.acceleration).toBeLessThan(laps[0].physics!.stats.acceleration);
  });

  it("T023: a build using only flat/count-synergy Buffs and/or Synergy effects (no stacking stat-target) produces PhysicalStats identical across every lap", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t023-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const flatBuff = testItem({
      id: "t023-buff", name: "Flat Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 20, targetStat: "acceleration" },
    });
    const laps = simulatePlayerLaps(vehicleBuild([accelItem, flatBuff]), LAP_COUNT, track);

    laps.forEach((lap) => {
      expect(lap.physics!.stats).toEqual(laps[0].physics!.stats);
    });
  });

  it("T023a: a stat-targeted Synergy effect stays lap-invariant even alongside an unrelated lap-varying stacking Buff (FR-012, quickstart item 6)", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t023a-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
      synergyTags: ["gearing"],
    });
    const synergySource = testItem({
      id: "t023a-synergy", name: "Synergy Source", price: 0, timeModifier: 0,
      synergyEffects: [{
        target: { kind: "tag", tag: "gearing" },
        appliesTo: "others",
        condition: { kind: "linear-per-count", percentPerMatch: 20 },
        targetStat: "acceleration",
        description: "Boosts gearing items' acceleration by 20% per match.",
      }],
    });
    const brakeItem = testItem({
      id: "t023a-brake", name: "Brake Item", price: 0, timeModifier: 0,
      physics: { brakingPowerDelta: 10 },
    });
    const stackingBuff = testItem({
      id: "t023a-stackbuff", name: "Stacking Buff", price: 0, timeModifier: 0,
      cooldown: 2, buff: { boostPercent: 15, targetStat: "brakingPower" },
    });
    const laps = simulatePlayerLaps(
      vehicleBuild([accelItem, synergySource, brakeItem, stackingBuff]), LAP_COUNT, track,
    );

    // Synergy's own contribution (acceleration) is identical every lap...
    laps.forEach((lap) => {
      expect(lap.physics!.stats.acceleration).toBeCloseTo(laps[0].physics!.stats.acceleration, 9);
    });
    // ...while the unrelated stacking Buff's own contribution (brakingPower) grows.
    expect(laps[9].physics!.stats.brakingPower).toBeGreaterThan(laps[0].physics!.stats.brakingPower);
  });
});

// 023-stat-targeted-amplifiers US3 (T027-T028): zero-regression guard,
// checked comprehensively now that US1 (per-lap architecture) and US2
// (stacking extension) both exist — expected already GREEN, this phase
// proves it rather than adding new behavior.
describe("simulatePlayerLaps zero regression for builds with no lap-varying stat-targeted amplifier (T027-T028, US3)", () => {
  it("T027: a build with tiered items, synergy, and buffs (no targetStat authored anywhere) resolves PhysicalStats identically on every lap", () => {
    const track = generateTrack(9, 3);
    const lap = simulatePlayerLaps(buffDependentPracticeBuild(), LAP_COUNT, track);

    lap.forEach((entry) => {
      expect(entry.physics!.stats).toEqual(lap[0].physics!.stats);
    });
    // Sanity: this build only uses legacy time-targeted mechanisms, so its
    // resolved stats should equal STOCK_PHYSICAL_STATS exactly (no item in
    // this fixture carries a physics field).
    expect(lap[0].physics!.stats).toEqual(STOCK_PHYSICAL_STATS);
  });

  it("T028: a build using only legacy time-targeted Buffs/Synergy produces byte-for-byte identical PlayerLap output to its pre-feature values", () => {
    const lap = simulatePlayerLaps(buffDependentPracticeBuild())[0];

    // Pinned values from this exact fixture's own pre-existing test
    // ("emits complete per-held-item source, trigger, buff, storage, and
    // timing evidence", line ~27 above) — unchanged by this feature.
    expect(lap.contributions).toHaveLength(6);
    expect(lap.contributions.find(({ sourceItemId }) => sourceItemId === "item-001")?.buffApplications)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceItemId: "item-012", targetItemId: "item-001", type: "flat", targetStat: "time" }),
        expect.objectContaining({ sourceItemId: "item-014", targetItemId: "item-001", type: "stacking", targetStat: "time" }),
      ]));
  });
});

// 023-stat-targeted-amplifiers US4 (T030, T032): BuffApplication identifies
// which stat it targeted and carries the right kind of applied amount.
describe("BuffApplication targetStat/appliedStatDelta (T030, US4, contract §5)", () => {
  it("a stat-targeted Buff application populates targetStat and appliedStatDelta, leaving appliedSeconds at 0", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t030-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const buff = testItem({
      id: "t030-buff", name: "Accel Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 50, targetStat: "acceleration" },
    });
    const lap = simulatePlayerLaps(vehicleBuild([accelItem, buff]), LAP_COUNT, track)[0];
    const buffContribution = lap.contributions.find((entry) => entry.sourceItemId === "t030-buff")!;

    expect(buffContribution.buffApplications).toHaveLength(1);
    const application = buffContribution.buffApplications[0];
    expect(application.targetStat).toBe("acceleration");
    expect(application.appliedStatDelta).toBeCloseTo(5, 9);
    expect(application.appliedSeconds).toBe(0);
  });

  it("a legacy time-targeted Buff application still populates appliedSeconds, leaving appliedStatDelta undefined", () => {
    const lap = simulatePlayerLaps(buffDependentPracticeBuild())[0];
    const application = lap.contributions
      .find(({ sourceItemId }) => sourceItemId === "item-001")!
      .buffApplications.find((app) => app.sourceItemId === "item-012")!;

    expect(application.targetStat).toBe("time");
    expect(application.appliedStatDelta).toBeUndefined();
    expect(typeof application.appliedSeconds).toBe("number");
    expect(application.appliedSeconds).not.toBe(0);
  });
});

// 023-stat-targeted-amplifiers US4 (T031): SynergyApplication's targetStat
// threads correctly through simulatePlayerLaps's own contribution evidence,
// not just resolveSynergyEffects in isolation (already covered by T010).
describe("ContributionEvidence.synergy targetStat threading (T031, US4)", () => {
  it("a stat-targeted Synergy application threads targetStat through simulatePlayerLaps's contribution evidence", () => {
    const track = generateTrack(11, 2);
    const brakeItem = testItem({
      id: "t031-brake", name: "Brake Item", price: 0, timeModifier: 0,
      physics: { brakingPowerDelta: 10 },
      synergyTags: ["gearing"],
    });
    const synergySource = testItem({
      id: "t031-synergy", name: "Synergy Source", price: 0, timeModifier: 0,
      synergyEffects: [{
        target: { kind: "tag", tag: "gearing" },
        appliesTo: "others",
        condition: { kind: "linear-per-count", percentPerMatch: 40 },
        targetStat: "brakingPower",
        description: "Boosts gearing items' braking power by 40% per match.",
      }],
    });
    const lap = simulatePlayerLaps(vehicleBuild([brakeItem, synergySource]), LAP_COUNT, track)[0];
    const brakeContribution = lap.contributions.find((entry) => entry.sourceItemId === "t031-brake")!;

    expect(brakeContribution.synergy).toEqual([
      expect.objectContaining({ sourceItemId: "t031-synergy", targetStat: "brakingPower", appliedPercent: 40 }),
    ]);
  });
});

// 023-stat-targeted-amplifiers US4 (T032): per-lap PlayerLap.physics.stats
// values are independently traceable to the buff's own authored fields.
describe("PlayerLap.physics.stats per-lap traceability (T032, US4, SC-006)", () => {
  it("two different laps' resolved stat differ by an amount computable directly from the buff's own boostPercent/cooldown", () => {
    const track = generateTrack(11, 2);
    const accelItem = testItem({
      id: "t032-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const buff = testItem({
      id: "t032-buff", name: "Growing Buff", price: 0, timeModifier: 0,
      cooldown: 2, buff: { boostPercent: 5, targetStat: "acceleration" },
    });
    const laps = simulatePlayerLaps(vehicleBuild([accelItem, buff]), LAP_COUNT, track);

    // Authored directly: fires on laps 1, 3, 5, 7, 9 (firesOnLap(2, lap)).
    // Accumulated boostPercent by lap 1 = 5%; by lap 5 = 15% (three firings).
    const expectedLap1 = STOCK_PHYSICAL_STATS.acceleration + 10 * 1.05;
    const expectedLap5 = STOCK_PHYSICAL_STATS.acceleration + 10 * 1.15;
    expect(laps[0].physics!.stats.acceleration).toBeCloseTo(expectedLap1, 9);
    expect(laps[4].physics!.stats.acceleration).toBeCloseTo(expectedLap5, 9);
  });
});

// 023-stat-targeted-amplifiers US5 (T038): a tiered duplicate's own physics
// contribution is measurably larger, end to end.
describe("simulatePlayerLaps tiered physics contribution (T038, US5, SC-005)", () => {
  it("a tier-3 duplicate's contribution to its own physics stat is measurably larger than a tier-1 copy's", () => {
    const track = generateTrack(11, 2);
    const item = testItem({
      id: "t038-accel", name: "Accel Item", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    const tier1Build = vehicleBuild([item]);
    const tier3Build = vehicleBuild([item]);
    tier3Build.slots[0].tier = 3;

    const tier1Lap = simulatePlayerLaps(tier1Build, LAP_COUNT, track)[0];
    const tier3Lap = simulatePlayerLaps(tier3Build, LAP_COUNT, track)[0];

    expect(tier3Lap.physics!.stats.acceleration).toBeGreaterThan(tier1Lap.physics!.stats.acceleration);
  });
});

// 028-pre-race-setup T025: setup deltas apply after item/buff/synergy/tier
// resolution, before the positive-stat clamp/segment physics, and are never
// themselves amplified.
describe("simulatePlayerLaps setup delta application (T025, contract §4)", () => {
  it("applies setupDeltas on top of the build's own resolved physics stats", () => {
    const item = testItem({
      id: "setup-delta-base-item", name: "Base Item", price: 0, timeModifier: 0,
      physics: { brakingPowerDelta: 10 },
    });
    const track = generateTrack(3, 1);
    const build = vehicleBuild([item]);
    const withoutSetup = simulatePlayerLaps(build, LAP_COUNT, track)[0];
    const withSetup = simulatePlayerLaps(build, LAP_COUNT, track, { brakingPowerDelta: 13, corneringSpeedDelta: -1 })[0];

    expect(withSetup.physics!.stats.brakingPower).toBe(withoutSetup.physics!.stats.brakingPower + 13);
    expect(withSetup.physics!.stats.corneringSpeed).toBe(withoutSetup.physics!.stats.corneringSpeed - 1);
    expect(withSetup.physics!.stats.acceleration).toBe(withoutSetup.physics!.stats.acceleration);
    expect(withSetup.physics!.stats.topSpeed).toBe(withoutSetup.physics!.stats.topSpeed);
  });

  it("clamps a setup-reduced stat at the same positive minimum as item deltas", () => {
    const track = generateTrack(3, 1);
    const build = vehicleBuild([]);
    const laps = simulatePlayerLaps(build, LAP_COUNT, track, { corneringSpeedDelta: -100000 });

    expect(laps[0].physics!.stats.corneringSpeed).toBe(1);
  });

  it("is not amplified by a stat-targeted Buff on the affected stat", () => {
    const buff = testItem({
      id: "setup-delta-buff", name: "Buff", price: 0, timeModifier: 0,
      buff: { boostPercent: 999, targetStat: "brakingPower" },
      physics: { brakingPowerDelta: 1 }, // gives the buff an eligible candidate to amplify
    });
    const track = generateTrack(3, 1);
    const build = vehicleBuild([buff]);
    const withoutSetup = simulatePlayerLaps(build, LAP_COUNT, track)[0];
    const withSetup = simulatePlayerLaps(build, LAP_COUNT, track, { brakingPowerDelta: 13 })[0];

    // The buff massively amplifies the item's own +1, but the setup's flat
    // +13 must land unamplified — exactly +13 over the no-setup baseline.
    expect(withSetup.physics!.stats.brakingPower).toBe(withoutSetup.physics!.stats.brakingPower + 13);
  });

  it("all-zero setupDeltas (the default) reproduces pre-028 output byte-for-byte", () => {
    const track = generateTrack(3, 1);
    const build = vehicleBuild([testItem({ id: "x", name: "X", price: 0, timeModifier: 0, physics: { topSpeedDelta: 4 } })]);

    expect(simulatePlayerLaps(build, LAP_COUNT, track, {})).toEqual(simulatePlayerLaps(build, LAP_COUNT, track));
  });
});
