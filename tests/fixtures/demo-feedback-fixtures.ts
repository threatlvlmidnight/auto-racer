import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import type { EntrantId, ItemDefinition } from "../../src/simulation/types";

/**
 * Feature 032 T002: catalog-backed deterministic fixtures for the demo
 * feedback pass. Every fixture is a real shipped catalog item looked up by
 * id — never a synthesized copy — so classification, presentation, and
 * economy work in US1-US4 is always exercised against authored content.
 * Lookup fails loudly (throw) if the catalog ever drops one of these items.
 */

const ALL_CATALOG_ITEMS: readonly ItemDefinition[] = [
  ...NEUTRAL_ITEMS,
  ...Object.values(EXCLUSIVE_ITEMS).flat(),
];

function requireCatalogItem(id: string): ItemDefinition {
  const item = ALL_CATALOG_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`demo-feedback-fixtures: catalog item ${id} is missing`);
  return item;
}

/** Direct physics item — flat authored stat delta, no buff/synergy engine. */
export const directFixture = requireCatalogItem("neutral-forged-pistons");

/** Flat stat-targeted amplifier (always-on buff on a physical stat). */
export const amplifierFixture = requireCatalogItem("rook-instrumented-cooling-jacket");

/**
 * Composition scaling: synergy whose magnitude is a linear count of other
 * held items sharing a tag — the clarified Variable-Pitch Propeller rule
 * (+15% top-speed effect per other held `airflow` item).
 */
export const compositionScaledFixture = requireCatalogItem("rook-variable-pitch-propeller");

/** Composition scaling via the count-synergy buff engine (`perCount`). */
export const countSynergyBuffFixture = requireCatalogItem("rook-calibrated-pressure-manifold");

/** Fitted-build-value scaling: boost scales with summed fitted item price. */
export const fittedValueScaledFixture = requireCatalogItem("mercer-appraisers-ledger");

/** Cooldown/lap-activation: stacking stat buff firing every N laps. */
export const cooldownLapFixture = requireCatalogItem("voss-auxiliary-starting-tank");

/** Exact-count synergy (threshold relationship, not linear-per-count). */
export const exactCountSynergyFixture = requireCatalogItem("rook-interchangeable-test-mounts");

/** The three authored economy items (US4 completion targets). */
export const economyFixtures = {
  bookmakersChit: requireCatalogItem("neutral-bookmakers-chit"),
  engineBuildersNameplate: requireCatalogItem("neutral-engine-builders-nameplate"),
  patronsBrassPlaque: requireCatalogItem("neutral-patrons-brass-plaque"),
} as const;

/** Configurable setup control carrier (equipment-derived control). */
export const configurableFixture = requireCatalogItem("rook-differential-braking-valve");

/** One entrant per pool, stable order, for catalog-wide audits. */
export const ENTRANT_IDS: readonly EntrantId[] = [
  "evelyn-mercer",
  "lucien-soto",
  "inez-rook",
  "nell-voss",
];

/** Every shipped catalog item exactly once, in stable pool order. */
export const fullCatalogFixture: readonly ItemDefinition[] = ALL_CATALOG_ITEMS;

/** Fixture sanity: the shipped catalog count the spec's audit tasks assume. */
export const EXPECTED_CATALOG_SIZE = 70;
