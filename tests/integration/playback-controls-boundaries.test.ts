import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 030-race-playback-controls Phase 6 scope/authority boundary audits
 * (T043–T044). These tests statically read the TypeScript source files and
 * reject any scope leak: playback speed must not influence
 * simulation/result/settlement authority (T043), and scenes must not add
 * scored Pause/Skip, remembered speed, automatic speed, legacy 4×/F
 * controls, or overtake dramatization (T044).
 */

const ROOT = join(__dirname, "..", "..");
const SIM_DIR = join(ROOT, "src", "simulation");
const SCENES_DIR = join(ROOT, "src", "scenes");

function readSource(path: string): string {
  return readFileSync(path, "utf-8");
}

function simulationFiles(): { name: string; content: string }[] {
  return readdirSync(SIM_DIR)
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => file !== "playback.ts")
    .map((file) => ({ name: file, content: readSource(join(SIM_DIR, file)) }));
}

const FORBIDDEN_SPEED_APIS = [
  "PlaybackSpeed",
  "PresentationClock",
  "playbackSpeedDescriptor",
  "PLAYBACK_SPEEDS",
  "createPresentationClock",
  "advancePresentationClock",
  "selectPlaybackSpeed",
  "createPlaybackController",
  "advancePlaybackController",
  "selectPlaybackControllerSpeed",
  "skipPlaybackController",
  "PlaybackController",
];

describe("T043: playback speed never influences simulation/result/settlement authority", () => {
  it.each(simulationFiles())(
    "$name does not reference any playback-speed API",
    ({ content }) => {
      for (const pattern of FORBIDDEN_SPEED_APIS) {
        expect(content).not.toContain(pattern);
      }
    },
  );

  it("contest.ts (resolveContest) carries no speed parameter or playback reference", () => {
    const contest = readSource(join(SIM_DIR, "contest.ts"));
    expect(contest).not.toMatch(/\bplaybackSpeed\b/i);
    expect(contest).not.toContain("PlaybackSpeed");
  });

  it("settlement.ts carries no speed parameter or playback reference", () => {
    const settlement = readSource(join(SIM_DIR, "settlement.ts"));
    expect(settlement).not.toMatch(/\bplaybackSpeed\b/i);
    expect(settlement).not.toContain("PlaybackSpeed");
  });

  it("run.ts carries no speed parameter or playback reference", () => {
    const run = readSource(join(SIM_DIR, "run.ts"));
    expect(run).not.toMatch(/\bplaybackSpeed\b/i);
    expect(run).not.toContain("PlaybackSpeed");
  });

  it("practice.ts carries no playback-speed reference", () => {
    const practice = readSource(join(SIM_DIR, "practice.ts"));
    expect(practice).not.toContain("PlaybackSpeed");
    expect(practice).not.toContain("PresentationClock");
    expect(practice).not.toContain("playbackSpeed");
  });
});
describe("T044/Feature 033: scenes expose scored Pause/Skip while rejecting remembered speed and legacy 4×/F", () => {
  const CONTEST = readSource(join(SCENES_DIR, "ContestScene.ts"));
  const PRACTICE = readSource(join(SCENES_DIR, "PracticeContestScene.ts"));

  it("ContestScene has explicit pause/skip keyboard handlers", () => {
    expect(CONTEST).toContain("keydown-SPACE");
    expect(CONTEST).toContain("keydown-S");
    expect(CONTEST).not.toContain("keydown-F");
    expect(CONTEST).toContain("togglePause");
    expect(CONTEST).toContain("skip()");
  });

  it("ContestScene has no Infinity skip target", () => {
    expect(CONTEST).not.toContain("Infinity");
  });

  it("neither scene persists speed to localStorage/sessionStorage", () => {
    expect(CONTEST).not.toContain("localStorage");
    expect(CONTEST).not.toContain("sessionStorage");
    expect(PRACTICE).not.toContain("localStorage");
    expect(PRACTICE).not.toContain("sessionStorage");
  });

  it("PracticeContestScene has no 4× speed tier", () => {
    expect(PRACTICE).not.toContain("4×");
    expect(PRACTICE).not.toMatch(/\b4x\b/);
  });

  it("PracticeContestScene has no changeSpeed cyclic method or F-key binding", () => {
    expect(PRACTICE).not.toContain("changeSpeed");
    expect(PRACTICE).not.toContain("keydown-F");
  });

  it("PracticeContestScene has no Infinity skip target", () => {
    expect(PRACTICE).not.toContain("Number.POSITIVE_INFINITY");
    expect(PRACTICE).not.toMatch(/=\s*Infinity/);
  });

  it("practiceContestControlPlan returns exactly Cancel/Pause/Skip (no Speed/F)", () => {
    const presentation = readSource(join(SCENES_DIR, "practicePresentation.ts"));
    const planMatch = presentation.match(/practiceContestControlPlan\(\)[\s\S]*?\n\}/);
    expect(planMatch).toBeTruthy();
    const planBody = planMatch![0];
    expect(planBody).toContain("cancel");
    expect(planBody).toContain("pause");
    expect(planBody).toContain("skip");
    expect(planBody).not.toContain("speed");
    expect(planBody).not.toContain('"F"');
  });

  it("neither scene implements automatic speed (no setTimeout/setInterval)", () => {
    expect(CONTEST).not.toContain("setTimeout");
    expect(CONTEST).not.toContain("setInterval");
    expect(PRACTICE).not.toContain("setTimeout");
    expect(PRACTICE).not.toContain("setInterval");
  });

  it("neither scene implements overtake dramatization", () => {
    expect(CONTEST).not.toContain("overtake");
    expect(CONTEST).not.toContain("dramatize");
    expect(PRACTICE).not.toContain("overtake");
    expect(PRACTICE).not.toContain("dramatize");
  });

  it("both scenes selectSpeed accepts only normal and fast (exactly two speeds)", () => {
    expect(CONTEST).toContain('selectSpeed("normal")');
    expect(CONTEST).toContain('selectSpeed("fast")');
    expect(PRACTICE).toContain('selectSpeed("normal")');
    expect(PRACTICE).toContain('selectSpeed("fast")');
    expect(CONTEST).not.toContain('selectSpeed("4');
    expect(PRACTICE).not.toContain('selectSpeed("4');
  });
});
