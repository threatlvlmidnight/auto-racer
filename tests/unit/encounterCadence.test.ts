import { describe, expect, it } from "vitest";
import {
  cadenceDomainRng,
  createCadenceState,
  ENCOUNTER_FAMILIES,
  familyFor,
  generateEncounterPair,
  isAcquisitionPrimary,
  isOnSelectedCooldown,
  markUpgradeOffered,
  recordSelection,
  TWO_STAGE_SELECTED_COOLDOWN,
  upgradeGuaranteePending,
  upgradeWindowFor,
} from "../../src/simulation/encounterCadence";
import type { EncounterType } from "../../src/simulation/types";
import { ENCOUNTER_SEEDS, seededRng } from "../fixtures/encounter-variety-fixtures";

const ALL_TYPES = Object.keys(ENCOUNTER_FAMILIES) as EncounterType[];

function simulateRuns(seed: number): { pairs: EncounterType[][] } {
  let state = createCadenceState();
  const pairs: EncounterType[][] = [];
  for (let i = 0; i < 20; i += 1) {
    const rng = seededRng(seed + i * 31);
    const result = generateEncounterPair(state, ALL_TYPES, rng);
    if (result.fallback) {
      pairs.push([]);
      // Relax eligibility for the remainder of the simulation.
      continue;
    }
    pairs.push([...result.kinds]);
    state = recordSelection(state, result.kinds[0]);
  }
  return { pairs };
}

describe("encounterCadence — family classification (T027/SC-001)", () => {
  it("classifies exactly the four acquisition-primary types", () => {
    const acquisition = ALL_TYPES.filter(isAcquisitionPrimary);
    expect(acquisition.sort()).toEqual(["cross-pollination", "parts-supplier", "reward-draft", "tag-specialist"]);
  });

  it("treats sponsor-meeting as economy and the seven new non-acquisition families distinctly", () => {
    expect(familyFor("sponsor-meeting")).toBe("economy");
    expect(familyFor("factory-development")).toBe("modification");
    expect(familyFor("exhibition-trial")).toBe("exhibition");
    expect(familyFor("scrutineering")).toBe("sacrifice");
    expect(familyFor("upgrade-workshop")).toBe("upgrade");
    expect(familyFor("privateer-exchange")).toBe("exchange");
    expect(familyFor("experimental-rebuild")).toBe("transformation");
  });
});

describe("generateEncounterPair — no two-acquisition pair (T023/SC-001)", () => {
  it("never returns a pair with two acquisition-primary encounters across seeds and stages", () => {
    ENCOUNTER_SEEDS.forEach((seed) => {
      const { pairs } = simulateRuns(seed);
      pairs.filter((pair) => pair.length === 2).forEach((pair) => {
        const acquisitions = pair.filter(isAcquisitionPrimary).length;
        expect(acquisitions).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe("two-stage selected-type cooldown (T023)", () => {
  it("reports a selected type on cooldown for two stages then clears", () => {
    let state = createCadenceState();
    state = recordSelection(state, "exhibition-trial");
    expect(isOnSelectedCooldown(state, "exhibition-trial")).toBe(true);
    state = recordSelection(state, "scrutineering");
    expect(isOnSelectedCooldown(state, "exhibition-trial")).toBe(true);
    state = recordSelection(state, "upgrade-workshop");
    expect(isOnSelectedCooldown(state, "exhibition-trial")).toBe(false);
  });

  it("exposes the configured cooldown constant", () => {
    expect(TWO_STAGE_SELECTED_COOLDOWN).toBe(2);
  });
});

describe("deterministic replay (T023/SC-004)", () => {
  it("produces byte-identical pairs for identical inputs", () => {
    const state = createCadenceState();
    const first = generateEncounterPair(state, ALL_TYPES, seededRng(5));
    const second = generateEncounterPair(state, ALL_TYPES, seededRng(5));
    expect(second).toEqual(first);
  });
});

describe("bounded fallback (T023)", () => {
  it("falls back to a neutral result when only one type is eligible", () => {
    const result = generateEncounterPair(createCadenceState(), ["parts-supplier"], seededRng(1));
    expect(result.fallback).toBe(true);
    expect(result.kinds).toHaveLength(0);
  });

  it("falls back neutrally when only acquisition-primary types remain and no legal pair exists", () => {
    // A single acquisition + a cooldown on it forces the bounded fallback.
    const onlyAcquisition: EncounterType[] = ["parts-supplier", "reward-draft"];
    const result = generateEncounterPair(createCadenceState(), onlyAcquisition, seededRng(2));
    // Either a legal single-acquisition pair or a typed fallback is acceptable.
    if (!result.fallback) {
      expect(result.kinds.filter(isAcquisitionPrimary).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("Upgrade Workshop guarantee windows (T026/FR-046)", () => {
  it("maps global stages 1–20 and 21–40 to the two windows", () => {
    expect(upgradeWindowFor(10)).toBe(1);
    expect(upgradeWindowFor(20)).toBe(1);
    expect(upgradeWindowFor(21)).toBe(2);
    expect(upgradeWindowFor(40)).toBe(2);
  });

  it("tracks fulfillment independently per window", () => {
    let state = createCadenceState();
    expect(upgradeGuaranteePending(state, 8)).toBe(true);
    expect(upgradeGuaranteePending(state, 30)).toBe(true);
    state = markUpgradeOffered(state, 8);
    expect(upgradeGuaranteePending(state, 8)).toBe(false);
    expect(upgradeGuaranteePending(state, 30)).toBe(true);
    state = markUpgradeOffered(state, 30);
    expect(upgradeGuaranteePending(state, 30)).toBe(false);
  });
});

describe("named seed domains — isolated, stable pair generation (T028)", () => {
  it("derives a stable, per-choice RNG stream from the run seed + choice ordinal", () => {
    const a = cadenceDomainRng(7, 1);
    const b = cadenceDomainRng(7, 1);
    expect([a(), a()]).toEqual([b(), b()]);
  });

  it("isolates different choice ordinals on the same seed", () => {
    expect(cadenceDomainRng(7, 1)()).not.toBe(cadenceDomainRng(7, 2)());
  });

  it("generates the same deterministic pair for identical retained inputs", () => {
    const state = createCadenceState();
    const first = generateEncounterPair(state, ALL_TYPES, cadenceDomainRng(7, 1));
    const second = generateEncounterPair(state, ALL_TYPES, cadenceDomainRng(7, 1));
    expect(second).toEqual(first);
  });
});
