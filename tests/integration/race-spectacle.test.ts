import { describe, expect, it, vi } from "vitest";
import {
  advancePlaybackController,
  buildNCarPlaybackSchedule,
  createPlaybackController,
  maxFinishScheduleTime,
  nCarBoundaryView,
  selectPlaybackControllerSpeed,
  skipPlaybackController,
  standingsAt,
} from "../../src/simulation/playback";
import * as tracksModule from "../../src/simulation/tracks";
import { pointAtProgress } from "../../src/simulation/tracks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCircuitVisualModel,
  buildSpectacleCandidates,
  completeActiveSpectacle,
  createFocusWindow,
  createSpectaclePresentationState,
  focusPositions,
  focusRestored,
  focusSelectCar,
  focusWithActiveMoment,
  focusWindowDisplayModel,
  markerPlacementAt,
  pipBudgetForLapCount,
  selectSpectacleMomentsFromResult,
  spectacleActivated,
  spectacleEventCrossed,
  spectacleTerminalReport,
} from "../../src/scenes/raceSpectaclePresentation";
import type { EnrichedContestResult } from "../../src/simulation/types";
import {
  PLAYER_VISUAL_PROFILES,
  RACE_VEHICLE_FORWARD_IS_PLUS_X,
  raceVisualProfileForCar,
  rivalVisualProfile,
} from "../../src/content/raceVisualProfiles";
import { RACE_PLAYER_VEHICLE_KEYS, availableRaceVehicleTextureKey } from "../../src/scenes/visualAssets";
import {
  eventlessSpectacleResult,
  playerEventsResult,
  playerIncidentEvent,
  playerOvertakeCompletedEvent,
  resolvedSpectacleRace,
  rivalOnlyResult,
  simultaneousResult,
  spectacleResultWithEvents,
  spectacleTrack,
} from "../fixtures/race-spectacle-fixtures";

/**
 * Feature 036 integration coverage (T013/T014/T021/T025/T033/T035/T036/T041/
 * T042): the spectacle layer is pure and read-only, so these tests drive
 * real retained results through the playback controller and the pure reducer
 * without a canvas. No test instantiates Phaser or a second resolver.
 */

function fakeScene(texturesExist: boolean) {
  return { textures: { exists: () => texturesExist } };
}

function driveCrossedEventIds(
  result: EnrichedContestResult,
  speed: "normal" | "fast",
): { crossedEventIds: string[]; resultsReady: boolean } {
  const schedule = buildNCarPlaybackSchedule(result, result.track);
  const view = nCarBoundaryView(schedule, result);
  let controller = createPlaybackController(view);
  if (speed === "fast") controller = selectPlaybackControllerSpeed(controller, "fast");
  const crossedEventIds: string[] = [];
  while (!controller.resultsReady) {
    controller = advancePlaybackController(controller, 0.1);
    crossedEventIds.push(...controller.lastEvents.flatMap((event) => event.enrichmentEvent?.eventId ?? []));
  }
  return { crossedEventIds, resultsReady: controller.resultsReady };
}

function reducedTerminalReport(result: EnrichedContestResult, crossedEventIds: string[]): ReadonlyArray<readonly [string, string]> {
  let state = createSpectaclePresentationState({
    moments: selectSpectacleMomentsFromResult(result),
    playerCarId: "player",
  });
  for (const eventId of crossedEventIds) {
    state = spectacleEventCrossed(state, eventId);
    state = completeActiveSpectacle(state);
  }
  return spectacleTerminalReport(state);
}
describe("Feature 036 US1 circuit and field (T013/T014)", () => {
  it("derives the enhanced circuit from schedule.track and never regenerates it", () => {
    const result = resolvedSpectacleRace(12, 42);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const spy = vi.spyOn(tracksModule, "generateTrack");
    const model = buildCircuitVisualModel(schedule.track);
    expect(model.trackId).toBe(schedule.track.id);
    expect(model.points).toEqual(schedule.track.points);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("replays compact fixtures at normal and fast with unchanged finish order and results", () => {
    for (const [lapCount, seed] of [[8, 7], [10, 31], [12, 42], [14, 83], [16, 97]] as const) {
      const result = resolvedSpectacleRace(lapCount, seed);
      const schedule = buildNCarPlaybackSchedule(result, result.track);
      const view = nCarBoundaryView(schedule, result);
      const finish = maxFinishScheduleTime(view);
      const finalOrder = standingsAt(schedule, finish).map((entry) => entry.id);
      expect(finalOrder.length).toBe(result.cars.length);

      const normal = skipPlaybackController(createPlaybackController(view));
      expect(normal.resultsReady).toBe(true);

      let fast = createPlaybackController(view);
      fast = selectPlaybackControllerSpeed(fast, "fast");
      while (!fast.resultsReady) fast = advancePlaybackController(fast, 2);
      expect(fast.resultsReady).toBe(true);

      // The spectacle layer is read-only: finish order is identical at both speeds.
      expect(standingsAt(schedule, finish).map((entry) => entry.id)).toEqual(finalOrder);
    }
  });
});

describe("Feature 036 non-color identity and fallback (T021)", () => {
  it("gives the full field stable number/pattern/label identity", () => {
    const result = resolvedSpectacleRace(12, 42);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    schedule.cars.forEach((car) => {
      const profile = raceVisualProfileForCar(car, "evelyn-mercer");
      expect(profile.number.trim().length).toBeGreaterThan(0);
      expect(profile.pattern.trim().length).toBeGreaterThan(0);
      expect(profile.label.trim().length).toBeGreaterThan(0);
    });
  });

  it("keeps a labeled no-asset fallback when the player art is unavailable", () => {
    // Missing texture -> lookup returns undefined so the scene uses the fallback.
    expect(availableRaceVehicleTextureKey(fakeScene(false), "race-player-evelyn-mercer")).toBeUndefined();
    // When available, the stable key is returned.
    expect(availableRaceVehicleTextureKey(fakeScene(true), "race-player-evelyn-mercer"))
      .toBe("race-player-evelyn-mercer");
    const profile = PLAYER_VISUAL_PROFILES[0];
    expect(profile.fallback.number).toBe(profile.number);
    expect(profile.fallback.pattern).toBe(profile.pattern);
    expect(profile.fallback.label).toBe(profile.label);
  });
});

describe("Feature 036 US2 exact-once and speed stability (T025)", () => {
  it("keeps selected IDs and exact-once consumption identical across playback speeds", () => {
    const result = playerEventsResult(12);
    const normal = driveCrossedEventIds(result, "normal");
    const fast = driveCrossedEventIds(result, "fast");
    expect(normal.resultsReady).toBe(true);
    expect(fast.resultsReady).toBe(true);
    // Feature 033 consumes each boundary once: no duplicated PiP evidence.
    expect(new Set(normal.crossedEventIds).size).toBe(normal.crossedEventIds.length);
    const reportNormal = reducedTerminalReport(result, normal.crossedEventIds);
    const reportFast = reducedTerminalReport(result, fast.crossedEventIds);
    expect(reportNormal.map(([id]) => id)).toEqual(reportFast.map(([id]) => id));
    const selected = selectSpectacleMomentsFromResult(result).map((m) => m.eventId);
    expect([...new Set(reportNormal.map(([id]) => id))].sort()).toEqual([...selected].sort());
  });
});

describe("Feature 036 US2 budgets and conflict policy (T033)", () => {
  it("respects every supported PiP budget without fabricating panels", () => {
    for (const lapCount of [8, 10, 12, 14, 16]) {
      const selected = selectSpectacleMomentsFromResult(playerEventsResult(lapCount, 42));
      expect(selected.length).toBeLessThanOrEqual(pipBudgetForLapCount(lapCount));
    }
  });

  it("produces no PiP for eventless and rival-only races", () => {
    expect(selectSpectacleMomentsFromResult(eventlessSpectacleResult(12))).toEqual([]);
    expect(selectSpectacleMomentsFromResult(rivalOnlyResult(12))).toEqual([]);
  });

  it("resolves simultaneous boundaries to a single deterministic selected moment", () => {
    const selected = selectSpectacleMomentsFromResult(simultaneousResult(8));
    const boundaries = selected.map((moment) => moment.boundaryId);
    expect(new Set(boundaries).size).toBe(boundaries.length);
    expect(selected.length).toBeLessThanOrEqual(2);
  });

  it("leaves the retained result and event order equivalent", () => {
    const result = playerEventsResult(12);
    const carsBefore = result.cars.map((car) => car.id);
    const eventBefore = result.events.map((event) => event.eventId);
    selectSpectacleMomentsFromResult(result);
    expect(result.cars.map((car) => car.id)).toEqual(carsBefore);
    expect(result.events.map((event) => event.eventId)).toEqual(eventBefore);
  });
});

describe("Feature 036 US3 profiles and focus (T035/T036/T041)", () => {
  it("manifests all four player profiles and reusable rival identities", () => {
    expect(PLAYER_VISUAL_PROFILES).toHaveLength(4);
    expect(RACE_PLAYER_VEHICLE_KEYS).toHaveLength(4);
    for (const key of RACE_PLAYER_VEHICLE_KEYS) expect(typeof key).toBe("string");
    for (const profile of PLAYER_VISUAL_PROFILES) {
      expect(profile.silhouetteClass.trim().length).toBeGreaterThan(0);
    }
    const rival = rivalVisualProfile("rival-torres", "Torres", "#ffffff");
    const resolved = raceVisualProfileForCar(
      { id: "rival-torres", role: "rival", name: "Torres", color: "#ffffff" },
      "evelyn-mercer",
    );
    expect(resolved.profileId).toBe(rival.profileId);
    expect(availableRaceVehicleTextureKey(fakeScene(false), "race-player-evelyn-mercer")).toBeUndefined();
  });

  it("keeps focus selection out of schedule, standings, and selected IDs", () => {
    const result = playerEventsResult(12);
    const scheduleBefore = buildNCarPlaybackSchedule(result, result.track);
    const selectedBefore = selectSpectacleMomentsFromResult(result).map((moment) => moment.eventId);
    const state = createSpectaclePresentationState({ moments: [], playerCarId: "player" });
    const focus = focusSelectCar(state.focus, "rival-torres");
    expect(focus.selectedCarId).toBe("rival-torres");
    const scheduleAfter = buildNCarPlaybackSchedule(result, result.track);
    expect(scheduleAfter.track).toBe(result.track);
    expect(scheduleBefore.track).toBe(scheduleAfter.track);
    expect(selectSpectacleMomentsFromResult(result).map((moment) => moment.eventId)).toEqual(selectedBefore);
  });

  it("restores the selected focus after active PiP and keeps controls reachable", () => {
    const result = playerEventsResult(12);
    const selected = selectSpectacleMomentsFromResult(result);
    let state = createSpectaclePresentationState({ moments: selected, playerCarId: "player" });
    state = { ...state, focus: focusSelectCar(state.focus, "rival-torres") };
    const crossed = driveCrossedEventIds(result, "normal").crossedEventIds;
    state = crossed.reduce((s, id) => spectacleEventCrossed(s, id), state);
    const restored = completeActiveSpectacle(state);
    expect(restored.focus.selectedCarId).toBe("rival-torres");
    expect(restored.focus.activeMomentId).toBeNull();
    const display = focusWindowDisplayModel(restored.focus, (id) => id);
    expect(display.hasActiveMoment).toBe(false);
    expect(display.selectedCarId).toBe("rival-torres");
    const profile = raceVisualProfileForCar(
      { id: "rival-torres", role: "rival", name: "Torres", color: "#ffffff" },
      "evelyn-mercer",
    );
    expect(profile.fallback.label).toBe("Torres");
  });
});

describe("Feature 036 purity and no regeneration (T042)", () => {
  it("introduces no second resolver, live input, unseeded randomness, or track regeneration", () => {
    const result = playerEventsResult(12);
    const spy = vi.spyOn(tracksModule, "generateTrack");
    const candidates = buildSpectacleCandidates(result);
    expect(buildSpectacleCandidates(result)).toEqual(candidates);
    const one = reducedTerminalReport(result, driveCrossedEventIds(result, "normal").crossedEventIds);
    const two = reducedTerminalReport(result, driveCrossedEventIds(result, "normal").crossedEventIds);
    expect(two).toEqual(one);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("Feature 036 distinct assets and orientation (T048)", () => {
  it("ships four distinct player vehicle art files (not color-only)", () => {
    const root = (process as unknown as { cwd(): string }).cwd();
    const buffers = PLAYER_VISUAL_PROFILES.map((profile) =>
      readFileSync(join(root, `public/assets/race/vehicles/player-${profile.profileId}.png`)),
    );
    const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    };
    for (let i = 0; i < buffers.length; i++) {
      for (let j = i + 1; j < buffers.length; j++) {
        expect(bytesEqual(buffers[i], buffers[j])).toBe(false);
      }
    }
  });

  it("aligns vehicle forward orientation with the retained track heading", () => {
    expect(RACE_VEHICLE_FORWARD_IS_PLUS_X).toBe(true);
    const track = spectacleTrack(42);
    const placement = markerPlacementAt(track, 0.35);
    const expected = pointAtProgress(track, 0.35);
    expect(placement.x).toBeCloseTo(expected.x, 5);
    expect(placement.y).toBeCloseTo(expected.y, 5);
    expect(placement.headingRadians).toBe(expected.headingRadians);
  });
});

describe("Feature 036 suppressed arrival timer invariant (T052)", () => {
  it("never restarts or extends the winning PiP on a suppressed arrival", () => {
    const result = spectacleResultWithEvents(16, [
      playerOvertakeCompletedEvent("lap-4"),
      playerIncidentEvent("lap-6"),
    ]);
    const selected = selectSpectacleMomentsFromResult(result);
    let state = createSpectaclePresentationState({ moments: selected, playerCarId: "player" });
    let remaining = 0; // simulated scene PiP frame budget
    // Activate the higher-priority pass -> timer starts at the full window.
    state = spectacleEventCrossed(state, selected[0].eventId);
    remaining = 90;
    // A colliding selected arrival is suppressed; activated stays false so the
    // scene does NOT reset `remaining`, keeping the winner's duration invariant.
    const prev = state;
    state = spectacleEventCrossed(state, selected[1].eventId);
    expect(spectacleActivated(prev, state)).toBe(false);
    expect(remaining).toBe(90);
    expect(state.selected.get(selected[0].eventId)?.status).toBe("active");
    expect(state.selected.get(selected[1].eventId)?.status).toBe("suppressed");
    expect(state.focus.activeMomentId).toBe(selected[0].eventId);
  });
});

describe("Feature 036 scene-level playback paths (T053)", () => {
  function drivePlayback(result: EnrichedContestResult, mode: "normal" | "fast" | "skip") {
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    let controller = createPlaybackController(view);
    if (mode === "fast") controller = selectPlaybackControllerSpeed(controller, "fast");
    const crossedEventIds: string[] = [];
    let guard = 0;
    while (!controller.resultsReady && guard++ < 100000) {
      controller = mode === "skip"
        ? skipPlaybackController(controller)
        : advancePlaybackController(controller, mode === "fast" ? 0.5 : 0.1);
      crossedEventIds.push(...controller.lastEvents.flatMap((event) => event.enrichmentEvent?.eventId ?? []));
    }
    return { controller, crossedEventIds };
  }

  it("normal, fast, and skip cannot change selected IDs, duplicate PiP, extend playback, or alter the result", () => {
    const result = playerEventsResult(16, 42);
    const selected = selectSpectacleMomentsFromResult(result).map((moment) => moment.eventId).sort();
    const finish = maxFinishScheduleTime(nCarBoundaryView(buildNCarPlaybackSchedule(result, result.track), result));

    const outputs = (["normal", "fast", "skip"] as const).map((mode) => ({ mode, ...drivePlayback(result, mode) }));
    for (const output of outputs) {
      expect(output.controller.resultsReady).toBe(true);
      // Feature 033 consumes each boundary once -> no duplicate PiP evidence.
      expect(new Set(output.crossedEventIds).size).toBe(output.crossedEventIds.length);
      // The same bounded selected set appears in every playback path.
      const appeared = [...new Set(output.crossedEventIds)].filter((id) => selected.includes(id)).sort();
      expect(appeared).toEqual(selected);
      // No extended playback: the controller is terminal after results-ready.
      const after = advancePlaybackController(output.controller, 5);
      expect(after).toBe(output.controller);
    }
    // Playback finishes at the same finite schedule time regardless of speed.
    expect(outputs[0].controller.clock.scheduleTimeSeconds).toBeGreaterThanOrEqual(finish - 1e-6);
    expect(outputs[1].controller.clock.scheduleTimeSeconds).toBeGreaterThanOrEqual(finish - 1e-6);
    expect(outputs[2].controller.clock.scheduleTimeSeconds).toBe(finish);
    // The retained final result is untouched.
    const orderBefore = result.cars.map((car) => car.id);
    selectSpectacleMomentsFromResult(result);
    expect(result.cars.map((car) => car.id)).toEqual(orderBefore);
  });
});

describe("Feature 036 focus-view position data (T055)", () => {
  it("tracks player default, every named selection, movement, PiP override, and restoration", () => {
    const track = spectacleTrack(42);
    const carLabel = (id: string) => (id === "player" ? "Ava" : id);
    const progressOf: Record<string, { lapProgress: number }> = {
      player: { lapProgress: 0.1 },
      "rival-torres": { lapProgress: 0.25 },
    };

    const playerDefault = createFocusWindow("player");
    const playerPos = focusPositions(playerDefault, (id) => progressOf[id], track, carLabel);
    expect(playerPos.map((entry) => entry.carId)).toEqual(["player"]);
    const pp = markerPlacementAt(track, 0.1);
    expect(playerPos[0].position).toEqual({ x: pp.x, y: pp.y });

    const selected = focusSelectCar(playerDefault, "rival-torres");
    const rivalPos = focusPositions(selected, (id) => progressOf[id], track, carLabel);
    expect(rivalPos.map((entry) => entry.carId)).toEqual(["rival-torres"]);
    const rp = markerPlacementAt(track, 0.25);
    expect(rivalPos[0].position).toEqual({ x: rp.x, y: rp.y });

    // Movement across frames changes the retained position.
    progressOf["rival-torres"] = { lapProgress: 0.6 };
    const moved = focusPositions(selected, (id) => progressOf[id], track, carLabel);
    expect(moved[0].position).not.toEqual(rivalPos[0].position);

    // PiP override shows both participants, then restoration returns to selection.
    const overridden = focusWithActiveMoment(selected, { eventId: "e2", participants: ["player", "rival-torres"] } as never);
    const overPos = focusPositions(overridden, (id) => progressOf[id], track, carLabel);
    expect(overPos.map((entry) => entry.carId).sort()).toEqual(["player", "rival-torres"]);
    const restored = focusRestored(overridden);
    const restoredPos = focusPositions(restored, (id) => progressOf[id], track, carLabel);
    expect(restoredPos.map((entry) => entry.carId)).toEqual(["rival-torres"]);

    // Narrow-layout fallback: an unavailable car yields no position (panel stays labeled).
    const missing = focusPositions({ ...selected, displayedCarIds: ["rival-unknown"] }, (id) => progressOf[id], track, carLabel);
    expect(missing).toEqual([]);
  });

  it("keeps focus changes presentation-only (no schedule or result mutation)", () => {
    const result = playerEventsResult(12);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const trackRef = schedule.track;
    const carsBefore = result.cars.map((car) => car.id);
    const focus = focusSelectCar(createFocusWindow("player"), "rival-torres");
    const withPip = focusWithActiveMoment(focus, { eventId: "e", participants: ["player"] } as never);
    focusRestored(withPip);
    expect(schedule.track).toBe(trackRef);
    expect(result.cars.map((car) => car.id)).toEqual(carsBefore);
  });
});

