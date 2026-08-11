import { describe, expect, it } from "vitest";
import {
  MIN_VISUAL_LAP_SECONDS,
  RACE_ANIMATION_SECONDS,
  buildNCarPlaybackSchedule,
  buildPlaybackSchedule,
  calloutEventsForLap,
  carProgressAt,
  cumulativeSimulatedTimeAt,
  frameStateAt,
  liveGapAt,
  nCarFrameStateAt,
  standingsAt,
  type TickerLine,
} from "../../src/simulation/playback";
import { ITEM_POOL } from "../../src/content/sample-data";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { resolveContest } from "../../src/simulation/contest";
import { generateTrack, type Track } from "../../src/simulation/tracks";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type ContestResult,
  type LapBreakdown,
  type NCarContestResult,
  type RivalProfile,
} from "../../src/simulation/types";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

// 018-track-generation: a local literal fixture, standing in for a generated
// Track — this suite exercises rendering-side playback math, not generation
// itself (tracks.test.ts owns generateTrack's own contract).
const TEST_TRACK: Track = {
  id: "track-fixture",
  name: "Fixture Loop",
  segments: [
    { kind: "straight", length: 120 },
    { kind: "corner", turnDegrees: 90, direction: "left" },
    { kind: "straight", length: 120 },
    { kind: "corner", turnDegrees: 90, direction: "left" },
    { kind: "straight", length: 120 },
    { kind: "corner", turnDegrees: 90, direction: "left" },
    { kind: "straight", length: 120 },
    { kind: "corner", turnDegrees: 90, direction: "left" },
  ],
  characteristics: { corneringDemand: 46, brakingDemand: 0, powerDemand: 54 },
  points: [
    { x: 530, y: 210 }, { x: 519, y: 239 }, { x: 486, y: 268 }, { x: 435, y: 294 },
    { x: 371, y: 313 }, { x: 300, y: 320 }, { x: 229, y: 313 }, { x: 165, y: 294 },
    { x: 114, y: 268 }, { x: 81, y: 239 }, { x: 70, y: 210 }, { x: 81, y: 181 },
    { x: 114, y: 152 }, { x: 165, y: 126 }, { x: 229, y: 107 }, { x: 300, y: 100 },
    { x: 371, y: 107 }, { x: 435, y: 126 }, { x: 486, y: 152 }, { x: 519, y: 181 },
  ],
};
type TickerLineList = TickerLine[];

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
    lapCount: laps.length,
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

  it("derives 10 and 12 lap completion from each schedule", () => {
    const ten = buildPlaybackSchedule(resultWithLapTimes(Array(10).fill(4), Array(10).fill(5)));
    const twelve = buildPlaybackSchedule(resultWithLapTimes(Array(12).fill(4), Array(12).fill(5)));

    expect(carProgressAt(ten.player, 100)).toEqual({
      lapIndex: 10,
      lapProgress: 1,
      finished: true,
    });
    expect(carProgressAt(twelve.player, 100)).toEqual({
      lapIndex: 12,
      lapProgress: 1,
      finished: true,
    });
    expect(twelve.player.visualLapBoundaries).toHaveLength(12);
  });
});

describe("item callouts", () => {
  const directItem = ITEM_POOL.find((item) => !item.buff)!; // performance, cooldown:1
  const directItem2 = ITEM_POOL.find((item) => !item.buff && item.id !== directItem.id)!;
  const flatBuff = ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
  const stackingBuff = ITEM_POOL.find((item) => item.buff && item.cooldown !== undefined)!;
  const itemsById = new Map(
    [directItem, directItem2, flatBuff, stackingBuff].map((item) => [item.id, item]),
  );

  it("includes direct items and their matching buff items when both fire on the same lap", () => {
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
      { item: flatBuff, contribution: 5 },
      { item: stackingBuff, contribution: 2 },
    ]);
  });

  it("excludes a buff item when no matching direct item fires that lap (FR-002)", () => {
    const lap: LapBreakdown = {
      lap: 3,
      playerLapTime: 4,
      ghostLapTime: 5,
      firedItems: [{ id: stackingBuff.id, contribution: 2 }],
    };

    expect(calloutEventsForLap(lap, itemsById)).toEqual([]);
  });

  it("includes the buff exactly once when two matching direct items fire on the same lap (FR-003)", () => {
    const lap: LapBreakdown = {
      lap: 1,
      playerLapTime: 4,
      ghostLapTime: 5,
      firedItems: [
        { id: directItem.id, contribution: -3 },
        { id: directItem2.id, contribution: -1.25 },
        { id: flatBuff.id, contribution: 5 },
      ],
    };

    const events = calloutEventsForLap(lap, itemsById);
    expect(events.filter((e) => e.item.id === flatBuff.id)).toHaveLength(1);
    expect(events).toHaveLength(3);
  });

  it("includes both a flat buff and a stacking buff when a matching direct fires (edge case, spec.md)", () => {
    const lap: LapBreakdown = {
      lap: 3,
      playerLapTime: 4,
      ghostLapTime: 5,
      firedItems: [
        { id: directItem.id, contribution: -3 },
        { id: flatBuff.id, contribution: 5 },
        { id: stackingBuff.id, contribution: 3 },
      ],
    };

    const events = calloutEventsForLap(lap, itemsById);
    expect(events.map((e) => e.item.id)).toContain(flatBuff.id);
    expect(events.map((e) => e.item.id)).toContain(stackingBuff.id);
  });

  it("emits buff callouts alongside direct callouts through frameStateAt; excludes buff when no direct fires", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    result.board = [directItem, flatBuff];
    result.storage = [stackingBuff];
    result.laps[0].firedItems = [
      { id: directItem.id, contribution: -3 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 2 },
    ];
    // Lap 2: only stacking buff fires (its cooldown tick) — no direct → buff excluded.
    result.laps[1].firedItems = [{ id: stackingBuff.id, contribution: 2 }];
    const schedule = buildPlaybackSchedule(result);

    expect(frameStateAt(schedule, result, 0, -1).newCallouts).toEqual([
      { item: directItem, contribution: -3 },
      { item: flatBuff, contribution: 5 },
      { item: stackingBuff, contribution: 2 },
    ]);
    expect(frameStateAt(schedule, result, 0.1, 0).newCallouts).toEqual([]);

    const secondLapTime = schedule.player.visualLapBoundaries[0] + 0.01;
    expect(frameStateAt(schedule, result, secondLapTime, 0).newCallouts).toEqual([]);
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

  it("keeps authoritative result facts invariant across presentation-only controls", () => {
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    const before = structuredClone(result);
    const schedule = buildPlaybackSchedule(result);
    const presentationStates = [
      { paused: true, speed: 1, reducedMotion: false, time: 0 },
      { paused: false, speed: 2, reducedMotion: false, time: 10 },
      { paused: false, speed: 4, reducedMotion: true, time: 100 },
    ];

    presentationStates.forEach(({ time }) => frameStateAt(schedule, result, time, -1));
    expect(result).toStrictEqual(before);
    expect(buildPlaybackSchedule(result)).toStrictEqual(schedule);
    expect(frameStateAt(schedule, result, 100, LAP_COUNT).liveGap).toBe(result.gap);
  });
});

// 012-multi-ghost-contest: additive N-car playback (FR-008), alongside the
// 2-car functions above which Test Day/Practice keeps using unchanged.
const tieRoster: readonly RivalProfile[] = RIVAL_PROFILES.map((profile) => ({
  ...profile,
  levelScaling: () => ({ slotsToFill: 0, priceBias: "low" as const }),
}));

describe("buildNCarPlaybackSchedule", () => {
  it("builds one CarPlaybackSchedule per car, sharing a single scale factor", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    expect(schedule.cars).toHaveLength(8);
    expect(schedule.cars.map((car) => car.id)).toEqual(result.cars.map((car) => car.id));
    schedule.cars.forEach((car) => {
      expect(car.schedule.visualLapBoundaries[car.schedule.visualLapBoundaries.length - 1]).toBe(
        RACE_ANIMATION_SECONDS,
      );
    });
  });

  it("attaches the selected track once per schedule (013-race-spectacle, data-model.md)", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const track = generateTrack(42, 1);
    const schedule = buildNCarPlaybackSchedule(result, track);

    expect(schedule.track).toEqual(track);
  });

  it("derives scaleFactor from the slowest of all 8 cars, not just two", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);
    const maxTime = Math.max(...result.cars.map((car) => car.time));

    expect(schedule.scaleFactor).toBeCloseTo(RACE_ANIMATION_SECONDS / maxTime);
  });
});

describe("standingsAt (013-race-spectacle, shared standings/ticker derivation)", () => {
  it("returns a contiguous 1..8 position permutation with no duplicates at any sampled time", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    [0, 3, 8, 15, 1000].forEach((t) => {
      const ranked = standingsAt(schedule, t);
      expect(ranked).toHaveLength(8);
      expect(ranked.map((car) => car.position).sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);
    });
  });

  it("matches a direct comparison of cumulativeSimulatedTimeAt across all cars (SC-003)", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);
    const t = 6;
    const ranked = standingsAt(schedule, t);
    // Direct comparison, broken by the same declared tie-break policy
    // (player first, then id) as standingsAt itself — real per-car pace
    // differences frequently coincide exactly at a shared price tier, so an
    // un-tie-broken "direct" order isn't well-defined on its own.
    const directTimes = new Map(
      schedule.cars.map((car) => [car.id, cumulativeSimulatedTimeAt(car.schedule, t)]),
    );
    const directOrder = schedule.cars
      .map((car) => ({ id: car.id, role: car.role, time: directTimes.get(car.id)! }))
      .sort((a, b) =>
        a.time - b.time
        || (a.role === "player" ? 0 : 1) - (b.role === "player" ? 0 : 1)
        || a.id.localeCompare(b.id)
      )
      .map((car) => car.id);

    expect(ranked.map((car) => car.id)).toEqual(directOrder);
    ranked.forEach((car) => {
      expect(car.cumulativeTime).toBeCloseTo(directTimes.get(car.id)!);
    });
  });

  it("breaks live ties by fixed roster order, same as the final result (player first)", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    expect(standingsAt(schedule, 0)[0].id).toBe("player");
  });

  it("is pure — identical (schedule, t) always returns an identical ranking", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    expect(standingsAt(schedule, 4.5)).toEqual(standingsAt(schedule, 4.5));
  });
});

describe("nCarFrameStateAt", () => {
  it("reports the same live rank as the final standings once every car finishes", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);
    const frame = nCarFrameStateAt(schedule, result, 1000, -1);

    expect(frame.allFinished).toBe(true);
    const playerFinalPosition = result.cars.find((car) => car.role === "player")!.position;
    expect(frame.playerRank).toBe(playerFinalPosition);
    expect(frame.cars.every((car) => car.progress.finished)).toBe(true);
  });

  it("is not finished at time zero and reports a defined leader", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);
    const frame = nCarFrameStateAt(schedule, result, 0, -1);

    expect(frame.allFinished).toBe(false);
    expect(frame.leaderName).toBeTruthy();
    expect(frame.playerRank).toBeGreaterThanOrEqual(1);
    expect(frame.playerRank).toBeLessThanOrEqual(8);
  });

  it("keeps authoritative result facts invariant across presentation-only reads", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const before = structuredClone(result);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    nCarFrameStateAt(schedule, result, 5, -1);
    nCarFrameStateAt(schedule, result, 1000, -1);

    expect(result).toStrictEqual(before);
  });

  it("exposes the same standings ranking standingsAt would produce at that moment (013-race-spectacle)", () => {
    const result = resolveContest(vehicleBuild(), tieRoster, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    expect(nCarFrameStateAt(schedule, result, 6, -1).standings).toEqual(standingsAt(schedule, 6));
  });

  it("never populates newCallouts for any car other than the player's own (013-race-spectacle FR-005)", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    for (let t = 0; t <= 20; t += 0.5) {
      // newCallouts has no carId field at all — its very shape makes a rival
      // callout structurally impossible; this pins that it stays that way.
      nCarFrameStateAt(schedule, result, t, -1).newCallouts.forEach((event) => {
        expect(event).toHaveProperty("item");
        expect(event).toHaveProperty("contribution");
        expect(event).not.toHaveProperty("carId");
      });
    }
  });
});

describe("newTickerLines curation (013-race-spectacle US2, FR-006)", () => {
  // Positive timeModifier, cooldown 1 (fires every lap) — a deterministic
  // per-lap player firing to assert on.
  const handicapItem = ITEM_POOL.find((item) => item.id === "item-010")!;

  function handicappedSchedule() {
    const result = resolveContest(vehicleBuild([handicapItem]), tieRoster, 1, 42);
    return { result, schedule: buildNCarPlaybackSchedule(result, TEST_TRACK) };
  }

  // Real rivals (seed 42, level 1) against an unmodified player: confirmed by
  // direct computation to separate cleanly (rival-colt leads outright from
  // early on and finishes well ahead of the field) — avoids the exact,
  // floating-point-fragile ties that identically-built cars would produce.
  function realSchedule() {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    return { result, schedule: buildNCarPlaybackSchedule(result, TEST_TRACK) };
  }

  function playAllFrames(
    result: NCarContestResult,
    schedule: ReturnType<typeof buildNCarPlaybackSchedule>,
    step = 0.25,
  ): TickerLineList {
    let previousStandings: ReturnType<typeof standingsAt> | null = null;
    let previousFinishedCarIds: string[] = [];
    let previousLapIndex = -1;
    const lines: TickerLineList = [];
    for (let t = 0; t <= 20; t += step) {
      const frame = nCarFrameStateAt(
        schedule,
        result,
        t,
        previousLapIndex,
        previousStandings,
        previousFinishedCarIds,
      );
      lines.push(...frame.newTickerLines);
      previousStandings = frame.standings;
      previousFinishedCarIds = frame.cars.filter((car) => car.progress.finished).map((car) => car.id);
      previousLapIndex = frame.cars.find((car) => car.role === "player")!.progress.lapIndex;
    }
    return lines;
  }

  it("emits a player-fired line for every one of the player's own firings (reusing calloutEventsForLap)", () => {
    const { result, schedule } = handicappedSchedule();
    const frame = nCarFrameStateAt(schedule, result, 0, -1);

    const fired = frame.newTickerLines.filter((line) => line.kind === "player-fired");
    expect(fired).toHaveLength(1);
    expect(fired[0].carId).toBe("player");
    expect(fired[0].text).toContain(handicapItem.name);
  });

  it("emits a took-lead line only when standingsAt shows the leader actually changing", () => {
    const { result, schedule } = realSchedule();
    const lines = playAllFrames(result, schedule);
    const leadLines = lines.filter((line) => line.kind === "took-lead");

    expect(leadLines.length).toBeGreaterThan(0);
    expect(leadLines[0].carId).toBe("rival-colt");
  });

  it("emits a finished line the frame a car first finishes, and never repeats it for the same car", () => {
    const { result, schedule } = realSchedule();
    const lines = playAllFrames(result, schedule);
    const finishLines = lines.filter((line) => line.kind === "finished");

    expect(finishLines.length).toBeGreaterThan(0);
    const finishedIds = finishLines.map((line) => line.carId);
    expect(new Set(finishedIds).size).toBe(finishedIds.length);
  });

  it("emits at most one finished line and never a took-lead or player-fired line for a rival that never leads", () => {
    const { result, schedule } = realSchedule();
    const lines = playAllFrames(result, schedule);
    // rival-kestrel finishes mid-pack and never leads (confirmed by direct
    // computation) — it should surface only its own single finish line.
    const kestrelLines = lines.filter((line) => line.carId === "rival-kestrel");

    expect(kestrelLines.every((line) => line.kind === "finished")).toBe(true);
    expect(kestrelLines.length).toBeLessThanOrEqual(1);
  });

  it("never emits a player-fired-kind line for a rival's ordinary firing", () => {
    const { result, schedule } = realSchedule();
    const lines = playAllFrames(result, schedule);

    lines
      .filter((line) => line.kind === "player-fired")
      .forEach((line) => expect(line.carId).toBe("player"));
  });

  it("is pure — identical arguments always produce an identical set of ticker lines", () => {
    const { result, schedule } = handicappedSchedule();
    const a = nCarFrameStateAt(schedule, result, 5, -1, null);
    const b = nCarFrameStateAt(schedule, result, 5, -1, null);

    expect(b.newTickerLines).toEqual(a.newTickerLines);
  });
});