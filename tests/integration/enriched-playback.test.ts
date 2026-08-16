import { describe, expect, it } from "vitest";
import { resolveEnrichedContest } from "../../src/simulation/contest";
import {
  advancePlaybackController,
  buildNCarPlaybackSchedule,
  createPlaybackController,
  maxFinishScheduleTime,
  nCarBoundaryView,
  skipPlaybackController,
} from "../../src/simulation/playback";
import { eventMotionTreatment } from "../../src/scenes/raceEnrichmentPresentation";
import { baselineEmptyBuild, DEFAULT_ENTRANT_ID, racerRivalRoster } from "../fixtures/race-enrichment-fixtures";

function fixture() {
  return resolveEnrichedContest({
    playerBuild: baselineEmptyBuild,
    entrantId: DEFAULT_ENTRANT_ID,
    rivalRoster: racerRivalRoster,
    level: 1,
    seed: 42,
    lapCount: 12,
  });
}

describe("Feature 033 enriched playback parity", () => {
  it("consumes retained events exactly once with one large or many small frames", () => {
    const result = fixture();
    const view = nCarBoundaryView(buildNCarPlaybackSchedule(result, result.track), result);
    const finish = maxFinishScheduleTime(view);
    const large = advancePlaybackController(createPlaybackController(view), finish + 1).lastEvents
      .flatMap((event) => event.enrichmentEvent?.eventId ?? []);

    let small = createPlaybackController(view);
    const ids: string[] = [];
    while (!small.resultsReady) {
      small = advancePlaybackController(small, 0.1);
      ids.push(...small.lastEvents.flatMap((event) => event.enrichmentEvent?.eventId ?? []));
    }
    expect(ids).toEqual(large);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Skip reaches retained finish and reduced motion preserves event facts", () => {
    const result = fixture();
    const view = nCarBoundaryView(buildNCarPlaybackSchedule(result, result.track), result);
    const skipped = skipPlaybackController(createPlaybackController(view));
    expect(skipped.resultsReady).toBe(true);
    expect(skipped.lastEvents[skipped.lastEvents.length - 1]?.kind).toBe("results-ready");
    for (const event of result.events) {
      const full = eventMotionTreatment(event, false);
      const reduced = eventMotionTreatment(event, true);
      expect(reduced).toMatchObject({ eventId: full.eventId, text: full.text, emphasis: full.emphasis, mode: "static" });
    }
  });
});
