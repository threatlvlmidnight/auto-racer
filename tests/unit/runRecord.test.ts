import { describe, expect, it } from "vitest";
import { projectScoredRaceRecord } from "../../src/simulation/run";

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
