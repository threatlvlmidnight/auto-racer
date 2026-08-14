import { summarizeTrack, type TrackCompositionSummary } from "../simulation/tracks";
import type { NCarContestResult } from "../simulation/types";
import type { VehicleStatKey } from "./vehicleStatPresentation";

/**
 * Post-race track composition for Results (025-vehicle-stat-display's
 * sibling feature 027, US4). `summarizeTrack` itself assumes a valid Track;
 * this presentation layer owns the "legacy/malformed result" defensive
 * check (FR-019, spec.md Edge Cases) — Results MUST label the summary
 * unavailable rather than regenerate or infer composition from the track's
 * name (contract §6).
 */
export type TrackSummaryPresentation =
  | {
    status: "available";
    summary: TrackCompositionSummary;
    headline: string;
    segmentLine: string;
    distanceLine: string;
    angleLine: string;
    demandLine: string;
    capabilityLines: readonly string[];
    accessibilityLabel: string;
  }
  | { status: "unavailable"; reason: string };

const UNAVAILABLE_REASON = "Track composition is unavailable for this result.";
const MAX_GENERATED_CORNER_COUNT = 10;

export interface BuildTrackFitAxis {
  key: VehicleStatKey;
  label: string;
  demand: number;
  vehicle: number;
  demandPlot: number;
  vehiclePlot: number;
}

export type BuildTrackFitPresentation =
  | {
    status: "available";
    title: "BUILD–TRACK FIT";
    subtitle: string;
    axes: readonly BuildTrackFitAxis[];
    factsLine: string;
    accessibilityLabel: string;
  }
  | { status: "unavailable"; reason: string };

function plotValue(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * The four-axis post-race comparison. Three demand axes reuse the Track's
 * retained 0–100 characteristics. Acceleration demand is the circuit's number
 * of acceleration opportunities (corner exits), normalized against the track
 * generator's documented ten-corner maximum. Vehicle values are the final
 * lap's immutable recorded stats; only chart geometry clamps to 0–100.
 */
export function buildTrackFitPresentation(result: NCarContestResult): BuildTrackFitPresentation {
  const trackPresentation = trackSummaryPresentation(result);
  if (trackPresentation.status === "unavailable") return trackPresentation;
  const player = result.cars.find((car) => car.role === "player");
  const finalLap = player?.laps[player.laps.length - 1];
  const stats = finalLap?.physics?.stats;
  if (!stats) return { status: "unavailable", reason: "Build–track fit is unavailable for this result." };

  const { summary } = trackPresentation;
  const accelerationDemand = Math.round(100 * summary.cornerCount / MAX_GENERATED_CORNER_COUNT);
  const values: Array<[VehicleStatKey, string, number, number]> = [
    ["topSpeed", "TOP SPEED", summary.demands.power, stats.topSpeed],
    ["acceleration", "ACCELERATION", accelerationDemand, stats.acceleration],
    ["brakingPower", "BRAKING", summary.demands.braking, stats.brakingPower],
    ["corneringSpeed", "CORNERING", summary.demands.cornering, stats.corneringSpeed],
  ];
  const axes = values.map(([key, label, demand, vehicle]) => ({
    key, label, demand, vehicle, demandPlot: plotValue(demand), vehiclePlot: plotValue(vehicle),
  }));
  const factsLine = `${summary.straightCount} STRAIGHTS · ${summary.cornerCount} CORNERS · ${summary.totalDistance.toFixed(0)} DISTANCE · MEAN CORNER ${summary.meanCornerDegrees.toFixed(0)}°`;
  const subtitle = `${summary.trackName} · ${summary.lapCount} laps`;
  return {
    status: "available",
    title: "BUILD–TRACK FIT",
    subtitle,
    axes,
    factsLine,
    accessibilityLabel: [
      "Build–track fit", subtitle,
      ...axes.map((axis) => `${axis.label}: track demand ${axis.demand}, vehicle ${axis.vehicle}`),
      factsLine,
    ].join(". "),
  };
}

export function trackSummaryPresentation(result: NCarContestResult): TrackSummaryPresentation {
  let summary: TrackCompositionSummary;
  try {
    // A legacy/malformed result may not even carry a valid `track` at
    // runtime despite the current type guaranteeing one (e.g. TrackSummaryError
    // for malformed segments, or a plain TypeError if track itself is
    // missing) — either way, report it the same honest way rather than
    // letting it escape or regenerating/inferring composition (FR-019).
    summary = summarizeTrack(result.track, result.lapCount);
  } catch {
    return { status: "unavailable", reason: UNAVAILABLE_REASON };
  }

  const headline = `${summary.trackName} · ${summary.lapCount} laps`;
  const segmentLine = `${summary.straightCount} straight${summary.straightCount === 1 ? "" : "s"} · ${summary.cornerCount} corner${summary.cornerCount === 1 ? "" : "s"}`;
  const distanceLine = `${summary.totalDistance.toFixed(0)} total distance (${summary.totalStraightDistance.toFixed(0)} straight + ${summary.totalCornerDistance.toFixed(0)} corner)`;
  const angleLine = `Corners ${summary.minCornerDegrees.toFixed(0)}°–${summary.maxCornerDegrees.toFixed(0)}° (mean ${summary.meanCornerDegrees.toFixed(0)}°)`;
  const demandLine = `Power ${summary.demands.power} · Braking ${summary.demands.braking} · Cornering ${summary.demands.cornering}`;
  const capabilityLines = summary.capabilityNotes.map((note) => note.text);

  return {
    status: "available",
    summary,
    headline,
    segmentLine,
    distanceLine,
    angleLine,
    demandLine,
    capabilityLines,
    accessibilityLabel: [headline, segmentLine, distanceLine, angleLine, demandLine, ...capabilityLines].join(". "),
  };
}
