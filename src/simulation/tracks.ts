import type {
  ConditionalPhysicsContribution,
  ConditionalPhysicsMatch,
  ItemPhysicsContribution,
  LapPhaseBreakdown,
  PhysicsCondition,
  RegionId,
} from "./types";

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
  /** Densely sampled authoritative centerline used by every renderer. */
  centerline?: readonly { x: number; y: number }[];
  characteristics: TrackCharacteristics;
  /**
   * Feature 033: authoritative, generation-time evidence.  These are optional
   * only to preserve compatibility with deliberately minimal legacy fixtures;
   * every production track returned by generateTrack supplies both fields.
   */
  features?: readonly TrackFeature[];
  brakingZones?: readonly BrakingZone[];
  validation?: TrackValidationMetadata;
  /** Feature 029 presentation-only environment key; never read by physics. */
  regionTheme?: RegionId;
}

/** Retained acceptance facts for one generated production circuit. */
export interface TrackValidationMetadata {
  attempt: number;
  closed: boolean;
  inBounds: boolean;
  nonSelfIntersecting: boolean;
  minimumLaneSeparation: number;
  minimumCurveRadius?: number;
  usedFallback?: boolean;
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

/**
 * Pure corner-tightness match: "at-least" matches at or above the threshold,
 * "at-most" matches at or below — both inclusive at the exact-equality
 * boundary (022-contextual-physics-effects contract §1). Reads nothing
 * beyond its own two arguments — no track/build/item lookup.
 */
export function matchesPhysicsCondition(condition: PhysicsCondition, turnDegrees: number): boolean {
  return condition.direction === "at-least"
    ? turnDegrees >= condition.turnDegrees
    : turnDegrees <= condition.turnDegrees;
}

/**
 * Sums one stat's delta across every contribution whose condition matches at
 * least one of the given corner angles (research.md Decision 1's per-phase
 * corner association table) — once per matching contribution, never twice
 * for a contribution that matches more than one candidate (topSpeed's
 * either-bounding-corner rule, contract §3).
 */
function resolveConditionalDelta(
  contributions: readonly ConditionalPhysicsContribution[],
  deltaKey: keyof ItemPhysicsContribution,
  candidateTurnDegrees: readonly number[],
): number {
  return contributions.reduce((sum, contribution) => {
    const matches = candidateTurnDegrees.some((turnDegrees) =>
      matchesPhysicsCondition(contribution.condition, turnDegrees));
    return matches ? sum + (contribution.delta[deltaKey] ?? 0) : sum;
  }, 0);
}

/**
 * Attribution counterpart to resolveConditionalDelta (022 US3, FR-006,
 * contract §4): every contribution that actually targets `deltaKey` and
 * matches at least one candidate corner, named by its source item.
 */
function resolveConditionalMatches(
  contributions: readonly ConditionalPhysicsContribution[],
  deltaKey: keyof ItemPhysicsContribution,
  candidateTurnDegrees: readonly number[],
): ConditionalPhysicsMatch[] {
  return contributions
    .filter((contribution) =>
      contribution.delta[deltaKey] !== undefined
      && candidateTurnDegrees.some((turnDegrees) => matchesPhysicsCondition(contribution.condition, turnDegrees)))
    .map((contribution) => ({ sourceItemId: contribution.sourceItemId ?? "unknown-item", stat: deltaKey }));
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
  conditionalContributions: readonly ConditionalPhysicsContribution[] = [],
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
  // 022-contextual-physics-effects: a corner's own effective corneringSpeed
  // is resolved before apexSpeed, directly against that corner's own
  // turnDegrees — never through a phase (research.md Decision 2).
  const apexSpeeds = corners.map((entry) => {
    const effectiveCorneringSpeed = stats.corneringSpeed
      + resolveConditionalDelta(conditionalContributions, "corneringSpeedDelta", [entry.segment.turnDegrees]);
    return apexSpeed(entry.segment.turnDegrees, effectiveCorneringSpeed);
  });

  const phases: LapPhaseBreakdown[] = [];
  let totalSeconds = 0;

  for (let i = 0; i < cornerCount; i += 1) {
    const previous = (i - 1 + cornerCount) % cornerCount;
    const distance = exitLengths[previous] + straights[i].segment.length + entryLengths[i];
    // 022-contextual-physics-effects: per-span effective acceleration/
    // brakingPower/topSpeed (research.md Decision 1) — resolved once per
    // span, before solveSpan, whose own four-argument signature is
    // untouched (contract §3).
    const previousTurnDegrees = corners[previous].segment.turnDegrees;
    const currentTurnDegrees = corners[i].segment.turnDegrees;
    const effectiveStats: PhysicalStats = {
      acceleration: stats.acceleration
        + resolveConditionalDelta(conditionalContributions, "accelerationDelta", [previousTurnDegrees]),
      brakingPower: stats.brakingPower
        + resolveConditionalDelta(conditionalContributions, "brakingPowerDelta", [currentTurnDegrees]),
      topSpeed: stats.topSpeed
        + resolveConditionalDelta(
          conditionalContributions, "topSpeedDelta", [previousTurnDegrees, currentTurnDegrees],
        ),
      corneringSpeed: stats.corneringSpeed,
    };
    const span = solveSpan(distance, apexSpeeds[previous], apexSpeeds[i], effectiveStats);
    // 022-contextual-physics-effects (US3): per-phase attribution, mirroring
    // the effective-stat resolution above. corneringSpeed's condition is
    // evaluated at corner i itself (research.md Decision 2), so its matches
    // are attributed to every phase in this span — corner i's own span.
    const accelerationMatches = resolveConditionalMatches(
      conditionalContributions, "accelerationDelta", [previousTurnDegrees],
    );
    const brakingMatches = resolveConditionalMatches(
      conditionalContributions, "brakingPowerDelta", [currentTurnDegrees],
    );
    const topSpeedMatches = resolveConditionalMatches(
      conditionalContributions, "topSpeedDelta", [previousTurnDegrees, currentTurnDegrees],
    );
    const corneringSpeedMatches = resolveConditionalMatches(
      conditionalContributions, "corneringSpeedDelta", [currentTurnDegrees],
    );
    span.phases.forEach((phase) => {
      const conditionalMatches: ConditionalPhysicsMatch[] = [
        ...corneringSpeedMatches,
        ...(phase.kind === "accelerating" ? accelerationMatches : []),
        ...(phase.kind === "braking" ? brakingMatches : []),
        ...(phase.kind === "cruising" ? topSpeedMatches : []),
      ];
      phases.push({
        phase: phase.kind,
        segmentIndex: straights[i].index,
        seconds: phase.seconds,
        conditionalMatches: conditionalMatches.length > 0 ? conditionalMatches : undefined,
      });
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
export function generateTrack(seed: number, pvpOrdinal: number, regionTheme?: RegionId): Track {
  const combinedSeed = seed * 1000003 + pvpOrdinal;
  let segments: readonly TrackSegment[] | undefined;
  let acceptedAttempt = 0;
  let usedFallback = false;
  const maximumAttempts = 12;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const rng = seededRandom(combinedSeed + attempt * 7919);
    const cornerCount = randomInt(rng, MIN_CORNER_COUNT, MAX_CORNER_COUNT);
    const candidate = segmentsFromVertices(circuitGrammarVertices(rng, cornerCount));
    const candidatePoints = deriveTrackPoints(candidate);
    const candidateDirections = new Set(candidate.filter((segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner").map((corner) => corner.direction));
    if (candidate.every((segment) => segment.kind === "straight" || (segment.turnDegrees > 4 && segment.turnDegrees < 150))
      && candidateDirections.size === 2
      && !polylineSelfIntersects(candidatePoints)) {
      segments = candidate;
      acceptedAttempt = attempt;
      break;
    }
  }
  if (!segments) {
    segments = segmentsFromVertices(circuitGrammarVertices(seededRandom(0x33f00d), 8));
    acceptedAttempt = maximumAttempts;
    usedFallback = true;
  }

  const baseTrack: Track = {
    id: `track-${seed}-${pvpOrdinal}`,
    name: `Circuit ${seed}-${pvpOrdinal}`,
    segments,
    points: deriveTrackPoints(segments),
    characteristics: trackCharacteristics(segments),
    ...(regionTheme ? { regionTheme } : {}),
  };
  const centerline = sampleClosedCenterline(baseTrack.points, 4);
  const zones = deriveBrakingZones(baseTrack);
  const brakingDemand = aggregateBrakingDemand(zones);
  return {
    ...baseTrack,
    centerline,
    characteristics: {
      ...baseTrack.characteristics,
      // Display uses the existing 0..100 demand convention; authority reads
      // the retained zones/profile (0..1) rather than this rounded label.
      brakingDemand: Math.round(brakingDemand * 100),
    },
    features: classifyTrackFeatures(baseTrack),
    brakingZones: zones,
    validation: {
      attempt: acceptedAttempt,
      closed: circuitCloses(segments),
      inBounds: centerline.every((point) => point.x >= BOUNDING_BOX.minX - PHYSICS_EPSILON && point.x <= BOUNDING_BOX.maxX + PHYSICS_EPSILON && point.y >= BOUNDING_BOX.minY - PHYSICS_EPSILON && point.y <= BOUNDING_BOX.maxY + PHYSICS_EPSILON),
      nonSelfIntersecting: !polylineSelfIntersects(baseTrack.points),
      minimumLaneSeparation: minimumNonAdjacentVertexDistance(baseTrack.points),
      minimumCurveRadius: Math.min(...segments.filter((segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner").map((corner) => 180 / corner.turnDegrees)),
      usedFallback,
    },
  };
}

/** Deterministic star-shaped grammar with an intentional inset and both turn directions. */
function circuitGrammarVertices(rng: () => number, count: number): readonly { x: number; y: number }[] {
  const step = (Math.PI * 2) / count;
  const notchIndex = randomInt(rng, 1, count - 2);
  // Physics-space scale is deliberately independent of the fitted viewport:
  // it creates genuine power- vs corner-biased circuits while rendering still
  // consumes the same bounded centerline.
  const baseRadius = 120 + rng() * 500;
  const vertices = Array.from({ length: count }, (_, index) => {
    const angle = index * step + (rng() - 0.5) * step * 0.22;
    const radius = index === notchIndex ? baseRadius * 0.48 : baseRadius * (0.88 + rng() * 0.22);
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  const firstEdge = Math.atan2(vertices[1].y - vertices[0].y, vertices[1].x - vertices[0].x);
  const cos = Math.cos(-firstEdge);
  const sin = Math.sin(-firstEdge);
  return vertices.map((point) => ({ x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }));
}

function segmentsFromVertices(vertices: readonly { x: number; y: number }[]): readonly TrackSegment[] {
  const segments: TrackSegment[] = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const after = vertices[(index + 2) % vertices.length];
    const ax = next.x - current.x;
    const ay = next.y - current.y;
    const bx = after.x - next.x;
    const by = after.y - next.y;
    const signedTurn = Math.atan2(ax * by - ay * bx, ax * bx + ay * by) * 180 / Math.PI;
    segments.push({ kind: "straight", length: Math.hypot(ax, ay) });
    segments.push({ kind: "corner", turnDegrees: Math.abs(signedTurn), direction: signedTurn >= 0 ? "left" : "right" });
  }
  return segments;
}

function circuitCloses(segments: readonly TrackSegment[]): boolean {
  let x = 0; let y = 0; let heading = 0;
  segments.forEach((segment) => {
    if (segment.kind === "straight") {
      x += segment.length * Math.cos(heading);
      y += segment.length * Math.sin(heading);
    } else {
      heading += (segment.direction === "left" ? 1 : -1) * segment.turnDegrees * Math.PI / 180;
    }
  });
  return Math.hypot(x, y) < 1e-6 && Math.abs(Math.abs(heading) - Math.PI * 2) < 1e-6;
}

function sampleClosedCenterline(points: readonly { x: number; y: number }[], samplesPerEdge: number): readonly { x: number; y: number }[] {
  return points.flatMap((point, index) => {
    const next = points[(index + 1) % points.length];
    return Array.from({ length: samplesPerEdge }, (_, sample) => {
      const t = sample / samplesPerEdge;
      return { x: point.x + (next.x - point.x) * t, y: point.y + (next.y - point.y) * t };
    });
  });
}

function orientation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function polylineSelfIntersects(points: readonly { x: number; y: number }[]): boolean {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      const a = points[first]; const b = points[firstNext]; const c = points[second]; const d = points[secondNext];
      if (orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0) return true;
    }
  }
  return false;
}

function minimumNonAdjacentVertexDistance(points: readonly { x: number; y: number }[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 2; second < points.length; second += 1) {
      if (first === 0 && second === points.length - 1) continue;
      minimum = Math.min(minimum, Math.hypot(points[first].x - points[second].x, points[first].y - points[second].y));
    }
  }
  return Number.isFinite(minimum) ? minimum : 0;
}

export function trackCenterline(track: Track): readonly { x: number; y: number }[] {
  return track.centerline ?? track.points;
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
  const points = trackCenterline(track);
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

// --- 027-race-legibility-integrity: authoritative track composition -------
// summary for Results (contract §6, Decision 7). Pure and deterministic;
// reuses cornerArcLength and the track's own retained characteristics —
// introduces no new severity/length classification.

export type TrackSummaryErrorCode = "empty-segments" | "unrecognized-segment-kind";

/** Typed, inspectable failure so a malformed/legacy track never silently under-counts (spec.md Edge Cases). */
export class TrackSummaryError extends Error {
  constructor(
    public readonly code: TrackSummaryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrackSummaryError";
  }
}

export type VehicleCapabilityStat = "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";

export interface CapabilityNote {
  stat: VehicleCapabilityStat;
  /** Descriptive track trait, never an exact unrecorded time claim (FR-018). */
  text: string;
}

export interface TrackCompositionSummary {
  trackId: string;
  trackName: string;
  lapCount: number;
  straightCount: number;
  cornerCount: number;
  totalStraightDistance: number;
  totalCornerDistance: number;
  totalDistance: number;
  minCornerDegrees: number;
  maxCornerDegrees: number;
  meanCornerDegrees: number;
  demands: {
    power: number;
    braking: number;
    cornering: number;
  };
  capabilityNotes: readonly CapabilityNote[];
}

function buildCapabilityNotes(
  characteristics: TrackCharacteristics,
  straightCount: number,
  cornerCount: number,
  meanCornerDegrees: number,
): readonly CapabilityNote[] {
  return [
    {
      stat: "topSpeed",
      text: `${straightCount} straight${straightCount === 1 ? "" : "s"} (Power demand ${characteristics.powerDemand}) reward Top Speed.`,
    },
    {
      stat: "acceleration",
      text: `${cornerCount} corner exit${cornerCount === 1 ? "" : "s"} reward Acceleration back up to speed.`,
    },
    {
      stat: "brakingPower",
      text: `Braking demand ${characteristics.brakingDemand} reflects how much hard braking this lap requires, rewarding Braking Power.`,
    },
    {
      stat: "corneringSpeed",
      text: `Cornering demand ${characteristics.corneringDemand} with a mean corner angle of ${meanCornerDegrees.toFixed(0)}° rewards Cornering Speed.`,
    },
  ];
}

/**
 * The authoritative composition of an already-generated `Track`, for
 * post-race explanation (contract §6). Never regenerates or reclassifies —
 * every count/distance/angle is read directly from `track.segments`, and
 * `demands` is `track.characteristics` verbatim.
 */
export function summarizeTrack(track: Track, lapCount: number): TrackCompositionSummary {
  if (track.segments.length === 0) {
    throw new TrackSummaryError("empty-segments", `Track ${track.id} has no segments to summarize`);
  }

  const straights = track.segments.filter(
    (segment): segment is Extract<TrackSegment, { kind: "straight" }> => segment.kind === "straight",
  );
  const corners = track.segments.filter(
    (segment): segment is Extract<TrackSegment, { kind: "corner" }> => segment.kind === "corner",
  );
  if (straights.length + corners.length !== track.segments.length) {
    throw new TrackSummaryError(
      "unrecognized-segment-kind",
      `Track ${track.id} contains a segment kind this summary does not recognize`,
    );
  }

  const totalStraightDistance = straights.reduce((sum, segment) => sum + segment.length, 0);
  const totalCornerDistance = corners.reduce((sum, segment) => sum + cornerArcLength(segment.turnDegrees), 0);
  const cornerDegrees = corners.map((segment) => segment.turnDegrees);
  const meanCornerDegrees = cornerDegrees.length
    ? cornerDegrees.reduce((sum, degrees) => sum + degrees, 0) / cornerDegrees.length
    : 0;

  return {
    trackId: track.id,
    trackName: track.name,
    lapCount,
    straightCount: straights.length,
    cornerCount: corners.length,
    totalStraightDistance,
    totalCornerDistance,
    totalDistance: totalStraightDistance + totalCornerDistance,
    minCornerDegrees: cornerDegrees.length ? Math.min(...cornerDegrees) : 0,
    maxCornerDegrees: cornerDegrees.length ? Math.max(...cornerDegrees) : 0,
    meanCornerDegrees,
    demands: {
      power: track.characteristics.powerDemand,
      braking: track.characteristics.brakingDemand,
      cornering: track.characteristics.corneringDemand,
    },
    capabilityNotes: buildCapabilityNotes(track.characteristics, straights.length, corners.length, meanCornerDegrees),
  };
}
// --- Feature 033 US6 (T079/T081): retained braking zones and features (additive)

/**
 * Retained braking evidence for one corner's approach-and-apex pair. Derived
 * purely from geometry (approach length, corner severity) and a reference build
 * (entry speed potential, target apex speed) — never from pixels (FR-039).
 */
export interface BrakingZone {
  id: string;
  /** Index into `track.segments` of the target corner segment. */
  targetSegmentIndex: number;
  approachLength: number;
  entrySpeedPotential: number;
  targetSpeed: number;
  requiredSpeedReduction: number;
  /** Normalized 0..1 severity (required reduction / reference). */
  severity: number;
}

export type TrackFeatureKind = "straight" | "sweeper" | "chicane" | "hairpin" | "switchback";

export interface TrackFeature {
  id: string;
  kind: TrackFeatureKind;
  /** Indices into `track.segments` covered by this feature. */
  segmentIndexes: readonly number[];
  direction?: "left" | "right";
  radius?: number;
}

export interface TrackBrakingProfile {
  zones: readonly BrakingZone[];
  brakingDemand: number;
}

/** Approach-speed slope (units of speed per unit of straight length). */
const APPROACH_SPEED_SLOPE = 0.08;
const HAIRPIN_DEGREES = 75;
const SWEEPER_DEGREES = 35;

/** The exact approach of a corner is the nearest straight segment behind it. */
function approachLengthFor(segments: readonly TrackSegment[], cornerIndex: number): number {
  for (let index = cornerIndex - 1; index >= 0; index -= 1) {
    const candidate = segments[index];
    if (candidate.kind === "straight") return candidate.length;
  }
  return 0;
}

/**
 * Derive one braking-zone per non-trivial corner using retained geometry:
 * entry speed potential comes from the approach straight (up to top speed),
 * the target speed is the corner's apex speed, and required reduction is their
 * difference. Any real corner yields a positive required reduction, so a
 * production circuit aggregates to positive braking demand (FR-040).
 */
export function deriveBrakingZones(
  track: Track,
  corneringSpeedStat = STOCK_PHYSICAL_STATS.corneringSpeed,
  topSpeedStat = STOCK_PHYSICAL_STATS.topSpeed,
): readonly BrakingZone[] {
  const zones: BrakingZone[] = [];
  track.segments.forEach((segment, index) => {
    if (segment.kind !== "corner") return;
    const approachLength = approachLengthFor(track.segments, index);
    const entrySpeedPotential = Math.min(
      topSpeedStat,
      corneringSpeedStat + approachLength * APPROACH_SPEED_SLOPE,
    );
    const targetSpeed = apexSpeed(segment.turnDegrees, corneringSpeedStat);
    const requiredSpeedReduction = Math.max(0, entrySpeedPotential - targetSpeed);
    if (requiredSpeedReduction <= PHYSICS_EPSILON) return;
    zones.push({
      id: `brake-${index}`,
      targetSegmentIndex: index,
      approachLength,
      entrySpeedPotential,
      targetSpeed,
      requiredSpeedReduction,
      severity: clamp(requiredSpeedReduction / BRAKING_REFERENCE, 0, 1),
    });
  });
  return zones;
}

/** Aggregate normalized positive braking demand from retained zones (T081). */
export function aggregateBrakingDemand(zones: readonly BrakingZone[]): number {
  const total = zones.reduce((sum, zone) => sum + zone.requiredSpeedReduction, 0);
  return clamp(zones.length > 0 ? total / BRAKING_REFERENCE : 0, 0, 1);
}

/** Build a retained braking profile for a track (never reclassifies geometry). */
export function brakingProfile(
  track: Track,
  corneringSpeedStat = STOCK_PHYSICAL_STATS.corneringSpeed,
  topSpeedStat = STOCK_PHYSICAL_STATS.topSpeed,
): TrackBrakingProfile {
  const usesStockReference = corneringSpeedStat === STOCK_PHYSICAL_STATS.corneringSpeed
    && topSpeedStat === STOCK_PHYSICAL_STATS.topSpeed;
  const zones = (usesStockReference ? track.brakingZones : undefined)
    // Retained production evidence is valid for the stock reference stats.
    // A caller asking for a different physical reference deliberately gets a
    // fresh projection without mutating the authoritative track.
    ?? deriveBrakingZones(track, corneringSpeedStat, topSpeedStat);
  return { zones, brakingDemand: aggregateBrakingDemand(zones) };
}

/**
 * Stable geometry-derived feature classification (FR-038): straights and
 * corners are classified from retained segments; a switchback is a pair of
 * adjacent corners of opposite sign; a chicane is a pair of adjacent modest
 * corners. Deterministic — identical segments classify identically.
 */
export function classifyTrackFeatures(track: Track): readonly TrackFeature[] {
  const features: TrackFeature[] = [];
  const segments = track.segments;

  let straightStart = -1;
  const flushStraight = (endExclusive: number) => {
    if (straightStart === -1) return;
    const indexes = Array.from({ length: endExclusive - straightStart }, (_, k) => straightStart + k);
    features.push({ id: `straight-${straightStart}`, kind: "straight", segmentIndexes: indexes });
    straightStart = -1;
  };

  segments.forEach((segment, index) => {
    if (segment.kind === "straight") {
      if (straightStart === -1) straightStart = index;
      return;
    }
    flushStraight(index);
    const corner = segment;
    // Pair with the previous corner, if adjacent and opposite sign -> switchback.
    const previousCornerIndex = index >= 2 && segments[index - 2]?.kind === "corner" ? index - 2 : index - 1;
    const prev = segments[previousCornerIndex];
    const separatingStraight = segments[index - 1];
    if (prev?.kind === "corner" && prev.direction !== corner.direction) {
      features.push({
        id: `switchback-${previousCornerIndex}-${index}`,
        kind: "switchback",
        segmentIndexes: separatingStraight?.kind === "straight"
          ? [previousCornerIndex, index - 1, index]
          : [previousCornerIndex, index],
      });
    }
    // Two adjacent modest corners form a chicane; otherwise classify by angle.
    if (
      prev?.kind === "corner"
      && corner.turnDegrees <= SWEEPER_DEGREES
      && prev.turnDegrees <= SWEEPER_DEGREES
    ) {
      features.push({
        id: `chicane-${previousCornerIndex}-${index}`,
        kind: "chicane",
        segmentIndexes: separatingStraight?.kind === "straight"
          ? [previousCornerIndex, index - 1, index]
          : [previousCornerIndex, index],
      });
    }
    const kind: TrackFeatureKind = corner.turnDegrees >= HAIRPIN_DEGREES ? "hairpin" : "sweeper";
    features.push({ id: `${kind}-${index}`, kind, segmentIndexes: [index], direction: corner.direction, radius: 180 / corner.turnDegrees });
  });
  flushStraight(segments.length);
  return features;
}
