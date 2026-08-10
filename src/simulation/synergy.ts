import type {
  ItemDefinition,
  SynergyApplication,
  SynergyCondition,
  SynergyEffect,
  SynergyResolution,
  SynergyTarget,
  VehicleBuild,
} from "./types";

/** Exported for garageItemInspector's live per-item display (US3) — the single source of "does this item match this target." */
export function matchesTarget(item: ItemDefinition, target: SynergyTarget): boolean {
  return target.kind === "tag"
    ? item.synergyTags.includes(target.tag)
    : item.installationCategory === target.category;
}

/**
 * The percent this condition contributes given a count of *other* matching
 * active items, or `null` when the condition is not met at all (no
 * application should be recorded — spec.md US1 AS2, "no boost anywhere").
 * Exported for garageItemInspector's live per-item display (US3).
 */
export function resolveConditionPercent(condition: SynergyCondition, otherMatchCount: number): number | null {
  if (condition.kind === "linear-per-count") {
    return otherMatchCount > 0 ? condition.percentPerMatch * otherMatchCount : null;
  }
  return otherMatchCount === condition.count ? condition.bonusPercent : null;
}

/**
 * Resolve every authored SynergyEffect across a build's actively installed
 * items into a per-slot net delta plus full attribution (contract §2).
 *
 * Pure and deterministic: identical build always returns a deeply equal
 * result. Reads only build.slots — build.storage is never inspected
 * (FR-005) — and a SynergyEffect's own source item never counts toward or
 * receives its own target (FR-006).
 */
export function resolveSynergyEffects(build: VehicleBuild): Map<string, SynergyResolution> {
  const activeEntries = build.slots.flatMap((slot) =>
    slot.item ? [{ slotId: slot.slotId, item: slot.item }] : []
  );

  const applicationsBySlot = new Map<string, SynergyApplication[]>();
  const addApplication = (slotId: string, application: SynergyApplication) => {
    const list = applicationsBySlot.get(slotId) ?? [];
    list.push(application);
    applicationsBySlot.set(slotId, list);
  };

  activeEntries.forEach(({ slotId: sourceSlotId, item: sourceItem }) => {
    (sourceItem.synergyEffects ?? []).forEach((effect: SynergyEffect) => {
      const others = activeEntries.filter((entry) => entry.slotId !== sourceSlotId);
      const matchingOthers = others.filter((entry) => matchesTarget(entry.item, effect.target));
      const appliedPercent = resolveConditionPercent(effect.condition, matchingOthers.length);
      if (appliedPercent === null) return;

      const application: SynergyApplication = {
        sourceItemId: sourceItem.id,
        target: effect.target,
        conditionKind: effect.condition.kind,
        appliedPercent,
        description: effect.description,
      };

      if (effect.appliesTo === "self") {
        addApplication(sourceSlotId, application);
      } else {
        matchingOthers.forEach((entry) => addApplication(entry.slotId, { ...application }));
      }
    });
  });

  return new Map(
    build.slots.map((slot) => {
      const applications = applicationsBySlot.get(slot.slotId) ?? [];
      return [
        slot.slotId,
        {
          appliedDeltaPercent: applications.reduce((sum, application) => sum + application.appliedPercent, 0),
          applications,
        },
      ];
    }),
  );
}
