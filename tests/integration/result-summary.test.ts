import { describe, expect, it } from "vitest";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import { completeNonPvpEncounter, createRun, runIdentityForEntrant } from "../../src/simulation/run";
import { raceSettlementPolicy } from "../../src/simulation/settlement";
import { contestSceneInput, continueRunFromResult } from "../../src/scenes/runPresentation";
import { outcomeLabel, positionLabel } from "../../src/scenes/resultFormatting";
import { SIX_CORNER_TRACK } from "../fixtures/race-legibility-fixtures";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import type { CarResult, NCarContestResult } from "../../src/simulation/types";

/**
 * Feature 032 T005: pinned baselines for result-summary feedback gaps.
 * Cases marked BASELINE-GAP document current behavior that US4 (T073/T081/
 * T082) is tasked to change; they are replaced in place when the fix lands.
 */

function car(overrides: Partial<CarResult>): CarResult {
  return {
    id: "player",
    role: "player",
    name: "Player",
    color: "#ffd447",
    time: 57,
    laps: [],
    position: 1,
    gapToLeader: 0,
    ...overrides,
  };
}

/** An 8-car scored field with the player at `position` (1-8). */
function eightCarField(position: number): NCarContestResult {
  const cars: CarResult[] = Array.from({ length: 8 }, (_, index) => {
    const pos = index + 1;
    const isPlayer = pos === position;
    return car({
      id: isPlayer ? "player" : `rival-${pos}`,
      role: isPlayer ? "player" : "rival",
      name: isPlayer ? "Player" : `Rival ${pos}`,
      time: 50 + pos,
      position: pos,
      gapToLeader: pos === 1 ? 0 : pos - 1,
    });
  }).sort((a, b) => a.position - b.position);
  const player = cars.find((entry) => entry.role === "player")!;
  // Baseline resolver rule: win iff position === 1 (contest.ts) — positions
  // 2-8 are "loss". T082's position-aware wording builds on this evidence.
  const outcome = player.position === 1 ? "win" : "loss";
  return {
    lapCount: 10,
    cars,
    outcome,
    board: [],
    storage: [],
    track: SIX_CORNER_TRACK,
    tieBreakOrder: cars.map((entry) => entry.id),
  };
}

describe("position language baselines", () => {
  it("labels placement ordinals for the full eight-car field (permanent pin)", () => {
    expect(positionLabel(eightCarField(1))).toBe("1st of 8");
    expect(positionLabel(eightCarField(2))).toBe("2nd of 8");
    expect(positionLabel(eightCarField(3))).toBe("3rd of 8");
    expect(positionLabel(eightCarField(8))).toBe("8th of 8");
  });

  it("presents all podium finishes as wins", () => {
    expect(outcomeLabel(eightCarField(3))).toBe("You Win!");
    expect(outcomeLabel(eightCarField(1))).toBe("You Win!");
  });
});

describe("Local third-place reputation baseline", () => {
  it("awards +1 reputation for Local third place", () => {
    // Clarified policy (spec.md Clarifications): third grants +1 reputation
    // in every scored race, including Local.
    expect(raceSettlementPolicy("local", 3).reputationDelta).toBe(1);
  });

  it("pins the surrounding settlement table that must NOT change (permanent pin)", () => {
    // Championship third already awards +1 reputation.
    expect(raceSettlementPolicy("championship", 3).reputationDelta).toBe(1);
    // Third-place purse/points stay exactly as authored for both kinds.
    const localThird = raceSettlementPolicy("local", 3);
    expect(localThird.participationCredits).toBe(1);
    expect(localThird.winBonusCredits).toBe(0);
    expect(localThird.championshipPoints).toBe(0);
    const championshipThird = raceSettlementPolicy("championship", 3);
    expect(championshipThird.participationCredits).toBe(2);
    expect(championshipThird.winBonusCredits).toBe(0);
    expect(championshipThird.championshipPoints).toBe(6);
    // Win bonus remains first-place-only.
    expect(raceSettlementPolicy("local", 1).winBonusCredits).toBe(1);
    expect(raceSettlementPolicy("championship", 1).winBonusCredits).toBe(2);
  });
});

describe("final summary record baseline", () => {
  it("keeps wins plus losses equal to counted scored history", () => {
    const entries = [{ position: 1 }, { position: 3 }, { position: 4 }, { position: 8 }];
    expect(entries.filter((entry) => entry.position <= 3).length + entries.filter((entry) => entry.position > 3).length).toBe(entries.length);
  });
  function runToFirstScoredRace() {
    let run = createRun({
      runId: "result-summary-run",
      seed: 17,
      identityTag: "performance",
      identity: runIdentityForEntrant("evelyn-mercer")!,
      build: vehicleBuild(),
      rng: () => 0,
    });
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const input = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    return { run, input, result };
  }

  it("records each scored race exactly once in retained history (permanent pin)", () => {
    const { run, input, result } = runToFirstScoredRace();
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);

    const pvpEntries = continued.history.filter((entry) => entry.type === "pvp");
    expect(pvpEntries).toHaveLength(1);
    expect(pvpEntries[0].pvpOutcome?.outcome).toBe(result.outcome);
  });

  it("BASELINE-GAP: retained history carries no placement or race-kind evidence", () => {
    // The clarified record policy (spec.md US4) derives wins/losses from
    // retained 1-8 placement per Local/Championship/Elite race. Today the
    // history entry only keeps the coarse win/tie/loss outcome — T081 adds
    // the retained placement/kind evidence this projection requires.
    const { run, input, result } = runToFirstScoredRace();
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);
    const entry = continued.history.find((candidate) => candidate.type === "pvp")!;

    expect(entry.pvpOutcome).not.toHaveProperty("position");
    expect(entry).not.toHaveProperty("raceKind");
  });
});
