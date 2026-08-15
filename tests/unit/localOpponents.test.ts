import { describe, expect, it } from "vitest";
import { LOCAL_TEAM_PROFILES } from "../../src/content/localTeams";
import { SELECTABLE_REGION_IDS } from "../../src/content/regions";
import {
  localProfilesForRegion,
  localRivalRoster,
  resolveLocalField,
  validateLocalTeamCatalog,
} from "../../src/simulation/localOpponents";
import { generateTrack } from "../../src/simulation/tracks";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { resolveContest } from "../../src/simulation/contest";

describe("Local team catalog", () => {
  it("contains seven complete unique profiles for all six regions and Paris", () => {
    expect(validateLocalTeamCatalog(LOCAL_TEAM_PROFILES)).toEqual({ kind: "valid" });
    expect(LOCAL_TEAM_PROFILES).toHaveLength(49);
    for (const region of [...SELECTABLE_REGION_IDS, "paris-exhibition"] as const) {
      expect(localProfilesForRegion(region)).toHaveLength(7);
    }
  });
});

describe("Local opponent snapshots", () => {
  const track = generateTrack(1901, 1);

  it("uses visible legal slot bands and Balanced setup for Qualifiers", () => {
    const early = resolveLocalField("british-isles", "qualifier", 1, 42, track, "local-q1");
    const late = resolveLocalField("british-isles", "qualifier", 4, 42, track, "local-q4");
    expect(early.every((snapshot) => snapshot.build.slots.filter((slot) => slot.item).length === 2)).toBe(true);
    expect(late.every((snapshot) => snapshot.build.slots.filter((slot) => slot.item).length === 3)).toBe(true);
    expect(early.flatMap((snapshot) => snapshot.setup.controls).every((control) => control.position === "balanced")).toBe(true);
  });

  it("upgrades the same seven profiles for Challenges with deterministic track-aware legal setup", () => {
    const qualifier = resolveLocalField("south-america", "qualifier", 3, 73, track, "qualifier");
    const challenge = resolveLocalField("south-america", "challenge", 3, 73, track, "challenge");
    expect(challenge.map((snapshot) => snapshot.profileId)).toEqual(qualifier.map((snapshot) => snapshot.profileId));
    expect(challenge.every((snapshot) => snapshot.build.slots.filter((slot) => slot.item).length === 4)).toBe(true);
    expect(challenge.every((snapshot) => snapshot.build.slots.some((slot) => slot.item && slot.tier === 2))).toBe(true);
    expect(challenge.every((snapshot) => snapshot.build.slots.every((slot) => slot.tier !== 3))).toBe(true);
    expect(resolveLocalField("south-america", "challenge", 3, 73, track, "challenge")).toEqual(challenge);
  });

  it("passes all seven prelocked Local setups through the shared N-car contest resolver", () => {
    const snapshots = resolveLocalField("northern-europe", "qualifier", 1, 91, track, "local-shared");
    const result = resolveContest(
      createEmptyVehicleBuild("the-highwheel"),
      localRivalRoster("northern-europe", "qualifier", 1),
      1,
      91,
      8,
      undefined,
      "local-shared",
      snapshots.map((snapshot) => snapshot.setup),
    );
    const rivalSetups = result.tieBreakOrder.slice(1).map((id) => result.cars.find((car) => car.id === id)!.setup);
    expect(rivalSetups).toEqual(snapshots.map((snapshot) => snapshot.setup));
  });
});
