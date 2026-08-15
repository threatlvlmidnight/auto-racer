import { describe, expect, it } from "vitest";
import { raceBoardLayout } from "../../src/scenes/raceBoardPresentation";

describe("race board layout", () => {
  it("fits all four vehicle slots inside the 800px logical viewport", () => {
    const layout = raceBoardLayout(4);
    expect(layout.centers).toHaveLength(4);
    expect(layout.centers[0] - layout.slotWidth / 2).toBeGreaterThanOrEqual(24);
    expect(layout.centers[3] + layout.slotWidth / 2).toBeLessThanOrEqual(776);
  });

  it("retains the established maximum width for three-slot fixtures", () => {
    expect(raceBoardLayout(3).slotWidth).toBe(190);
  });
});
