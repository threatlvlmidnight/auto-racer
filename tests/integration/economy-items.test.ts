import { describe, expect, it } from "vitest";
import { createRun, runIdentityForEntrant } from "../../src/simulation/run";
import { sellHeldItem } from "../../src/simulation/encounters";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { NEUTRAL_ITEMS } from "../../src/content/items";

describe("Feature 032 economy transaction boundaries", () => {
  it("records a sale payout exactly once and exposes a bounded Undo snapshot", () => {
    const item = NEUTRAL_ITEMS.find((entry) => entry.id === "neutral-engine-builders-nameplate")!;
    const run = createRun({ runId: "economy-run", seed: 2, identityTag: "performance", identity: runIdentityForEntrant("evelyn-mercer")!, build: vehicleBuild([item]), rng: () => 0 });
    const active = { ...run, activeEncounter: { id: "economy-encounter", stageId: run.stages[run.stageIndex].id, type: "parts-supplier" as const, status: "active" as const, payload: { kind: "parts-supplier" as const, stock: [], unavailable: true, restockUsed: false, purchases: [] } } };
    const sold = sellHeldItem(active, active.activeEncounter!.id, { area: "vehicle", slotId: active.build.slots[0].slotId });
    expect(sold.saleUndo?.valid).toBe(true);
    expect(sold.credits).toBe(run.credits + 3);
  });
});
