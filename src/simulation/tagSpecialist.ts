import { buildWorkshopModification } from "../content/itemModifications";
import { offeredModificationsFor } from "./itemModifications";
import { enumerateInstances } from "./itemInstances";
import type { InstanceBuild, ItemDefinition, WorkshopModification } from "./types";

/**
 * Tag Specialist — a late-run, build-responsive cross-origin same-tag shop
 * (034 tasks T059/T061/T062/T063, spec FR-048). Eligible during the final four
 * choice stages when at least two held items (vehicle + storage) share a tag.
 * Stocks three matching cross-origin items; exactly one entry carries a
 * compatible modification and costs normal price + 2. All modifications and
 * prices are visible before purchase.
 */

export const TAG_SPECIALIST_ELIGIBLE_WINDOW = 4; // final four choice stages
export const TAG_SPECIALIST_MODIFIED_PREMIUM = 2;

export interface HeldTagCount {
  tag: string;
  heldCount: number;
}

function resolveDefinitions(definitions: readonly ItemDefinition[]): Map<string, ItemDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

/** Counts held items sharing each tag across slots + storage (T060). */
export function heldTagCounts(
  build: InstanceBuild,
  definitions: readonly ItemDefinition[],
): readonly HeldTagCount[] {
  const catalog = resolveDefinitions(definitions);
  const counts = new Map<string, number>();
  enumerateInstances(build).forEach((entry) => {
    const definition = catalog.get(entry.instance.definitionId);
    if (!definition) return;
    definition.synergyTags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([tag, heldCount]) => ({ tag, heldCount }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Tags held by at least two items across the build — the eligibility gate (FR-048). */
export function qualifyingTags(
  build: InstanceBuild,
  definitions: readonly ItemDefinition[],
): readonly string[] {
  return heldTagCounts(build, definitions)
    .filter((entry) => entry.heldCount >= 2)
    .map((entry) => entry.tag);
}

export interface TagStockEntry {
  entryId: string;
  definitionId: string;
  item: ItemDefinition;
  normalPrice: number;
  /** normal price, +2 when this entry carries a modification. */
  price: number;
  modification: WorkshopModification | null;
  modified: boolean;
}

function entry(
  entryId: string,
  definition: ItemDefinition,
  modification: WorkshopModification | null,
): TagStockEntry {
  const modified = modification !== null;
  return {
    entryId,
    definitionId: definition.id,
    item: definition,
    normalPrice: definition.price,
    price: definition.price + (modified ? TAG_SPECIALIST_MODIFIED_PREMIUM : 0),
    modification,
    modified,
  };
}

/**
 * Produces three deterministic stock entries for a selected tag, drawing only
 * from cross-origin definitions carrying that tag. Exactly one entry is
 * modified (compatible, non-no-op) and priced `normalPrice + 2` (FR-048).
 */
export function generateTagSpecialistStock(
  tag: string,
  crossOriginPool: readonly ItemDefinition[],
  rng: () => number,
  appliedAtStage: number,
  seedDomain: string,
): readonly TagStockEntry[] {
  const pool = crossOriginPool.filter(
    (definition) => definition.synergyTags.includes(tag) || definition.identityTag === tag,
  );
  if (pool.length < 3) return [];

  const order = shuffle(pool, rng, hash(`${seedDomain}:${tag}`));
  const selected = order.slice(0, 3);
  const modifiable = selected.filter((definition) => offeredModificationsFor(definition).length > 0);

  const chosenModifiedDefinition = modifiable.length > 0 ? order[0] : null;
  const chosenModification = chosenModifiedDefinition
    ? offeredModificationsFor(chosenModifiedDefinition)[0]
    : null;

  // At least one entry must be modified; place it on the first modifiable one.
  const modifiedId = chosenModifiedDefinition?.id ?? null;
  const modificationByDefinition = new Map<string, WorkshopModification>();
  if (chosenModification && modifiedId) {
    const concrete = buildWorkshopModification(
      chosenModification.modificationId,
      `seed-${seedDomain}`,
      appliedAtStage,
    );
    modificationByDefinition.set(modifiedId, concrete);
  }

  return selected.map((definition, index) =>
    entry(`tag-stock-${seedDomain}-${index}`, definition, modificationByDefinition.get(definition.id) ?? null),
  );
}

function hash(input: string): number {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) {
    value = (Math.imul(31, value) + input.charCodeAt(i)) | 0;
  }
  return value >>> 0;
}

function shuffle<T>(items: readonly T[], rng: () => number, salt: number): readonly T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor((rng() + salt) % (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
