import { describe, expect, it } from "vitest";
import { markerPresentation, markerPresentations, projectionPresentation } from "../../src/scenes/raceProjectionPresentation";
import { checkpointProjection, updateLiveProjection, type LiveProjectionState, type NCarProgress } from "../../src/simulation/playback";
import { resolveContest } from "../../src/simulation/contest";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { changingCheckpointOrderFixture, staggeredFinishFixture } from "../fixtures/race-legibility-fixtures";

function car(overrides: Partial<NCarProgress> = {}): NCarProgress {
  return {
    id: "rival-torres",
    role: "rival",
    name: "Torres",
    color: "#7cc",
    progress: { lapIndex: 2, lapProgress: 0.5, finished: false },
    cumulativeTime: 20,
    ...overrides,
  };
}

describe("T013/T014: marker identity and lap-context presentation", () => {
  it("labels the player as You and a rival by its authored name", () => {
    expect(markerPresentation(car({ role: "player", name: "Player" }), 10).identityLabel).toBe("You");
    expect(markerPresentation(car({ role: "rival", name: "Torres" }), 10).identityLabel).toBe("Torres");
  });

  it("shows a 1-indexed human lap label while running and Finished once complete", () => {
    const running = markerPresentation(car({ progress: { lapIndex: 3, lapProgress: 0.2, finished: false } }), 10);
    const finished = markerPresentation(car({ progress: { lapIndex: 10, lapProgress: 1, finished: true } }), 10);

    expect(running.lapLabel).toBe("Lap 4/10");
    expect(finished.lapLabel).toBe("Finished");
  });

  it("distinguishes two markers at the identical screen point (same fractionalProgress) by identity and lap label alone", () => {
    // The exact "closed-loop wrapping" scenario T007 confirmed is expected
    // geometry: two cars on different laps can occupy the same screen point.
    const earlierLap = markerPresentation(car({ id: "rival-a", name: "Alpha", progress: { lapIndex: 2, lapProgress: 0.5, finished: false } }), 10);
    const laterLap = markerPresentation(car({ id: "rival-b", name: "Beta", progress: { lapIndex: 6, lapProgress: 0.5, finished: false } }), 10);

    expect(earlierLap.fractionalProgress).toBe(laterLap.fractionalProgress);
    expect(earlierLap.identityLabel).not.toBe(laterLap.identityLabel);
    expect(earlierLap.lapLabel).not.toBe(laterLap.lapLabel);
    expect(earlierLap.carId).not.toBe(laterLap.carId);
  });

  it("never reports fractionalProgress as the source of lap or rank information", () => {
    const model = markerPresentation(car(), 10);
    expect(model).not.toHaveProperty("position");
    expect(model).not.toHaveProperty("rank");
  });

  it("markerPresentations maps one model per car in the given order", () => {
    const cars = [car({ id: "player", role: "player", name: "Player" }), car({ id: "rival-torres" })];
    const models = markerPresentations(cars, 10);

    expect(models).toHaveLength(2);
    expect(models.map((model) => model.carId)).toEqual(["player", "rival-torres"]);
  });
});

// 027-race-legibility-integrity T029: projectionPresentation's textual state.
describe("T029: projectionPresentation", () => {
  const AWAITING: LiveProjectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };

  it("shows only the awaiting headline before the first split, with every other field null", () => {
    const model = projectionPresentation(AWAITING);

    expect(model.headline).toBe("Awaiting Lap 1 Split");
    expect(model.splitLabel).toBeNull();
    expect(model.aheadLabel).toBeNull();
    expect(model.behindLabel).toBeNull();
    expect(model.changeLabel).toBeNull();
  });

  it("labels a nonfinal rank as Projected with an ordinal, plus the split lap", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 3, lapProgress: 0, finished: false });
    const model = projectionPresentation(state);

    expect(model.headline).toMatch(/^Projected \d+(st|nd|rd|th)$/);
    expect(model.splitLabel).toBe("Split at Lap 3/10");
  });

  it("says 'You lead the field' with no ahead comparison when the player projects first", () => {
    const result = staggeredFinishFixture();
    // Rivals are far faster than the player (fixture doc) — invert so the player leads instead.
    const inverted = { ...result, cars: result.cars.map((car) => car.role === "player" ? { ...car, laps: car.laps.map(() => ({ time: 1, firedItems: [], contributions: [] })) } : car) };
    const projection = checkpointProjection(inverted, 1);
    const model = projectionPresentation({ kind: "projected", current: projection, previous: null, change: "first-split", placesChanged: 0 });

    expect(projection.playerPosition).toBe(1);
    expect(model.aheadLabel).toBe("You lead the field");
    expect(model.behindLabel).not.toBeNull();
  });

  it("says 'You hold last projected place' with no behind comparison when the player projects last", () => {
    const result = staggeredFinishFixture();
    const projection = checkpointProjection(result, 1);
    const model = projectionPresentation({ kind: "projected", current: projection, previous: null, change: "first-split", placesChanged: 0 });

    expect(projection.playerPosition).toBe(8);
    expect(model.behindLabel).toBe("You hold last projected place");
    expect(model.aheadLabel).not.toBeNull();
  });

  it("phrases ahead/behind gaps unambiguously (leads by / trails by) without requiring a sign to be read", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 4, lapProgress: 0, finished: false });
    const model = projectionPresentation(state);

    if (model.aheadLabel && model.aheadLabel !== "You lead the field") {
      expect(model.aheadLabel).toContain("leads by");
      expect(model.aheadLabel).not.toMatch(/-\d/); // no bare negative sign
    }
    if (model.behindLabel && model.behindLabel !== "You hold last projected place") {
      expect(model.behindLabel).toContain("trails by");
    }
  });

  it("gives gained/lost/held distinct textual markers, not color-only", () => {
    const result = changingCheckpointOrderFixture();
    const afterLap1 = updateLiveProjection(AWAITING, result, { lapIndex: 1, lapProgress: 0, finished: false });
    const afterLap2 = updateLiveProjection(afterLap1, result, { lapIndex: 2, lapProgress: 0, finished: false });
    const afterLap3 = updateLiveProjection(afterLap2, result, { lapIndex: 3, lapProgress: 0, finished: false });

    expect(projectionPresentation(afterLap1).changeLabel).toBe("First split");
    expect(projectionPresentation(afterLap2).changeLabel).toContain("Lost");
    // Player stays behind rival-alternate at checkpoint 3 too (fixture doc: held at +4 every lap after the flip).
    expect(projectionPresentation(afterLap3).changeLabel).toBe("● Held position");
  });

  it("builds a complete accessibility label from every visible field", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 2, lapProgress: 0, finished: false });
    const model = projectionPresentation(state);

    expect(model.accessibilityLabel).toContain(model.headline);
    expect(model.accessibilityLabel).toContain(model.splitLabel!);
  });
});

// 027-race-legibility-integrity US5 (T048/T049): every field required to
// read the race is plain string data on the model itself — there is no
// hover-only or color-only channel a keyboard/touch/monochrome/reduced-
// motion viewer could miss. Phaser rendering (ContestScene) only ever
// reads these same strings; it never derives extra meaning from a
// stroke/fill color the model doesn't also express in text.
describe("US5: accessible without hover, color, or motion (T048/T049)", () => {
  const AWAITING: LiveProjectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };

  it("marker identity is a plain string, never requiring color to distinguish two overlapping cars", () => {
    const a = markerPresentation(car({ id: "a", name: "Alpha", role: "rival" }), 10);
    const b = markerPresentation(car({ id: "b", name: "Beta", role: "rival" }), 10);
    expect(typeof a.identityLabel).toBe("string");
    expect(typeof b.identityLabel).toBe("string");
    expect(a.identityLabel).not.toBe(b.identityLabel);
  });

  it("every projectionPresentation field the race view shows is a plain string reachable without a hover event handler", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 3, lapProgress: 0, finished: false });
    const model = projectionPresentation(state);

    // No field is a function, event, or hover-gated getter — all data,
    // fully computed up front by a pure call with no interaction argument.
    [model.headline, model.splitLabel, model.aheadLabel, model.behindLabel, model.changeLabel].forEach((field) => {
      if (field !== null) expect(typeof field).toBe("string");
    });
    expect(projectionPresentation.length).toBe(1); // (state) only — no pointer/input parameter exists
  });

  it("change state uses a distinct glyph plus word for gained/lost/held, not color alone", () => {
    const result = changingCheckpointOrderFixture();
    const afterLap1 = updateLiveProjection(AWAITING, result, { lapIndex: 1, lapProgress: 0, finished: false });
    const afterLap2 = updateLiveProjection(afterLap1, result, { lapIndex: 2, lapProgress: 0, finished: false });
    const lostLabel = projectionPresentation(afterLap2).changeLabel!;

    expect(lostLabel).toContain("▼");
    expect(lostLabel.toLowerCase()).toContain("lost");
  });
});
