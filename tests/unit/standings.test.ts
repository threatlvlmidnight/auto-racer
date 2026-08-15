import { describe, expect, it } from "vitest";
import {
  applyChampionshipResult,
  classificationForPosition,
  createStandings,
  normalFinaleClassification,
  qualifiesForEliteFinale,
  rankStandings,
} from "../../src/simulation/standings";
import type { StandingEntry } from "../../src/simulation/types";

const ids = ["player", "a", "b", "c", "d", "e", "f", "g"] as const;

describe("championship standings", () => {
  it("awards the exact points table and records wins, podiums, and immutable history", () => {
    const original = createStandings(ids);
    const next = applyChampionshipResult(original, ids);
    expect(next.map((entry) => entry.points)).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
    expect(next.map((entry) => entry.wins)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(next.map((entry) => entry.podiums)).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
    expect(original.every((entry) => entry.championshipFinishes.length === 0)).toBe(true);
  });

  it("orders ties by points, wins, podiums, recent finish, then stable order", () => {
    const entry = (entrantId: string, stableOrder: number, overrides: Partial<StandingEntry>): StandingEntry => ({
      entrantId, stableOrder, points: 10, wins: 1, podiums: 2, championshipFinishes: [4], ...overrides,
    });
    const standings = [
      entry("stable-later", 5, {}),
      entry("recent", 4, { championshipFinishes: [3] }),
      entry("podiums", 3, { podiums: 3 }),
      entry("wins", 2, { wins: 2 }),
      entry("points", 1, { points: 11 }),
      entry("stable-first", 0, {}),
    ];
    expect(rankStandings(standings).map((candidate) => candidate.entrantId)).toEqual([
      "points", "wins", "podiums", "recent", "stable-first", "stable-later",
    ]);
  });

  it("qualifies any player tied for the highest raw points after exactly nine races", () => {
    const nineFinishes = Array(9).fill(2);
    const standings = createStandings(ids).map((entry, index) => ({
      ...entry,
      points: index < 2 ? 72 : 10 - index,
      wins: index === 0 ? 0 : 5,
      championshipFinishes: nineFinishes,
    }));
    expect(rankStandings(standings)[0].entrantId).toBe("a");
    expect(qualifiesForEliteFinale(standings, "player")).toBe(true);
    expect(qualifiesForEliteFinale(standings.map((entry) => entry.entrantId === "player" ? { ...entry, points: 71 } : entry), "player")).toBe(false);
    expect(qualifiesForEliteFinale(standings.map((entry) => ({ ...entry, championshipFinishes: entry.championshipFinishes.slice(1) })), "player")).toBe(false);
  });

  it("uses the same 1 / 2-3 / 4-8 classification bands", () => {
    expect(Array.from({ length: 8 }, (_, index) => classificationForPosition(index + 1)))
      .toEqual(["world-champion", "podium", "podium", "classified", "classified", "classified", "classified", "classified"]);
    const standings = applyChampionshipResult(createStandings(ids), ids);
    expect(normalFinaleClassification(standings, "player")).toBe("world-champion");
  });
});
