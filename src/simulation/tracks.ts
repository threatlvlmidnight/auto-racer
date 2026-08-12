import type { LapPhaseBreakdown } from "./types";

// 018-track-generation: tracks are procedurally generated, not hand-authored
// (research.md Decision 1). TRACKS/selectTrack are removed entirely.

export type TrackSegment =
  | { kind: "straight"; length: number }
  | { kind: "corner"; turnDegrees: number; direction: "left" | "right" };

export interface TrackCharacteristics {
  corneringDemand: number;
  brakingDemand: number;
  powerDemand: number;
}

export interface Track {
  id: string;
  name: string;
  segments: readonly TrackSegment[];
  points: readonly { x: number; y: number }[];
  characteristics: TrackCharacteristics;
}

export interface TrackPoint {
  x: number;
  y: number;
  headingRadians: number;
}

/** A build's capability in each of four physical dimensions (021 data-model.md). */
export interface PhysicalStats {
  acceleration: number;
  topSpeed: number;
  brakingPower: number;
  corneringSpeed: number;
}

// --- Balance-pass placeholders (research.md Decision 3/4) ------------------
const MIN_CORNER_COUNT = 6;
const MAX_CORNER_COUNT = 10;
const RAW_CORNER_DEGREES_MIN = 20;
const RAW_CORNER_DEGREES_MAX = 55;
const BASE_STRAIGHT_LENGTH = 160;
const MIN_STRAIGHT_LENGTH = 40;
/**
 * Cornering "length" is a super-linear function of each corner's own angle,
 * not a linear one — every track's turnDegrees sum to exactly 360° by the
 * closure invariant, so a linear formula would make total cornering length
 * constant across every track. Raising each corner's angle to a power >1
 * before scaling makes a track's total cornering weight sensitive to how
 * concentrated its turning is (a few sharp corners score higher than many
 * gentle ones for the same 360° total), giving corneringDemand genuine,
 * track-specific range instead of being driven by corner count alone.
 */
const CORNER_LENGTH_EXPONENT = 1.5;
const CORNER_LENGTH_SCALE = 0.5;
const SHARP_CORNER_DEGREES = 55;
const BRAKING_REFERENCE = 260;
const BOUNDING_BOX = { minX: 70, maxX: 560, minY: 84, maxY: 320 };

// --- 021-arcade-physics-simulation: balance-pass placeholders --------------
/**
 * A corner's own physics-only arc-length — distinct from its zero-length
 * geometric vertex representation used by deriveTrackPoints/pointAtProgress
 * (research.md Decision 2). Same super-linear shape as trackCharacteristics'
 * cornering-length formula, but its own separate constants: this one is
 * calibrated to a physical distance real straights can be compared against,
 * not scoring variance.
 */
const CORNER_ARC_LENGTH_EXPONENT = 1.2;
const CORNER_ARC_LENGTH_SCALE = 1;
/** The turnDegrees at which corneringSpeedStat itself equals the apex speed. */
const APEX_SPEED_REFERENCE_ANGLE = 60;
/** Symmetric default split of a corner's own arc-length (research.md Decision 4). */
const CORNER_ENTRY_RATIO = 0.5;
/** Guards every solveSpan phase/distance comparison against float noise. */
const PHYSICS_EPSILON = 1e-9;

/**
 * mulberry32 (public-domain), seeded once per generateTrack call from a
 * single combined integer (research.md Decision 2) — no library dependency
 * for ten lines of well-known PRNG code.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Raw per-corner angles scaled to sum to exactly 360° (research.md Decision 1). */
function generateCornerAngles(rng: () => number, count: number): number[] {
  const raw = Array.from(
    { length: count },
    () => RAW_CORNER_DEGREES_MIN + rng() * (RAW_CORNER_DEGREES_MAX - RAW_CORNER_DEGREES_MIN),
  );
  const sum = raw.reduce((total, value) => total + value, 0);
  const scale = 360 / sum;
  return raw.map((value) => value * scale);
}

/**
 * Solves for each straight's length so the turtle-walk closes back to its
 * start position exactly (heading-closure is already guaranteed for free by
 * the corner angles summing to 360°). Distributes the closure correction
 * across every straight via a minimum-norm least-squares solve over the two
 * position constraints (Σ L·cosθ = 0, Σ L·sinθ = 0) — a closed-form
 * computation, never an iterative retry/rejection loop.
 */
function closingStraightLengths(headingsDegrees: readonly number[]): number[] {
  const headings = headingsDegrees.map((degrees) => (degrees * Math.PI) / 180);
  const cosH = headings.map((h) => Math.cos(h));
  const sinH = headings.map((h) => Math.sin(h));
  const rx = cosH.reduce((sum, c) => sum + c, 0) * BASE_STRAIGHT_LENGTH;
  const ry = sinH.reduce((sum, s) => sum + s, 0) * BASE_STRAIGHT_LENGTH;
  const sxx = cosH.reduce((sum, c) => sum + c * c, 0);
  const sxy = cosH.reduce((sum, c, i) => sum + c * sinH[i], 0);
  const syy = sinH.reduce((sum, s) => sum + s * s, 0);
  const det = sxx * syy - sxy * sxy;
  const a = (-rx * syy + ry * sxy) / det;
  const b = (-sxx * ry + sxy * rx) / det;
  return headings.map((_, i) =>
    Math.max(MIN_STRAIGHT_LENGTH, BASE_STRAIGHT_LENGTH + a * cosH[i] + b * sinH[i]));
}

/**
 * Turtle-walks segments into a closed point path, then uniformly scales and
 * translates it into the same bounding box 013-race-spectacle's hand-authored
 * tracks shared, so that feature's fixed-layout rendering needs no change
 * (research.md Decision 3, FR-011).
 */
function deriveTrackPoints(segments: readonly TrackSegment[]): readonly { x: number; y: number }[] {
  let heading = 0;
  let x = 0;
  let y = 0;
  const raw: { x: number; y: number }[] = [];
  segments.forEach((segment) => {
    if (segment.kind === "straight") {
      x += segment.length * Math.cos(heading);
      y += segment.length * Math.sin(heading);
      raw.push({ x, y });
    } else {
      const turnRadians = (segment.turnDegrees * Math.PI) / 180;
      heading += segment.direction === "left" ? turnRadians : -turnRadians;
    }
  });
  return fitToBoundingBox(raw);
}

function fitToBoundingBox(points: readonly { x: number; y: number }[]): readonly { x: number; y: number }[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rawWidth = maxX - minX || 1;
  const rawHeight = maxY - minY || 1;
  const targetWidth = BOUNDING_BOX.maxX - BOUNDING_BOX.minX;
  const targetHeight = BOUNDING_BOX.maxY - BOUNDING_BOX.minY;
  const scale = Math.min(targetWidth / rawWidth, targetHeight / rawHeight);
  const offsetX = BOUNDING_BOX.minX + (targetWidth - rawWidth * scale) / 2;
  const offsetY = BOUNDING_BOX.minY + (targetHeight - rawHeight * scale) / 2;
  return points.map((point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  }));
}

/** Derived from segments alone, never authored or set independently (research.md Decision 4). */
export function trackCharacteristics(segments: readonly TrackSegment[]): TrackCharacteristics {
  const straights = segments.filter(
    (segment): segment is Extract<TrackSegment, { kind: "straight" }> => segment.kind === "straight",
  );
  const corners = segments.filter(
    (segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner",
  );

  const totalStraightLength = straights.reduce((sum, straight) => sum + straight.length, 0);
  const totalCorneringLength = corners.reduce(
    (sum, corner) => sum + Math.pow(corner.turnDegrees, CORNER_LENGTH_EXPONENT) * CORNER_LENGTH_SCALE,
    0,
  );
  const totalNotionalLength = totalStraightLength + totalCorneringLength;

  const sharpCornerAngleSum = corners
    .filter((corner) => corner.turnDegrees > SHARP_CORNER_DEGREES)
    .reduce((sum, corner) => sum + corner.turnDegrees, 0);

  return {
    powerDemand: Math.round((100 * totalStraightLength) / totalNotionalLength),
    corneringDemand: Math.round((100 * totalCorneringLength) / totalNotionalLength),
    brakingDemand: Math.round(100 * clamp(sharpCornerAngleSum / BRAKING_REFERENCE, 0, 1)),
  };
}

/** The stock (no-item) baseline physical stats (021 data-model.md). */
export const STOCK_PHYSICAL_STATS: PhysicalStats = {
  acceleration: 40,
  topSpeed: 90,
  brakingPower: 60,
  corneringSpeed: 50,
};

/**
 * A corner's own physics-only traversal distance, in the same abstract
 * units as a straight's `length` — a new notion distinct from the zero-
 * length geometric vertex `deriveTrackPoints` already uses for rendering
 * (research.md Decision 2, contract §2).
 */
export function cornerArcLength(turnDegrees: number): number {
  return Math.pow(turnDegrees, CORNER_ARC_LENGTH_EXPONENT) * CORNER_ARC_LENGTH_SCALE;
}

/**
 * A corner's own maximum negotiable (apex) speed — sharper corners always
 * require a lower speed than gentler ones for the same build; a build with
 * more cornering-speed capability is always faster through the same corner
 * (research.md Decision 3, contract §2).
 */
export function apexSpeed(turnDegrees: number, corneringSpeedStat: number): number {
  return corneringSpeedStat * Math.sqrt(APEX_SPEED_REFERENCE_ANGLE / turnDegrees);
}

export interface SpanPhase {
  kind: "accelerating" | "cruising" | "braking";
  seconds: number;
  distance: number;
}

export interface SpanResult {
  peakSpeed: number;
  phases: SpanPhase[];
  totalSeconds: number;
}

/**
 * The standard closed-form trapezoidal velocity-profile solution: accelerate
 * from entrySpeed, optionally cruise at stats.topSpeed, then brake down to
 * exitSpeed, covering exactly `distance` (research.md Decision 1, contract
 * §3). Pure function of its own four arguments — no track/build/item lookup.
 * Falls back to a single best-effort accelerate-only or brake-only phase
 * when `distance` is too short for both target speeds to be reached exactly
 * — always finite, always non-negative, never NaN.
 */
export function solveSpan(
  distance: number,
  entrySpeed: number,
  exitSpeed: number,
  stats: PhysicalStats,
): SpanResult {
  const { acceleration: a, brakingPower: b, topSpeed } = stats;

  if (distance <= 0) {
    return { peakSpeed: entrySpeed, phases: [], totalSeconds: 0 };
  }

  const algebraicPeakSquared = (2 * a * b * distance + b * entrySpeed ** 2 + a * exitSpeed ** 2) / (a + b);

  if (algebraicPeakSquared < Math.max(entrySpeed ** 2, exitSpeed ** 2)) {
    // Not enough distance to reach a mutual peak — best-effort single phase
    // covering the whole span (research.md Decision 1's degenerate case).
    if (exitSpeed >= entrySpeed) {
      const endSpeed = Math.min(topSpeed, Math.sqrt(entrySpeed ** 2 + 2 * a * distance));
      const seconds = (endSpeed - entrySpeed) / a;
      const phases: SpanPhase[] = seconds > PHYSICS_EPSILON
        ? [{ kind: "accelerating", seconds, distance }]
        : [];
      return { peakSpeed: endSpeed, phases, totalSeconds: Math.max(0, seconds) };
    }
    const endSpeed = Math.sqrt(Math.max(0, entrySpeed ** 2 - 2 * b * distance));
    const seconds = (entrySpeed - endSpeed) / b;
    const phases: SpanPhase[] = seconds > PHYSICS_EPSILON
      ? [{ kind: "braking", seconds, distance }]
      : [];
    return { peakSpeed: entrySpeed, phases, totalSeconds: Math.max(0, seconds) };
  }

  const peakSpeed = Math.min(topSpeed, Math.sqrt(algebraicPeakSquared));
  const phases: SpanPhase[] = [];
  let totalSeconds = 0;

  const accelDistance = Math.max(0, (peakSpeed ** 2 - entrySpeed ** 2) / (2 * a));
  const accelSeconds = (peakSpeed - entrySpeed) / a;
  if (accelSeconds > PHYSICS_EPSILON) {
    phases.push({ kind: "accelerating", seconds: accelSeconds, distance: accelDistance });
    totalSeconds += accelSeconds;
  }

  const brakeDistance = Math.max(0, (peakSpeed ** 2 - exitSpeed ** 2) / (2 * b));
  const brakeSeconds = (peakSpeed - exitSpeed) / b;

  const cruiseDistance = distance - accelDistance - brakeDistance;
  if (cruiseDistance > PHYSICS_EPSILON) {
    const cruiseSeconds = cruiseDistance / peakSpeed;
    phases.push({ kind: "cruising", seconds: cruiseSeconds, distance: cruiseDistance });
    totalSeconds += cruiseSeconds;
  }

  if (brakeSeconds > PHYSICS_EPSILON) {
    phases.push({ kind: "braking", seconds: brakeSeconds, distance: brakeDistance });
    totalSeconds += brakeSeconds;
  }

  return { peakSpeed, phases, totalSeconds };
}

/**
 * Flattens a track's real segment sequence into inter-apex spans (research.md
 * Decision 1) and sums each span's solveSpan result — never reading the
 * precomputed aggregate trackCharacteristics scores (FR-001, contract §4).
 * The specific property this whole feature exists to guarantee: two segment
 * sequences with equal aggregate scores but different real layouts produce
 * different totals (SC-001).
 */
export function simulateLapPhysics(
  stats: PhysicalStats,
  segments: readonly TrackSegment[],
): { totalSeconds: number; phases: LapPhaseBreakdown[] } {
  const corners = segments
    .map((segment, index) => ({ segment, index }))
    .filter((entry): entry is { segment: Extract<TrackSegment, { kind: "corner" }>; index: number } =>
      entry.segment.kind === "corner");
  const straights = segments
    .map((segment, index) => ({ segment, index }))
    .filter((entry): entry is { segment: Extract<TrackSegment, { kind: "straight" }>; index: number } =>
      entry.segment.kind === "straight");

  const cornerCount = corners.length;
  const arcLengths = corners.map((entry) => cornerArcLength(entry.segment.turnDegrees));
  const entryLengths = arcLengths.map((length) => length * CORNER_ENTRY_RATIO);
  const exitLengths = arcLengths.map((length) => length * (1 - CORNER_ENTRY_RATIO));
  const apexSpeeds = corners.map((entry) => apexSpeed(entry.segment.turnDegrees, stats.corneringSpeed));

  const phases: LapPhaseBreakdown[] = [];
  let totalSeconds = 0;

  for (let i = 0; i < cornerCount; i += 1) {
    const previous = (i - 1 + cornerCount) % cornerCount;
    const distance = exitLengths[previous] + straights[i].segment.length + entryLengths[i];
    const span = solveSpan(distance, apexSpeeds[previous], apexSpeeds[i], stats);
    span.phases.forEach((phase) => {
      phases.push({ phase: phase.kind, segmentIndex: straights[i].index, seconds: phase.seconds });
      totalSeconds += phase.seconds;
    });
  }

  return { totalSeconds, phases };
}

/**
 * Pure, deterministic track generation (contract §2, FR-002). Accepts only a
 * plain numeric seed and PvP ordinal — never a Run or player-identity object
 * — so a future shared-lobby race can supply one seed for a group of players
 * with zero rework here (spec.md Assumptions).
 */
export function generateTrack(seed: number, pvpOrdinal: number): Track {
  const rng = seededRandom(seed * 1000003 + pvpOrdinal);
  const cornerCount = randomInt(rng, MIN_CORNER_COUNT, MAX_CORNER_COUNT);
  const direction: "left" | "right" = rng() < 0.5 ? "left" : "right";
  const turnDegrees = generateCornerAngles(rng, cornerCount);

  const headingsBeforeEachStraight: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < cornerCount; i += 1) {
    headingsBeforeEachStraight.push(cumulative);
    cumulative += turnDegrees[i];
  }
  const lengths = closingStraightLengths(headingsBeforeEachStraight);

  const segments: TrackSegment[] = [];
  for (let i = 0; i < cornerCount; i += 1) {
    segments.push({ kind: "straight", length: lengths[i] });
    segments.push({ kind: "corner", turnDegrees: turnDegrees[i], direction });
  }

  return {
    id: `track-${seed}-${pvpOrdinal}`,
    name: `Circuit ${seed}-${pvpOrdinal}`,
    segments,
    points: deriveTrackPoints(segments),
    characteristics: trackCharacteristics(segments),
  };
}

function segmentLengths(points: readonly { x: number; y: number }[]): number[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
}

/**
 * Position and heading at a fraction of the way around a track's closed
 * loop (one lap = progress 0..1, wrapping). Pure geometry over a track's own
 * derived point path — never a physics/motion model (013-race-spectacle
 * research.md Decision 6; unchanged by 018-track-generation, FR-011).
 */
export function pointAtProgress(track: Track, progress: number): TrackPoint {
  const points = track.points;
  const lengths = segmentLengths(points);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const wrapped = ((progress % 1) + 1) % 1;
  let remaining = wrapped * total;

  let index = 0;
  while (index < lengths.length - 1 && remaining > lengths[index]) {
    remaining -= lengths[index];
    index += 1;
  }

  const start = points[index];
  const end = points[(index + 1) % points.length];
  const segmentLength = lengths[index];
  const t = segmentLength === 0 ? 0 : remaining / segmentLength;

  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    headingRadians: Math.atan2(end.y - start.y, end.x - start.x),
  };
}
