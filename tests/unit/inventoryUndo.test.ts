import { describe, expect, it } from "vitest";
import { sellItem, undoSale } from "../../src/simulation/garage";
import { invalidateSaleUndo } from "../../src/simulation/encounters";
import type { Run } from "../../src/simulation/run";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

describe("bounded inventory sale Undo", () => {
  it("restores exact item, tier, and location once", () => {
    const item = testItem({ id: "undo-item", name: "Undo Item", price: 5, timeModifier: 0 });
    const build = vehicleBuild([item]);
    build.slots[0].tier = 3;
    const sold = sellItem(build, { area: "vehicle", slotId: build.slots[0].slotId });
    if (sold.kind !== "sold") throw new Error("expected sale");
    const restored = undoSale(sold.build, sold.receipt);
    expect(restored.kind).toBe("undone");
    if (restored.kind === "undone") {
      expect(restored.build.slots[0].item?.id).toBe(item.id);
      expect(restored.build.slots[0].tier).toBe(3);
    }
    expect(undoSale(restored.kind === "undone" ? restored.build : sold.build, sold.receipt).kind).toBe("invalid");
  });

  it("invalidates the bounded Undo snapshot after a later inventory mutation", () => {
    const item = testItem({ id: "undo-invalidated", name: "Undo Invalidated", price: 4, timeModifier: 0 });
    const build = vehicleBuild([item]);
    const sold = sellItem(build, { area: "vehicle", slotId: build.slots[0].slotId });
    if (sold.kind !== "sold") throw new Error("expected sale");
    const run = { saleUndo: { receipt: sold.receipt, valid: true } } as Run;
    expect(invalidateSaleUndo(run).saleUndo?.valid).toBe(false);
  });
});
