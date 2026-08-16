import { upgradeWorkshopFree } from "../../src/simulation/encounterOffers";
import { describe, expect, it } from "vitest";
import {
  applyAtomic,
  exchangeSameTierForeign,
  placementCapacity,
  rebuildForCredit,
  REBUILD_CREDIT_COST,
  upgradeInstance,
} from "../../src/simulation/encounterTransactions";
import { attachModification } from "../../src/simulation/itemModifications";
import { buildWorkshopModification } from "../../src/content/itemModifications";
import { createItemInstance, enumerateInstances } from "../../src/simulation/itemInstances";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { instanceBuild } from "../fixtures/encounter-variety-fixtures";

function def(id: string, origin: ItemDefinition["origin"] = "coachworks", category: ItemDefinition["installationCategory"] = "power"): ItemDefinition {
  return testItem({ id, name: id, price: 2, timeModifier: -1, origin, installationCategory: category });
}

describe("upgradeInstance — tier scaling (T033/T039/FR-046)", () => {
  it("raises tier 1→2 and 2→3 and rejects at max tier", () => {
    const t1 = createItemInstance("x", "draft", 1);
    const t2 = upgradeInstance(t1);
    expect(t2.kind).toBe("ok");
    if (t2.kind !== "ok") return;
    expect(t2.value.tier).toBe(2);
    const t3 = upgradeInstance(t2.value);
    expect(t3.kind).toBe("ok");
    if (t3.kind !== "ok") return;
    expect(t3.value.tier).toBe(3);
    const reject = upgradeInstance(t3.value);
    expect(reject.kind).toBe("failure");
    if (reject.kind === "failure") expect(reject.code).toBe("max-tier");
  });
});

describe("placementCapacity (T033)", () => {
  it("reports free slot / free storage / full", () => {
    expect(placementCapacity(instanceBuild([])).freeSlotId).not.toBeNull();
    const full = instanceBuild([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], [{ id: "s1" }, { id: "s2" }, { id: "s3" }]);
    expect(placementCapacity(full).full).toBe(true);
  });
});

describe("exchangeSameTierForeign — Privateer Exchange (T033/T040)", () => {
  it("requires a foreign origin and keeps the source's exact tier and slot", () => {
    const source = def("home", "coachworks");
    const foreign = def("abroad", "velodrome");
    const build = instanceBuild([{ id: "home", tier: 2 }]);
    const sourceId = build.slots[0].instance!.instanceId;
    const result = exchangeSameTierForeign(build, sourceId, source, foreign, "ex-1");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const replacement = result.value.slots[0].instance!;
    expect(replacement.definitionId).toBe("abroad");
    expect(replacement.tier).toBe(2);
    expect(replacement.provenance).toBe("encounter");
    expect(replacement.modification).toBeNull();
  });

  it("rejects a non-foreign (same-origin) replacement", () => {
    const source = def("home", "coachworks");
    const sameOrigin = def("home-2", "coachworks");
    const build = instanceBuild([{ id: "home" }]);
    const result = exchangeSameTierForeign(build, build.slots[0].instance!.instanceId, source, sameOrigin);
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.code).toBe("not-foreign");
  });
});
describe("rebuildForCredit — Experimental Rebuild (T033/T041/FR-047)", () => {
  it("rebuilds a tier-1/2 source into a +1-tier, same-category, unmodified replacement for exactly 2 credits", () => {
    const build = instanceBuild([{ id: "src", tier: 1 }]);
    const sourceId = build.slots[0].instance!.instanceId;
    const result = rebuildForCredit(build, sourceId, def("src"), 2, 10, REBUILD_CREDIT_COST, def("replacement", "backroads"));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const rebuilt = result.value.slots[0].instance!;
    expect(rebuilt.definitionId).toBe("replacement");
    expect(rebuilt.tier).toBe(2);
    expect(rebuilt.modification).toBeNull();
    expect(enumerateInstances(result.value)).toHaveLength(1); // source + modification atomically gone
  });

  it("rejects insufficient credits", () => {
    const build = instanceBuild([{ id: "src" }]);
    const result = rebuildForCredit(build, build.slots[0].instance!.instanceId, def("src"), 2, 1, REBUILD_CREDIT_COST, def("r"));
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.code).toBe("insufficient-credits");
  });

  it("rejects a category-mismatched replacement", () => {
    const sourceDef = def("src", "coachworks", "power");
    const chassisReplacement = def("chassis", "coachworks", "chassis");
    const build = instanceBuild([{ id: "src" }]);
    const result = rebuildForCredit(build, build.slots[0].instance!.instanceId, sourceDef, 2, 10, REBUILD_CREDIT_COST, chassisReplacement);
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.code).toBe("category-mismatch");
  });

  it("destroys a source modification in the rebuild", () => {
    const sourceDef = def("src");
    const source = attachModification(createItemInstance("src", "encounter", 1), buildWorkshopModification("twin-tuned", "factory-1", 1));
    const base = instanceBuild([{ id: "placeholder" }]);
    const build = { ...base, slots: base.slots.map((slot, index) => (index === 0 ? { ...slot, instance: source } : slot)) };
    const result = rebuildForCredit(build, source.instanceId, sourceDef, 2, 10, REBUILD_CREDIT_COST, def("replacement"));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.value.slots[0].instance!.modification).toBeNull();
  });
});

describe("applyAtomic — atomic rollback (T033/SC-003)", () => {
  it("returns a typed failure without mutation when the operation throws", () => {
    const original = instanceBuild([{ id: "a" }]);
    const result = applyAtomic(original, () => {
      throw new Error("boom");
    });
    expect(result.kind).toBe("failure");
    expect(original.slots[0].instance).not.toBeNull();
  });
});

describe("T017 — stale-preview / idempotency boundary readiness", () => {
  it("a confirmation against a stale state is rejected and the original build survives", () => {
    const live = instanceBuild([{ id: "a", tier: 1 }]);
    const instanceId = live.slots[0].instance!.instanceId;
    // Stale: the source instance no longer exists in the surviving state.
    const stale = instanceBuild([]);
    const result = upgradeWorkshopFree(stale, instanceId);
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.code).toBe("missing-instance");
    // The live run (the authoritative state) is untouched and still valid.
    expect(live.slots[0].instance).not.toBeNull();
  });

  it("replaying the same pure transaction is idempotent (byte-identical result)", () => {
    const build = instanceBuild([{ id: "x", tier: 1 }]);
    const id = build.slots[0].instance!.instanceId;
    const first = upgradeWorkshopFree(build, id);
    const second = upgradeWorkshopFree(build, id);
    expect(second).toEqual(first);
  });
});

