import { describe, expect, it } from "vitest";
import { closeInventorySession, openInventorySession } from "../../src/scenes/inventoryPresentation";

describe("inventory eligible-host contract", () => {
  it("opens from eligible non-playback hosts and restores exact host state", () => {
    for (const host of ["run-hub", "destination", "reward", "supplier", "sponsor", "pre-race", "result"] as const) {
      const state = { host, selected: "item-1" };
      const opened = openInventorySession({ host, sceneKey: `${host}-scene`, focusKey: "focus", hostState: state, safeBounds: { x: 0, y: 0, width: 800, height: 450 } });
      expect(opened.kind).toBe("opened");
      if (opened.kind === "opened") expect(closeInventorySession(opened.context).hostState).toBe(state);
    }
  });

  it("blocks entry when live playback or another modal owns the surface", () => {
    expect(openInventorySession({ host: "run-hub", sceneKey: "race", focusKey: null, hostState: {}, safeBounds: { x: 0, y: 0, width: 800, height: 450 }, blockedReason: "live-playback" })).toEqual({ kind: "blocked", reason: "live-playback" });
  });
});
