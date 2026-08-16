/** Presentation-only race/UI audio policy. Never imports simulation authority. */
export type AudioCueId = "ui-select" | "ui-activate" | "engine-loop" | "race-finish";

export interface AudioSettings { muted: boolean; effectsVolume: number; unlocked: boolean; }
export interface AudioState {
  settings: AudioSettings;
  activeEngine: boolean;
  engineRate: number;
  emitted: readonly AudioCueId[];
  /** Optional assets may fail without changing navigation or authority. */
  unavailableCues: readonly AudioCueId[];
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = Object.freeze({ muted: false, effectsVolume: 0.7, unlocked: false });
export const AUDIO_CUES: readonly AudioCueId[] = Object.freeze(["ui-select", "ui-activate", "engine-loop", "race-finish"]);

export function createAudioState(settings: Partial<AudioSettings> = {}): AudioState {
  return {
    settings: { ...DEFAULT_AUDIO_SETTINGS, ...settings, effectsVolume: Math.max(0, Math.min(1, settings.effectsVolume ?? DEFAULT_AUDIO_SETTINGS.effectsVolume)) },
    activeEngine: false,
    engineRate: 1,
    emitted: [],
    unavailableCues: [],
  };
}
export function unlockAudio(state: AudioState): AudioState { return { ...state, settings: { ...state.settings, unlocked: true } }; }
export function setAudioMuted(state: AudioState, muted: boolean): AudioState {
  return { ...state, settings: { ...state.settings, muted }, activeEngine: muted ? false : state.activeEngine };
}
export function audioEngineRate(speed: "normal" | "fast"): number { return speed === "fast" ? 1.2 : 1; }
export function startEngine(state: AudioState, speed: "normal" | "fast"): AudioState {
  if (state.settings.muted || !state.settings.unlocked || state.unavailableCues.includes("engine-loop")) {
    return { ...state, activeEngine: false };
  }
  const engineRate = audioEngineRate(speed);
  if (state.activeEngine) return { ...state, engineRate };
  return { ...state, activeEngine: true, engineRate, emitted: [...state.emitted, "engine-loop"] };
}
export function stopEngine(state: AudioState): AudioState { return { ...state, activeEngine: false }; }
export function emitCue(state: AudioState, cue: Exclude<AudioCueId, "engine-loop">): AudioState {
  return state.settings.muted || !state.settings.unlocked || state.unavailableCues.includes(cue)
    ? state
    : { ...state, emitted: [...state.emitted, cue] };
}

/** Records an optional-asset failure and silently stops the affected loop. */
export function markAudioCueUnavailable(state: AudioState, cue: AudioCueId): AudioState {
  if (state.unavailableCues.includes(cue)) return state;
  return {
    ...state,
    activeEngine: cue === "engine-loop" ? false : state.activeEngine,
    unavailableCues: [...state.unavailableCues, cue],
  };
}

// Optional browser adapter. The pure state above remains the testable policy;
// this adapter merely renders that policy and is never imported by simulation.
let browserContext: AudioContext | null = null;
let browserEngine: { oscillator: OscillatorNode; gain: GainNode } | null = null;
let browserMuted = false;

export function unlockBrowserAudio(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  try {
    browserContext ??= new AudioContext();
    void browserContext.resume().catch(() => undefined);
  } catch {
    browserContext = null;
  }
}

export function setBrowserAudioMuted(muted: boolean): void {
  browserMuted = muted;
  if (muted) stopBrowserEngine();
}

export function isBrowserAudioMuted(): boolean { return browserMuted; }

export function startBrowserEngine(speed: "normal" | "fast"): void {
  if (!browserContext || browserMuted) return;
  if (browserEngine) {
    browserEngine.oscillator.frequency.setValueAtTime(speed === "fast" ? 96 : 82, browserContext.currentTime);
    return;
  }
  try {
    const oscillator = browserContext.createOscillator();
    const gain = browserContext.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = speed === "fast" ? 96 : 82;
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(browserContext.destination);
    oscillator.start();
    browserEngine = { oscillator, gain };
  } catch {
    browserEngine = null;
  }
}

export function stopBrowserEngine(): void {
  if (!browserEngine) return;
  try { browserEngine.oscillator.stop(); } catch { /* optional audio already stopped */ }
  browserEngine.oscillator.disconnect();
  browserEngine.gain.disconnect();
  browserEngine = null;
}

export function emitBrowserCue(cue: Exclude<AudioCueId, "engine-loop">): void {
  if (!browserContext || browserMuted) return;
  try {
    const oscillator = browserContext.createOscillator();
    const gain = browserContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = cue === "race-finish" ? 520 : cue === "ui-activate" ? 360 : 280;
    gain.gain.setValueAtTime(0.045, browserContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, browserContext.currentTime + 0.08);
    oscillator.connect(gain).connect(browserContext.destination);
    oscillator.start();
    oscillator.stop(browserContext.currentTime + 0.085);
  } catch {
    // Browser rejection and missing audio support are silent fallbacks.
  }
}
