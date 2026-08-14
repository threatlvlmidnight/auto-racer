import { describe, expect, it } from "vitest";
import { createRunForEntrant } from "../../src/simulation/run";
import { confirmWorldTourDestination } from "../../src/simulation/championship";
import { destinationChoiceModel, worldTourItineraryModel } from "../../src/scenes/worldTourPresentation";

function run() {
  const result = createRunForEntrant({ entrantId: "evelyn-mercer", runId: "tour-ui", seed: 1901, rng: () => 0 });
  if (result.kind !== "created") throw new Error("run creation failed");
  return result.run;
}

describe("world tour presentation", () => {
  it("shows two disclosed destination cards without exact opponents or predictions", () => {
    const model = destinationChoiceModel(run());
    expect(model.status).toBe("available");
    expect(model.cards).toHaveLength(2);
    const text = JSON.stringify(model).toLowerCase();
    expect(text).toContain("local race");
    expect(text).toContain("championship race");
    expect(text).not.toContain("prediction");
    expect(text).not.toContain("opponent stats");
  });

  it("keeps Paris visible and locked before the first selected leg", () => {
    const initial = run();
    expect(worldTourItineraryModel(initial)!.legs).toEqual([
      expect.objectContaining({ regionId: "paris-exhibition", state: "locked" }),
    ]);
    const selected = initial.worldTour!.destinationOffer!.options[0];
    const next = { ...initial, worldTour: confirmWorldTourDestination(initial.id, initial.worldTour!, selected) };
    expect(worldTourItineraryModel(next)!.legs).toEqual([
      expect.objectContaining({ regionId: selected, state: "current" }),
      expect.objectContaining({ regionId: "paris-exhibition", state: "locked" }),
    ]);
    expect(worldTourItineraryModel(next)!.currentStages).toHaveLength(8);
  });
});
