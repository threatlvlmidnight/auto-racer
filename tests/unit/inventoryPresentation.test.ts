import { describe, expect, it } from "vitest";
import {
  INVENTORY_OVERLAY_MIN_HEIGHT,
  INVENTORY_OVERLAY_MIN_WIDTH,
  closeInventorySession,
  inventoryLayoutModel,
  openInventorySession,
  selectInventoryPresentation,
  type InventorySafeBounds,
  type InventorySessionInput,
} from "../../src/scenes/inventoryPresentation";
import type { InventoryHostContext } from "../../src/simulation/types";

/**
 * Feature 032 T010: skeleton contract tests for the pure inventory
 * host/layout/session model (research Decision 6). T045 extends this suite
 * with failing responsive/blocked/exact-restoration cases before T057
 * completes the layout; these foundation pins hold throughout.
 */

const wideBounds: InventorySafeBounds = { x: 0, y: 0, width: 800, height: 450 };
const narrowBounds: InventorySafeBounds = { x: 0, y: 0, width: 420, height: 450 };

function sessionInput(overrides: Partial<InventorySessionInput> = {}): InventorySessionInput {
  return {
    host: "run-hub",
    sceneKey: "RunScene",
    focusKey: "hub-continue",
    hostState: { selectedChoice: 1, scroll: 0 },
    safeBounds: wideBounds,
    blockedReason: null,
    ...overrides,
  };
}

describe("presentation selection from measured safe bounds", () => {
  it("chooses overlay when measured space is sufficient", () => {
    expect(selectInventoryPresentation(wideBounds)).toBe("overlay");
  });

  it("chooses full-window below the measured overlay threshold", () => {
    expect(selectInventoryPresentation(narrowBounds)).toBe("full-window");
    expect(selectInventoryPresentation({ x: 0, y: 0, width: 800, height: INVENTORY_OVERLAY_MIN_HEIGHT - 1 }))
      .toBe("full-window");
  });

  it("selects exactly at the thresholds (inclusive bounds)", () => {
    expect(selectInventoryPresentation({
      x: 0, y: 0, width: INVENTORY_OVERLAY_MIN_WIDTH, height: INVENTORY_OVERLAY_MIN_HEIGHT,
    })).toBe("overlay");
  });
});

describe("session open/close contract", () => {
  it("captures the typed host token with derived presentation", () => {
    const opened = openInventorySession(sessionInput());
    expect(opened.kind).toBe("opened");
    if (opened.kind !== "opened") return;

    const context: InventoryHostContext = opened.context;
    expect(context.host).toBe("run-hub");
    expect(context.sceneKey).toBe("RunScene");
    expect(context.focusKey).toBe("hub-continue");
    expect(context.presentation).toBe("overlay");
    expect(context.blockedReason).toBeNull();
  });

  it("is blocked while another modal/transaction is unresolved", () => {
    const blocked = openInventorySession(sessionInput({ blockedReason: "confirm-sale-pending" }));
    expect(blocked).toEqual({ kind: "blocked", reason: "confirm-sale-pending" });
  });

  it("closing restores the exact captured token (reference-preserving)", () => {
    const input = sessionInput({ safeBounds: narrowBounds });
    const opened = openInventorySession(input);
    if (opened.kind !== "opened") throw new Error("expected opened session");

    const restored = closeInventorySession(opened.context);
    expect(restored.host).toBe(input.host);
    expect(restored.sceneKey).toBe(input.sceneKey);
    expect(restored.focusKey).toBe(input.focusKey);
    expect(restored.hostState).toBe(input.hostState);
    expect(restored.hostState).toEqual({ selectedChoice: 1, scroll: 0 });
  });
});

describe("layout skeleton", () => {
  it("provides board and storage regions inside the measured bounds", () => {
    const model = inventoryLayoutModel("overlay", wideBounds);
    expect(model.presentation).toBe("overlay");
    expect(model.regions.map((region) => region.id)).toEqual(["board", "storage"]);
    model.regions.forEach((region) => {
      expect(region.x).toBeGreaterThanOrEqual(wideBounds.x);
      expect(region.y).toBeGreaterThanOrEqual(wideBounds.y);
      expect(region.x + region.width).toBeLessThanOrEqual(wideBounds.x + wideBounds.width);
      expect(region.y + region.height).toBeLessThanOrEqual(wideBounds.y + wideBounds.height);
    });
  });

  it("is deterministic for identical bounds", () => {
    expect(inventoryLayoutModel("full-window", narrowBounds))
      .toEqual(inventoryLayoutModel("full-window", narrowBounds));
  });
});
