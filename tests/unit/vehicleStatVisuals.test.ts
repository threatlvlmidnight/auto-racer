import { describe, expect, it } from "vitest";
import { trackFitChartLayout } from "../../src/scenes/trackFitLayout";
import { VEHICLE_STAT_ORDER, buildVehicleStatLayout } from "../../src/scenes/vehicleStatPresentation";

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "800x450", width: 800, height: 450 },
  { name: "390x844", width: 390, height: 844 },
];

describe("buildVehicleStatLayout", () => {
  it("always places all four stats in the feature 021 order", () => {
    VIEWPORTS.forEach(({ width, height }) => {
      const layout = buildVehicleStatLayout({ width, height }, 0);
      expect(layout.tiles.map((tile) => tile.id)).toEqual(VEHICLE_STAT_ORDER);
    });
  });

  it("never clips a tile at any supported viewport", () => {
    VIEWPORTS.forEach(({ name, width, height }) => {
      const layout = buildVehicleStatLayout({ width, height }, 2);
      expect(layout.horizontalOverflow, `overflow at ${name}`).toBe(false);
    });
  });

  it("switches to a 2x2 grid under the row breakpoint to avoid clipping", () => {
    const narrow = buildVehicleStatLayout({ width: 390, height: 844 }, 0);
    const wide = buildVehicleStatLayout({ width: 1024, height: 768 }, 0);
    expect(narrow.mode).toBe("grid");
    expect(wide.mode).toBe("row");
  });

  it("reserves a conditional-summary region only when conditional sources exist", () => {
    const withConditional = buildVehicleStatLayout({ width: 1024, height: 768 }, 3);
    const withoutConditional = buildVehicleStatLayout({ width: 1024, height: 768 }, 0);
    expect(withConditional.conditionalRegion).not.toBeNull();
    expect(withoutConditional.conditionalRegion).toBeNull();
    expect(withConditional.totalHeight).toBeGreaterThan(withoutConditional.totalHeight);
  });

  it("keeps every tile within the panel's own total bounds", () => {
    VIEWPORTS.forEach(({ width, height }) => {
      const layout = buildVehicleStatLayout({ width, height }, 1);
      layout.tiles.forEach((tile) => {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y + tile.height).toBeLessThanOrEqual(layout.totalHeight);
      });
    });
  });
});

describe("trackFitChartLayout", () => {
  it("keeps the radar and comparison bars inside the compact Results panel", () => {
    const layout = trackFitChartLayout(392, 238);
    expect(layout.centerX - layout.radius).toBeGreaterThan(0);
    expect(layout.centerX + layout.radius).toBeLessThan(layout.width);
    expect(layout.centerY + layout.radius).toBeLessThan(layout.height - 58);
    expect(layout.barWidth * 2 + 34).toBeLessThanOrEqual(layout.width);
  });
});
