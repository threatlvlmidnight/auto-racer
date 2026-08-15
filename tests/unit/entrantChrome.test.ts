import { describe, expect, it } from "vitest";
import { ENTRANT_CARD_REGIONS, ENTRANT_CARD_SHEET_SIZE } from "../../src/scenes/entrantChrome";

describe("entrant card chrome", () => {
  it("keeps every generated card crop inside its source sheet", () => {
    ENTRANT_CARD_REGIONS.forEach(({ sourceRect }) => {
      expect(sourceRect.x).toBeGreaterThanOrEqual(0);
      expect(sourceRect.y).toBeGreaterThanOrEqual(0);
      expect(sourceRect.x + sourceRect.width).toBeLessThanOrEqual(ENTRANT_CARD_SHEET_SIZE.width);
      expect(sourceRect.y + sourceRect.height).toBeLessThanOrEqual(ENTRANT_CARD_SHEET_SIZE.height);
    });
  });

  it("provides default, focus, and selected states", () => {
    expect(ENTRANT_CARD_REGIONS.map(({ key }) => key)).toEqual(["default", "focus", "selected"]);
  });
});
