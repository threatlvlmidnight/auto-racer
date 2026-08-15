import { describe, expect, it } from "vitest";
import {
  chromeBoundsInViewport,
  chromeBoundsOverlap,
  semanticInputState,
  SUPPORTED_UI_VIEWPORTS,
  type UIChromeControlBounds,
} from "../../src/scenes/uiChrome";

const prioritizedControls: readonly UIChromeControlBounds[] = [
  { x: 125, y: 422, width: 170, height: 42 },
  { x: 400, y: 422, width: 235, height: 42 },
  { x: 675, y: 422, width: 170, height: 42 },
  { x: 400, y: 394, width: 250, height: 28 },
];

describe("Feature 032 prioritized chrome viewport contract", () => {
  it("keeps prioritized controls inside every supported logical viewport", () => {
    SUPPORTED_UI_VIEWPORTS.forEach((viewport) => {
      prioritizedControls.forEach((control) => {
        expect(chromeBoundsInViewport(control, viewport)).toBe(true);
      });
    });
  });

  it("does not overlap the action row and exposes non-color input states", () => {
    for (let i = 0; i < prioritizedControls.length; i += 1) {
      for (let j = i + 1; j < prioritizedControls.length; j += 1) {
        // The remember row is intentionally above the action row.
        if (prioritizedControls[i].y !== prioritizedControls[j].y) continue;
        expect(chromeBoundsOverlap(prioritizedControls[i], prioritizedControls[j])).toBe(false);
      }
    }
    expect(semanticInputState(true, false)).toBe("normal");
    expect(semanticInputState(true, true)).toBe("focus");
    expect(semanticInputState(true, true, true)).toBe("pressed");
    expect(semanticInputState(false, false)).toBe("disabled");
  });
});
