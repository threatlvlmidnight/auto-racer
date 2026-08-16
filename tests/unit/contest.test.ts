import { describe, expect, it } from "vitest";
import { BASELINE_CAR, SAMPLE_GHOST } from "../../src/content/sample-data";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { ContestResolutionError, ghostLapTimes, resolveContest } from "../../src/simulation/contest";
import { deriveEligibleSetupControls, lockRaceSetup, validateLockedRaceSetup } from "../../src/simulation/raceSetup";
import { generateTrack } from "../../src/simulation/tracks";
import {
  LAP_COUNT,
  type Build,
  type LockedRaceSetup,
  type OfferedItem,
  type RivalProfile,
  type SampleGhost,
} from "../../src/simulation/types";
import type { Run } from "../../src/simulation/run";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function emptyBuild(): Build {
  return vehicleBuild();
}

describe("resolveContest lap-loop shell", () => {
  it("returns deterministic lap-by-lap results", () => {
    const build = emptyBuild();
    const first = resolveContest(build, SAMPLE_GHOST);

    expect(resolveContest(build, SAMPLE_GHOST)).toEqual(first);
    expect(first.laps).toHaveLength(LAP_COUNT);
    first.laps.forEach((lap, index) => {
      expect(lap).toEqual({
        lap: index + 1,
        playerLapTime: BASELINE_CAR.baseLapTime,
        ghostLapTime: SAMPLE_GHOST.lapTime,
        firedItems: [],
        contributions: [],
      });
    });
  });

  it("derives empty-build totals and a loss from per-lap values", () => {
    const result = resolveContest(emptyBuild(), SAMPLE_GHOST);

    expect(result.playerTime).toBe(BASELINE_CAR.baseLapTime * LAP_COUNT);
    expect(result.ghostTime).toBeCloseTo(SAMPLE_GHOST.lapTime * LAP_COUNT);
    expect(result.gap).toBe(result.playerTime - result.ghostTime);
    expect(result.outcome).toBe("loss");
  });

  it("preserves win and tie outcome rules", () => {
    const slowGhost: SampleGhost = { id: "slow-ghost", lapTime: 7 };
    const tieGhost: SampleGhost = { id: "tie-ghost", lapTime: BASELINE_CAR.baseLapTime };

    expect(resolveContest(emptyBuild(), slowGhost).outcome).toBe("win");
    expect(resolveContest(emptyBuild(), tieGhost).outcome).toBe("tie");
  });

  it("does not mutate inputs", () => {
    const build = emptyBuild();
    const buildSnapshot = structuredClone(build);
    const ghostSnapshot = structuredClone(SAMPLE_GHOST);
    resolveContest(build, SAMPLE_GHOST);

    expect(build).toEqual(buildSnapshot);
    expect(SAMPLE_GHOST).toEqual(ghostSnapshot);
  });

  it("stores explicit lap count and adds only the two scheduled laps at 12", () => {
    const ten = resolveContest(emptyBuild(), SAMPLE_GHOST, 10);
    const twelve = resolveContest(emptyBuild(), SAMPLE_GHOST, 12);

    expect(ten.lapCount).toBe(10);
    expect(twelve.lapCount).toBe(12);
    expect(ten.laps).toHaveLength(10);
    expect(twelve.laps).toHaveLength(12);
    expect(twelve.laps.slice(0, 10)).toEqual(ten.laps);
    expect(twelve.playerTime).toBe(ten.playerTime + BASELINE_CAR.baseLapTime * 2);
    expect(twelve.ghostTime).toBe(ten.ghostTime + SAMPLE_GHOST.lapTime * 2);
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST, 10)).toEqual(ten);
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST, 12)).toEqual(twelve);
  });
});

describe("ghostLapTimes", () => {
  it("returns exactly LAP_COUNT identical laps and an exact derived total", () => {
    const laps = ghostLapTimes(SAMPLE_GHOST);

    expect(laps).toHaveLength(LAP_COUNT);
    expect(laps.every((lapTime) => lapTime === SAMPLE_GHOST.lapTime)).toBe(true);
    expect(laps.reduce((sum, lapTime) => sum + lapTime, 0)).toBeCloseTo(
      SAMPLE_GHOST.lapTime * LAP_COUNT
    );
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST).ghostTime).toBeCloseTo(
      SAMPLE_GHOST.lapTime * LAP_COUNT
    );
  });

  it("uses the supplied terminal count", () => {
    expect(ghostLapTimes(SAMPLE_GHOST, 10)).toHaveLength(10);
    expect(ghostLapTimes(SAMPLE_GHOST, 12)).toHaveLength(12);
  });
});

describe("ContestResult lap breakdown", () => {
  it("records real item firings and reconstructs both reported totals exactly", () => {
    const directItem: OfferedItem = testItem({
      id: "periodic-direct",
      name: "Periodic Direct",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 3,
    });
    const flatBuff: OfferedItem = testItem({
      id: "flat-buff",
      name: "Flat Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    });
    const stackingBuff: OfferedItem = testItem({
      id: "stacking-buff",
      name: "Stacking Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    });
    const result = resolveContest(
      vehicleBuild([directItem, flatBuff, stackingBuff]),
      SAMPLE_GHOST
    );

    expect(result.laps).toHaveLength(LAP_COUNT);
    result.laps.forEach((lap) => {
      const expectedIds = [1, 4, 7, 10].includes(lap.lap)
        ? [directItem.id, flatBuff.id, stackingBuff.id]
        : [flatBuff.id];
      expect(lap.firedItems.map((item) => item.id)).toEqual(expectedIds);
      [directItem.id, stackingBuff.id].forEach((id) => {
        expect(lap.firedItems.some((item) => item.id === id)).toBe(
          [1, 4, 7, 10].includes(lap.lap)
        );
      });
    });
    expect(result.laps.reduce((sum, lap) => sum + lap.playerLapTime, 0)).toBe(
      result.playerTime
    );
    expect(result.laps.reduce((sum, lap) => sum + lap.ghostLapTime, 0)).toBe(
      result.ghostTime
    );
  });
});

describe("count-synergy buff (SC-003)", () => {
  it("changes the outcome when an extra matching item sits inert in storage vs. absent entirely", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 3, perCount: true },
    });
    const receiver: OfferedItem = testItem({
      id: "receiver",
      name: "Receiver",
      price: 2,
      timeModifier: -2,
      identityTag: "performance",
      cooldown: 1,
    });
    const extraMatch: OfferedItem = testItem({
      id: "extra-match",
      name: "Extra Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });

    const withInertExtra = resolveContest(
      vehicleBuild([countBuff, receiver, null], [extraMatch, null, null]),
      SAMPLE_GHOST
    );
    const withoutExtra = resolveContest(
      vehicleBuild([countBuff, receiver, null]),
      SAMPLE_GHOST
    );

    expect(withInertExtra.playerTime).not.toBe(withoutExtra.playerTime);
    // qualifying count 2 (receiver + extraMatch) vs. 1 (receiver only):
    // receiver's boosted magnitude is -2 * (1 + boost/100) in each case.
    expect(withInertExtra.playerTime).toBeLessThan(withoutExtra.playerTime);
  });
});

describe("lap simulation order independence", () => {
  it("produces identical outcomes and lap times for permutations of the same items", () => {
    const directItem: OfferedItem = testItem({
      id: "order-direct",
      name: "Order Direct",
      price: 2,
      timeModifier: -2,
      identityTag: "performance",
      cooldown: 2,
    });
    const flatBuff: OfferedItem = testItem({
      id: "order-flat",
      name: "Order Flat",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    });
    const stackingBuff: OfferedItem = testItem({
      id: "order-stacking",
      name: "Order Stacking",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    });
    const first = resolveContest(
      vehicleBuild([directItem, flatBuff, stackingBuff]),
      SAMPLE_GHOST
    );
    const second = resolveContest(
      vehicleBuild([stackingBuff, directItem, flatBuff]),
      SAMPLE_GHOST
    );

    expect(second.playerTime).toBe(first.playerTime);
    expect(second.gap).toBe(first.gap);
    expect(second.outcome).toBe(first.outcome);
    expect(second.laps.map((lap) => lap.playerLapTime)).toEqual(
      first.laps.map((lap) => lap.playerLapTime)
    );
  });
});

// Every rival draws real items via resolveRivalBuild's own RNG, so these
// tests use a "tie roster" (zero slots filled) whenever exact-time
// assertions are needed, and the real RIVAL_PROFILES catalog otherwise.
const tieRoster: readonly RivalProfile[] = RIVAL_PROFILES.map((profile) => ({
  ...profile,
  levelScaling: () => ({ slotsToFill: 0, priceBias: "low" as const }),
}));

describe("resolveContest (N-car, US1/US2)", () => {
  it("resolves exactly 8 cars — the player plus every one of the 7 rivals", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);

    expect(result.cars).toHaveLength(8);
    expect(result.cars.filter((car) => car.role === "player")).toHaveLength(1);
    expect(result.cars.filter((car) => car.role === "rival")).toHaveLength(7);
    const rivalIds = result.cars.filter((car) => car.role === "rival").map((car) => car.id);
    expect(new Set(rivalIds)).toEqual(new Set(RIVAL_PROFILES.map((profile) => profile.id)));
  });

  it("assigns a contiguous 1..8 position permutation with no gaps or duplicates", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    const positions = result.cars.map((car) => car.position).sort((a, b) => a - b);

    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("is deterministic — identical (build, roster, level, seed, lapCount) always resolves identically", () => {
    const first = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);
    const second = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);

    expect(second).toEqual(first);
  });

  it("does not mutate the player build or the rival roster", () => {
    const build = emptyBuild();
    const buildSnapshot = structuredClone(build);
    const rosterSnapshot = structuredClone(RIVAL_PROFILES.map(({ id, name, color, vehicleId }) => ({
      id,
      name,
      color,
      vehicleId,
    })));
    resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(build).toEqual(buildSnapshot);
    expect(RIVAL_PROFILES.map(({ id, name, color, vehicleId }) => ({ id, name, color, vehicleId })))
      .toEqual(rosterSnapshot);
  });

  it("rejects a roster that is not exactly 7 rivals with a typed, inspectable failure", () => {
    expect(() => resolveContest(emptyBuild(), RIVAL_PROFILES.slice(0, 6), 1, 42)).toThrow(
      ContestResolutionError,
    );
    try {
      resolveContest(emptyBuild(), RIVAL_PROFILES.slice(0, 6), 1, 42);
      throw new Error("expected resolveContest to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ContestResolutionError);
      expect((error as ContestResolutionError).code).toBe("invalid-roster-size");
    }
  });

  it("breaks exact ties by fixed roster order — player first, then rivals in catalog order", () => {
    const result = resolveContest(emptyBuild(), tieRoster, 1, 42);

    expect(result.cars.every((car) => car.time === result.cars[0].time)).toBe(true);
    expect(result.cars.map((car) => car.id)).toEqual([
      "player",
      ...tieRoster.map((profile) => profile.id),
    ]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.cars.every((car) => car.gapToLeader === 0)).toBe(true);
  });

  it("derives outcome as win when the player finishes at position 1", () => {
    const result = resolveContest(emptyBuild(), tieRoster, 1, 42);

    expect(result.cars.find((car) => car.role === "player")?.position).toBe(1);
    expect(result.outcome).toBe("win");
  });

  it("keeps board/storage as the player's own items, unchanged meaning", () => {
    const directItem: OfferedItem = testItem({
      id: "n-car-direct",
      name: "N-Car Direct",
      price: 2,
      timeModifier: -1,
    });
    const result = resolveContest(vehicleBuild([directItem]), tieRoster, 1, 42);

    expect(result.board.map((item) => item.id)).toEqual([directItem.id]);
    expect(result.storage).toEqual([]);
  });

  it("gives every car a full per-lap breakdown, not just the player", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, 10);

    result.cars.forEach((car) => {
      expect(car.laps).toHaveLength(10);
      expect(car.time).toBeCloseTo(car.laps.reduce((sum, lap) => sum + lap.time, 0));
    });
  });

  it("still races against the existing single-SampleGhost path unchanged (FR-011 — Test Day/Practice)", () => {
    const legacy = resolveContest(emptyBuild(), SAMPLE_GHOST, 10);

    expect(legacy.playerTime).toBe(BASELINE_CAR.baseLapTime * 10);
    expect(legacy.ghostTime).toBeCloseTo(SAMPLE_GHOST.lapTime * 10);
  });
});

// 018-track-generation / 021-arcade-physics-simulation: the N-car overload
// generates its own track per contest and applies it identically to every
// car (018 T027, contract §6; 021 replaces the trackFit-annotated lap with
// a real physics-annotated one, 021 tasks.md T035).
describe("resolveContest track generation (N-car, US2)", () => {
  it("gives every car — player and every rival — a physics-annotated lap", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);

    result.cars.forEach((car) => {
      car.laps.forEach((lap) => {
        expect(lap.physics).toBeDefined();
        expect(lap.physics!.phases.length).toBeGreaterThan(0);
      });
    });
  });

  it("applies exactly one generated track per contest — every car's resolved PhysicalStats reflect the same track's segments (same stock stats produce the same phase count for the empty player build)", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    const player = result.cars.find((car) => car.role === "player")!;
    const phaseCounts = player.laps.map((lap) => lap.physics!.phases.length);

    expect(new Set(phaseCounts)).toEqual(new Set([phaseCounts[0]]));
  });

  it("gives every rival the identical track as the player — same seed/level always produces the same set of rival physics results as another identical contest", () => {
    const first = resolveContest(emptyBuild(), RIVAL_PROFILES, 3, 11);
    const second = resolveContest(emptyBuild(), RIVAL_PROFILES, 3, 11);
    const rivalPhysics = (result: typeof first) => result.cars
      .filter((car) => car.role === "rival")
      .map((car) => car.laps[0].physics);

    expect(rivalPhysics(second)).toEqual(rivalPhysics(first));
  });

  it("regenerates the same track for the same (seed, level), deterministically affecting the result", () => {
    const first = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);
    const second = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);

    expect(second).toEqual(first);
  });

  it("does not apply a track to the legacy 2-car overload", () => {
    const legacy = resolveContest(emptyBuild(), SAMPLE_GHOST, 10);

    legacy.laps.forEach((lap) => {
      expect((lap as { physics?: unknown }).physics).toBeUndefined();
    });
  });
});

// 027-race-legibility-integrity Phase 3 (T015-T018): the result carries the
// exact generated Track and original roster tie-break order as immutable
// evidence, so playback/Results never regenerate or reconstruct either one.
describe("resolveContest immutable evidence: track and tieBreakOrder (027 US3/US4)", () => {
  it("returns the exact same Track object used to resolve every car's laps", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    const independentlyGenerated = generateTrack(42, 1);

    expect(result.track).toEqual(independentlyGenerated);
    // Structural identity of the value, not merely equal fields — every car's
    // own physics resolution read this exact segments array (contract §1).
    result.cars.forEach((car) => {
      car.laps.forEach((lap) => {
        expect(lap.physics!.phases.length).toBeGreaterThan(0);
      });
    });
  });

  it("carries tieBreakOrder as player-first, then rivals in authored roster order — every id exactly once", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);

    expect(result.tieBreakOrder).toEqual(["player", ...RIVAL_PROFILES.map((profile) => profile.id)]);
    expect(new Set(result.tieBreakOrder).size).toBe(result.tieBreakOrder.length);
    expect(result.tieBreakOrder).toHaveLength(result.cars.length);
  });

  it("tieBreakOrder matches the roster order actually used to break exact ties in final position", () => {
    const result = resolveContest(emptyBuild(), tieRoster, 1, 42);

    expect(result.tieBreakOrder).toEqual(result.cars.map((car) => car.id));
  });

  it("retained circuit evidence reconciles with ranking and lap totals", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);

    expect(result.outcome).toBe("loss");
    expect(result.lapCount).toBe(10);
    expect(result.board).toEqual([]);
    expect(result.storage).toEqual([]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(result.cars.map((car) => car.id)).size).toBe(8);
    const player = result.cars.find((car) => car.role === "player")!;
    expect(player.time).toBeCloseTo(player.laps.reduce((sum, lap) => sum + lap.time, 0), 9);
    expect(player.gapToLeader).toBeCloseTo(player.time - result.cars[0].time, 9);
  });
});

// 028-pre-race-setup T026: fairness/determinism for setup applied to a
// scored N-car contest — equivalent cars receive identical treatment, and
// repeated resolution with the same setup is deeply equal.
describe("resolveContest setup fairness and determinism (T026)", () => {
  const rulesVersion = "race-setup-v1" as const;

  function lockedSetup(brakingPowerDelta: number, corneringSpeedDelta: number) {
    return {
      rulesVersion,
      encounterId: "encounter-1",
      trackId: generateTrack(42, 1).id,
      controls: [{
        family: "driver-aggression" as const,
        position: "low" as const,
        sourceItemIds: [],
        magnitude: 1,
        appliedDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta, corneringSpeedDelta },
      }],
      totalDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta, corneringSpeedDelta },
    };
  }

  it("applies the player's own setup only to the player, never to any rival", () => {
    const setup = lockedSetup(13, -1);
    const withSetup = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, LAP_COUNT, setup);
    const withoutSetup = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, LAP_COUNT);

    const player = withSetup.cars.find((car) => car.role === "player")!;
    const playerWithout = withoutSetup.cars.find((car) => car.role === "player")!;
    expect(player.time).not.toBe(playerWithout.time);
    expect(player.setup).toEqual(setup);

    withSetup.cars.filter((car) => car.role === "rival").forEach((rival) => {
      const rivalWithout = withoutSetup.cars.find((car) => car.id === rival.id)!;
      expect(rival.time).toBe(rivalWithout.time);
      expect(rival.setup).toBeUndefined();
    });
  });

  it("resolves deeply identically on repeated calls with the same setup", () => {
    const setup = lockedSetup(-13, 1);
    const first = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, LAP_COUNT, setup);
    const second = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, LAP_COUNT, setup);

    expect(second).toEqual(first);
  });

  it("omits setup evidence entirely (not Balanced-shaped) when no setup argument is passed — legacy equivalence", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    const player = result.cars.find((car) => car.role === "player")!;

    expect(player.setup).toBeUndefined();
  });
});

// 028-pre-race-setup T048: every new scored car (player + every rival) gets
// its own CarResult.setup when the contest is bound to a real encounter.
describe("resolveContest per-car setup evidence (T048, FR-018/018A)", () => {
  it("gives every car — player and all 7 rivals — its own CarResult.setup when an encounterId is supplied", () => {
    const setup = {
      rulesVersion: "race-setup-v1" as const,
      encounterId: "encounter-9",
      trackId: generateTrack(42, 1).id,
      controls: [{
        family: "driver-aggression" as const, position: "low" as const, sourceItemIds: [], magnitude: 1,
        appliedDelta: { accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 13, corneringSpeedDelta: 1 },
      }],
      totalDelta: { accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 13, corneringSpeedDelta: 1 },
    };
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, LAP_COUNT, setup, "encounter-9");

    result.cars.forEach((car) => {
      expect(car.setup, car.id).toBeDefined();
      expect(car.setup!.encounterId).toBe("encounter-9");
    });
  });

  it("never copies the player's own configurable-item source IDs onto any rival's setup evidence", () => {
    const playerItem = testItem({
      id: "player-only-brake-item", name: "Player Brake Item", price: 0, timeModifier: 0,
      configurableSetup: { family: "brake-balance", magnitude: 1 },
    });
    const playerBuild = vehicleBuild([playerItem]);
    const track = generateTrack(42, 1);
    const input = {
      run: {} as Run, encounterId: "encounter-9", build: playerBuild, track,
      eligibleControls: deriveEligibleSetupControls(playerBuild), initialSelections: {},
    };
    const setup = lockRaceSetup(input, { "brake-balance": "low" }) as LockedRaceSetup;

    const result = resolveContest(playerBuild, RIVAL_PROFILES, 1, 42, LAP_COUNT, setup, "encounter-9");

    result.cars.filter((car) => car.role === "rival").forEach((rival) => {
      const rivalSourceIds = rival.setup!.controls.flatMap((control) => control.sourceItemIds);
      expect(rivalSourceIds).not.toContain("player-only-brake-item");
    });
  });

  it("omits every car's setup when no encounterId is supplied — pure legacy path unaffected", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    result.cars.forEach((car) => expect(car.setup).toBeUndefined());
  });
});

// 028-pre-race-setup T049: setup is validated (never trusted blindly) before
// resolution — this exercises the same validateLockedRaceSetup used by the
// scene, applied to a car's own build/track/encounter context.
describe("resolveContest tamper/replay contract (T049)", () => {
  it("validateLockedRaceSetup rejects a setup replayed against the wrong track/encounter", () => {
    const build = emptyBuild();
    const wrongTrack = generateTrack(1, 1);
    const rightTrack = generateTrack(42, 1);
    const input = {
      run: {} as Run,
      encounterId: "encounter-9",
      build,
      track: rightTrack,
      eligibleControls: deriveEligibleSetupControls(build),
      initialSelections: {},
    };
    const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
    const replayedAgainstWrongTrack = { ...input, track: wrongTrack, trackId: wrongTrack.id };

    expect(validateLockedRaceSetup({ ...replayedAgainstWrongTrack, encounterId: input.encounterId }, setup))
      .toEqual({ kind: "track-mismatch" });
  });

  it("validateLockedRaceSetup rejects source IDs that no longer match the car's own installed eligibility", () => {
    const build = emptyBuild();
    const track = generateTrack(42, 1);
    const input = {
      run: {} as Run,
      encounterId: "encounter-9",
      build,
      track,
      eligibleControls: deriveEligibleSetupControls(build),
      initialSelections: {},
    };
    const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
    const tampered = {
      ...setup,
      controls: [{
        family: "driver-aggression" as const, position: "balanced" as const,
        sourceItemIds: ["not-actually-installed"], magnitude: 1,
        appliedDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0 },
      }],
    };

    expect(validateLockedRaceSetup(input, tampered).kind).not.toBe("valid");
  });
});
