import { describe, expect, it, beforeEach } from "vitest";
import {
  cloneInstance,
  createItemInstance,
  definitionFor,
  enumerateInstances,
  instanceById,
  resetInstanceIds,
} from "../../src/simulation/itemInstances";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { instanceBuild } from "../fixtures/encounter-variety-fixtures";

beforeEach(() => {
  resetInstanceIds();
});

describe("createItemInstance — stable run-scoped identity (T005/T006)", () => {
  it("creates an instance with a unique id, tier 1, no modification/bonus", () => {
    const first = createItemInstance("neutral-axle", "draft");
    const second = createItemInstance("neutral-axle", "draft");
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.definitionId).toBe("neutral-axle");
    expect(first.tier).toBe(1);
    expect(first.modification).toBeNull();
    expect(first.scrutineeringBonusPercent).toBe(0);
    expect(first.provenance).toBe("draft");
  });

  it("defines the instance-shape helper that places items into the run topology", () => {
    const build = instanceBuild([{ id: "inst-a", tier: 2 }], [{ id: "stored-a" }]);
    const held = enumerateInstances(build);
    expect(held).toHaveLength(2);
    const installed = held.find((entry) => entry.installed);
    const stored = held.find((entry) => !entry.installed);
    expect(installed?.instance.definitionId).toBe("inst-a");
    expect(installed?.instance.tier).toBe(2);
    expect(stored?.location).toEqual({ area: "storage", index: 0 });
  });
});

describe("enumerateInstances / instanceById — exact location evidence (T007)", () => {
  it("enumerates installed then stored, in slot/index order", () => {
    const build = instanceBuild([{ id: "slot-1" }, { id: "slot-2" }], [{ id: "store-0" }, { id: "store-1" }]);
    const held = enumerateInstances(build);
    expect(held).toHaveLength(4);
    expect(held[0].installed).toBe(true);
    expect(held[0].location.area).toBe("vehicle");
    expect(held[1].installed).toBe(true);
    expect(held[2].installed).toBe(false);
    expect(held[2].location).toEqual({ area: "storage", index: 0 });
    expect(held[3].location).toEqual({ area: "storage", index: 1 });
  });

  it("resolves a held instance by stable id, anywhere in the build", () => {
    const build = instanceBuild([], [{ id: "target" }]);
    const entry = enumerateInstances(build)[0];
    const found = instanceById(build, entry.instance.instanceId);
    expect(found).not.toBeNull();
    expect(found!.instance.definitionId).toBe("target");
    expect(instanceById(build, "nope")).toBeNull();
  });
});

describe("definitionFor / cloneInstance — immutable definition boundary (T007)", () => {
  it("looks up the immutable catalog definition by id", () => {
    const item = testItem({ id: "cat-1", name: "Cat 1", price: 1, timeModifier: -2 });
    const catalog = new Map<string, ItemDefinition>([["cat-1", item]]);
    const instance = createItemInstance("cat-1", "draft");
    expect(definitionFor(instance, catalog)?.id).toBe("cat-1");
    expect(definitionFor(instance, new Map())).toBeNull();
  });

  it("clones an instance preserving identity and behavior", () => {
    const instance = createItemInstance("cat-1", "encounter");
    const copy = cloneInstance(instance);
    expect(copy.instanceId).toBe(instance.instanceId);
    expect(copy).toEqual(instance);
    expect(copy).not.toBe(instance);
  });
});
