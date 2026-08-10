import { vehicleById } from "./entrants";
import type { RivalLevelScaling, RivalProfile } from "../simulation/types";

// Authored rival roster (012-multi-ghost-contest, data-model.md "Rival
// Profile"). Every rival reuses one of the four existing named-vehicle
// topologies (research.md Decision 1) — no fifth topology is authored, and
// the roster is identical for every player entrant (FR-010).

/**
 * `levels` MUST be authored in ascending order. `level` values below the
 * first authored entry clamp to it; values above the last clamp to it too —
 * a rival profile always produces a defined, bounded result (spec.md Edge
 * Cases).
 */
function levelTable(
  levels: readonly [number, { slotsToFill: number; priceBias: "low" | "mid" | "high" }][],
): RivalLevelScaling {
  return (level) => {
    const applicable = levels.filter(([threshold]) => threshold <= level);
    const [, rule] = applicable.length > 0 ? applicable[applicable.length - 1] : levels[0];
    return rule;
  };
}

export const RIVAL_PROFILES: readonly RivalProfile[] = [
  {
    id: "rival-torres",
    name: "Torres",
    color: "#c0524a",
    vehicleId: "the-highwheel",
    levelScaling: levelTable([
      [1, { slotsToFill: 3, priceBias: "low" }],
      [2, { slotsToFill: 5, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "high" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-kestrel",
    name: "Kestrel",
    color: "#4a90c0",
    vehicleId: "the-needle",
    levelScaling: levelTable([
      [1, { slotsToFill: 4, priceBias: "low" }],
      [2, { slotsToFill: 5, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "mid" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-marchetti",
    name: "Marchetti",
    color: "#c0a34a",
    vehicleId: "the-lark",
    levelScaling: levelTable([
      [1, { slotsToFill: 3, priceBias: "low" }],
      [2, { slotsToFill: 4, priceBias: "low" }],
      [3, { slotsToFill: 6, priceBias: "mid" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-vane",
    name: "Odalys Vane",
    color: "#7a4ac0",
    vehicleId: "the-hush",
    levelScaling: levelTable([
      [1, { slotsToFill: 2, priceBias: "mid" }],
      [2, { slotsToFill: 5, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "high" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-colt",
    name: "Bram Colt",
    color: "#4ac077",
    vehicleId: "the-highwheel",
    levelScaling: levelTable([
      [1, { slotsToFill: 4, priceBias: "mid" }],
      [2, { slotsToFill: 5, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "high" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-ferro",
    name: "Sable Ferro",
    color: "#c04a9e",
    vehicleId: "the-needle",
    levelScaling: levelTable([
      [1, { slotsToFill: 3, priceBias: "low" }],
      [2, { slotsToFill: 4, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "high" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
  {
    id: "rival-quick",
    name: "Ysolde Quick",
    color: "#c07a4a",
    vehicleId: "the-lark",
    levelScaling: levelTable([
      [1, { slotsToFill: 2, priceBias: "low" }],
      [2, { slotsToFill: 5, priceBias: "mid" }],
      [3, { slotsToFill: 6, priceBias: "mid" }],
      [4, { slotsToFill: 7, priceBias: "high" }],
    ]),
  },
];

export type RivalCatalogValidation =
  | { kind: "valid" }
  | { kind: "invalid"; code: "wrong-count" | "duplicate-id" | "unknown-vehicle" };

/**
 * Content-integrity check for the authored rival roster (data-model.md
 * Validation Invariant 5). Never substitutes a default — a broken catalog is
 * a content bug the caller must surface, never silently paper over.
 */
export function validateRivalCatalog(profiles: readonly RivalProfile[]): RivalCatalogValidation {
  if (profiles.length !== 7) return { kind: "invalid", code: "wrong-count" };

  const ids = profiles.map((profile) => profile.id);
  if (new Set(ids).size !== ids.length) return { kind: "invalid", code: "duplicate-id" };

  for (const profile of profiles) {
    if (!vehicleById(profile.vehicleId)) return { kind: "invalid", code: "unknown-vehicle" };
  }

  return { kind: "valid" };
}
