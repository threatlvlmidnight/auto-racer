import { describe, expect, it } from "vitest";
import { captureProtectedRunState, createPracticeReturnContext, createPracticeSession, resolvePractice } from "../../src/simulation/practice";
import { preRaceSetupPracticeFixture } from "../fixtures/practice-run-fixtures";

describe("Feature 033 enriched Test Day parity", () => {
  it("retains enrichment events while leaving scored run state untouched", () => {
    const fixture = preRaceSetupPracticeFixture();
    const before = captureProtectedRunState(fixture.run);
    const context = createPracticeReturnContext(fixture.run, {
      context: "pre-race-setup",
      selection: fixture.selection,
      navigation: fixture.navigation,
      setupSnapshot: fixture.setupSnapshot,
    });
    const completed = resolvePractice(createPracticeSession(fixture.run, context));
    expect(completed.state).toBe("completed");
    expect(completed.result?.authority).toBe("practice-only");
    expect(completed.result?.contest.enrichment?.events.length).toBeGreaterThan(0);
    expect(completed.result?.contest.enrichment?.phaseSchedule.lapCount).toBe(10);
    expect(captureProtectedRunState(fixture.run)).toEqual(before);
  });
});
