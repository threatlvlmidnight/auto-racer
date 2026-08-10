import { describe, expect, it } from "vitest";
import { TRACKS } from "../../src/content/tracks";
import { pointAtProgress, selectTrack } from "../../src/simulation/tracks";

describe("TRACKS catalog (FR-003, data-model.md Track)", () => {
  it("authors exactly 3 fixed tracks", () => {
    expect(TRACKS).toHaveLength(3);
  });

  it("gives every track a unique id", () => {
    const ids = TRACKS.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("authors each track as a closed loop of at least 8 fixed points", () => {
    TRACKS.forEach((track) => {
      expect(track.points.length).toBeGreaterThanOrEqual(8);
      track.points.forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      });
    });
  });
});

describe("selectTrack determinism (FR-003, Validation Invariant 1)", () => {
  it("returns the identical track for identical (runSeed, pvpStageOrdinal)", () => {
    const first = selectTrack(17, 1);
    const second = selectTrack(17, 1);
    expect(second.id).toBe(first.id);
  });

  it("selects via (runSeed + pvpStageOrdinal) mod 3 over the fixed catalog", () => {
    expect(selectTrack(0, 1).id).toBe(TRACKS[1].id);
    expect(selectTrack(1, 1).id).toBe(TRACKS[2].id);
    expect(selectTrack(2, 1).id).toBe(TRACKS[0].id);
    expect(selectTrack(3, 1).id).toBe(TRACKS[1].id);
  });

  it("never reads live input, wall-clock time, or unseeded randomness (repeated calls agree)", () => {
    for (let seed = -5; seed <= 5; seed += 1) {
      const a = selectTrack(seed, 2);
      const b = selectTrack(seed, 2);
      expect(b.id).toBe(a.id);
    }
  });

  it("always resolves to one of the 3 catalog tracks, even for a negative seed", () => {
    const track = selectTrack(-7, 1);
    expect(TRACKS.map((candidate) => candidate.id)).toContain(track.id);
  });
});

describe("pointAtProgress (per-lap position/heading along a closed loop)", () => {
  const track = TRACKS[0];

  it("returns a point on/near the authored path at progress 0", () => {
    const point = pointAtProgress(track, 0);
    expect(point).toEqual({ x: track.points[0].x, y: track.points[0].y, headingRadians: expect.any(Number) });
  });

  it("wraps progress 1 back to the same point as progress 0", () => {
    expect(pointAtProgress(track, 1)).toEqual(pointAtProgress(track, 0));
  });

  it("produces a finite heading in radians at every sampled progress", () => {
    for (let step = 0; step <= 10; step += 1) {
      const point = pointAtProgress(track, step / 10);
      expect(Number.isFinite(point.headingRadians)).toBe(true);
      expect(point.headingRadians).toBeGreaterThanOrEqual(-Math.PI);
      expect(point.headingRadians).toBeLessThanOrEqual(Math.PI);
    }
  });

  it("moves to a different position as progress advances (never stuck)", () => {
    const start = pointAtProgress(track, 0);
    const quarter = pointAtProgress(track, 0.25);
    expect(quarter).not.toEqual(start);
  });

  it("is pure — identical (track, progress) always returns an identical point", () => {
    expect(pointAtProgress(track, 0.42)).toEqual(pointAtProgress(track, 0.42));
  });
});
