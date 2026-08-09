import { describe, expect, it } from "vitest";
import { BASELINE_CAR } from "../../src/content/sample-data";
import {
  ENTRANTS,
  VEHICLES,
  entrantById,
  vehicleById,
  vehicleForEntrant,
  validateRosterCatalog,
} from "../../src/content/entrants";
import {
  VEHICLE_SLOT_COUNT,
  VEHICLE_STORAGE_CAPACITY,
  type EntrantId,
  type SlotType,
  type VehicleId,
} from "../../src/simulation/types";

const EXPECTED_PAIRINGS: ReadonlyArray<{
  entrantId: EntrantId;
  vehicleId: VehicleId;
  origin: string;
  power: number;
  chassis: number;
  flex: number;
}> = [
  { entrantId: "evelyn-mercer", vehicleId: "the-highwheel", origin: "coachworks", power: 1, chassis: 2, flex: 1 },
  { entrantId: "lucien-soto", vehicleId: "the-needle", origin: "velodrome", power: 2, chassis: 1, flex: 1 },
  { entrantId: "inez-rook", vehicleId: "the-lark", origin: "fieldworks", power: 1, chassis: 1, flex: 2 },
  { entrantId: "nell-voss", vehicleId: "the-hush", origin: "backroads", power: 2, chassis: 2, flex: 0 },
];

function countSlotType(vehicleId: VehicleId, type: SlotType): number {
  return vehicleById(vehicleId)!.slots.filter((slot) => slot.type === type).length;
}

describe("roster catalog completeness", () => {
  it("ships exactly the four committed entrants and four committed vehicles", () => {
    expect(ENTRANTS).toHaveLength(4);
    expect(VEHICLES).toHaveLength(4);
    expect(ENTRANTS.map((entrant) => entrant.id)).toEqual(
      EXPECTED_PAIRINGS.map((pairing) => pairing.entrantId),
    );
    expect(VEHICLES.map((vehicle) => vehicle.id)).toEqual(
      EXPECTED_PAIRINGS.map((pairing) => pairing.vehicleId),
    );
  });

  it.each(EXPECTED_PAIRINGS)(
    "pairs $entrantId with $vehicleId reciprocally and carries origin $origin",
    ({ entrantId, vehicleId, origin }) => {
      const entrant = entrantById(entrantId)!;
      const vehicle = vehicleById(vehicleId)!;

      expect(entrant.vehicleId).toBe(vehicleId);
      expect(vehicle.entrantId).toBe(entrantId);
      expect(entrant.origin).toBe(origin);
      expect(vehicleForEntrant(entrantId)).toStrictEqual(vehicle);
    },
  );

  it.each(EXPECTED_PAIRINGS)(
    "$vehicleId has the exact authored $power/$chassis/$flex topology",
    ({ vehicleId, power, chassis, flex }) => {
      expect(countSlotType(vehicleId, "power")).toBe(power);
      expect(countSlotType(vehicleId, "chassis")).toBe(chassis);
      expect(countSlotType(vehicleId, "flex")).toBe(flex);
    },
  );

  it("gives every vehicle equal total active capacity and equal storage capacity", () => {
    VEHICLES.forEach((vehicle) => {
      expect(vehicle.slots).toHaveLength(VEHICLE_SLOT_COUNT);
      expect(vehicle.storageCapacity).toBe(VEHICLE_STORAGE_CAPACITY);
    });
  });

  it("gives every vehicle the shared baseline car, never a per-vehicle stat advantage", () => {
    VEHICLES.forEach((vehicle) => {
      expect(vehicle.baseCarId).toBe(BASELINE_CAR.id);
    });
  });

  it("uses stable unique slot IDs within and across vehicles", () => {
    VEHICLES.forEach((vehicle) => {
      const ids = vehicle.slots.map((slot) => slot.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
    const allIds = VEHICLES.flatMap((vehicle) => vehicle.slots.map((slot) => slot.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("declares a local asset key for every entrant portrait and vehicle silhouette", () => {
    ENTRANTS.forEach((entrant) => {
      expect(entrant.portraitAssetKey).toMatch(/^entrant-/);
    });
    VEHICLES.forEach((vehicle) => {
      expect(vehicle.silhouetteAssetKey).toMatch(/^vehicle-/);
    });
    const keys = [
      ...ENTRANTS.map((entrant) => entrant.portraitAssetKey),
      ...VEHICLES.map((vehicle) => vehicle.silhouetteAssetKey),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("describes each entrant as an approach, not a prescribed mechanical class", () => {
    ENTRANTS.forEach((entrant) => {
      expect(entrant.name.length).toBeGreaterThan(0);
      expect(entrant.role.length).toBeGreaterThan(0);
      expect(entrant.approach.length).toBeGreaterThan(0);
      expect(entrant.strategyDirections.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("carries no base-stat, capacity, passive, or legality modifier on any entrant", () => {
    ENTRANTS.forEach((entrant) => {
      const record = entrant as unknown as Record<string, unknown>;
      ["baseLapTime", "capacity", "slotBonus", "passive", "ability", "modifier"].forEach((forbidden) => {
        expect(record[forbidden]).toBeUndefined();
      });
    });
  });

  it("has each entrant use a distinct origin so draft weighting differs per entrant", () => {
    const origins = ENTRANTS.map((entrant) => entrant.origin);
    expect(new Set(origins).size).toBe(4);
  });
});

describe("validateRosterCatalog", () => {
  it("reports the shipped catalog as valid", () => {
    expect(validateRosterCatalog(ENTRANTS, VEHICLES)).toStrictEqual({ kind: "valid" });
  });

  it("rejects a non-reciprocal entrant/vehicle pairing without substituting an entrant", () => {
    const brokenVehicles = VEHICLES.map((vehicle) =>
      vehicle.id === "the-needle" ? { ...vehicle, entrantId: "evelyn-mercer" as EntrantId } : vehicle);
    expect(validateRosterCatalog(ENTRANTS, brokenVehicles)).toStrictEqual({
      kind: "invalid",
      code: "invalid-roster-pairing",
    });
  });

  it("rejects a vehicle whose topology is not exactly four slots", () => {
    const brokenVehicles = VEHICLES.map((vehicle) =>
      vehicle.id === "the-lark" ? { ...vehicle, slots: vehicle.slots.slice(0, 3) } : vehicle);
    expect(validateRosterCatalog(ENTRANTS, brokenVehicles as typeof VEHICLES)).toStrictEqual({
      kind: "invalid",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects duplicate slot IDs inside one vehicle", () => {
    const brokenVehicles = VEHICLES.map((vehicle) => {
      if (vehicle.id !== "the-hush") return vehicle;
      const slots = [...vehicle.slots];
      slots[1] = { ...slots[1], id: slots[0].id };
      return { ...vehicle, slots };
    });
    expect(validateRosterCatalog(ENTRANTS, brokenVehicles as typeof VEHICLES)).toStrictEqual({
      kind: "invalid",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects unequal storage capacity", () => {
    const brokenVehicles = VEHICLES.map((vehicle) =>
      vehicle.id === "the-hush" ? { ...vehicle, storageCapacity: 4 } : vehicle);
    expect(validateRosterCatalog(ENTRANTS, brokenVehicles as typeof VEHICLES)).toStrictEqual({
      kind: "invalid",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects an entrant whose vehicle definition is missing entirely", () => {
    const missing = VEHICLES.filter((vehicle) => vehicle.id !== "the-lark");
    expect(validateRosterCatalog(ENTRANTS, missing)).toStrictEqual({
      kind: "invalid",
      code: "invalid-roster-pairing",
    });
  });
});
