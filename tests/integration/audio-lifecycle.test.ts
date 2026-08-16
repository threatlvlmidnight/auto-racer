import { describe, expect, it } from "vitest";
import { createAudioState, setAudioMuted, startEngine, stopEngine, unlockAudio } from "../../src/scenes/audioPresentation";

describe("Feature 033 engine lifecycle policy", () => {
  it("starts after unlock, changes rate without stacking, and stops on pause/Skip/finish/shutdown", () => {
    let state = unlockAudio(createAudioState());
    state = startEngine(state, "normal");
    expect(state.activeEngine).toBe(true);
    expect(state.emitted.filter((cue) => cue === "engine-loop")).toHaveLength(1);

    state = startEngine(state, "fast");
    expect(state.engineRate).toBeGreaterThan(1);
    expect(state.emitted.filter((cue) => cue === "engine-loop")).toHaveLength(1);

    for (const boundary of ["pause", "skip", "finish", "visibility", "shutdown"] as const) {
      state = stopEngine(state);
      expect(state.activeEngine, boundary).toBe(false);
      if (boundary === "pause") state = startEngine(state, "fast");
    }
  });

  it("mute immediately stops the loop", () => {
    const active = startEngine(unlockAudio(createAudioState()), "normal");
    expect(setAudioMuted(active, true).activeEngine).toBe(false);
  });
});
