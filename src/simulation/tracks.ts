import type { Build, ItemDefinition } from "./types";

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
const TRACK_FIT_MAX_PERCENT = 6;
const BOUNDING_BOX = { minX: 70, maxX: 560, minY: 84, maxY: 320 };

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

/**
 * A build's Power/Chassis lean over its *installed* items only — storage
 * items are excluded, matching their existing inert-unless-activeWhileStored
 * treatment elsewhere in simulation (research.md Decision 5, FR-006).
 */
export function buildTrackLean(build: Build): number {
  const installed = build.slots
    .map((slot) => slot.item)
    .filter((item): item is ItemDefinition => Boolean(item));
  const powerCount = installed.filter((item) => item.installationCategory === "power").length;
  const chassisCount = installed.filter((item) => item.installationCategory === "chassis").length;
  const total = powerCount + chassisCount;
  return total === 0 ? 0 : (powerCount - chassisCount) / total;
}

/** A track's Power/Chassis bias, paired with buildTrackLean for the trackFit fold (research.md Decision 5). */
export function trackBias(characteristics: TrackCharacteristics): number {
  return (characteristics.powerDemand - characteristics.corneringDemand) / 100;
}

export function trackFitPercent(build: Build, characteristics: TrackCharacteristics): number {
  return buildTrackLean(build) * trackBias(characteristics) * TRACK_FIT_MAX_PERCENT;
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
