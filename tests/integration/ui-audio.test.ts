import { describe, expect, it, vi } from "vitest";
import { createSingleCueActivation } from "../../src/scenes/uiChrome";

describe("Feature 033 shared-control audio", () => {
  it.each(["ui-select", "ui-activate"] as const)(
    "emits one %s cue when artwork and label receive the same input turn",
    async (cue) => {
      const action = vi.fn();
      const emit = vi.fn();
      const activate = createSingleCueActivation(action, cue, emit);

      activate();
      activate();
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(cue);
      expect(action).toHaveBeenCalledTimes(1);

      await Promise.resolve();
      activate();
      expect(emit).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledTimes(2);
    },
  );

  it("does not need an activation bridge for a disabled control", () => {
    const emit = vi.fn();
    const action = vi.fn();
    const enabled = false;
    const activate = enabled ? createSingleCueActivation(action, "ui-activate", emit) : null;

    activate?.();
    expect(emit).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });
});
