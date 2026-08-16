import { describe, expect, it } from "vitest";
import {
  completeNonPvpEncounter,
  createRun,
  runIdentityForEntrant,
  summarizeRunHistory,
} from "../../src/simulation/run";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  contestSceneInput,
  continueRunFromResult,
  historyCircuitFacts,
  toLegacyContestResult,
} from "../../src/scenes/runPresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import {
  AUDIT_CASES,
  cardFeedbackState,
} from "../../src/scenes/cardFeedbackPresentation";
import {
  effectiveFocusState,
  focusState,
} from "../../src/scenes/focusPresentation";
import {
  circuitIdentityTokens,
  circuitPresentationIdentity,
} from "../../src/scenes/circuitPresentation";
import { adjustablePresentation } from "../../src/scenes/adjustablePresentation";
import { deriveEligibleSetupControls } from "../../src/simulation/raceSetup";
import type { ItemDefinition } from "../../src/simulation/types";
import {
  britishIslesStage,
  identityTrack,
  mixedRarityCards,
} from "../fixtures/interface-clarity-fixtures";

function scoredRun() {
  return createRun({
    runId: "clarity-circuit-run",
    seed: 7,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: () => 0,
  });
}

describe("Feature 035 scored-circuit history retention (T021)", () => {
  it("bridges the resolved track into the legacy result for settlement", () => {
    let run = scoredRun();
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    const input = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const legacy = toLegacyContestResult(result);
    expect(legacy.circuit).toEqual({ trackId: result.track.id, trackName: result.track.name });
  });

  it("retains display-only circuit evidence at settlement and projects its identity", () => {
    let run = scoredRun();
    for (let i = 0; i < 2; i += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const input = contestSceneInput(run, run.activeEncounter!.id);
    // Give the upcoming scored PvP stage its world-tour region evidence.
    run = {
      ...run,
      stages: run.stages.map((stage, index) => (index === run.stageIndex ? { ...stage, regionId: "british-isles" } : stage)),
    };
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);

    const entry = [...continued.history].sort((a, b) => b.stagePosition - a.stagePosition)[0];
    expect(entry.pvpOutcome?.circuit).toEqual({
      trackId: result.track.id,
      trackName: result.track.name,
      regionId: "british-isles",
    });

    const summary = summarizeRunHistory(continued);
    const facts = historyCircuitFacts(summary[summary.length - 1]);
    expect(facts).not.toBeNull();
    expect(facts?.mode).toBe("scored");
    expect(facts?.trackName).toBe(result.track.name);
    expect(facts?.locationLabel).toBe("British Isles");
  });

  it("returns null circuit facts for history without circuit evidence", () => {
    expect(historyCircuitFacts({ encounterId: "e", stagePosition: 1, type: "pvp", transactions: [] })).toBeNull();
  });
});

describe("Feature 035 input + accessibility parity (T034)", () => {
  it("covers every primary scene at key, pointer, and touch input modes", () => {
    const modes = new Set(AUDIT_CASES.map((entry) => entry.inputMode));
    for (const inputMode of ["pointer", "keyboard", "touch"] as const) expect(modes.has(inputMode)).toBe(true);
    // Every named primary host appears in the finite audit matrix.
    for (const scene of ["PreRaceScene", "PrepareScene", "InventoryScene", "DestinationScene", "ContestScene", "ResultScene", "TestDayScene", "RunScene"]) {
      expect(AUDIT_CASES.some((entry) => entry.scene === scene)).toBe(true);
    }
  });

  it("resolves structural, non-color focus states (disabled wins, focus visible)", () => {
    expect(focusState("focused").structuralToken).toBe("ring");
    expect(effectiveFocusState(["focused", "selected"]).structuralToken).toBe("ring");
    expect(effectiveFocusState(["selected", "disabled"]).structuralToken).toBe("strike");
    expect(effectiveFocusState(["pressed"]).structuralToken).toBe("invert");
    expect(focusState("focused").accessibleLabel).toContain("Focused");
  });

  it("exposes identity and control facts without hover (text/icon/accessibility only)", () => {
    const tokens = circuitIdentityTokens(circuitPresentationIdentity(identityTrack, britishIslesStage));
    expect(tokens.some((token) => token.startsWith("LOCATION:"))).toBe(true);

    // No hover required: a non-configurable installed item is explained fully by text.
    const plain: ItemDefinition = {
      id: "no-control", name: "No Control", rarity: "standard", price: 1, timeModifier: 0,
      origin: "coachworks", installationCategory: "power", synergyTags: [],
      fittedBehavior: { kind: "none", description: "" }, improvisedBehavior: { kind: "none", description: "" },
    };
    const unavailable = adjustablePresentation({
      item: plain,
      heldLocation: { area: "vehicle", slotId: "s1" },
      eligibleControls: deriveEligibleSetupControls(vehicleBuild([])),
    });
    expect(unavailable.explanation.length).toBeGreaterThan(0);
    expect(unavailable.badgeLabel).toBeNull();
  });

  it("preserves all card meaning under reduced motion across offer/hold roles", () => {
    const rare = mixedRarityCards()[2];
    for (const role of ["offer", "held", "inventory", "result"] as const) {
      const motion = cardFeedbackState({ item: rare, role, upgradeEligible: true, selected: true });
      const reduced = cardFeedbackState({ item: rare, role, upgradeEligible: true, selected: true, reducedMotion: true });
      expect(reduced.rarityLabel).toBe(motion.rarityLabel);
      expect(reduced.upgradeEligible).toBe(true);
      expect(reduced.selected).toBe(true);
      expect(reduced.framePriority).toEqual(motion.framePriority);
    }
  });
});
