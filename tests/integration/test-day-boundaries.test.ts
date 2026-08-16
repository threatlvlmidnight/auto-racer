import { describe, expect, it, vi } from "vitest";
import * as contestAuthority from "../../src/simulation/contest";
import * as playbackAuthority from "../../src/simulation/playback";
import * as practiceAuthority from "../../src/simulation/practice";
import {
  captureProtectedRunState,
  createPracticeReturnContext,
  createPracticeSession,
  protectedRunStateEquals,
  resolvePractice,
} from "../../src/simulation/practice";
import { pendingEligible } from "../../src/simulation/scrutineering";
import { preRaceSetupPracticeFixture, runHubPracticeFixture } from "../fixtures/practice-run-fixtures";

describe("Test Day authority boundaries", () => {
  it("produces exact direct contest and playback facts without scored settlement", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const completed = resolvePractice(createPracticeSession(fixture.run, context));
    const direct = contestAuthority.resolveContest(
      completed.snapshot.build,
      completed.config.rival,
      completed.config.lapCount,
    );

    expect(completed.result!.contest).toStrictEqual(direct);
    expect(completed.result!.playback).toStrictEqual(playbackAuthority.buildPlaybackSchedule(direct));
    expect(completed.result).not.toHaveProperty("creditTransactions");
    expect(completed.result).not.toHaveProperty("history");
  });

  it("exposes no scored settlement or progression authority", () => {
    const forbidden = [
      "completePvpEncounter",
      "continueRunFromResult",
      "resolvePendingSponsor",
      "completeNonPvpEncounter",
      "advanceRun",
    ];
    forbidden.forEach((name) => expect(practiceAuthority).not.toHaveProperty(name));
  });

  it("does not consume Math.random while resolving practice", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("practice attempted RNG");
    });
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    expect(() => resolvePractice(createPracticeSession(fixture.run, context))).not.toThrow();
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });
});

// 028-pre-race-setup T068: setup-origin Test Day protected-state boundaries
// (FR-012D — no encounter/history/credits/reputation/sponsor/remembered
// setup/ghost record/scored setup commit).
describe("setup-origin Test Day protected-state boundaries (T068)", () => {
  function resolveSetupOrigin(fixture: ReturnType<typeof preRaceSetupPracticeFixture>) {
    const context = createPracticeReturnContext(fixture.run, {
      context: "pre-race-setup",
      selection: fixture.selection,
      navigation: fixture.navigation,
      setupSnapshot: fixture.setupSnapshot,
    });
    return resolvePractice(createPracticeSession(fixture.run, context));
  }

  it("leaves every protected run field — encounter, history, credits, reputation, sponsor — byte-identical", () => {
    const fixture = preRaceSetupPracticeFixture({ "driver-aggression": "high" });
    const before = captureProtectedRunState(fixture.run);

    resolveSetupOrigin(fixture);

    expect(protectedRunStateEquals(before, fixture.run)).toBe(true);
  });

  it("never writes run.setupMemory (no remembered-setup commit), even with rememberChecked true in the snapshot", () => {
    const fixture = preRaceSetupPracticeFixture({ "driver-aggression": "high" }, true);
    resolveSetupOrigin(fixture);

    expect(fixture.run.setupMemory).toBeUndefined();
  });

  it("produces no ghost/recorded evidence — the practice result carries no run, encounterId, or CarResult.setup shape", () => {
    const fixture = preRaceSetupPracticeFixture();
    const completed = resolveSetupOrigin(fixture);

    expect(completed.result).not.toHaveProperty("run");
    expect(completed.result).not.toHaveProperty("encounterId");
    expect(completed.result!.contest).not.toHaveProperty("cars");
  });

  it("never advances or completes the PvP encounter the snapshot was taken from", () => {
    const fixture = preRaceSetupPracticeFixture();
    const encounterIdBefore = fixture.run.activeEncounter!.id;
    const statusBefore = fixture.run.status;

    resolveSetupOrigin(fixture);

    expect(fixture.run.activeEncounter!.id).toBe(encounterIdBefore);
    expect(fixture.run.activeEncounter!.status).toBe("active");
    expect(fixture.run.status).toBe(statusBefore);
  });
});

// 034 T073: Test Day remains unscored and does not consume Sponsor/Scrutineering
// state (FR-049 — pending effects await the *next scored race*, never Test Day).
describe("Feature 034 Test Day pending-effect boundary (T073)", () => {
  it("resolves Test Day without writing or consuming pending-effect state", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const completed = resolvePractice(createPracticeSession(fixture.run, context));

    // The unscored practice result never touches the pending-effect layer.
    expect(completed.result).not.toHaveProperty("pendingEffects");
    expect(completed.result).not.toHaveProperty("scrutineering");
    expect(completed.result).not.toHaveProperty("sponsor");

    // One Sponsor and one Scrutineering effect may therefore still coexist in
    // the underlying run without being consumed by Test Day.
    expect(pendingEligible(["sponsor"], "scrutineering")).toBe(true);
    expect(pendingEligible(["sponsor"], "sponsor")).toBe(false);
    expect(pendingEligible([], "sponsor")).toBe(true);
  });
});