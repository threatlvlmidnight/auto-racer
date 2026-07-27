import { describe, expect, it } from "vitest";
import { leaderLabel } from "../../src/scenes/contestFormatting";

describe("leaderLabel", () => {
  it("names the player for a negative gap", () => {
    expect(leaderLabel(-1.25)).toBe("PLAYER LEADS · 1.3s");
  });

  it("names the ghost for a positive gap", () => {
    expect(leaderLabel(2.04)).toBe("GHOST LEADS · 2.0s");
  });

  it("labels an exact tie with a numeric gap", () => {
    expect(leaderLabel(0)).toBe("TIED · 0.0s");
  });
});