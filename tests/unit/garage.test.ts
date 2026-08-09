import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import {
  commitGarageCommand,
  previewGarageCommand,
  type GarageCommand,
  type GarageContext,
} from "../../src/simulation/garage";
import { installedItems, resolveInstallation, storedItems } from "../../src/simulation/slots";
import type { ItemDefinition, SlotType, VehicleBuild } from "../../src/simulation/types";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

// The Highwheel: power / chassis / chassis / flex
const SLOT = ["the-highwheel-slot-1", "the-highwheel-slot-2", "the-highwheel-slot-3", "the-highwheel-slot-4"] as const;

const POWER_ITEM = testItem({
  id: "power-item", name: "Power Item", price: 3, timeModifier: -1,
  installationCategory: "power",
  fittedBehavior: { kind: "time-modifier", timeModifier: -0.5, description: "Fitted: extra 0.50s." },
  improvisedBehavior: { kind: "time-modifier", timeModifier: 0.4, description: "Improvised: 0.40s lost." },
});
const CHASSIS_ITEM = testItem({
  id: "chassis-item", name: "Chassis Item", price: 3, timeModifier: -2,
  installationCategory: "chassis",
  fittedBehavior: { kind: "time-modifier", timeModifier: -0.3, description: "Fitted: extra 0.30s." },
  improvisedBehavior: { kind: "none", description: "Improvised: no additional consequence." },
});
const OTHER_ITEM = testItem({ id: "other-item", name: "Other Item", price: 2, timeModifier: -0.5 });

function context(build: VehicleBuild, offers: { id: string; item: ItemDefinition }[] = []): GarageContext {
  return { build, offers };
}

const offerContext = (build: VehicleBuild) => context(build, [
  { id: "offer-a", item: POWER_ITEM },
  { id: "offer-b", item: CHASSIS_ITEM },
]);

function command(
  source: GarageCommand["source"],
  destination: GarageCommand["destination"],
  replacement: GarageCommand["replacement"] = "none",
): GarageCommand {
  return { source, destination, replacement };
}

describe("previewGarageCommand — placement from an offer", () => {
  it("previews placing an offer into an empty vehicle slot as `place`", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(preview.legal).toBe(true);
    expect(preview.disposition).toBe("place");
    expect(preview.requiresConfirmation).toBe(false);
    expect(preview.occupant).toBeNull();
    expect(preview.reason).toBeNull();
  });

  it("previews placing an offer into an empty storage position as `place`", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-a" }, { area: "storage", index: 1 }),
    );

    expect(preview.disposition).toBe("place");
    expect(preview.installation).toBeNull();
  });

  it("resolves Fitted when a Power item targets a Power slot", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(preview.installation?.state).toBe("fitted");
    expect(preview.installation?.appliedInstallationBehavior).toStrictEqual(POWER_ITEM.fittedBehavior);
  });

  it("resolves Improvised — still legal — when a Power item targets a Chassis slot", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[1] }),
    );

    expect(preview.legal).toBe(true);
    expect(preview.reason).toBeNull();
    expect(preview.installation?.state).toBe("improvised");
    expect(preview.installation?.lostFittedBehavior).toStrictEqual(POWER_ITEM.fittedBehavior);
  });

  it("resolves Flexible with no Fitted effect when any item targets a Flex slot", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-b" }, { area: "vehicle", slotId: SLOT[3] }),
    );

    expect(preview.installation?.state).toBe("flexible");
    expect(preview.installation?.appliedInstallationBehavior).toBeNull();
  });

  it("marks an explicit no-additional-consequence Improvised item without inventing a penalty", () => {
    const preview = previewGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-b" }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(preview.installation?.state).toBe("improvised");
    expect(preview.installation?.noAdditionalImprovisedConsequence).toBe(true);
    expect(preview.installation?.appliedInstallationBehavior).toBeNull();
  });
});

describe("previewGarageCommand — movement inside the garage", () => {
  it("previews an active-slot rearrangement into an empty slot as `move`", () => {
    const build = vehicleBuild([POWER_ITEM]);
    const preview = previewGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[2] }),
    );

    expect(preview.disposition).toBe("move");
    expect(preview.requiresConfirmation).toBe(false);
  });

  it("previews vehicle-to-storage and storage-to-vehicle moves", () => {
    const build = vehicleBuild([POWER_ITEM], [CHASSIS_ITEM]);

    expect(previewGarageCommand(context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "storage", index: 1 })).disposition).toBe("move");
    expect(previewGarageCommand(context(build),
      command({ area: "storage", index: 0 }, { area: "vehicle", slotId: SLOT[1] })).disposition).toBe("move");
  });

  it("previews an explicit swap between two occupied positions", () => {
    const build = vehicleBuild([POWER_ITEM, CHASSIS_ITEM]);
    const preview = previewGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[1] }, "swap"),
    );

    expect(preview.disposition).toBe("swap");
    expect(preview.occupant).toStrictEqual(CHASSIS_ITEM);
    // A swap keeps both items, so it is not irreversible.
    expect(preview.requiresConfirmation).toBe(false);
  });

  it("treats a source targeting its own position as a no-op", () => {
    const build = vehicleBuild([POWER_ITEM]);
    const preview = previewGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(preview.disposition).toBe("no-op");
    expect(preview.requiresConfirmation).toBe(false);
  });
});

describe("previewGarageCommand — irreversible displacement", () => {
  it("requires confirmation before an offer replaces an occupant", () => {
    const build = vehicleBuild([CHASSIS_ITEM]);
    const preview = previewGarageCommand(
      offerContext(build),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }, "evict"),
    );

    expect(preview.disposition).toBe("replace");
    expect(preview.requiresConfirmation).toBe(true);
    expect(preview.occupant).toStrictEqual(CHASSIS_ITEM);
  });

  it("requires confirmation before evicting a destination occupant during a move", () => {
    const build = vehicleBuild([POWER_ITEM, CHASSIS_ITEM]);
    const preview = previewGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[1] }, "evict"),
    );

    expect(preview.disposition).toBe("evict");
    expect(preview.requiresConfirmation).toBe(true);
  });

  it("refuses an occupied destination when no replacement intent was declared", () => {
    const build = vehicleBuild([POWER_ITEM, CHASSIS_ITEM]);
    const preview = previewGarageCommand(
      offerContext(build),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[1] }),
    );

    expect(preview.reason).toBe("requires-confirmation");
    // Category mismatch is never the reason a placement is refused.
    expect(preview.legal).toBe(true);
  });
});

describe("previewGarageCommand — typed failures", () => {
  it.each([
    ["missing source item", command({ area: "vehicle", slotId: SLOT[2] }, { area: "storage", index: 0 }), "missing-source"],
    ["stale offer", command({ area: "offer", offerId: "gone" }, { area: "storage", index: 0 }), "stale-offer"],
    ["unknown slot", command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: "nope" }), "unknown-slot"],
    ["invalid storage index", command({ area: "offer", offerId: "offer-a" }, { area: "storage", index: 9 }), "invalid-storage-index"],
    ["unknown source slot", command({ area: "vehicle", slotId: "nope" }, { area: "storage", index: 0 }), "unknown-slot"],
    ["invalid source storage index", command({ area: "storage", index: 7 }, { area: "vehicle", slotId: SLOT[0] }), "invalid-storage-index"],
  ] as const)("reports %s as a typed reason", (_label, cmd, code) => {
    const preview = previewGarageCommand(offerContext(vehicleBuild()), cmd as GarageCommand);
    expect(preview.reason).toBe(code);
  });
});

describe("commitGarageCommand — atomic, immutable transitions", () => {
  it("places an offered item and returns a new build without mutating inputs", () => {
    const build = vehicleBuild();
    const snapshot = structuredClone(build);
    const result = commitGarageCommand(
      offerContext(build),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.build).not.toBe(build);
    expect(build).toStrictEqual(snapshot);
    expect(result.build.slots[0].item).toStrictEqual(POWER_ITEM);
    expect(result.evicted).toBeNull();
  });

  it("preserves the authored slot id and type of every slot it touches", () => {
    const result = commitGarageCommand(
      offerContext(vehicleBuild()),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[1] }),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    result.build.slots.forEach((slot, index) => {
      expect(slot.slotId).toBe(SLOT[index]);
      expect(slot.slotType).toBe(vehicleBuild().slots[index].slotType);
    });
  });

  it("moves an item between vehicle and storage without duplicating or losing it", () => {
    const build = vehicleBuild([POWER_ITEM]);
    const result = commitGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "storage", index: 2 }),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    const ids = [...installedItems(result.build), ...storedItems(result.build)]
      .filter((item): item is ItemDefinition => item !== null)
      .map((item) => item.id);
    expect(ids).toEqual([POWER_ITEM.id]);
    expect(result.build.storage[2].item).toStrictEqual(POWER_ITEM);
  });

  it("swaps two occupied positions keeping both items", () => {
    const build = vehicleBuild([POWER_ITEM], [CHASSIS_ITEM]);
    const result = commitGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "storage", index: 0 }, "swap"),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.build.slots[0].item).toStrictEqual(CHASSIS_ITEM);
    expect(result.build.storage[0].item).toStrictEqual(POWER_ITEM);
    expect(result.evicted).toBeNull();
  });

  it("reports the evicted item when a confirmed replacement discards an occupant", () => {
    const build = vehicleBuild([CHASSIS_ITEM]);
    const result = commitGarageCommand(
      offerContext(build),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }, "evict"),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.build.slots[0].item).toStrictEqual(POWER_ITEM);
    expect(result.evicted).toStrictEqual(CHASSIS_ITEM);
  });

  it("refuses to commit an unconfirmed displacement and changes nothing", () => {
    const build = vehicleBuild([CHASSIS_ITEM]);
    const snapshot = structuredClone(build);
    const result = commitGarageCommand(
      offerContext(build),
      command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.code).toBe("requires-confirmation");
    expect(build).toStrictEqual(snapshot);
  });

  it.each([
    ["stale offer", command({ area: "offer", offerId: "gone" }, { area: "storage", index: 0 })],
    ["unknown slot", command({ area: "offer", offerId: "offer-a" }, { area: "vehicle", slotId: "nope" })],
    ["invalid storage index", command({ area: "offer", offerId: "offer-a" }, { area: "storage", index: 5 })],
  ] as const)("returns a typed failure for %s without throwing", (_label, cmd) => {
    const build = vehicleBuild();
    const snapshot = structuredClone(build);

    expect(() => commitGarageCommand(offerContext(build), cmd as GarageCommand)).not.toThrow();
    const result = commitGarageCommand(offerContext(build), cmd as GarageCommand);
    expect(result.kind).toBe("failure");
    expect(build).toStrictEqual(snapshot);
  });

  it("leaves the build untouched for a no-op", () => {
    const build = vehicleBuild([POWER_ITEM]);
    const result = commitGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[0] }),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.build).toStrictEqual(build);
    expect(result.evicted).toBeNull();
  });
});

describe("garage item-copy conservation", () => {
  it("never duplicates or drops an item across a long sequence of legal operations", () => {
    let build = vehicleBuild([ITEM_POOL[0], ITEM_POOL[1]], [ITEM_POOL[2]]);
    const startingIds = [...installedItems(build), ...storedItems(build)]
      .filter((item): item is ItemDefinition => item !== null)
      .map((item) => item.id)
      .sort();

    const sequence: GarageCommand[] = [
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "vehicle", slotId: SLOT[3] }),
      command({ area: "storage", index: 0 }, { area: "vehicle", slotId: SLOT[0] }),
      command({ area: "vehicle", slotId: SLOT[1] }, { area: "storage", index: 1 }),
      command({ area: "vehicle", slotId: SLOT[3] }, { area: "vehicle", slotId: SLOT[0] }, "swap"),
      command({ area: "storage", index: 1 }, { area: "vehicle", slotId: SLOT[2] }),
    ];

    sequence.forEach((cmd) => {
      const result = commitGarageCommand(context(build), cmd);
      expect(result.kind).toBe("committed");
      if (result.kind === "committed") build = result.build;
    });

    const endingIds = [...installedItems(build), ...storedItems(build)]
      .filter((item): item is ItemDefinition => item !== null)
      .map((item) => item.id)
      .sort();
    expect(endingIds).toEqual(startingIds);
    expect(build.slots).toHaveLength(4);
    expect(build.storage).toHaveLength(3);
  });

  it("keeps duplicate copies of the same definition distinguishable by position", () => {
    const build = vehicleBuild([OTHER_ITEM, OTHER_ITEM]);
    const result = commitGarageCommand(
      context(build),
      command({ area: "vehicle", slotId: SLOT[0] }, { area: "storage", index: 0 }),
    );

    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.build.slots[0].item).toBeNull();
    expect(result.build.slots[1].item).toStrictEqual(OTHER_ITEM);
    expect(result.build.storage[0].item).toStrictEqual(OTHER_ITEM);
  });
});

describe("resolveInstallation — full catalog matrix", () => {
  const SLOT_TYPES: SlotType[] = ["power", "chassis", "flex"];

  it("is legal for every shipped item against every slot type and never mutates the item", () => {
    ITEM_POOL.forEach((item) => {
      const snapshot = structuredClone(item);
      SLOT_TYPES.forEach((slotType) => {
        expect(() => resolveInstallation(item, slotType)).not.toThrow();
      });
      expect(item).toStrictEqual(snapshot);
    });
  });

  it("resolves Fitted with the item's own Fitted behavior when the slot matches its category", () => {
    ITEM_POOL.forEach((item) => {
      const resolution = resolveInstallation(item, item.installationCategory);

      expect(resolution.state).toBe("fitted");
      expect(resolution.appliedInstallationBehavior).toStrictEqual(item.fittedBehavior);
      expect(resolution.lostFittedBehavior).toBeNull();
      expect(resolution.noAdditionalImprovisedConsequence).toBe(false);
      expect(resolution.baseBehavior).toStrictEqual({
        kind: "time-modifier",
        timeModifier: item.timeModifier,
        description: `Base: ${item.timeModifier.toFixed(2)}s per firing.`,
      });
    });
  });

  it("resolves Improvised — still legal — with the item's own Improvised behavior when the slot conflicts", () => {
    const opposite: Record<"power" | "chassis", "power" | "chassis"> = { power: "chassis", chassis: "power" };
    ITEM_POOL.forEach((item) => {
      const conflictingSlot = opposite[item.installationCategory];
      const resolution = resolveInstallation(item, conflictingSlot);
      const hasConsequence = item.improvisedBehavior.kind !== "none";

      expect(resolution.state).toBe("improvised");
      expect(resolution.lostFittedBehavior).toStrictEqual(item.fittedBehavior);
      expect(resolution.appliedInstallationBehavior).toStrictEqual(hasConsequence ? item.improvisedBehavior : null);
      expect(resolution.noAdditionalImprovisedConsequence).toBe(!hasConsequence);
    });
  });

  it("resolves Flexible with base-only behavior in a Flex slot regardless of category", () => {
    ITEM_POOL.forEach((item) => {
      const resolution = resolveInstallation(item, "flex");

      expect(resolution.state).toBe("flexible");
      expect(resolution.appliedInstallationBehavior).toBeNull();
      expect(resolution.lostFittedBehavior).toStrictEqual(item.fittedBehavior);
      expect(resolution.noAdditionalImprovisedConsequence).toBe(false);
    });
  });
});
