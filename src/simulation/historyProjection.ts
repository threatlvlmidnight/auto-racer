import type { EncounterType } from "./types";

/**
 * Immutable, chronological encounter-history projection (034 tasks T066/T068).
 * Consumes concrete, already-committed run mutations and returns an ordered,
 * evidence-tagged history snapshot. Pure and deterministic — recomputation is a
 * byte-stable projection and never mutates its input.
 */

export type HistoryOutcome = "accepted" | "declined" | "unavailable" | "pending";
export type PendingCategory = "sponsor" | "scrutineering";

export interface EncounterHistoryEvidence {
  encounterId: string;
  typeId: EncounterType;
  stageOrdinal: number;
  outcome: HistoryOutcome;
  creditsDelta: number;
  /** Unresolved pending category, or null (immediate/declined/unavailable). */
  pending: PendingCategory | null;
  /** For a pending effect: the target scored race it awaits. */
  targetStage: number | null;
  /** For a pending effect that expires: the stage it stops waiting at. */
  expiryStage: number | null;
  /** Immutable evidence: stable hash over stage + id + applied-mutation fingerprint. */
  evidenceHash: string;
}

export interface EncounterHistoryInput {
  encounterId: string;
  typeId: EncounterType;
  stageOrdinal: number;
  outcome: HistoryOutcome;
  creditsDelta: number;
  pendingCategory?: PendingCategory | null;
  targetStage?: number | null;
  expiryStage?: number | null;
  /** Fingerprint of the exact applied mutations (items, economy, effects). */
  mutationFingerprint: string;
}

/** FNV-1a — deterministic, dependency-free string hash. */
function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Chronological, immutable history projection (never mutates the input array). */
export function projectEncounterHistory(
  entries: readonly EncounterHistoryInput[],
): readonly EncounterHistoryEvidence[] {
  return [...entries]
    .sort((a, b) => a.stageOrdinal - b.stageOrdinal || a.encounterId.localeCompare(b.encounterId))
    .map((entry) => ({
      encounterId: entry.encounterId,
      typeId: entry.typeId,
      stageOrdinal: entry.stageOrdinal,
      outcome: entry.outcome,
      creditsDelta: entry.creditsDelta,
      pending: entry.pendingCategory ?? null,
      targetStage: entry.targetStage ?? null,
      expiryStage: entry.expiryStage ?? null,
      evidenceHash: stableHash(`${entry.stageOrdinal}:${entry.encounterId}:${entry.mutationFingerprint}`),
    }));
}
