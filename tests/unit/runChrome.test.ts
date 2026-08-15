import { describe, expect, it } from "vitest";
import {
  RUN_ENCOUNTER_CARD_REGIONS,
  RUN_ENCOUNTER_CARD_SHEET_SIZE,
  RUN_LEG_STATUS_REGIONS,
  RUN_LEG_STATUS_SHEET_SIZE,
  runLegVisualState,
} from "../../src/scenes/runChrome";

describe("run chrome", () => {
  it("keeps every generated crop inside its source sheet", () => {
    for (const [regions, size] of [
      [RUN_LEG_STATUS_REGIONS, RUN_LEG_STATUS_SHEET_SIZE],
      [RUN_ENCOUNTER_CARD_REGIONS, RUN_ENCOUNTER_CARD_SHEET_SIZE],
    ] as const) {
      regions.forEach(({ sourceRect }) => {
        expect(sourceRect.x).toBeGreaterThanOrEqual(0);
        expect(sourceRect.y).toBeGreaterThanOrEqual(0);
        expect(sourceRect.x + sourceRect.width).toBeLessThanOrEqual(size.width);
        expect(sourceRect.y + sourceRect.height).toBeLessThanOrEqual(size.height);
      });
    }
  });

  it("uses distinct current, next, completed, and distant states", () => {
    expect(runLegVisualState(2, 2)).toBe("completed");
    expect(runLegVisualState(3, 2)).toBe("active");
    expect(runLegVisualState(4, 2)).toBe("upcoming");
    expect(runLegVisualState(5, 2)).toBe("locked");
  });
});
