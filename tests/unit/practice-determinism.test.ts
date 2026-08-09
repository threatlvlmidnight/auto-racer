import { describe, expect, it } from "vitest";
import { SAMPLE_GHOST } from "../../src/content/sample-data";
import { resolveContest } from "../../src/simulation/contest";
import { buildPlaybackSchedule } from "../../src/simulation/playback";
import {
  TEST_DAY_CONFIG,
  createPracticeReturnContext,
  createPracticeSession,
  reconcilePracticeResult,
  resolvePractice,
  toPracticeComparisonProjection,
} from "../../src/simulation/practice";
import { controlledPracticeBuilds } from "../fixtures/practice-fixtures";
import { runHubPracticeFixture } from "../fixtures/practice-run-fixtures";

describe("practice deterministic authority", () => {
  it.each(Object.entries(controlledPracticeBuilds))(
    "matches 100 exact %s projections and direct resolver/playback output",
    (_name, buildFactory) => {
      const fixture = runHubPracticeFixture();
      fixture.run.build = buildFactory();
      const context = createPracticeReturnContext(fixture.run, {
        context: fixture.context,
        selection: fixture.selection,
        navigation: fixture.navigation,
      });
      const projections = Array.from({ length: 100 }, () => {
        const completed = resolvePractice(createPracticeSession(fixture.run, context));
        return toPracticeComparisonProjection(
          completed.result!.contest,
          completed.result!.playback,
          completed.result!.contest.contributions,
          completed.result!.reconciliation,
        );
      });
      projections.forEach((projection) => expect(projection).toStrictEqual(projections[0]));

      const directContest = resolveContest(buildFactory(), SAMPLE_GHOST, 10);
      const directProjection = toPracticeComparisonProjection(
        directContest,
        buildPlaybackSchedule(directContest),
        directContest.contributions,
        reconcilePracticeResult(directContest),
      );
      expect(projections[0]).toStrictEqual(directProjection);
      expect(TEST_DAY_CONFIG).toMatchObject({ id: "test-day-v1", lapCount: 10 });
      expect(projections[0]).not.toHaveProperty("sessionId");
      expect(projections[0]).not.toHaveProperty("runId");
      expect(projections[0]).not.toHaveProperty("returnContext");
    },
  );
});