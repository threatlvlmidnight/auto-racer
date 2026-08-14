import { LEGACY_ITEM_POOL } from "./legacy-item-pool";
import type {
  PartsSupplierPayload,
  RewardDraftPayload,
} from "../../src/simulation/encounters";
import { REPUTATION_START, runIdentityForEntrant, type Run, type RunStage } from "../../src/simulation/run";
import { directRecurringPracticeBuild } from "./practice-fixtures";
import { lockRaceSetup, raceSetupInput } from "../../src/simulation/raceSetup";
import type { PracticeSetupSnapshot } from "../../src/simulation/practice";
import type { LockedRaceSetup, SetupSelections } from "../../src/simulation/types";

export type PracticeFixtureContext =
  | "run-hub"
  | "supplier"
  | "reward-draft"
  | "pvp-briefing";

export interface PracticeRunFixture {
  context: PracticeFixtureContext;
  run: Run;
  selection: string | null;
  navigation: {
    viewToken: string;
    focusToken: string;
    scrollToken: string;
  };
}

function stages(activePosition = 1): RunStage[] {
  return [
    { kind: "choice", choiceOrdinal: 1 },
    { kind: "choice", choiceOrdinal: 2 },
    { kind: "pvp", pvpOrdinal: 1, lapCount: 10 },
    { kind: "choice", choiceOrdinal: 3 },
    { kind: "choice", choiceOrdinal: 4 },
    { kind: "pvp", pvpOrdinal: 2, lapCount: 12 },
    { kind: "choice", choiceOrdinal: 5 },
    { kind: "choice", choiceOrdinal: 6 },
    { kind: "pvp", pvpOrdinal: 3, lapCount: 14 },
    { kind: "choice", choiceOrdinal: 7 },
    { kind: "choice", choiceOrdinal: 8 },
    { kind: "pvp", pvpOrdinal: 4, lapCount: 16 },
  ].map((definition, index) => ({
    ...definition,
    id: `practice-run-stage-${index + 1}`,
    position: index + 1,
    state: index + 1 === activePosition ? "active" : index + 1 < activePosition ? "completed" : "unavailable",
  })) as RunStage[];
}

function baseRun(): Run {
  return {
    id: "practice-run",
    seed: 7011,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    status: "active",
    stageIndex: 0,
    stages: stages(),
    availableChoices: [
      {
        id: "practice-run-stage-1-choice-1",
        stageId: "practice-run-stage-1",
        type: "parts-supplier",
        summary: "Fixture Supplier",
      },
      {
        id: "practice-run-stage-1-choice-2",
        stageId: "practice-run-stage-1",
        type: "reward-draft",
        summary: "Fixture Reward Draft",
      },
    ],
    activeEncounter: null,
    build: directRecurringPracticeBuild(),
    credits: 11,
    creditTransactions: [{
      id: "fixture-transaction",
      encounterId: "prior-encounter",
      kind: "participation",
      amount: 2,
      balanceAfter: 11,
    }],
    activeSponsorContract: {
      id: "fixture-sponsor",
      sourceEncounterId: "prior-sponsor",
      objective: { kind: "win-next-race" },
      payout: 7,
      status: "pending",
    },
    history: [{
      encounterId: "prior-encounter",
      stagePosition: 0,
      type: "pvp",
      creditTransactionIds: ["fixture-transaction"],
      pvpOutcome: {
        outcome: "win",
        lapCount: 10,
        playerTime: 50,
        ghostTime: 58.5,
        gap: -8.5,
      },
    }],
    reputation: REPUTATION_START,
  };
}

function navigation(context: PracticeFixtureContext) {
  return {
    viewToken: `${context}-view`,
    focusToken: `${context}-test-day`,
    scrollToken: `${context}-scroll-17`,
  };
}

export function runHubPracticeFixture(): PracticeRunFixture {
  return { context: "run-hub", run: baseRun(), selection: null, navigation: navigation("run-hub") };
}

export function supplierPracticeFixture(selected = true): PracticeRunFixture {
  const run = baseRun();
  const encounterId = "practice-supplier-encounter";
  const payload: PartsSupplierPayload = {
    kind: "parts-supplier",
    stock: LEGACY_ITEM_POOL.slice(0, 3).map((stockItem, index) => ({
      id: `${encounterId}-stock-${index + 1}`,
      item: structuredClone(stockItem),
      state: index === 0 ? "purchased" : "available",
      locked: false,
    })),
    unavailable: false,
    restockUsed: true,
    purchases: [LEGACY_ITEM_POOL[0].id],
  };
  run.activeEncounter = {
    id: encounterId,
    stageId: run.stages[0].id,
    type: "parts-supplier",
    status: "active",
    payload,
  };
  return {
    context: "supplier",
    run,
    selection: selected ? payload.stock[1].id : null,
    navigation: navigation("supplier"),
  };
}

export function rewardDraftPracticeFixture(selected = true): PracticeRunFixture {
  const run = baseRun();
  const encounterId = "practice-reward-encounter";
  const payload: RewardDraftPayload = {
    kind: "reward-draft",
    offers: LEGACY_ITEM_POOL.slice(3, 6).map((offeredItem, index) => ({
      id: `${encounterId}-offer-${index + 1}`,
      item: structuredClone(offeredItem),
    })),
    selection: selected ? `${encounterId}-offer-2` : null,
  };
  run.activeEncounter = {
    id: encounterId,
    stageId: run.stages[0].id,
    type: "reward-draft",
    status: "active",
    payload,
  };
  return {
    context: "reward-draft",
    run,
    selection: payload.selection,
    navigation: navigation("reward-draft"),
  };
}

export function pvpBriefingPracticeFixture(): PracticeRunFixture {
  const run = baseRun();
  run.stageIndex = 2;
  run.stages = stages(3);
  run.availableChoices = [];
  run.activeEncounter = {
    id: "practice-pvp-encounter",
    stageId: run.stages[2].id,
    type: "pvp",
    status: "active",
    payload: {
      kind: "pvp",
      lapCount: 10,
      buildSnapshot: structuredClone(run.build),
    },
  };
  return {
    context: "pvp-briefing",
    run,
    selection: "start-race-control",
    navigation: navigation("pvp-briefing"),
  };
}

export interface PreRaceSetupPracticeFixture extends PracticeRunFixture {
  setupSnapshot: PracticeSetupSnapshot;
}

/**
 * 028-pre-race-setup: a run at its active PvP encounter, plus a real
 * temporary locked-setup snapshot exactly as PreRaceScene's openTestDay()
 * would build one — for T066-T068's setup-origin Test Day coverage.
 */
export function preRaceSetupPracticeFixture(
  selections: SetupSelections = { "driver-aggression": "low" },
  rememberChecked = false,
): PreRaceSetupPracticeFixture {
  const base = pvpBriefingPracticeFixture();
  const input = raceSetupInput(base.run, base.run.activeEncounter!.id);
  const setup = lockRaceSetup(input, selections) as LockedRaceSetup;
  const setupSnapshot: PracticeSetupSnapshot = {
    origin: "pre-race-setup",
    track: input.track,
    setup,
    draftSelections: selections,
    rememberChecked,
    focusFamily: "driver-aggression",
  };
  return {
    context: "pvp-briefing",
    run: base.run,
    selection: "start-race-control",
    navigation: navigation("pvp-briefing"),
    setupSnapshot,
  };
}

export const allPracticeRunFixtures = [
  runHubPracticeFixture,
  supplierPracticeFixture,
  rewardDraftPracticeFixture,
  pvpBriefingPracticeFixture,
] as const;