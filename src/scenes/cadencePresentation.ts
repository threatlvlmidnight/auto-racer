import { familyFor } from "../simulation/encounterCadence";

/**
 * Feature 034 cadence and history understanding view models (034 task T069,
 * contract §Presentation — active/pending/settled/unavailable status with a
 * plain target/expiry, never hover- or color-only). Pure and Phaser-free.
 */

export type EncounterLifecycleStatus = "active" | "pending" | "settled" | "unavailable";

export interface CadenceHistoryEntryView {
  /** Stable encounter id (read-only reference to retained state). */
  encounterId: string;
  typeId: string;
  typeLabel: string;
  family: string;
  /** Choice ordinal (1..20) at which this encounter occurred. */
  stageOrdinal: number;
  status: EncounterLifecycleStatus;
  /** For a pending effect: the target scored race it awaits. */
  targetStage: number | null;
  /** For a pending effect that expires: the stage it stops waiting at. */
  expiryStage: number | null;
  /** Plain-text consequence chosen at commit. */
  outcomeLabel: string;
}

export interface PendingEffectsView {
  sponsor: { pending: boolean; categoryLabel: string };
  scrutineering: { pending: boolean; categoryLabel: string };
}

export type CadenceHistorySource = {
  encounterId: string;
  typeId: string;
  family: string;
  stageOrdinal: number;
  status: EncounterLifecycleStatus;
  targetStage?: number | null;
  expiryStage?: number | null;
  outcomeLabel: string;
};

/** Maps retained, immutable cadence history to an exact ordered view model. */
export function cadenceHistoryView(entries: readonly CadenceHistorySource[]): readonly CadenceHistoryEntryView[] {
  return entries.map((entry) => ({
    encounterId: entry.encounterId,
    typeId: entry.typeId,
    typeLabel: entry.typeId === "legacy" ? "Encounter" : entry.typeId,
    family: entry.typeId === "legacy" ? "encounter" : familyFor(entry.typeId as never),
    stageOrdinal: entry.stageOrdinal,
    status: entry.status,
    targetStage: entry.targetStage ?? null,
    expiryStage: entry.expiryStage ?? null,
    outcomeLabel: entry.outcomeLabel,
  }));
}

const STATUS_TEXT: Readonly<Record<EncounterLifecycleStatus, string>> = {
  active: "choose or decline this encounter now",
  pending: "resolves at the target scored race",
  settled: "completed; see its immutable history",
  unavailable: "no legal operation was available — left with nothing consumed",
};

export function statusText(status: EncounterLifecycleStatus): string {
  return STATUS_TEXT[status];
}

/** One unresolved pending effect per category — Sponsor and Scrutineering may coexist. */
export function pendingEffectsView(pending: { sponsor: boolean; scrutineering: boolean }): PendingEffectsView {
  return {
    sponsor: { pending: pending.sponsor, categoryLabel: "Sponsor contract" },
    scrutineering: { pending: pending.scrutineering, categoryLabel: "Scrutineering impound" },
  };
}

export function statusForPending(
  source: Pick<CadenceHistorySource, "status" | "targetStage" | "expiryStage">,
): EncounterLifecycleStatus {
  if (source.status === "active" || source.status === "settled" || source.status === "unavailable") {
    return source.status;
  }
  return "pending";
}
