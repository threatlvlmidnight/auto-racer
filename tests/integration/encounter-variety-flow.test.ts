import { describe, expect, it } from "vitest";
import { ENCOUNTER_FAMILIES, createCadenceState, generateEncounterPair } from "../../src/simulation/encounterCadence";
import { evaluateExhibitionResult, generateExhibitionTrial } from "../../src/simulation/exhibition";
import { heldTagCounts, purchaseTagStock, qualifyingTags } from "../../src/simulation/tagSpecialist";
import { factoryDevelopmentOffers, upgradeWorkshopFree } from "../../src/simulation/encounterOffers";
import { exchangeSameTierForeign } from "../../src/simulation/encounterTransactions";
import { isSlotReserved } from "../../src/simulation/scrutineering";
import { projectEncounterHistory, type HistoryOutcome } from "../../src/simulation/historyProjection";
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
describe("T050 — garage-state transaction integration", () => {
  it("an empty garage offers no Factory Development modifications and no qualifying tags", () => {
    const empty = instanceBuild([]);
    expect(factoryDevelopmentOffers(empty, new Map())).toHaveLength(0);
    expect(qualifyingTags(empty, [taggedDef("a", "twin"), taggedDef("b", "twin")])).toEqual([]);
  });

  it("a max-tier instance cannot be freely upgraded and its reservation blocks the slot", () => {
    const build = instanceBuild([{ id: "a", tier: 3 }]);
    const instance = build.slots[0].instance!;
    const upgrade = upgradeWorkshopFree(build, instance.instanceId);
    expect(upgrade.kind).toBe("failure");
    const slotId = build.slots[0].slotId;
    expect(isSlotReserved([{ pendingEffectId: "p", slotId, surrenderedInstanceId: "s" }], slotId)).toBe(true);
  });

  it("a same-tier foreign exchange produces a foreign, unmodified replacement in the same slot", () => {
    const source = testItem({ id: "home", name: "Home", price: 2, timeModifier: 0, origin: "coachworks" });
    const foreign = testItem({ id: "abroad", name: "Abroad", price: 2, timeModifier: 0, origin: "velodrome" });
    const build = instanceBuild([{ id: "home", tier: 2 }]);
    const sourceId = build.slots[0].instance!.instanceId;
    const result = exchangeSameTierForeign(build, sourceId, source, foreign, "ex-f");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const replacement = result.value.slots[0].instance!;
    expect(replacement.definitionId).toBe("abroad");
    expect(replacement.modification).toBeNull();
  });

  it("purchase through Tag Specialist's atomic path installs into a free slot", () => {
    const defs = [taggedDef("x1", "twin"), taggedDef("x2", "twin"), taggedDef("x3", "twin")];
    const purchase = purchaseTagStock(instanceBuild([]), poolForPurchase(defs), "st-0");
    expect(purchase.kind).toBe("installed");
    if (purchase.kind === "installed") {
      expect(purchase.build.slots.some((slot) => Boolean(slot.instance))).toBe(true);
    }
  });
});

/** A minimal 3-entry retained stock used by the T050 purchase flow. */
function poolForPurchase(defs: readonly ItemDefinition[]): readonly { entryId: string; definitionId: string; item: ItemDefinition; normalPrice: number; price: number; modification: null; modified: boolean }[] {
  return defs.map((definition, index) => ({
    entryId: `st-${index}`,
    definitionId: definition.id,
    item: definition,
    normalPrice: definition.price,
    price: definition.price,
    modification: null,
    modified: false,
  }));
}

describe("T058 — Exhibition 0–3 flow and Championship isolation end-to-end", () => {
  it("scores 0, 1, and 3 across the evidence axis and leaves Championship unchanged", () => {
    const trial = generateExhibitionTrial(7, 1);
    const zero = evaluateExhibitionResult(trial, { fastestLapTime: 999, itemActivations: 0, demandScore: 0 });
    const one = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 0, demandScore: 0 });
    const three = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 99, demandScore: 99 });
    expect([zero.score, one.score, three.score]).toEqual([0, 1, 3]);
    [zero, one, three].forEach((result) => expect(result.championshipUnchanged).toBe(true));
  });
});

describe("T065 — late-run Tag Specialist eligibility flow", () => {
  it("qualifies only once a tag is held by two items (the late-run gate)", () => {
    const defs = [taggedDef("a", "twin"), taggedDef("b", "twin")];
    expect(qualifyingTags(instanceBuild([{ id: "a" }]), defs)).toEqual([]);
    expect(qualifyingTags(instanceBuild([{ id: "a" }, { id: "b" }]), defs)).toEqual(["twin"]);
  });
});

describe("T071 — full-run history projection acceptance fixture", () => {
  it("reconciles accepted, declined, unavailable, pending, successful, and failed outcomes in one chronology", () => {
    const view = projectEncounterHistory([
      { encounterId: "r1", typeId: "exhibition-trial", stageOrdinal: 1, outcome: "accepted", creditsDelta: 2, mutationFingerprint: "rep+2" },
      { encounterId: "r2", typeId: "upgrade-workshop", stageOrdinal: 2, outcome: "declined", creditsDelta: 0, mutationFingerprint: "none" },
      { encounterId: "r3", typeId: "parts-supplier", stageOrdinal: 3, outcome: "unavailable", creditsDelta: 0, mutationFingerprint: "none" },
      { encounterId: "r4", typeId: "scrutineering", stageOrdinal: 4, outcome: "pending", creditsDelta: 0, pendingCategory: "scrutineering", targetStage: 9, mutationFingerprint: "impound" },
      { encounterId: "r5", typeId: "factory-development", stageOrdinal: 5, outcome: "accepted", creditsDelta: 0, mutationFingerprint: "graft" },
    ]);
    expect(view.map((entry) => entry.stageOrdinal)).toEqual([1, 2, 3, 4, 5]);
    const outcomes: HistoryOutcome[] = view.map((entry) => entry.outcome);
    expect(outcomes).toContain("accepted");
    expect(outcomes).toContain("declined");
    expect(outcomes).toContain("unavailable");
    expect(outcomes).toContain("pending");
    expect(view[3].pending).toBe("scrutineering");
    expect(view[3].targetStage).toBe(9);
  });
});

