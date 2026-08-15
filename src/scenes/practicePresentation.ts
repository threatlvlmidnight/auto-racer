import type { PracticeComparison, PracticeSession, TestDayAvailability } from "../simulation/practice";
import type { ReconciliationReport } from "../simulation/practice";
import type {
  BuffApplication,
  ContestOutcome,
  ContestResult,
  ContributionTriggerState,
  OfferedItem,
} from "../simulation/types";

/** Temporary bug guard: Reward Draft cannot safely round-trip through Test Day. */
export function prepareTestDayControlVisible(encounterType: string): boolean {
  return encounterType !== "reward-draft";
}

export interface PracticeBriefingModel {
  title: "TEST DAY";
  status: "UNSCORED";
  rival: string;
  configuration: string;
  snapshot: string;
  consequences: string[];
}

export function practiceBriefingModel(session: PracticeSession): PracticeBriefingModel {
  return {
    title: "TEST DAY",
    status: "UNSCORED",
    rival: `${session.config.rival.id} · deterministic sample rival`,
    configuration: `${session.config.lapCount} laps · ${session.config.rival.lapTime.toFixed(2)} seconds per rival lap`,
    snapshot: `Locked build · ${session.snapshot.fingerprint}`,
    consequences: [
      "No rewards or penalties",
      "No sponsor or economy changes",
      "No championship progression",
    ],
  };
}

export interface PracticeEvidenceModel {
  title: "TEST DAY · UNSCORED";
  playerTotal: { value: number; label: string };
  rivalTotal: { value: number; label: string };
  gap: { value: number; label: string };
  outcome: ContestOutcome;
  laps: Array<{
    lap: number;
    playerTime: number;
    rivalTime: number;
    gap: number;
    label: string;
  }>;
  contributions: Array<{
    lap: number;
    itemId: string;
    itemName: string;
    location: string;
    effectKind: string;
    state: ContributionTriggerState;
    baseContribution: number;
    buffs: BuffApplication[];
    contribution: number;
    preClampTime: number;
    clampAdjustment: number;
    resultingTime: number;
    storage: "active" | "inactive" | "not-stored";
    reason: string | null;
    installation: string | null;
  }>;
  emptyBuild: boolean;
  reconciliation: "RECONCILED" | "FAILED";
}

export function practiceEvidenceModel(
  contest: ContestResult,
  reconciliation: ReconciliationReport,
): PracticeEvidenceModel {
  const items = new Map([...contest.board, ...contest.storage].map((item) => [item.id, item]));
  return {
    title: "TEST DAY · UNSCORED",
    playerTotal: { value: contest.playerTime, label: `${contest.playerTime.toFixed(2)} s` },
    rivalTotal: { value: contest.ghostTime, label: `${contest.ghostTime.toFixed(2)} s` },
    gap: { value: contest.gap, label: signedSeconds(contest.gap) },
    outcome: contest.outcome,
    laps: contest.laps.map((lap) => ({
      lap: lap.lap,
      playerTime: lap.playerLapTime,
      rivalTime: lap.ghostLapTime,
      gap: lap.playerLapTime - lap.ghostLapTime,
      label: `Lap ${lap.lap}: ${lap.playerLapTime.toFixed(2)} s / ${lap.ghostLapTime.toFixed(2)} s`,
    })),
    contributions: (contest.contributions ?? []).map((entry) => ({
      lap: entry.lap,
      itemId: entry.sourceItemId,
      itemName: items.get(entry.sourceItemId)?.name ?? entry.sourceItemId,
      location: `${entry.sourceLocation.area} ${entry.sourceLocation.index + 1}`,
      effectKind: entry.effectKind,
      state: entry.triggerState,
      baseContribution: entry.baseContribution,
      buffs: entry.buffApplications.map((application) => ({ ...application })),
      contribution: entry.resultingContribution,
      preClampTime: entry.preClampLapTime,
      clampAdjustment: entry.clampAdjustment,
      resultingTime: entry.resultingLapTime,
      storage: entry.sourceLocation.area !== "storage"
        ? "not-stored"
        : entry.storageActive ? "active" : "inactive",
      reason: entry.reason,
      installation: entry.installation
        ? `${entry.installation.state}: ${entry.installation.behavior}`
        : null,
    })),
    emptyBuild: contest.board.length === 0 && contest.storage.length === 0,
    reconciliation: reconciliation.valid ? "RECONCILED" : "FAILED",
  };
}

function signedSeconds(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} s`;
}

export interface PracticeComparisonBuildChangeModel {
  area: "board" | "storage";
  index: number;
  label: string;
  state: "changed";
}

export interface PracticeComparisonLapModel {
  lap: number;
  label: string;
  state: "improved" | "worsened" | "unchanged";
}

export interface PracticeComparisonContributionModel {
  lap: number;
  itemId: string;
  itemName: string;
  label: string;
  state: "improved" | "worsened" | "unchanged";
}

export interface PracticeComparisonModel {
  title: "TEST DAY COMPARISON";
  direction: "IMPROVED" | "WORSENED" | "UNCHANGED";
  totalDeltaLabel: string;
  gapDeltaLabel: string;
  outcomeLabel: string;
  buildChanges: PracticeComparisonBuildChangeModel[];
  laps: PracticeComparisonLapModel[];
  contributions: PracticeComparisonContributionModel[];
}

export function practiceComparisonModel(comparison: PracticeComparison): PracticeComparisonModel {
  const previousNames = itemNameMap(comparison.previous.contest);
  const currentNames = itemNameMap(comparison.current.contest);

  return {
    title: "TEST DAY COMPARISON",
    direction: comparison.direction === "improved"
      ? "IMPROVED"
      : comparison.direction === "worsened" ? "WORSENED" : "UNCHANGED",
    totalDeltaLabel: signedDeltaSeconds(comparison.totalDelta),
    gapDeltaLabel: signedDeltaSeconds(comparison.gapDelta),
    outcomeLabel: comparison.outcomeChanged
      ? `Outcome changed: ${comparison.previous.contest.outcome.toUpperCase()} -> ${comparison.current.contest.outcome.toUpperCase()}`
      : `Outcome unchanged: ${comparison.current.contest.outcome.toUpperCase()}`,
    buildChanges: comparison.buildChanges.map((change) => {
      const areaLabel = change.area === "board" ? "Board" : "Storage";
      const beforeName = change.beforeItemId
        ? (previousNames.get(change.beforeItemId) ?? change.beforeItemId)
        : "Empty slot";
      const afterName = change.afterItemId
        ? (currentNames.get(change.afterItemId) ?? change.afterItemId)
        : "Empty slot";
      return {
        area: change.area,
        index: change.index,
        label: `${areaLabel} slot ${change.index + 1}: ${beforeName} -> ${afterName}`,
        state: "changed" as const,
      };
    }),
    laps: comparison.laps.map((lap) => ({
      lap: lap.lap,
      label: `Lap ${lap.lap}: ${signedDeltaSeconds(lap.playerTimeDelta)}`,
      state: lap.playerTimeDelta < 0 ? "improved" : lap.playerTimeDelta > 0 ? "worsened" : "unchanged",
    })),
    contributions: comparison.contributions.map((entry) => {
      const itemName = currentNames.get(entry.sourceItemId)
        ?? previousNames.get(entry.sourceItemId)
        ?? entry.sourceItemId;
      return {
        lap: entry.lap,
        itemId: entry.sourceItemId,
        itemName,
        label: `Lap ${entry.lap} · ${itemName}: ${signedDeltaSeconds(entry.resultingContributionDelta)}`,
        state: entry.resultingContributionDelta < 0
          ? "improved"
          : entry.resultingContributionDelta > 0 ? "worsened" : "unchanged",
      };
    }),
  };
}

function itemNameMap(contest: ContestResult): Map<string, string> {
  return new Map<string, string>(
    [...contest.board, ...contest.storage].map((item: OfferedItem) => [item.id, item.name]),
  );
}

function signedDeltaSeconds(value: number): string {
  if (value === 0) return "0.00 s";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} s`;
}

// FR-025: supporting text and interactive control labels have distinct size floors.
export const PRACTICE_MIN_SUPPORTING_TEXT_PX = 14;
export const PRACTICE_MIN_CONTROL_LABEL_PX = 16;

export type PracticeSemanticState =
  | "unscored"
  | "selected"
  | "focused"
  | "disabled"
  | "unavailable"
  | "changed"
  | "improved"
  | "worsened";

export interface PracticeStateToken {
  state: PracticeSemanticState;
  text: string;
  icon: string;
  colorToken: string;
}

// Every semantic state carries a distinct text + icon token so meaning never depends on color alone.
export const PRACTICE_STATE_TOKENS: Record<PracticeSemanticState, PracticeStateToken> = {
  unscored: { state: "unscored", text: "UNSCORED", icon: "flag-outline", colorToken: "amber" },
  selected: { state: "selected", text: "SELECTED", icon: "check", colorToken: "gold" },
  focused: { state: "focused", text: "FOCUSED", icon: "ring", colorToken: "cyan" },
  disabled: { state: "disabled", text: "DISABLED", icon: "slash", colorToken: "grey" },
  unavailable: { state: "unavailable", text: "UNAVAILABLE", icon: "block", colorToken: "grey" },
  changed: { state: "changed", text: "CHANGED", icon: "delta", colorToken: "blue" },
  improved: { state: "improved", text: "IMPROVED", icon: "arrow-up", colorToken: "green" },
  worsened: { state: "worsened", text: "WORSENED", icon: "arrow-down", colorToken: "red" },
};

export type PracticeControlId =
  | "cancel"
  | "start-test"
  | "pause"
  | "speed"
  | "skip"
  | "return"
  | "repeat-test";

export interface PracticeControlModel {
  id: PracticeControlId;
  label: string;
  order: number;
  enabled: boolean;
  disabledReason: string | null;
  keyBinding: string;
  pointer: true;
  touch: true;
  focusVisible: true;
}

function control(
  id: PracticeControlId,
  label: string,
  order: number,
  keyBinding: string,
  enabled: boolean,
  disabledReason: string | null,
): PracticeControlModel {
  return { id, label, order, enabled, disabledReason, keyBinding, pointer: true, touch: true, focusVisible: true };
}

export function practiceBriefingControlPlan(
  availability: Pick<TestDayAvailability, "available" | "reason">,
): PracticeControlModel[] {
  return [
    control("cancel", "CANCEL", 0, "Escape", true, null),
    control(
      "start-test",
      "START TEST",
      1,
      "Enter",
      availability.available,
      availability.available ? null : availability.reason,
    ),
  ];
}

export function practiceContestControlPlan(): PracticeControlModel[] {
  return [
    control("cancel", "CANCEL", 0, "Escape", true, null),
    control("pause", "PAUSE", 1, "Space", true, null),
    control("skip", "SKIP", 2, "S", true, null),
  ];
}

export function practiceResultControlPlan(): PracticeControlModel[] {
  return [
    control("return", "RETURN", 0, "Escape", true, null),
    control("repeat-test", "REPEAT TEST", 1, "R", true, null),
  ];
}

export function fitPracticeLabel(
  text: string,
  maxWidthPx: number,
  fontPx: number,
): { lines: string[]; overflow: boolean } {
  const averageCharWidthPx = fontPx * 0.58;
  const maxChars = Math.max(1, Math.floor(maxWidthPx / averageCharWidthPx));
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return { lines, overflow: lines.some((line) => line.length > maxChars) };
}

export type PracticeViewportPreset = "1920x1080" | "1366x768" | "1024x768" | "390x844";

export const PRACTICE_REQUIRED_VIEWPORTS: Record<PracticeViewportPreset, { width: number; height: number }> = {
  "1920x1080": { width: 1920, height: 1080 },
  "1366x768": { width: 1366, height: 768 },
  "1024x768": { width: 1024, height: 768 },
  "390x844": { width: 390, height: 844 },
};

export interface PracticeLayoutSection {
  id: string;
  minHeightPx: number;
  isControl?: boolean;
}

export interface PracticeLayoutRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  textPx: number;
}

export interface PracticeLayoutModel {
  viewport: { width: number; height: number };
  regions: PracticeLayoutRegion[];
  horizontalOverflow: boolean;
  totalHeight: number;
}

const PRACTICE_LAYOUT_MARGIN_PX = 16;
const PRACTICE_LAYOUT_GAP_PX = 8;

// Sections always stack in a single vertical flow at full available width, so
// there is never horizontal scroll; total content height is free to exceed the
// viewport and scroll vertically instead (per FR-024).
export function buildPracticeResponsiveLayout(
  viewport: { width: number; height: number },
  sections: PracticeLayoutSection[],
): PracticeLayoutModel {
  const width = Math.max(0, viewport.width - PRACTICE_LAYOUT_MARGIN_PX * 2);
  let y = PRACTICE_LAYOUT_MARGIN_PX;
  const regions = sections.map((section) => {
    const textPx = section.isControl ? PRACTICE_MIN_CONTROL_LABEL_PX : PRACTICE_MIN_SUPPORTING_TEXT_PX;
    const height = Math.max(section.minHeightPx, textPx + 8);
    const region: PracticeLayoutRegion = { id: section.id, x: PRACTICE_LAYOUT_MARGIN_PX, y, width, height, textPx };
    y += height + PRACTICE_LAYOUT_GAP_PX;
    return region;
  });
  return {
    viewport,
    regions,
    horizontalOverflow: regions.some((region) => region.x + region.width > viewport.width),
    totalHeight: y,
  };
}
