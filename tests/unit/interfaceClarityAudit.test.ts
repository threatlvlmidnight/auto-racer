import { describe, expect, it } from "vitest";
import {
  AUDIT_CASES,
  AUDIT_VIEWPORTS,
  validateAuditCases,
  type UiAuditCase,
} from "../../src/scenes/cardFeedbackPresentation";

describe("Feature 035 audit-case matrix (T011)", () => {
  it("validates the shipped finite landscape matrix", () => {
    expect(validateAuditCases(AUDIT_CASES)).toEqual({ kind: "valid" });
  });

  it("spans every primary scene at all four fixed viewports and input modes", () => {
    const scenes = new Set(AUDIT_CASES.map((entry) => entry.scene));
    for (const scene of ["TitleScene", "EntrantSelectScene", "DestinationScene", "RunScene", "PrepareScene", "InventoryScene", "PreRaceScene", "ContestScene", "ResultScene", "TestDayScene"]) {
      expect(scenes.has(scene)).toBe(true);
    }
    expect(AUDIT_VIEWPORTS.map((v) => v.id)).toEqual(["1920-1080", "1366-768", "1024-768", "800-450"]);
    const combos = new Set(AUDIT_CASES.map((entry) => `${entry.scene}:${entry.viewportId}:${entry.inputMode}`));
    for (const scene of scenes) {
      for (const viewport of AUDIT_VIEWPORTS) {
        for (const inputMode of ["pointer", "keyboard", "touch"] as const) {
          expect(combos.has(`${scene}:${viewport.id}:${inputMode}`)).toBe(true);
        }
      }
    }
  });

  it("rejects an unsupported viewport and duplicate case ids", () => {
    const badCase: UiAuditCase = {
      caseId: "audit-bad-1",
      scene: "PreRaceScene",
      fixture: "x",
      viewportId: "390-844",
      inputMode: "pointer",
      expectedControls: ["primary-action"],
      expectedFacts: ["identity"],
    };
    const duplicate = { ...AUDIT_CASES[0] };
    const result = validateAuditCases([badCase, AUDIT_CASES[0], duplicate]);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.some((issue) => issue.includes("unsupported viewport"))).toBe(true);
      expect(result.issues.some((issue) => issue.includes("duplicate"))).toBe(true);
    }
  });
});
