import { describe, expect, it } from "vitest";
import { encounterTypeView } from "../../src/scenes/encounterPresentation";
import { NEW_ENCOUNTER_SUMMARIES } from "../../src/simulation/encounters";

describe("encounterTypeView — encounter presentation (T021/T029/T045)", () => {
  it("presents interaction, input, cost, and consequence for every new type", () => {
    (Object.keys(NEW_ENCOUNTER_SUMMARIES) as (keyof typeof NEW_ENCOUNTER_SUMMARIES)[]).forEach((type) => {
      const view = encounterTypeView(type, NEW_ENCOUNTER_SUMMARIES[type]);
      expect(view.interaction.length).toBeGreaterThan(0);
      expect(view.requiredInput.length).toBeGreaterThan(0);
      expect(view.cost.length).toBeGreaterThan(0);
      expect(view.consequence.length).toBeGreaterThan(0);
      expect(view.summary).toBe(NEW_ENCOUNTER_SUMMARIES[type]);
      expect(view.family).toBeTruthy();
    });
  });

  it("marks tag-specialist as acquisition-primary (and it cannot pair with another acquisition)", () => {
    expect(encounterTypeView("tag-specialist", NEW_ENCOUNTER_SUMMARIES["tag-specialist"]).acquisitionPrimary).toBe(true);
    expect(encounterTypeView("scrutineering", NEW_ENCOUNTER_SUMMARIES.scrutineering).acquisitionPrimary).toBe(false);
  });

  it("exposes a plain-text interactive/consequence surface without color-only meaning (T067)", () => {
    const view = encounterTypeView("experimental-rebuild", NEW_ENCOUNTER_SUMMARIES["experimental-rebuild"]);
    expect(view.consequence).toMatch(/removed/);
    expect(view.cost).toMatch(/2 credits/);
    expect(view.requiredInput).toMatch(/tier-1 or tier-2/);
  });
});
