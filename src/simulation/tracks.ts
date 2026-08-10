import { TRACKS } from "../content/tracks";

export interface Track {
  id: string;
  name: string;
  points: readonly { x: number; y: number }[];
}

export interface TrackPoint {
  x: number;
  y: number;
  headingRadians: number;
}

function segmentLengths(points: readonly { x: number; y: number }[]): number[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
}

/**
 * Position and heading at a fraction of the way around a track's closed
 * loop (one lap = progress 0..1, wrapping). Pure geometry over authored,
 * fixed point data — never a physics/motion model (research.md Decision 6).
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

const TRACK_COUNT = 3;

/**
 * Deterministic track selection (data-model.md "selectTrack"; contract §1).
 * `(runSeed + pvpStageOrdinal) mod 3` over the fixed catalog — no new
 * identifier concept, reuses 012-multi-ghost-contest's own seed/level.
 */
export function selectTrack(runSeed: number, pvpStageOrdinal: number): Track {
  const index = (((runSeed + pvpStageOrdinal) % TRACK_COUNT) + TRACK_COUNT) % TRACK_COUNT;
  return TRACKS[index];
}
