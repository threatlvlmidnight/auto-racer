import { describe, expect, it } from "vitest";
import { STOCK_PHYSICAL_STATS } from "../../src/simulation/tracks";
import { previewGarageCommand, commitGarageCommand } from "../../src/simulation/garage";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import { simulatePlayerLaps } from "../../src/simulation/laps";
import {
  VEHICLE_STAT_ORDER,
  currentVehicleStatModel,
  prospectiveVehicleStatModel,
  recordedLapVehicleStatModel,
  type VehicleStatPanelModel,
} from "../../src/scenes/vehicleStatPresentation";
import { VEHICLE_STAT_FIXTURES } from "../fixtures/vehicle-stat-fixtures";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

describe("vehicle stat vocabulary", () => {
  it("uses one stable four-stat order matching feature 021", () => {
    expect(VEHICLE_STAT_ORDER).toEqual(["acceleration", "topSpeed", "brakingPower", "corneringSpeed"]);
  });

  it("labels, units, and precision come from feature 024's shared definitions", () => {
    const model = currentVehicleStatModel({ build: vehicleBuild(), stock: STOCK_PHYSICAL_STATS });
    expect(model.lines.map((line) => line.key)).toEqual(VEHICLE_STAT_ORDER);
    expect(model.lines[0]).toMatchObject({ label: "Acceleration", unit: "speed/s" });
    expect(model.lines[1]).toMatchObject({ label: "Top Speed", unit: "speed" });
    expect(model.lines[2]).toMatchObject({ label: "Braking Power", unit: "speed/s" });
    expect(model.lines[3]).toMatchObject({ label: "Cornering Speed", unit: "speed" });
  });
});

describe("US1: current vehicle stat model — empty build", () => {
  it("equals stock with no implied bonus for an empty build", () => {
    const model = currentVehicleStatModel({ build: vehicleBuild(), stock: STOCK_PHYSICAL_STATS });
    model.lines.forEach((line, index) => {
      const stat = VEHICLE_STAT_ORDER[index];
      expect(line.currentValue).toBe(STOCK_PHYSICAL_STATS[stat]);
      expect(line.stockDelta).toBe(0);
      expect(line.stockDeltaLabel).toBe("No change");
      expect(line.state).toBe("unchanged");
      expect(line.changeSources).toEqual([]);
    });
    expect(model.conditionalSources).toEqual([]);
    expect(model.status).toBe("available");
  });
});

describe("US1: current vehicle stat model — direct and tradeoff items", () => {
  it("reconciles a direct item's current total with stock plus its own delta", () => {
    const item = VEHICLE_STAT_FIXTURES.direct;
    const model = currentVehicleStatModel({ build: vehicleBuild([item]), stock: STOCK_PHYSICAL_STATS });
    const affectedStat = VEHICLE_STAT_ORDER.find((stat) => (item.physics as Record<string, number>)?.[`${stat}Delta`]);
    expect(affectedStat).toBeDefined();
    const line = model.lines.find((candidate) => candidate.key === affectedStat)!;
    const delta = (item.physics as Record<string, number>)[`${affectedStat}Delta`];
    expect(line.currentValue).toBe(STOCK_PHYSICAL_STATS[affectedStat!] + delta);
    expect(line.stockDelta).toBe(delta);
    expect(line.state).toBe(delta > 0 ? "improved" : "reduced");
    expect(line.changeSources).toHaveLength(1);
    expect(line.changeSources[0]).toMatchObject({ sourceItemId: item.id, sourceLabel: item.name, value: delta });
  });

  it("gives equal visibility to both sides of a tradeoff item", () => {
    const item = VEHICLE_STAT_FIXTURES.tradeoff;
    const model = currentVehicleStatModel({ build: vehicleBuild([item]), stock: STOCK_PHYSICAL_STATS });
    const affectedLines = model.lines.filter((line) => line.changeSources.length > 0);
    expect(affectedLines.some((line) => line.state === "improved")).toBe(true);
    expect(affectedLines.some((line) => line.state === "reduced")).toBe(true);
  });
});

describe("US1: current vehicle stat model — tier, installation, and storage", () => {
  it("uses the tier-adjusted value, not the authored base value", () => {
    const item = VEHICLE_STAT_FIXTURES.direct;
    const build = vehicleBuild([item]);
    const tieredBuild = { ...build, slots: build.slots.map((slot) => (slot.item ? { ...slot, tier: 2 as const } : slot)) };
    const tier1 = currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS });
    const tier2 = currentVehicleStatModel({ build: tieredBuild, stock: STOCK_PHYSICAL_STATS });
    const changedStat = VEHICLE_STAT_ORDER.find((_stat, index) => tier1.lines[index].currentValue !== tier2.lines[index].currentValue);
    expect(changedStat).toBeDefined();
    const before = tier1.lines.find((line) => line.key === changedStat)!;
    const after = tier2.lines.find((line) => line.key === changedStat)!;
    expect(Math.abs(after.stockDelta!)).toBeGreaterThan(Math.abs(before.stockDelta!));
  });

  it("excludes an inert stored item and includes an active-while-stored item", () => {
    const inert = VEHICLE_STAT_FIXTURES.storageInert;
    const active = VEHICLE_STAT_FIXTURES.storageActive;
    const inertModel = currentVehicleStatModel({ build: vehicleBuild([], [inert]), stock: STOCK_PHYSICAL_STATS });
    const activeModel = currentVehicleStatModel({ build: vehicleBuild([], [active]), stock: STOCK_PHYSICAL_STATS });
    expect(inertModel.lines.every((line) => line.changeSources.length === 0)).toBe(true);
    expect(inertModel.lines.every((line) => line.currentValue === line.stockValue)).toBe(true);
    expect(activeModel.lines.some((line) => line.changeSources.length > 0)).toBe(true);
  });
});

describe("US1: current vehicle stat model — Buff and Synergy aggregation", () => {
  it("includes an always-on flat Buff targeting a physical stat", () => {
    const buff = VEHICLE_STAT_FIXTURES.flatBuff;
    const targetStat = buff.buff!.targetStat as (typeof VEHICLE_STAT_ORDER)[number];
    const direct = testItem({ id: "aux-direct", name: "Aux Direct", price: 1, timeModifier: 0, physics: { [`${targetStat}Delta`]: 10 } });
    const model = currentVehicleStatModel({ build: vehicleBuild([buff, direct]), stock: STOCK_PHYSICAL_STATS });
    const line = model.lines.find((candidate) => candidate.key === targetStat)!;
    const expectedDelta = 10 + 10 * (buff.buff!.boostPercent / 100);
    expect(line.stockDelta).toBeCloseTo(expectedDelta);
    expect(line.changeSources.some((source) => source.sourceItemId === direct.id)).toBe(true);
  });

  it("clamps a stat to the simulation's positive minimum", () => {
    const crushing = testItem({ id: "crushing-item", name: "Crushing Item", price: 1, timeModifier: 0, physics: { accelerationDelta: -10000 } });
    const model = currentVehicleStatModel({ build: vehicleBuild([crushing]), stock: STOCK_PHYSICAL_STATS });
    const line = model.lines.find((candidate) => candidate.key === "acceleration")!;
    expect(line.currentValue).toBe(1);
  });

  it("reconciles a synergy amplifier's contribution to the affected item's line", () => {
    const item = VEHICLE_STAT_FIXTURES.synergy;
    const model = currentVehicleStatModel({ build: vehicleBuild([item]), stock: STOCK_PHYSICAL_STATS });
    const totalDelta = model.lines.reduce((sum, line) => sum + (line.stockDelta ?? 0), 0);
    const attributedTotal = model.lines.reduce(
      (sum, line) => sum + line.changeSources.reduce((lineSum, source) => lineSum + source.value, 0), 0,
    );
    expect(attributedTotal).toBeCloseTo(totalDelta);
  });
});

describe("US1: current vehicle stat model — unresolved conditional potential", () => {
  it("keeps a track-conditional item's potential out of the current total", () => {
    const item = VEHICLE_STAT_FIXTURES.conditional;
    const model = currentVehicleStatModel({ build: vehicleBuild([item]), stock: STOCK_PHYSICAL_STATS });
    expect(model.lines.every((line) => line.changeSources.every((source) => source.sourceItemId !== item.id))).toBe(true);
    expect(model.conditionalSources.some((source) => source.sourceItemId === item.id)).toBe(true);
    expect(model.conditionalSources.every((source) => source.state === "conditional")).toBe(true);
  });

  it("keeps a lap-stacking Buff's potential out of the current total", () => {
    const item = VEHICLE_STAT_FIXTURES.stackingBuff;
    const model = currentVehicleStatModel({ build: vehicleBuild([item]), stock: STOCK_PHYSICAL_STATS });
    expect(model.lines.every((line) => line.changeSources.every((source) => source.sourceItemId !== item.id))).toBe(true);
    expect(model.conditionalSources.some((source) => source.sourceItemId === item.id)).toBe(true);
  });
});

describe("US2: prospective vehicle stat model", () => {
  it("matches the authoritative prospective build for a matching-slot destination", () => {
    const build = vehicleBuild();
    const item = VEHICLE_STAT_FIXTURES.direct;
    const preview = previewGarageCommand(
      { build, offers: [{ id: "offer-1", item }] },
      { source: { area: "offer", offerId: "offer-1" }, destination: { area: "vehicle", slotId: build.slots[0].slotId }, replacement: "none" },
    );
    const commit = commitGarageCommand(
      { build, offers: [{ id: "offer-1", item }] },
      { source: { area: "offer", offerId: "offer-1" }, destination: { area: "vehicle", slotId: build.slots[0].slotId }, replacement: "none" },
    );
    expect(commit.kind).toBe("committed");
    const prospectiveBuild = commit.kind === "committed" ? commit.build : build;
    const model = prospectiveVehicleStatModel({
      currentBuild: build, preview, prospectiveBuild, destinationLabel: `Vehicle slot ${build.slots[0].slotId}`, stock: STOCK_PHYSICAL_STATS,
    });
    const authoritative = currentVehicleStatModel({ build: prospectiveBuild, stock: STOCK_PHYSICAL_STATS });
    model.lines.forEach((line, index) => {
      expect(line.currentValue).toBe(authoritative.lines[index].currentValue);
    });
  });

  it("does not mutate the current build and reports zero comparison delta for a no-op", () => {
    const build = vehicleBuild([VEHICLE_STAT_FIXTURES.direct]);
    const slotId = build.slots[0].slotId;
    const preview = previewGarageCommand({ build }, { source: { area: "vehicle", slotId }, destination: { area: "vehicle", slotId }, replacement: "none" });
    const model = prospectiveVehicleStatModel({
      currentBuild: build, preview, prospectiveBuild: build, destinationLabel: `Vehicle slot ${slotId}`, stock: STOCK_PHYSICAL_STATS,
    });
    expect(model.lines.every((line) => line.comparisonDelta === 0)).toBe(true);
    expect(build.slots[0].item?.id).toBe(VEHICLE_STAT_FIXTURES.direct.id);
  });

  function prospectiveModelFor(
    build: ReturnType<typeof vehicleBuild>,
    command: Parameters<typeof commitGarageCommand>[1],
    destinationLabel: string,
  ) {
    const preview = previewGarageCommand({ build }, command);
    const commit = commitGarageCommand({ build }, command);
    expect(commit.kind).toBe("committed");
    const prospectiveBuild = commit.kind === "committed" ? commit.build : build;
    return prospectiveVehicleStatModel({ currentBuild: build, preview, prospectiveBuild, destinationLabel, stock: STOCK_PHYSICAL_STATS });
  }

  it("accounts for both incoming and outgoing contributions on a swap", () => {
    const direct = VEHICLE_STAT_FIXTURES.direct;
    const tradeoff = VEHICLE_STAT_FIXTURES.tradeoff;
    const build = vehicleBuild([direct, tradeoff]);
    const command = { source: { area: "vehicle" as const, slotId: build.slots[0].slotId }, destination: { area: "vehicle" as const, slotId: build.slots[1].slotId }, replacement: "swap" as const };
    const model = prospectiveModelFor(build, command, `Vehicle slot ${build.slots[1].slotId}`);
    const commit = commitGarageCommand({ build }, command);
    expect(commit.kind).toBe("committed");
    const authoritative = currentVehicleStatModel({
      build: commit.kind === "committed" ? commit.build : build,
      stock: STOCK_PHYSICAL_STATS,
    });
    model.lines.forEach((line, index) => expect(line.currentValue).toBe(authoritative.lines[index].currentValue));
    // Both items moved, so at least one stat must reflect the swap rather than staying at stock.
    expect(model.lines.some((line) => line.stockDelta !== 0)).toBe(true);
  });

  it("reflects a tier-up destination's effective (not base) tier value", () => {
    const item = VEHICLE_STAT_FIXTURES.direct;
    const build = vehicleBuild([item]);
    const tieredSourceBuild = { ...build, slots: build.slots.map((slot) => (slot.item ? { ...slot, tier: 2 as const } : slot)) };
    const destinationSlotId = build.slots[1].slotId;
    const command = { source: { area: "vehicle" as const, slotId: build.slots[0].slotId }, destination: { area: "vehicle" as const, slotId: destinationSlotId }, replacement: "none" as const };
    const tier1Model = prospectiveModelFor(build, command, `Vehicle slot ${destinationSlotId}`);
    const tier2Model = prospectiveModelFor(tieredSourceBuild, command, `Vehicle slot ${destinationSlotId}`);
    // Moving keeps the item's own tier (garage.ts contract §5), so the two
    // prospective totals must differ exactly like the two source builds do.
    const changed = tier1Model.lines.some((line, index) => line.currentValue !== tier2Model.lines[index].currentValue);
    expect(changed).toBe(true);
  });

  it("accounts for storage becoming active when a stored item moves onto the vehicle", () => {
    const item = VEHICLE_STAT_FIXTURES.storageActive;
    const build = vehicleBuild([], [item]);
    const emptySlot = build.slots.find((slot) => slot.item === null)!;
    const model = prospectiveModelFor(
      build,
      { source: { area: "storage", index: 0 }, destination: { area: "vehicle", slotId: emptySlot.slotId }, replacement: "none" },
      `Vehicle slot ${emptySlot.slotId}`,
    );
    // Already active-while-stored, so committing to the vehicle changes nothing about its contribution.
    expect(model.lines.every((line) => line.comparisonDelta === 0)).toBe(true);
  });

  it("never mutates the current build when only previewing, even for an occupied destination", () => {
    const build = vehicleBuild([VEHICLE_STAT_FIXTURES.direct, VEHICLE_STAT_FIXTURES.tradeoff]);
    const snapshot = JSON.stringify(build);
    prospectiveModelFor(
      build,
      { source: { area: "vehicle", slotId: build.slots[0].slotId }, destination: { area: "vehicle", slotId: build.slots[1].slotId }, replacement: "swap" },
      "Vehicle slot 2",
    );
    expect(JSON.stringify(build)).toBe(snapshot);
  });

  it("restores current values when a preview is invalid, rather than showing a stale prospective total", () => {
    const build = vehicleBuild([VEHICLE_STAT_FIXTURES.direct]);
    const invalidPreview = previewGarageCommand(
      { build, offers: [] },
      { source: { area: "offer", offerId: "does-not-exist" }, destination: { area: "storage", index: 0 }, replacement: "none" },
    );
    expect(invalidPreview.reason).toBe("stale-offer");
    // The scene-level contract (FR-009) is: on an invalid preview, fall back
    // to currentVehicleStatModel rather than calling prospectiveVehicleStatModel
    // with a fabricated build. Confirm that fallback is itself just the honest,
    // unchanged current model.
    const fallback = currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS });
    expect(fallback.lines.every((line) => line.comparisonDelta === null)).toBe(true);
  });
});

describe("US3: recorded lap vehicle stat model", () => {
  it("equals the recorded lap's authoritative physics stats", () => {
    const stats = { acceleration: 55, topSpeed: 95, brakingPower: 62, corneringSpeed: 51 };
    const model = recordedLapVehicleStatModel({ lap: 3, lapCount: 5, physics: { stats } });
    model.lines.forEach((line) => expect(line.currentValue).toBe(stats[line.key]));
    expect(model.status).toBe("partially-available");
  });

  it("reports unavailable rather than substituting stock or stale values when physics evidence is missing", () => {
    const model = recordedLapVehicleStatModel({ lap: 1, lapCount: 5 });
    expect(model.status).toBe("unavailable");
    expect(model.unavailableReason).not.toBeNull();
    expect(model.lines.every((line) => line.currentValue === null)).toBe(true);
  });

  it("reports test-day unavailability distinctly", () => {
    const model = recordedLapVehicleStatModel({ lap: 1, lapCount: 5, contextKind: "test-day" });
    expect(model.status).toBe("unavailable");
    expect(model.context).toEqual({ kind: "test-day", lap: 1 });
  });
});

describe("shared structural invariants", () => {
  function assertStructurallySound(model: VehicleStatPanelModel): void {
    expect(model.lines).toHaveLength(4);
    expect(model.lines.map((line) => line.key)).toEqual(VEHICLE_STAT_ORDER);
    model.lines.forEach((line) => {
      if (line.currentValue === null) {
        expect(line.state).toBe("unavailable");
      } else {
        expect(["improved", "reduced", "unchanged"]).toContain(line.state);
      }
    });
  }

  it("holds for current, prospective, and recorded-lap models alike", () => {
    const build = vehicleBuild([VEHICLE_STAT_FIXTURES.direct]);
    assertStructurallySound(currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS }));
    assertStructurallySound(recordedLapVehicleStatModel({ lap: 1, lapCount: 5, physics: { stats: STOCK_PHYSICAL_STATS } }));
    assertStructurallySound(recordedLapVehicleStatModel({ lap: 1, lapCount: 5 }));
  });
});

// 025-vehicle-stat-display US4 (T041/T043): every state must be legible from
// text/structure alone, with no dependency on color or hover, so keyboard,
// touch, monochrome, and reduced-motion review all see the same information.
describe("US4: monochrome- and hover-independent legibility", () => {
  it("gives every distinct line state its own textual label, not a color-only signal", () => {
    const improving = testItem({ id: "mono-gain", name: "Mono Gain", price: 1, timeModifier: 0, physics: { accelerationDelta: 5 } });
    const reducing = testItem({ id: "mono-loss", name: "Mono Loss", price: 1, timeModifier: 0, physics: { topSpeedDelta: -5 } });
    const model = currentVehicleStatModel({ build: vehicleBuild([improving, reducing]), stock: STOCK_PHYSICAL_STATS });
    const byState = new Map(model.lines.map((line) => [line.state, line]));
    expect(byState.get("improved")?.stockDeltaLabel).toMatch(/^\+/);
    expect(byState.get("reduced")?.stockDeltaLabel).toMatch(/^−|^-/);
    expect(byState.get("unchanged")?.stockDeltaLabel).toBe("No change");
    // Every line's textual state is self-sufficient without reading color.
    model.lines.forEach((line) => {
      expect(line.state.length).toBeGreaterThan(0);
      expect(typeof line.currentLabel).toBe("string");
    });
  });

  it("carries a complete accessibility label reachable without hover for current, preview, and race contexts", () => {
    const build = vehicleBuild([VEHICLE_STAT_FIXTURES.direct]);
    const current = currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS });
    const race = recordedLapVehicleStatModel({ lap: 2, lapCount: 5, physics: { stats: STOCK_PHYSICAL_STATS } });
    const unavailable = recordedLapVehicleStatModel({ lap: 2, lapCount: 5 });
    [current, race, unavailable].forEach((model) => {
      expect(model.accessibilityLabel.length).toBeGreaterThan(0);
      expect(model.accessibilityLabel).toContain(model.contextLabel);
    });
    // Unavailable evidence is stated explicitly, not silently omitted.
    expect(unavailable.accessibilityLabel).toContain(unavailable.unavailableReason);
  });

  it("marks a conditional source distinctly from an active one in both state and label", () => {
    const model = currentVehicleStatModel({ build: vehicleBuild([VEHICLE_STAT_FIXTURES.conditional]), stock: STOCK_PHYSICAL_STATS });
    expect(model.conditionalSources.length).toBeGreaterThan(0);
    model.conditionalSources.forEach((source) => {
      expect(source.state).toBe("conditional");
      expect(source.conditionLabel.length).toBeGreaterThan(0);
    });
  });
});

// 025-vehicle-stat-display Phase 7 (T046/T047): every catalog item, installed
// alone in its legal slot, must produce a finite, reconciling current-build
// model — and this presentation layer must never change what the simulation
// itself resolves for that same build (spec.md FR-021, SC-003, SC-008).
describe("Phase 7: catalog-wide regression", () => {
  const ALL_ITEMS = [NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS)].flat();

  it("has exactly the 70 authored items", () => {
    expect(ALL_ITEMS).toHaveLength(70);
  });

  it("reconciles current totals to stock plus attributed sources for every item, installed and stored", () => {
    ALL_ITEMS.forEach((item) => {
      [vehicleBuild([item]), vehicleBuild([], [item])].forEach((build) => {
        const model = currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS });
        model.lines.forEach((line) => {
          expect(Number.isFinite(line.currentValue)).toBe(true);
          expect(line.currentValue).toBeGreaterThanOrEqual(1);
          const attributed = line.changeSources.reduce((sum, source) => sum + source.value, 0);
          // Clamping to the simulation's positive minimum means a heavily
          // negative attributed sum can legitimately exceed the clamped
          // total — reconciliation only has to hold in the unclamped range.
          if (line.currentValue! > 1) {
            expect(line.stockDelta).toBeCloseTo(attributed, 6);
          }
        });
      });
    });
  });

  it("never alters the deterministic lap/build simulation output for any item (FR-021, SC-008)", () => {
    ALL_ITEMS.forEach((item) => {
      const build = vehicleBuild([item]);
      const before = JSON.stringify(build);
      const laps = simulatePlayerLaps(build);
      // Presentation-layer resolution must be read-only over the build...
      currentVehicleStatModel({ build, stock: STOCK_PHYSICAL_STATS });
      expect(JSON.stringify(build)).toBe(before);
      // ...and byte-identical to simulation run again on the same build.
      expect(simulatePlayerLaps(build)).toEqual(laps);
    });
  });
});
