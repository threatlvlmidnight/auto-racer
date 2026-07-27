import { describe, expect, it } from "vitest";
import {
  MIN_VISUAL_LAP_SECONDS,
  RACE_ANIMATION_SECONDS,
  buildPlaybackSchedule,
  calloutEventsForLap,
  carProgressAt,
  cumulativeSimulatedTimeAt,
  frameStateAt,
  liveGapAt,
} from "../../src/simulation/playback";
import { ITEM_POOL } from "../../src/content/sample-data";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type ContestResult,
  type LapBreakdown,
} from "../../src/simulation/types";

function resultWithLapTimes(playerLapTimes: number[], ghostLapTimes: number[]): ContestResult {
  const laps = playerLapTimes.map((playerLapTime, index) => ({
    lap: index + 1,
    playerLapTime,
    ghostLapTime: ghostLapTimes[index],
    firedItems: [],
  }));
  const playerTime = playerLapTimes.reduce((sum, time) => sum + time, 0);
  const ghostTime = ghostLapTimes.reduce((sum, time) => sum + time, 0);

  return {
    playerTime,
    ghostTime,
    gap: playerTime - ghostTime,
    outcome: playerTime < ghostTime ? "win" : playerTime > ghostTime ? "loss" : "tie",
    board: [],
    storage: [],
    laps,
  };
}

describe("buildPlaybackSchedule", () => {
  it("uses one shared scale so the slower car finishes at 20s and the faster car earlier", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    const schedule = buildPlaybackSchedule(result);
    const ghostFinish = schedule.ghost.visualLapBoundaries[LAP_COUNT - 1];
    const playerFinish = schedule.player.visualLapBoundaries[LAP_COUNT - 1];

    expect(schedule.scaleFactor).toBe(RACE_ANIMATION_SECONDS / result.ghostTime);
    expect(ghostFinish).toBe(RACE_ANIMATION_SECONDS);
    expect(playerFinish).toBeLessThan(RACE_ANIMATION_SECONDS);
  });

  it("produces strictly increasing boundaries and preserves raw lap times", () => {
    const playerLaps = Array.from({ length: LAP_COUNT }, (_, index) => 4 + index / 10);
    const ghostLaps = Array(LAP_COUNT).fill(6);
    const schedule = buildPlaybackSchedule(resultWithLapTimes(playerLaps, ghostLaps));

    [schedule.player, schedule.ghost].forEach((car) => {
      car.visualLapBoundaries.forEach((boundary, index) => {
        expect(boundary).toBeGreaterThan(index === 0 ? 0 : car.visualLapBoundaries[index - 1]);
      });
    });
    expect(schedule.player.lapTimes).toEqual(playerLaps);
  });

  it("clamps every visual lap to MIN_VISUAL_LAP_SECONDS", () => {
    const playerLaps = [MIN_LAP_TIME, ...Array(LAP_COUNT - 1).fill(10)];
    const ghostLaps = Array(LAP_COUNT).fill(20);
    const schedule = buildPlaybackSchedule(resultWithLapTimes(playerLaps, ghostLaps));

    expect(schedule.player.visualLapBoundaries[0]).toBe(MIN_VISUAL_LAP_SECONDS);
    schedule.player.visualLapBoundaries.forEach((boundary, index) => {
      const start = index === 0 ? 0 : schedule.player.visualLapBoundaries[index - 1];
      expect(boundary - start).toBeGreaterThanOrEqual(MIN_VISUAL_LAP_SECONDS);
    });
  });
});

describe("playback frame math", () => {
  const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
  const schedule = buildPlaybackSchedule(result);

  it("interpolates bounded progress and marks completion", () => {
    expect(carProgressAt(schedule.player, 0)).toEqual({
      lapIndex: 0,
      lapProgress: 0,
      finished: false,
    });
    const halfway = carProgressAt(schedule.player, 0.8);
    expect(halfway.lapIndex).toBe(0);
    expect(halfway.lapProgress).toBeCloseTo(0.5);
    expect(halfway.lapProgress).toBeGreaterThanOrEqual(0);
    expect(halfway.lapProgress).toBeLessThanOrEqual(1);
    expect(carProgressAt(schedule.player, 100)).toEqual({
      lapIndex: LAP_COUNT,
      lapProgress: 1,
      finished: true,
    });
  });

  it("interpolates cumulative simulated time and caps at the total", () => {
    expect(cumulativeSimulatedTimeAt(schedule.player, 0)).toBe(0);
    expect(cumulativeSimulatedTimeAt(schedule.player, 0.8)).toBeCloseTo(2);
    expect(cumulativeSimulatedTimeAt(schedule.player, 100)).toBe(result.playerTime);
  });

  it("returns a minimal frame state with placeholder gap and callouts", () => {
    const frame = frameStateAt(schedule, result, 0.8, 0);

    expect(frame.player).toEqual(carProgressAt(schedule.player, 0.8));
    expect(frame.ghost).toEqual(carProgressAt(schedule.ghost, 0.8));
    expect(frame.liveGap).toBe(0);
    expect(frame.newCallouts).toEqual([]);
  });
});

describe("item callouts", () => {
  const directItem = ITEM_POOL.find((item) => !item.buff)!;
  const flatBuff = ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
  const stackingBuff = ITEM_POOL.find((item) => item.buff && item.cooldown !== undefined)!;
  const itemsById = new Map(
    [directItem, flatBuff, stackingBuff].map((item) => [item.id, item]),
  );

  it("includes direct and stacking effects with contributions but excludes flat buffs", () => {
    const lap: LapBreakdown = {
      lap: 1,
      playerLapTime: 4,
      ghostLapTime: 5,
      firedItems: [
        { id: directItem.id, contribution: -3 },
        { id: flatBuff.id, contribution: 5 },
        { id: stackingBuff.id, contribution: 2 },
      ],
    };

    expect(calloutEventsForLap(lap, itemsById)).toEqual([
      { item: directItem, contribution: -3 },
      { item: stackingBuff, contribution: 2 },
    ]);
  });

  it("emits all of a lap's firing events once when the player enters it", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    result.board = [directItem, flatBuff];
    result.storage = [stackingBuff];
    result.laps[0].firedItems = [
      { id: directItem.id, contribution: -3 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 2 },
    ];
    result.laps[1].firedItems = [{ id: stackingBuff.id, contribution: 2 }];
    const schedule = buildPlaybackSchedule(result);

    expect(frameStateAt(schedule, result, 0, -1).newCallouts).toEqual([
      { item: directItem, contribution: -3 },
      { item: stackingBuff, contribution: 2 },
    ]);
    expect(frameStateAt(schedule, result, 0.1, 0).newCallouts).toEqual([]);

    const secondLapTime = schedule.player.visualLapBoundaries[0] + 0.01;
    expect(frameStateAt(schedule, result, secondLapTime, 0).newCallouts).toEqual([
      { item: stackingBuff, contribution: 2 },
    ]);
    expect(frameStateAt(schedule, result, secondLapTime + 0.01, 1).newCallouts).toEqual([]);
  });
});

describe("live gap", () => {
  it("uses player minus ghost time and reaches the exact result gap", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    const schedule = buildPlaybackSchedule(result);

    expect(liveGapAt(schedule, 18)).toBeCloseTo(-5);
    expect(liveGapAt(schedule, 100)).toBe(result.gap);
  });

  it("surfaces the real live gap through frameStateAt", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    const schedule = buildPlaybackSchedule(result);

    expect(frameStateAt(schedule, result, 18, 9).liveGap).toBeCloseTo(-5);
    expect(frameStateAt(schedule, result, 100, LAP_COUNT).liveGap).toBe(result.gap);
  });
});