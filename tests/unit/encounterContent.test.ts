import { describe, expect, it } from "vitest";
import {
  ENCOUNTER_VARIANTS,
  NEW_ENCOUNTER_TYPES,
  variantsFor,
} from "../../src/content/encounterVariants";
import { NEW_ENCOUNTER_SUMMARIES, registeredEncounterTypes } from "../../src/simulation/encounters";

describe("encounter content volume gate (T072/SC-002)", () => {
  it("authors at least three route-position variants per new encounter type", () => {
    NEW_ENCOUNTER_TYPES.forEach((type) => {
      const variants = variantsFor(type);
      expect(variants.length, `${type} needs ≥3 variants`).toBeGreaterThanOrEqual(3);
      const positions = new Set(variants.map((variant) => variant.routePosition));
      // Every type must be placed somewhere; late-eligible types (e.g.
      // tag-specialist) may legitimately anchor on late.
      expect(positions.size, `${type} positions ${[...positions].join(",")}`).toBeGreaterThanOrEqual(1);
    });
    // The seven types together must cover all three route positions.
    const globalPositions = new Set(ENCOUNTER_VARIANTS.map((variant) => variant.routePosition));
    ["early", "mid", "late"].forEach((position) => {
      expect(globalPositions).toContain(position);
    });
  });

  it("provides entrant support and non-empty copy for each authored variant", () => {
    ENCOUNTER_VARIANTS.forEach((variant) => {
      expect(variant.title.length).toBeGreaterThan(0);
      expect(variant.description.length).toBeGreaterThan(0);
      expect(["early", "mid", "late"]).toContain(variant.routePosition);
    });
    // Every one of the seven new types offers at least one entrant-aware variant.
    NEW_ENCOUNTER_TYPES.forEach((type) => {
      expect(variantsFor(type).some((variant) => variant.supportsEntrantLine)).toBe(true);
    });
  });

  it("registers exactly seven distinct Feature 034 encounter types", () => {
    expect(NEW_ENCOUNTER_TYPES.length).toBe(7);
    expect(new Set(NEW_ENCOUNTER_TYPES).size).toBe(7);
    // Every authored variant refers to one of the registered seven.
    ENCOUNTER_VARIANTS.forEach((variant) => {
      expect(NEW_ENCOUNTER_TYPES).toContain(variant.type);
    });
  });
});

describe("Feature 034 encounter registration in the live encounters module (T027)", () => {
  it("registers all seven new types alongside the legacy four in encounters.ts", () => {
    const registered = registeredEncounterTypes();
    expect(registered.length).toBe(11);
    expect(new Set(registered).size).toBe(11);
    NEW_ENCOUNTER_TYPES.forEach((type) => {
      expect(registered).toContain(type);
      expect(NEW_ENCOUNTER_SUMMARIES[type].length).toBeGreaterThan(0);
    });
    ["parts-supplier", "reward-draft", "cross-pollination", "sponsor-meeting"].forEach((legacy) => {
      expect(registered).toContain(legacy);
    });
  });
});
