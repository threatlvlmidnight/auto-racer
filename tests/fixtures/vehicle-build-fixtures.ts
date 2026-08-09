import { BASELINE_CAR } from "../../src/content/sample-data";
import { vehicleById } from "../../src/content/entrants";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import type { ItemDefinition, VehicleBuild, VehicleId } from "../../src/simulation/types";

/**
 * Test-only convenience for the feature-010 build shape. Existing suites were
 * written against the generic `board: (Item|null)[]` array; this preserves that
 * ergonomics while producing a real topology-ordered `VehicleBuild`.
 *
 * The default vehicle is The Highwheel. Slot *type* does not affect lap
 * simulation today — Fitted/Improvised behavior is applied at contest-lock time
 * (feature 010 US5/Phase 7) — so existing numeric expectations are unaffected
 * by which vehicle a build uses.
 */
export const TEST_VEHICLE_ID: VehicleId = "the-highwheel";

export function vehicleBuild(
  installed: readonly (ItemDefinition | null)[] = [],
  stored: readonly (ItemDefinition | null)[] = [],
  vehicleId: VehicleId = TEST_VEHICLE_ID,
): VehicleBuild {
  const base = createEmptyVehicleBuild(vehicleId);
  const slotCount = base.slots.length;
  if (installed.length > slotCount) {
    throw new RangeError(`${vehicleId} has ${slotCount} slots; got ${installed.length} items`);
  }
  if (stored.length > base.storage.length) {
    throw new RangeError(`${vehicleId} has ${base.storage.length} storage positions`);
  }

  return {
    ...base,
    car: structuredClone(BASELINE_CAR),
    slots: base.slots.map((slot, index) => ({ ...slot, item: installed[index] ?? null })),
    storage: base.storage.map((position, index) => ({ ...position, item: stored[index] ?? null })),
  };
}

/** Canonical slot count for the default test vehicle. */
export const TEST_SLOT_COUNT = vehicleById(TEST_VEHICLE_ID)!.slots.length;

/**
 * Fills in the feature-010 authored fields for ad-hoc test items so suites can
 * keep declaring only the values they actually exercise (id/price/timing/buff).
 * Defaults are deliberately inert: no Fitted or Improvised consequence, so a
 * test item's behavior is exactly its base effect unless a test says otherwise.
 */
export function testItem(
  partial: Pick<ItemDefinition, "id" | "name" | "price" | "timeModifier">
    & Partial<ItemDefinition>,
): ItemDefinition {
  return {
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: [],
    fittedBehavior: { kind: "none", description: "Test fixture: no additional Fitted effect." },
    improvisedBehavior: { kind: "none", description: "Test fixture: no additional consequence." },
    ...partial,
  };
}
