import { describe, expect, it } from "vitest";
import {
  CANONICAL_FAMILY_ORDER,
  CANONICAL_POSITION_ORDER,
  deriveEligibleSetupControls,
  lockRaceSetup,
  resolveSetupDelta,
  setupControlDefinition,
  validateLockedRaceSetup,
  type RaceSetupInput,
} from "../../src/simulation/raceSetup";
import {
  fourDistinctFamilyBuild,
  oneConfigurableBuild,
  setupFixtureItem,
  setupFixtureTrack,
  storedOnlyConfigurableBuild,
  twoSameFamilyBuild,
  zeroConfigurableBuild,
} from "../fixtures/race-setup-fixtures";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { EXCLUSIVE_ITEMS } from "../../src/content/items";
import type { Run } from "../../src/simulation/run";
import type { ItemDefinition, LockedRaceSetup, SetupControlFamily, SetupSelections } from "../../src/simulation/types";

const ALL_FAMILIES: readonly SetupControlFamily[] = [
  "driver-aggression",
  "brake-balance",
  "steering-response",
  "gearing",
  "propeller-pitch",
  "racing-line",
  "bodywork-trim",
];

function setupInputFor(build: Parameters<typeof deriveEligibleSetupControls>[0]): RaceSetupInput {
  const track = setupFixtureTrack();
  return {
    run: {} as Run,
    encounterId: "encounter-1",
    build,
    track,
    eligibleControls: deriveEligibleSetupControls(build),
    initialSelections: {},
  };
}

describe("pre-race setup: control catalog (T006)", () => {
  it("defines exactly seven families", () => {
    expect(CANONICAL_FAMILY_ORDER).toEqual(ALL_FAMILIES);
  });

  it.each(ALL_FAMILIES)("%s has exactly three positions: low, balanced, high", (family) => {
    const definition = setupControlDefinition(family)!;
    expect(definition.positions.map((position) => position.id)).toEqual(["low", "balanced", "high"]);
    expect(CANONICAL_POSITION_ORDER).toEqual(["low", "balanced", "high"]);
  });

  it.each(ALL_FAMILIES)("%s's balanced position is all-zero", (family) => {
    const definition = setupControlDefinition(family)!;
    const balanced = definition.positions.find((position) => position.id === "balanced")!;
    expect(resolveSetupDelta(family, "balanced", 1)).toEqual({
      accelerationDelta: 0,
      topSpeedDelta: 0,
      brakingPowerDelta: 0,
      corneringSpeedDelta: 0,
    });
    expect(balanced.label).toBe("Balanced");
  });

  it.each(ALL_FAMILIES)("%s's low and high positions are exact inverses", (family) => {
    const low = resolveSetupDelta(family, "low", 1);
    const high = resolveSetupDelta(family, "high", 1);
    if ("kind" in low || "kind" in high) throw new Error("expected resolved deltas");
    expect(low.accelerationDelta + high.accelerationDelta).toBe(0);
    expect(low.topSpeedDelta + high.topSpeedDelta).toBe(0);
    expect(low.brakingPowerDelta + high.brakingPowerDelta).toBe(0);
    expect(low.corneringSpeedDelta + high.corneringSpeedDelta).toBe(0);
    expect(low).not.toEqual(high);
  });

  it("has stable, human-readable labels for every family and position", () => {
    expect(setupControlDefinition("driver-aggression")!.label).toBe("Driver Aggression");
    expect(setupControlDefinition("driver-aggression")!.positions.map((p) => p.label)).toEqual([
      "Conservative", "Balanced", "Aggressive",
    ]);
    expect(setupControlDefinition("brake-balance")!.positions.map((p) => p.label)).toEqual([
      "Corner Entry", "Balanced", "Stability",
    ]);
    expect(setupControlDefinition("steering-response")!.positions.map((p) => p.label)).toEqual([
      "Stable", "Balanced", "Responsive",
    ]);
    expect(setupControlDefinition("gearing")!.positions.map((p) => p.label)).toEqual([
      "Short", "Balanced", "Tall",
    ]);
    expect(setupControlDefinition("propeller-pitch")!.positions.map((p) => p.label)).toEqual([
      "Fine Pitch", "Balanced", "Coarse Pitch",
    ]);
    expect(setupControlDefinition("racing-line")!.positions.map((p) => p.label)).toEqual([
      "Attack Apex", "Balanced", "Hold Line",
    ]);
    expect(setupControlDefinition("bodywork-trim")!.positions.map((p) => p.label)).toEqual([
      "Corner Trim", "Balanced", "Streamlined",
    ]);
  });

  it("Driver Aggression matches spec.md FR-004D exactly", () => {
    expect(resolveSetupDelta("driver-aggression", "low", 1)).toEqual({
      accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 13, corneringSpeedDelta: 1,
    });
    expect(resolveSetupDelta("driver-aggression", "high", 1)).toEqual({
      accelerationDelta: 6, topSpeedDelta: 1, brakingPowerDelta: -13, corneringSpeedDelta: -1,
    });
  });

  it("Brake Balance matches spec.md FR-006 exactly", () => {
    expect(resolveSetupDelta("brake-balance", "low", 1)).toEqual({
      accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: -13, corneringSpeedDelta: 1,
    });
  });

  it("uses rules version race-setup-v1", () => {
    const setup = lockRaceSetup(setupInputFor(zeroConfigurableBuild()), {});
    expect("rulesVersion" in setup && setup.rulesVersion).toBe("race-setup-v1");
  });

  it("resolveSetupDelta returns a typed failure for unknown family/position, never a fallback", () => {
    expect(resolveSetupDelta("not-a-family" as SetupControlFamily, "low", 1)).toEqual({
      kind: "unknown-family", family: "not-a-family",
    });
    expect(resolveSetupDelta("driver-aggression", "extreme" as never, 1)).toEqual({
      kind: "unknown-position", family: "driver-aggression", position: "extreme",
    });
  });
});

describe("pre-race setup: eligibility and aggregation (T007)", () => {
  it("always includes Driver Aggression with empty sourceItemIds, even with no items", () => {
    const eligible = deriveEligibleSetupControls(zeroConfigurableBuild());
    expect(eligible).toHaveLength(1);
    expect(eligible[0]).toMatchObject({ family: "driver-aggression", sourceItemIds: [], magnitude: 1 });
  });

  it("adds one control per installed configurable item's family", () => {
    const eligible = deriveEligibleSetupControls(oneConfigurableBuild("gearing"));
    expect(eligible.map((control) => control.family)).toEqual(["driver-aggression", "gearing"]);
    expect(eligible[1].sourceItemIds).toEqual(["fixture-gearing-a"]);
    expect(eligible[1].magnitude).toBe(1);
  });

  it("ignores items in storage entirely", () => {
    const eligible = deriveEligibleSetupControls(storedOnlyConfigurableBuild("gearing"));
    expect(eligible).toHaveLength(1);
    expect(eligible[0].family).toBe("driver-aggression");
  });

  it("stable-sorts source item IDs for canonical equality", () => {
    const build = vehicleBuild([
      setupFixtureItem("fixture-brake-balance-z", "brake-balance"),
      setupFixtureItem("fixture-brake-balance-a", "brake-balance"),
    ]);
    const eligible = deriveEligibleSetupControls(build);
    const brakeBalance = eligible.find((control) => control.family === "brake-balance")!;
    expect(brakeBalance.sourceItemIds).toEqual(["fixture-brake-balance-a", "fixture-brake-balance-z"]);
  });

  it("aggregates same-family sources into one control with linear magnitude", () => {
    const eligible = deriveEligibleSetupControls(twoSameFamilyBuild("brake-balance"));
    const brakeBalance = eligible.find((control) => control.family === "brake-balance")!;
    expect(brakeBalance.magnitude).toBe(2);
    expect(brakeBalance.sourceItemIds).toHaveLength(2);
    const low = brakeBalance.positions.find((position) => position.id === "low")!;
    expect(low.delta).toEqual({ accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: -26, corneringSpeedDelta: 2 });
  });

  it("exposes the natural maximum: Driver Aggression plus four distinct installed families", () => {
    const eligible = deriveEligibleSetupControls(fourDistinctFamilyBuild());
    expect(eligible.map((control) => control.family)).toEqual([
      "driver-aggression", "brake-balance", "steering-response", "gearing", "propeller-pitch",
    ]);
  });

  it("is pure: reads only the build, not run/scene/global state", () => {
    const build = oneConfigurableBuild("gearing");
    expect(deriveEligibleSetupControls(build)).toEqual(deriveEligibleSetupControls(build));
  });
});

describe("pre-race setup: lock and validation (T008)", () => {
  it("locks in canonical family order regardless of selection insertion order", () => {
    const setup = lockRaceSetup(setupInputFor(fourDistinctFamilyBuild()), {
      "propeller-pitch": "high",
      "driver-aggression": "low",
      "gearing": "high",
    }) as LockedRaceSetup;
    expect(setup.controls.map((control) => control.family)).toEqual([
      "driver-aggression", "brake-balance", "steering-response", "gearing", "propeller-pitch",
    ]);
  });

  it("defaults every unspecified control to balanced", () => {
    const setup = lockRaceSetup(setupInputFor(oneConfigurableBuild("gearing")), {}) as LockedRaceSetup;
    expect(setup.controls.every((control) => control.position === "balanced")).toBe(true);
    expect(setup.totalDelta).toEqual({
      accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0,
    });
  });

  it("sums every control's applied delta into totalDelta", () => {
    const setup = lockRaceSetup(setupInputFor(oneConfigurableBuild("gearing")), {
      "driver-aggression": "low",
      "gearing": "low",
    }) as LockedRaceSetup;
    // driver-aggression low: accel -6, topSpeed -1, braking +13, cornering +1
    // gearing low (magnitude 1): accel +6, topSpeed -1
    expect(setup.totalDelta).toEqual({
      accelerationDelta: 0, topSpeedDelta: -2, brakingPowerDelta: 13, corneringSpeedDelta: 1,
    });
  });

  it("binds the exact encounter and track IDs from the input", () => {
    const input = setupInputFor(zeroConfigurableBuild());
    const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
    expect(setup.encounterId).toBe(input.encounterId);
    expect(setup.trackId).toBe(input.track.id);
  });

  it("rejects a candidate missing the universal control", () => {
    const input: RaceSetupInput = { ...setupInputFor(zeroConfigurableBuild()), eligibleControls: [] };
    expect(lockRaceSetup(input, {})).toEqual({ kind: "missing-universal-control" });
  });

  describe("validateLockedRaceSetup", () => {
    function validInput(): RaceSetupInput {
      return setupInputFor(twoSameFamilyBuild("brake-balance"));
    }

    it("accepts exactly what lockRaceSetup produced", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, { "brake-balance": "high" }) as LockedRaceSetup;
      expect(validateLockedRaceSetup(input, setup)).toEqual({ kind: "valid", setup });
    });

    it("rejects an unknown rules version", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const tampered = { ...setup, rulesVersion: "race-setup-v2" as LockedRaceSetup["rulesVersion"] };
      expect(validateLockedRaceSetup(input, tampered)).toEqual({ kind: "unknown-rules-version" });
    });

    it("rejects a track ID mismatch", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      expect(validateLockedRaceSetup(input, { ...setup, trackId: "other-track" }))
        .toEqual({ kind: "track-mismatch" });
    });

    it("rejects an encounter ID mismatch", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      expect(validateLockedRaceSetup(input, { ...setup, encounterId: "other-encounter" }))
        .toEqual({ kind: "encounter-mismatch" });
    });

    it("rejects a control for a family the current build no longer makes eligible", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, { "brake-balance": "low" }) as LockedRaceSetup;
      const strippedInput = setupInputFor(zeroConfigurableBuild());
      const relocked = { ...setup, encounterId: strippedInput.encounterId, trackId: strippedInput.track.id };
      expect(validateLockedRaceSetup(strippedInput, relocked)).toEqual({
        kind: "ineligible-family", family: "brake-balance",
      });
    });

    it("rejects source IDs that differ from current installed eligibility", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const tamperedControls = setup.controls.map((control) =>
        control.family === "brake-balance" ? { ...control, sourceItemIds: ["not-installed"] } : control);
      expect(validateLockedRaceSetup(input, { ...setup, controls: tamperedControls }))
        .toEqual({ kind: "source-id-mismatch", family: "brake-balance" });
    });

    it("rejects an incorrect magnitude", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const tamperedControls = setup.controls.map((control) =>
        control.family === "brake-balance" ? { ...control, magnitude: 99 } : control);
      expect(validateLockedRaceSetup(input, { ...setup, controls: tamperedControls }))
        .toEqual({ kind: "magnitude-mismatch", family: "brake-balance" });
    });

    it("rejects an incorrect per-control applied delta", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const tamperedControls = setup.controls.map((control) =>
        control.family === "brake-balance"
          ? { ...control, appliedDelta: { ...control.appliedDelta, brakingPowerDelta: 999 } }
          : control);
      expect(validateLockedRaceSetup(input, { ...setup, controls: tamperedControls }))
        .toEqual({ kind: "delta-mismatch", family: "brake-balance" });
    });

    it("rejects duplicate family entries", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const duplicated = [...setup.controls, setup.controls[0]];
      expect(validateLockedRaceSetup(input, { ...setup, controls: duplicated }))
        .toEqual({ kind: "duplicate-family", family: setup.controls[0].family });
    });

    it("rejects a tampered aggregate totalDelta even when every control is individually correct", () => {
      const input = validInput();
      const setup = lockRaceSetup(input, { "brake-balance": "high" }) as LockedRaceSetup;
      const tampered = { ...setup, totalDelta: { ...setup.totalDelta, brakingPowerDelta: setup.totalDelta.brakingPowerDelta + 1 } };
      expect(validateLockedRaceSetup(input, tampered)).toEqual({ kind: "aggregate-mismatch" });
    });

    it("rejects wrong family ordering", () => {
      const input = setupInputFor(fourDistinctFamilyBuild());
      const setup = lockRaceSetup(input, {}) as LockedRaceSetup;
      const reordered = [...setup.controls].reverse();
      expect(validateLockedRaceSetup(input, { ...setup, controls: reordered }))
        .toEqual({ kind: "family-order-mismatch" });
    });
  });

  it("Balanced everything preserves an all-zero totalDelta for legacy/no-configurable builds", () => {
    const setup = lockRaceSetup(setupInputFor(zeroConfigurableBuild()), {} as SetupSelections) as LockedRaceSetup;
    expect(setup.controls).toHaveLength(1);
    expect(setup.controls[0]).toMatchObject({ family: "driver-aggression", position: "balanced" });
    expect(setup.totalDelta).toEqual({
      accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0,
    });
  });
});

describe("pre-race setup: real launch items (T032-T033)", () => {
  function itemById(id: string): ItemDefinition {
    const item = Object.values(EXCLUSIVE_ITEMS).flat().find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown launch item ${id}`);
    return item;
  }

  it.each([
    ["mercer-hand-fitted-steering-knuckle", "steering-response"],
    ["soto-two-speed-drive-hub", "gearing"],
    ["rook-variable-pitch-propeller", "propeller-pitch"],
    ["rook-differential-braking-valve", "brake-balance"],
    ["rook-gyroscopic-stabilizer", "racing-line"],
    ["voss-adjustable-bodywork-stay", "bodywork-trim"],
    ["voss-split-circuit-brake-valve", "brake-balance"],
  ] as const)("%s enables exactly one %s control with magnitude 1 when installed", (itemId, family) => {
    const build = vehicleBuild([itemById(itemId)]);
    const eligible = deriveEligibleSetupControls(build);
    const control = eligible.find((candidate) => candidate.family === family)!;
    expect(control).toBeDefined();
    expect(control.magnitude).toBe(1);
    expect(control.sourceItemIds).toEqual([itemId]);
  });

  it("Inez's Differential Braking Valve and Nell's Split-Circuit Brake Valve aggregate into one shared brake-balance control", () => {
    const build = vehicleBuild([
      itemById("rook-differential-braking-valve"),
      itemById("voss-split-circuit-brake-valve"),
    ]);
    const eligible = deriveEligibleSetupControls(build);
    const brakeBalanceControls = eligible.filter((control) => control.family === "brake-balance");
    expect(brakeBalanceControls).toHaveLength(1);

    const control = brakeBalanceControls[0];
    expect(control.magnitude).toBe(2);
    expect(control.sourceItemIds).toEqual(["rook-differential-braking-valve", "voss-split-circuit-brake-valve"]);
    const low = control.positions.find((position) => position.id === "low")!;
    expect(low.delta).toEqual({ accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: -26, corneringSpeedDelta: 2 });
    const high = control.positions.find((position) => position.id === "high")!;
    expect(high.delta).toEqual({ accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 26, corneringSpeedDelta: -2 });
  });

  it("moving the shared brake-balance control to storage removes it entirely (only the fitted item still contributes)", () => {
    const build = vehicleBuild(
      [itemById("rook-differential-braking-valve")],
      [itemById("voss-split-circuit-brake-valve")],
    );
    const eligible = deriveEligibleSetupControls(build);
    const control = eligible.find((candidate) => candidate.family === "brake-balance")!;
    expect(control.magnitude).toBe(1);
    expect(control.sourceItemIds).toEqual(["rook-differential-braking-valve"]);
  });
});
