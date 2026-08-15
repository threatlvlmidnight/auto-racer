import { describe, expect, it } from "vitest";
import { chooseEncounter, purchaseStock, type PartsSupplierPayload } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import { buildPlaybackSchedule, frameStateAt } from "../../src/simulation/playback";
import {
  completeNonPvpEncounter,
  completePvpEncounter,
  createRun,
  projectRunRecord,
  runIdentityForEntrant,
} from "../../src/simulation/run";
import { tagInspectionProjection } from "../../src/scenes/itemPresentation";
import { raceSetupInput, lockRaceSetup } from "../../src/simulation/raceSetup";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

describe("Feature 032 full feedback run (T102)", () => {
  it("carries acquisition, tag inspection, setup, watched stats, settlement, and final record", () => {
    let run = createRun({
      runId: "feature-032-full-run",
      seed: 32,
      identityTag: "performance",
      identity: runIdentityForEntrant("evelyn-mercer")!,
      build: vehicleBuild(),
      rng: () => 0,
    });
    // The legacy twelve-stage fixture predates explicit race-kind metadata;
    // pin its scored stages to Championship so the retained-record projector
    // exercises the same authoritative history boundary as the world-tour run.
    run = {
      ...run,
      stages: run.stages.map((stage) => stage.kind === "pvp" ? { ...stage, raceKind: "championship" as const } : stage),
    };
    let inspectedItemId: string | undefined;

    for (let pvpCount = 0; pvpCount < 4; pvpCount += 1) {
      for (let choiceStage = 0; choiceStage < 2; choiceStage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
        if (pvpCount === 0 && choiceStage === 0 && run.activeEncounter?.type === "parts-supplier") {
          const payload = run.activeEncounter.payload as PartsSupplierPayload;
          const offer = payload.stock[0];
          run = purchaseStock(run, run.activeEncounter.id, offer.id, {
            area: "vehicle",
            slotId: run.build.slots[0].slotId,
          });
          inspectedItemId = offer.item.id;
        }
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }

      const input = raceSetupInput(run, run.activeEncounter!.id);
      const setup = lockRaceSetup(input, { "driver-aggression": "balanced" });
      if (!("controls" in setup)) throw new Error("expected setup controls");
      const lapCount = (run.activeEncounter!.payload as { lapCount: 8 | 10 | 12 | 14 | 16 }).lapCount;
      const result = resolveContest(input.build, { id: "slow-ghost", lapTime: 1000 }, lapCount, input.track, setup);
      expect(result.laps[0].physics).toBeDefined();
      expect(result.board.map((item) => item.id)).toEqual(input.build.slots.flatMap((slot) => slot.item ? [slot.item.id] : []));
      expect(result.storage.map((item) => item.id)).toEqual(input.build.storage.flatMap((slot) => slot.item ? [slot.item.id] : []));
      const expectedPayload = run.activeEncounter!.payload as { buildSnapshot: typeof input.build };
      expect(input.build.slots.map((slot) => slot.item?.id)).toEqual(expectedPayload.buildSnapshot.slots.map((slot) => slot.item?.id));
      expect(result.lapCount).toBe(lapCount);
      const schedule = buildPlaybackSchedule(result);
      const watched = frameStateAt(schedule, result, Number.POSITIVE_INFINITY, -1);
      expect(watched.player.finished).toBe(true);
      run = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    }

    expect(run.status).toBe("completed");
    expect(inspectedItemId).toBeDefined();
    const inspected = [...run.build.slots].find((slot) => slot.item?.id === inspectedItemId)?.item;
    expect(inspected).toBeDefined();
    expect(tagInspectionProjection(inspected!.synergyTags[0], inspected!.synergyTags[0], run.build)).toMatchObject({
      matchingHeldCount: expect.any(Number),
    });
    expect(projectRunRecord(run)).toMatchObject({ wins: 4, losses: 0, entries: expect.any(Array) });
    expect(run.creditTransactions.some((entry) => entry.kind === "win-bonus")).toBe(true);
  });
});
