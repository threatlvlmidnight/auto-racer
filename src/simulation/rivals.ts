import { vehicleById } from "../content/entrants";
import { ITEM_POOL } from "../content/sample-data";
import { createEmptyVehicleBuild } from "./build";
import { drawItem } from "./draft";
import { addItem } from "./slots";
import { addItemToStorage } from "./storage";
import {
  ACTIVE_IDENTITY_TAG,
  TAG_WEIGHT,
  type ItemDefinition,
  type RivalProfile,
  type VehicleBuild,
} from "./types";

/**
 * Deterministic PRNG (mulberry32) seeded from a hash of the resolution's own
 * inputs — never wall-clock time or module-level state (contract §2).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts: (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

function priceBucket(
  pool: readonly ItemDefinition[],
  bias: "low" | "mid" | "high",
): ItemDefinition[] {
  const bucket = pool.filter((item) => {
    if (bias === "low") return item.price <= 2;
    if (bias === "high") return item.price >= 4;
    return item.price === 3;
  });
  return bucket.length > 0 ? bucket : [...pool];
}

type FillPosition = { area: "board" | "storage"; index: number };

function fillPositions(build: VehicleBuild): FillPosition[] {
  return [
    ...build.slots.map((_slot, index) => ({ area: "board" as const, index })),
    ...build.storage.map((_position, index) => ({ area: "storage" as const, index })),
  ];
}

/**
 * Resolve a rival profile at a given in-run level into a real VehicleBuild
 * (data-model.md "Resolved Rival Build"; contract §2).
 *
 * Pure and deterministic: identical (profile, level, seed) always produces a
 * deeply equal build. Reuses createEmptyVehicleBuild and the existing
 * drawItem deterministic draw — no second item-selection mechanism.
 */
export function resolveRivalBuild(profile: RivalProfile, level: number, seed: number): VehicleBuild {
  if (!vehicleById(profile.vehicleId)) {
    throw new Error(`Unknown vehicle definition: ${profile.vehicleId}`);
  }

  const { slotsToFill, priceBias } = profile.levelScaling(level);
  const pool = priceBucket(ITEM_POOL, priceBias);
  const positions = fillPositions(createEmptyVehicleBuild(profile.vehicleId));
  const clampedCount = Math.max(0, Math.min(slotsToFill, positions.length));

  let build = createEmptyVehicleBuild(profile.vehicleId);
  for (let index = 0; index < clampedCount; index += 1) {
    const position = positions[index];
    const rng = mulberry32(hashSeed(seed, profile.id, level, index));
    const item = drawItem(pool, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, rng);
    build = position.area === "board"
      ? addItem(build, item, position.index)
      : addItemToStorage(build, item, position.index);
  }

  return build;
}

/**
 * Deterministic per-contest selection of 7 distinct entries from a wider
 * pool (019-async-ghost-pool, contract §3). Reuses this file's existing
 * mulberry32 PRNG rather than importing 018-track-generation's own —
 * neither feature depends on the other's implementation order
 * (research.md Decision 2).
 *
 * Accepts only a plain (pool, seed, level) — never a Run, Build, or other
 * player-scoped object — so a future shared-lobby feature can supply a
 * lobby-scoped identifier here with zero change (FR-003, FR-005).
 *
 * A partial Fisher-Yates shuffle: only the first 7 positions are finalized,
 * guaranteeing 7 distinct entries by construction, never by a separate
 * distinctness check (research.md Decision 5).
 */
export function selectGhostRoster(
  pool: readonly RivalProfile[],
  seed: number,
  level: number,
): RivalProfile[] {
  const rng = mulberry32(seed * 1000003 + level);
  const shuffled = [...pool];
  const selectionSize = Math.min(7, shuffled.length);

  for (let index = 0; index < selectionSize; index += 1) {
    const swapIndex = index + Math.floor(rng() * (shuffled.length - index));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, selectionSize);
}
