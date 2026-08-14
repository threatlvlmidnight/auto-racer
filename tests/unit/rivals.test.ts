import { describe, expect, it } from "vitest";
import { vehicleById } from "../../src/content/entrants";
import { GHOST_POOL, RIVAL_PROFILES, validateGhostPool, validateRivalCatalog } from "../../src/content/rivals";
import { resolveRivalBuild, selectGeneratedRivalSetup, selectGhostRoster } from "../../src/simulation/rivals";
import { installedItems, storedItems } from "../../src/simulation/slots";
import { poolForRival } from "../../src/simulation/itemPools";
import { deriveEligibleSetupControls, lockRaceSetup } from "../../src/simulation/raceSetup";
import { simulatePlayerLaps } from "../../src/simulation/laps";
import { generateTrack } from "../../src/simulation/tracks";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { fourDistinctFamilyBuild, zeroConfigurableBuild } from "../fixtures/race-setup-fixtures";
import type { Run } from "../../src/simulation/run";
import type { LockedRaceSetup, SetupSelections } from "../../src/simulation/types";

describe("RIVAL_PROFILES catalog (FR-004)", () => {
  it("authors exactly 7 profiles", () => {
    expect(RIVAL_PROFILES).toHaveLength(7);
  });

  it("gives every profile a unique id", () => {
    const ids = RIVAL_PROFILES.map((profile) => profile.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every profile's vehicleId to an existing vehicle definition", () => {
    RIVAL_PROFILES.forEach((profile) => {
      expect(vehicleById(profile.vehicleId)).toBeDefined();
    });
  });

  it("validates as a valid catalog", () => {
    expect(validateRivalCatalog(RIVAL_PROFILES)).toEqual({ kind: "valid" });
  });

  it("fails loudly on a duplicate id", () => {
    const broken = [...RIVAL_PROFILES.slice(0, 6), { ...RIVAL_PROFILES[6], id: RIVAL_PROFILES[0].id }];
    expect(validateRivalCatalog(broken)).toEqual({ kind: "invalid", code: "duplicate-id" });
  });

  it("fails loudly on an unresolvable vehicleId", () => {
    const broken = [
      ...RIVAL_PROFILES.slice(0, 6),
      { ...RIVAL_PROFILES[6], vehicleId: "not-a-real-vehicle" as never },
    ];
    expect(validateRivalCatalog(broken)).toEqual({ kind: "invalid", code: "unknown-vehicle" });
  });

  it("fails loudly on a catalog that is not exactly 7 profiles", () => {
    expect(validateRivalCatalog(RIVAL_PROFILES.slice(0, 6))).toEqual({
      kind: "invalid",
      code: "wrong-count",
    });
  });
});

describe("resolveRivalBuild determinism (FR-005)", () => {
  const profile = RIVAL_PROFILES[0];

  it("produces a deeply equal build across repeated calls with identical arguments", () => {
    const first = resolveRivalBuild(profile, 1, 42);
    const second = resolveRivalBuild(profile, 1, 42);
    expect(second).toEqual(first);
  });

  it("resolves into the profile's own named vehicle topology", () => {
    const build = resolveRivalBuild(profile, 1, 42);
    const vehicle = vehicleById(profile.vehicleId)!;
    expect(build.vehicleId).toBe(profile.vehicleId);
    expect(build.slots).toHaveLength(vehicle.slots.length);
    build.slots.forEach((slot, index) => {
      expect(slot.slotId).toBe(vehicle.slots[index].id);
      expect(slot.slotType).toBe(vehicle.slots[index].type);
    });
  });

  it("installs items only from each profile's Neutral plus own-entrant pool", () => {
    GHOST_POOL.forEach((candidate) => {
      const build = resolveRivalBuild(candidate, 4, 7);
      const eligibleIds = new Set(poolForRival(candidate.vehicleId).map((item) => item.id));
      const installed = [...installedItems(build), ...storedItems(build)].filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );
      expect(installed.length).toBeGreaterThan(0);
      installed.forEach((item) => expect(eligibleIds.has(item.id), `${candidate.id}: ${item.id}`).toBe(true));
    });
  });

  it("produces different builds for different seeds at the same level", () => {
    const a = resolveRivalBuild(profile, 1, 1);
    const b = resolveRivalBuild(profile, 1, 2);
    expect(a).not.toEqual(b);
  });

  it("never reads unseeded randomness (two independent resolutions of every profile agree)", () => {
    RIVAL_PROFILES.forEach((candidate) => {
      const first = resolveRivalBuild(candidate, 2, 99);
      const second = resolveRivalBuild(candidate, 2, 99);
      expect(second).toEqual(first);
    });
  });
});

describe("resolveRivalBuild level-scaling (US3, FR-004)", () => {
  const profile = RIVAL_PROFILES[0];

  it("fills strictly more of the vehicle at a higher level than a lower one", () => {
    const low = resolveRivalBuild(profile, 1, 5);
    const high = resolveRivalBuild(profile, 2, 5);
    const countFilled = (build: typeof low) =>
      [...installedItems(build), ...storedItems(build)].filter((item) => item !== null).length;

    expect(countFilled(high)).toBeGreaterThan(countFilled(low));
  });

  it("produces a defined, bounded result below the authored level range", () => {
    expect(() => resolveRivalBuild(profile, 0, 5)).not.toThrow();
    expect(() => resolveRivalBuild(profile, -5, 5)).not.toThrow();
  });

  it("produces a defined, bounded result above the authored level range", () => {
    expect(() => resolveRivalBuild(profile, 99, 5)).not.toThrow();
    const build = resolveRivalBuild(profile, 99, 5);
    const filled = [...installedItems(build), ...storedItems(build)].filter((item) => item !== null);
    expect(filled.length).toBeLessThanOrEqual(build.slots.length + build.storage.length);
  });

  it("resolves correctly for pvpOrdinal 3 and 4 (017-season-structure-grow US2, FR-005), continuing the increasing fill trend", () => {
    const countFilled = (build: ReturnType<typeof resolveRivalBuild>) =>
      [...installedItems(build), ...storedItems(build)].filter((item) => item !== null).length;

    expect(() => resolveRivalBuild(profile, 3, 5)).not.toThrow();
    expect(() => resolveRivalBuild(profile, 4, 5)).not.toThrow();
    expect(countFilled(resolveRivalBuild(profile, 3, 5))).toBeGreaterThanOrEqual(countFilled(resolveRivalBuild(profile, 2, 5)));
    expect(countFilled(resolveRivalBuild(profile, 4, 5))).toBeGreaterThanOrEqual(countFilled(resolveRivalBuild(profile, 3, 5)));
  });
});

// 019-async-ghost-pool: GHOST_POOL is a new, separate, additive catalog —
// RIVAL_PROFILES itself is never widened (T002, research.md Decision 1).
describe("GHOST_POOL catalog (T002, contract §1)", () => {
  it("contains every RIVAL_PROFILES entry, unchanged, as its own leading prefix", () => {
    expect(GHOST_POOL.slice(0, RIVAL_PROFILES.length)).toEqual(RIVAL_PROFILES);
  });

  it("contains at least one entry beyond RIVAL_PROFILES", () => {
    expect(GHOST_POOL.length).toBeGreaterThan(RIVAL_PROFILES.length);
  });

  it("leaves RIVAL_PROFILES itself byte-for-byte identical — still exactly 7, still valid", () => {
    expect(RIVAL_PROFILES).toHaveLength(7);
    expect(validateRivalCatalog(RIVAL_PROFILES)).toEqual({ kind: "valid" });
  });

  it("gives every GHOST_POOL entry a unique id", () => {
    const ids = GHOST_POOL.map((profile) => profile.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every new entry's vehicleId to an existing vehicle definition", () => {
    GHOST_POOL.forEach((profile) => {
      expect(vehicleById(profile.vehicleId)).toBeDefined();
    });
  });
});

describe("validateGhostPool (T003, contract §2)", () => {
  it("validates GHOST_POOL itself", () => {
    expect(validateGhostPool(GHOST_POOL)).toEqual({ kind: "valid" });
  });

  it("fails on fewer than 7 entries", () => {
    expect(validateGhostPool(GHOST_POOL.slice(0, 6))).toEqual({ kind: "invalid", code: "wrong-count" });
  });

  it("accepts more than 7 entries — a minimum, not an exact count", () => {
    expect(GHOST_POOL.length).toBeGreaterThan(7);
    expect(validateGhostPool(GHOST_POOL)).toEqual({ kind: "valid" });
  });

  it("fails loudly on a duplicate id", () => {
    const broken = [...GHOST_POOL.slice(0, -1), { ...GHOST_POOL[GHOST_POOL.length - 1], id: GHOST_POOL[0].id }];
    expect(validateGhostPool(broken)).toEqual({ kind: "invalid", code: "duplicate-id" });
  });

  it("fails loudly on an unresolvable vehicleId", () => {
    const broken = [
      ...GHOST_POOL.slice(0, -1),
      { ...GHOST_POOL[GHOST_POOL.length - 1], vehicleId: "not-a-real-vehicle" as never },
    ];
    expect(validateGhostPool(broken)).toEqual({ kind: "invalid", code: "unknown-vehicle" });
  });

  it("never modifies validateRivalCatalog's own exactly-7 behavior", () => {
    expect(validateRivalCatalog(GHOST_POOL)).toEqual({ kind: "invalid", code: "wrong-count" });
  });
});

// 019-async-ghost-pool: selectGhostRoster (T007-T010, T016, contract §3).
describe("selectGhostRoster determinism (T007, FR-002)", () => {
  it("returns a deeply equal result for identical (pool, seed, level)", () => {
    const first = selectGhostRoster(GHOST_POOL, 17, 2);
    const second = selectGhostRoster(GHOST_POOL, 17, 2);
    expect(second).toEqual(first);
  });

  it("agrees across a wide sample of (seed, level) pairs", () => {
    for (let seed = -5; seed <= 5; seed += 1) {
      const a = selectGhostRoster(GHOST_POOL, seed, 3);
      const b = selectGhostRoster(GHOST_POOL, seed, 3);
      expect(b).toEqual(a);
    }
  });
});

describe("selectGhostRoster distinctness (T008, FR-002)", () => {
  it("always returns exactly 7 entries with no duplicate id", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const roster = selectGhostRoster(GHOST_POOL, seed, 1);
      expect(roster).toHaveLength(7);
      expect(new Set(roster.map((profile) => profile.id)).size).toBe(7);
    }
  });

  it("every selected entry is a real GHOST_POOL member", () => {
    const roster = selectGhostRoster(GHOST_POOL, 9, 4);
    const poolIds = new Set(GHOST_POOL.map((profile) => profile.id));
    roster.forEach((profile) => expect(poolIds.has(profile.id)).toBe(true));
  });
});

describe("selectGhostRoster variety (T009, FR-002)", () => {
  it("selects different combinations for different (seed, level) pairs — not always the first 7", () => {
    const rosters = Array.from({ length: 15 }, (_, seed) =>
      selectGhostRoster(GHOST_POOL, seed, 1).map((profile) => profile.id).join(","));
    expect(new Set(rosters).size).toBeGreaterThan(1);
  });

  it("is not always identical to RIVAL_PROFILES' own fixed order", () => {
    const rosters = Array.from({ length: 15 }, (_, seed) =>
      selectGhostRoster(GHOST_POOL, seed, 1).map((profile) => profile.id).join(","));
    const fixedOrder = RIVAL_PROFILES.map((profile) => profile.id).join(",");
    expect(rosters.some((roster) => roster !== fixedOrder)).toBe(true);
  });
});

describe("selectGhostRoster still resolves through resolveRivalBuild unchanged (T010)", () => {
  it("a selected entry resolves into a real VehicleBuild exactly as any RivalProfile does", () => {
    const roster = selectGhostRoster(GHOST_POOL, 3, 2);
    const build = resolveRivalBuild(roster[0], 2, 3);
    const vehicle = vehicleById(roster[0].vehicleId)!;
    expect(build.vehicleId).toBe(roster[0].vehicleId);
    expect(build.slots).toHaveLength(vehicle.slots.length);
  });
});

describe("selectGhostRoster non-coupling signature (T016, FR-003/FR-005)", () => {
  it("is called successfully with only (pool, seed, level) — no Run, Build, or player-identity value anywhere", () => {
    const pool: readonly (typeof GHOST_POOL)[number][] = GHOST_POOL;
    const seed = 1234;
    const level = 3;
    const roster = selectGhostRoster(pool, seed, level);
    expect(roster).toHaveLength(7);
  });
});

// 028-pre-race-setup T050: deterministic generated-rival setup policy.
describe("selectGeneratedRivalSetup (T050, contract §6, FR-018A)", () => {
  function bruteForceLegalSelections(build: ReturnType<typeof vehicleBuild>): SetupSelections[] {
    const eligible = deriveEligibleSetupControls(build);
    return eligible.reduce<SetupSelections[]>(
      (partials, control) => partials.flatMap((partial) =>
        (["low", "balanced", "high"] as const).map((position) => ({ ...partial, [control.family]: position }))),
      [{}],
    );
  }

  function totalTime(build: ReturnType<typeof vehicleBuild>, track: ReturnType<typeof generateTrack>, lapCount: number, setup: LockedRaceSetup): number {
    return simulatePlayerLaps(build, lapCount, track, setup.totalDelta).reduce((sum, lap) => sum + lap.time, 0);
  }

  it("selects the exact global-minimum-time legal combination, verified by independent brute force", () => {
    const build = fourDistinctFamilyBuild();
    const track = generateTrack(7, 2);
    const context = { encounterId: "rival-encounter", lapCount: 10 };
    const input = { run: {} as Run, encounterId: context.encounterId, build, track, eligibleControls: deriveEligibleSetupControls(build), initialSelections: {} };

    const allSelections = bruteForceLegalSelections(build);
    expect(allSelections.length).toBeLessThanOrEqual(243);
    const times = allSelections.map((selections) => {
      const setup = lockRaceSetup(input, selections) as LockedRaceSetup;
      return { selections, time: totalTime(build, track, context.lapCount, setup) };
    });
    const minTime = Math.min(...times.map((entry) => entry.time));
    const tiedWinners = times.filter((entry) => entry.time === minTime);
    // The first-enumerated tied winner (canonical family order, then
    // low/balanced/high) is the one the contract requires.
    const expectedSelections = tiedWinners[0].selections;

    const result = selectGeneratedRivalSetup(build, track, context);

    expect(totalTime(build, track, context.lapCount, result)).toBe(minTime);
    expect(lockRaceSetup(input, expectedSelections)).toEqual(result);
  });

  it("delegates to the same lockRaceSetup/simulatePlayerLaps humans use — resulting setup validates cleanly", () => {
    const build = fourDistinctFamilyBuild();
    const track = generateTrack(7, 2);
    const context = { encounterId: "rival-encounter", lapCount: 10 };
    const result = selectGeneratedRivalSetup(build, track, context);

    expect(result.rulesVersion).toBe("race-setup-v1");
    expect(result.encounterId).toBe(context.encounterId);
    expect(result.trackId).toBe(track.id);
  });

  it("is pure and deterministic: identical inputs produce a deeply equal result", () => {
    const build = fourDistinctFamilyBuild();
    const track = generateTrack(7, 2);
    const context = { encounterId: "rival-encounter", lapCount: 10 };

    const first = selectGeneratedRivalSetup(build, track, context);
    const second = selectGeneratedRivalSetup(build, track, context);

    expect(second).toEqual(first);
  });

  it("always includes the universal Driver Aggression control, even for a build with no configurable items", () => {
    const build = zeroConfigurableBuild();
    const track = generateTrack(7, 1);
    const result = selectGeneratedRivalSetup(build, track, { encounterId: "e", lapCount: 10 });

    expect(result.controls.map((control) => control.family)).toEqual(["driver-aggression"]);
  });

});
