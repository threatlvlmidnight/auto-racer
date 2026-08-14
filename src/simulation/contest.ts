import { simulatePlayerLaps } from "./laps";
import { resolveRivalBuild, selectGeneratedRivalSetup } from "./rivals";
import { installedItems, storedItems } from "./slots";
import { generateTrack } from "./tracks";
import type { Track } from "./tracks";
import {
  LAP_COUNT,
  type Build,
  type CarResult,
  type ContestOutcome,
  type ContestResult,
  type NCarContestResult,
  type LockedRaceSetup,
  type RivalProfile,
  type SampleGhost,
  type VehicleBuild,
} from "./types";

export function ghostLapTimes(ghost: SampleGhost, lapCount = LAP_COUNT): number[] {
  return Array(lapCount).fill(ghost.lapTime);
}

export type ContestResolutionErrorCode = "invalid-roster-size";

/** Typed, inspectable failure for a malformed rival roster (data-model.md Validation Invariant 5). */
export class ContestResolutionError extends Error {
  constructor(
    public readonly code: ContestResolutionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ContestResolutionError";
  }
}

const PLAYER_COLOR = "#ffd447";
const REQUIRED_RIVAL_COUNT = 7;

/**
 * Resolve a 1v1 contest between a Build and a SampleGhost (FR-004,
 * 011-build-test-day's Test Day/Practice path — unchanged by 012, per its
 * research.md Decision 6 and FR-011).
 *
 * contracts/simulation-contract.md invariants:
 *  1. Determinism — pure function of (build, ghost); no randomness, no I/O.
 *  2. Outcome correctness — win iff playerTime < ghostTime, loss iff greater,
 *     tie iff equal (FR-011: a tie is recorded as "tie" here; the
 *     both-sides-win framing is a presentation-layer concern, not this
 *     function's).
 *  3. Detectable effect — active item modifiers change playerTime (see build.ts).
 *  4. Order-independence — only the active item set matters.
 *  5. No side effects — build and ghost are only read, never mutated.
 */
/**
 * 028-pre-race-setup FR-012D/E, contract §8: `track`/`setup` are additive
 * optional parameters — every pre-028 2-arg/3-arg call site keeps its exact
 * legacy no-track-physics output. Setup-origin Test Day is the only caller
 * that supplies both, applying the exact retained upcoming track and a
 * temporary locked setup snapshot through the same lap-stat fold as scored
 * contests.
 */
export function resolveContest(
  build: Build,
  ghost: SampleGhost,
  lapCount?: number,
  track?: Track,
  setup?: LockedRaceSetup,
): ContestResult;
/**
 * Resolve a scored N-car contest between the player and exactly 7 rival
 * profiles (012-multi-ghost-contest, contract §3). Pure and deterministic:
 * identical (playerBuild, rivalRoster, level, seed, lapCount) always
 * produces a deeply equal result. Every rival counts toward standings — no
 * decorative car (FR-003). Ties resolve by fixed roster order: player,
 * then rivals in authored catalog order (FR-007).
 */
export function resolveContest(
  playerBuild: Build,
  rivalRoster: readonly RivalProfile[],
  level: number,
  seed: number,
  lapCount?: number,
  setup?: LockedRaceSetup,
  /**
   * 028-pre-race-setup FR-018/018A: when provided, every rival also
   * receives its own deterministic generated setup (contract §6) bound to
   * this encounter ID. Omitted only by explicitly legacy callers/fixtures
   * (contract §5) — those keep exact pre-028 rival behavior (all-zero,
   * no `CarResult.setup`) with zero code changes on their part.
   */
  encounterId?: string,
  rivalSetups?: readonly LockedRaceSetup[],
  rivalBuilds?: readonly VehicleBuild[],
  regionTheme?: import("./types").RegionId,
): NCarContestResult;
export function resolveContest(
  build: Build,
  second: SampleGhost | readonly RivalProfile[],
  third?: number,
  fourth?: number | Track,
  fifth?: number | LockedRaceSetup,
  sixth?: LockedRaceSetup,
  seventh?: string,
  eighth?: readonly LockedRaceSetup[],
  ninth?: readonly VehicleBuild[],
  tenth?: import("./types").RegionId,
): ContestResult | NCarContestResult {
  if (Array.isArray(second)) {
    return resolveNCarContest(
      build, second, third ?? 1, (fourth as number | undefined) ?? 0, (fifth as number | undefined) ?? LAP_COUNT,
      sixth, seventh, eighth, ninth, tenth,
    );
  }
  return resolveLegacyContest(
    build, second as SampleGhost, third ?? LAP_COUNT, fourth as Track | undefined, fifth as LockedRaceSetup | undefined,
  );
}

function resolveLegacyContest(
  build: Build,
  ghost: SampleGhost,
  lapCount: number,
  track?: Track,
  setup?: LockedRaceSetup,
): ContestResult {
  const ghostLaps = ghostLapTimes(ghost, lapCount);
  const laps = simulatePlayerLaps(build, lapCount, track, setup?.totalDelta).map((playerLap, index) => ({
    lap: index + 1,
    playerLapTime: playerLap.time,
    ghostLapTime: ghostLaps[index],
    firedItems: playerLap.firedItems,
    contributions: playerLap.contributions,
    // 028-pre-race-setup: only populated when a caller supplies `track`
    // (setup-origin Test Day) — every existing no-track call site keeps
    // `physics: undefined`, matching its exact pre-028 lap shape.
    physics: playerLap.physics,
  }));
  const playerTime = laps.reduce((sum, lap) => sum + lap.playerLapTime, 0);
  const ghostTime = laps.reduce((sum, lap) => sum + lap.ghostLapTime, 0);
  const gap = playerTime - ghostTime;

  const outcome: ContestOutcome = gap < 0 ? "win" : gap > 0 ? "loss" : "tie";

  return {
    lapCount,
    playerTime,
    ghostTime,
    gap,
    outcome,
    board: installedItems(build).filter((item): item is NonNullable<typeof item> => item !== null),
    storage: storedItems(build).filter((item): item is NonNullable<typeof item> => item !== null),
    laps,
    contributions: laps.flatMap((lap) => lap.contributions),
  };
}

function resolveNCarContest(
  playerBuild: Build,
  rivalRoster: readonly RivalProfile[],
  level: number,
  seed: number,
  lapCount: number,
  setup?: LockedRaceSetup,
  encounterId?: string,
  rivalSetups?: readonly LockedRaceSetup[],
  rivalBuilds?: readonly VehicleBuild[],
  regionTheme?: import("./types").RegionId,
): NCarContestResult {
  if (rivalRoster.length !== REQUIRED_RIVAL_COUNT) {
    throw new ContestResolutionError(
      "invalid-roster-size",
      `Expected exactly ${REQUIRED_RIVAL_COUNT} rivals, got ${rivalRoster.length}`,
    );
  }

  // 018-track-generation: exactly one track per contest, applied identically
  // to the player and every rival — none exempt (research.md Decision 6,
  // FR-009). This is a new call, separate from ContestScene.ts's own
  // rendering-side generateTrack call, which given the same (seed, level)
  // always agrees with this one since generateTrack is pure.
  const track = generateTrack(seed, level, regionTheme);
  const playerLaps = simulatePlayerLaps(playerBuild, lapCount, track, setup?.totalDelta);
  const rosterOrder: Omit<CarResult, "position" | "gapToLeader">[] = [
    {
      id: "player",
      role: "player",
      name: "Player",
      color: PLAYER_COLOR,
      time: playerLaps.reduce((sum, lap) => sum + lap.time, 0),
      laps: playerLaps,
      // 028-pre-race-setup: per-car evidence — never shared with rivals (contract §4/§10).
      ...(setup ? { setup } : {}),
    },
    ...rivalRoster.map((profile, rivalIndex) => {
      const rivalBuild = rivalBuilds?.[rivalIndex] ?? resolveRivalBuild(profile, level, seed);
      // 028-pre-race-setup FR-018/018A: each rival gets its own deterministic
      // generated setup only when the caller supplied an encounterId to bind
      // it to (contract §5's legacy allowance for callers that don't).
      const rivalSetup = rivalSetups?.[rivalIndex] ?? (encounterId
        ? selectGeneratedRivalSetup(rivalBuild, track, { encounterId, lapCount })
        : undefined);
      const rivalLaps = simulatePlayerLaps(rivalBuild, lapCount, track, rivalSetup?.totalDelta);
      return {
        id: profile.id,
        role: "rival" as const,
        name: profile.name,
        color: profile.color,
        time: rivalLaps.reduce((sum, lap) => sum + lap.time, 0),
        laps: rivalLaps,
        ...(rivalSetup ? { setup: rivalSetup } : {}),
      };
    }),
  ];

  // Tie-break: fixed roster order (player first, then rivals in catalog
  // order) — never randomized, never left ambiguous (FR-007).
  const ranked = rosterOrder
    .map((entry, rosterIndex) => ({ entry, rosterIndex }))
    .sort((a, b) => a.entry.time - b.entry.time || a.rosterIndex - b.rosterIndex)
    .map(({ entry }) => entry);

  const leaderTime = ranked[0].time;
  const cars: CarResult[] = ranked.map((entry, index) => ({
    ...entry,
    position: index + 1,
    gapToLeader: entry.time - leaderTime,
  }));

  const player = cars.find((car) => car.role === "player")!;
  const outcome: ContestOutcome = player.position === 1
    ? "win"
    : player.time === leaderTime ? "tie" : "loss";

  return {
    lapCount,
    cars,
    outcome,
    board: installedItems(playerBuild).filter((item): item is NonNullable<typeof item> => item !== null),
    storage: storedItems(playerBuild).filter((item): item is NonNullable<typeof item> => item !== null),
    // 027-race-legibility-integrity: the exact track every car above was
    // just simulated against, and the exact roster order (rosterOrder,
    // pre-sort) used to break the ties above — both retained as immutable
    // evidence rather than left for a caller to regenerate or reconstruct.
    track,
    tieBreakOrder: rosterOrder.map((entry) => entry.id),
  };
}
