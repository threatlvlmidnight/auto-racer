import { describe, expect, it } from "vitest";
import {
  DEFAULT_RACE_ENRICHMENT_CONFIG,
} from "../../src/simulation/enrichmentConfig";
import {
  ComposureOverspendError,
  ENRICHMENT_SEED_STREAMS,
  activeSeedStreams,
  compareEnrichmentEvents,
  computePhaseSchedule,
  createComposureLedger,
  debitComposure,
  canAffordComposure,
  deriveNamedSubSeed,
  evaluateBoundary,
  racePhaseForLap,
  stableEventKindPriority,
  type BoundaryCarState,
} from "../../src/simulation/raceEnrichment";
import { generatedRivalIdentity } from "../../src/content/driverRaceIdentities";
import type { DriverRaceIdentity } from "../../src/simulation/types";
import { ENRICHMENT_LAP_COUNTS } from "../fixtures/race-enrichment-fixtures";

/**
 * Feature 033 Phase 2 (T008/T009): exact phase-coverage and isolated named
 * sub-seed derivation. Phase counts are pinned end-to-end (8=`2/4/2`,
 * 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, 16=`4/8/4`) with an indivisible remainder
 * belonging to Final Push (spec.md clarification; data-model.md RacePhase).
 */

describe("Feature 033 (T008): exact phase coverage for every supported lap count", () => {
  const expectedCounts: Record<number, { opening: number; contest: number; finalPush: number }> = {
    8: { opening: 2, contest: 4, finalPush: 2 },
    10: { opening: 2, contest: 5, finalPush: 3 },
    12: { opening: 3, contest: 6, finalPush: 3 },
    14: { opening: 3, contest: 7, finalPush: 4 },
    16: { opening: 4, contest: 8, finalPush: 4 },
  };

  it.each(ENRICHMENT_LAP_COUNTS)("assigns lap count %d to exact 25/50/25 counts", (lapCount) => {
    const schedule = computePhaseSchedule(lapCount);
    expect(schedule.counts).toEqual(expectedCounts[lapCount]);
  });

  it("assigns every lap to exactly one phase, contiguously from 1 to lapCount", () => {
    for (const lapCount of ENRICHMENT_LAP_COUNTS) {
      const schedule = computePhaseSchedule(lapCount);
      const total = schedule.counts.opening + schedule.counts.contest + schedule.counts.finalPush;
      expect(total).toBe(lapCount);
      expect(schedule.opening.start).toBe(1);
      expect(schedule.finalPush.end).toBe(lapCount);
      expect(racePhaseForLap(schedule, 1)).toBe("opening");
      expect(racePhaseForLap(schedule, lapCount)).toBe("final-push");

      const seen = new Set<string>();
      for (let lap = 1; lap <= lapCount; lap += 1) {
        seen.add(racePhaseForLap(schedule, lap));
      }
      expect(seen.has("opening")).toBe(true);
      expect(seen.has("contest")).toBe(true);
      expect(seen.has("final-push")).toBe(true);
    }
  });

  it("exact phase member checks for the longest supported race (16 = 4/8/4)", () => {
    const schedule = computePhaseSchedule(16);
    expect(racePhaseForLap(schedule, 1)).toBe("opening");
    expect(racePhaseForLap(schedule, 4)).toBe("opening");
    expect(racePhaseForLap(schedule, 5)).toBe("contest");
    expect(racePhaseForLap(schedule, 12)).toBe("contest");
    expect(racePhaseForLap(schedule, 13)).toBe("final-push");
    expect(racePhaseForLap(schedule, 16)).toBe("final-push");
  });

  it("handles a single-lap race deterministically (valid, non-crashing)", () => {
    const schedule = computePhaseSchedule(1);
    expect(schedule.lapCount).toBe(1);
    expect(schedule.counts.opening + schedule.counts.contest + schedule.counts.finalPush).toBe(1);
    expect(schedule.opening.start + schedule.opening.end + schedule.contest.start + schedule.contest.end + schedule.finalPush.start + schedule.finalPush.end).toBeGreaterThan(0);
    const closedPhases = ["opening", "contest", "final-push"];
    expect(closedPhases).toContain(racePhaseForLap(schedule, 1));
  });

  it("rejects non-positive or non-integer lap counts", () => {
    expect(() => computePhaseSchedule(0)).toThrow();
    expect(() => computePhaseSchedule(-3)).toThrow();
    expect(() => computePhaseSchedule(7.5)).toThrow();
  });
});

describe("Feature 033 (T009): named sub-seed stability and incident isolation", () => {
  it("derives a deterministic named sub-seed that is stable across calls", () => {
    const first = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    const second = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    expect(first).toBe(second);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
  });

  it("produces distinct sub-seeds for distinct stream names and distinct main seeds", () => {
    const incidents = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    const actionTies = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.actionTies);
    expect(incidents).not.toBe(actionTies);

    const other = deriveNamedSubSeed(1337, ENRICHMENT_SEED_STREAMS.incidents);
    expect(other).not.toBe(incidents);
  });

  it("toggle isolation: enabling/disabling incidents changes only the incidents stream", () => {
    const base = activeSeedStreams(true, false);
    const withIncidents = activeSeedStreams(true, true);
    expect(base).not.toContain(ENRICHMENT_SEED_STREAMS.incidents);
    expect(withIncidents).toContain(ENRICHMENT_SEED_STREAMS.incidents);

    const baseWithoutIncidents = withIncidents.filter((s) => s !== ENRICHMENT_SEED_STREAMS.incidents);
    expect(baseWithoutIncidents).toEqual(base);

    expect(base).toEqual([ENRICHMENT_SEED_STREAMS.opponentSetup, ENRICHMENT_SEED_STREAMS.actionTies]);
  });

  it("a disabled enrichment master switch activates no streams at all", () => {
    expect(activeSeedStreams(false, true)).toEqual([]);
    expect(activeSeedStreams(false, false)).toEqual([]);
  });
});

describe("Feature 033 (T016): finite/non-replenishing/atomic Composure ledger", () => {
  const ctx = (eventId = "lap-3:attack:001", boundaryId = "lap-3") => ({
    eventId,
    boundaryId,
    actionKind: "attack",
  });

  it("opens a finite budget with no spends yet", () => {
    const ledger = createComposureLedger("player", 6);
    expect(ledger.participantId).toBe("player");
    expect(ledger.initial).toBe(6);
    expect(ledger.remaining).toBe(6);
    expect(ledger.spends).toEqual([]);
    expect(canAffordComposure(ledger, 6)).toBe(true);
    expect(canAffordComposure(ledger, 7)).toBe(false);
  });

  it("debits atomically and immutably, never mutating the source ledger", () => {
    const source = createComposureLedger("rival-0", 6);
    const next = debitComposure(source, 2, ctx());

    expect(source.remaining).toBe(6);
    expect(source.spends).toEqual([]);

    expect(next.remaining).toBe(4);
    expect(next.spends).toHaveLength(1);
    expect(next.spends[0]).toMatchObject({
      eventId: "lap-3:attack:001",
      boundaryId: "lap-3",
      actionKind: "attack",
      amount: 2,
      before: 6,
      after: 4,
    });
  });

  it("never replenishes: consecutive debits strictly reduce the balance", () => {
    let ledger = createComposureLedger("player", 6);
    ledger = debitComposure(ledger, 2, ctx("a", "lap-2"));
    ledger = debitComposure(ledger, 2, ctx("b", "lap-4"));
    expect(ledger.remaining).toBe(2);
    expect(canAffordComposure(ledger, 2)).toBe(true);
    expect(canAffordComposure(ledger, 3)).toBe(false);
    ledger = debitComposure(ledger, 2, ctx("c", "lap-6"));
    expect(ledger.remaining).toBe(0);
  });

  it("rejects overspend without applying a partial debit (atomic)", () => {
    const ledger = createComposureLedger("rival-0", 4);
    expect(() => debitComposure(ledger, 5, ctx())).toThrow(ComposureOverspendError);
    expect(ledger.remaining).toBe(4);
    expect(ledger.spends).toEqual([]);
  });

  it("rejects negative initial budgets and non-positive debit amounts", () => {
    expect(() => createComposureLedger("player", -1)).toThrow(RangeError);
    expect(() => createComposureLedger("player", Number.NaN)).toThrow(RangeError);
    const ledger = createComposureLedger("player", 6);
    expect(() => debitComposure(ledger, 0, ctx())).toThrow(RangeError);
    expect(() => debitComposure(ledger, -2, ctx())).toThrow(RangeError);
  });
});

const rivalIdentity = (seed: number, index: number): DriverRaceIdentity =>
  generatedRivalIdentity(seed, index);

interface PackedCar {
  id: string;
  position: number;
  cumulativeTime: number;
  projectedLapTime: number;
  composure: number;
}

function packCar(car: PackedCar): BoundaryCarState {
  return {
    id: car.id,
    identity: rivalIdentity(7, 0),
    position: car.position,
    cumulativeTime: car.cumulativeTime,
    projectedLapTime: car.projectedLapTime,
    composure: createComposureLedger(car.id, car.composure),
  };
}

const BOUNDARY_CONFIG = DEFAULT_RACE_ENRICHMENT_CONFIG;

describe("Feature 033 (T017): proximity, pace-advantage, and pass resolution", () => {
  it("resolves an attack+defense window for a close, sufficiently faster attacker", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 10, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));

    const attacks = result.events.filter((event) => event.kind === "attack");
    const defenses = result.events.filter((event) => event.kind === "defense");
    expect(attacks).toHaveLength(1);
    expect(attacks[0].actorId).toBe("c2");
    expect(attacks[0].targetId).toBe("c1");
    expect(attacks[0].composure).toMatchObject({ before: 6, spent: 2, after: 4 });
    expect(defenses).toHaveLength(1);
    expect(defenses[0].actorId).toBe("c1");
    expect(defenses[0].composure?.after).toBe(4);

    const c2 = result.cars.find((car) => car.id === "c2")!;
    expect(c2.composure.remaining).toBe(4);
    const c1 = result.cars.find((car) => car.id === "c1")!;
    expect(c1.composure.remaining).toBe(4);
  });

  it("completes a pass when the defender cannot pay for a defense", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 0 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 10, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));

    const completed = result.events.find((event) => event.kind === "overtake-completed");
    const attempted = result.events.find((event) => event.kind === "overtake-attempt");
    expect(completed).toBeDefined();
    expect(attempted).toBeUndefined();
    expect(completed!.before).toMatchObject({ position: 2 });
    expect(completed!.after).toMatchObject({ position: 1 });
    expect(completed!.actorId).toBe("c2");

    const c2 = result.cars.find((car) => car.id === "c2")!;
    const c1 = result.cars.find((car) => car.id === "c1")!;
    expect(c2.position).toBe(1);
    expect(c1.position).toBe(2);
    expect(c1.composure.remaining).toBe(0);
    expect(c2.composure.remaining).toBe(4);
  });

  it("does not invent a pass for cars outside passing range", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 200, projectedLapTime: 10, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));
    expect(result.events).toEqual([]);
    expect(result.cars[1].composure.remaining).toBe(6);
  });

  it("does not attack without a sufficient projected pace advantage", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 10, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 20, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));
    expect(result.events).toEqual([]);
  });

  it("skips an unaffordable attack without a partial debit or attempt event", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 10, composure: 1 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));
    expect(result.events).toEqual([]);
    expect(result.cars[1].composure.remaining).toBe(1);
  });
});
describe("Feature 033 (T018): simultaneous-event priority, tie order, double-spend", () => {
  it("emits events sorted by stable kind priority (attack before defense before result)", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 11, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));
    expect(result.events.length).toBeGreaterThan(0);

    const priority = result.events.map((event) => stableEventKindPriority(event.kind));
    for (let index = 1; index < priority.length; index += 1) {
      expect(priority[index]).toBeGreaterThanOrEqual(priority[index - 1]);
    }
  });

  it("orders same-kind events by roster/sequence order", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 10, composure: 6 }),
      packCar({ id: "c3", position: 3, cumulativeTime: 110, projectedLapTime: 8, composure: 6 }),
    ];
    const result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(7, "action-ties"));
    const attackActors = result.events.filter((event) => event.kind === "attack").map((event) => event.actorId);
    expect(attackActors).toEqual(["c2", "c3"]);

    const a = { kind: "attack" as const, orderSeq: 2 };
    const b = { kind: "attack" as const, orderSeq: 1 };
    expect(compareEnrichmentEvents(a, b)).toBeGreaterThan(0);
    expect(compareEnrichmentEvents(b, a)).toBeLessThan(0);
  });

  it("prevents double spend: two actions over the same ledger cost exactly twice once each", () => {
    let ledger = createComposureLedger("player", 6);
    ledger = debitComposure(ledger, 2, { eventId: "e1", boundaryId: "lap-2", actionKind: "attack" });
    ledger = debitComposure(ledger, 2, { eventId: "e2", boundaryId: "lap-4", actionKind: "attack" });
    expect(ledger.spends).toHaveLength(2);
    expect(ledger.remaining).toBe(2);
    expect(ledger.spends[0].after).toBe(4);
    expect(ledger.spends[1].before).toBe(4);
    expect(ledger.spends[1].after).toBe(2);
  });

  it("records an attempt (never presented as completed) when a defended coin declines", () => {
    const cars = [
      packCar({ id: "c1", position: 1, cumulativeTime: 90, projectedLapTime: 13, composure: 6 }),
      packCar({ id: "c2", position: 2, cumulativeTime: 100, projectedLapTime: 10, composure: 6 }),
    ];
    let seed = 0;
    let result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(seed, "action-ties"));
    while (result.events.some((event) => event.kind === "overtake-completed") && seed < 500) {
      seed += 1;
      result = evaluateBoundary("lap-3", "contest", cars, BOUNDARY_CONFIG, deriveNamedSubSeed(seed, "action-ties"));
    }
    const attempt = result.events.find((event) => event.kind === "overtake-attempt");
    const completed = result.events.find((event) => event.kind === "overtake-completed");
    expect(seed).toBeLessThan(500);
    expect(completed).toBeUndefined();
    expect(attempt).toBeDefined();
    expect(attempt!.before).toMatchObject({ position: 2 });
    expect(attempt!.after).toBeUndefined();
    const c2 = result.cars.find((car) => car.id === "c2")!;
    const c1 = result.cars.find((car) => car.id === "c1")!;
    expect(c2.position).toBe(2);
    expect(c1.position).toBe(1);
  });
});

