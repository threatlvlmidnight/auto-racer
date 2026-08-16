import { LEGACY_ITEM_POOL } from "./legacy-item-pool";
import type { Build, OfferedItem } from "../../src/simulation/types";
import { vehicleBuild } from "./vehicle-build-fixtures";

const item = (id: string): OfferedItem => structuredClone(
  LEGACY_ITEM_POOL.find((candidate) => candidate.id === id)!,
);

export function emptyPracticeBuild(): Build {
  return vehicleBuild();
}

export function directRecurringPracticeBuild(): Build {
  return vehicleBuild([item("item-001"), item("item-002"), item("item-003")]);
}

export function buffDependentPracticeBuild(): Build {
  return vehicleBuild([item("item-001"), item("item-012"), item("item-014")], [item("item-013"), item("item-015"), item("item-004")]);
}

export function flatBuffPracticeBuild(): Build {
  return vehicleBuild([item("item-001"), item("item-012"), null]);
}

export function stackingBuffPracticeBuild(): Build {
  return vehicleBuild([item("item-001"), item("item-014"), null]);
}

export function countBuffPracticeBuild(): Build {
  return vehicleBuild([item("item-001"), item("item-015"), null], [item("item-004"), null, null]);
}

export function storageActivePracticeBuild(): Build {
  return vehicleBuild([], [item("item-013"), item("item-001"), null]);
}

export function positiveModifierPracticeBuild(): Build {
  return vehicleBuild([item("item-010"), null, null]);
}

export function tiePracticeBuild(): Build {
  return {
    ...emptyPracticeBuild(),
    car: { id: "tie-car", baseLapTime: 5.85 },
  };
}

export function minimumClampPracticeBuild(): Build {
  return vehicleBuild([{
      id: "minimum-clamp",
      name: "Minimum Clamp Fixture",
      rarity: "standard",
      price: 0,
      timeModifier: -20,
      cooldown: 1,
      origin: "fieldworks",
      installationCategory: "power",
      synergyTags: [],
      fittedBehavior: { kind: "none", description: "Fixture: no additional Fitted effect." },
      improvisedBehavior: { kind: "none", description: "Fixture: no additional consequence." },
    }, null, null]);
}

export const controlledPracticeBuilds = {
  empty: emptyPracticeBuild,
  direct: directRecurringPracticeBuild,
  buff: buffDependentPracticeBuild,
} as const;