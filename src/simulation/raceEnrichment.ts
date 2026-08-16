import {
  DEFAULT_RACE_ENRICHMENT_CONFIG,
  type RaceEnrichmentConfig,
  type RacePhaseFractions,
} from "./enrichmentConfig";
import type {
  ComposureLedger,
  ComposureSpend,
  DriverRaceIdentity,
  EnrichmentEvent,
  EnrichmentEventKind,
  RacePhase,
  RacePhaseSchedule,
} from "./types";

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

// --- Phase 3 US1: immutable Composure ledger (T022) -----------------------

/**
 * Atomic debit of a finite, race-local Composure budget (contract §5). A spend
 * is accepted only when *all* of the cost remains; an unaffordable action is
 * skipped without a partial debit. Ledgers are immutable — every spend returns
 * a new ledger with the exact `before`/`after` retained as evidence.
 */
export class ComposureOverspendError extends RangeError {
  constructor(
    public readonly participantId: string,
    public readonly amountRequested: number,
    public readonly remaining: number,
  ) {
    super(
      `Composure overspend for ${participantId}: requested ${amountRequested} but only ${remaining} remaining.`,
    );
    this.name = "ComposureOverspendError";
  }
}

export interface ComposureDebitContext {
  eventId: string;
  boundaryId: string;
  actionKind: string;
}

/** Open a finite, race-local, non-replenishing budget. */
export function createComposureLedger(
  participantId: string,
  initial: number,
): ComposureLedger {
  if (!Number.isFinite(initial) || initial < 0) {
    throw new RangeError(`Composure initial budget must be a non-negative finite number, got ${String(initial)}`);
  }
  return { participantId, initial, remaining: initial, spends: [] };
}

/** Full cost must remain — never a partial debit (data-model.md ComposureLedger). */
export function canAffordComposure(
  ledger: ComposureLedger,
  amount: number,
): boolean {
  return Number.isFinite(amount) && amount >= 0 && ledger.remaining >= amount;
}

/**
 * Immutably debit `amount`. Throws `ComposureOverspendError` (without
 * returning a mutated ledger) when the full cost does not remain.
 */
export function debitComposure(
  ledger: ComposureLedger,
  amount: number,
  context: ComposureDebitContext,
): ComposureLedger {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`Composure debit amount must be a positive finite number, got ${String(amount)}`);
  }
  if (!canAffordComposure(ledger, amount)) {
    throw new ComposureOverspendError(ledger.participantId, amount, ledger.remaining);
  }
  const spend: ComposureSpend = {
    eventId: context.eventId,
    boundaryId: context.boundaryId,
    actionKind: context.actionKind,
    amount,
    before: ledger.remaining,
    after: ledger.remaining - amount,
  };
  return {
    participantId: ledger.participantId,
    initial: ledger.initial,
    remaining: spend.after,
    spends: [...ledger.spends, spend],
  };
}

// --- Phase 3 US1: authoritative boundary state and passes (T023/T024) -----

/** Pure, immutable car state at one lap/segment boundary (data-model ActionWindow). */
export interface BoundaryCarState {
  id: string;
  identity: DriverRaceIdentity;
  /** 1-based rank at the boundary by cumulative time (roster order tie-break). */
  position: number;
  /** Total authored+enriched time accumulated to reach this boundary. */
  cumulativeTime: number;
  /** This car's projected (base) time for the upcoming lap segment. */
  projectedLapTime: number;
  composure: ComposureLedger;
}

export interface BoundaryResolution {
  boundaryId: string;
  phase: RacePhase;
  /** Immutable events for this boundary, in stable kind/roster order. */
  events: readonly EnrichmentEvent[];
  /** Cars with updated composure ledgers and (on a completed pass) positions. */
  cars: readonly BoundaryCarState[];
}

/** Deterministic coin shared by opposed action outcomes (action-ties stream). */
function coinFlip(actionTieSeed: number, key: string): boolean {
  return (fnv1a(`${String(actionTieSeed)}::${key}`) & 1) === 0;
}

/**
 * Evaluate one boundary in stable roster order: proximity (directly-ahead car
 * within `passingRange` seconds), projected pace advantage, atomic Composure
 * attacks/defenses, and completed passes. Purely deterministic — identical
 * inputs yield identical events, spends, and swaps (research Decisions 6, 7).
 */
export function evaluateBoundary(
  boundaryId: string,
  phase: RacePhase,
  carsInput: readonly BoundaryCarState[],
  config: RaceEnrichmentConfig,
  actionTieSeed: number,
): BoundaryResolution {
  const cars = carsInput.map((car) => ({ ...car }));
  const events: EnrichmentEvent[] = [];
  const orderSeq = new Map<EnrichmentEventKind, number>();
  let seq = 0;
  const scope = (kind: EnrichmentEventKind): number => {
    const next = (orderSeq.get(kind) ?? 0) + 1;
    orderSeq.set(kind, next);
    return next;
  };

  const byPosition = (a: BoundaryCarState, b: BoundaryCarState) =>
    a.position - b.position;

  for (const attacker of cars) {
    const sorted = [...cars].sort(byPosition);
    const ahead = sorted.find((car) => car.position === attacker.position - 1);
    if (!ahead) continue;

    const distance = attacker.cumulativeTime - ahead.cumulativeTime;
    if (distance < 0 || distance > config.passingRange) continue;

    const paceAdvantage = ahead.projectedLapTime - attacker.projectedLapTime;
    const sufficientAdvantage =
      paceAdvantage >= config.minimumPaceAdvantage * ahead.projectedLapTime;
    if (!sufficientAdvantage) continue;

    const targetId = ahead.id;
    if (!canAffordComposure(attacker.composure, config.attackCost)) continue;

    // --- attack (atomic) ---
    seq += 1;
    const attackEventId = enrichmentEventId("attack", boundaryId, scope("attack"));
    const attackerAfter = debitComposure(
      attacker.composure,
      config.attackCost,
      { eventId: attackEventId, boundaryId, actionKind: "attack" },
    );
    events.push({
      eventId: attackEventId,
      kind: "attack",
      phase,
      boundaryId,
      orderSeq: seq,
      actorId: attacker.id,
      targetId,
      emphasis: "compact",
      before: { position: attacker.position, time: attacker.cumulativeTime },
      composure: {
        before: attacker.composure.remaining,
        spent: config.attackCost,
        after: attackerAfter.remaining,
      },
      triggerRef: `${boundaryId}:${attacker.id}->${targetId}`,
    });
    attacker.composure = attackerAfter;

    // --- defense (atomic, or skipped when unaffordable) ---
    let defenderLedger = ahead.composure;
    if (canAffordComposure(defenderLedger, config.defenseCost)) {
      seq += 1;
      const defenseEventId = enrichmentEventId("defense", boundaryId, scope("defense"));
      const defenderAfter = debitComposure(
        defenderLedger,
        config.defenseCost,
        { eventId: defenseEventId, boundaryId, actionKind: "defense" },
      );
      events.push({
        eventId: defenseEventId,
        kind: "defense",
        phase,
        boundaryId,
        orderSeq: seq,
        actorId: targetId,
        targetId: attacker.id,
        emphasis: "compact",
        before: { position: ahead.position, time: ahead.cumulativeTime },
        composure: {
          before: defenderLedger.remaining,
          spent: config.defenseCost,
          after: defenderAfter.remaining,
        },
        triggerRef: `${boundaryId}:${targetId}->${attacker.id}`,
      });
      defenderLedger = defenderAfter;
    }

    // --- pass result ---
    const defended = defenderLedger.spends.length > ahead.composure.spends.length;
    const completes = defended
      ? coinFlip(actionTieSeed, `${boundaryId}:${attacker.id}:${targetId}`)
      : true;

    if (completes) {
      seq += 1;
      const eventId = enrichmentEventId("overtake-completed", boundaryId, scope("overtake-completed"));
      events.push({
        eventId,
        kind: "overtake-completed",
        phase,
        boundaryId,
        orderSeq: seq,
        actorId: attacker.id,
        targetId,
        emphasis: "compact",
        before: { position: attacker.position, time: attacker.cumulativeTime },
        after: { position: attacker.position - 1, time: attacker.cumulativeTime },
        triggerRef: `${boundaryId}:${attacker.id}->${targetId}`,
      });
      attacker.position -= 1;
      ahead.position += 1;
    } else {
      seq += 1;
      const eventId = enrichmentEventId("overtake-attempt", boundaryId, scope("overtake-attempt"));
      events.push({
        eventId,
        kind: "overtake-attempt",
        phase,
        boundaryId,
        orderSeq: seq,
        actorId: attacker.id,
        targetId,
        emphasis: "compact",
        before: { position: attacker.position, time: attacker.cumulativeTime },
        triggerRef: `${boundaryId}:${attacker.id}->${targetId}`,
      });
    }
    ahead.composure = defenderLedger;
  }

  events.sort(compareEnrichmentEvents);
  return { boundaryId, phase, events, cars };
}
