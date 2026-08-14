import { LOCAL_TEAM_PROFILES } from "../content/localTeams";
import { vehicleById } from "../content/entrants";
import {
  deriveEligibleSetupControls,
  lockRaceSetup,
} from "./raceSetup";
import { resolveRivalBuild, selectGeneratedRivalSetup } from "./rivals";
import type { Run } from "./run";
import type { Track } from "./tracks";
import type {
  LocalOpponentSnapshot,
  LocalRaceTier,
  LocalTeamProfile,
  LockedRaceSetup,
  RegionId,
  RivalProfile,
  SetupSelections,
} from "./types";

export type LocalCatalogValidation =
  | { kind: "valid" }
  | { kind: "invalid"; code: "wrong-count" | "wrong-region-count" | "duplicate-id" | "unknown-vehicle" | "missing-identity" };

export function validateLocalTeamCatalog(profiles: readonly LocalTeamProfile[]): LocalCatalogValidation {
  if (profiles.length !== 49) return { kind: "invalid", code: "wrong-count" };
  if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) {
    return { kind: "invalid", code: "duplicate-id" };
  }
  const counts = new Map<RegionId, number>();
  for (const profile of profiles) {
    counts.set(profile.regionId, (counts.get(profile.regionId) ?? 0) + 1);
    if (!vehicleById(profile.vehicleId)) return { kind: "invalid", code: "unknown-vehicle" };
    if (!profile.name.trim() || !profile.teamName.trim() || !profile.engineeringTendency.trim()) {
      return { kind: "invalid", code: "missing-identity" };
    }
  }
  if (counts.size !== 7 || [...counts.values()].some((count) => count !== 7)) {
    return { kind: "invalid", code: "wrong-region-count" };
  }
  return { kind: "valid" };
}

function occupiedSlots(tier: LocalRaceTier, legOrdinal: number): number {
  if (tier === "qualifier") return legOrdinal <= 2 ? 2 : 3;
  return legOrdinal <= 2 ? 3 : 4;
}

function asRivalProfile(profile: LocalTeamProfile, slotsToFill: number): RivalProfile {
  return {
    id: profile.id,
    name: profile.name,
    color: "#8a7657",
    vehicleId: profile.vehicleId,
    levelScaling: () => ({ slotsToFill, priceBias: slotsToFill <= 2 ? "low" : "mid" }),
  };
}

function balancedSetup(
  build: LocalOpponentSnapshot["build"],
  track: Track,
  encounterId: string,
): LockedRaceSetup {
  const eligibleControls = deriveEligibleSetupControls(build);
  const selections: SetupSelections = Object.fromEntries(
    eligibleControls.map((control) => [control.family, "balanced"]),
  );
  const locked = lockRaceSetup({
    run: {} as Run,
    encounterId,
    build,
    track,
    eligibleControls,
    initialSelections: selections,
  }, selections);
  if (!("controls" in locked)) throw new Error(`Could not lock Local setup: ${locked.kind}`);
  return locked;
}

export function localProfilesForRegion(regionId: RegionId): readonly LocalTeamProfile[] {
  return LOCAL_TEAM_PROFILES.filter((profile) => profile.regionId === regionId);
}

export function resolveLocalOpponentSnapshot(
  profile: LocalTeamProfile,
  tier: LocalRaceTier,
  legOrdinal: 1 | 2 | 3 | 4 | 5,
  seed: number,
  track: Track,
  encounterId: string,
): LocalOpponentSnapshot {
  const slots = occupiedSlots(tier, legOrdinal);
  const build = resolveRivalBuild(asRivalProfile(profile, slots), legOrdinal, seed);
  const setup = tier === "qualifier"
    ? balancedSetup(build, track, encounterId)
    : selectGeneratedRivalSetup(build, track, { encounterId, lapCount: 16 });
  return {
    profileId: profile.id,
    regionId: profile.regionId,
    localRaceTier: tier,
    legOrdinal,
    build,
    setup,
    provenance: "authored-local",
  };
}

export function resolveLocalField(
  regionId: RegionId,
  tier: LocalRaceTier,
  legOrdinal: 1 | 2 | 3 | 4 | 5,
  seed: number,
  track: Track,
  encounterId: string,
): readonly LocalOpponentSnapshot[] {
  const profiles = localProfilesForRegion(regionId);
  if (profiles.length !== 7) throw new Error(`Region ${regionId} does not have seven Local teams`);
  return profiles.map((profile, index) => resolveLocalOpponentSnapshot(
    profile, tier, legOrdinal, seed + index * 1009, track, `${encounterId}-${profile.id}`,
  ));
}
