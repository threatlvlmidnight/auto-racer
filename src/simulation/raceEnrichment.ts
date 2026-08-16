import {
  DEFAULT_RACE_ENRICHMENT_CONFIG,
  type RaceEnrichmentConfig,
  type RacePhaseFractions,
} from "./enrichmentConfig";
import type {
  ComposureLedger,
  ComposureSpend,
  DriverRaceIdentity,
  EnrichedLap,
  EnrichmentEvent,
  EnrichmentEventKind,
  RacePhase,
  RacePhaseSchedule,
  SignatureContext,
  SignatureEligibility,
  StatTarget,
} from "./types";
import {
  enrichLapsWithTemporaryEffects,
  type TemporaryLapEffect,
} from "./laps";

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
// --- Phase 3 US1 (T023/T026): one authoritative enrichment pass -----------

/** Authored per-car enrichment input; the committed contest identity (contract §2). */
export interface EnrichmentCarInput {
  id: string;
  identity: DriverRaceIdentity;
  /** Authored base lap times from the deterministic lap simulation. */
  baseLapTimes: readonly number[];
  /** Resolved physical stat values (origin-agnostic), keyed by StatTarget. */
  resolvedStats: Readonly<Partial<Record<StatTarget, number>>>;
  /** Legal contributing item/setup sources for eligibility attribution. */
  contributingSources: readonly string[];
}

export interface EnrichmentInput {
  config: RaceEnrichmentConfig;
  lapCount: number;
  seed: number;
  /** Stable tie-break order (player first, then rivals in catalog order). */
  rosterOrder: readonly string[];
  cars: readonly EnrichmentCarInput[];
}

export interface EnrichmentCarOutput {
  id: string;
  composureLedger: ComposureLedger;
  enrichedLaps: readonly EnrichedLap[];
}

export interface EnrichmentOutput {
  configVersion: string;
  incidentsEnabled: boolean;
  phaseSchedule: RacePhaseSchedule;
  cars: readonly EnrichmentCarOutput[];
  /** Ordered by authoritative boundary; each boundary internally kind-ordered. */
  events: readonly EnrichmentEvent[];
  eligibility: readonly SignatureEligibility[];
}

/** Which shared phase a signature's authored context maps into (research Decision 4). */
const CONTEXT_PHASE: Readonly<Record<SignatureContext, RacePhase>> = Object.freeze({
  "final-push": "final-push",
  contested: "contest",
  "corner-exit": "contest",
});

/**
 * The single authoritative enrichment pass (T023/T026). Walks every lap
 * boundary, activates contextual signatures, evaluates Composure-backed
 * attack/defense windows, folds bounded temporary effects into enriched lap
 * evidence, and returns immutable events + final ledgers. Purely deterministic
 * (contract §2/§3/§5/§8). Callers rank exactly once from the returned enriched
 * totals.
 */
export function resolveEnrichment(input: EnrichmentInput): EnrichmentOutput {
  const { config, lapCount, seed, rosterOrder, cars } = input;
  const schedule = computePhaseSchedule(lapCount, config.phaseFractions);
  const actionTieSeed = deriveNamedSubSeed(seed, "action-ties");

  const eligibility: SignatureEligibility[] = cars.map((car) => {
    const sig = car.identity.signature;
    const threshold = config.signatureThresholds[sig.thresholdKey] ?? 0;
    const committedValue = car.resolvedStats[sig.statTarget] ?? 0;
    return {
      participantId: car.id,
      signatureId: sig.id,
      stat: sig.statTarget,
      committedValue,
      threshold,
      contributingSources: car.contributingSources,
      eligible: committedValue >= threshold,
    };
  });
  const eligibleById = new Map(eligibility.map((entry) => [entry.participantId, entry.eligible]));

  const ledgers = new Map<string, ComposureLedger>(
    cars.map((car) => [car.id, createComposureLedger(car.id, config.initialComposure)]),
  );
  let positionOf = new Map<string, number>(rosterOrder.map((id, index) => [id, index + 1]));
  const cumulativeTime = new Map<string, number>(cars.map((car) => [car.id, 0]));
  const enrichedLapsByCar = new Map<string, EnrichedLap[]>(cars.map((car) => [car.id, []]));
  const activated = new Set<string>();
  const events: EnrichmentEvent[] = [];
  for (let lap = 1; lap <= lapCount; lap += 1) {
    const phase = racePhaseForLap(schedule, lap);
    const boundaryId = `lap-${lap}`;
    const boundaryEvents: EnrichmentEvent[] = [];
    let seq = 0;

    const prevPhase = lap === 1 ? null : racePhaseForLap(schedule, lap - 1);
    if (prevPhase === null || prevPhase !== phase) {
      seq += 1;
      boundaryEvents.push({
        eventId: enrichmentEventId("phase-transition", boundaryId, seq),
        kind: "phase-transition",
        phase,
        boundaryId,
        orderSeq: seq,
        actorId: "race",
        emphasis: "results-only",
        triggerRef: phase,
      });
    }

    const activeEffects: TemporaryLapEffect[] = [];
    for (const car of cars) {
      const sig = car.identity.signature;
      const contextPhase = CONTEXT_PHASE[sig.context];
      if (contextPhase !== phase) continue;
      if (!eligibleById.get(car.id) || activated.has(car.id)) continue;
      const ledger = ledgers.get(car.id)!;
      if (!canAffordComposure(ledger, config.signatureActivationCost)) continue;
      seq += 1;
      const eventId = enrichmentEventId("signature-activation", boundaryId, seq);
      const cap = config.signatureTemporaryEffectCaps[sig.temporaryEffect.kind] ?? 0;
      const startLap = lap;
      const endLap = phase === "final-push" ? lapCount : schedule[phase].end;
      const after = debitComposure(ledger, config.signatureActivationCost, {
        eventId,
        boundaryId,
        actionKind: "signature",
      });
      boundaryEvents.push({
        eventId,
        kind: "signature-activation",
        phase,
        boundaryId,
        orderSeq: seq,
        actorId: car.id,
        emphasis: "full",
        before: { position: positionOf.get(car.id)!, time: cumulativeTime.get(car.id)! },
        composure: { before: ledger.remaining, spent: config.signatureActivationCost, after: after.remaining },
        temporaryEffect: { stat: sig.temporaryEffect.stat, delta: cap, startLap, endLap },
        triggerRef: sig.id,
      });
      activated.add(car.id);
      ledgers.set(car.id, after);
      activeEffects.push({ kind: sig.temporaryEffect.kind, stat: sig.temporaryEffect.stat, magnitude: cap, startLap, endLap });
    }

    const boundaryCars: BoundaryCarState[] = cars.map((car) => ({
      id: car.id,
      identity: car.identity,
      position: positionOf.get(car.id)!,
      cumulativeTime: cumulativeTime.get(car.id)!,
      projectedLapTime: car.baseLapTimes[lap - 1],
      composure: ledgers.get(car.id)!,
    }));
    const boundary = evaluateBoundary(boundaryId, phase, boundaryCars, config, actionTieSeed);
    for (const event of boundary.events) boundaryEvents.push(event);
    for (const car of boundary.cars) ledgers.set(car.id, car.composure);

    boundaryEvents.sort(
      (a, b) => stableEventKindPriority(a.kind) - stableEventKindPriority(b.kind)
        || a.orderSeq - b.orderSeq,
    );
    events.push(...boundaryEvents);

    for (const car of cars) {
      const base = [{ time: car.baseLapTimes[lap - 1] }];
      const [enriched] = enrichLapsWithTemporaryEffects(base, () => phase, activeEffects, new Map(), lap);
      enrichedLapsByCar.get(car.id)!.push(enriched);
      cumulativeTime.set(car.id, cumulativeTime.get(car.id)! + enriched.enrichedTime);
    }

    const nextOrder = [...cars].sort(
      (a, b) => cumulativeTime.get(a.id)! - cumulativeTime.get(b.id)!
        || rosterOrder.indexOf(a.id) - rosterOrder.indexOf(b.id),
    );
    positionOf = new Map(nextOrder.map((car, index) => [car.id, index + 1]));
  }

  return {
    configVersion: config.version,
    incidentsEnabled: config.incidentsEnabled,
    phaseSchedule: schedule,
    cars: cars.map((car) => ({
      id: car.id,
      composureLedger: ledgers.get(car.id)!,
      enrichedLaps: enrichedLapsByCar.get(car.id)!,
    })),
    events,
    eligibility,
  };
}
