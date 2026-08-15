import { ENTRANTS, vehicleForEntrant } from "../../src/content/entrants";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { generateTrack } from "../../src/simulation/tracks";
import type { Track } from "../../src/simulation/tracks";
import {
  RACE_SETUP_RULES_VERSION,
  type Build,
  type ItemDefinition,
  type ItemPhysicsContribution,
  type LockedRaceSetup,
  type Origin,
  type RivalProfile,
  type VehicleBuild,
  type VehicleId,
} from "../../src/simulation/types";
import { testItem, vehicleBuild } from "./vehicle-build-fixtures";

/**
 * Feature 033 Phase 1 (T002): immutable deterministic baseline fixtures.
 *
 * Deliberately independent of the shipped launch item catalog, matching the
 * `race-setup-fixtures.ts` convention. Every build here is a frozen constant so a
 * later enrichment pass cannot mutate shared input — identical inputs must replay
 * identically (033 contract §2).
 */

/** Deep-freeze an object graph so fixtures are genuinely immutable. */
function freeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const key of Object.getOwnPropertyNames(value)) {
    freeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

/** Supported race lengths (defines the exact phase-coverage domain, T008). */
export const ENRICHMENT_LAP_COUNTS = freeze([8, 10, 12, 14, 16]);

/** Representative deterministic contest seeds for corpus resolution. */
export const ENRICHMENT_SEEDS = freeze([1, 7, 42, 1337, 9001]);

/** The four player entrants; each maps to one authored origin/vehicle. */
export const ENRICHMENT_ENTRANTS = freeze(ENTRANTS.map((entrant) => entrant.id));

/** Level used by every baseline fixture so track/seed identity stays reproducible. */
export const ENRICHMENT_LEVEL = 1;

/** The default player: Evelyn Mercer, the coachworks Highwheel. */
export const DEFAULT_ENTRANT_ID = "evelyn-mercer";
export const DEFAULT_VEHICLE_ID = vehicleForEntrant(DEFAULT_ENTRANT_ID)!.id;
export const DEFAULT_ORIGIN: Origin = "coachworks";
export const FOREIGN_ORIGIN: Origin = "fieldworks";

function emptyVia(vehicleId: VehicleId): VehicleBuild {
  return vehicleBuild([], [], vehicleId);
}

/** Entry-point kit: no installed parts. Baseline strongest-control-free build. */
export const baselineEmptyBuild = freeze(emptyVia(DEFAULT_VEHICLE_ID));

/**
 * A synthetic immutable item carrying only physical-stat deltas. Kept inert for
 * installation behavior (testItem default) so a fixture's race effect is exactly
 * its authored physics, independent of Fitted/Improvised.
 */
export function racerItem(
  id: string,
  name: string,
  origin: Origin,
  physics: ItemPhysicsContribution,
): ItemDefinition {
  return freeze(testItem({ id, name, price: 0, timeModifier: 0, origin, physics }));
}

/** Fully native cornering build — every item from the player's own origin. */
export const nativeCornerBuild = freeze(
  vehicleBuild([
    racerItem("fixture-native-corner-a", "Native Corner A", DEFAULT_ORIGIN, { corneringSpeedDelta: 12 }),
    racerItem("fixture-native-corner-b", "Native Corner B", DEFAULT_ORIGIN, { corneringSpeedDelta: 10 }),
  ]),
);

/** Fully foreign cornering build — every item from a different origin. */
export const foreignCornerBuild = freeze(
  vehicleBuild([
    racerItem("fixture-foreign-corner-a", "Foreign Corner A", FOREIGN_ORIGIN, { corneringSpeedDelta: 12 }),
    racerItem("fixture-foreign-corner-b", "Foreign Corner B", FOREIGN_ORIGIN, { corneringSpeedDelta: 10 }),
  ]),
);

/** Mixed-origin cornering build — same total stat as the native/foreign pair. */
export const mixedCornerBuild = freeze(
  vehicleBuild([
    racerItem("fixture-mixed-corner-a", "Mixed Native Corner", DEFAULT_ORIGIN, { corneringSpeedDelta: 12 }),
    racerItem("fixture-mixed-corner-b", "Mixed Foreign Corner", FOREIGN_ORIGIN, { corneringSpeedDelta: 10 }),
  ]),
);

/** Clearly stronger all-round build — enrichment must not routinely reverse it. */
export const strongBuild = freeze(
  vehicleBuild([
    racerItem("fixture-strong-accel", "Strong Accel", DEFAULT_ORIGIN, { accelerationDelta: 20 }),
    racerItem("fixture-strong-top", "Strong Top Speed", DEFAULT_ORIGIN, { topSpeedDelta: 20 }),
    racerItem("fixture-strong-brake", "Strong Brake", DEFAULT_ORIGIN, { brakingPowerDelta: 15 }),
    racerItem("fixture-strong-corner", "Strong Corner", DEFAULT_ORIGIN, { corneringSpeedDelta: 15 }),
  ]),
);

/** Clearly weaker all-round build, raced against the same field. */
export const weakBuild = freeze(
  vehicleBuild([
    racerItem("fixture-weak-accel", "Weak Accel", DEFAULT_ORIGIN, { accelerationDelta: 3 }),
    racerItem("fixture-weak-top", "Weak Top Speed", DEFAULT_ORIGIN, { topSpeedDelta: 3 }),
    racerItem("fixture-weak-brake", "Weak Brake", DEFAULT_ORIGIN, { brakingPowerDelta: 3 }),
    racerItem("fixture-weak-corner", "Weak Corner", DEFAULT_ORIGIN, { corneringSpeedDelta: 3 }),
  ]),
);

/** All four cornering-profile builds share the same resolved cornering total. */
export const corneringEquivalentBuilds: ReadonlyArray<readonly [string, Build]> = freeze([
  ["native", nativeCornerBuild],
  ["foreign", foreignCornerBuild],
  ["mixed", mixedCornerBuild],
]);

/**
 * Named baseline build profiles referenced by the corpus runner. The pre-enrichment
 * winner-prediction gate compares `strong` vs `weak` over shared seeds.
 */
export type BaselineBuildProfile =
  | "empty"
  | "native-corner"
  | "foreign-corner"
  | "mixed-corner"
  | "strong"
  | "weak";

export const BASELINE_BUILD_PROFILES: Readonly<Record<BaselineBuildProfile, Build>> = freeze({
  "empty": baselineEmptyBuild,
  "native-corner": nativeCornerBuild,
  "foreign-corner": foreignCornerBuild,
  "mixed-corner": mixedCornerBuild,
  "strong": strongBuild,
  "weak": weakBuild,
});

/** The fixed 7-rival roster baseline (REQUIRED_RIVAL_COUNT = 7). */
export const racerRivalRoster: readonly RivalProfile[] = RIVAL_PROFILES;

/** A stable, deterministic authoritative track for enrichment fixtures. */
export function racerTrack(seed = ENRICHMENT_SEEDS[0], level = ENRICHMENT_LEVEL): Track {
  return generateTrack(seed, level);
}

/**
 * A balanced-only immutable `LockedRaceSetup` in the exact shape `lockRaceSetup`
 * returns (028 contract §3). Used only for retention/consumption baselines — the
 * pre-enrichment path never validates it.
 */
export function racerBalancedSetup(track: Track, encounterId = "fixture-encounter"): LockedRaceSetup {
  const zero: Required<ItemPhysicsContribution> = {
    accelerationDelta: 0,
    topSpeedDelta: 0,
    brakingPowerDelta: 0,
    corneringSpeedDelta: 0,
  };
  return freeze({
    rulesVersion: RACE_SETUP_RULES_VERSION,
    encounterId,
    trackId: track.id,
    controls: [
      freeze({
        family: "driver-aggression",
        position: "balanced",
        sourceItemIds: [],
        magnitude: 1,
        appliedDelta: { ...zero },
      }),
    ],
    totalDelta: { ...zero },
  });
}