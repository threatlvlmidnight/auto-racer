import { describe, expect, it } from "vitest";
import {
  cadenceHistoryView,
  pendingEffectsView,
  statusForPending,
  statusText,
} from "../../src/scenes/cadencePresentation";

describe("cadenceHistoryView — active/pending/settled/unavailable (T069)", () => {
  it("maps immutable history to ordered views with target and expiry", () => {
    const view = cadenceHistoryView([
      { encounterId: "e1", typeId: "scrutineering", family: "sacrifice", stageOrdinal: 3, status: "pending", targetStage: 8, outcomeLabel: "impounded one part" },
      { encounterId: "e2", typeId: "exhibition-trial", family: "exhibition", stageOrdinal: 4, status: "settled", outcomeLabel: "scored 2 of 3" },
      { encounterId: "e3", typeId: "parts-supplier", family: "acquisition", stageOrdinal: 6, status: "unavailable", outcomeLabel: "no legal purchase" },
    ]);
    expect(view).toHaveLength(3);
    expect(view[0].status).toBe("pending");
    expect(view[0].targetStage).toBe(8);
    expect(view[1].status).toBe("settled");
    expect(view[1].targetStage).toBeNull();
    expect(view[2].status).toBe("unavailable");
    expect(view[0].family).toBe("sacrifice");
  });

  it("keeps the source type/family but never reads a color state", () => {
    const view = cadenceHistoryView([{ encounterId: "x", typeId: "scrutineering", family: "sacrifice", stageOrdinal: 1, status: "active", outcomeLabel: "awaiting choice" }]);
    expect(view[0].typeId).toBe("scrutineering");
    expect(view[0].family).toBe("sacrifice");
    expect(statusText("unavailable")).toMatch(/nothing consumed/);
  });
});

describe("pendingEffectsView — one per category (FR-049)", () => {
  it("reports Sponsor and Scrutineering coexistence and text", () => {
    expect(pendingEffectsView({ sponsor: true, scrutineering: false }).sponsor.pending).toBe(true);
    expect(pendingEffectsView({ sponsor: true, scrutineering: false }).scrutineering.pending).toBe(false);
  });
});

describe("statusForPending", () => {
  it("collapses a pending source to the pending status", () => {
    expect(statusForPending({ status: "pending", targetStage: 5, expiryStage: null })).toBe("pending");
    expect(statusForPending({ status: "settled", targetStage: null, expiryStage: null })).toBe("settled");
  });
});
