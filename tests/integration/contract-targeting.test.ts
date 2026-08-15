import { describe, expect, it } from "vitest";
import {
  chooseEncounter,
  seededTargetSeconds,
  selectSponsorOption,
  type SponsorMeetingPayload,
} from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import { completePvpEncounter, confirmRunDestination, createRunForEntrant } from "../../src/simulation/run";

describe("Championship Race sponsor targeting", () => {
  it("authors the target from the next Championship Race and skips the intervening Local Race", () => {
    const created = createRunForEntrant({ entrantId: "evelyn-mercer", runId: "contract-tour", seed: 33, rng: () => 0 });
    if (created.kind !== "created") throw new Error("run creation failed");
    let run = confirmRunDestination(created.run, created.run.worldTour!.destinationOffer!.options[0], () => 0.99);
    const sponsorChoice = run.availableChoices.find((choice) => choice.type === "sponsor-meeting")!;
    run = chooseEncounter(run, sponsorChoice.id, (() => {
      const values = [0.4, 0, 0];
      let index = 0;
      return () => values[index++] ?? 0;
    })());
    const payload = run.activeEncounter!.payload as SponsorMeetingPayload;
    const targetOption = payload.options.find((option) => option.kind === "target-race-time");
    expect(targetOption).toBeDefined();
    if (!targetOption || targetOption.kind === "immediate") return;
    expect(targetOption.objective).toEqual({
      kind: "target-race-time",
      targetSeconds: seededTargetSeconds({ seed: 33, pvpOrdinal: 2, baseLapTime: run.build.car.baseLapTime, lapCount: 10 }),
    });

    run = selectSponsorOption(run, run.activeEncounter!.id, targetOption.id, () => 0);
    expect(run.stages[run.stageIndex].raceKind).toBe("local");
    const contract = run.activeSponsorContract;
    const result = resolveContest(run.build, { id: "slow", lapTime: 100 }, run.stages[run.stageIndex].lapCount!);
    run = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(run.activeSponsorContract).toEqual(contract);
    expect(run.history[run.history.length - 1]?.sponsorOutcome).toBeUndefined();
  });
});
