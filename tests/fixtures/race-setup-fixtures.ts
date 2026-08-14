import { generateTrack } from "../../src/simulation/tracks";
import type { Track } from "../../src/simulation/tracks";
import { testItem, vehicleBuild } from "./vehicle-build-fixtures";
import type { ItemDefinition, SetupControlFamily, VehicleBuild } from "../../src/simulation/types";

/**
 * Feature 028: reusable synthetic fixtures for the pre-race setup domain.
 * These are deliberately independent of the real launch item catalog (Phase
 * 5 authors that separately) — every fixture item here carries only a bare
 * `configurableSetup` effect so setup-domain tests never depend on Phase 5
 * authoring content.
 */

export function setupFixtureItem(
  id: string,
  family: Exclude<SetupControlFamily, "driver-aggression">,
): ItemDefinition {
  return testItem({
    id,
    name: id,
    price: 0,
    timeModifier: 0,
    configurableSetup: { family, magnitude: 1 },
  });
}

/** No installed configurable item — only Driver Aggression is eligible. */
export function zeroConfigurableBuild(): VehicleBuild {
  return vehicleBuild([]);
}

/** Exactly one installed configurable item, enabling one equipment family. */
export function oneConfigurableBuild(
  family: Exclude<SetupControlFamily, "driver-aggression"> = "brake-balance",
): VehicleBuild {
  return vehicleBuild([setupFixtureItem(`fixture-${family}-a`, family)]);
}

/** Two installed items sharing one control family — aggregates into one control, magnitude 2. */
export function twoSameFamilyBuild(
  family: Exclude<SetupControlFamily, "driver-aggression"> = "brake-balance",
): VehicleBuild {
  return vehicleBuild([
    setupFixtureItem(`fixture-${family}-a`, family),
    setupFixtureItem(`fixture-${family}-b`, family),
  ]);
}

/** One installed item in storage only — grants no eligibility. */
export function storedOnlyConfigurableBuild(
  family: Exclude<SetupControlFamily, "driver-aggression"> = "brake-balance",
): VehicleBuild {
  return vehicleBuild([], [setupFixtureItem(`fixture-${family}-stored`, family)]);
}

/** Four distinct installed equipment families — the natural per-vehicle maximum alongside Driver Aggression. */
export function fourDistinctFamilyBuild(): VehicleBuild {
  return vehicleBuild([
    setupFixtureItem("fixture-brake-balance", "brake-balance"),
    setupFixtureItem("fixture-steering-response", "steering-response"),
    setupFixtureItem("fixture-gearing", "gearing"),
    setupFixtureItem("fixture-propeller-pitch", "propeller-pitch"),
  ]);
}

/** A stable, deterministic authoritative track for setup-domain fixtures. */
export function setupFixtureTrack(seed = 1, level = 1): Track {
  return generateTrack(seed, level);
}
