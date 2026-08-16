import { describe, expect, it } from "vitest";
import { projectScoredRaceRecord } from "../../src/simulation/run";
import { projectEncounterHistory } from "../../src/simulation/historyProjection";

describe("Feature 032 retained run record", () => {
  it("counts podiums as wins and all non-podium placements as losses", () => {
    const projection = projectScoredRaceRecord([
      { encounterId: "local", raceKind: "local", position: 1 },
      { encounterId: "championship", raceKind: "championship", position: 3 },
      { encounterId: "elite", raceKind: "elite-finale", position: 4 },
    ]);
    expect(projection.wins).toBe(2);
    expect(projection.losses).toBe(1);
    expect(projection.wins + projection.losses).toBe(projection.entries.length);
  });

  it("has no tie bucket and is deterministic", () => {
    const entries = [{ encounterId: "race", raceKind: "local" as const, position: 8 }];
    expect(projectScoredRaceRecord(entries)).toEqual(projectScoredRaceRecord(entries));
  });
});
describe("Feature 034 encounter-history projection (T066/T068)", () => {
  it("orders chronologically and tags pending category, target, and expiry", () => {
    const view = projectEncounterHistory([
      { encounterId: "e-scrut", typeId: "scrutineering", stageOrdinal: 3, outcome: "pending", creditsDelta: 0, pendingCategory: "scrutineering", targetStage: 8, mutationFingerprint: "impound#a1" },
      { encounterId: "e-show", typeId: "exhibition-trial", stageOrdinal: 1, outcome: "accepted", creditsDelta: 3, mutationFingerprint: "rep+3" },
      { encounterId: "e-workshop", typeId: "upgrade-workshop", stageOrdinal: 2, outcome: "declined", creditsDelta: 0, mutationFingerprint: "none" },
    ]);
    expect(view.map((entry) => entry.stageOrdinal)).toEqual([1, 2, 3]);
    expect(view[2].pending).toBe("scrutineering");
    expect(view[2].targetStage).toBe(8);
    expect(view[0].pending).toBeNull();
  });

  it("is immutable and byte-stable across repeated projections", () => {
    const entries = [
      { encounterId: "a", typeId: "factory-development" as const, stageOrdinal: 2, outcome: "accepted" as const, creditsDelta: 0, mutationFingerprint: "graft" },
    ];
    const input = Object.freeze([...entries.map((entry) => ({ ...entry }))]);
    const first = projectEncounterHistory(input);
    const second = projectEncounterHistory(input);
    expect(second).toEqual(first);
    expect(first[0].evidenceHash.length).toBeGreaterThan(0);
    // The projection leaves the input untouched.
    expect(input).toEqual(entries);
  });
});

