import { describe, expect, it } from "vitest";
import { generateTrack } from "../../src/simulation/tracks";

const corpus = Array.from({ length: 60 }, (_, seed) =>
  Array.from({ length: 4 }, (_, ordinal) => generateTrack(seed, ordinal + 1)),
).flat();

describe("Feature 033 deterministic circuit corpus", () => {
  it("retains validated, mixed-direction, sampled circuits with positive braking demand", () => {
    for (const track of corpus) {
      expect(track.validation).toMatchObject({ closed: true, inBounds: true, nonSelfIntersecting: true });
      expect(track.validation!.attempt).toBeLessThanOrEqual(12);
      expect(track.validation!.minimumLaneSeparation).toBeGreaterThan(0);
      expect(track.centerline!.length).toBeGreaterThan(track.points.length);
      expect(track.characteristics.brakingDemand).toBeGreaterThan(0);
      const directions = new Set(track.segments.filter((segment) => segment.kind === "corner").map((segment) => segment.direction));
      expect(directions).toEqual(new Set(["left", "right"]));
      expect(generateTrack(Number(track.id.split("-")[1]), Number(track.id.split("-")[2]))).toEqual(track);
    }
  });

  it("covers the racing grammar and rejects regular-polygon sameness", () => {
    const kinds = new Set(corpus.flatMap((track) => track.features?.map((feature) => feature.kind) ?? []));
    expect(kinds.has("straight")).toBe(true);
    expect(kinds.has("sweeper")).toBe(true);
    expect(kinds.has("switchback")).toBe(true);
    const signatures = new Set(corpus.map((track) => JSON.stringify(track.segments.map((segment) =>
      segment.kind === "straight" ? Math.round(segment.length) : `${segment.direction}:${Math.round(segment.turnDegrees)}`))));
    expect(signatures.size / corpus.length).toBeGreaterThan(0.9);
  });
});
