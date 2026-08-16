import { describe, expect, it } from "vitest";
import {
  factoryDevelopmentOffers,
  privateerExchangeCandidates,
  rebuildCandidates,
  upgradeWorkshopCandidates,
  upgradeWorkshopFree,
} from "../../src/simulation/encounterOffers";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { instanceBuild } from "../fixtures/encounter-variety-fixtures";

function def(id: string, origin: ItemDefinition["origin"] = "coachworks", opts: Partial<ItemDefinition> = {}): ItemDefinition {
  return testItem({ id, name: id, price: 2, timeModifier: 0, origin, installationCategory: "power", ...opts });
}

describe("factoryDevelopmentOffers — item-first compatible offers (T038/FR-044)", () => {
  it("offers compatible, non-no-op modifications for each held item", () => {
    const modifiable = def("workshop", "coachworks", { physics: { accelerationDelta: 3 } });
    const inert = def("plain", "coachworks", { timeModifier: -1 });
    const catalog = new Map<string, ItemDefinition>([[modifiable.id, modifiable], [inert.id, inert]]);
    const build = instanceBuild([{ id: "workshop" }, { id: "plain" }]);
    const offers = factoryDevelopmentOffers(build, catalog);
    // guarded is universally legal, so every item yields at least one offer.
    expect(offers).toHaveLength(2);
    const withPhysics = offers.find((offer) => offer.definitionId === "workshop")!;
    const plain = offers.find((offer) => offer.definitionId === "plain")!;
    expect(withPhysics.modifications.length).toBeGreaterThan(1); // physics-driven + guarded
    expect(plain.modifications.length).toBe(1); // guarded only
  });
});

describe("upgradeWorkshop — free single-tier upgrade (T039/FR-046)", () => {
  it("lists only sub-tier-3 held instances", () => {
    const build = instanceBuild([{ id: "a", tier: 1 }, { id: "b", tier: 3 }]);
    expect(upgradeWorkshopCandidates(build)).toHaveLength(1);
  });

  it("upgrades the exact instance in place, rejecting at max tier", () => {
    const build = instanceBuild([{ id: "a", tier: 1 }]);
    const id = build.slots[0].instance!.instanceId;
    const ok = upgradeWorkshopFree(build, id);
    expect(ok.kind).toBe("ok");
    if (ok.kind !== "ok") return;
    expect(ok.toTier).toBe(2);
    expect(ok.build.slots[0].instance!.tier).toBe(2);
    const atMax = upgradeWorkshopCommon(instanceBuild([{ id: "c", tier: 3 }]));
    expect(atMax.kind).toBe("failure");
  });
});

function upgradeWorkshopCommon(build: ReturnType<typeof instanceBuild>): { kind: string } {
  const entry = build.slots.find((slot) => slot.instance);
  if (!entry?.instance) return { kind: "failure" as const, code: "missing-instance" };
  return upgradeWorkshopFree(build, entry.instance.instanceId) as { kind: string };
}

describe("privateerExchangeCandidates — same-tier foreign-origin (T040)", () => {
  it("returns foreign-origin options only, up to the limit", () => {
    const local = def("home", "coachworks");
    const pool = [
      def("foreign-1", "velodrome"),
      def("foreign-2", "fieldworks"),
      def("foreign-3", "backroads"),
      def("clone", "coachworks"),
    ];
    const candidates = privateerExchangeCandidates(local, pool, 3);
    expect(candidates).toHaveLength(3);
    candidates.forEach((candidate) => expect(candidate.origin).not.toBe("coachworks"));
  });
});

describe("rebuildCandidates — same-category, +1-tier (T041/FR-047)", () => {
  it("returns same-category replacements only, rejecting a tier-3 source", () => {
    const source = def("engine", "coachworks", { installationCategory: "power" });
    const chassis = def("frame", "backroads", { installationCategory: "chassis" });
    const power = def("other", "velodrome", { installationCategory: "power" });
    const candidates = rebuildCandidates(source, 1, [chassis, power, source]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe("other");
    expect(rebuildCandidates(source, 3, [power])).toHaveLength(0);
  });
});
