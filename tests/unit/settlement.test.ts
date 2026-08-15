import { describe, expect, it } from "vitest";
import { raceSettlementPolicy } from "../../src/simulation/settlement";

describe("race-kind settlement policy", () => {
  it("uses the exact Local Race tables with no interest or points", () => {
    expect(Array.from({ length: 8 }, (_, index) => raceSettlementPolicy("local", index + 1)))
      .toEqual([
        { raceKind: "local", position: 1, reputationDelta: 1, participationCredits: 1, winBonusCredits: 1, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 2, reputationDelta: 1, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 3, reputationDelta: 1, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 4, reputationDelta: 0, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 5, reputationDelta: 0, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 6, reputationDelta: -1, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 7, reputationDelta: -1, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
        { raceKind: "local", position: 8, reputationDelta: -2, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0, accruesInterest: false },
      ]);
  });

  it("keeps the clarified third-place policy across all scored race kinds", () => {
    expect(raceSettlementPolicy("local", 3)).toMatchObject({ reputationDelta: 1, participationCredits: 1, winBonusCredits: 0, championshipPoints: 0 });
    expect(raceSettlementPolicy("championship", 3)).toMatchObject({ reputationDelta: 1, participationCredits: 2, winBonusCredits: 0, championshipPoints: 6 });
    expect(raceSettlementPolicy("championship", 3)).toMatchObject({ reputationDelta: 1, participationCredits: 2, winBonusCredits: 0, championshipPoints: 6 });
  });

  it("uses the exact Championship Race reputation, purse, interest, and points tables", () => {
    const policies = Array.from({ length: 8 }, (_, index) => raceSettlementPolicy("championship", index + 1));
    expect(policies.map((policy) => policy.reputationDelta)).toEqual([3, 2, 1, 0, -1, -2, -3, -4]);
    expect(policies.map((policy) => policy.championshipPoints)).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
    expect(policies.map((policy) => policy.participationCredits)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
    expect(policies.map((policy) => policy.winBonusCredits)).toEqual([2, 0, 0, 0, 0, 0, 0, 0]);
    expect(policies.every((policy) => policy.accruesInterest)).toBe(true);
  });

  it("rejects positions outside the canonical eight-car field", () => {
    expect(() => raceSettlementPolicy("local", 0)).toThrow(/1 through 8/);
    expect(() => raceSettlementPolicy("championship", 9)).toThrow(/1 through 8/);
    expect(() => raceSettlementPolicy("championship", 1.5)).toThrow(/integer/);
  });
});
