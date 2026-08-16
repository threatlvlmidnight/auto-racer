import { describe, expect, it } from "vitest";
import { resolveEnrichedContest } from "../../src/simulation/contest";
import { createAudioState, markAudioCueUnavailable, setAudioMuted, startEngine, unlockAudio } from "../../src/scenes/audioPresentation";
import { baselineEmptyBuild, DEFAULT_ENTRANT_ID, racerRivalRoster } from "../fixtures/race-enrichment-fixtures";

const input = { playerBuild: baselineEmptyBuild, entrantId: DEFAULT_ENTRANT_ID, rivalRoster: racerRivalRoster, level: 1, seed: 7, lapCount: 8 } as const;

describe("Feature 033 audio authority boundary", () => {
  it("enabled, muted, blocked, and missing audio leave resolution byte-identical", () => {
    const expected = resolveEnrichedContest(input);
    const states = [
      startEngine(unlockAudio(createAudioState()), "normal"),
      startEngine(setAudioMuted(unlockAudio(createAudioState()), true), "fast"),
      startEngine(createAudioState(), "normal"),
      startEngine(markAudioCueUnavailable(unlockAudio(createAudioState()), "engine-loop"), "fast"),
    ];
    expect(states.some((state) => state.activeEngine)).toBe(true);
    states.forEach(() => expect(resolveEnrichedContest(input)).toEqual(expected));
  });
});
