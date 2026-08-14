import { vehicleById } from "../content/entrants";
import { RIVAL_PROFILES } from "../content/rivals";
import { createEmptyVehicleBuild } from "./build";
import { poolForRival } from "./itemPools";
import { drawItem } from "./draft";
import { simulatePlayerLaps } from "./laps";
import {
  CANONICAL_POSITION_ORDER,
  deriveEligibleSetupControls,
  lockRaceSetup,
} from "./raceSetup";
import type { Run } from "./run";
import { addItem } from "./slots";
import { addItemToStorage } from "./storage";
import type { Track } from "./tracks";
import {
  ACTIVE_IDENTITY_TAG,
  TAG_WEIGHT,
  type EligibleSetupControl,
  type EliteFinaleOpponent,
  type ExactTrackGhostRecord,
  type ItemDefinition,
  type LockedRaceSetup,
  type RivalProfile,
  type SetupSelections,
  type VehicleBuild,
} from "./types";

/**
 * Deterministic PRNG (mulberry32) seeded from a hash of the resolution's own
 * inputs — never wall-clock time or module-level state (contract §2).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectEliteFinaleOpponents(
  records: readonly ExactTrackGhostRecord[],
  track: Track,
  playerOwnerId: string,
  seed: number,
): readonly EliteFinaleOpponent[] {
  const seenOwners = new Set<string>();
  const recorded = [...records]
    .filter((record) =>
      record.ownerId !== playerOwnerId
      && record.trackId === track.id
      && record.setup.trackId === track.id
      && record.simulationRulesVersion.length > 0
      && Number.isFinite(record.recordedTime)
      && record.recordedTime > 0)
    .sort((left, right) => left.recordedTime - right.recordedTime || left.id.localeCompare(right.id))
    .filter((record) => {
      if (seenOwners.has(record.ownerId)) return false;
      seenOwners.add(record.ownerId);
      return true;
    })
    .slice(0, 7)
    .map((record): EliteFinaleOpponent => ({ ...record, provenance: "recorded" }));

  const opponents: EliteFinaleOpponent[] = [...recorded];
  for (let index = opponents.length; index < 7; index += 1) {
    const profile = RIVAL_PROFILES[index];
    const build = resolveRivalBuild(profile, 4, seed + index * 4099);
    const setup = selectGeneratedRivalSetup(build, track, {
      encounterId: `elite-fallback-${index + 1}`,
      lapCount: 16,
    });
    const recordedTime = simulatePlayerLaps(build, 16, track, setup.totalDelta)
      .reduce((sum, lap) => sum + lap.time, 0);
    opponents.push({
      id: `elite-fallback-${profile.id}`,
      ownerId: `exhibition-${profile.id}`,
      displayName: `${profile.name} · Exhibition Ghost`,
      recordedTime,
      build,
      setup,
      trackId: track.id,
      simulationRulesVersion: "prototype-exhibition-v1",
      provenance: "exhibition-fallback",
    });
  }
  return opponents;
}

function hashSeed(...parts: (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

function priceBucket(
  pool: readonly ItemDefinition[],
  bias: "low" | "mid" | "high",
): ItemDefinition[] {
  const bucket = pool.filter((item) => {
    if (bias === "low") return item.price <= 2;
    if (bias === "high") return item.price >= 4;
    return item.price === 3;
  });
  return bucket.length > 0 ? bucket : [...pool];
}

type FillPosition = { area: "board" | "storage"; index: number };

function fillPositions(build: VehicleBuild): FillPosition[] {
  return [
    ...build.slots.map((_slot, index) => ({ area: "board" as const, index })),
    ...build.storage.map((_position, index) => ({ area: "storage" as const, index })),
  ];
}

/**
 * Resolve a rival profile at a given in-run level into a real VehicleBuild
 * (data-model.md "Resolved Rival Build"; contract §2).
 *
 * Pure and deterministic: identical (profile, level, seed) always produces a
 * deeply equal build. Reuses createEmptyVehicleBuild and the existing
 * drawItem deterministic draw — no second item-selection mechanism.
 */
export function resolveRivalBuild(profile: RivalProfile, level: number, seed: number): VehicleBuild {
  if (!vehicleById(profile.vehicleId)) {
    throw new Error(`Unknown vehicle definition: ${profile.vehicleId}`);
  }

  const { slotsToFill, priceBias } = profile.levelScaling(level);
  const pool = priceBucket(poolForRival(profile.vehicleId), priceBias);
  const positions = fillPositions(createEmptyVehicleBuild(profile.vehicleId));
  const clampedCount = Math.max(0, Math.min(slotsToFill, positions.length));

  let build = createEmptyVehicleBuild(profile.vehicleId);
  for (let index = 0; index < clampedCount; index += 1) {
    const position = positions[index];
    const rng = mulberry32(hashSeed(seed, profile.id, level, index));
    const item = drawItem(pool, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, rng);
    build = position.area === "board"
      ? addItem(build, item, position.index)
      : addItemToStorage(build, item, position.index);
  }

  return build;
}

/**
 * Deterministic per-contest selection of 7 distinct entries from a wider
 * pool (019-async-ghost-pool, contract §3). Reuses this file's existing
 * mulberry32 PRNG rather than importing 018-track-generation's own —
 * neither feature depends on the other's implementation order
 * (research.md Decision 2).
 *
 * Accepts only a plain (pool, seed, level) — never a Run, Build, or other
 * player-scoped object — so a future shared-lobby feature can supply a
 * lobby-scoped identifier here with zero change (FR-003, FR-005).
 *
 * A partial Fisher-Yates shuffle: only the first 7 positions are finalized,
 * guaranteeing 7 distinct entries by construction, never by a separate
 * distinctness check (research.md Decision 5).
 */
export function selectGhostRoster(
  pool: readonly RivalProfile[],
  seed: number,
  level: number,
): RivalProfile[] {
  const rng = mulberry32(seed * 1000003 + level);
  const shuffled = [...pool];
  const selectionSize = Math.min(7, shuffled.length);

  for (let index = 0; index < selectionSize; index += 1) {
    const swapIndex = index + Math.floor(rng() * (shuffled.length - index));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, selectionSize);
}

export interface GeneratedRivalSetupContext {
  encounterId: string;
  lapCount: number;
}

/** Cartesian product of every eligible control's three positions, in canonical family/position order (contract §6). */
function enumerateLegalSelections(eligibleControls: readonly EligibleSetupControl[]): SetupSelections[] {
  return eligibleControls.reduce<SetupSelections[]>(
    (partials, control) => partials.flatMap((partial) =>
      CANONICAL_POSITION_ORDER.map((position) => ({ ...partial, [control.family]: position }))),
    [{}],
  );
}

/**
 * 028-pre-race-setup contract §6 / FR-018A: until recorded multiplayer
 * ghosts exist, a generated rival's setup is chosen by exhaustively
 * enumerating every legal position combination for its own resolved build,
 * resolving the complete race time for each by summing canonical
 * `simulatePlayerLaps` output on the exact upcoming track, and selecting
 * the lowest-time combination. Exact ties keep the first candidate found in
 * canonical family-then-position enumeration order (research.md Decision
 * 5). Delegates locking to the same `lockRaceSetup` humans use and never
 * calls the N-car contest resolver — this function returns a single car's
 * setup, nothing else. Pure, deterministic, contains no randomness, and
 * runs synchronously before playback.
 */
export function selectGeneratedRivalSetup(
  build: VehicleBuild,
  track: Track,
  context: GeneratedRivalSetupContext,
): LockedRaceSetup {
  const eligibleControls = deriveEligibleSetupControls(build);
  const input = {
    // Never read by lockRaceSetup — RaceSetupInput's `run` field exists only
    // for the player-facing scene flow (data-model.md).
    run: {} as Run,
    encounterId: context.encounterId,
    build,
    track,
    eligibleControls,
    initialSelections: {},
  };

  let best: { selections: SetupSelections; time: number } | undefined;
  for (const selections of enumerateLegalSelections(eligibleControls)) {
    const candidate = lockRaceSetup(input, selections);
    if (!("controls" in candidate)) continue;
    const time = simulatePlayerLaps(build, context.lapCount, track, candidate.totalDelta)
      .reduce((sum, lap) => sum + lap.time, 0);
    if (!best || time < best.time) best = { selections, time };
  }

  // `driver-aggression` is always eligible, so at least one legal
  // combination always exists — `best` is never undefined here.
  return lockRaceSetup(input, best!.selections) as LockedRaceSetup;
}
