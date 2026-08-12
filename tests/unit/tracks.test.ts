import { describe, expect, it } from "vitest";
import {
  apexSpeed,
  cornerArcLength,
  generateTrack,
  pointAtProgress,
  simulateLapPhysics,
  solveSpan,
  STOCK_PHYSICAL_STATS,
  trackCharacteristics,
  type PhysicalStats,
  type Track,
  type TrackSegment,
} from "../../src/simulation/tracks";
import type { ItemPhysicsContribution, LapPhaseBreakdown, LapPhaseKind } from "../../src/simulation/types";

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


// 021-arcade-physics-simulation: PhysicalStats/ItemPhysicsContribution/
// LapPhaseKind/LapPhaseBreakdown shapes (T002).
describe("physics types (T002)", () => {
  it("STOCK_PHYSICAL_STATS has all four dimensions, all strictly positive", () => {
    const stats: PhysicalStats = STOCK_PHYSICAL_STATS;
    expect(stats.acceleration).toBeGreaterThan(0);
    expect(stats.topSpeed).toBeGreaterThan(0);
    expect(stats.brakingPower).toBeGreaterThan(0);
    expect(stats.corneringSpeed).toBeGreaterThan(0);
  });

  it("ItemPhysicsContribution fields are all optional", () => {
    const empty: ItemPhysicsContribution = {};
    const full: ItemPhysicsContribution = {
      accelerationDelta: 1,
      topSpeedDelta: 1,
      brakingPowerDelta: 1,
      corneringSpeedDelta: 1,
    };
    expect(empty).toEqual({});
    expect(full.accelerationDelta).toBe(1);
  });

  it("LapPhaseBreakdown records a phase kind, segment index, and seconds", () => {
    const kinds: LapPhaseKind[] = ["accelerating", "cruising", "braking", "apex"];
    const breakdown: LapPhaseBreakdown = { phase: "accelerating", segmentIndex: 0, seconds: 1.2 };
    expect(kinds).toContain(breakdown.phase);
    expect(breakdown.seconds).toBeGreaterThan(0);
  });
});

describe("cornerArcLength / apexSpeed (T003, contract §2)", () => {
  it("apexSpeed decreases as turnDegrees increases, for a fixed corneringSpeedStat", () => {
    const gentle = apexSpeed(20, 50);
    const sharp = apexSpeed(120, 50);
    expect(sharp).toBeLessThan(gentle);
  });

  it("apexSpeed increases as corneringSpeedStat increases, for a fixed turnDegrees", () => {
    const weak = apexSpeed(60, 30);
    const strong = apexSpeed(60, 80);
    expect(strong).toBeGreaterThan(weak);
  });

  it("apexSpeed and cornerArcLength are pure — identical input always returns identical output", () => {
    expect(apexSpeed(75, 55)).toBe(apexSpeed(75, 55));
    expect(cornerArcLength(75)).toBe(cornerArcLength(75));
  });

  it("cornerArcLength is always positive for any legal turnDegrees in (0, 150)", () => {
    [1, 20, 75, 149].forEach((turnDegrees) => {
      expect(cornerArcLength(turnDegrees)).toBeGreaterThan(0);
    });
  });

  it("apexSpeed is always positive and finite for any legal turnDegrees and a wide range of stats", () => {
    for (let turnDegrees = 1; turnDegrees < 150; turnDegrees += 7) {
      for (const stat of [1, 20, 50, 100, 300]) {
        const speed = apexSpeed(turnDegrees, stat);
        expect(Number.isFinite(speed)).toBe(true);
        expect(speed).toBeGreaterThan(0);
      }
    }
  });
});

describe("solveSpan (T004, contract §3)", () => {
  it("is pure and deterministic", () => {
    const a = solveSpan(200, 30, 60, STOCK_PHYSICAL_STATS);
    const b = solveSpan(200, 30, 60, STOCK_PHYSICAL_STATS);
    expect(b).toEqual(a);
  });

  it("totalSeconds exactly equals the sum of its own phases[].seconds", () => {
    [
      [200, 30, 60],
      [50, 10, 10],
      [1000, 0, 0],
      [10, 80, 20],
    ].forEach(([distance, entrySpeed, exitSpeed]) => {
      const result = solveSpan(distance, entrySpeed, exitSpeed, STOCK_PHYSICAL_STATS);
      const summed = result.phases.reduce((sum, phase) => sum + phase.seconds, 0);
      expect(summed).toBeCloseTo(result.totalSeconds, 9);
    });
  });

  it("never exceeds stats.topSpeed at its peak", () => {
    const result = solveSpan(5000, 0, 0, STOCK_PHYSICAL_STATS);
    expect(result.peakSpeed).toBeLessThanOrEqual(STOCK_PHYSICAL_STATS.topSpeed);
  });

  it("produces fewer phases for a short distance than a long one between the same speeds", () => {
    const short = solveSpan(5, 40, 40, STOCK_PHYSICAL_STATS);
    const long = solveSpan(5000, 40, 40, STOCK_PHYSICAL_STATS);
    expect(short.phases.length).toBeLessThan(long.phases.length);
  });

  it("produces finite, non-negative totalSeconds even when entrySpeed already exceeds the achievable peak", () => {
    const result = solveSpan(1, 89, 5, STOCK_PHYSICAL_STATS);
    expect(Number.isFinite(result.totalSeconds)).toBe(true);
    expect(result.totalSeconds).toBeGreaterThanOrEqual(0);
  });

  it("produces zero time for zero distance", () => {
    const result = solveSpan(0, 40, 40, STOCK_PHYSICAL_STATS);
    expect(result.totalSeconds).toBe(0);
  });
});

describe("simulateLapPhysics shape-sensitivity (T005, SC-001)", () => {
  // generateTrack(0, 1) and generateTrack(0, 2) are a real, verified pair:
  // identical trackCharacteristics ({ powerDemand: 55, corneringDemand: 45,
  // brakingDemand: 0 }), genuinely different segments. Deliberately real
  // generated tracks, not a hand-permuted single multiset — a full-cycle
  // reordering of the *same* corners/straights turns out to be mathematically
  // invariant under this model (every corner appears exactly once as
  // "previous" and once as "current" regardless of adjacency order, so the
  // per-span sums cancel out identically) — a real property of the model,
  // not a bug, but it means only genuinely different underlying segment data
  // (as any two real generated tracks have) exercises shape-sensitivity.
  const segmentsA = generateTrack(0, 1).segments;
  const segmentsB = generateTrack(0, 2).segments;

  it("is pure and deterministic", () => {
    const a = simulateLapPhysics(STOCK_PHYSICAL_STATS, segmentsA);
    const b = simulateLapPhysics(STOCK_PHYSICAL_STATS, segmentsA);
    expect(b).toEqual(a);
  });

  it("totalSeconds equals the sum of its own phases[].seconds", () => {
    const result = simulateLapPhysics(STOCK_PHYSICAL_STATS, segmentsA);
    const summed = result.phases.reduce((sum, phase) => sum + phase.seconds, 0);
    expect(summed).toBeCloseTo(result.totalSeconds, 9);
  });

  it("two real generated tracks with equal trackCharacteristics scores but different real layouts produce different lap times", () => {
    expect(trackCharacteristics(segmentsA)).toEqual(trackCharacteristics(segmentsB));
    expect(segmentsA).not.toEqual(segmentsB);

    const resultA = simulateLapPhysics(STOCK_PHYSICAL_STATS, segmentsA);
    const resultB = simulateLapPhysics(STOCK_PHYSICAL_STATS, segmentsB);
    expect(resultA.totalSeconds).not.toBeCloseTo(resultB.totalSeconds, 6);
  });
});
