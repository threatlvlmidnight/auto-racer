import { DELTA_KEY_FOR_STAT, type PhysicalStatTarget } from "../simulation/buffs";
import { resolveCurrentBuildPhysicalStats } from "../simulation/laps";
import { lockRaceSetup, type RaceSetupInput } from "../simulation/raceSetup";
import { summarizeTrack, trackCenterline, type Track } from "../simulation/tracks";
import type {
  EligibleSetupControl,
  ItemPhysicsContribution,
  SetupControlFamily,
  SetupPositionId,
  SetupSelections,
} from "../simulation/types";
import { formatStatDelta, statDefinition } from "./itemPresentation";

// 028-pre-race-setup: pure presentation models for PreRaceScene (contract
// §9). Every model here derives only from `RaceSetupInput` (already
// stripped of rival/purse/sponsor/prediction data by raceSetup.ts) plus the
// player's own uncommitted `SetupSelections` — never from run/global state
// beyond what RaceSetupInput itself carries.

const STAT_ORDER: readonly PhysicalStatTarget[] = ["acceleration", "topSpeed", "brakingPower", "corneringSpeed"];

export interface SetupTrackSummaryModel {
  headline: string;
  segmentLine: string;
  demandLine: string;
  capabilityLines: readonly string[];
  /**
   * T045/FR-013 spirit: one factual capability-emphasis sentence for the
   * track's single highest demand, reusing feature 027's own
   * `capabilityNotes` text verbatim (already documented there as "never an
   * exact unrecorded time claim"). Never a position/outcome/time prediction.
   */
  alignmentLine: string;
  accessibilityLabel: string;
}

export interface SetupStatRow {
  key: PhysicalStatTarget;
  label: string;
  unit: string;
  currentValue: number;
  currentLabel: string;
  prospectiveValue: number;
  prospectiveLabel: string;
  deltaLabel: string;
  changed: boolean;
}

export interface SetupPositionOption {
  id: SetupPositionId;
  label: string;
  deltaLabel: string;
  selected: boolean;
}

export interface SetupControlRow {
  family: SetupControlFamily;
  label: string;
  isUniversal: boolean;
  sourceItemIds: readonly string[];
  /** "Universal" for driver-aggression; else the contributing item IDs, comma-joined. */
  sourceLabel: string;
  positions: readonly SetupPositionOption[];
  selectedPosition: SetupPositionId;
  selectedDeltaLabel: string;
}

export interface RaceSetupSceneModel {
  track: SetupTrackSummaryModel;
  lapCount: number;
  stats: readonly SetupStatRow[];
  controls: readonly SetupControlRow[];
  hasEquipmentControls: boolean;
  vehicleAssetKey: string;
}

/** Fixed lap-count lookup for the exact retained encounter — never a projection, never rival-derived. */
function encounterLapCount(input: RaceSetupInput): number {
  const payload = input.run.activeEncounter?.payload;
  return payload?.kind === "pvp" ? payload.lapCount : 0;
}

export function setupTrackSummary(input: RaceSetupInput): SetupTrackSummaryModel {
  const summary = summarizeTrack(input.track, encounterLapCount(input));
  const headline = `${summary.trackName} · ${summary.lapCount} laps`;
  const segmentLine = `${summary.straightCount} straight${summary.straightCount === 1 ? "" : "s"} · ${summary.cornerCount} corner${summary.cornerCount === 1 ? "" : "s"} · ${summary.totalDistance.toFixed(0)} distance`;
  const demandLine = `Power ${summary.demands.power} · Braking ${summary.demands.braking} · Cornering ${summary.demands.cornering}`;
  const capabilityLines = summary.capabilityNotes.map((note) => note.text);

  const { power, braking, cornering } = summary.demands;
  const highestDemandStat = power >= braking && power >= cornering
    ? "topSpeed"
    : braking >= cornering ? "brakingPower" : "corneringSpeed";
  const alignmentLine = summary.capabilityNotes.find((note) => note.stat === highestDemandStat)!.text;

  return {
    headline,
    segmentLine,
    demandLine,
    capabilityLines,
    alignmentLine,
    accessibilityLabel: [headline, segmentLine, demandLine, ...capabilityLines].join(". "),
  };
}

function deltaLabelFor(stat: PhysicalStatTarget, value: number): string {
  return value === 0 ? "No change" : formatStatDelta(stat, value, { compact: true }).valueLabel;
}

function positionDeltaSummary(delta: Required<ItemPhysicsContribution>): string {
  const parts = STAT_ORDER
    .map((stat) => ({ stat, value: delta[DELTA_KEY_FOR_STAT[stat]] }))
    .filter((entry) => entry.value !== 0)
    .map((entry) => `${statDefinition(entry.stat).compactLabel} ${deltaLabelFor(entry.stat, entry.value)}`);
  return parts.length > 0 ? parts.join(" · ") : "No setup change";
}

/**
 * The current (no setup) vs. prospective (current + draft setup preview)
 * four-stat comparison (spec.md US4, FR-003). Draft selections never mutate
 * `build`/`run` — this is preview-only arithmetic, reconciled exactly by
 * `lockRaceSetup` at Start Race (contract §9).
 */
export function setupStatRows(input: RaceSetupInput, selections: SetupSelections): readonly SetupStatRow[] {
  const current = resolveCurrentBuildPhysicalStats(input.build).stats;
  const preview = lockRaceSetup(input, selections);
  const previewDelta = "totalDelta" in preview
    ? preview.totalDelta
    : { accelerationDelta: 0, topSpeedDelta: 0, brakingPowerDelta: 0, corneringSpeedDelta: 0 };

  return STAT_ORDER.map((stat) => {
    const definition = statDefinition(stat);
    const deltaValue = previewDelta[DELTA_KEY_FOR_STAT[stat]];
    const currentValue = current[stat];
    const prospectiveValue = Math.max(1, currentValue + deltaValue);
    return {
      key: stat,
      label: definition.label,
      unit: definition.unit,
      currentValue,
      currentLabel: `${currentValue} ${definition.unit}`,
      prospectiveValue,
      prospectiveLabel: `${prospectiveValue} ${definition.unit}`,
      deltaLabel: deltaLabelFor(stat, deltaValue),
      changed: deltaValue !== 0,
    };
  });
}

function positionOptions(control: EligibleSetupControl, selected: SetupPositionId): SetupPositionOption[] {
  return control.positions.map((position) => ({
    id: position.id,
    label: position.label,
    deltaLabel: positionDeltaSummary(position.delta),
    selected: position.id === selected,
  }));
}

/** One row per eligible control, in canonical order (Driver Aggression first). */
export function setupControlRows(
  input: RaceSetupInput,
  selections: SetupSelections,
): readonly SetupControlRow[] {
  return input.eligibleControls.map((control) => {
    const selectedPosition = selections[control.family] ?? "balanced";
    const selectedPositionDefinition = control.positions.find((position) => position.id === selectedPosition)!;
    return {
      family: control.family,
      label: control.label,
      isUniversal: control.family === "driver-aggression",
      sourceItemIds: control.sourceItemIds,
      sourceLabel: control.family === "driver-aggression" ? "Universal" : control.sourceItemIds.join(", "),
      positions: positionOptions(control, selectedPosition),
      selectedPosition,
      selectedDeltaLabel: positionDeltaSummary(selectedPositionDefinition.delta),
    };
  });
}

/** The active run entrant's canonical vehicle texture key (FR-003B) — never a default/generic vehicle. */
export function setupVehicleAssetKey(input: RaceSetupInput): string {
  return `vehicle-${input.run.identity.vehicleId}`;
}

/**
 * Assembles every pure model PreRaceScene needs (contract §9). Contains no
 * opponent, field, purse, sponsor, or prediction data — RaceSetupInput
 * itself never carries any (raceSetup.ts's `raceSetupInput`).
 */
export function raceSetupSceneModel(input: RaceSetupInput, selections: SetupSelections): RaceSetupSceneModel {
  return {
    track: setupTrackSummary(input),
    lapCount: encounterLapCount(input),
    stats: setupStatRows(input, selections),
    controls: setupControlRows(input, selections),
    hasEquipmentControls: input.eligibleControls.length > 1,
    vehicleAssetKey: setupVehicleAssetKey(input),
  };
}

// --- Track preview shape ---------------------------------------------------

export interface TrackPreviewPoint {
  x: number;
  y: number;
}

export interface TrackPreviewOptions {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Interpolated points generated per original track segment. */
  subdivisionsPerSegment?: number;
}

const DEFAULT_PREVIEW_SUBDIVISIONS = 10;

/**
 * A dense, smoothly-curved closed loop through the track's own authoritative
 * retained centerline (never a separate/regenerated shape). Legacy fixtures
 * without a sampled centerline fall back to their retained points.
 */
export function trackPreviewPoints(track: Track, options: TrackPreviewOptions): readonly TrackPreviewPoint[] {
  const subdivisions = options.subdivisionsPerSegment ?? DEFAULT_PREVIEW_SUBDIVISIONS;
  const base = trackCenterline(track).map((point) => ({
    x: point.x * options.scale + options.offsetX,
    y: point.y * options.scale + options.offsetY,
  }));
  return catmullRomClosedLoop(base, subdivisions);
}

function catmullRomClosedLoop(
  points: readonly TrackPreviewPoint[],
  subdivisions: number,
): readonly TrackPreviewPoint[] {
  const count = points.length;
  if (count < 3) return points;
  const result: TrackPreviewPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    for (let step = 0; step < subdivisions; step += 1) {
      result.push(catmullRomPoint(p0, p1, p2, p3, step / subdivisions));
    }
  }
  return result;
}

/** Standard uniform Catmull-Rom spline basis — exactly reproduces p1 at t=0. */
function catmullRomPoint(
  p0: TrackPreviewPoint,
  p1: TrackPreviewPoint,
  p2: TrackPreviewPoint,
  p3: TrackPreviewPoint,
  t: number,
): TrackPreviewPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number) => 0.5 * (
    2 * b
    + (-a + c) * t
    + (2 * a - 5 * b + 4 * c - d) * t2
    + (-a + 3 * b - 3 * c + d) * t3
  );
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}
