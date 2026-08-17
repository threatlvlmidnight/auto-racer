import { describe, expect, it, vi } from "vitest";
import {
  buildCircuitVisualModel,
  buildSpectacleCandidates,
  completeActiveSpectacle,
  createFocusWindow,
  createSpectaclePresentationState,
  focusRestored,
  focusSelectCar,
  focusWithActiveMoment,
  pipBudgetForLapCount,
  selectSpectacleMoments,
  selectSpectacleMomentsFromResult,
  spectacleActivated,
  spectacleEventCrossed,
  spectacleMomentFromEvent,
  spectacleMomentModel,
  spectacleTerminalReport,
  type SpectacleMoment,
} from "../../src/scenes/raceSpectaclePresentation";
import * as tracksModule from "../../src/simulation/tracks";
import {
  eventlessSpectacleResult,
  playerEventsResult,
  playerIncidentEvent,
  playerOvertakeCompletedEvent,
  rivalOnlyResult,
  simultaneousResult,
  spectacleEvent,
  spectacleResultWithEvents,
  spectacleTrack,
} from "../fixtures/race-spectacle-fixtures";

function moment(eventId: string, kind: SpectacleMoment["kind"], boundaryId: string): SpectacleMoment {
  return {
    eventId,
    boundaryId,
    kind,
    participants: ["player", "rival-torres"],
    driverLabel: "Player",
    headline: kind,
    consequence: "retained",
    priority: 1,
    orderSeq: 0,
    status: "pending",
  };
}

describe("Feature 036 PiP budget (T006/T008)", () => {
  it("maps the exact 8→2,10→2,12→3,14→4,16→4 budget table", () => {
    expect(pipBudgetForLapCount(8)).toBe(2);
    expect(pipBudgetForLapCount(10)).toBe(2);
    expect(pipBudgetForLapCount(12)).toBe(3);
    expect(pipBudgetForLapCount(14)).toBe(4);
    expect(pipBudgetForLapCount(16)).toBe(4);
  });

  it("rejects unsupported lap counts rather than extrapolating", () => {
    for (const lapCount of [7, 9, 11, 13, 15, 20]) {
      expect(() => pipBudgetForLapCount(lapCount)).toThrow(RangeError);
    }
  });
});

describe("Feature 036 circuit visual model (T012/T015)", () => {
  it("preserves every retained path point and never calls track generation", () => {
    const track = spectacleTrack(42);
    const spy = vi.spyOn(tracksModule, "generateTrack");
    const model = buildCircuitVisualModel(track);
    expect(model.trackId).toBe(track.id);
    expect(model.points).toEqual(track.points);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("derives bounds, road layers, and start/finish across retained shapes", () => {
    for (const seed of [7, 31, 97]) {
      const track = spectacleTrack(seed);
      const model = buildCircuitVisualModel(track);
      expect(model.roadLayers.length).toBeGreaterThanOrEqual(3);
      expect(model.landmarks.length).toBeGreaterThanOrEqual(3);
      expect(model.startFinish).not.toBeNull();
      for (const point of track.points) {
        expect(point.x).toBeGreaterThanOrEqual(model.bounds.minX);
        expect(point.x).toBeLessThanOrEqual(model.bounds.maxX);
        expect(point.y).toBeGreaterThanOrEqual(model.bounds.minY);
        expect(point.y).toBeLessThanOrEqual(model.bounds.maxY);
      }
    }
  });
});

describe("Feature 036 eligibility and selection (T022/T027)", () => {
  it("selects only player-involved eligible events and respects the budget", () => {
    const result = playerEventsResult(12);
    const selected = selectSpectacleMomentsFromResult(result);
    expect(selected.length).toBeLessThanOrEqual(pipBudgetForLapCount(12));
    expect(selected.length).toBe(3);
    // Highest display priority first: the signature activation.
    expect(selected[0].eventId).toBe("spec-signature-activation-lap-11");
    for (const momentItem of selected) {
      expect(momentItem.participants).toContain("player");
    }
  });

  it("yields nothing for eventless and rival-only races", () => {
    expect(selectSpectacleMomentsFromResult(eventlessSpectacleResult(12))).toEqual([]);
    expect(selectSpectacleMomentsFromResult(rivalOnlyResult(12))).toEqual([]);
  });

  it("does not alter Feature 033 EmphasisClass while inspecting events", () => {
    const result = playerEventsResult(12);
    const before = result.events.map((event) => event.emphasis);
    buildSpectacleCandidates(result, "player");
    selectSpectacleMomentsFromResult(result);
    expect(result.events.map((event) => event.emphasis)).toEqual(before);
  });

  it("resolves simultaneous boundaries deterministically", () => {
    const result = simultaneousResult(8);
    const selected = selectSpectacleMoments(buildSpectacleCandidates(result), 8);
    const boundaries = selected.map((m) => m.boundaryId);
    expect(new Set(boundaries).size).toBe(boundaries.length);
    expect(selected.length).toBeLessThanOrEqual(pipBudgetForLapCount(8));
  });
});
describe("Feature 036 moment reducer (T023/T028)", () => {
  it("activates a pending moment exactly once and completes to rendered", () => {
    const events = spectacleResultWithEvents(12, [
      playerOvertakeCompletedEvent("lap-7"),
      playerIncidentEvent("lap-3"),
    ]);
    const selected = selectSpectacleMomentsFromResult(events);
    let state = createSpectaclePresentationState({ moments: selected, playerCarId: "player" });
    state = spectacleEventCrossed(state, selected[0].eventId);
    expect(state.selected.get(selected[0].eventId)?.status).toBe("active");
    expect(state.focus.activeMomentId).toBe(selected[0].eventId);
    state = completeActiveSpectacle(state);
    expect(state.selected.get(selected[0].eventId)?.status).toBe("rendered");
    expect(state.focus.activeMomentId).toBeNull();
    // Terminal cannot reactivate.
    state = spectacleEventCrossed(state, selected[0].eventId);
    expect(state.selected.get(selected[0].eventId)?.status).toBe("rendered");
  });

  it("suppresses a colliding selected moment while another PiP is active", () => {
    const events = spectacleResultWithEvents(8, [
      playerOvertakeCompletedEvent("lap-4"),
      playerIncidentEvent("lap-5"),
    ]);
    const selected = selectSpectacleMomentsFromResult(events);
    expect(selected).toHaveLength(2);
    let state = createSpectaclePresentationState({ moments: selected, playerCarId: "player" });
    const first = selected[0];
    const second = selected[1];
    state = spectacleEventCrossed(state, first.eventId);
    expect(state.selected.get(first.eventId)?.status).toBe("active");
    state = spectacleEventCrossed(state, second.eventId);
    expect(state.selected.get(second.eventId)?.status).toBe("suppressed");
    state = completeActiveSpectacle(state);
    expect(state.selected.get(first.eventId)?.status).toBe("rendered");
    // The suppressed moment never revives.
    state = spectacleEventCrossed(state, second.eventId);
    expect(state.selected.get(second.eventId)?.status).toBe("suppressed");
  });

  it("ignores non-selected event ids entirely", () => {
    let state = createSpectaclePresentationState({ moments: [], playerCarId: "player" });
    state = spectacleEventCrossed(state, "never-selected");
    expect(state.selected.size).toBe(0);
    expect(state.focus.activeMomentId).toBeNull();
  });

  it("reports stable terminal-status tuples", () => {
    let state = createSpectaclePresentationState({
      moments: [moment("e1", "signature-activation", "lap-11")],
      playerCarId: "player",
    });
    state = completeActiveSpectacle(spectacleEventCrossed(state, "e1"));
    expect(spectacleTerminalReport(state)).toEqual([["e1", "rendered"]]);
  });
});

describe("Feature 036 reduced-motion PiP model (T024/T029)", () => {
  it("retains driver, event, and consequence text under reduced motion", () => {
    const events = spectacleResultWithEvents(12, [playerIncidentEvent("lap-4")]);
    const selected = selectSpectacleMomentsFromResult(events);
    const animated = spectacleMomentModel(selected[0], false);
    const reduced = spectacleMomentModel(selected[0], true);
    expect(reduced.mode).toBe("static");
    expect(reduced.reducedMotion).toBe(true);
    expect(reduced.eventId).toBe(animated.eventId);
    expect(reduced.driverLabel).toBe(animated.driverLabel);
    expect(reduced.headline).toBe(animated.headline);
    expect(reduced.consequence).toBe(animated.consequence);
    expect(reduced.driverLabel.trim().length).toBeGreaterThan(0);
    expect(reduced.headline.trim().length).toBeGreaterThan(0);
  });
});

describe("Feature 036 focus window (T034/T037)", () => {
  it("defaults to the player and supports named-car selection", () => {
    const focus = createFocusWindow("player");
    expect(focus.selectedCarId).toBe("player");
    expect(focus.displayedCarIds).toEqual(["player"]);
    const selected = focusSelectCar(focus, "rival-torres");
    expect(selected.selectedCarId).toBe("rival-torres");
    expect(selected.displayedCarIds).toEqual(["rival-torres"]);
  });

  it("temporarily overrides focus for an active PiP and restores the selection", () => {
    const focus = focusSelectCar(createFocusWindow("player"), "rival-torres");
    const pip = moment("e2", "overtake-completed", "lap-7");
    const overridden = focusWithActiveMoment(focus, pip);
    expect(overridden.activeMomentId).toBe("e2");
    expect(overridden.displayedCarIds).toEqual(pip.participants);
    const restored = focusRestored(overridden);
    expect(restored.activeMomentId).toBeNull();
    expect(restored.selectedCarId).toBe("rival-torres");
    expect(restored.displayedCarIds).toEqual(["rival-torres"]);
  });
});

describe("Feature 036 evidence adaptation semantics (T050)", () => {
  const roster = (carId: string) =>
    ({ player: "Ava", "rival-torres": "Torres", "rival-kestrel": "Kestrel" })[carId] ?? carId;

  it("describes a player-as-actor signature, pass, defense, and incident exactly", () => {
    const signature = spectacleMomentFromEvent(
      spectacleEvent({ kind: "signature-activation", boundaryId: "lap-3", actorId: "player", before: { position: 4, time: 30 } }),
      "player",
      roster,
    );
    expect(signature.driverLabel).toBe("Ava");
    expect(signature.headline).toBe("Signature activated");
    expect(signature.consequence).toBe("Fires signature at P4.");

    const pass = spectacleMomentFromEvent(
      spectacleEvent({ kind: "overtake-completed", boundaryId: "lap-5", actorId: "player", targetId: "rival-torres", before: { position: 3, time: 40 }, after: { position: 2, time: 39.5 } }),
      "player",
      roster,
    );
    expect(pass.driverLabel).toBe("Ava");
    expect(pass.headline).toBe("Player completes a pass");
    expect(pass.consequence).toBe("Moves up to P2 (from P3).");

    const defend = spectacleMomentFromEvent(
      spectacleEvent({ kind: "defense", boundaryId: "lap-6", actorId: "player", targetId: "rival-torres", before: { position: 3, time: 46 } }),
      "player",
      roster,
    );
    expect(defend.headline).toBe("Player defends");
    expect(defend.consequence).toBe("Holds position at P3.");

    const incident = spectacleMomentFromEvent(
      spectacleEvent({ kind: "incident", boundaryId: "lap-7", actorId: "player", incident: { timeLossSeconds: 1.2, riskBand: "guarded" } }),
      "player",
      roster,
    );
    expect(incident.headline).toBe("Player incident");
    expect(incident.consequence).toBe("Costs 1.2s.");
  });

  it("describes a player-as-target (passed, move countered) without inventing a P#", () => {
    const passed = spectacleMomentFromEvent(
      spectacleEvent({ kind: "overtake-completed", boundaryId: "lap-5", actorId: "rival-kestrel", targetId: "player", before: { position: 2, time: 40 }, after: { position: 1, time: 39.5 } }),
      "player",
      roster,
    );
    expect(passed.headline).toBe("Player is passed");
    expect(passed.consequence).toBe("Overtaken by Kestrel.");

    const countered = spectacleMomentFromEvent(
      spectacleEvent({ kind: "defense", boundaryId: "lap-6", actorId: "rival-torres", targetId: "player", before: { position: 2, time: 46 } }),
      "player",
      roster,
    );
    expect(countered.headline).toBe("Player's move is countered");
    expect(countered.consequence).toBe("Countered by Torres.");
  });
});

describe("Feature 036 suppressed arrival cannot activate the timer (T052)", () => {
  it("spectacleActivated is true only when the active moment actually changes", () => {
    const events = spectacleResultWithEvents(12, [
      playerOvertakeCompletedEvent("lap-4"),
      playerIncidentEvent("lap-5"),
    ]);
    const selected = selectSpectacleMomentsFromResult(events);
    const state = createSpectaclePresentationState({ moments: selected, playerCarId: "player" });
    const activated = spectacleEventCrossed(state, selected[0].eventId);
    expect(spectacleActivated(state, activated)).toBe(true);
    // A colliding arrival is suppressed and does NOT change the active moment.
    const suppressed = spectacleEventCrossed(activated, selected[1].eventId);
    expect(spectacleActivated(activated, suppressed)).toBe(false);
    expect(suppressed.focus.activeMomentId).toBe(activated.focus.activeMomentId);
    const done = completeActiveSpectacle(suppressed);
    expect(done.focus.activeMomentId).toBeNull();
    expect(spectacleActivated(suppressed, done)).toBe(true);
  });
});

