import { describe, expect, it } from "vitest";
import { audioEngineRate, createAudioState, emitCue, markAudioCueUnavailable, setAudioMuted, startEngine, stopEngine, unlockAudio } from "../../src/scenes/audioPresentation";

describe("Feature 033 audio presentation", () => {
  it("is silent until unlocked, honours mute, bounds volume, and cleans up the loop", () => {
    let state = createAudioState({ effectsVolume: 9 });
    expect(state.settings.effectsVolume).toBe(1);
    state = startEngine(state, "normal");
    expect(state.activeEngine).toBe(false);
    state = unlockAudio(state);
    state = startEngine(state, "fast");
    expect(state.activeEngine).toBe(true);
    expect(state.engineRate).toBe(audioEngineRate("fast"));
    const emissionCount = state.emitted.length;
    state = startEngine(state, "normal");
    expect(state.emitted).toHaveLength(emissionCount);
    expect(state.engineRate).toBe(audioEngineRate("normal"));
    state = setAudioMuted(state, true);
    expect(state.activeEngine).toBe(false);
    expect(emitCue(state, "ui-activate").emitted).not.toContain("ui-activate");
    expect(stopEngine(state).activeEngine).toBe(false);
  });

  it("degrades silently when an optional cue is unavailable", () => {
    let state = unlockAudio(createAudioState());
    state = markAudioCueUnavailable(state, "engine-loop");
    state = startEngine(state, "fast");
    expect(state.activeEngine).toBe(false);
    expect(state.emitted).not.toContain("engine-loop");

    state = markAudioCueUnavailable(state, "ui-select");
    expect(emitCue(state, "ui-select")).toBe(state);
  });
});
