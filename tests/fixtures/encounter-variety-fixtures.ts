import { vehicleById } from "../../src/content/entrants";
import { VEHICLE_STORAGE_CAPACITY } from "../../src/simulation/types";
import { createItemInstance } from "../../src/simulation/itemInstances";
import type { InstanceBuild, ItemInstance, ItemTier } from "../../src/simulation/types";

/**
 * Deterministic Feature 034 builders and seeds (034 tasks T002). Provides a
 * mulberry32-style seeded RNG (byte-stable across runs), instance-build
 * construction, and named seed domains shared by the 034 unit suites.
 */

export const ENCOUNTER_SEEDS = [11, 23, 41, 67] as const;

/** mulberry32 (public-domain) seeded PRNG — deterministic across platforms. */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FEATURE_034_VEHICLE_ID = "the-highwheel" as const;

/** Empty (no held items) instance-shaped build for the 034 test vehicle. */
function createEmptyInstanceBuild(vehicleId: typeof FEATURE_034_VEHICLE_ID): InstanceBuild {
  const vehicle = vehicleById(vehicleId);
  if (!vehicle) throw new RangeError(`Unknown vehicle ${vehicleId}`);
  const slots = vehicle.slots.map((slot) => ({ slotId: slot.id, slotType: slot.type, instance: null as ItemInstance | null }));
  return {
    vehicleId,
    car: { id: "spec-car-baseline", baseLapTime: 6 },
    slots,
    storage: Array.from({ length: VEHICLE_STORAGE_CAPACITY }, (_unused, index) => ({ index, instance: null as ItemInstance | null })),
  };
}

/** Builds a deterministic 034 instance-build from definition-id slices. */
export function instanceBuild(
  installed: readonly { id: string; tier?: ItemTier }[] = [],
  stored: readonly { id: string; tier?: ItemTier }[] = [],
): InstanceBuild {
  const base = createEmptyInstanceBuild(FEATURE_034_VEHICLE_ID);
  const installedCount = installed.length;
  const storedCount = stored.length;
  if (installedCount > base.slots.length || storedCount > base.storage.length) {
    throw new RangeError("Instance build overflow");
  }
  return {
    ...base,
    slots: base.slots.map((slot, index) => {
      const spec = installed[index];
      return spec ? { ...slot, instance: createItemInstance(spec.id, "draft", spec.tier ?? 1) } : slot;
    }),
    storage: base.storage.map((position, index) => {
      const spec = stored[index];
      return spec ? { ...position, instance: createItemInstance(spec.id, "draft", spec.tier ?? 1) } : position;
    }),
  };
}

