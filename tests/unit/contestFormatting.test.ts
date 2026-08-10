import { describe, expect, it } from "vitest";
import { standingsRows } from "../../src/scenes/contestFormatting";
import type { RankedCar } from "../../src/simulation/playback";

const CARS = [
  { id: "player", role: "player" as const, name: "Player", color: "#ffd447" },
  { id: "rival-torres", role: "rival" as const, name: "Torres", color: "#c0524a" },
  { id: "rival-kestrel", role: "rival" as const, name: "Kestrel", color: "#4a90c0" },
];

function ranked(id: string, position: number): RankedCar {
  return { id, position, cumulativeTime: position * 10 };
}

describe("standingsRows (013-race-spectacle live standings sidebar)", () => {
  it("joins standings order with car identity, in live-position order", () => {
    const rows = standingsRows(
      [ranked("rival-kestrel", 1), ranked("player", 2), ranked("rival-torres", 3)],
      CARS,
    );

    expect(rows.map((row) => row.label)).toEqual(["1. Kestrel", "2. Player", "3. Torres"]);
    expect(rows.map((row) => row.color)).toEqual(["#4a90c0", "#ffd447", "#c0524a"]);
  });

  it("flags exactly the player's own row", () => {
    const rows = standingsRows([ranked("rival-torres", 1), ranked("player", 2)], CARS);

    expect(rows.find((row) => row.isPlayer)?.label).toBe("2. Player");
    expect(rows.filter((row) => row.isPlayer)).toHaveLength(1);
  });
});
