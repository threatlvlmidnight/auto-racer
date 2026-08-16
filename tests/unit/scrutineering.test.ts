import { describe, expect, it } from "vitest";
import {
  commitScrutineering,
  isSlotReserved,
  pendingEligible,
  scrutineeringBonusPercent,
  settleScrutineering,
  type SlotReservation,
} from "../../src/simulation/scrutineering";
import { createItemInstance } from "../../src/simulation/itemInstances";
import { instanceBuild } from "../fixtures/encounter-variety-fixtures";

describe("scrutineeringBonusPercent — formula and cap (T032/FR-042)", () => {
  it("computes bonus = 5% × tier + authored price", () => {
    expect(scrutineeringBonusPercent(1, 4)).toBe(9);
    expect(scrutineeringBonusPercent(3, 5)).toBe(20);
  });

  it("caps at 25% cumulative", () => {
    expect(scrutineeringBonusPercent(3, 20)).toBe(25);
    expect(scrutineeringBonusPercent(4, 40)).toBe(25);
  });

  it("is injectable for balance tests", () => {
    const coefficients = { perTierMultiplier: 6, priceAddendUnit: 2, capPercent: 30 };
    expect(scrutineeringBonusPercent(1, 1, coefficients)).toBe(8);
    expect(scrutineeringBonusPercent(5, 1, coefficients)).toBe(30);
  });
});

describe("commitScrutineering — impound, bonus, reservation (T042/T043, FR-053)", () => {
  it("impounds the source, boosts the other installed items, and reserves the slot", () => {
    const build = instanceBuild([{ id: "a", tier: 3 }, { id: "b" }, { id: "c" }]);
    const surrenderSlotId = build.slots[0].slotId;
    const surrendered = build.slots[0].instance!;
    const committed = commitScrutineering(build, surrenderSlotId, 12, undefined, (instance) => (instance.instanceId === surrendered.instanceId ? 5 : 0));
    expect(committed.kind).toBe("committed");
    if (committed.kind !== "committed") return;
    expect(committed.template.surrenderedInstanceId).toBe(surrendered.instanceId);
    expect(committed.template.reservedSlotId).toBe(surrenderSlotId);
    expect(committed.template.computedPercentPerTarget).toBe(scrutineeringBonusPercent(3, 5));
    // Source slot is empty (impounded).
    expect(committed.build.slots[0].instance).toBeNull();
    // Targets carry the exact bonus.
    committed.build.slots.filter((slot) => slot.instance).forEach((slot) => {
      expect(slot.instance?.scrutineeringBonusPercent).toBe(scrutineeringBonusPercent(3, 5));
    });
    // Slot is now reserved.
    expect(isSlotReserved([{ pendingEffectId: "p", slotId: surrenderSlotId, surrenderedInstanceId: surrendered.instanceId }], surrenderSlotId)).toBe(true);
  });

  it("rejects when there is no installed target", () => {
    const build = instanceBuild([{ id: "only" }]);
    const result = commitScrutineering(build, build.slots[0].slotId, 1);
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") expect(result.reason).toBe("no-installed-target");
  });

  it("caps cumulative Scrutineering bonus per target item", () => {
    const build = instanceBuild([{ id: "a", tier: 3 }, { id: "b" }]);
    const slotId = build.slots[0].slotId;
    const first = commitScrutineering(build, slotId, 1, undefined, () => 20);
    expect(first.kind).toBe("committed");
    if (first.kind !== "committed") return;
    const boosted = first.build.slots[1].instance!;
    expect(boosted.scrutineeringBonusPercent).toBe(25);
  });
});

describe("per-category coexistence — concurrent Sponsor (T032/T042/FR-049)", () => {
  it("allows one unresolved effect per category", () => {
    expect(pendingEligible(["sponsor"], "scrutineering")).toBe(true);
    expect(pendingEligible(["sponsor"], "sponsor")).toBe(false);
    expect(pendingEligible([], "sponsor")).toBe(true);
  });
});

describe("settleScrutineering — exact return before clearing (T044/FR-053)", () => {
  it("returns the exact impounded instance to the reserved slot", () => {
    const build = instanceBuild([{ id: "a", tier: 2 }, { id: "b" }]);
    const slotId = build.slots[0].slotId;
    const surrendered = build.slots[0].instance!;
    const resolved = settleScrutineering(build, { pendingEffectId: "p", slotId, surrenderedInstanceId: surrendered.instanceId }, surrendered);
    expect(resolved.kind).toBe("settled");
    if (resolved.kind !== "settled") return;
    expect(resolved.build.slots[0].instance).toEqual(surrendered);
  });

  it("refuses to overwrite a slot occupied by another instance (typed recovery)", () => {
    const build = instanceBuild([{ id: "a", tier: 2 }, { id: "b" }]);
    const slotId = build.slots[0].slotId;
    const occupant = createItemInstance("intruder", "draft", 1);
    const occupied = { ...build, slots: build.slots.map((slot, index) => (index === 0 ? { ...slot, instance: occupant } : slot)) };
    const reservation: SlotReservation = { pendingEffectId: "p", slotId, surrenderedInstanceId: "lost" };
    const resolved = settleScrutineering(occupied, reservation, createItemInstance("returned", "draft", 1));
    expect(resolved.kind).toBe("occupied");
  });
});
