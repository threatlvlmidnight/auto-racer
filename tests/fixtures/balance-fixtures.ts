import { NEUTRAL_ITEMS } from "../../src/content/items";
import { EXCLUSIVE_ITEMS } from "../../src/content/items";
import { BASELINE_CAR } from "../../src/content/sample-data";
import { resolveContest } from "../../src/simulation/contest";
import { vehicleBuild } from "./vehicle-build-fixtures";
import type { EntrantId, ItemDefinition } from "../../src/simulation/types";

export const BALANCE_SEEDS = [7, 19, 31, 43, 59] as const;
export const NELL_CATALOG = EXCLUSIVE_ITEMS["nell-voss"].map((item) => item.id);
export const STOCK_VEHICLE_BASELINE = structuredClone(BASELINE_CAR);
export const REPRESENTATIVE_DRAFT_ITEMS = NEUTRAL_ITEMS.slice(0, 3).map((item) => item.id);

export function representativeBalanceFixture(seed: number) {
  return { seed, draftItemIds: REPRESENTATIVE_DRAFT_ITEMS, baselineVehicle: structuredClone(STOCK_VEHICLE_BASELINE) };
}

export const BALANCE_ENTRANTS: readonly EntrantId[] = [
  "evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss",
];

function authoredMagnitude(item: ItemDefinition): number {
  const direct = Object.values(item.physics ?? {}).reduce((sum, value) => sum + Math.abs(value), 0);
  const conditional = (item.conditionalPhysics ?? []).reduce(
    (sum, entry) => sum + Object.values(entry.delta).reduce((deltaSum, value) => deltaSum + Math.abs(value), 0), 0,
  );
  return direct + conditional + (item.buff?.boostPercent ?? 0);
}

function representativeItems(entrantId: EntrantId): readonly ItemDefinition[] {
  return EXCLUSIVE_ITEMS[entrantId].filter((item) => item.price <= 4).slice(0, 4);
}

function optimizedItems(entrantId: EntrantId): readonly ItemDefinition[] {
  return [...EXCLUSIVE_ITEMS[entrantId]]
    .sort((a, b) => authoredMagnitude(b) - authoredMagnitude(a) || a.id.localeCompare(b.id))
    .slice(0, 4);
}

export interface BalanceGateEvidence {
  entrantId: EntrantId;
  representativeRaces: number;
  representativeWins: number;
  representativeRate: number;
  representativeItemIds: readonly string[];
  optimizedItemIds: readonly string[];
  optimizedCeilingSeconds: number;
  baselineVehicleId: string;
}

/** Fixed-seed, no-I/O harness used for the before/after evidence record. */
export function runBalanceHarness(): readonly BalanceGateEvidence[] {
  return BALANCE_ENTRANTS.map((entrantId) => {
    const representative = representativeItems(entrantId);
    const representativeWins = BALANCE_SEEDS.filter((seed) => {
      const result = resolveContest(vehicleBuild(representative), { id: `balance-ghost-${seed}`, lapTime: 6 + (seed % 3) * 0.1 }, 8);
      return result.outcome === "win";
    }).length;
    const optimized = optimizedItems(entrantId);
    const optimizedResult = resolveContest(vehicleBuild(optimized), { id: "balance-ceiling-ghost", lapTime: 6 }, 8);
    return {
      entrantId,
      representativeRaces: BALANCE_SEEDS.length,
      representativeWins,
      representativeRate: representativeWins / BALANCE_SEEDS.length,
      representativeItemIds: representative.map((item) => item.id),
      optimizedItemIds: optimized.map((item) => item.id),
      optimizedCeilingSeconds: optimizedResult.playerTime,
      baselineVehicleId: STOCK_VEHICLE_BASELINE.id,
    };
  });
}
