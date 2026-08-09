import { describe, expect, it, vi } from "vitest";
import * as contestAuthority from "../../src/simulation/contest";
import * as playbackAuthority from "../../src/simulation/playback";
import * as practiceAuthority from "../../src/simulation/practice";
import {
  createPracticeReturnContext,
  createPracticeSession,
  resolvePractice,
} from "../../src/simulation/practice";
import { runHubPracticeFixture } from "../fixtures/practice-run-fixtures";

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