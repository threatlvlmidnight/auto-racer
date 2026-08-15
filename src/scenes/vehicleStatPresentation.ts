import { DELTA_KEY_FOR_STAT, type PhysicalStatTarget } from "../simulation/buffs";
import type { PlacementPreview } from "../simulation/garage";
import {
  resolveCurrentBuildPhysicalStats,
  type ConditionalStatPotential,
  type UnconditionalStatContribution,
} from "../simulation/laps";
import { STOCK_PHYSICAL_STATS, type PhysicalStats } from "../simulation/tracks";
import type { ItemDefinition, ItemPhysicalContributionEvidence, LiveStatChange, VehicleBuild } from "../simulation/types";
import { conditionLabel as physicsConditionLabel, formatStatDelta, statDefinition } from "./itemPresentation";

/**
 * The four authoritative physical stats this feature presents (021-arcade-
 * physics-simulation) — reuses feature 024's own StatTarget subtype so this
 * module never redefines the stat vocabulary (025 contract §1).
 */
export type VehicleStatKey = PhysicalStatTarget;

export const VEHICLE_STAT_ORDER: readonly VehicleStatKey[] = [
  "acceleration", "topSpeed", "brakingPower", "corneringSpeed",
];

export interface LiveStatLineModel {
  stat: VehicleStatKey;
  label: string;
  value: number;
  valueLabel: string;
  delta: number;
  deltaLabel: string;
  marker: "↑" | "↓" | "→";
  sourceLabel: string | null;
  amplifierLabel: string | null;
  changed: boolean;
}

export interface LiveStatPanelState {
  lines: readonly LiveStatLineModel[];
  consumedBoundaryIds: readonly string[];
}

/** Pure, idempotent projection of retained stat boundaries for the watched-race panel. */
export function reduceLiveStatPanel(
  state: LiveStatPanelState,
  changes: readonly LiveStatChange[],
): LiveStatPanelState {
  const consumed = new Set(state.consumedBoundaryIds);
  const latest = new Map(state.lines.map((line) => [line.stat, { ...line, changed: false }]));
  for (const change of changes) {
    if (consumed.has(change.boundaryId) || change.stat === "time") continue;
    consumed.add(change.boundaryId);
    const definition = statDefinition(change.stat);
    const decimals = Number.isInteger(change.currentValue) ? 0 : 1;
    const deltaDecimals = Number.isInteger(change.delta) ? 0 : 1;
    latest.set(change.stat, {
      stat: change.stat,
      label: definition.compactLabel,
      value: change.currentValue,
      valueLabel: `${change.currentValue.toFixed(decimals)} ${definition.unit}`,
      delta: change.delta,
      deltaLabel: `${change.delta >= 0 ? "+" : ""}${change.delta.toFixed(deltaDecimals)} ${definition.unit}`,
      marker: change.delta > 0 ? "↑" : change.delta < 0 ? "↓" : "→",
      sourceLabel: change.sourceItemName,
      amplifierLabel: change.amplifierSources.length === 0
        ? null
        : change.amplifierSources.map((source) => `${source.sourceItemName} +${source.magnitudePercent}%`).join(", "),
      changed: true,
    });
  }
  return {
    lines: VEHICLE_STAT_ORDER.flatMap((stat) => latest.has(stat) ? [latest.get(stat)!] : []),
    consumedBoundaryIds: [...consumed],
  };
}

export type VehicleStatContext =
  | { kind: "stock" }
  | { kind: "current-build" }
  | { kind: "placement-preview"; destinationLabel: string }
  | { kind: "race-lap"; lap: number; lapCount: number }
  | { kind: "result-lap"; lap: number; lapCount: number }
  | { kind: "test-day"; lap?: number };

export interface StatChangeSource {
  sourceItemId: string;
  sourceLabel: string;
  stat: VehicleStatKey;
  value: number;
  valueLabel: string;
  state: "active" | "inactive" | "conditional";
  reasonLabel?: string;
}

export interface ConditionalStatSource extends StatChangeSource {
  state: "conditional";
  conditionLabel: string;
  affectedSegments?: readonly number[];
}

export interface VehicleStatLineModel {
  key: VehicleStatKey;
  label: string;
  compactLabel: string;
  unit: string;
  stockValue: number;
  currentValue: number | null;
  currentLabel: string;
  stockDelta: number | null;
  stockDeltaLabel: string | null;
  comparisonDelta: number | null;
  comparisonDeltaLabel: string | null;
  state: "improved" | "reduced" | "unchanged" | "unavailable";
  changeSources: readonly StatChangeSource[];
}

export interface VehicleStatPanelModel {
  context: VehicleStatContext;
  contextLabel: string;
  lines: readonly VehicleStatLineModel[];
  conditionalSources: readonly ConditionalStatSource[];
  status: "available" | "partially-available" | "unavailable";
  unavailableReason: string | null;
  accessibilityLabel: string;
}

export interface VehicleStatTileRegion {
  id: VehicleStatKey;
  x: number;
  y: number;
  width: number;
  height: number;
  textPx: number;
}

export interface VehicleStatSummaryRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  textPx: number;
}

export interface VehicleStatLayoutModel {
  /** "row": one wide strip of four tiles. "grid": 2x2, used once a row would clip on a narrow viewport. */
  mode: "row" | "grid";
  tiles: readonly VehicleStatTileRegion[];
  conditionalRegion: VehicleStatSummaryRegion | null;
  totalWidth: number;
  totalHeight: number;
  horizontalOverflow: boolean;
}

const LAYOUT_MARGIN = 8;
const LAYOUT_GAP = 4;
/** Below this viewport width a single 4-wide row would clip stat values (FR-017); switch to a 2x2 grid instead. */
const GRID_BREAKPOINT = 480;
const ROW_TILE_HEIGHT = 30;
const GRID_TILE_HEIGHT = 28;
const CONDITIONAL_HEIGHT = 12;

/**
 * Pure layout model for the shared renderer (vehicleStatVisuals.ts) — kept
 * Phaser-free so reflow at every supported viewport (FR-017, contract §6) is
 * unit-testable without a canvas, matching itemPresentation.ts's own
 * buildItemLayout convention.
 */
export function buildVehicleStatLayout(
  viewport: { width: number; height: number },
  conditionalCount: number,
): VehicleStatLayoutModel {
  const contentWidth = Math.max(0, viewport.width - LAYOUT_MARGIN * 2);
  const mode: VehicleStatLayoutModel["mode"] = viewport.width < GRID_BREAKPOINT ? "grid" : "row";
  const hasConditional = conditionalCount > 0;

  if (mode === "row") {
    const tileWidth = Math.floor((contentWidth - LAYOUT_GAP * (VEHICLE_STAT_ORDER.length - 1)) / VEHICLE_STAT_ORDER.length);
    const tiles: VehicleStatTileRegion[] = VEHICLE_STAT_ORDER.map((stat, index) => ({
      id: stat,
      x: LAYOUT_MARGIN + index * (tileWidth + LAYOUT_GAP),
      y: LAYOUT_MARGIN,
      width: tileWidth,
      height: ROW_TILE_HEIGHT,
      textPx: tileWidth < 90 ? 9 : 11,
    }));
    const conditionalRegion: VehicleStatSummaryRegion | null = hasConditional
      ? { x: LAYOUT_MARGIN, y: LAYOUT_MARGIN + ROW_TILE_HEIGHT + LAYOUT_GAP, width: contentWidth, height: CONDITIONAL_HEIGHT, textPx: 9 }
      : null;
    const totalHeight = LAYOUT_MARGIN + ROW_TILE_HEIGHT + (conditionalRegion ? LAYOUT_GAP + CONDITIONAL_HEIGHT : 0) + LAYOUT_MARGIN;
    return {
      mode, tiles, conditionalRegion, totalWidth: viewport.width, totalHeight,
      horizontalOverflow: tiles.some((tile) => tile.x + tile.width > viewport.width) || contentWidth <= 0,
    };
  }

  const tileWidth = Math.floor((contentWidth - LAYOUT_GAP) / 2);
  const tiles: VehicleStatTileRegion[] = VEHICLE_STAT_ORDER.map((stat, index) => ({
    id: stat,
    x: LAYOUT_MARGIN + (index % 2) * (tileWidth + LAYOUT_GAP),
    y: LAYOUT_MARGIN + Math.floor(index / 2) * (GRID_TILE_HEIGHT + LAYOUT_GAP),
    width: tileWidth,
    height: GRID_TILE_HEIGHT,
    textPx: 9,
  }));
  const gridHeight = 2 * GRID_TILE_HEIGHT + LAYOUT_GAP;
  const conditionalRegion: VehicleStatSummaryRegion | null = hasConditional
    ? { x: LAYOUT_MARGIN, y: LAYOUT_MARGIN + gridHeight + LAYOUT_GAP, width: contentWidth, height: CONDITIONAL_HEIGHT, textPx: 9 }
    : null;
  const totalHeight = LAYOUT_MARGIN + gridHeight + (conditionalRegion ? LAYOUT_GAP + CONDITIONAL_HEIGHT : 0) + LAYOUT_MARGIN;
  return {
    mode, tiles, conditionalRegion, totalWidth: viewport.width, totalHeight,
    horizontalOverflow: tiles.some((tile) => tile.x + tile.width > viewport.width) || contentWidth <= 0,
  };
}

/** Plain magnitude, no forced sign — for an absolute total rather than a delta. */
function formatMagnitude(stat: VehicleStatKey, value: number): string {
  const { unit } = statDefinition(stat);
  const magnitude = Math.abs(value);
  const decimals = Number.isInteger(magnitude) ? 0 : 1;
  return `${magnitude.toFixed(decimals)} ${unit}`;
}

/** Attributable id→item lookup for any build, exposed so race/result/Test Day scenes can source `recordedLapVehicleStatModel`'s `itemLookup` from the same authoritative build the lap was played with. */
export function vehicleItemLookup(build: VehicleBuild): Map<string, ItemDefinition> {
  const lookup = new Map<string, ItemDefinition>();
  build.slots.forEach((slot) => { if (slot.item) lookup.set(slot.item.id, slot.item); });
  build.storage.forEach((position) => { if (position.item) lookup.set(position.item.id, position.item); });
  return lookup;
}

function sourceLabelFor(itemId: string, lookup: ReadonlyMap<string, ItemDefinition>): string {
  return lookup.get(itemId)?.name ?? itemId;
}

function unconditionalSource(
  contribution: UnconditionalStatContribution,
  lookup: ReadonlyMap<string, ItemDefinition>,
): StatChangeSource {
  const formatted = formatStatDelta(contribution.stat, contribution.value, { compact: true });
  return {
    sourceItemId: contribution.sourceItemId,
    sourceLabel: sourceLabelFor(contribution.sourceItemId, lookup),
    stat: contribution.stat,
    value: contribution.value,
    valueLabel: formatted.valueLabel,
    state: "active",
  };
}

function conditionalSource(
  potential: ConditionalStatPotential,
  lookup: ReadonlyMap<string, ItemDefinition>,
): ConditionalStatSource {
  const sourceLabel = sourceLabelFor(potential.sourceItemId, lookup);
  if (potential.kind === "track-segment") {
    const formatted = formatStatDelta(potential.stat, potential.value, { compact: true });
    return {
      sourceItemId: potential.sourceItemId,
      sourceLabel,
      stat: potential.stat,
      value: potential.value,
      valueLabel: formatted.valueLabel,
      state: "conditional",
      conditionLabel: physicsConditionLabel(potential.condition),
    };
  }
  const cadence = potential.cooldown === undefined
    ? "Stacking"
    : `EVERY ${potential.cooldown} ${potential.cooldown === 1 ? "lap" : "laps"} (stacking)`;
  return {
    sourceItemId: potential.sourceItemId,
    sourceLabel,
    stat: potential.stat,
    value: potential.boostPercent,
    valueLabel: `${potential.boostPercent >= 0 ? "+" : ""}${potential.boostPercent}% per firing`,
    state: "conditional",
    conditionLabel: cadence,
  };
}

function lineFromValues(
  stat: VehicleStatKey,
  stockValue: number,
  currentValue: number | null,
  changeSources: readonly StatChangeSource[],
): VehicleStatLineModel {
  const definition = statDefinition(stat);
  if (currentValue === null) {
    return {
      key: stat, label: definition.label, compactLabel: definition.compactLabel, unit: definition.unit,
      stockValue, currentValue: null, currentLabel: "Unavailable",
      stockDelta: null, stockDeltaLabel: null, comparisonDelta: null, comparisonDeltaLabel: null,
      state: "unavailable", changeSources: [],
    };
  }
  const stockDelta = currentValue - stockValue;
  const formatted = formatStatDelta(stat, stockDelta, { compact: false });
  return {
    key: stat, label: definition.label, compactLabel: definition.compactLabel, unit: definition.unit,
    stockValue, currentValue, currentLabel: formatMagnitude(stat, currentValue),
    stockDelta, stockDeltaLabel: stockDelta === 0 ? "No change" : formatted.valueLabel,
    comparisonDelta: null, comparisonDeltaLabel: null,
    state: stockDelta === 0 ? "unchanged" : formatted.direction === "gain" ? "improved" : "reduced",
    changeSources,
  };
}

function accessibilityLabel(
  contextLabel: string,
  lines: readonly VehicleStatLineModel[],
  conditionalSources: readonly ConditionalStatSource[],
): string {
  const statParts = lines.map((line) => line.currentValue === null
    ? `${line.label} unavailable`
    : `${line.label} ${line.currentLabel}, ${line.comparisonDeltaLabel ?? line.stockDeltaLabel ?? "no change"}`);
  const conditionalPart = conditionalSources.length
    ? `${conditionalSources.length} effect${conditionalSources.length === 1 ? "" : "s"} require a track or lap to resolve.`
    : "";
  return [contextLabel, ...statParts, conditionalPart].filter(Boolean).join(". ");
}

export interface CurrentVehicleStatInput {
  build: VehicleBuild;
  stock: PhysicalStats;
}

/**
 * The current build's unconditional totals: stock plus every active held
 * item's own flat physical delta, honoring tier, installation, Synergy, and
 * fully-build-determined Buffs. Track-, segment-, and lap-stacking potential
 * is reported in `conditionalSources`, never folded into `currentValue`
 * (025 contract §3, spec.md FR-005/FR-006).
 */
export function currentVehicleStatModel(input: CurrentVehicleStatInput): VehicleStatPanelModel {
  const resolved = resolveCurrentBuildPhysicalStats(input.build);
  const lookup = vehicleItemLookup(input.build);
  const lines = VEHICLE_STAT_ORDER.map((stat) => {
    const sources = resolved.contributions
      .filter((contribution) => contribution.stat === stat)
      .map((contribution) => unconditionalSource(contribution, lookup));
    return lineFromValues(stat, input.stock[stat], resolved.stats[stat], sources);
  });
  const conditionalSources = resolved.conditionalPotential.map((potential) => conditionalSource(potential, lookup));
  return {
    context: { kind: "current-build" },
    contextLabel: "Current Build",
    lines,
    conditionalSources,
    status: "available",
    unavailableReason: null,
    accessibilityLabel: accessibilityLabel("Current Build", lines, conditionalSources),
  };
}

export interface ProspectiveVehicleStatInput {
  currentBuild: VehicleBuild;
  preview: PlacementPreview;
  prospectiveBuild: VehicleBuild;
  destinationLabel: string;
  stock: PhysicalStats;
}

/**
 * A noncommitting projection: the prospective build's totals compared with
 * the unchanged current build. Consumes the existing garage preview/commit
 * authority's own prospective build rather than reimplementing placement,
 * swap, eviction, or tiering rules (025 contract §4, research.md Decision 3).
 */
export function prospectiveVehicleStatModel(input: ProspectiveVehicleStatInput): VehicleStatPanelModel {
  const current = resolveCurrentBuildPhysicalStats(input.currentBuild);
  const prospective = resolveCurrentBuildPhysicalStats(input.prospectiveBuild);
  const lookup = vehicleItemLookup(input.prospectiveBuild);
  const lines = VEHICLE_STAT_ORDER.map((stat) => {
    const sources = prospective.contributions
      .filter((contribution) => contribution.stat === stat)
      .map((contribution) => unconditionalSource(contribution, lookup));
    const line = lineFromValues(stat, input.stock[stat], prospective.stats[stat], sources);
    const comparisonDelta = prospective.stats[stat] - current.stats[stat];
    const formatted = formatStatDelta(stat, comparisonDelta, { compact: false });
    return {
      ...line,
      comparisonDelta,
      comparisonDeltaLabel: comparisonDelta === 0 ? "No change" : formatted.valueLabel,
      state: comparisonDelta === 0 ? "unchanged" as const
        : formatted.direction === "gain" ? "improved" as const : "reduced" as const,
    };
  });
  const conditionalSources = prospective.conditionalPotential.map((potential) => conditionalSource(potential, lookup));
  const contextLabel = `${input.preview.disposition.toUpperCase()} preview · ${input.destinationLabel}`;
  return {
    context: { kind: "placement-preview", destinationLabel: input.destinationLabel },
    contextLabel,
    lines,
    conditionalSources,
    status: "available",
    unavailableReason: null,
    accessibilityLabel: accessibilityLabel(contextLabel, lines, conditionalSources),
  };
}

export type RecordedLapVehicleStatContextKind = "race-lap" | "result-lap" | "test-day";

export interface RecordedLapVehicleStatInput {
  lap: number;
  lapCount: number;
  contextKind?: RecordedLapVehicleStatContextKind;
  physics?: {
    stats: PhysicalStats;
    itemContributions?: readonly ItemPhysicalContributionEvidence[];
  };
  itemLookup?: ReadonlyMap<string, ItemDefinition>;
}

function lapChangeSources(
  itemContributions: readonly ItemPhysicalContributionEvidence[],
  stat: VehicleStatKey,
  lookup: ReadonlyMap<string, ItemDefinition>,
): StatChangeSource[] {
  return itemContributions.flatMap((contribution) => {
    if (!contribution.active) return [];
    const value = contribution.flatResolvedDelta[DELTA_KEY_FOR_STAT[stat]];
    if (!value) return [];
    const formatted = formatStatDelta(stat, value, { compact: true });
    return [{
      sourceItemId: contribution.sourceItemId,
      sourceLabel: sourceLabelFor(contribution.sourceItemId, lookup),
      stat, value, valueLabel: formatted.valueLabel, state: "active" as const,
    }];
  });
}

function lapConditionalSources(
  itemContributions: readonly ItemPhysicalContributionEvidence[],
  lookup: ReadonlyMap<string, ItemDefinition>,
): ConditionalStatSource[] {
  return itemContributions.flatMap((contribution) =>
    contribution.conditionalResolvedDeltas.flatMap((entry) =>
      VEHICLE_STAT_ORDER.flatMap((stat) => {
        const value = entry.delta[DELTA_KEY_FOR_STAT[stat]];
        if (!value) return [];
        const formatted = formatStatDelta(stat, value, { compact: true });
        return [{
          sourceItemId: contribution.sourceItemId,
          sourceLabel: sourceLabelFor(contribution.sourceItemId, lookup),
          stat, value, valueLabel: formatted.valueLabel,
          state: "conditional" as const,
          conditionLabel: physicsConditionLabel(entry.condition),
          affectedSegments: entry.matchedSegmentIndexes,
        }];
      })));
}

const CONTEXT_LABEL_FOR_KIND: Record<RecordedLapVehicleStatContextKind, string> = {
  "race-lap": "Race Lap",
  "result-lap": "Result Lap",
  "test-day": "Test Day",
};

/**
 * The four effective values recorded for one player lap. Consumes
 * `PlayerLap.physics` evidence only — it never calls simulation or
 * substitutes another lap's values (025 contract §5, research.md Decision
 * 4). Missing `physics` is `unavailable`; missing `itemContributions` still
 * shows the aggregate but cannot reconcile it to item sources.
 */
export function recordedLapVehicleStatModel(input: RecordedLapVehicleStatInput): VehicleStatPanelModel {
  const kind = input.contextKind ?? "race-lap";
  const contextLabel = `${CONTEXT_LABEL_FOR_KIND[kind]} ${input.lap}/${input.lapCount}`;
  const context: VehicleStatContext = kind === "test-day"
    ? { kind: "test-day", lap: input.lap }
    : { kind, lap: input.lap, lapCount: input.lapCount };

  if (!input.physics) {
    const lines = VEHICLE_STAT_ORDER.map((stat) => lineFromValues(stat, STOCK_PHYSICAL_STATS[stat], null, []));
    const unavailableReason = kind === "test-day"
      ? "This Test Day run has no track-aware physical-stat evidence."
      : `No recorded physics evidence for lap ${input.lap}.`;
    return {
      context, contextLabel, lines, conditionalSources: [], status: "unavailable", unavailableReason,
      accessibilityLabel: `${contextLabel}. ${unavailableReason}`,
    };
  }

  const lookup = input.itemLookup ?? new Map<string, ItemDefinition>();
  const itemContributions = input.physics.itemContributions;
  const lines = VEHICLE_STAT_ORDER.map((stat) => lineFromValues(
    stat,
    STOCK_PHYSICAL_STATS[stat],
    input.physics!.stats[stat],
    itemContributions ? lapChangeSources(itemContributions, stat, lookup) : [],
  ));
  const conditionalSources = itemContributions ? lapConditionalSources(itemContributions, lookup) : [];
  const status = itemContributions ? "available" : "partially-available";
  const unavailableReason = itemContributions ? null : "Item-level source evidence unavailable for this lap.";
  return {
    context, contextLabel, lines, conditionalSources, status, unavailableReason,
    accessibilityLabel: accessibilityLabel(contextLabel, lines, conditionalSources)
      + (unavailableReason ? ` ${unavailableReason}` : ""),
  };
}
