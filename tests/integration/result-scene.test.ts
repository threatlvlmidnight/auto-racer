import { describe, expect, it } from "vitest";
import {
  boardItemsLabel,
  carSetupLines,
  gapLabel,
  itemCooldownLabel,
  itemDependencyNote,
  itemDetailsLabel,
  outcomeLabel,
  positionLabel,
  standingsRow,
  storageItemsLabel,
  timesLabel,
} from "../../src/scenes/resultFormatting";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import type { CarResult, NCarContestResult } from "../../src/simulation/types";
import { classifyScalingItem } from "../../src/simulation/buffs";

describe("Feature 032 scaling evidence reconciliation", () => {
  it("uses authored fitted-value inputs without inventing persistence", () => {
    const scaling = classifyScalingItem({
      id: "scaled", name: "Scaled", price: 4, timeModifier: 0, origin: "coachworks",
      installationCategory: "power", synergyTags: [],
      buff: { boostPercent: 1, scalesWithFittedValue: true },
      fittedBehavior: { kind: "none", description: "none" },
      improvisedBehavior: { kind: "none", description: "none" },
    }, { heldItems: [], installedItems: [] });
    expect(scaling).toMatchObject({ kind: "fitted-value", currentInput: 0, currentMagnitude: 0 });
    expect(scaling?.nextTriggerLabel).toContain("installed parts");
  });
});
import { recordedLapVehicleStatModel, VEHICLE_STAT_ORDER } from "../../src/scenes/vehicleStatPresentation";
import { SIX_CORNER_TRACK, TEN_CORNER_TRACK } from "../fixtures/race-legibility-fixtures";
import { buildTrackFitPresentation, trackSummaryPresentation } from "../../src/scenes/trackSummaryPresentation";

// Lighter check (not strict TDD, per constitution's presentation-layer
// decision) confirming ResultScene's required fields (FR-006, FR-007) are
// all produced from a given NCarContestResult. tasks.md T018 (012-multi-
// ghost-contest T014/T020).

function car(overrides: Partial<CarResult>): CarResult {
  return {
    id: "player",
    role: "player",
    name: "Player",
    color: "#ffd447",
    time: 57,
    laps: [],
    position: 1,
    gapToLeader: 0,
    ...overrides,
  };
}

function result(overrides: Partial<NCarContestResult>): NCarContestResult {
  return {
    lapCount: 10,
    cars: [car({})],
    outcome: "win",
    board: [],
    storage: [],
    track: SIX_CORNER_TRACK,
    tieBreakOrder: ["player"],
    ...overrides,
  };
}

describe("ResultScene required fields (FR-006, FR-007)", () => {
  it("shows the player's position and a signed gap to the leader (FR-006)", () => {
    const player = car({ id: "player", role: "player", time: 57, position: 1, gapToLeader: 0 });
    const rival = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 2, gapToLeader: 1.5 });
    const r = result({ cars: [player, rival], outcome: "win" });

    expect(timesLabel(r)).toContain("57.0s");
    expect(positionLabel(r)).toBe("1st of 2");
    expect(gapLabel(r)).toBe("Leading the field");
  });

  it("labels a loss as behind the leader, with the player's own gap", () => {
    const player = car({ id: "player", role: "player", time: 60, position: 2, gapToLeader: 1.5 });
    const leader = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 1, gapToLeader: 0 });
    const r = result({ cars: [leader, player], outcome: "loss" });

    expect(gapLabel(r)).toBe("1.5s behind the leader");
    expect(positionLabel(r)).toBe("2nd of 2");
  });

  it("labels a tie distinctly (FR-011 heritage)", () => {
    const player = car({ id: "player", role: "player", time: 58.5, position: 2, gapToLeader: 0 });
    const leader = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 1, gapToLeader: 0 });
    const r = result({ cars: [leader, player], outcome: "tie" });

    expect(outcomeLabel(r)).toBe("Tie — Win for Both!");
  });

  it("renders every car in fixed finishing order via standingsRow", () => {
    const player = car({ id: "player", role: "player", name: "Player", time: 57, position: 1, gapToLeader: 0 });
    const rival = car({ id: "rival-torres", role: "rival", name: "Torres", time: 58.5, position: 2, gapToLeader: 1.5 });

    expect(standingsRow(player)).toContain("Player");
    expect(standingsRow(player)).toContain("57.0s");
    expect(standingsRow(rival)).toContain("Torres");
    expect(standingsRow(rival)).toContain("+1.5s");
  });

  it("renders empty board and storage sections", () => {
    const emptyResult = result({ board: [], storage: [] });
    expect(boardItemsLabel(emptyResult)).toBe("Board: None");
    expect(storageItemsLabel(emptyResult)).toBe("Storage: None");
  });

  it("renders a single board item with its modifier", () => {
    const label = boardItemsLabel(result({ board: [LEGACY_ITEM_POOL[0]] }));

    expect(label).toContain("Board (1)");
    expect(label).toContain(LEGACY_ITEM_POOL[0].name);
    expect(label).toContain("Lap Time");
  });

  it("renders every item across board and storage", () => {
    const board = LEGACY_ITEM_POOL.slice(0, 2);
    const storage = LEGACY_ITEM_POOL.slice(2, 3);
    const boardLabel = boardItemsLabel(result({ board, storage }));
    const storageLabel = storageItemsLabel(result({ board, storage }));

    board.forEach((item) => expect(boardLabel).toContain(item.name));
    storage.forEach((item) => expect(storageLabel).toContain(item.name));
  });

  it("renders category and origin rather than legacy identity labels", () => {
    const taggedItem = LEGACY_ITEM_POOL.find((item) => item.identityTag === "performance");
    const neutralItem = LEGACY_ITEM_POOL.find((item) => !item.identityTag);

    expect(taggedItem).toBeDefined();
    expect(neutralItem).toBeDefined();
    expect(itemDetailsLabel(taggedItem!)).toContain("Coachworks");
    expect(itemDetailsLabel(neutralItem!)).toMatch(/power|chassis/);
  });

  it("renders a buff's target tag and boost percentage", () => {
    const buffItem = LEGACY_ITEM_POOL.find((item) => item.buff);

    expect(buffItem).toBeDefined();
    expect(itemDetailsLabel(buffItem!)).toContain("Boost Lap Time");
    expect(itemDetailsLabel(buffItem!)).toContain("+5%");
  });

  it("renders a count-synergy buff's per-item rate, distinct from a flat buff's phrasing", () => {
    const countBuff = LEGACY_ITEM_POOL.find((item) => item.buff?.perCount);

    expect(countBuff).toBeDefined();
    expect(itemDetailsLabel(countBuff!)).toContain("+2% per eligible item");
  });

  it("distinguishes the item that remains active in storage", () => {
    const activeStorageItem = LEGACY_ITEM_POOL.find((item) => item.activeWhileStored);

    expect(activeStorageItem).toBeDefined();
    expect(storageItemsLabel(result({ storage: [activeStorageItem!] }))).toContain(
      "Active while stored"
    );
  });
});

describe("itemCooldownLabel — US2 FR-005 / FR-006", () => {
  it("returns '1 lap' for an item with no authored cooldown (fires every lap)", () => {
    const flatBuff = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
    expect(itemCooldownLabel(flatBuff)).toBe("1 lap");
  });

  it("returns '1 lap' for an item with cooldown: 1", () => {
    const everyLap = LEGACY_ITEM_POOL.find((item) => item.cooldown === 1)!;
    expect(itemCooldownLabel(everyLap)).toBe("1 lap");
  });

  it("returns 'N laps' for an item with cooldown > 1", () => {
    const every2 = LEGACY_ITEM_POOL.find((item) => item.cooldown === 2)!;
    const every4 = LEGACY_ITEM_POOL.find((item) => item.cooldown === 4)!;
    expect(itemCooldownLabel(every2)).toBe("2 laps");
    expect(itemCooldownLabel(every4)).toBe("4 laps");
  });

  it("keeps cooldown compatibility while shared details express authored cadence", () => {
    LEGACY_ITEM_POOL.forEach((item) => {
      expect(itemCooldownLabel(item)).toMatch(/lap/);
      expect(itemDetailsLabel(item)).toContain(item.name);
    });
  });
});

describe("itemDependencyNote — US2 FR-007", () => {
  it("returns null for a direct (non-buff) item", () => {
    const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
    expect(itemDependencyNote(directItem)).toBeNull();
  });

  it("returns a non-null note for every buff item", () => {
    const buffItems = LEGACY_ITEM_POOL.filter((item) => item.buff);
    expect(buffItems.length).toBeGreaterThan(0);
    buffItems.forEach((item) => {
      const note = itemDependencyNote(item);
      expect(note).not.toBeNull();
      expect(note).toMatch(/EVERY|PER|TARGET|WHEN/);
    });
  });

  it("includes shared rule text in itemDetailsLabel for buff items", () => {
    const buffItems = LEGACY_ITEM_POOL.filter((item) => item.buff);
    buffItems.forEach((item) => {
      expect(itemDetailsLabel(item)).toContain(itemDependencyNote(item)!);
    });
  });

  it("does not include a dependency note in itemDetailsLabel for direct items", () => {
    const directItems = LEGACY_ITEM_POOL.filter((item) => !item.buff);
    directItems.forEach((item) => {
      expect(itemDetailsLabel(item)).not.toContain("Requires");
    });
  });
});

// 025-vehicle-stat-display US4 (T040): the same lap evidence, viewed as a
// race lap vs. a completed Result lap, must use identical names, order,
// units, signs, and precision (FR-002/FR-018) — only the context label may
// differ between screens.
describe("vehicle stats use identical vocabulary across race and result screens", () => {
  const stats = { acceleration: 46, topSpeed: 92, brakingPower: 60, corneringSpeed: 53 };

  it("agrees on stat order, labels, units, values, and signs regardless of context", () => {
    const raceModel = recordedLapVehicleStatModel({
      lap: 4, lapCount: 10, contextKind: "race-lap", physics: { stats },
    });
    const resultModel = recordedLapVehicleStatModel({
      lap: 10, lapCount: 10, contextKind: "result-lap", physics: { stats },
    });
    expect(raceModel.lines.map((line) => line.key)).toEqual(VEHICLE_STAT_ORDER);
    raceModel.lines.forEach((raceLine, index) => {
      const resultLine = resultModel.lines[index];
      expect(resultLine.key).toBe(raceLine.key);
      expect(resultLine.label).toBe(raceLine.label);
      expect(resultLine.unit).toBe(raceLine.unit);
      expect(resultLine.currentValue).toBe(raceLine.currentValue);
      expect(resultLine.currentLabel).toBe(raceLine.currentLabel);
      expect(resultLine.stockDeltaLabel).toBe(raceLine.stockDeltaLabel);
    });
    // Only the context itself is allowed to differ.
    expect(raceModel.context.kind).toBe("race-lap");
    expect(resultModel.context.kind).toBe("result-lap");
    expect(raceModel.contextLabel).not.toBe(resultModel.contextLabel);
  });
});

// 027-race-legibility-integrity Phase 5 (US4, T041): Result track summary
// for available evidence and the legacy/malformed-unavailable case.
describe("trackSummaryPresentation (T041)", () => {
  it("shows exact straight/corner counts, distance, and demand for an available track", () => {
    const trackResult = result({ track: SIX_CORNER_TRACK });
    const presentation = trackSummaryPresentation(trackResult);

    expect(presentation.status).toBe("available");
    if (presentation.status !== "available") throw new Error("unreachable");
    expect(presentation.summary.trackId).toBe(SIX_CORNER_TRACK.id);
    expect(presentation.summary.cornerCount).toBe(6);
    expect(presentation.headline).toContain(SIX_CORNER_TRACK.name);
    expect(presentation.segmentLine).toContain("6 corner");
    expect(presentation.capabilityLines).toHaveLength(4);
  });

  it("differs measurably between two tracks with different composition", () => {
    const sixCorner = trackSummaryPresentation(result({ track: SIX_CORNER_TRACK }));
    const tenCorner = trackSummaryPresentation(result({ track: TEN_CORNER_TRACK }));
    if (sixCorner.status !== "available" || tenCorner.status !== "available") throw new Error("unreachable");

    expect(sixCorner.summary.cornerCount).not.toBe(tenCorner.summary.cornerCount);
    expect(sixCorner.segmentLine).not.toBe(tenCorner.segmentLine);
  });

  it("reports unavailable, not a regenerated or inferred value, when track evidence is malformed", () => {
    const malformedResult = result({
      track: { id: "legacy", name: "Legacy", segments: [], points: [], characteristics: { powerDemand: 0, brakingDemand: 0, corneringDemand: 0 } },
    });
    const presentation = trackSummaryPresentation(malformedResult);

    expect(presentation.status).toBe("unavailable");
    if (presentation.status !== "unavailable") throw new Error("unreachable");
    expect(presentation.reason.length).toBeGreaterThan(0);
  });

  it("reports unavailable when track is missing entirely, without throwing (defensive legacy-result path)", () => {
    const legacyResult = { ...result({}), track: undefined } as unknown as NCarContestResult;
    expect(() => trackSummaryPresentation(legacyResult)).not.toThrow();
    expect(trackSummaryPresentation(legacyResult).status).toBe("unavailable");
  });

  it("never calls generateTrack — uses only the retained result.track", () => {
    // Structural proof: the function's only NCarContestResult-typed input
    // parameter is `result`, and it reads result.track exclusively — there
    // is no seed/level parameter through which it could regenerate one.
    expect(trackSummaryPresentation.length).toBe(1);
  });
});

describe("buildTrackFitPresentation", () => {
  it("pairs authoritative track demand with the player's final recorded vehicle stats", () => {
    const player = car({
      laps: [{
        time: 5.7,
        firedItems: [],
        contributions: [],
        physics: {
          stats: { acceleration: 44, topSpeed: 58, brakingPower: 60, corneringSpeed: 53 },
          phases: [],
        },
      }],
    });
    const presentation = buildTrackFitPresentation(result({ cars: [player], track: SIX_CORNER_TRACK }));

    expect(presentation.status).toBe("available");
    if (presentation.status !== "available") throw new Error("unreachable");
    expect(presentation.axes.map((axis) => axis.key)).toEqual([
      "topSpeed", "acceleration", "brakingPower", "corneringSpeed",
    ]);
    expect(presentation.axes.find((axis) => axis.key === "topSpeed")).toMatchObject({
      demand: SIX_CORNER_TRACK.characteristics.powerDemand,
      vehicle: 58,
    });
    expect(presentation.axes.find((axis) => axis.key === "acceleration")).toMatchObject({
      demand: 60,
      vehicle: 44,
    });
    expect(presentation.axes.find((axis) => axis.key === "brakingPower")?.demand)
      .toBe(SIX_CORNER_TRACK.characteristics.brakingDemand);
    expect(presentation.axes.find((axis) => axis.key === "corneringSpeed")?.demand)
      .toBe(SIX_CORNER_TRACK.characteristics.corneringDemand);
    expect(presentation.factsLine).toContain("6 CORNERS");
  });

  it("labels missing final-lap physics instead of inventing vehicle values", () => {
    expect(buildTrackFitPresentation(result({ cars: [car({ laps: [] })] }))).toEqual({
      status: "unavailable",
      reason: "Build–track fit is unavailable for this result.",
    });
  });

  it("retains exact values while clamping only radar geometry", () => {
    const player = car({
      laps: [{
        time: 5.7, firedItems: [], contributions: [],
        physics: {
          stats: { acceleration: 140, topSpeed: 125, brakingPower: 0.5, corneringSpeed: 53 },
          phases: [],
        },
      }],
    });
    const presentation = buildTrackFitPresentation(result({ cars: [player] }));
    if (presentation.status !== "available") throw new Error("unreachable");
    expect(presentation.axes.find((axis) => axis.key === "topSpeed")).toMatchObject({ vehicle: 125, vehiclePlot: 100 });
    expect(presentation.axes.find((axis) => axis.key === "acceleration")).toMatchObject({ vehicle: 140, vehiclePlot: 100 });
  });
});

// 028-pre-race-setup T052: per-car setup evidence inspection, reading only
// CarResult.setup — legacy/missing evidence is labeled, never inferred.
describe("carSetupLines (T052, contract §10)", () => {
  it("labels missing setup evidence unavailable rather than inferring Balanced", () => {
    expect(carSetupLines(car({ setup: undefined }))).toEqual(["Setup: unavailable (legacy result)"]);
  });

  it("lists family label, position label, source items, and exact signed applied deltas", () => {
    const player = car({
      setup: {
        rulesVersion: "race-setup-v1",
        encounterId: "encounter-1",
        trackId: "track-1",
        controls: [
          {
            family: "driver-aggression", position: "low", sourceItemIds: [], magnitude: 1,
            appliedDelta: { accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 13, corneringSpeedDelta: 1 },
          },
          {
            family: "brake-balance", position: "high", sourceItemIds: ["rook-differential-braking-valve", "voss-split-circuit-brake-valve"], magnitude: 2,
            appliedDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 26, corneringSpeedDelta: -2 },
          },
        ],
        totalDelta: { accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 39, corneringSpeedDelta: -1 },
      },
    });

    const lines = carSetupLines(player);

    expect(lines[0]).toContain("Driver Aggression");
    expect(lines[0]).toContain("Conservative");
    expect(lines[0]).toContain("−6");
    expect(lines[1]).toContain("Brake Balance");
    expect(lines[1]).toContain("Stability");
    expect(lines[1]).toContain("rook-differential-braking-valve");
    expect(lines[1]).toContain("voss-split-circuit-brake-valve");
    expect(lines[1]).toContain("+26");
  });

  it("shows Balanced positions as no-change without inventing a nonzero delta", () => {
    const player = car({
      setup: {
        rulesVersion: "race-setup-v1", encounterId: "e", trackId: "t",
        controls: [{
          family: "driver-aggression", position: "balanced", sourceItemIds: [], magnitude: 1,
          appliedDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0 },
        }],
        totalDelta: { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0 },
      },
    });

    expect(carSetupLines(player)[0]).toContain("No change");
  });
});
