import { DEFAULT_RACE_ENRICHMENT_CONFIG, type RacePhaseFractions } from "./enrichmentConfig";
import type { EnrichmentEventKind, RacePhase, RacePhaseSchedule } from "./types";

/**
 * Feature 033 (T013): deterministic shared phases, isolated named sub-seeds, and
 * stable event identity/ordering. All pure and framework-free (research Decisions
 * 2, 6, 7). Identical inputs yield identical schedules, stream sets, and ordering.
 */

const DEFAULT_FRACTIONS: RacePhaseFractions = DEFAULT_RACE_ENRICHMENT_CONFIG.phaseFractions;

/** Stable event-kind priority: lower resolves earlier (research Decision 7). */
export const ENRICHMENT_EVENT_KIND_ORDER: readonly EnrichmentEventKind[] = Object.freeze([
  "phase-transition",
  "signature-activation",
  "incident",
  "attack",
  "defense",
  "overtake-attempt",
  "overtake-completed",
]);

export function stableEventKindPriority(kind: EnrichmentEventKind): number {
  const index = ENRICHMENT_EVENT_KIND_ORDER.indexOf(kind);
  if (index < 0) {
    throw new Error(`Unknown enrichment event kind: ${String(kind)}`);
  }
  return index;
}

/**
 * Exact shared phase schedule. Opening = floor(N * opening), Final Push =
 * round(N * finalPush) (round-half-up), Contest = remainder — so an indivisible
 * quarter remainder belongs to Final Push (spec.md clarification). Pinned counts:
 * 8=`2/4/2`, 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, 16=`4/8/4`.
 */
export function computePhaseSchedule(
  lapCount: number,
  fractions: RacePhaseFractions = DEFAULT_FRACTIONS,
): RacePhaseSchedule {
  if (!Number.isInteger(lapCount) || lapCount < 1) {
    throw new RangeError(`lapCount must be a positive integer, got ${String(lapCount)}`);
  }
  const opening = Math.floor(lapCount * fractions.opening);
  const finalPush = Math.round(lapCount * fractions.finalPush);
  const contest = lapCount - opening - finalPush;
  const openingEnd = opening;
  const contestEnd = opening + contest;
  return {
    lapCount,
    opening: { start: 1, end: openingEnd },
    contest: { start: opening + 1, end: contestEnd },
    finalPush: { start: contestEnd + 1, end: lapCount },
    counts: { opening, contest, finalPush },
  };
}

function isInRange(lap: number, range: { start: number; end: number }): boolean {
  return range.start <= lap && lap <= range.end;
}

/** The phase owning the given 1-indexed lap; assigned exactly once. */
export function racePhaseForLap(schedule: RacePhaseSchedule, lapNumber: number): RacePhase {
  if (!Number.isInteger(lapNumber) || lapNumber < 1 || lapNumber > schedule.lapCount) {
    throw new RangeError(`lapNumber out of range 1..${schedule.lapCount}: ${String(lapNumber)}`);
  }
  if (isInRange(lapNumber, schedule.opening)) return "opening";
  if (isInRange(lapNumber, schedule.contest)) return "contest";
  if (isInRange(lapNumber, schedule.finalPush)) return "final-push";
  throw new Error(`lap ${lapNumber} was not assigned to any phase`);
}

/** Named deterministic sub-seed streams (research Decision 6). */
export const ENRICHMENT_SEED_STREAMS = Object.freeze({
  opponentSetup: "opponent-setup",
  actionTies: "action-ties",
  incidents: "incidents",
} as const);

const BASE_SEED_STREAMS: readonly string[] = [
  ENRICHMENT_SEED_STREAMS.opponentSetup,
  ENRICHMENT_SEED_STREAMS.actionTies,
];

/**
 * Which streams a resolution consumes for the given toggles. Disabled subsystems
 * consume no stream, so toggling incidents removes/adds exactly the incidents
 * stream and cannot shift the base streams (research Decision 6).
 */
export function activeSeedStreams(enabled: boolean, incidentsEnabled: boolean): readonly string[] {
  if (!enabled) return [];
  return incidentsEnabled
    ? [...BASE_SEED_STREAMS, ENRICHMENT_SEED_STREAMS.incidents]
    : [...BASE_SEED_STREAMS];
}

/** FNV-1a over the normalized (seed, name) key; stable across processes. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Isolated, deterministic sub-seed for one named stream of a contest seed. */
export function deriveNamedSubSeed(seed: number, name: string): number {
  return fnv1a(`${String(seed)}::${name}`) >>> 0;
}

/** Stable event ID for a boundary across kinds (research Decision 10). */
export function enrichmentEventId(kind: EnrichmentEventKind, boundaryId: string, seq: number): string {
  return `${boundaryId}:${kind}:${String(seq).padStart(3, "0")}`;
}

/** Stable ordering: event-kind priority first, then deterministic sequence. */
export function compareEnrichmentEvents(
  a: { kind: EnrichmentEventKind; orderSeq?: number },
  b: { kind: EnrichmentEventKind; orderSeq?: number },
): number {
  const kindDelta = stableEventKindPriority(a.kind) - stableEventKindPriority(b.kind);
  if (kindDelta !== 0) return kindDelta;
  return (a.orderSeq ?? 0) - (b.orderSeq ?? 0);
}