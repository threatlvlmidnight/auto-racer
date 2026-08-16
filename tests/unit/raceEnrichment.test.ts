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
  passivePaceFraction,
  projectIncidentRisk,
  racePhaseForLap,
  resolveEnrichment,
  resolveIncidentDecision,
  stableEventKindPriority,
  type BoundaryCarState,
} from "../../src/simulation/raceEnrichment";
import { DRIVER_RACE_IDENTITIES, generatedRivalIdentity } from "../../src/content/driverRaceIdentities";
import type { DriverRaceIdentity, StatTarget } from "../../src/simulation/types";
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

describe("Feature 033 (T026): single authoritative enrichment pass", () => {
  // Cover every physical stat so either generated rival identity is eligible.
  const eligibleStats = {
    acceleration: 400,
    topSpeed: 400,
    brakingPower: 400,
    corneringSpeed: 400,
  };
  const base = Array.from({ length: 12 }, (_, i) => ({ time: 20 + i }));

  function run(seed: number, resolvedStats: Partial<Record<StatTarget, number>>) {
    const idA = generatedRivalIdentity(3, 0);
    const idB = generatedRivalIdentity(3, 1);
    return resolveEnrichment({
      config: DEFAULT_RACE_ENRICHMENT_CONFIG,
      lapCount: 12,
      seed,
      rosterOrder: ["a", "b"],
      cars: [
        { id: "a", identity: idA, baseLapTimes: base.map((l) => l.time), resolvedStats, contributingSources: [] },
        { id: "b", identity: idB, baseLapTimes: base.map((l) => l.time), resolvedStats, contributingSources: [] },
      ],
    });
  }

  it("assigns every lap to a phase and emits one phase-transition per phase", () => {
    const output = run(1, {});
    expect(output.phaseSchedule.counts).toMatchObject({ opening: 3, contest: 6, finalPush: 3 });
    const transitions = output.events.filter((event) => event.kind === "phase-transition");
    expect(transitions).toHaveLength(3);
    for (const car of output.cars) expect(car.enrichedLaps).toHaveLength(12);
  });

  it("acts deterministically and retains a composure ledger per car", () => {
    const first = run(42, {});
    const second = run(42, {});
    expect(second.events).toEqual(first.events);
    expect(second.cars).toEqual(first.cars);
    expect(first.cars.every((car) => car.composureLedger.spends.length >= 0)).toBe(true);
  });

  it("marks builds below threshold ineligible and does not charge them for a signature", () => {
    const output = run(7, {});
    expect(output.eligibility.every((entry) => entry.eligible === false)).toBe(true);
    const player = output.cars[0];
    expect(player.composureLedger.remaining).toBe(DEFAULT_RACE_ENRICHMENT_CONFIG.initialComposure);
  });

  it("activates eligible contextual signatures and folds a bounded window into enriched laps", () => {
    const output = run(7, eligibleStats);
    const activations = output.events.filter((event) => event.kind === "signature-activation");
    expect(activations.length).toBeGreaterThan(0);
    const actor = activations[0].actorId;
    const car = output.cars.find((entry) => entry.id === actor)!;
    const startLap = activations[0].temporaryEffect?.startLap ?? 1;
    const enrichedLap = car.enrichedLaps[startLap - 1];
    // Active window improves target pace, so enriched < authored for that lap.
    expect(enrichedLap.enrichedTime).toBeLessThan(enrichedLap.baseTime);
  });
});


describe("Feature 033 (T030/T031): signature eligibility edges and origin agnosticism", () => {
  // Mercer's signature targets corneringSpeed at threshold 40 (config).
  const mercer = DRIVER_RACE_IDENTITIES.find((identity) => identity.id === "evelyn-mercer")!;
  const base = Array.from({ length: 8 }, (_, i) => ({ time: 20 + i }));
  const stats = (corneringSpeed: number) => ({ corneringSpeed });

  function elig(corneringSpeed: number) {
    return resolveEnrichment({
      config: DEFAULT_RACE_ENRICHMENT_CONFIG,
      lapCount: 8,
      seed: 1,
      rosterOrder: ["a"],
      cars: [{ id: "a", identity: mercer, baseLapTimes: base.map((l) => l.time), resolvedStats: stats(corneringSpeed), contributingSources: ["source-x"] }],
    }).eligibility[0];
  }

  it("treats exact threshold equality as eligible", () => {
    expect(elig(40).eligible).toBe(true);
    expect(elig(40).threshold).toBe(40);
    expect(elig(40).committedValue).toBe(40);
  });
  it("marks a value just below threshold ineligible (display rounding cannot qualify)", () => {
    expect(elig(39.9999999).eligible).toBe(false);
  });
  it("marks non-finite committed values ineligible", () => {
    expect(elig(Number.NaN).eligible).toBe(false);
  });
  it("below-threshold is ineligible and records the source", () => {
    const entry = elig(10);
    expect(entry.eligible).toBe(false);
    expect(entry.contributingSources).toContain("source-x");
  });

  it("origin does not participate: eligibility depends only on the resolved own-stat vs threshold", () => {
    // Mercer gates cornering (threshold 40); Soto gates acceleration (40).
    const mercer = DRIVER_RACE_IDENTITIES[0];
    const soto = DRIVER_RACE_IDENTITIES[1];
    const make = (identity: typeof mercer, resolvedStats: Record<string, number>) =>
      resolveEnrichment({
        config: DEFAULT_RACE_ENRICHMENT_CONFIG, lapCount: 8, seed: 2, rosterOrder: ["a"],
        cars: [{ id: "a", identity, baseLapTimes: base.map((l) => l.time), resolvedStats, contributingSources: [] }],
      }).eligibility[0];
    // Equal own-stat at their own threshold => equal eligibility (true) regardless of identity/origin.
    expect(make(mercer, { corneringSpeed: 40 }).eligible).toBe(true);
    expect(make(soto, { acceleration: 40 }).eligible).toBe(true);
    // Below their own threshold => both ineligible.
    expect(make(mercer, { corneringSpeed: 39 }).eligible).toBe(false);
    expect(make(soto, { acceleration: 39 }).eligible).toBe(false);
  });
});

describe("Feature 033 (T032): passives, activation, and budget", () => {
  it("applies an always-active passive even to an ineligible car (bounded per-lap pace)", () => {
    const noIncidents = { ...DEFAULT_RACE_ENRICHMENT_CONFIG, incidentsEnabled: false };
    const output = resolveEnrichment({
      config: noIncidents,
      lapCount: 8,
      seed: 3,
      rosterOrder: ["a"],
      cars: [{ id: "a", identity: DRIVER_RACE_IDENTITIES[0], baseLapTimes: Array.from({ length: 8 }, (_, i) => ({ time: 20 + i })).map((l) => l.time), resolvedStats: {}, contributingSources: [] }],
    });
    const car = output.cars[0];
    expect(car.enrichedLaps.length).toBe(8);
    expect(car.enrichedLaps.every((lap) => lap.enrichedTime < lap.baseTime)).toBe(true);
    // Ineligible: never charged a signature.
    expect(car.composureLedger.remaining).toBe(DEFAULT_RACE_ENRICHMENT_CONFIG.initialComposure);
  });

  it("never activates in a context phase the driver does not reach, and spends nothing", () => {
    const output = resolveEnrichment({
      config: DEFAULT_RACE_ENRICHMENT_CONFIG,
      lapCount: 8,
      seed: 4,
      rosterOrder: ["a"],
      cars: [{ id: "a", identity: DRIVER_RACE_IDENTITIES[0], baseLapTimes: Array.from({ length: 8 }, (_, i) => ({ time: 20 + i })).map((l) => l.time), resolvedStats: { corneringSpeed: 60 }, contributingSources: [], }],
    });
    const openingActivations = output.events.filter((e) => e.kind === "signature-activation" && e.phase === "opening");
    expect(openingActivations).toHaveLength(0);
  });

  it("an eligible activated signature spends Composure and emits retained evidence", () => {
    const output = resolveEnrichment({
      config: DEFAULT_RACE_ENRICHMENT_CONFIG,
      lapCount: 8,
      seed: 5,
      rosterOrder: ["a"],
      cars: [{ id: "a", identity: DRIVER_RACE_IDENTITIES[0], baseLapTimes: Array.from({ length: 8 }, (_, i) => ({ time: 20 + i })).map((l) => l.time), resolvedStats: { corneringSpeed: 60 }, contributingSources: [], }],
    });
    const activation = output.events.find((e) => e.kind === "signature-activation");
    expect(activation).toBeDefined();
    expect(activation!.composure).toMatchObject({ spent: 3 });
    const car = output.cars[0];
    expect(car.composureLedger.remaining).toBe(DEFAULT_RACE_ENRICHMENT_CONFIG.initialComposure - 3);
  });

  it("bounding: passive pace fraction is clamped so it never dominates a lap", () => {
    expect(passivePaceFraction(3)).toBeCloseTo(0.012, 9);
    expect(passivePaceFraction(99999)).toBeLessThanOrEqual(0.06);
    expect(passivePaceFraction(-5)).toBe(0);
  });
});

describe("Feature 033 (T042): incident-risk projection", () => {
  it("labels low-demand/high-stat setups low with no fabricated sources", () => {
    const risk = projectIncidentRisk({ brakingPower: 80, corneringSpeed: 80 }, 0.1, DEFAULT_RACE_ENRICHMENT_CONFIG);
    expect(risk.band).toBe("low");
    expect(risk.revealsOutcome).toBe(false);
    expect(risk.sources.length).toBeGreaterThan(0);
  });
  it("elevates risk when braking demand and stat deficits are high", () => {
    const risk = projectIncidentRisk({ brakingPower: 5, corneringSpeed: 5 }, 1, DEFAULT_RACE_ENRICHMENT_CONFIG);
    expect(risk.band).toBe("elevated");
    expect(risk.saferSetupAlternatives.length).toBeGreaterThan(0);
    expect(risk.sources.some((source) => source.label.toLowerCase().includes("braking"))).toBe(true);
  });
  it("never reveals whether an incident occurred", () => {
    expect(projectIncidentRisk({}, 1, DEFAULT_RACE_ENRICHMENT_CONFIG).revealsOutcome).toBe(false);
  });
});

describe("Feature 033 (T043/T044): isolated bounded incidents behind the toggle", () => {
  it("produces incident decisions bounded by the configured loss cap", () => {
    const max = DEFAULT_RACE_ENRICHMENT_CONFIG.incidentRiskCaps.maxTimeLossSeconds;
    let sawIncident = false;
    for (let seed = 0; seed < 3000; seed += 1) {
      const roll = resolveIncidentDecision(seed, "player", 1, max);
      if (roll.incident) {
        sawIncident = true;
        expect(roll.timeLossSeconds).toBeLessThanOrEqual(max);
        expect(roll.timeLossSeconds).toBeGreaterThanOrEqual(0);
      }
      expect(Number.isFinite(roll.timeLossSeconds)).toBe(true);
    }
    expect(sawIncident).toBe(true);
  });

  it("determinism: identical incident inputs resolve identically", () => {
    const a = resolveIncidentDecision(42, "rival-0", 3, 3);
    const b = resolveIncidentDecision(42, "rival-0", 3, 3);
    expect(b).toEqual(a);
  });

  it("disabled toggle emits no incident events and deep-equals across seeds", () => {
    const offConfig = { ...DEFAULT_RACE_ENRICHMENT_CONFIG, incidentsEnabled: false };
    const run = (seed: number) => resolveEnrichment({
      config: offConfig, lapCount: 8, seed, rosterOrder: ["a"],
      cars: [{ id: "a", identity: DRIVER_RACE_IDENTITIES[0], baseLapTimes: Array.from({ length: 8 }, (_, i) => ({ time: 20 + i })).map((l) => l.time), resolvedStats: { corneringSpeed: 60 }, contributingSources: [] }],
    });
    const first = run(7).events;
    expect(first.some((event) => event.kind === "incident")).toBe(false);
    expect(run(7).events).toEqual(first);
  });
});
