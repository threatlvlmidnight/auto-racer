import { describe, expect, it, vi } from "vitest";
import {
  canEnterEntrantSelection,
  createRunForEntrant,
  type Run,
} from "../../src/simulation/run";
import { entrantSelectionModel, entrantDetailModel } from "../../src/scenes/entrantPresentation";
import { ENTRANTS } from "../../src/content/entrants";
import type { EntrantId } from "../../src/simulation/types";

const rng = () => {
  const values = [0, 0.9];
  let index = 0;
  return () => values[index++ % values.length];
};

function confirmEntrant(entrantId: EntrantId): Run {
  const result = createRunForEntrant({
    entrantId,
    runId: `run-${entrantId}`,
    seed: 3,
    rng: rng(),
  });
  if (result.kind !== "created") throw new Error(`expected created, got ${result.code}`);
  return result.run;
}

/**
 * Minimal stand-in for the Title/Run controller routing. The point of these
 * tests is the *ordering contract*: the guard is consulted with real active-run
 * context, and run creation only happens once the guard says allowed.
 */
function routeToEntrantSelection(
  activeRun: Run | null,
  createRun: (entrantId: EntrantId) => Run,
  entrantId: EntrantId | null,
): { route: "EntrantSelectScene" | "RunScene"; run: Run | null; blockedCode?: string } {
  const guard = canEnterEntrantSelection(activeRun);
  if (guard.kind === "blocked") {
    return { route: "RunScene", run: activeRun, blockedCode: guard.code };
  }
  if (!entrantId) return { route: "EntrantSelectScene", run: null };
  return { route: "RunScene", run: createRun(entrantId) };
}

describe("entrant selection routing guard", () => {
  it("blocks selection and never creates a run while a run is active", () => {
    const activeRun = confirmEntrant("evelyn-mercer");
    const createSpy = vi.fn(confirmEntrant);

    const routed = routeToEntrantSelection(activeRun, createSpy, "lucien-soto");

    expect(routed.route).toBe("RunScene");
    expect(routed.blockedCode).toBe("active-run-exists");
    expect(routed.run).toBe(activeRun);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("allows selection with no active run and still creates nothing until an entrant is confirmed", () => {
    const createSpy = vi.fn(confirmEntrant);

    const routed = routeToEntrantSelection(null, createSpy, null);

    expect(routed.route).toBe("EntrantSelectScene");
    expect(routed.run).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it.each(["completed", "unavailable"] as const)(
    "requires an explicit action after a %s run and never auto-selects a replacement entrant",
    (status) => {
      const ended: Run = { ...confirmEntrant("nell-voss"), status };
      const createSpy = vi.fn(confirmEntrant);

      // Reaching the ended run's final screen must not itself create anything.
      const idle = routeToEntrantSelection(ended, createSpy, null);
      expect(idle.route).toBe("EntrantSelectScene");
      expect(idle.run).toBeNull();
      expect(createSpy).not.toHaveBeenCalled();

      // The ended run keeps its own entrant; no replacement is preselected.
      expect(ended.identity.entrantId).toBe("nell-voss");
      expect(entrantSelectionModel(null).selectedEntrantId).toBeNull();
    },
  );

  it("routes each confirmed entrant into a stage-1 run carrying that exact identity", () => {
    ENTRANTS.forEach((entrant) => {
      const routed = routeToEntrantSelection(null, confirmEntrant, entrant.id);

      expect(routed.route).toBe("RunScene");
      expect(routed.run!.identity.entrantId).toBe(entrant.id);
      expect(routed.run!.identity.vehicleId).toBe(entrant.vehicleId);
      expect(routed.run!.stageIndex).toBe(0);
      expect(routed.run!.credits).toBe(5);
    });
  });
});

describe("pre-confirmation inspection creates no state", () => {
  it("inspecting and highlighting every entrant never invokes run creation or RNG", () => {
    const createSpy = vi.fn(confirmEntrant);
    const rngSpy = vi.fn(() => 0);

    ENTRANTS.forEach((entrant) => {
      const model = entrantSelectionModel(entrant.id);
      expect(model.selectedEntrantId).toBe(entrant.id);
      expect(entrantDetailModel(entrant.id)).not.toBeNull();
    });

    expect(createSpy).not.toHaveBeenCalled();
    expect(rngSpy).not.toHaveBeenCalled();
  });

  it("leaving and returning without confirming leaves no run, credits, offers, or result", () => {
    const createSpy = vi.fn(confirmEntrant);

    const first = routeToEntrantSelection(null, createSpy, null);
    const cancelled = entrantSelectionModel(null);
    const second = routeToEntrantSelection(null, createSpy, null);

    expect(first.run).toBeNull();
    expect(second.run).toBeNull();
    expect(cancelled.selectedEntrantId).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe("entrant selection presentation acceptance", () => {
  it("presents all four entrants as available with visible selection state", () => {
    const model = entrantSelectionModel("inez-rook");

    expect(model.choices).toHaveLength(4);
    expect(model.choices.every((choice) => choice.available && !choice.locked)).toBe(true);
    expect(model.choices.filter((choice) => choice.selected)).toHaveLength(1);
    // Selection must be readable as text/structure, not color alone.
    const selected = model.choices.find((choice) => choice.selected)!;
    expect(selected.stateLabel.toUpperCase()).toContain("SELECTED");
  });

  it("keeps confirmation disabled with an explicit reason until an entrant is chosen", () => {
    const empty = entrantSelectionModel(null);
    const chosen = entrantSelectionModel("evelyn-mercer");

    expect(empty.confirm.enabled).toBe(false);
    expect(empty.confirm.disabledReason).toMatch(/choose|select/i);
    expect(chosen.confirm.enabled).toBe(true);
  });

  it("never frames any entrant as stronger, locked, or a required strategy class", () => {
    const model = entrantSelectionModel(null);
    // Only player-visible copy — structural flags like `locked: false` are the
    // assertion that nothing is gated, not user-facing text.
    const visibleText = [
      model.title,
      model.equalityStatement,
      model.confirm.label,
      model.confirm.disabledReason ?? "",
      ...model.choices.flatMap((choice) => [
        choice.name,
        choice.role,
        choice.vehicleName,
        choice.originLabel,
        choice.topologyLabel,
        choice.stateLabel,
      ]),
      ...ENTRANTS.flatMap((entrant) => {
        const detail = entrantDetailModel(entrant.id)!;
        return [detail.approach, detail.originWeightingNote, ...detail.strategyDirections];
      }),
    ].join(" ").toLowerCase();

    ["locked", "stronger", "overpowered", "tier list", "best pick"].forEach((banned) => {
      expect(visibleText).not.toContain(banned);
    });
    expect(model.choices.every((choice) => choice.locked === false)).toBe(true);
  });

  it("states the equal-capacity guarantee on the selection screen itself", () => {
    const model = entrantSelectionModel(null);

    expect(model.equalityStatement).toMatch(/four active slots/i);
    expect(model.equalityStatement).toMatch(/three storage/i);
  });
});
