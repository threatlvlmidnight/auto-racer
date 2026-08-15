import { describe, expect, it } from "vitest";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { deriveEligibleSetupControls, lockRaceSetup } from "../../src/simulation/raceSetup";
import { selectEliteFinaleOpponents } from "../../src/simulation/rivals";
import { generateTrack } from "../../src/simulation/tracks";
import type { ExactTrackGhostRecord } from "../../src/simulation/types";

const track = generateTrack(1901, 10);

function record(id: string, ownerId: string, time: number, trackId = track.id): ExactTrackGhostRecord {
  const build = createEmptyVehicleBuild("the-highwheel");
  const eligibleControls = deriveEligibleSetupControls(build);
  const setup = lockRaceSetup({ run: {} as never, encounterId: id, build, track, eligibleControls, initialSelections: {} }, {});
  if (!("controls" in setup)) throw new Error("setup failed");
  return { id, ownerId, displayName: id, recordedTime: time, build, setup: { ...setup, trackId }, trackId, simulationRulesVersion: "v1" };
}

describe("elite Paris exact-track records", () => {
  it("filters player, wrong-track, duplicate-owner, and invalid records before taking the fastest seven", () => {
    const records = [
      record("player", "player-owner", 1),
      record("wrong", "wrong-owner", 2, "wrong-track"),
      record("a-slow", "a", 20),
      record("a-fast", "a", 10),
      ...Array.from({ length: 8 }, (_, index) => record(`r${index}`, `o${index}`, 30 + index)),
    ];
    const selected = selectEliteFinaleOpponents(records, track, "player-owner", 42);
    expect(selected).toHaveLength(7);
    expect(selected[0].id).toBe("a-fast");
    expect(new Set(selected.map((opponent) => opponent.ownerId)).size).toBe(7);
    expect(selected.every((opponent) => opponent.trackId === track.id)).toBe(true);
  });

  it("fills sparse fields deterministically with visibly labeled legal exhibition ghosts", () => {
    const first = selectEliteFinaleOpponents([], track, "player", 73);
    const second = selectEliteFinaleOpponents([], track, "player", 73);
    expect(first).toEqual(second);
    expect(first).toHaveLength(7);
    expect(first.every((opponent) => opponent.provenance === "exhibition-fallback")).toBe(true);
    expect(first.every((opponent) => opponent.displayName.includes("Exhibition Ghost"))).toBe(true);
  });
});
