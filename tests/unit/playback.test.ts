import { describe, expect, it } from "vitest";
import {
  MIN_VISUAL_LAP_SECONDS,
  RACE_ANIMATION_SECONDS,
  advancePresentationClock,
  buildNCarPlaybackSchedule,
  buildPlaybackSchedule,
  calloutEventsForLap,
  carProgressAt,
  checkpointProjection,
  CheckpointProjectionError,
  createPresentationClock,
  crossedPlaybackBoundaries,
  cumulativeSimulatedTimeAt,
  frameStateAt,
  isPlaybackSpeed,
  latestCompletedPlayerLap,
  liveGapAt,
  maxFinishScheduleTime,
  nCarBoundaryView,
  nCarFrameStateAt,
  PLAYBACK_SPEEDS,
  playbackSpeedDescriptor,
  selectPlaybackSpeed,
  standingsAt,
  twoCarBoundaryView,
  updateLiveProjection,
  createPlaybackController,
  advancePlaybackController,
  selectPlaybackControllerSpeed,
  skipPlaybackController,
  type CrossedPlaybackEvent,
  type LiveProjectionState,
  type PlaybackSpeed,
  type TickerLine,
} from "../../src/simulation/playback";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { resolveContest } from "../../src/simulation/contest";
import {
  EIGHT_CAR_BOUNDARY_VIEW,
  TWO_CAR_BOUNDARY_VIEW,
} from "../fixtures/playback-control-fixtures";
import { generateTrack, pointAtProgress, type Track } from "../../src/simulation/tracks";
import {
  changingCheckpointOrderFixture,
  equalTimeFixture,
  ncarResult,
  staggeredFinishFixture,
  TIE_ROSTER,
  volatileFrameOrderFixture,
} from "../fixtures/race-legibility-fixtures";
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
  const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!; // performance, cooldown:1
  const directItem2 = LEGACY_ITEM_POOL.find((item) => !item.buff && item.id !== directItem.id)!;
  const flatBuff = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
  const stackingBuff = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown !== undefined)!;
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
      expect(car.schedule.visualLapBoundaries[car.schedule.visualLapBoundaries.length - 1]).toBeCloseTo(
        RACE_ANIMATION_SECONDS,
        12,
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
  const handicapItem = LEGACY_ITEM_POOL.find((item) => item.id === "item-010")!;

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
    expect(leadLines.every((line) => line.carId !== "player" || line.text.length > 0)).toBe(true);
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
    const leaders = new Set(lines.filter((line) => line.kind === "took-lead").map((line) => line.carId));
    const nonLeader = result.cars.find((car) => car.role === "rival" && !leaders.has(car.id))!;
    const nonLeaderLines = lines.filter((line) => line.carId === nonLeader.id);

    expect(nonLeaderLines.every((line) => line.kind === "finished")).toBe(true);
    expect(nonLeaderLines.length).toBeLessThanOrEqual(1);
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

// 027-race-legibility-integrity Phase 2 (US3, T005-T010): integrity tests
// pinning carProgressAt/pointAtProgress geometry against independent
// calculation, run BEFORE any presentation change, per Decision 8. Findings
// are diagnosed in research.md T011 — this suite's job is to prove which
// behaviors are correct closed-loop geometry (keep) vs. an actual defect
// (fix), not to assume either going in.

describe("T005: carProgressAt exact boundary behavior", () => {
  const schedule = buildPlaybackSchedule(resultWithLapTimes(Array(6).fill(3), Array(6).fill(4)));

  it("starts at lap 0, zero progress, not finished, at visual time zero", () => {
    expect(carProgressAt(schedule.player, 0)).toEqual({ lapIndex: 0, lapProgress: 0, finished: false });
  });

  it("reads lapProgress 1 on the completing lap's own index exactly at a non-final boundary, then rolls to the next lap's index 0 progress immediately after", () => {
    const boundary = schedule.player.visualLapBoundaries[0];
    const at = carProgressAt(schedule.player, boundary);
    const justAfter = carProgressAt(schedule.player, boundary + 1e-9);

    // Documented, intentional edge convention (not a defect): the instant a
    // lap completes belongs to that lap at full progress, matching
    // enteredLap's own `result.laps[player.lapIndex]` lookup (frameStateAt) —
    // reading the just-finished lap's evidence, not an unsimulated "next" one.
    expect(at).toEqual({ lapIndex: 0, lapProgress: 1, finished: false });
    expect(justAfter.lapIndex).toBe(1);
    expect(justAfter.lapProgress).toBeCloseTo(0, 5);
    expect(justAfter.finished).toBe(false);
  });

  it("reads lapIndex at wraparound (last-but-one boundary) the same way as any other boundary", () => {
    const secondToLastBoundary = schedule.player.visualLapBoundaries[4];
    const at = carProgressAt(schedule.player, secondToLastBoundary);

    expect(at).toEqual({ lapIndex: 4, lapProgress: 1, finished: false });
  });

  it("finishes exactly at, and only at or after, the final boundary — not one instant early or late", () => {
    const finalBoundary = schedule.player.visualLapBoundaries[5];
    const justBefore = carProgressAt(schedule.player, finalBoundary - 1e-9);
    const at = carProgressAt(schedule.player, finalBoundary);
    const after = carProgressAt(schedule.player, finalBoundary + 5);

    expect(justBefore.finished).toBe(false);
    expect(justBefore.lapIndex).toBe(5);
    expect(justBefore.lapProgress).toBeCloseTo(1, 5);
    expect(at).toEqual({ lapIndex: 6, lapProgress: 1, finished: true });
    expect(after).toEqual({ lapIndex: 6, lapProgress: 1, finished: true });
  });

  it("never regresses lapIndex or reports finished=false once already finished, for any later time", () => {
    const finalBoundary = schedule.player.visualLapBoundaries[5];
    [finalBoundary, finalBoundary + 1, finalBoundary + 1000].forEach((t) => {
      expect(carProgressAt(schedule.player, t)).toEqual({ lapIndex: 6, lapProgress: 1, finished: true });
    });
  });
});

describe("T006: carProgressAt monotonicity across varied schedules", () => {
  function totalOrderValue(progress: ReturnType<typeof carProgressAt>, lapCount: number): number {
    // A single comparable scalar: completed laps plus fractional current-lap
    // progress, capped at lapCount — strictly nondecreasing iff the car
    // never appears to move backward in race distance.
    return Math.min(lapCount, progress.lapIndex + progress.lapProgress);
  }

  const variedSchedules = [
    { name: "uniform", laps: Array(10).fill(4) },
    { name: "accelerating", laps: Array.from({ length: 10 }, (_unused, i) => 6 - i * 0.3) },
    { name: "decelerating", laps: Array.from({ length: 10 }, (_unused, i) => 3 + i * 0.4) },
    { name: "irregular", laps: [3, 6, 2, 7, 4, 5, 3.5, 8, 2.5, 6.5] },
    { name: "min-clamped", laps: [0.0001, 5, 0.0002, 5, 5, 5, 5, 5, 5, 5] },
  ];

  variedSchedules.forEach(({ name, laps }) => {
    it(`is monotonically nondecreasing for a ${name} lap-time schedule sampled every 0.05s`, () => {
      const schedule = buildPlaybackSchedule(resultWithLapTimes(laps, Array(10).fill(5)));
      let previous = -1;
      for (let t = 0; t <= RACE_ANIMATION_SECONDS + 5; t += 0.05) {
        const current = totalOrderValue(carProgressAt(schedule.player, t), 10);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    });
  });
});

describe("T007: pointAtProgress uses fractional progress only — never lap count", () => {
  it("places two cars on different laps at the identical screen point when their fractional lap progress matches", () => {
    // This is expected closed-loop geometry (Decision 5), not a defect: a
    // point on a looping circuit is intrinsically ambiguous about lap count.
    const lapThreePoint = pointAtProgress(TEST_TRACK, 0.37);
    const lapSevenPoint = pointAtProgress(TEST_TRACK, 0.37);

    expect(lapSevenPoint).toEqual(lapThreePoint);
  });

  it("never receives or requires a lap-index argument — lap context stays separately attributable", () => {
    expect(pointAtProgress.length).toBe(2); // (track, progress) only
  });

  it("produces a full-circuit point for progress 0 and 1 without an off-by-one seam", () => {
    const start = pointAtProgress(TEST_TRACK, 0);
    const end = pointAtProgress(TEST_TRACK, 1);
    expect(Number.isFinite(start.x)).toBe(true);
    expect(Number.isFinite(end.x)).toBe(true);
  });
});

describe("T008: one-time lap/finish/callout events", () => {
  it("reports a car's own entered-lap evidence exactly once as lastRenderedPlayerLapIndex is updated by the caller each step", () => {
    const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(4), Array(LAP_COUNT).fill(5));
    result.board = [directItem];
    result.laps[0].firedItems = [{ id: directItem.id, contribution: -3 }];
    const schedule = buildPlaybackSchedule(result);

    // Caller-driven stepping (the real ContestScene update loop's own
    // pattern): re-querying the same lap without advancing
    // lastRenderedPlayerLapIndex must not re-emit the callout.
    const first = frameStateAt(schedule, result, 0.1, -1);
    const second = frameStateAt(schedule, result, 0.15, 0); // caller has now recorded lapIndex 0
    expect(first.newCallouts).toHaveLength(1);
    expect(second.newCallouts).toHaveLength(0);
  });

  it("emits an all-finished transition for every car simultaneously reachable at one sampled time, and it stays true afterward", () => {
    const result = resolveContest(vehicleBuild(), volatileRoster(), 1, 42);
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    const atFinish = nCarFrameStateAt(schedule, result, RACE_ANIMATION_SECONDS, -1);
    const wellAfter = nCarFrameStateAt(schedule, result, RACE_ANIMATION_SECONDS + 50, -1);
    expect(atFinish.allFinished).toBe(true);
    expect(wellAfter.allFinished).toBe(true);
  });

  it("crossing multiple lap boundaries between two samples still reports exactly the correct final lapIndex — no double-count, no undercount", () => {
    const schedule = buildPlaybackSchedule(resultWithLapTimes(Array(10).fill(2), Array(10).fill(5)));
    // A huge single jump, simulating a dropped/low frame rate spanning many boundaries.
    const jumped = carProgressAt(schedule.player, 15);
    const steppedThroughEveryFrame = (() => {
      let last = carProgressAt(schedule.player, 0);
      for (let t = 0; t <= 15; t += 0.01) last = carProgressAt(schedule.player, t);
      return last;
    })();

    expect(jumped).toEqual(steppedThroughEveryFrame);
  });
});

function volatileRoster(): readonly RivalProfile[] {
  return RIVAL_PROFILES.map((profile) => ({
    ...profile,
    levelScaling: () => ({ slotsToFill: 1, priceBias: "low" as const }),
  }));
}

describe("T009: low-frame-rate updates crossing multiple player-lap boundaries", () => {
  it("carProgressAt alone (stateless, pure) always reports the single correct lapIndex for a jump, regardless of how many boundaries it spans", () => {
    const schedule = buildPlaybackSchedule(resultWithLapTimes(Array(LAP_COUNT).fill(1), Array(LAP_COUNT).fill(5)));
    // Jump straight from before lap 1 to mid-way through lap 8 (index 7) —
    // derived from the schedule's own boundaries so the test is correct
    // regardless of MIN_VISUAL_LAP_SECONDS clamping/scaleFactor.
    const midLap8 = (schedule.player.visualLapBoundaries[6] + schedule.player.visualLapBoundaries[7]) / 2;
    const progress = carProgressAt(schedule.player, midLap8);

    expect(progress.lapIndex).toBe(7);
    expect(progress.finished).toBe(false);
    expect(progress.lapProgress).toBeGreaterThan(0);
    expect(progress.lapProgress).toBeLessThan(1);
  });

  it("frameStateAt's enteredLap reflects only the latest lap after a multi-boundary jump, not every intermediate one", () => {
    const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
    const result = resultWithLapTimes(Array(LAP_COUNT).fill(1), Array(LAP_COUNT).fill(5));
    result.board = [directItem];
    result.laps.forEach((lap, index) => { lap.firedItems = [{ id: directItem.id, contribution: -0.1 * (index + 1) }]; });
    const schedule = buildPlaybackSchedule(result);

    // Caller had last recorded lapIndex -1 (start); a single low-frame-rate
    // update jumps straight to mid-lap-8 (lapIndex 7).
    const midLap8 = (schedule.player.visualLapBoundaries[6] + schedule.player.visualLapBoundaries[7]) / 2;
    const frame = frameStateAt(schedule, result, midLap8, -1);
    expect(frame.player.lapIndex).toBe(7);
    // Exactly one lap's worth of callout evidence is surfaced, not eight.
    expect(frame.newCallouts).toHaveLength(1);
    expect(frame.newCallouts[0].contribution).toBeCloseTo(-0.1 * 8);
  });
});

describe("T010: Result data is the immutable resolved result, never frame-derived rank", () => {
  it("keeps final position/time/gap fields exactly equal to the precomputed result even when a live sample near the finish would show a different provisional order", () => {
    const result = staggeredFinishFixture();
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);

    // Sample well before every ghost has finished — a live frame here can
    // legitimately disagree with the eventual final order (ghosts still
    // separating). Final Results must never read this frame at all.
    const midRaceFrame = nCarFrameStateAt(schedule, result, 5, -1);
    const finalPositions = result.cars.map((car) => car.position);
    expect(finalPositions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // The authoritative final ranking (by result.position) is fixed at
    // resolution time and is not required to equal any single live frame's
    // standings — this is the structural guarantee resultFormatting.ts's
    // functions rely on by taking only `NCarContestResult`, never a frame.
    expect(result.cars.find((car) => car.role === "player")!.position).toBe(8);
    void midRaceFrame;
  });

  it("volatile mid-race frame order does not have to, and generally will not, match the final position order — proving Results cannot safely substitute a frame for the real result", () => {
    const result = volatileFrameOrderFixture();
    const schedule = buildNCarPlaybackSchedule(result, TEST_TRACK);
    const earlyFrameOrder = nCarFrameStateAt(schedule, result, 2, -1).standings.map((car) => car.id);
    const finalOrder = [...result.cars].sort((a, b) => a.position - b.position).map((car) => car.id);

    // Not asserting they always differ (that would be flaky) — asserting the
    // two are computed from entirely independent sources, so no code path
    // could accidentally read one for the other without a type error.
    expect(Array.isArray(earlyFrameOrder)).toBe(true);
    expect(Array.isArray(finalOrder)).toBe(true);
    expect(finalOrder).toHaveLength(8);
  });

  it("changingCheckpointOrderFixture's mid-race rank flip never appears in the final result — final position reflects only the complete race", () => {
    const result = changingCheckpointOrderFixture();
    const player = result.cars.find((car) => car.role === "player")!;
    const alternate = result.cars.find((car) => car.id === "rival-alternate")!;

    // Player led at checkpoint 1 but trailed from checkpoint 2 onward
    // (fixture doc comment) — final result must reflect the complete-race
    // total only, not the checkpoint-1 snapshot.
    expect(player.time).toBeGreaterThan(alternate.time);
    expect(player.position).toBeGreaterThan(alternate.position);
  });
});

// 027-race-legibility-integrity Phase 4 (US1/US2, T024-T028): the pure
// equal-lap checkpoint projection and its once-per-player-lap publication
// state — contract §2/§3.

describe("T024/T025: checkpointProjection", () => {
  it("sums each car's cumulative time through exactly completedLap and ranks ascending", () => {
    const result = changingCheckpointOrderFixture();
    const projection = checkpointProjection(result, 1);

    const player = projection.cars.find((car) => car.carId === "player")!;
    const alternate = projection.cars.find((car) => car.carId === "rival-alternate")!;
    expect(player.cumulativeTime).toBe(3);
    expect(alternate.cumulativeTime).toBe(5);
    expect(player.position).toBeLessThan(alternate.position);
    expect(projection.completedLap).toBe(1);
    expect(projection.lapCount).toBe(result.lapCount);
  });

  it("flips player position between checkpoint 1 and checkpoint 2, matching an independent cumulative sum", () => {
    const result = changingCheckpointOrderFixture();
    const lap1 = checkpointProjection(result, 1);
    const lap2 = checkpointProjection(result, 2);

    expect(lap1.playerPosition).toBeLessThan(lap1.cars.find((c) => c.carId === "rival-alternate")!.position);
    expect(lap2.playerPosition).toBeGreaterThan(lap2.cars.find((c) => c.carId === "rival-alternate")!.position);
  });

  it("assigns contiguous 1..N positions with no gaps or duplicates at every valid lap", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    for (let lap = 1; lap <= result.lapCount; lap++) {
      const projection = checkpointProjection(result, lap);
      expect(projection.cars.map((car) => car.position).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 8 }, (_unused, i) => i + 1),
      );
    }
  });

  it("returns the player plus only the immediately adjacent ranked neighbors", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const projection = checkpointProjection(result, 3);
    const player = projection.cars.find((car) => car.carId === "player")!;

    if (projection.ahead) expect(projection.ahead.position).toBe(player.position - 1);
    if (projection.behind) expect(projection.behind.position).toBe(player.position + 1);
  });

  it("omits ahead when the player projects first, and behind when the player projects last, without stale data", () => {
    const result = staggeredFinishFixture();
    // Rivals are far faster (fixture doc) — player is projected last at every lap.
    const lastPlace = checkpointProjection(result, 1);
    expect(lastPlace.playerPosition).toBe(8);
    expect(lastPlace.behind).toBeNull();
    expect(lastPlace.ahead).not.toBeNull();

    const firstPlaceResult = equalTimeFixture(10, 5);
    firstPlaceResult.cars.forEach((car) => { if (car.role === "rival") car.laps.forEach((lap) => { lap.time += 1; }); });
    const firstPlace = checkpointProjection(firstPlaceResult, 1);
    expect(firstPlace.playerPosition).toBe(1);
    expect(firstPlace.ahead).toBeNull();
    expect(firstPlace.behind).not.toBeNull();
  });

  it("every gapToPlayer is signed car-minus-player cumulative time (contract data-model.md)", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const projection = checkpointProjection(result, 5);
    const playerTime = projection.player.cumulativeTime;

    projection.cars.forEach((car) => {
      expect(car.gapToPlayer).toBeCloseTo(car.cumulativeTime - playerTime, 9);
    });
    expect(projection.player.gapToPlayer).toBe(0);
  });

  it("breaks equal-time ties by tieBreakOrder, matching the final result's own tie policy (T025)", () => {
    const result = resolveContest(vehicleBuild(), TIE_ROSTER, 1, 42);
    const projection = checkpointProjection(result, 1);

    expect(projection.cars.map((car) => car.carId)).toEqual(result.tieBreakOrder);
    expect(projection.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("rejects a lap number outside 1..lapCount", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    expect(() => checkpointProjection(result, 0)).toThrow(CheckpointProjectionError);
    expect(() => checkpointProjection(result, result.lapCount + 1)).toThrow(CheckpointProjectionError);
    expect(() => checkpointProjection(result, 1.5)).toThrow(CheckpointProjectionError);
  });

  it("rejects a car with fewer recorded laps than the requested checkpoint", () => {
    const malformed = ncarResult([
      { id: "player", role: "player", name: "Player", color: "#ffd447", lapTimes: [4, 4] },
      { id: "rival-torres", role: "rival", name: "Torres", color: "#7cc", lapTimes: [4] },
    ]);
    expect(() => checkpointProjection(malformed, 2)).toThrow(CheckpointProjectionError);
  });

  it("never reads playback schedules, visual time, or geometry — pure function of (result, completedLap) only", () => {
    expect(checkpointProjection.length).toBe(2);
  });

  it("is pure — identical arguments always produce a deeply equal projection", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    expect(checkpointProjection(result, 4)).toEqual(checkpointProjection(result, 4));
  });
});

describe("T027/T028: latestCompletedPlayerLap and updateLiveProjection publication cadence", () => {
  const AWAITING: LiveProjectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };

  it("latestCompletedPlayerLap reads 0 before any lap completes and the 1-indexed completed count after", () => {
    expect(latestCompletedPlayerLap({ lapIndex: 0, lapProgress: 0.4, finished: false }, 10)).toBe(0);
    expect(latestCompletedPlayerLap({ lapIndex: 3, lapProgress: 0, finished: false }, 10)).toBe(3);
    expect(latestCompletedPlayerLap({ lapIndex: 10, lapProgress: 1, finished: true }, 10)).toBe(10);
  });

  it("stays Awaiting Lap 1 Split before the player's first completed lap", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 0, lapProgress: 0.9, finished: false });
    expect(state).toEqual(AWAITING);
  });

  it("publishes a first-split projected state exactly when the player completes lap 1", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 1, lapProgress: 0, finished: false });

    expect(state.kind).toBe("projected");
    if (state.kind !== "projected") throw new Error("unreachable");
    expect(state.current.completedLap).toBe(1);
    expect(state.change).toBe("first-split");
    expect(state.previous).toBeNull();
  });

  it("remains stable (referentially equal) across repeated calls within the same completed lap", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const afterLap1 = updateLiveProjection(AWAITING, result, { lapIndex: 1, lapProgress: 0, finished: false });
    const stillLap1a = updateLiveProjection(afterLap1, result, { lapIndex: 1, lapProgress: 0.3, finished: false });
    const stillLap1b = updateLiveProjection(afterLap1, result, { lapIndex: 1, lapProgress: 0.95, finished: false });

    expect(stillLap1a).toBe(afterLap1);
    expect(stillLap1b).toBe(afterLap1);
  });

  it("publishes a new checkpoint, and a gained/lost/held change, only when the completed lap count increases", () => {
    const result = changingCheckpointOrderFixture();
    const afterLap1 = updateLiveProjection(AWAITING, result, { lapIndex: 1, lapProgress: 0, finished: false });
    const afterLap2 = updateLiveProjection(afterLap1, result, { lapIndex: 2, lapProgress: 0, finished: false });

    if (afterLap1.kind !== "projected" || afterLap2.kind !== "projected") throw new Error("unreachable");
    expect(afterLap2.current.completedLap).toBe(2);
    expect(afterLap2.previous).toEqual(afterLap1.current);
    // Player led at checkpoint 1, trails at checkpoint 2 (fixture doc) — a real loss.
    expect(afterLap2.change).toBe("lost");
    expect(afterLap2.placesChanged).toBeGreaterThan(0);
  });

  it("publishes only the latest checkpoint once when several player-lap boundaries are crossed in a single update (no replay burst)", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    // Simulates a low-frame-rate update: goes straight from awaiting to lapIndex 5 in one call.
    const state = updateLiveProjection(AWAITING, result, { lapIndex: 5, lapProgress: 0.2, finished: false });

    expect(state.kind).toBe("projected");
    if (state.kind !== "projected") throw new Error("unreachable");
    expect(state.current.completedLap).toBe(5);
    expect(state.previous).toBeNull(); // no intermediate checkpoints were ever published
  });

  it("final lap: publishes the last checkpoint, matching the eventual final ranking's own tie policy", () => {
    const result = resolveContest(vehicleBuild(), TIE_ROSTER, 1, 42);
    const state = updateLiveProjection(AWAITING, result, { lapIndex: result.lapCount, lapProgress: 1, finished: true });

    expect(state.kind).toBe("projected");
    if (state.kind !== "projected") throw new Error("unreachable");
    expect(state.current.completedLap).toBe(result.lapCount);
    expect(state.current.cars.map((car) => car.carId)).toEqual(result.tieBreakOrder);
  });

  it("is otherwise pure — identical (previous, result, progress) always returns an equal result", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const progress = { lapIndex: 3, lapProgress: 0.5, finished: false };
    expect(updateLiveProjection(AWAITING, result, progress)).toEqual(updateLiveProjection(AWAITING, result, progress));
  });
});

// 027-race-legibility-integrity Phase 7 (T052/T053): checkpoint coverage for
// every valid lap count across several deterministic fixture shapes, and an
// explicit proof that the new evidence fields are additive-only.
describe("Phase 7: checkpointProjection coverage across every valid lap count", () => {
  const LAP_COUNTS = [10, 12, 14, 16] as const;

  LAP_COUNTS.forEach((lapCount) => {
    it(`resolves a full, gap-free, tie-consistent projection at every lap 1..${lapCount}`, () => {
      const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 7, lapCount);
      expect(result.lapCount).toBe(lapCount);
      for (let lap = 1; lap <= lapCount; lap++) {
        const projection = checkpointProjection(result, lap);
        expect(projection.cars).toHaveLength(8);
        expect(projection.cars.map((car) => car.position).sort((a, b) => a - b)).toEqual(
          Array.from({ length: 8 }, (_unused, i) => i + 1),
        );
        expect(projection.cars.find((car) => car.role === "player")).toBe(projection.player);
      }
    });
  });

  [equalTimeFixture(), volatileFrameOrderFixture(), changingCheckpointOrderFixture(), staggeredFinishFixture()].forEach(
    (fixtureResult, index) => {
      it(`resolves every checkpoint of fixture #${index} without a malformed-laps error`, () => {
        for (let lap = 1; lap <= fixtureResult.lapCount; lap++) {
          expect(() => checkpointProjection(fixtureResult, lap)).not.toThrow();
        }
      });
    },
  );
});

describe("Phase 7 (T053): track/tieBreakOrder are retained on NCarContestResult", () => {
  it("retains the generated track and internally reconciles the player total", () => {
    const result = resolveContest(vehicleBuild(), RIVAL_PROFILES, 1, 42);
    const { track, tieBreakOrder, ...withoutNewEvidence } = result;
    void track;
    void tieBreakOrder;

    expect(Object.keys(result).sort()).toEqual(
      ["board", "cars", "lapCount", "outcome", "storage", "tieBreakOrder", "track"].sort(),
    );
    expect(withoutNewEvidence.outcome).toBe("loss");
    expect(withoutNewEvidence.lapCount).toBe(10);
    const player = withoutNewEvidence.cars.find((car) => car.role === "player")!;
    expect(player.position).toBe(8);
    expect(player.time).toBeCloseTo(player.laps.reduce((sum, lap) => sum + lap.time, 0), 9);
  });
});

// --- Feature 030: race playback controls ---------------------------------

describe("PlaybackSpeed domain (T006)", () => {
  it("exposes exactly two speeds in stable authored order", () => {
    expect(PLAYBACK_SPEEDS).toHaveLength(2);
    expect(PLAYBACK_SPEEDS.map((entry) => entry.value)).toEqual(["normal", "fast"]);
  });

  it("labels normal as legacy-rate 1x and fast as exactly double-rate 2x", () => {
    const normal = playbackSpeedDescriptor("normal");
    const fast = playbackSpeedDescriptor("fast");
    expect(normal.label).toBe("1×");
    expect(normal.shortcut).toBe("1");
    expect(normal.multiplier).toBe(1);
    expect(fast.label).toBe("2×");
    expect(fast.shortcut).toBe("2");
    expect(fast.multiplier).toBe(2);
  });

  it("rejects any value outside the closed {normal, fast} domain", () => {
    expect(isPlaybackSpeed("normal")).toBe(true);
    expect(isPlaybackSpeed("fast")).toBe(true);
    expect(isPlaybackSpeed("turbo")).toBe(false);
    expect(isPlaybackSpeed(null)).toBe(false);
    expect(isPlaybackSpeed(undefined)).toBe(false);
    expect(isPlaybackSpeed(2)).toBe(false);
    expect(() => playbackSpeedDescriptor("turbo" as PlaybackSpeed)).toThrow();
  });
});

describe("PresentationClock (T007–T009)", () => {
  it("initializes to the 1x default at schedule time zero, uninitialized", () => {
    const clock = createPresentationClock();
    expect(clock.speed).toBe("normal");
    expect(clock.scheduleTimeSeconds).toBe(0);
    expect(clock.initialized).toBe(false);
  });

  it("advances at the legacy rate under 1x and exactly double under 2x", () => {
    let clock = createPresentationClock("normal");
    clock = advancePresentationClock(clock, 1).clock;
    expect(clock.scheduleTimeSeconds).toBeCloseTo(1);
    // Speed change never jumps time (contract §3).
    clock = selectPlaybackSpeed(clock, "fast");
    expect(clock.scheduleTimeSeconds).toBeCloseTo(1);
    clock = advancePresentationClock(clock, 1).clock;
    expect(clock.scheduleTimeSeconds).toBeCloseTo(3);
  });

  it("reports the first positive-time advance and initializes exactly once", () => {
    const clock = createPresentationClock("normal");
    const zeroAdvance = advancePresentationClock(clock, 0);
    expect(zeroAdvance.advance.isFirstAdvance).toBe(false);
    expect(zeroAdvance.clock.initialized).toBe(false);
    const first = advancePresentationClock(clock, 0.016);
    expect(first.advance.isFirstAdvance).toBe(true);
    expect(first.advance.previousScheduleTimeSeconds).toBe(0);
    expect(first.advance.scheduleTimeSeconds).toBeCloseTo(0.016);
    expect(first.advance.speed).toBe("normal");
    expect(first.clock.initialized).toBe(true);
    const again = advancePresentationClock(first.clock, 0.016);
    expect(again.advance.isFirstAdvance).toBe(false);
    expect(again.clock.initialized).toBe(true);
  });

  it("is idempotent on zero deltas and monotonic on positive deltas", () => {
    const clock = createPresentationClock("fast");
    const before = clock.scheduleTimeSeconds;
    const zero = advancePresentationClock(clock, 0);
    expect(zero.clock.scheduleTimeSeconds).toBe(before);
    expect(advancePresentationClock(zero.clock, 0).clock.scheduleTimeSeconds).toBe(before);
    const a = advancePresentationClock(clock, 0.5).clock;
    const b = advancePresentationClock(a, 0.5).clock;
    const c = advancePresentationClock(b, 0.5).clock;
    expect(b.scheduleTimeSeconds).toBeGreaterThan(a.scheduleTimeSeconds);
    expect(c.scheduleTimeSeconds).toBeGreaterThan(b.scheduleTimeSeconds);
  });

  it("re-selecting the active speed is idempotent and never jumps time", () => {
    const clock = createPresentationClock("normal");
    const same = selectPlaybackSpeed(clock, "normal");
    expect(same).toBe(clock);
    const advanced = advancePresentationClock(clock, 2).clock;
    const other = selectPlaybackSpeed(advanced, "fast");
    expect(other).not.toBe(advanced);
    expect(other.scheduleTimeSeconds).toBe(advanced.scheduleTimeSeconds);
    expect(other.speed).toBe("fast");
    // re-selecting the new active speed is again idempotent
    expect(selectPlaybackSpeed(other, "fast")).toBe(other);
  });

  it("rejects negative, NaN, and Infinity deltas", () => {
    const clock = createPresentationClock();
    expect(() => advancePresentationClock(clock, -1)).toThrow();
    expect(() => advancePresentationClock(clock, Number.NaN)).toThrow();
    expect(() => advancePresentationClock(clock, Number.POSITIVE_INFINITY)).toThrow();
  });

  it("rejects speeds outside the closed {normal, fast} domain on construct and select", () => {
    expect(() => createPresentationClock("turbo" as PlaybackSpeed)).toThrow();
    expect(() => selectPlaybackSpeed(createPresentationClock(), "turbo" as PlaybackSpeed)).toThrow();
  });
});

// A 2-car result whose every player lap fires the same direct item, so every
// crossed lap (including the time-zero batch) carries an item-callout.
function resultWithCallouts(): ContestResult {
  const directItem = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
  const laps: LapBreakdown[] = Array.from({ length: LAP_COUNT }, (_, index) => ({
    lap: index + 1,
    playerLapTime: 4,
    ghostLapTime: 5,
    firedItems: [{ id: directItem.id, contribution: -3 }],
  }));
  const playerTime = 4 * LAP_COUNT;
  const ghostTime = 5 * LAP_COUNT;
  return {
    lapCount: LAP_COUNT,
    playerTime,
    ghostTime,
    gap: playerTime - ghostTime,
    outcome: "loss",
    board: [directItem],
    storage: [],
    laps,
  };
}

function eventFingerprint(e: CrossedPlaybackEvent): string {
  return [
    e.kind,
    e.scheduleTime.toFixed(6),
    e.lap ?? "",
    e.carId ?? "",
    e.callout?.item.id ?? "",
    e.projection?.completedLap ?? "",
  ].join("|");
}

describe("crossed playback boundaries (T010–T013)", () => {
  it("emits the one-time time-zero batch on the first positive-time advance only", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const first = crossedPlaybackBoundaries(view, 0, 0.001, true);
    const kinds = first.map((e) => e.kind);
    expect(kinds[0]).toBe("time-zero");
    expect(first.find((e) => e.kind === "player-lap")?.lap).toBe(1);
    const later = crossedPlaybackBoundaries(view, 0.001, 0.002, false);
    expect(later.some((e) => e.kind === "time-zero")).toBe(false);
    expect(later.some((e) => e.kind === "player-lap" && e.lap === 1)).toBe(false);
  });

  it("emits a time-zero item-callout for lap 1 and per-crossed-lap callouts afterward", () => {
    const result = resultWithCallouts();
    const schedule = buildPlaybackSchedule(result);
    const view = twoCarBoundaryView(schedule, result);
    const directItem = result.board[0];
    const finish = maxFinishScheduleTime(view);
    const all = crossedPlaybackBoundaries(view, 0, finish, true);
    const callouts = all.filter((e) => e.kind === "item-callout");
    expect(callouts).toHaveLength(LAP_COUNT);
    expect(callouts.every((e) => e.callout?.item.id === directItem.id)).toBe(true);
    expect(callouts.map((e) => e.lap)).toEqual(Array.from({ length: LAP_COUNT }, (_, i) => i + 1));
  });

  it("identifies the same boundary set for one large frame and many small frames (dedup)", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const finish = maxFinishScheduleTime(view);

    const big = crossedPlaybackBoundaries(view, 0, finish, true);
    const bigFingerprints = big.map(eventFingerprint);
    expect(new Set(bigFingerprints).size).toBe(bigFingerprints.length);

    const steps = 37;
    let prev = 0;
    const collected: CrossedPlaybackEvent[] = [];
    for (let i = 1; i <= steps; i++) {
      const next = (finish * i) / steps;
      collected.push(...crossedPlaybackBoundaries(view, prev, next, i === 1));
      prev = next;
    }
    expect(collected.map(eventFingerprint)).toEqual(bigFingerprints);
  });

  it("is speed-independent: the same schedule-time interval yields the same boundaries", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const finish = maxFinishScheduleTime(view);
    const once = crossedPlaybackBoundaries(view, 0, finish, true);
    const twice = crossedPlaybackBoundaries(view, 0, finish, true);
    expect(twice.map(eventFingerprint)).toEqual(once.map(eventFingerprint));
  });

  it("orders same-time finishes by the stable tie-break order and results-ready last", () => {
    const result = equalTimeFixture(4);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const finish = maxFinishScheduleTime(view);
    const all = crossedPlaybackBoundaries(view, 0, finish, true);
    const carFinishes = all.filter((e) => e.kind === "car-finished");
    expect(carFinishes.map((e) => e.carId)).toEqual(result.tieBreakOrder);
    expect(all[all.length - 1].kind).toBe("results-ready");
    const playerFinish = all.find((e) => e.kind === "car-finished" && e.carId === "player")!;
    const playerCheckpoint = all.find(
      (e) => e.kind === "checkpoint" && e.projection?.completedLap === 4,
    );
    expect(playerCheckpoint).toBeDefined();
    expect(all.indexOf(playerCheckpoint!)).toBeLessThan(all.indexOf(playerFinish));
  });
});

describe("crossed boundaries — results-ready, checkpoints, open-left (T012–T013)", () => {
  it("emits results-ready exactly once across the full race and never before the last finish", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const finish = maxFinishScheduleTime(view);
    const all = crossedPlaybackBoundaries(view, 0, finish, true);
    const ready = all.filter((e) => e.kind === "results-ready");
    expect(ready).toHaveLength(1);
    expect(ready[0].scheduleTime).toBe(finish);
    const before = crossedPlaybackBoundaries(view, 0, finish - 0.001, true);
    expect(before.some((e) => e.kind === "results-ready")).toBe(false);
  });

  it("emits one checkpoint per completed lap (1..lapCount), the player-finish one last", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    const finish = maxFinishScheduleTime(view);
    const all = crossedPlaybackBoundaries(view, 0, finish, true);
    const checkpoints = all.filter((e) => e.kind === "checkpoint");
    expect(
      checkpoints.map((e) => e.projection?.completedLap).sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual(Array.from({ length: result.lapCount }, (_, i) => i + 1));
  });

  it("never re-emits a boundary at the previous schedule time (open-left interval)", () => {
    const result = resultWithCallouts();
    const schedule = buildPlaybackSchedule(result);
    const view = twoCarBoundaryView(schedule, result);
    const firstBoundary = schedule.player.visualLapBoundaries[0];
    const includes = crossedPlaybackBoundaries(view, 0, firstBoundary, true);
    expect(includes.some((e) => e.kind === "player-lap" && e.lap === 2)).toBe(true);
    const excludes = crossedPlaybackBoundaries(view, firstBoundary, firstBoundary + 0.001, false);
    expect(excludes.some((e) => e.kind === "player-lap" && e.lap === 2)).toBe(false);
  });
});

describe("boundary view builders (T010)", () => {
  it("nCarBoundaryView preserves lapCount, cars, player, items, and tie-break order", () => {
    const result = staggeredFinishFixture(8);
    const schedule = buildNCarPlaybackSchedule(result, result.track);
    const view = nCarBoundaryView(schedule, result);
    expect(view.lapCount).toBe(result.lapCount);
    expect(view.cars.map((c) => c.id)).toEqual(schedule.cars.map((c) => c.id));
    expect(view.player.id).toBe(result.cars.find((c) => c.role === "player")!.id);
    expect(view.tieBreakOrder).toBe(result.tieBreakOrder);
    expect(view.playerLaps).toHaveLength(result.lapCount);
    expect(view.projectCheckpoint?.(1)).toEqual(checkpointProjection(result, 1));
  });

  it("twoCarBoundaryView maps the player and ghost with player-first tie-break and no checkpoint provider", () => {
    const result = resultWithCallouts();
    const schedule = buildPlaybackSchedule(result);
    const view = twoCarBoundaryView(schedule, result);
    expect(view.cars.map((c) => c.id)).toEqual(["player", "ghost"]);
    expect(view.player.id).toBe("player");
    expect(view.tieBreakOrder).toEqual(["player", "ghost"]);
    expect(view.projectCheckpoint).toBeUndefined();
    expect(view.playerLaps).toHaveLength(result.lapCount);
  });
});

describe("PlaybackController lifecycle, timing, and idempotent selection (T017–T020, T026–T029)", () => {
  // The controller is the pure embodiment of the data-model "State Lifecycle":
  // fresh 1× init → time-zero batch on first positive advance → monotonic
  // advances → idempotent speed selection → results-ready once → no
  // post-finish mutation. These prove the loop logic both watched-race scenes
  // delegate to, without a headless Phaser harness (Phase 1 baseline
  // convention: no scene is ever instantiated in tests; the pure layers the
  // scenes consume are tested directly).

  it("initializes every new race to the 1× default with zero schedule time (contract §6)", () => {
    const controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    expect(controller.clock.speed).toBe("normal");
    expect(controller.clock.scheduleTimeSeconds).toBe(0);
    expect(controller.clock.initialized).toBe(false);
    expect(controller.lastEvents).toEqual([]);
    expect(controller.resultsReady).toBe(false);
  });

  it("publishes the one-time time-zero initialization batch exactly once on the first positive advance", () => {
    let controller = createPlaybackController(TWO_CAR_BOUNDARY_VIEW);
    const zeroed = advancePlaybackController(controller, 0);
    expect(zeroed.lastEvents).toEqual([]);
    expect(zeroed.clock.initialized).toBe(false);
    controller = advancePlaybackController(zeroed, 0.001);
    expect(controller.clock.initialized).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "time-zero")).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "player-lap")).toBe(true);
    const again = advancePlaybackController(controller, 0.001);
    expect(again.lastEvents.some((event) => event.kind === "time-zero")).toBe(false);
  });

  it("advances schedule time at the legacy rate at 1× and double it at 2× (contract §2)", () => {
    let normal = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    normal = selectPlaybackControllerSpeed(normal, "normal");
    normal = advancePlaybackController(normal, 1); // 1 s real → 1 schedule
    expect(normal.clock.scheduleTimeSeconds).toBe(1);
    let fast = selectPlaybackControllerSpeed(createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW), "fast");
    fast = advancePlaybackController(fast, 1); // 1 s real → 2 schedule
    expect(fast.clock.scheduleTimeSeconds).toBe(2);
  });

  it("selects speed idempotently without altering schedule time (contract §3)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = selectPlaybackControllerSpeed(controller, "normal");
    controller = advancePlaybackController(controller, 2); // schedule 2 at 1×
    expect(controller.clock.scheduleTimeSeconds).toBe(2);
    controller = selectPlaybackControllerSpeed(controller, "fast");
    expect(controller.clock.scheduleTimeSeconds).toBe(2);
    expect(selectPlaybackControllerSpeed(controller, "fast")).toBe(controller);
    const back = selectPlaybackControllerSpeed(controller, "normal");
    expect(back.clock.scheduleTimeSeconds).toBe(2);
    expect(selectPlaybackControllerSpeed(back, "normal")).toBe(back);
  });

  it("never moves schedule time backward across speed changes (monotonic, contract §3)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    const sequence: ReadonlyArray<readonly [number, PlaybackSpeed]> = [
      [1, "normal"], [1, "fast"], [0, "fast"], [1, "normal"], [1, "fast"],
    ];
    const times: number[] = [];
    for (const [delta, speed] of sequence) {
      controller = selectPlaybackControllerSpeed(controller, speed);
      controller = advancePlaybackController(controller, delta);
      times.push(controller.clock.scheduleTimeSeconds);
    }
    expect(times).toEqual([1, 3, 3, 4, 6]);
    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]);
    }
  });

  it("sets resultsReady exactly once when the finish boundary is crossed and never reverts (T023)", () => {
    const finish = maxFinishScheduleTime(EIGHT_CAR_BOUNDARY_VIEW); // 20
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = selectPlaybackControllerSpeed(controller, "normal");
    controller = advancePlaybackController(controller, 19.999); // schedule 19.999
    expect(controller.clock.scheduleTimeSeconds).toBeCloseTo(finish - 0.001, 6);
    expect(controller.resultsReady).toBe(false);
    controller = advancePlaybackController(controller, 0.002); // crosses 20
    expect(controller.resultsReady).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "results-ready")).toBe(true);
    const finished = controller;
    expect(advancePlaybackController(finished, 10)).toBe(finished);
    expect(selectPlaybackControllerSpeed(finished, "fast")).toBe(finished);
  });
});

describe("PlaybackController boundary integrity and Test Day Skip (contract §4, §7)", () => {
  it("identifies the same crossed boundaries for one large frame and equivalent small frames (contract §4)", () => {
    const init1 = advancePlaybackController(createPlaybackController(TWO_CAR_BOUNDARY_VIEW), 0.001);
    const init2 = advancePlaybackController(createPlaybackController(TWO_CAR_BOUNDARY_VIEW), 0.001);
    expect(init1.lastEvents).toEqual(init2.lastEvents);
    const large = advancePlaybackController(init1, 6); // schedule (0.0005, 3.0005]
    let controller = init2;
    const collected: CrossedPlaybackEvent[] = [];
    for (let index = 0; index < 60; index += 1) {
      controller = advancePlaybackController(controller, 0.1);
      collected.push(...controller.lastEvents);
    }
    expect(collected).toEqual(large.lastEvents);
  });

  it("Test Day Skip targets the finite finish boundary, emits all newly crossed boundaries once, and never uses Infinity (contract §7)", () => {
    let controller = createPlaybackController(TWO_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 0.001);
    controller = skipPlaybackController(controller);
    expect(Number.isFinite(controller.clock.scheduleTimeSeconds)).toBe(true);
    expect(controller.clock.scheduleTimeSeconds).toBe(maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW));
    expect(controller.resultsReady).toBe(true);
    expect(controller.lastEvents.filter((event) => event.kind === "car-finished")).toHaveLength(
      TWO_CAR_BOUNDARY_VIEW.cars.length,
    );
    expect(controller.lastEvents.some((event) => event.kind === "results-ready")).toBe(true);
    expect(skipPlaybackController(controller)).toBe(controller);
  });

  it("Skip as the very first action still publishes the time-zero batch then all interval boundaries", () => {
    const controller = skipPlaybackController(createPlaybackController(TWO_CAR_BOUNDARY_VIEW));
    expect(controller.clock.scheduleTimeSeconds).toBe(maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW));
    expect(controller.resultsReady).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "time-zero")).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "player-lap")).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "car-finished")).toBe(true);
    expect(controller.lastEvents.some((event) => event.kind === "results-ready")).toBe(true);
  });

  it("rejects negative and non-finite deltas at the controller boundary (contract §3)", () => {
    const controller = createPlaybackController(TWO_CAR_BOUNDARY_VIEW);
    expect(() => advancePlaybackController(controller, -1)).toThrow();
    expect(() => advancePlaybackController(controller, Number.NaN)).toThrow();
    expect(() => advancePlaybackController(controller, Number.POSITIVE_INFINITY)).toThrow();
  });
});
