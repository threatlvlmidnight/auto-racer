import { ENTRANTS, VEHICLES } from "../content/entrants";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../content/items";
import { SPONSOR_OBJECTIVE_TAGS } from "./run";
import type { EntrantId, ItemDefinition, VehicleId } from "./types";

// 020-character-item-pools: the one place "which items is X allowed to draw
// from" is answered. Every draft/restock/rival call site goes through this
// module instead of touching NEUTRAL_ITEMS/EXCLUSIVE_ITEMS directly
// (plan.md Project Structure).

const ENTRANT_IDS: readonly EntrantId[] = ENTRANTS.map((entrant) => entrant.id);

/** Complete immutable playable catalog in stable authoring order. */
export function allItemDefinitions(): readonly ItemDefinition[] {
  return [
    ...NEUTRAL_ITEMS,
    ...ENTRANT_IDS.flatMap((entrantId) => EXCLUSIVE_ITEMS[entrantId]),
  ];
}

/**
 * Deterministic PRNG (mulberry32), duplicated locally rather than imported
 * from rivals.ts — matching this project's own established convention
 * (tracks.ts carries its own copy for the same reason: neither module
 * depends on the other's implementation order).
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

export function poolForEntrant(entrantId: EntrantId): readonly ItemDefinition[] {
  return resolveEntrantPool(NEUTRAL_ITEMS, EXCLUSIVE_ITEMS, entrantId);
}

/**
 * Parameterized core of poolForEntrant, exported only so Foundational-phase
 * tests can exercise the concatenation/no-cross-contamination behavior
 * against small synthetic fixture pools before the real 70-item catalog is
 * authored (tasks.md T003) — the public contract is poolForEntrant(entrantId)
 * alone (contract §2).
 */
export function resolveEntrantPool(
  neutral: readonly ItemDefinition[],
  exclusive: Record<EntrantId, readonly ItemDefinition[]>,
  entrantId: EntrantId,
): readonly ItemDefinition[] {
  return [...neutral, ...exclusive[entrantId]];
}

export function poolForRival(vehicleId: VehicleId): readonly ItemDefinition[] {
  const entrantId = VEHICLES.find((vehicle) => vehicle.id === vehicleId)?.entrantId;
  if (!entrantId) return NEUTRAL_ITEMS;
  return resolveEntrantPool(NEUTRAL_ITEMS, EXCLUSIVE_ITEMS, entrantId);
}

export function poolForCrossPollination(
  ownEntrantId: EntrantId,
  seed: number,
  encounterId: string,
): { guestEntrantId: EntrantId; pool: readonly ItemDefinition[] } {
  const others = ENTRANT_IDS.filter((id) => id !== ownEntrantId);
  const rng = mulberry32(hashSeed(seed, encounterId));
  const guestEntrantId = others[Math.floor(rng() * others.length)];
  return { guestEntrantId, pool: EXCLUSIVE_ITEMS[guestEntrantId] };
}

export type ItemPoolsValidation =
  | { kind: "valid" }
  | { kind: "invalid"; issues: string[] };

export function validateItemPools(): ItemPoolsValidation {
  return validatePoolContent(NEUTRAL_ITEMS, EXCLUSIVE_ITEMS);
}

/**
 * Parameterized core of validateItemPools, exported only so Foundational-
 * phase tests can prove every invariant (including deliberately-broken
 * cases, like a duplicate id) against small synthetic fixture pools —
 * without ever authoring an intentionally-invalid entry into the real
 * catalog just to exercise this path (tasks.md T002). The public contract
 * is validateItemPools() alone (contract's Catalog Contract).
 */
export function validatePoolContent(
  neutral: readonly ItemDefinition[],
  exclusive: Record<EntrantId, readonly ItemDefinition[]>,
): ItemPoolsValidation {
  const issues: string[] = [];

  if (neutral.length !== 10) {
    issues.push(`NEUTRAL_ITEMS has ${neutral.length} items, expected 10`);
  }
  for (const entrantId of ENTRANT_IDS) {
    const pool = exclusive[entrantId] ?? [];
    if (pool.length !== 15) {
      issues.push(`${entrantId} exclusive pool has ${pool.length} items, expected 15`);
    }
  }

  const allItems: readonly ItemDefinition[] = [
    ...neutral,
    ...ENTRANT_IDS.flatMap((entrantId) => exclusive[entrantId] ?? []),
  ];
  const ids = allItems.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    issues.push("duplicate item id across the catalog");
  }

  const leans = ENTRANT_IDS.map((entrantId) => summedLean(exclusive[entrantId] ?? []));
  leans.forEach((lean, index) => {
    if (isNeutralLean(lean)) {
      issues.push(`${ENTRANT_IDS[index]} exclusive pool's summed physics lean is neutral (all-zero)`);
    }
  });
  for (let i = 0; i < leans.length; i += 1) {
    for (let j = i + 1; j < leans.length; j += 1) {
      if (leansEqual(leans[i], leans[j])) {
        issues.push(`${ENTRANT_IDS[i]} and ${ENTRANT_IDS[j]} share an identical summed physics lean`);
      }
    }
  }

  for (const tag of SPONSOR_OBJECTIVE_TAGS) {
    const hasMatch = allItems.some((item) => item.buff !== undefined && item.synergyTags.includes(tag));
    if (!hasMatch) {
      issues.push(`SPONSOR_OBJECTIVE_TAGS entry "${tag}" matches no Buff-role item in the catalog`);
    }
  }

  return issues.length > 0 ? { kind: "invalid", issues } : { kind: "valid" };
}

interface PhysicsLean {
  accelerationDelta: number;
  topSpeedDelta: number;
  brakingPowerDelta: number;
  corneringSpeedDelta: number;
}

function summedLean(items: readonly ItemDefinition[]): PhysicsLean {
  return items.reduce<PhysicsLean>(
    (total, item) => ({
      accelerationDelta: total.accelerationDelta + (item.physics?.accelerationDelta ?? 0),
      topSpeedDelta: total.topSpeedDelta + (item.physics?.topSpeedDelta ?? 0),
      brakingPowerDelta: total.brakingPowerDelta + (item.physics?.brakingPowerDelta ?? 0),
      corneringSpeedDelta: total.corneringSpeedDelta + (item.physics?.corneringSpeedDelta ?? 0),
    }),
    { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0 },
  );
}

function isNeutralLean(lean: PhysicsLean): boolean {
  return lean.accelerationDelta === 0
    && lean.topSpeedDelta === 0
    && lean.brakingPowerDelta === 0
    && lean.corneringSpeedDelta === 0;
}

function leansEqual(a: PhysicsLean, b: PhysicsLean): boolean {
  return a.accelerationDelta === b.accelerationDelta
    && a.topSpeedDelta === b.topSpeedDelta
    && a.brakingPowerDelta === b.brakingPowerDelta
    && a.corneringSpeedDelta === b.corneringSpeedDelta;
}
