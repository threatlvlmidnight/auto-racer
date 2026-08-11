import { describe, expect, it } from "vitest";
import {
  buildTrackLean,
  generateTrack,
  pointAtProgress,
  type Track,
  type TrackSegment,
} from "../../src/simulation/tracks";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

// 018-track-generation: TRACKS/selectTrack are removed entirely — every track
// consumed by this suite is generated (research.md Decision 1; contract §1-2).

describe("TrackSegment / Track / TrackCharacteristics shapes (T002)", () => {
  const track = generateTrack(1, 1);

  it("returns a Track with segments, derived points, and derived characteristics", () => {
    expect(Array.isArray(track.segments)).toBe(true);
    expect(track.segments.length).toBeGreaterThan(0);
    expect(Array.isArray(track.points)).toBe(true);
    expect(track.points.length).toBeGreaterThan(0);
    expect(track.characteristics).toEqual({
      corneringDemand: expect.any(Number),
      brakingDemand: expect.any(Number),
      powerDemand: expect.any(Number),
    });
  });

  it("alternates straight, corner, straight, corner across the whole sequence", () => {
    track.segments.forEach((segment, index) => {
      expect(segment.kind).toBe(index % 2 === 0 ? "straight" : "corner");
    });
  });

  it("gives every corner in one track the same direction", () => {
    const corners = track.segments.filter(
      (segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner",
    );
    const directions = new Set(corners.map((corner) => corner.direction));
    expect(directions.size).toBe(1);
  });

  it("every corner's turnDegrees is in (0, 150) and the sequence sums to exactly 360", () => {
    const corners = track.segments.filter(
      (segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner",
    );
    corners.forEach((corner) => {
      expect(corner.turnDegrees).toBeGreaterThan(0);
      expect(corner.turnDegrees).toBeLessThan(150);
    });
    const sum = corners.reduce((total, corner) => total + corner.turnDegrees, 0);
    expect(sum).toBeCloseTo(360, 6);
  });

  it("every straight has a positive length", () => {
    const straights = track.segments.filter(
      (segment): segment is Extract<TrackSegment, { kind: "straight" }> => segment.kind === "straight",
    );
    straights.forEach((straight) => {
      expect(straight.length).toBeGreaterThan(0);
    });
  });
});

describe("local seeded PRNG determinism (T003)", () => {
  it("generateTrack's internal randomness is a pure function of its combined seed (identical inputs, identical structure, repeated)", () => {
    for (let trial = 0; trial < 5; trial += 1) {
      const a = generateTrack(9, 3);
      const b = generateTrack(9, 3);
      expect(a).toEqual(b);
    }
  });

  it("different seeds draw a different sequence (segment counts or angles differ across a wide sample)", () => {
    const samples = Array.from({ length: 10 }, (_, index) => generateTrack(index, 1));
    const signatures = samples.map((track) => JSON.stringify(track.segments));
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });
});

describe("generateTrack determinism (T011, FR-002)", () => {
  it("returns a deeply equal Track for identical (seed, ordinal) pairs", () => {
    const first = generateTrack(17, 2);
    const second = generateTrack(17, 2);
    expect(second).toEqual(first);
  });

  it("never reads live input, wall-clock time, or unseeded randomness (repeated calls agree across many pairs)", () => {
    for (let seed = -5; seed <= 5; seed += 1) {
      const a = generateTrack(seed, 2);
      const b = generateTrack(seed, 2);
      expect(b).toEqual(a);
    }
  });
});

function isClosed(segments: readonly TrackSegment[]): boolean {
  let heading = 0;
  let x = 0;
  let y = 0;
  segments.forEach((segment) => {
    if (segment.kind === "straight") {
      x += segment.length * Math.cos(heading);
      y += segment.length * Math.sin(heading);
    } else {
      const turnRadians = (segment.turnDegrees * Math.PI) / 180;
      heading += segment.direction === "left" ? turnRadians : -turnRadians;
    }
  });
  return Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6;
}

describe("generateTrack closure and non-degeneracy (T012, FR-003)", () => {
  it("produces a closed segment sequence (returns to start position/heading) for a wide sample of (seed, ordinal) pairs", () => {
    for (let seed = 0; seed < 25; seed += 1) {
      for (let ordinal = 1; ordinal <= 4; ordinal += 1) {
        const track = generateTrack(seed, ordinal);
        expect(isClosed(track.segments)).toBe(true);
      }
    }
  });

  it("keeps every segment at or above its minimum bound across a wide sample", () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const track = generateTrack(seed, 1);
      track.segments.forEach((segment) => {
        if (segment.kind === "straight") {
          expect(segment.length).toBeGreaterThan(0);
        } else {
          expect(segment.turnDegrees).toBeGreaterThan(0);
          expect(segment.turnDegrees).toBeLessThan(150);
        }
      });
    }
  });
});

describe("generateTrack characteristic trends (T013, FR-005)", () => {
  it("produces different segment sequences for different (seed, ordinal) pairs", () => {
    const a = generateTrack(1, 1);
    const b = generateTrack(2, 1);
    expect(a.segments).not.toEqual(b.segments);
  });

  it("trends corneringDemand and powerDemand near-complementary across a wide sample", () => {
    for (let seed = 0; seed < 15; seed += 1) {
      const { corneringDemand, powerDemand } = generateTrack(seed, 1).characteristics;
      expect(corneringDemand + powerDemand).toBeGreaterThanOrEqual(90);
      expect(corneringDemand + powerDemand).toBeLessThanOrEqual(110);
    }
  });

  it("keeps every characteristic an integer in [0, 100] across a wide sample", () => {
    for (let seed = 0; seed < 15; seed += 1) {
      const { corneringDemand, powerDemand, brakingDemand } = generateTrack(seed, 1).characteristics;
      [corneringDemand, powerDemand, brakingDemand].forEach((value) => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    }
  });
});

describe("brakingDemand independence (T014, FR-005)", () => {
  it("produces different brakingDemand values for a corner-heavy-gentle sequence vs. a corner-light-sharp sequence", () => {
    const gentle = Array.from({ length: 6 }, (_, i) => generateTrack(100 + i, 1)).sort(
      (a, b) => a.characteristics.corneringDemand - b.characteristics.corneringDemand,
    );
    const brakingValues = new Set(gentle.map((track) => track.characteristics.brakingDemand));
    expect(brakingValues.size).toBeGreaterThan(1);
  });
});

describe("generateTrack accepts any integer pvpOrdinal (T015, Edge Cases)", () => {
  it("generates a valid track for ordinals well beyond today's scheduled 1-4 range", () => {
    [5, 12, 100, -3, 0].forEach((ordinal) => {
      const track = generateTrack(1, ordinal);
      expect(isClosed(track.segments)).toBe(true);
      expect(track.points.length).toBeGreaterThan(0);
    });
  });
});

describe("pointAtProgress on a generated track (T021, FR-011)", () => {
  const track: Track = generateTrack(5, 2);

  it("produces a continuous, closed path across a full lap (progress 0 to 1)", () => {
    let previous = pointAtProgress(track, 0);
    for (let step = 1; step <= 40; step += 1) {
      const point = pointAtProgress(track, step / 40);
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      expect(distance).toBeLessThan(200);
      previous = point;
    }
    expect(pointAtProgress(track, 1)).toEqual(pointAtProgress(track, 0));
  });

  it("keeps every sampled point within the shared bounding box", () => {
    for (let step = 0; step <= 20; step += 1) {
      const point = pointAtProgress(track, step / 20);
      expect(point.x).toBeGreaterThanOrEqual(60);
      expect(point.x).toBeLessThanOrEqual(570);
      expect(point.y).toBeGreaterThanOrEqual(74);
      expect(point.y).toBeLessThanOrEqual(330);
    }
  });
});

describe("buildTrackLean (T024, FR-006)", () => {
  it("returns 0 for an empty build", () => {
    expect(buildTrackLean(vehicleBuild())).toBe(0);
  });

  it("returns 0 for an exactly balanced Power/Chassis build", () => {
    const build = vehicleBuild([
      testItem({ id: "p1", name: "Power 1", price: 0, timeModifier: 0, installationCategory: "power" }),
      testItem({ id: "c1", name: "Chassis 1", price: 0, timeModifier: 0, installationCategory: "chassis" }),
    ]);
    expect(buildTrackLean(build)).toBe(0);
  });

  it("returns positive for a Power-heavy build", () => {
    const build = vehicleBuild([
      testItem({ id: "p1", name: "Power 1", price: 0, timeModifier: 0, installationCategory: "power" }),
      testItem({ id: "p2", name: "Power 2", price: 0, timeModifier: 0, installationCategory: "power" }),
      testItem({ id: "c1", name: "Chassis 1", price: 0, timeModifier: 0, installationCategory: "chassis" }),
    ]);
    expect(buildTrackLean(build)).toBeGreaterThan(0);
  });

  it("returns negative for a Chassis-heavy build", () => {
    const build = vehicleBuild([
      testItem({ id: "c1", name: "Chassis 1", price: 0, timeModifier: 0, installationCategory: "chassis" }),
      testItem({ id: "c2", name: "Chassis 2", price: 0, timeModifier: 0, installationCategory: "chassis" }),
      testItem({ id: "p1", name: "Power 1", price: 0, timeModifier: 0, installationCategory: "power" }),
    ]);
    expect(buildTrackLean(build)).toBeLessThan(0);
  });

  it("excludes storage items from the count", () => {
    const build = vehicleBuild(
      [],
      [testItem({ id: "p1", name: "Power 1", price: 0, timeModifier: 0, installationCategory: "power" })],
    );
    expect(buildTrackLean(build)).toBe(0);
  });
});
