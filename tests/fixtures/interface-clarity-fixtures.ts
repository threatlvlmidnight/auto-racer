import { generateTrack } from "../../src/simulation/tracks";
import type { Track } from "../../src/simulation/tracks";
import { testItem, vehicleBuild } from "./vehicle-build-fixtures";
import { configurableFixture, fullCatalogFixture } from "./demo-feedback-fixtures";
import type {
  ItemDefinition,
  RaceKind,
  RegionId,
  SetupSelections,
  VehicleBuild,
} from "../../src/simulation/types";

/**
 * Feature 035 — deterministic presentation fixtures (tasks.md T002 and
 * Phase 2 red tests). These synthesize stable region/scored-result/Test Day,
 * configurable vs non-configurable item, mixed-card, duplicate-upgrade,
 * long-copy, and reduced-motion inputs WITHOUT touching any authority:
 * every value is display evidence only.
 */

/** A minimal stable track identity (never regenerated geometry). */
export const identityTrack: Pick<Track, "id" | "name"> = {
  id: "fixture-track-01",
  name: "Fixture Test Circuit",
};

/** Full geometry track (from an existing deterministic generator) for setup host tests. */
export const fixtureGeometryTrack: Track = generateTrack(1, 1);

/** Scored-race stage context in a known region. */
export const britishIslesStage: { regionId: RegionId; raceKind: RaceKind } = {
  regionId: "british-isles",
  raceKind: "local",
};

/** Scored-race stage context with NO region (legacy/missing evidence). */
export const missingRegionStage: { raceKind: RaceKind } = { raceKind: "championship" };

/** A real shipped configurable item (rook-differential-braking-valve). */
export const configurableItem: ItemDefinition = configurableFixture;

/** A non-configurable shipped item (neutral-forged-pistons), never Adjustable. */
export const nonConfigurableItem: ItemDefinition = (() => {
  const fixture = requireCatalog("neutral-forged-pistons");
  return fixture;
})();

function requireCatalog(id: string): ItemDefinition {
  const item = fullCatalogFixture.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`interface-clarity-fixtures: missing catalog item ${id}`);
  return item;
}

/** Installed configurable item + stored configurable — real setup eligibility. */
export function adjustableBuild(): VehicleBuild {
  return vehicleBuild([configurableFixture], [storedConfigurableItem]);
}

/** A stored-only configurable item (never Adjustable — stored = absent). */
export const storedConfigurableItem: ItemDefinition = requireCatalog("rook-gyroscopic-stabilizer");

/** Mixed-rarity card fixture: one item per rarity. */
export function mixedRarityCards(): readonly ItemDefinition[] {
  return [
    requireCatalog("neutral-copper-core-radiator"), // standard
    requireCatalog("neutral-forged-pistons"), // notable
    requireCatalog("neutral-trackside-tachometer"), // rare
  ];
}

/** Duplicate-upgrade fixture: two copies of the same held+offered item. */
export const duplicateUpgradePair: readonly ItemDefinition[] = [
  requireCatalog("rook-differential-braking-valve"),
  requireCatalog("rook-differential-braking-valve"),
];

/** Long authored-copy item (longest description in the catalog). */
export const longCopyItem: ItemDefinition = requireCatalog("rook-variable-pitch-propeller");

/** Representative setup selections (brake-balance -> high) for Adjustable value labels. */
export const representativeSelections: SetupSelections = { "brake-balance": "high" };

/** Reduced-motion flag reused across card tests. */
export const REDUCED_MOTION = true as const;

/** A synthetic configurable fixture for controls not present in the shipped pool. */
export function syntheticConfigurableItem(family: string): ItemDefinition {
  return testItem({
    id: `fixture-${family}`,
    name: `Fixture ${family}`,
    price: 0,
    timeModifier: 0,
    configurableSetup: { family: family as Exclude<import("../../src/simulation/types").SetupControlFamily, "driver-aggression">, magnitude: 1 },
  });
}
