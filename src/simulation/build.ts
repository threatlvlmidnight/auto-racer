import { vehicleById } from "../content/entrants";
import { BASELINE_CAR } from "../content/sample-data";
import { simulatePlayerLaps } from "./laps";
import { VEHICLE_STORAGE_CAPACITY, type VehicleBuild, type VehicleId } from "./types";

/**
 * The empty starting build for a named vehicle: the authored topology in
 * canonical order plus three indexed storage positions. Slot IDs/types come
 * from the vehicle definition and are never invented here.
 */
export function createEmptyVehicleBuild(vehicleId: VehicleId): VehicleBuild {
  const vehicle = vehicleById(vehicleId);
  if (!vehicle) {
    throw new Error(`Unknown vehicle definition: ${vehicleId}`);
  }

  return {
    vehicleId,
    car: BASELINE_CAR,
    slots: vehicle.slots.map((slot) => ({ slotId: slot.id, slotType: slot.type, item: null, tier: 1 as const })),
    storage: Array.from({ length: VEHICLE_STORAGE_CAPACITY }, (_unused, index) => ({
      index,
      item: null,
      tier: 1 as const,
    })),
  };
}

/**
 * Resulting finishing time for a Build: baseline time plus every held item
 * modifier (data-model.md).
 *
 * Pure function — no mutation, no I/O, no randomness (simulation-contract.md
 * Invariant 4).
 */
export function resultingTime(build: VehicleBuild): number {
  const total = simulatePlayerLaps(build).reduce((sum, lap) => sum + lap.time, 0);

  // Defensive guard (Polish, T020): malformed content data (NaN/Infinity)
  // should fail loudly during development rather than silently produce an
  // unexplainable result at the ResultScene.
  if (!Number.isFinite(total)) {
    throw new Error(
      `resultingTime produced a non-finite value (car.baseLapTime=${build.car.baseLapTime})`
    );
  }

  return total;
}
