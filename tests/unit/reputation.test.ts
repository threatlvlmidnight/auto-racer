import { describe, expect, it } from "vitest";
import {
  LOW_REPUTATION_WARNING_THRESHOLD,
  WORLD_TOUR_REPUTATION_START,
  settleWorldTourReputation,
} from "../../src/simulation/reputation";

describe("world-tour reputation and Last Chance", () => {
  it("starts at 12, warns at four, has no cap, and floors at zero", () => {
    expect(WORLD_TOUR_REPUTATION_START).toBe(12);
    expect(LOW_REPUTATION_WARNING_THRESHOLD).toBe(4);
    expect(settleWorldTourReputation({ reputation: 4, lastChanceStatus: "available", delta: 0, hasNextRace: true }).warning).toBe("low");
    expect(settleWorldTourReputation({ reputation: 12, lastChanceStatus: "available", delta: 100, hasNextRace: true }).reputation).toBe(112);
    expect(settleWorldTourReputation({ reputation: 1, lastChanceStatus: "available", delta: -10, hasNextRace: true })).toMatchObject({ reputation: 0, lastChanceStatus: "active" });
  });

  it("grants one active chance and consumes it permanently on recovery", () => {
    const active = settleWorldTourReputation({ reputation: 1, lastChanceStatus: "available", delta: -1, hasNextRace: true });
    expect(active).toEqual({ reputation: 0, lastChanceStatus: "active", failed: false, warning: "last-chance" });
    const recovered = settleWorldTourReputation({ reputation: active.reputation, lastChanceStatus: active.lastChanceStatus, delta: 2, hasNextRace: true });
    expect(recovered).toEqual({ reputation: 2, lastChanceStatus: "consumed", failed: false, warning: "low" });
    expect(settleWorldTourReputation({ reputation: 2, lastChanceStatus: recovered.lastChanceStatus, delta: -2, hasNextRace: true }))
      .toEqual({ reputation: 0, lastChanceStatus: "failed", failed: true, warning: "failed" });
  });

  it("fails when the recovery race remains at zero or no next race exists", () => {
    expect(settleWorldTourReputation({ reputation: 0, lastChanceStatus: "active", delta: 0, hasNextRace: true }).failed).toBe(true);
    expect(settleWorldTourReputation({ reputation: 1, lastChanceStatus: "available", delta: -1, hasNextRace: false }).failed).toBe(true);
  });

  it("evaluates a combined race and sponsor delta once", () => {
    expect(settleWorldTourReputation({ reputation: 1, lastChanceStatus: "available", delta: 3 - 1, hasNextRace: true }))
      .toMatchObject({ reputation: 3, lastChanceStatus: "available", failed: false });
  });
});
