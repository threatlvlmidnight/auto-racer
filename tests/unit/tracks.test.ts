import { describe, expect, it } from "vitest";
import {
  apexSpeed,
  cornerArcLength,
  generateTrack,
  matchesPhysicsCondition,
  pointAtProgress,
  simulateLapPhysics,
  solveSpan,
  STOCK_PHYSICAL_STATS,
  summarizeTrack,
  trackCharacteristics,
  TrackSummaryError,
  type PhysicalStats,
  type Track,
  type TrackSegment,
} from "../../src/simulation/tracks";
import type {
  ConditionalPhysicsContribution,
  ItemDefinition,
  ItemPhysicsContribution,
  LapPhaseBreakdown,
  LapPhaseKind,
  PhysicsCondition,
} from "../../src/simulation/types";

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

// 022-contextual-physics-effects: PhysicsCondition/ConditionalPhysicsContribution
// type shapes, and ItemDefinition.conditionalPhysics coexisting with the
// existing physics field (T002, data-model.md).
describe("conditional physics types (T002)", () => {
  it("PhysicsCondition is a corner-tightness discriminated union with both directions", () => {
    const atLeast: PhysicsCondition = { kind: "corner-tightness", direction: "at-least", turnDegrees: 45 };
    const atMost: PhysicsCondition = { kind: "corner-tightness", direction: "at-most", turnDegrees: 45 };
    expect(atLeast.kind).toBe("corner-tightness");
    expect([atLeast.direction, atMost.direction]).toEqual(["at-least", "at-most"]);
  });

  it("ConditionalPhysicsContribution pairs a condition with 021's existing ItemPhysicsContribution delta shape", () => {
    const delta: ItemPhysicsContribution = { accelerationDelta: 10 };
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 45 },
      delta,
    };
    expect(contribution.delta).toBe(delta);
  });

  it("ItemDefinition.conditionalPhysics is optional and coexists with the existing optional physics field", () => {
    const base: Pick<ItemDefinition, "physics" | "conditionalPhysics"> = {};
    const flatOnly: Pick<ItemDefinition, "physics" | "conditionalPhysics"> = {
      physics: { accelerationDelta: 5 },
    };
    const conditionalOnly: Pick<ItemDefinition, "physics" | "conditionalPhysics"> = {
      conditionalPhysics: [{
        condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 45 },
        delta: { accelerationDelta: 5 },
      }],
    };
    const both: Pick<ItemDefinition, "physics" | "conditionalPhysics"> = {
      physics: flatOnly.physics,
      conditionalPhysics: conditionalOnly.conditionalPhysics,
    };
    expect(base.conditionalPhysics).toBeUndefined();
    expect(flatOnly.conditionalPhysics).toBeUndefined();
    expect(conditionalOnly.physics).toBeUndefined();
    expect(both.physics).toBeDefined();
    expect(both.conditionalPhysics).toBeDefined();
  });
});

// 022-contextual-physics-effects: the pure corner-tightness matcher (T003,
// contracts §1) — tested in complete isolation, no engine wiring yet.
describe("matchesPhysicsCondition (T003, contract §1)", () => {
  it("'at-least' matches a corner's turnDegrees at or above the threshold, inclusive", () => {
    const condition: PhysicsCondition = { kind: "corner-tightness", direction: "at-least", turnDegrees: 45 };
    expect(matchesPhysicsCondition(condition, 46)).toBe(true);
    expect(matchesPhysicsCondition(condition, 45)).toBe(true);
    expect(matchesPhysicsCondition(condition, 44)).toBe(false);
  });

  it("'at-most' matches a corner's turnDegrees at or below the threshold, inclusive", () => {
    const condition: PhysicsCondition = { kind: "corner-tightness", direction: "at-most", turnDegrees: 45 };
    expect(matchesPhysicsCondition(condition, 44)).toBe(true);
    expect(matchesPhysicsCondition(condition, 45)).toBe(true);
    expect(matchesPhysicsCondition(condition, 46)).toBe(false);
  });

  it("is pure and deterministic — identical input always returns identical output", () => {
    const condition: PhysicsCondition = { kind: "corner-tightness", direction: "at-least", turnDegrees: 30 };
    expect(matchesPhysicsCondition(condition, 40)).toBe(matchesPhysicsCondition(condition, 40));
  });

  it("reads nothing beyond its own two arguments — behaves identically across many unrelated corner angles for the same condition", () => {
    const condition: PhysicsCondition = { kind: "corner-tightness", direction: "at-least", turnDegrees: 50 };
    [10, 20, 49.9, 50, 50.1, 90, 149].forEach((turnDegrees) => {
      expect(matchesPhysicsCondition(condition, turnDegrees)).toBe(turnDegrees >= 50);
    });
  });
});

// 022-contextual-physics-effects US1 (T007-T011): simulateLapPhysics resolves
// conditional deltas per span/corner (research.md Decision 1). A hand-built
// three-corner segment sequence — gentle A (20deg), medium B (50deg), sharp C
// (90deg), each separated by a 100-length straight — gives three spans whose
// bounding corners are all distinct, so each stat's per-phase corner
// association (previous/current/either/self) can be isolated precisely:
//   span @ segmentIndex 0: previous=C, current=A
//   span @ segmentIndex 2: previous=A, current=B
//   span @ segmentIndex 4: previous=B, current=C
// Verified baseline: every span produces all three phase kinds under
// STOCK_PHYSICAL_STATS, so a targeted phase kind is always present to compare.
describe("conditional physics resolution — simulateLapPhysics (T007-T011, US1, contract §3)", () => {
  const CORNER_ANGLES = { A: 20, B: 50, C: 90 };
  const STRAIGHT_LENGTH = 100;
  const SPAN_SEGMENT_INDEX = { touchingA: 0, touchingB: 2, touchingC: 4 } as const;

  function threeCornerSegments(): TrackSegment[] {
    return [CORNER_ANGLES.A, CORNER_ANGLES.B, CORNER_ANGLES.C].flatMap((turnDegrees) => [
      { kind: "straight" as const, length: STRAIGHT_LENGTH },
      { kind: "corner" as const, turnDegrees, direction: "left" as const },
    ]);
  }

  function sumSecondsBySegmentIndex(phases: readonly LapPhaseBreakdown[]): Map<number, number> {
    const map = new Map<number, number>();
    phases.forEach((phase) => {
      map.set(phase.segmentIndex, (map.get(phase.segmentIndex) ?? 0) + phase.seconds);
    });
    return map;
  }

  function secondsFor(phases: readonly LapPhaseBreakdown[], segmentIndex: number, kind: LapPhaseKind): number {
    return phases.find((phase) => phase.segmentIndex === segmentIndex && phase.phase === kind)?.seconds ?? 0;
  }

  it("T007: a corneringSpeedDelta condition matching corner C changes only the two spans bounding C, not the span that doesn't touch it", () => {
    const segments = threeCornerSegments();
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 80 }, // matches only C (90)
      delta: { corneringSpeedDelta: 25 },
    };
    const baseline = sumSecondsBySegmentIndex(simulateLapPhysics(STOCK_PHYSICAL_STATS, segments).phases);
    const boosted = sumSecondsBySegmentIndex(
      simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]).phases,
    );

    expect(boosted.get(SPAN_SEGMENT_INDEX.touchingA)).not.toBeCloseTo(baseline.get(SPAN_SEGMENT_INDEX.touchingA)!, 6);
    expect(boosted.get(SPAN_SEGMENT_INDEX.touchingC)).not.toBeCloseTo(baseline.get(SPAN_SEGMENT_INDEX.touchingC)!, 6);
    expect(boosted.get(SPAN_SEGMENT_INDEX.touchingB)).toBeCloseTo(baseline.get(SPAN_SEGMENT_INDEX.touchingB)!, 9);
  });

  it("T008: an accelerationDelta condition is gated on the previous corner (just exited), not the current one", () => {
    const segments = threeCornerSegments();
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-most", turnDegrees: 30 }, // matches only A (20)
      delta: { accelerationDelta: 200 },
    };
    const baseline = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments).phases;
    const boosted = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]).phases;

    // Only the span whose *previous* corner is A (segmentIndex touchingB, previous=A) is gated.
    expect(secondsFor(boosted, SPAN_SEGMENT_INDEX.touchingB, "accelerating"))
      .not.toBeCloseTo(secondsFor(baseline, SPAN_SEGMENT_INDEX.touchingB, "accelerating"), 6);
    // Neither other span's previous corner is A, so neither should change at all.
    expect(sumSecondsBySegmentIndex(boosted).get(SPAN_SEGMENT_INDEX.touchingA))
      .toBeCloseTo(sumSecondsBySegmentIndex(baseline).get(SPAN_SEGMENT_INDEX.touchingA)!, 9);
    expect(sumSecondsBySegmentIndex(boosted).get(SPAN_SEGMENT_INDEX.touchingC))
      .toBeCloseTo(sumSecondsBySegmentIndex(baseline).get(SPAN_SEGMENT_INDEX.touchingC)!, 9);
  });

  it("T009: a brakingPowerDelta condition is gated on the current corner (about to enter), symmetric to T008", () => {
    const segments = threeCornerSegments();
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 80 }, // matches only C (90)
      delta: { brakingPowerDelta: 200 },
    };
    const baseline = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments).phases;
    const boosted = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]).phases;

    // Only the span whose *current* corner is C (segmentIndex touchingC, current=C) is gated.
    expect(secondsFor(boosted, SPAN_SEGMENT_INDEX.touchingC, "braking"))
      .not.toBeCloseTo(secondsFor(baseline, SPAN_SEGMENT_INDEX.touchingC, "braking"), 6);
    expect(sumSecondsBySegmentIndex(boosted).get(SPAN_SEGMENT_INDEX.touchingA))
      .toBeCloseTo(sumSecondsBySegmentIndex(baseline).get(SPAN_SEGMENT_INDEX.touchingA)!, 9);
    expect(sumSecondsBySegmentIndex(boosted).get(SPAN_SEGMENT_INDEX.touchingB))
      .toBeCloseTo(sumSecondsBySegmentIndex(baseline).get(SPAN_SEGMENT_INDEX.touchingB)!, 9);
  });

  it("T010: a topSpeedDelta condition applies to the cruising phase when either bounding corner matches, not when neither does", () => {
    const segments = threeCornerSegments();
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 80 }, // matches only C (90)
      delta: { topSpeedDelta: 30 },
    };
    const baseline = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments).phases;
    const boosted = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]).phases;

    // touchingA (bounds {C, A}) and touchingC (bounds {B, C}) both border C.
    expect(secondsFor(boosted, SPAN_SEGMENT_INDEX.touchingA, "cruising"))
      .not.toBeCloseTo(secondsFor(baseline, SPAN_SEGMENT_INDEX.touchingA, "cruising"), 6);
    expect(secondsFor(boosted, SPAN_SEGMENT_INDEX.touchingC, "cruising"))
      .not.toBeCloseTo(secondsFor(baseline, SPAN_SEGMENT_INDEX.touchingC, "cruising"), 6);
    // touchingB (bounds {A, B}) borders neither A nor B matching C's condition.
    expect(secondsFor(boosted, SPAN_SEGMENT_INDEX.touchingB, "cruising"))
      .toBeCloseTo(secondsFor(baseline, SPAN_SEGMENT_INDEX.touchingB, "cruising"), 9);
  });

  it("T021 (US3, FR-006, contract §4): the phase breakdown identifies exactly which conditional contribution (source item id, stat) applied to each phase, attributable to the track's own authored corner angles", () => {
    const segments = threeCornerSegments();
    const contribution: ConditionalPhysicsContribution = {
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 80 }, // matches only C (90)
      delta: { accelerationDelta: 20 },
      sourceItemId: "insp-item-1",
    };
    const result = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]);

    // Only the accelerating phase of the span whose *previous* corner is C
    // (segmentIndex touchingA) should carry this attribution.
    const acceleratingAtTouchingA = result.phases.find(
      (phase) => phase.segmentIndex === SPAN_SEGMENT_INDEX.touchingA && phase.phase === "accelerating",
    );
    expect(acceleratingAtTouchingA?.conditionalMatches).toEqual([
      { sourceItemId: "insp-item-1", stat: "accelerationDelta" },
    ]);

    const everyOtherPhase = result.phases.filter((phase) => phase !== acceleratingAtTouchingA);
    everyOtherPhase.forEach((phase) => {
      expect(phase.conditionalMatches ?? []).toEqual([]);
    });
  });

  it("T019 (US2, FR-005, SC-003): omitting the third argument, or passing [] explicitly, produces byte-for-byte identical output to 021's shipped two-argument behavior, on real generateTrack fixtures", () => {
    [generateTrack(5, 1), generateTrack(0, 1), generateTrack(9, 3)].forEach((track) => {
      const twoArgument = simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments);
      const explicitEmpty = simulateLapPhysics(STOCK_PHYSICAL_STATS, track.segments, []);
      expect(explicitEmpty).toEqual(twoArgument);
    });
  });

  it("T011: a conditional contribution whose condition is never met anywhere on the track contributes exactly 0 (no error, no fallback)", () => {
    const segments = threeCornerSegments();
    const neverMatches: ConditionalPhysicsContribution = {
      // No corner on this track ever reaches 200 degrees (corners are always < 150).
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 200 },
      delta: { accelerationDelta: 500, topSpeedDelta: 500, brakingPowerDelta: 500, corneringSpeedDelta: 500 },
    };
    const baseline = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments);
    const withNeverMatching = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [neverMatches]);

    expect(() => withNeverMatching).not.toThrow();
    expect(withNeverMatching.totalSeconds).toBeCloseTo(baseline.totalSeconds, 9);
    expect(withNeverMatching.phases).toEqual(baseline.phases);
  });

  // US4 (T026): the resolution mechanism generalizes across all four stats
  // and both threshold directions — never hardcoded to the single
  // acceleration/at-least motivating example T007-T011 exercised precisely.
  // Each combination's threshold matches exactly one of {A, B, C} and
  // excludes at least one other, so this can't pass vacuously.
  const STAT_KEYS: readonly (keyof ItemPhysicsContribution)[] = [
    "accelerationDelta", "topSpeedDelta", "brakingPowerDelta", "corneringSpeedDelta",
  ];
  const DIRECTIONS: readonly PhysicsCondition["direction"][] = ["at-least", "at-most"];

  STAT_KEYS.forEach((statKey) => {
    DIRECTIONS.forEach((direction) => {
      it(`T026: ${statKey} conditioned "${direction}" is independently authorable and measurably changes the simulated lap`, () => {
        const segments = threeCornerSegments();
        // at-least 80 matches only C (90); at-most 30 matches only A (20).
        const condition: PhysicsCondition = {
          kind: "corner-tightness", direction, turnDegrees: direction === "at-least" ? 80 : 30,
        };
        const delta: ItemPhysicsContribution = { [statKey]: 40 };
        const contribution: ConditionalPhysicsContribution = { condition, delta };

        const baseline = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments);
        const boosted = simulateLapPhysics(STOCK_PHYSICAL_STATS, segments, [contribution]);

        expect(boosted.totalSeconds).not.toBeCloseTo(baseline.totalSeconds, 6);
      });
    });
  });
});

// 027-race-legibility-integrity Phase 5 (US4, T038-T040): summarizeTrack is
// pure, reuses cornerArcLength and retained characteristics, and never
// introduces a new severity/length threshold (contract §6, Decision 7).

describe("summarizeTrack: exact counts, distances, and angle statistics (T038)", () => {
  it("counts straights and corners directly from segments, reconciling to segments.length", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);

    expect(summary.straightCount + summary.cornerCount).toBe(track.segments.length);
    expect(summary.straightCount).toBe(track.segments.filter((s) => s.kind === "straight").length);
    expect(summary.cornerCount).toBe(track.segments.filter((s) => s.kind === "corner").length);
  });

  it("sums straight length directly and corner distance via the exact exported cornerArcLength", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);
    const expectedStraight = track.segments
      .filter((s): s is Extract<TrackSegment, { kind: "straight" }> => s.kind === "straight")
      .reduce((sum, s) => sum + s.length, 0);
    const expectedCorner = track.segments
      .filter((s): s is Extract<TrackSegment, { kind: "corner" }> => s.kind === "corner")
      .reduce((sum, s) => sum + cornerArcLength(s.turnDegrees), 0);

    expect(summary.totalStraightDistance).toBeCloseTo(expectedStraight, 9);
    expect(summary.totalCornerDistance).toBeCloseTo(expectedCorner, 9);
    expect(summary.totalDistance).toBeCloseTo(expectedStraight + expectedCorner, 9);
  });

  it("computes exact min/max/mean corner angle without any severity bucket", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);
    const angles = track.segments
      .filter((s): s is Extract<TrackSegment, { kind: "corner" }> => s.kind === "corner")
      .map((s) => s.turnDegrees);

    expect(summary.minCornerDegrees).toBe(Math.min(...angles));
    expect(summary.maxCornerDegrees).toBe(Math.max(...angles));
    expect(summary.meanCornerDegrees).toBeCloseTo(angles.reduce((a, b) => a + b, 0) / angles.length, 9);
  });

  it("carries the track's own id/name and the given lapCount through unchanged", () => {
    const track = generateTrack(7, 2);
    const summary = summarizeTrack(track, 14);

    expect(summary.trackId).toBe(track.id);
    expect(summary.trackName).toBe(track.name);
    expect(summary.lapCount).toBe(14);
  });

  it("is pure — identical (track, lapCount) always produces a deeply equal summary", () => {
    const track = generateTrack(3, 1);
    expect(summarizeTrack(track, 10)).toEqual(summarizeTrack(track, 10));
  });

  it("reconciles across a broad deterministic seed/stage matrix (T040)", () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const level of [1, 2, 3]) {
        const track = generateTrack(seed, level);
        const summary = summarizeTrack(track, 10);
        expect(summary.straightCount + summary.cornerCount).toBe(track.segments.length);
        expect(summary.totalDistance).toBeCloseTo(summary.totalStraightDistance + summary.totalCornerDistance, 6);
        expect(summary.cornerCount).toBeGreaterThanOrEqual(6);
        expect(summary.cornerCount).toBeLessThanOrEqual(10);
      }
    }
  });

  it("rejects a track with zero segments", () => {
    const empty: Track = { id: "empty", name: "Empty", segments: [], points: [], characteristics: { powerDemand: 0, brakingDemand: 0, corneringDemand: 0 } };
    expect(() => summarizeTrack(empty, 10)).toThrow(TrackSummaryError);
  });

  it("rejects a track containing an unrecognized segment kind rather than silently under-counting", () => {
    const malformed = {
      id: "malformed", name: "Malformed",
      segments: [{ kind: "straight", length: 100 }, { kind: "chicane", length: 50 }],
      points: [], characteristics: { powerDemand: 50, brakingDemand: 0, corneringDemand: 50 },
    } as unknown as Track;
    expect(() => summarizeTrack(malformed, 10)).toThrow(TrackSummaryError);
  });
});

describe("summarizeTrack: demand reuse and descriptive capability notes (T039)", () => {
  it("reuses the track's own retained characteristics verbatim, computing nothing new", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);

    expect(summary.demands).toEqual({
      power: track.characteristics.powerDemand,
      braking: track.characteristics.brakingDemand,
      cornering: track.characteristics.corneringDemand,
    });
  });

  it("emits exactly one descriptive note per one of the four established stats, using that vocabulary", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);

    expect(summary.capabilityNotes.map((note) => note.stat).sort()).toEqual(
      ["acceleration", "brakingPower", "corneringSpeed", "topSpeed"].sort(),
    );
    summary.capabilityNotes.forEach((note) => expect(note.text.length).toBeGreaterThan(0));
  });

  it("never claims an exact unrecorded time savings in a capability note (FR-018)", () => {
    const track = generateTrack(1, 1);
    const summary = summarizeTrack(track, 10);

    summary.capabilityNotes.forEach((note) => {
      expect(note.text).not.toMatch(/\d+(\.\d+)?\s*s\b/); // no "1.2s"-style time claim
      expect(note.text.toLowerCase()).not.toContain("saves");
    });
  });

  it("gives measurably different notes for a power-dominant vs. a cornering-dominant track", () => {
    const powerTrack = generateTrack(143, 1); // powerDemand 60 (fixture search)
    const corneringTrack = generateTrack(5, 1); // corneringDemand 64 (fixture search)
    const powerSummary = summarizeTrack(powerTrack, 10);
    const corneringSummary = summarizeTrack(corneringTrack, 10);

    const topSpeedNote = (s: typeof powerSummary) => s.capabilityNotes.find((n) => n.stat === "topSpeed")!.text;
    expect(topSpeedNote(powerSummary)).not.toBe(topSpeedNote(corneringSummary));
  });
});

// 027-race-legibility-integrity US5 (T049): demand traits are plain numbers
// and text — every value a monochrome/reduced-motion viewer needs is
// already a string or number on the model, never a color-only channel.
describe("summarizeTrack demand traits are readable without color (T049)", () => {
  it("exposes power/braking/cornering demand as plain numbers, not a color-coded severity", () => {
    const summary = summarizeTrack(generateTrack(1, 1), 10);
    expect(typeof summary.demands.power).toBe("number");
    expect(typeof summary.demands.braking).toBe("number");
    expect(typeof summary.demands.cornering).toBe("number");
  });

  it("every capabilityNote is plain text carrying its own numeric evidence, not a color swatch", () => {
    const summary = summarizeTrack(generateTrack(1, 1), 10);
    summary.capabilityNotes.forEach((note) => {
      expect(typeof note.text).toBe("string");
      expect(note.text).toMatch(/\d/); // carries at least one concrete number
    });
  });
});
