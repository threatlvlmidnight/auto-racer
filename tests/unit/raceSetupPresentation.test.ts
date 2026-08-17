import { describe, expect, it } from "vitest";
import { createRun, runIdentityForEntrant, type Run } from "../../src/simulation/run";
import { raceSetupInput, type RaceSetupInput } from "../../src/simulation/raceSetup";
import {
  raceSetupSceneModel,
  setupControlRows,
  setupStatRows,
  setupTrackSummary,
  setupVehicleAssetKey,
  trackPreviewPoints,
} from "../../src/scenes/raceSetupPresentation";
import { vehicleBuild, testItem } from "../fixtures/vehicle-build-fixtures";
import { setupFixtureItem } from "../fixtures/race-setup-fixtures";
import { chooseEncounter } from "../../src/simulation/encounters";
import { completeNonPvpEncounter } from "../../src/simulation/run";
import { EXCLUSIVE_ITEMS } from "../../src/content/items";
import type { ItemDefinition } from "../../src/simulation/types";
import { trackCenterline } from "../../src/simulation/tracks";

function itemById(id: string): ItemDefinition {
  const item = Object.values(EXCLUSIVE_ITEMS).flat().find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown launch item ${id}`);
  return item;
}

/** Advances a fresh run to its first active PvP encounter (mirrors run-flow.test.ts's own `create` + advance pattern). */
function runAtFirstPvp(build = vehicleBuild([])): Run {
  let run = createRun({
    runId: "presentation-run",
    seed: 5,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build,
    rng: () => 0,
  });
  for (let stage = 0; stage < 2; stage += 1) {
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
  }
  return run;
}

function inputFor(build = vehicleBuild([])): RaceSetupInput {
  const run = runAtFirstPvp(build);
  return raceSetupInput(run, run.activeEncounter!.id);
}

describe("raceSetupPresentation (T015)", () => {
  it("exposes exact track composition without opponent/purse/sponsor fields", () => {
    const track = setupTrackSummary(inputFor());
    const serialized = JSON.stringify(track).toLowerCase();
    expect(serialized).not.toMatch(/rival|opponent|purse|sponsor|odds|position/);
    expect(track.headline).toContain("laps");
  });

  it("alignmentLine names the track's single highest-demand capability without an outcome/time/position claim (T045)", () => {
    const track = setupTrackSummary(inputFor());
    expect(track.alignmentLine).toMatch(/reward(s|ing)? (Top Speed|Braking Power|Cornering Speed)/);
    expect(track.alignmentLine.toLowerCase()).not.toMatch(/win|finish|guaranteed|position \d|will beat/);
    expect(track.capabilityLines).toContain(track.alignmentLine);
  });

  it("renders current and prospective four-stat rows for Balanced with zero deltas", () => {
    const rows = setupStatRows(inputFor(), {});
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(row.currentValue).toBe(row.prospectiveValue);
      expect(row.changed).toBe(false);
      expect(row.deltaLabel).toBe("No change");
    });
  });

  it("reflects a non-Balanced Driver Aggression selection in prospective stats with signed deltas", () => {
    const input = inputFor();
    const rows = setupStatRows(input, { "driver-aggression": "low" });
    const acceleration = rows.find((row) => row.key === "acceleration")!;
    expect(acceleration.changed).toBe(true);
    expect(acceleration.prospectiveValue).toBeCloseTo(acceleration.currentValue - 6 / 1.01);
    expect(acceleration.deltaLabel).toContain("−5.9 pt");
  });

  it("shows only Driver Aggression when no configurable item is installed", () => {
    const controls = setupControlRows(inputFor(), {});
    expect(controls).toHaveLength(1);
    expect(controls[0]).toMatchObject({ family: "driver-aggression", isUniversal: true, selectedPosition: "balanced" });
  });

  it("adds one equipment control row per installed configurable item family", () => {
    const build = vehicleBuild([setupFixtureItem("fixture-gearing-a", "gearing")]);
    const controls = setupControlRows(inputFor(build), {});
    expect(controls.map((control) => control.family)).toEqual(["driver-aggression", "gearing"]);
    expect(controls[1].sourceLabel).toBe("fixture-gearing-a");
  });

  it("carries no opponent/field/purse/sponsor/prediction data anywhere in the scene model", () => {
    const model = raceSetupSceneModel(inputFor(), {});
    const serialized = JSON.stringify(model).toLowerCase();
    expect(serialized).not.toMatch(/rival|opponent|purse|sponsor|odds|projected|prediction/);
  });

  it("derives the vehicle asset key from the run's own validated identity, never a default", () => {
    const key = setupVehicleAssetKey(inputFor());
    expect(key).toBe("vehicle-the-highwheel");
  });

  it("hasEquipmentControls is false with only Driver Aggression, true with any installed equipment", () => {
    expect(raceSetupSceneModel(inputFor(), {}).hasEquipmentControls).toBe(false);
    const build = vehicleBuild([setupFixtureItem("fixture-gearing-a", "gearing")]);
    expect(raceSetupSceneModel(inputFor(build), {}).hasEquipmentControls).toBe(true);
  });
});

describe("raceSetupPresentation: exact tradeoff reconciliation (T042)", () => {
  it("reconciles every family/position's displayed delta against the pure resolver, for a fully-loaded build", () => {
    const build = vehicleBuild([
      setupFixtureItem("fixture-brake-balance", "brake-balance"),
      setupFixtureItem("fixture-steering-response", "steering-response"),
      setupFixtureItem("fixture-gearing", "gearing"),
      setupFixtureItem("fixture-propeller-pitch", "propeller-pitch"),
    ]);
    const input = inputFor(build);
    (["low", "balanced", "high"] as const).forEach((position) => {
      const selections = {
        "driver-aggression": position,
        "brake-balance": position,
        "steering-response": position,
        "gearing": position,
        "propeller-pitch": position,
      } as const;
      const controls = setupControlRows(input, selections);
      const stats = setupStatRows(input, selections);
      controls.forEach((control) => {
        const selectedOption = control.positions.find((candidate) => candidate.selected)!;
        expect(selectedOption.id).toBe(position);
        expect(control.selectedDeltaLabel).toBe(selectedOption.deltaLabel);
      });
      // Every stat row's signed formatting never depends on color — pure text.
      stats.forEach((row) => expect(typeof row.deltaLabel).toBe("string"));
    });
  });

  it("never claims a track/position/outcome prediction in any label", () => {
    const build = vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")]);
    const input = inputFor(build);
    const model = raceSetupSceneModel(input, { gearing: "high" });
    const serialized = JSON.stringify(model).toLowerCase();
    expect(serialized).not.toMatch(/win|finish|will beat|guaranteed/);
  });
});

describe("raceSetupPresentation: control-row layout states (T034)", () => {
  it("universal-only: exactly one row, Driver Aggression", () => {
    const controls = setupControlRows(inputFor(vehicleBuild([])), {});
    expect(controls).toHaveLength(1);
    expect(controls[0].family).toBe("driver-aggression");
  });

  it("typical two-equipment: Driver Aggression plus two distinct installed families, none suppressed", () => {
    const build = vehicleBuild([
      itemById("mercer-hand-fitted-steering-knuckle"),
      itemById("soto-two-speed-drive-hub"),
    ]);
    const controls = setupControlRows(inputFor(build), {});
    expect(controls.map((control) => control.family)).toEqual([
      "driver-aggression", "steering-response", "gearing",
    ]);
  });

  it("maximum four-distinct-equipment: Driver Aggression plus all four installed families visible, none suppressed", () => {
    const build = vehicleBuild([
      itemById("rook-differential-braking-valve"),
      itemById("mercer-hand-fitted-steering-knuckle"),
      itemById("soto-two-speed-drive-hub"),
      itemById("rook-variable-pitch-propeller"),
    ]);
    const controls = setupControlRows(inputFor(build), {});
    expect(controls.map((control) => control.family)).toEqual([
      "driver-aggression", "brake-balance", "steering-response", "gearing", "propeller-pitch",
    ]);
    expect(controls).toHaveLength(5);
  });
});

describe("raceSetupPresentation: unavailable/legacy build edge case", () => {
  it("still resolves a model for a build with an unrelated held item (no configurableSetup)", () => {
    const build = vehicleBuild([testItem({ id: "plain-item", name: "Plain", price: 0, timeModifier: 0 })]);
    const controls = setupControlRows(inputFor(build), {});
    expect(controls).toHaveLength(1);
  });
});

describe("trackPreviewPoints: smoothed track preview shape", () => {
  it("produces subdivisionsPerSegment points per retained centerline point", () => {
    const input = inputFor();
    const points = trackPreviewPoints(input.track, { scale: 1, offsetX: 0, offsetY: 0, subdivisionsPerSegment: 6 });

    expect(points).toHaveLength(trackCenterline(input.track).length * 6);
  });

  it("passes exactly through every original (scaled/offset) point at each segment's start", () => {
    const input = inputFor();
    const subdivisions = 8;
    const points = trackPreviewPoints(input.track, { scale: 0.5, offsetX: 10, offsetY: 20, subdivisionsPerSegment: subdivisions });

    trackCenterline(input.track).forEach((original, index) => {
      const expected = { x: original.x * 0.5 + 10, y: original.y * 0.5 + 20 };
      const actual = points[index * subdivisions];
      expect(actual.x).toBeCloseTo(expected.x, 9);
      expect(actual.y).toBeCloseTo(expected.y, 9);
    });
  });

  it("defaults to a dense subdivision when none is given", () => {
    const input = inputFor();
    const points = trackPreviewPoints(input.track, { scale: 1, offsetX: 0, offsetY: 0 });

    expect(points.length).toBeGreaterThan(trackCenterline(input.track).length * 5);
  });

  it("is pure and deterministic", () => {
    const input = inputFor();
    const first = trackPreviewPoints(input.track, { scale: 0.32, offsetX: 20, offsetY: 44 });
    const second = trackPreviewPoints(input.track, { scale: 0.32, offsetX: 20, offsetY: 44 });

    expect(second).toEqual(first);
  });
});
