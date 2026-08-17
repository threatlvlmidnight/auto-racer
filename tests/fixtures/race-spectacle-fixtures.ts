import { resolveEnrichedContest } from "../../src/simulation/contest";
import { generateTrack } from "../../src/simulation/tracks";
import type { Track } from "../../src/simulation/tracks";
import type {
  EnrichedContestResult,
  EnrichmentEvent,
  EnrichmentEventKind,
  RacePhase,
} from "../../src/simulation/types";
import {
  baselineEmptyBuild,
  DEFAULT_ENTRANT_ID,
  racerRivalRoster,
} from "./race-enrichment-fixtures";

/**
 * Feature 036 (T001): retained-race fixture builders.
 *
 * These build real deterministic `EnrichedContestResult`s so the spectacle
 * layer always consumes authentic retained cars/roster/track/events, then let
 * tests swap in a controlled `events` array (eventless, player events,
 * rival-only events, simultaneous boundaries) without touching contest
 * authority. The `boundaryId` uses the Feature 033 `lap-N` convention so
 * events flow through `playback.crossedPlaybackBoundaries` exactly once.
 */

/** The immutable player car id used by the resolver. */
export const SPECTACLE_PLAYER_CAR_ID = "player";

/** Lap-counts the PiP budget supports (mirrors plan.md budget table). */
export const SPECTACLE_LAP_COUNTS = [8, 10, 12, 14, 16] as const;

/** A deterministic authoritative track fixture. */
export function spectacleTrack(seed = 42, level = 1): Track {
  return generateTrack(seed, level);
}

/** A real resolved enriched race with the requested lap count. */
export function resolvedSpectacleRace(
  lapCount: number,
  seed = 42,
): EnrichedContestResult {
  return resolveEnrichedContest({
    playerBuild: baselineEmptyBuild,
    entrantId: DEFAULT_ENTRANT_ID,
    rivalRoster: racerRivalRoster,
    level: 1,
    seed,
    lapCount,
  });
}

function defaultEvent(kind: EnrichmentEventKind, boundaryId: string): EnrichmentEvent {
  return {
    eventId: `spec-${kind}-${boundaryId}`,
    kind,
    phase: "contest" as RacePhase,
    boundaryId,
    orderSeq: 0,
    actorId: SPECTACLE_PLAYER_CAR_ID,
    emphasis: "compact",
  };
}

/** Build a well-formed enrichment event with sensible defaults. */
export function spectacleEvent(
  overrides: Partial<EnrichmentEvent> & {
    kind: EnrichmentEventKind;
    boundaryId: string;
  },
): EnrichmentEvent {
  return { ...defaultEvent(overrides.kind, overrides.boundaryId), ...overrides };
}

/** Player signature activation at the given player-lap boundary. */
export function signatureEvent(boundaryId: string, extra: Partial<EnrichmentEvent> = {}): EnrichmentEvent {
  return spectacleEvent({ kind: "signature-activation", boundaryId, actorId: SPECTACLE_PLAYER_CAR_ID, ...extra });
}

/** Completed player pass (player overtook a rival). */
export function playerOvertakeCompletedEvent(boundaryId: string, targetId = "rival-torres"): EnrichmentEvent {
  return spectacleEvent({
    kind: "overtake-completed",
    boundaryId,
    actorId: SPECTACLE_PLAYER_CAR_ID,
    targetId,
    before: { position: 3, time: 60 },
    after: { position: 2, time: 59.5 },
  });
}

/** Player being passed (rival overtook the player). */
export function playerPassedEvent(boundaryId: string, actorId = "rival-kestrel"): EnrichmentEvent {
  return spectacleEvent({
    kind: "overtake-completed",
    boundaryId,
    actorId,
    targetId: SPECTACLE_PLAYER_CAR_ID,
    before: { position: 2, time: 60 },
    after: { position: 3, time: 60.4 },
  });
}

/** Player defense (held position against an attempt). */
export function playerDefenseEvent(boundaryId: string, actorId = "rival-marchetti"): EnrichmentEvent {
  return spectacleEvent({
    kind: "defense",
    boundaryId,
    actorId: SPECTACLE_PLAYER_CAR_ID,
    targetId: actorId,
  });
}

/** Player incident. */
export function playerIncidentEvent(boundaryId: string): EnrichmentEvent {
  return spectacleEvent({
    kind: "incident",
    boundaryId,
    actorId: SPECTACLE_PLAYER_CAR_ID,
    incident: { timeLossSeconds: 1.4, riskBand: "guarded" },
  });
}

/** Player overtake attempt that did not complete. */
export function playerOvertakeAttemptEvent(boundaryId: string, targetId = "rival-torres"): EnrichmentEvent {
  return spectacleEvent({
    kind: "overtake-attempt",
    boundaryId,
    actorId: SPECTACLE_PLAYER_CAR_ID,
    targetId,
    before: { position: 3, time: 60 },
  });
}

/** Rival-only event (never a PiP candidate). */
export function rivalOnlyEvent(
  boundaryId: string,
  kind: EnrichmentEventKind = "overtake-completed",
  actorId = "rival-torres",
  targetId = "rival-kestrel",
): EnrichmentEvent {
  return spectacleEvent({ kind, boundaryId, actorId, targetId });
}

/** Retained race with an empty event set (eventless playback). */
export function eventlessSpectacleResult(lapCount: number, seed = 42): EnrichedContestResult {
  return { ...resolvedSpectacleRace(lapCount, seed), events: [] };
}

/** Retained race whose events are exactly the supplied list. */
export function spectacleResultWithEvents(
  lapCount: number,
  events: readonly EnrichmentEvent[],
  seed = 42,
): EnrichedContestResult {
  return { ...resolvedSpectacleRace(lapCount, seed), events: [...events] };
}

/** Player-involved event fixture covering every eligible display kind. */
export function playerEventsResult(lapCount = 12, seed = 42): EnrichedContestResult {
  return spectacleResultWithEvents(lapCount, [
    playerIncidentEvent("lap-3"),
    playerDefenseEvent("lap-5"),
    playerOvertakeCompletedEvent("lap-7"),
    playerOvertakeAttemptEvent("lap-9"),
    signatureEvent("lap-11"),
  ], seed);
}

/** Rival-only event fixture (nothing eligible). */
export function rivalOnlyResult(lapCount = 12, seed = 42): EnrichedContestResult {
  return spectacleResultWithEvents(lapCount, [
    rivalOnlyEvent("lap-2"),
    rivalOnlyEvent("lap-4", "attack"),
    rivalOnlyEvent("lap-6", "incident"),
  ], seed);
}

/** Two player events sharing one boundary (simultaneous conflict). */
export function simultaneousResult(lapCount = 8, seed = 42): EnrichedContestResult {
  return spectacleResultWithEvents(lapCount, [
    playerOvertakeCompletedEvent("lap-4"),
    playerIncidentEvent("lap-4"),
  ], seed);
}
