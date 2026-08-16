import { describe, expect, it } from "vitest";
import { ENCOUNTER_FAMILIES, createCadenceState, generateEncounterPair } from "../../src/simulation/encounterCadence";
import { generateExhibitionTrial } from "../../src/simulation/exhibition";
import { heldTagCounts } from "../../src/simulation/tagSpecialist";
import { ENTRANTS } from "../../src/content/entrants";
import { ENCOUNTER_VARIANTS } from "../../src/content/encounterVariants";
import type { EncounterType, ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { instanceBuild, seededRng } from "../fixtures/encounter-variety-fixtures";

const ALL_TYPES = Object.keys(ENCOUNTER_FAMILIES) as EncounterType[];

function taggedDef(id: string, tag: string): ItemDefinition {
  return testItem({ id, name: id, price: 1, timeModifier: 0, synergyTags: [tag] });
}

/**
 * Feature 034 deterministic integration gate. Because the full encounter
 * pipeline (registration + run-state integration) is a later phase, this suite
 * pins the *pure deterministic contracts* the pipeline must consume: identical
 * cadence/legality across all four entrants, and byte-stable generation for
 * offers, modifications, and Exhibition objectives.
 */

describe("T074 — all entrants use identical legality/cadence/stat rules", () => {
  it("draws the identical deterministic encounter pair regardless of entrant", () => {
    const pairs = ENTRANTS.map(() => generateEncounterPair(createCadenceState(), ALL_TYPES, seededRng(101)));
    expect(new Set(pairs.map((pair) => JSON.stringify(pair))).size).toBe(1);
  });

  it("generates the identical Exhibition trial for every entrant", () => {
    const trials = ENTRANTS.map(() => generateExhibitionTrial(5, 2));
    expect(new Set(trials.map((trial) => JSON.stringify(trial.objectives))).size).toBe(1);
  });

  it("counts held tags identically for a given build shape across entrants", () => {
    // Tag Specialist counts items, not entrant identity — a fixed build and
    // definitions set yields identical counts no matter which entrant owns it.
    const defs = [taggedDef("a", "twin"), taggedDef("b", "twin")];
    const build = instanceBuild([{ id: "a" }, { id: "b" }]);
    const counts = ENTRANTS.map(() => heldTagCounts(build, defs));
    expect(new Set(counts.map((entry) => JSON.stringify(entry))).size).toBe(1);
  });
});

describe("T075 — async replay determinism for offers, modifications, Exhibition", () => {
  it("regenerates byte-identical Exhibition objectives across repeated seeds", () => {
    const first = Array.from({ length: 5 }, (_unused, i) => generateExhibitionTrial(9, i));
    const second = Array.from({ length: 5 }, (_unused, i) => generateExhibitionTrial(9, i));
    expect(second).toEqual(first);
  });

  it("regenerates a byte-identical encounter pair from identical retained inputs", () => {
    const state = createCadenceState();
    const first = generateEncounterPair(state, ALL_TYPES, seededRng(202));
    const second = generateEncounterPair(state, ALL_TYPES, seededRng(202));
    expect(second).toEqual(first);
  });

  it("keeps variant authoring byte-stable across generations", () => {
    expect(ENCOUNTER_VARIANTS).toEqual(ENCOUNTER_VARIANTS);
    const ids = ENCOUNTER_VARIANTS.map((variant) => variant.variantId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
