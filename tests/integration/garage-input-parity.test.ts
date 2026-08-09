import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import {
  garageComparisonModel,
  garageDestinationOrder,
  garagePreviewModel,
  garageSlotModels,
  garageStorageModels,
  garageVehicleHeader,
} from "../../src/scenes/garagePresentation";
import { runIdentityForEntrant } from "../../src/simulation/run";
import type { EntrantId } from "../../src/simulation/types";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const ENTRANT_VEHICLES: ReadonlyArray<[EntrantId, string, string]> = [
  ["evelyn-mercer", "the-highwheel", "The Highwheel"],
  ["lucien-soto", "the-needle", "The Needle"],
  ["inez-rook", "the-lark", "The Lark"],
  ["nell-voss", "the-hush", "The Hush"],
];

describe("garage names the selected vehicle, never a generic board", () => {
  it.each(ENTRANT_VEHICLES)("labels %s's garage as %s", (entrantId, vehicleId, vehicleName) => {
    const header = garageVehicleHeader(runIdentityForEntrant(entrantId)!);

    expect(header.vehicleName).toBe(vehicleName);
    expect(header.label).toContain(vehicleName.toUpperCase());
    expect(header.storageLabel.toUpperCase()).toContain("STORAGE");
    void vehicleId;
  });

  it("contains no user-facing Board/BOARD terminology anywhere in the garage models", () => {
    ENTRANT_VEHICLES.forEach(([entrantId, vehicleId]) => {
      const identity = runIdentityForEntrant(entrantId)!;
      const build = vehicleBuild([ITEM_POOL[0]], [ITEM_POOL[1]], vehicleId as never);
      const text = [
        JSON.stringify(garageVehicleHeader(identity)),
        JSON.stringify(garageSlotModels(build)),
        JSON.stringify(garageStorageModels(build)),
      ].join(" ");

      expect(text).not.toMatch(/\bboard\b/i);
    });
  });
});

describe("garage slot models follow authored topology order", () => {
  it.each(ENTRANT_VEHICLES)("renders %s's slots in exact authored order", (_entrantId, vehicleId) => {
    const build = vehicleBuild([], [], vehicleId as never);
    const slots = garageSlotModels(build);

    expect(slots).toHaveLength(4);
    expect(slots.map((slot) => slot.slotId)).toEqual(build.slots.map((slot) => slot.slotId));
    expect(slots.map((slot) => slot.slotType)).toEqual(build.slots.map((slot) => slot.slotType));
    expect(slots.map((slot) => slot.order)).toEqual([0, 1, 2, 3]);
  });

  it("labels every slot type as text, not colour alone", () => {
    const slots = garageSlotModels(vehicleBuild([], [], "the-highwheel"));
    expect(slots.map((slot) => slot.typeLabel)).toEqual(["POWER", "CHASSIS", "CHASSIS", "FLEX"]);
  });

  it("distinguishes occupied from empty slots in text", () => {
    const slots = garageSlotModels(vehicleBuild([ITEM_POOL[0]], [], "the-highwheel"));

    expect(slots[0].occupied).toBe(true);
    expect(slots[0].stateLabel.toUpperCase()).toContain("OCCUPIED");
    expect(slots[0].itemName).toBe(ITEM_POOL[0].name);
    expect(slots[1].occupied).toBe(false);
    expect(slots[1].stateLabel.toUpperCase()).toContain("EMPTY");
    expect(slots[1].itemName).toBeNull();
  });

  it("reports the resolved installation state of each occupied slot", () => {
    // item-001 is a Power item; Highwheel slot 1 is Power, slot 2 is Chassis.
    const fitted = garageSlotModels(vehicleBuild([ITEM_POOL[0]], [], "the-highwheel"))[0];
    const improvised = garageSlotModels(vehicleBuild([null, ITEM_POOL[0]], [], "the-highwheel"))[1];
    const flexible = garageSlotModels(vehicleBuild([null, null, null, ITEM_POOL[0]], [], "the-highwheel"))[3];

    expect(fitted.installationState).toBe("fitted");
    expect(improvised.installationState).toBe("improvised");
    expect(flexible.installationState).toBe("flexible");
    [fitted, improvised, flexible].forEach((slot) => {
      expect(slot.installationLabel!.length).toBeGreaterThan(0);
    });
  });

  it("leaves installation state absent for an empty slot", () => {
    const empty = garageSlotModels(vehicleBuild([], [], "the-highwheel"))[0];
    expect(empty.installationState).toBeNull();
    expect(empty.installationLabel).toBeNull();
  });
});

describe("garage storage models", () => {
  it("always exposes exactly three independent positions with no slot-type affinity", () => {
    const storage = garageStorageModels(vehicleBuild([], [ITEM_POOL[1]], "the-hush"));

    expect(storage).toHaveLength(3);
    expect(storage.map((position) => position.index)).toEqual([0, 1, 2]);
    storage.forEach((position) => {
      expect(position).not.toHaveProperty("slotType");
      expect(position).not.toHaveProperty("installationState");
    });
    expect(storage[0].occupied).toBe(true);
    expect(storage[1].occupied).toBe(false);
  });

  it("marks an active-while-stored item explicitly rather than implying inertness", () => {
    const tyreRack = ITEM_POOL.find((item) => item.activeWhileStored)!;
    const storage = garageStorageModels(vehicleBuild([], [tyreRack, ITEM_POOL[0]], "the-hush"));

    expect(storage[0].storageActive).toBe(true);
    expect(storage[0].stateLabel.toUpperCase()).toContain("ACTIVE");
    expect(storage[1].storageActive).toBe(false);
    expect(storage[1].stateLabel.toUpperCase()).toContain("INERT");
  });
});

describe("garage preview and occupant comparison", () => {
  const build = () => vehicleBuild([ITEM_POOL[3]], [], "the-highwheel");
  const offers = [{ id: "offer-1", item: ITEM_POOL[0] }];

  it("describes an empty-slot placement with its resulting installation state", () => {
    const model = garagePreviewModel(
      { build: build(), offers },
      { source: { area: "offer", offerId: "offer-1" }, destination: { area: "vehicle", slotId: "the-highwheel-slot-4" }, replacement: "none" },
    );

    expect(model.available).toBe(true);
    expect(model.dispositionLabel.toUpperCase()).toContain("PLACE");
    expect(model.requiresConfirmation).toBe(false);
    expect(model.installationLabel).toMatch(/flexible/i);
    expect(model.comparison).toBeNull();
  });

  it("shows a persistent candidate-vs-occupant comparison before an irreversible replacement", () => {
    const model = garagePreviewModel(
      { build: build(), offers },
      { source: { area: "offer", offerId: "offer-1" }, destination: { area: "vehicle", slotId: "the-highwheel-slot-1" }, replacement: "evict" },
    );

    expect(model.requiresConfirmation).toBe(true);
    expect(model.comparison).not.toBeNull();
    expect(model.comparison!.candidate.name).toBe(ITEM_POOL[0].name);
    expect(model.comparison!.occupant.name).toBe(ITEM_POOL[3].name);
    expect(model.comparison!.outcome.toLowerCase()).toContain("remove");
  });

  it("states the exact outcome of a swap without calling it a removal", () => {
    const model = garagePreviewModel(
      { build: vehicleBuild([ITEM_POOL[3], ITEM_POOL[0]], [], "the-highwheel") },
      { source: { area: "vehicle", slotId: "the-highwheel-slot-1" }, destination: { area: "vehicle", slotId: "the-highwheel-slot-2" }, replacement: "swap" },
    );

    expect(model.requiresConfirmation).toBe(false);
    expect(model.dispositionLabel.toUpperCase()).toContain("SWAP");
    expect(model.comparison!.outcome.toLowerCase()).not.toContain("remove");
  });

  it("surfaces a typed unavailable reason as readable text", () => {
    const model = garagePreviewModel(
      { build: build(), offers },
      { source: { area: "offer", offerId: "gone" }, destination: { area: "storage", index: 0 }, replacement: "none" },
    );

    expect(model.available).toBe(false);
    expect(model.reasonLabel).toBeTruthy();
  });

  it("never reports a category mismatch as unavailable", () => {
    // item-001 is Power; Highwheel slot 2 is Chassis — legal, just Improvised.
    const model = garagePreviewModel(
      { build: vehicleBuild([], [], "the-highwheel"), offers },
      { source: { area: "offer", offerId: "offer-1" }, destination: { area: "vehicle", slotId: "the-highwheel-slot-2" }, replacement: "none" },
    );

    expect(model.available).toBe(true);
    expect(model.reasonLabel).toBeNull();
    expect(model.installationLabel).toMatch(/improvised/i);
  });
});

describe("garage comparison model", () => {
  it("compares two items on the facts a placement decision needs", () => {
    const comparison = garageComparisonModel(ITEM_POOL[0], ITEM_POOL[3], "replace");

    expect(comparison.candidate.name).toBe(ITEM_POOL[0].name);
    expect(comparison.candidate.categoryLabel.toUpperCase()).toMatch(/POWER|CHASSIS/);
    expect(comparison.candidate.baseEffectLabel.length).toBeGreaterThan(0);
    expect(comparison.occupant.name).toBe(ITEM_POOL[3].name);
    expect(comparison.outcome.length).toBeGreaterThan(0);
  });
});

describe("garage destination focus order", () => {
  it("walks all four slots then all three storage positions in a deterministic order", () => {
    const order = garageDestinationOrder(vehicleBuild([], [], "the-needle"));

    expect(order).toHaveLength(7);
    expect(order.slice(0, 4).every((entry) => entry.area === "vehicle")).toBe(true);
    expect(order.slice(4).every((entry) => entry.area === "storage")).toBe(true);
    expect(order.map((entry) => entry.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("gives every destination a keyboard-reachable label and pointer/touch parity", () => {
    garageDestinationOrder(vehicleBuild([], [], "the-lark")).forEach((entry) => {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.pointer).toBe(true);
      expect(entry.touch).toBe(true);
    });
  });
});
