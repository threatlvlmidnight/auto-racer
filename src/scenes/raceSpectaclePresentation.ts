import type {
  EnrichedContestResult,
  EnrichmentEvent,
  EnrichmentEventKind,
} from "../simulation/types";
import type { Track } from "../simulation/tracks";
import { pointAtProgress } from "../simulation/tracks";

/**
 * Feature 036 pure, framework-free presentation model (T005/T008/T011/T026-29/
 * T037). The selection policy, budget, focus window, and circuit decoration
 * are all read-only projections of retained evidence. This module never calls
 * track generation, never reads playback time, and never mutates contest or
 * schedule authority (contract §1).
 */

// ---------------------------------------------------------------------------
// PiP budget (T008)
// ---------------------------------------------------------------------------

/** 8→2, 10→2, 12→3, 14→4, 16→4. */
export const PIP_BUDGET: Readonly<Record<number, number>> = Object.freeze({
  8: 2,
  10: 2,
  12: 3,
  14: 4,
  16: 4,
});

/** Supported lap counts for the spectacle budget; unsupported calls reject. */
export const SPECTACLE_LAP_COUNTS: readonly number[] = Object.freeze([8, 10, 12, 14, 16]);

/** Fixed PiP budget resolver; rejects unsupported lap counts. */
export function pipBudgetForLapCount(lapCount: number): number {
  const budget = PIP_BUDGET[lapCount];
  if (budget === undefined) {
    throw new RangeError(
      `Unsupported lap count for PiP budget: ${lapCount}. Supported: ${SPECTACLE_LAP_COUNTS.join(", ")}`,
    );
  }
  return budget;
}

// ---------------------------------------------------------------------------
// Eligibility & priority (T027)
// ---------------------------------------------------------------------------

/** Kinds eligible for a player-involved cut-in (research Decision 4). */
const ELIGIBLE_DISPLAY_KINDS: ReadonlySet<string> = new Set([
  "signature-activation",
  "overtake-completed",
  "overtake-attempt",
  "defense",
  "incident",
]);

/** Fixed display priority: lower resolves earlier (research Decision 4). */
export const SPECTACLE_DISPLAY_PRIORITY: Readonly<Record<string, number>> = Object.freeze({
  "signature-activation": 0,
  "overtake-completed": 1,
  defense: 2,
  incident: 3,
  "overtake-attempt": 4,
});

export function isEligibleDisplayKind(kind: EnrichmentEventKind): boolean {
  return ELIGIBLE_DISPLAY_KINDS.has(kind);
}

export function displayPriority(kind: EnrichmentEventKind): number {
  const priority = SPECTACLE_DISPLAY_PRIORITY[kind];
  if (priority === undefined) throw new Error(`Unknown spectacle display kind: ${String(kind)}`);
  return priority;
}

/** A player is a participant when actor or target is the player. */
export function playerParticipates(event: EnrichmentEvent, playerId: string): boolean {
  return event.actorId === playerId || event.targetId === playerId;
}

// ---------------------------------------------------------------------------
// SpectacleMoment (T026)
// ---------------------------------------------------------------------------

export type SpectacleMomentStatus = "pending" | "active" | "rendered" | "suppressed";

export interface SpectacleMoment {
  eventId: string;
  boundaryId: string;
  kind: EnrichmentEventKind;
  participants: readonly string[];
  driverLabel: string;
  headline: string;
  consequence: string;
  priority: number;
  orderSeq: number;
  status: SpectacleMomentStatus;
}

/** One-based lap number from a Feature 033 `lap-N` boundary id, if present. */
function boundaryLap(boundaryId: string): number {
  const match = /^lap-(\d+)$/.exec(boundaryId);
  if (!match) return Infinity;
  return Number(match[1]);
}

/** Deterministic display priority for an event's cut-in category. */
export function spectaclePriorityForEvent(event: EnrichmentEvent): number {
  switch (event.kind) {
    case "signature-activation": return 0;
    case "overtake-completed": return 1;
    case "defense": return 2;
    case "incident": return 3;
    case "overtake-attempt": return 4;
    default: return Number.MAX_SAFE_INTEGER;
  }
}

export function involvedReceiver(event: EnrichmentEvent, playerId: string): string {
  return event.actorId === playerId ? event.targetId ?? playerId : event.actorId;
}

/**
 * Human-readable consequence derived only from retained event facts (T049).
 * Wording describes the player correctly whether the player acts or receives
 * the event; a specific P# is only ever claimed from the actor's retained
 * before/after when the actor is the player.
 */
export function spectacleConsequence(
  event: EnrichmentEvent,
  playerId: string,
  rosterLabel: (carId: string) => string,
): string {
  const playerActs = event.actorId === playerId;
  const otherId = involvedReceiver(event, playerId);
  const otherLabel = rosterLabel(otherId);
  switch (event.kind) {
    case "signature-activation":
      return event.before ? `Fires signature at P${event.before.position}.` : "Signature engaged.";
    case "overtake-completed": {
      const before = event.before?.position;
      const after = event.after?.position;
      if (playerActs && before !== undefined && after !== undefined && after < before) {
        return `Moves up to P${after} (from P${before}).`;
      }
      return `Overtaken by ${otherLabel}.`;
    }
    case "overtake-attempt":
      return playerActs ? `Line set against ${otherLabel}.` : `Has to defend against ${otherLabel}.`;
    case "defense":
      return playerActs
        ? (event.before ? `Holds position at P${event.before.position}.` : "Holds the line.")
        : `Countered by ${otherLabel}.`;
    case "incident":
      return event.incident ? `Costs ${event.incident.timeLossSeconds.toFixed(1)}s.` : "Incident on track.";
    default:
      return "The field is unchanged.";
  }
}

/** Build a candidate moment from retained evidence (Feature 033 authority). */
export function spectacleMomentFromEvent(
  event: EnrichmentEvent,
  playerId: string,
  rosterLabel: (carId: string) => string,
): SpectacleMoment {
  const drivers: readonly string[] = [
    ...new Set([event.actorId, event.targetId].filter(Boolean) as string[]),
  ];
  const playerActs = event.actorId === playerId;
  const otherId = involvedReceiver(event, playerId);
  const otherLabel = rosterLabel(otherId);
  let headline: string;
  switch (event.kind) {
    case "signature-activation": headline = "Signature activated"; break;
    case "overtake-completed": headline = playerActs ? "Player completes a pass" : "Player is passed"; break;
    case "overtake-attempt": headline = playerActs ? "Player makes a pass attempt" : `Move from ${otherLabel} held off`; break;
    case "defense": headline = playerActs ? "Player defends" : "Player's move is countered"; break;
    case "incident": headline = "Player incident"; break;
    default: headline = "Race moment";
  }

  return {
    eventId: event.eventId,
    boundaryId: event.boundaryId,
    kind: event.kind,
    participants: drivers.length ? drivers : [playerId],
    driverLabel: rosterLabel(playerId),
    headline,
    consequence: spectacleConsequence(event, playerId, rosterLabel),
    priority: spectaclePriorityForEvent(event),
    orderSeq: event.orderSeq,
    status: "pending",
  };
}

/** Deterministic ordering: display priority, then retained lap/order sequence. */
export function compareSpectacleCandidates(a: SpectacleMoment, b: SpectacleMoment): number {
  return (
    a.priority - b.priority
    || boundaryLap(a.boundaryId) - boundaryLap(b.boundaryId)
    || a.orderSeq - b.orderSeq
    || a.eventId.localeCompare(b.eventId)
  );
}

/**
 * Build all eligible player-involved spectacle moments from retained evidence
 * (Feature 036 never reclassifies or reconstructs events — contract §1/§3).
 */
export function buildSpectacleCandidates(
  result: EnrichedContestResult,
  playerId = "player",
  rosterLabel: (carId: string) => string = (carId) => carId,
): SpectacleMoment[] {
  return result.events
    .filter((event) => isEligibleDisplayKind(event.kind) && playerParticipates(event, playerId))
    .map((event) => spectacleMomentFromEvent(event, playerId, rosterLabel))
    .sort(compareSpectacleCandidates);
}

/**
 * Select up to the lap budget from the ordered candidates, resolving
 * same-boundary conflicts deterministically by precomputed priority/order.
 * Unselected events and unused capacity produce no PiP (contract §3).
 */
export function selectSpectacleMoments(
  candidates: readonly SpectacleMoment[],
  lapCount: number,
): SpectacleMoment[] {
  const budget = pipBudgetForLapCount(lapCount);
  const sorted = [...candidates].sort(compareSpectacleCandidates);
  const usedBoundaries = new Set<string>();
  const selected: SpectacleMoment[] = [];
  for (const candidate of sorted) {
    if (selected.length >= budget) break;
    if (usedBoundaries.has(candidate.boundaryId)) continue;
    usedBoundaries.add(candidate.boundaryId);
    selected.push({ ...candidate, status: "pending" });
  }
  return selected;
}

/** Convenience: select the bounded player-involved moments for a result. */
export function selectSpectacleMomentsFromResult(
  result: EnrichedContestResult,
  rosterLabel: (carId: string) => string = (carId) => carId,
): SpectacleMoment[] {
  return selectSpectacleMoments(
    buildSpectacleCandidates(result, "player", rosterLabel),
    result.lapCount,
  );
}
// ---------------------------------------------------------------------------
// Focus window (T037)
// ---------------------------------------------------------------------------

export interface FocusWindowState {
  selectedCarId: string;
  activeMomentId: string | null;
  displayedCarIds: readonly string[];
}

/** Initial focus defaults to the player (data-model FocusWindowState). */
export function createFocusWindow(playerCarId: string): FocusWindowState {
  return { selectedCarId: playerCarId, activeMomentId: null, displayedCarIds: [playerCarId] };
}

/** Presentation-only named-car selection; never touches playback state. */
export function focusSelectCar(focus: FocusWindowState, carId: string): FocusWindowState {
  if (carId === focus.selectedCarId) return focus;
  const activeMomentId = focus.activeMomentId;
  return {
    selectedCarId: carId,
    activeMomentId,
    displayedCarIds: activeMomentId ? focus.displayedCarIds : [carId],
  };
}

/** PiP activation temporarily replaces the shown focus car(s). */
export function focusWithActiveMoment(
  focus: FocusWindowState,
  moment: SpectacleMoment | undefined,
): FocusWindowState {
  if (!moment) return focus;
  return {
    selectedCarId: focus.selectedCarId,
    activeMomentId: moment.eventId,
    displayedCarIds: moment.participants,
  };
}

/** Terminal PiP paths restore the last selected car. */
export function focusRestored(focus: FocusWindowState): FocusWindowState {
  return {
    selectedCarId: focus.selectedCarId,
    activeMomentId: null,
    displayedCarIds: [focus.selectedCarId],
  };
}

// ---------------------------------------------------------------------------
// Spectacle presentation state & reducer (T028)
// ---------------------------------------------------------------------------

export interface SpectaclePresentationState {
  /** Selected moments by immutable event id (consumed at most once). */
  selected: ReadonlyMap<string, SpectacleMoment>;
  focus: FocusWindowState;
  reducedMotion: boolean;
  assetAvailability: Readonly<Record<string, boolean>>;
}

export function createSpectaclePresentationState(options: {
  moments: readonly SpectacleMoment[];
  playerCarId: string;
  reducedMotion?: boolean;
  assetAvailability?: Readonly<Record<string, boolean>>;
}): SpectaclePresentationState {
  return {
    selected: new Map(options.moments.map((moment) => [moment.eventId, moment])),
    focus: createFocusWindow(options.playerCarId),
    reducedMotion: options.reducedMotion ?? false,
    assetAvailability: options.assetAvailability ?? {},
  };
}

/**
 * Feed one crossed retained event id into the reducer. A non-selected id never
 * enters the state machine; a terminal moment cannot reactivate; a collision
 * with an already-active PiP deterministically suppresses the incoming moment.
 * (T028 — no playback time is ever consulted.)
 */
export function spectacleEventCrossed(state: SpectaclePresentationState, eventId: string): SpectaclePresentationState {
  const moment = state.selected.get(eventId);
  if (!moment || moment.status !== "pending") return state;
  if (state.focus.activeMomentId) {
    const updated = new Map(state.selected);
    updated.set(eventId, { ...moment, status: "suppressed" });
    return { ...state, selected: updated };
  }
  const active = { ...moment, status: "active" as const };
  const updated = new Map(state.selected);
  updated.set(eventId, active);
  return {
    ...state,
    selected: updated,
    focus: focusWithActiveMoment(state.focus, active),
  };
}

/** Complete the active PiP window: render it and restore the selected focus car. */
export function completeActiveSpectacle(state: SpectaclePresentationState): SpectaclePresentationState {
  if (!state.focus.activeMomentId) return state;
  const activeId = state.focus.activeMomentId;
  const moment = state.selected.get(activeId);
  if (!moment || moment.status !== "active") return { ...state, focus: focusRestored(state.focus) };
  const updated = new Map(state.selected);
  updated.set(activeId, { ...moment, status: "rendered" });
  return {
    ...state,
    selected: updated,
    focus: focusRestored(state.focus),
  };
}

/** Convenience: format the selected-moment set as stable terminal-status tuples. */
export function spectacleTerminalReport(state: SpectaclePresentationState): ReadonlyArray<readonly [string, string]> {
  return [...state.selected.entries()]
    .map(([eventId, moment]) => [eventId, moment.status] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

// ---------------------------------------------------------------------------
// Circuit visual model (T011)
// ---------------------------------------------------------------------------

export interface RoadLayerDescriptor {
  label: string;
  width: number;
  color: string;
  alpha: number;
}

export interface LandmarkDescriptor {
  label: string;
  x: number;
  y: number;
}

export interface StartFinishDescriptor {
  label: string;
  x: number;
  y: number;
  headingRadians: number;
}

export interface CircuitBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CircuitVisualModel {
  trackId: string;
  /** Readonly projection of the retained path points only (never a new logical path). */
  points: readonly { x: number; y: number }[];
  bounds: CircuitBounds;
  roadLayers: readonly RoadLayerDescriptor[];
  startFinish: StartFinishDescriptor | null;
  landmarks: readonly LandmarkDescriptor[];
}

function circuitBounds(points: readonly { x: number; y: number }[]): CircuitBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Anchors are decorative relative to retained bounds, never used for movement. */
export function circuitDecorationAnchors(bounds: CircuitBounds): readonly LandmarkDescriptor[] {
  const margin = 0.12;
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const w = Math.max(bounds.width, 1);
  const h = Math.max(bounds.height, 1);
  const padX = w * margin;
  const padY = h * margin;
  return Object.freeze([
    { label: "Paddock", x: bounds.minX - padX, y: bounds.minY - padY },
    { label: "Grandstand", x: cx, y: bounds.minY - padY },
    { label: "Pit Wall", x: cx, y: bounds.maxY + padY },
    { label: "Marshal Post", x: bounds.maxX + padX, y: cy },
  ] as readonly LandmarkDescriptor[]);
}

/** Decorative road stack; widths/colors are presentation-only (data-model). */
export const CIRCUIT_ROAD_LAYERS: readonly RoadLayerDescriptor[] = Object.freeze([
  { label: "verge", width: 42, color: "#20292d", alpha: 0.9 },
  { label: "shoulder", width: 32, color: "#354a4e", alpha: 0.9 },
  { label: "road", width: 22, color: "#5f6a6e", alpha: 1 },
]);

/**
 * Pure read-only projection of the retained track. Preserves every retained
 * path point and never calls track generation (T011/T012).
 */
export function buildCircuitVisualModel(track: Track): CircuitVisualModel {
  const points = Object.freeze(track.points.map((point) => Object.freeze({ ...point })));
  const bounds = circuitBounds(points);
  const first = points[0];
  return {
    trackId: track.id,
    points,
    bounds,
    roadLayers: CIRCUIT_ROAD_LAYERS,
    startFinish: first
      ? { label: "Start/Finish", x: first.x, y: first.y, headingRadians: 0 }
      : null,
    landmarks: circuitDecorationAnchors(bounds),
  };
}

// ---------------------------------------------------------------------------
// Display models for PiP and focus (T029/T038)
// ---------------------------------------------------------------------------

export interface SpectacleParticipantView {
  carId: string;
  label: string;
  number: string;
  colorHex: number;
}

export interface SpectacleMomentModel {
  eventId: string;
  kind: SpectacleMoment["kind"];
  driverLabel: string;
  headline: string;
  consequence: string;
  mode: "static" | "animated";
  reducedMotion: boolean;
  /** Involved cars for the visual cut-in (T051); empty uses a labeled fallback. */
  featured: readonly SpectacleParticipantView[];
}

/** Accessible static/reduced-motion PiP model preserving retained semantics. */
export function spectacleMomentModel(
  moment: SpectacleMoment,
  reducedMotion: boolean,
  featured: readonly SpectacleParticipantView[] = [],
): SpectacleMomentModel {
  return {
    eventId: moment.eventId,
    kind: moment.kind,
    driverLabel: moment.driverLabel,
    headline: moment.headline,
    consequence: moment.consequence,
    mode: reducedMotion ? "static" : "animated",
    reducedMotion,
    featured,
  };
}

/**
 * True only when the crossed event actually activated a new PiP (T052). The
 * scene resets its PiP timer only on this signal, so a colliding event that
 * becomes suppressed never restarts or extends the winning moment's duration.
 */
export function spectacleActivated(prev: SpectaclePresentationState, next: SpectaclePresentationState): boolean {
  return (next.focus.activeMomentId ?? null) !== (prev.focus.activeMomentId ?? null);
}

export interface FocusPositionView {
  carId: string;
  label: string;
  position: { x: number; y: number };
  headingRadians: number;
}

export interface VehiclePlacement {
  x: number;
  y: number;
  headingRadians: number;
}

/**
 * Single source of truth for marker placement (T048): a marker's coordinate
 * and forward heading come only from the retained track's `pointAtProgress`.
 * `raceSpectacleVisuals.positionVehicleMarker` delegates here so the renderer
 * and tests cannot diverge. With forward-facing (+x) art, setting container
 * rotation to `headingRadians` points the vehicle along the track heading.
 */
export function markerPlacementAt(track: Track, lapProgress: number): VehiclePlacement {
  const point = pointAtProgress(track, lapProgress);
  return { x: point.x, y: point.y, headingRadians: point.headingRadians };
}

/**
 * Retained presentation positions for the cars shown in the focus window
 * (T054/T055). Coordinates come only from `pointAtProgress`; focus remains a
 * read-only overlay and never writes to race authority.
 */
export function focusPositions(
  focus: FocusWindowState,
  carProgress: (carId: string) => { lapProgress: number } | undefined,
  track: Track,
  carLabel: (carId: string) => string,
): readonly FocusPositionView[] {
  return focus.displayedCarIds.flatMap((carId) => {
    const progress = carProgress(carId);
    if (!progress) return [];
    const point = pointAtProgress(track, progress.lapProgress);
    return [{ carId, label: carLabel(carId), position: { x: point.x, y: point.y }, headingRadians: point.headingRadians }];
  });
}

export interface FocusWindowDisplayModel {
  selectedCarId: string;
  selectedLabel: string;
  activeMomentId: string | null;
  displayedCarIds: readonly string[];
  displayedLabels: readonly string[];
  hasActiveMoment: boolean;
}

export function focusWindowDisplayModel(
  focus: FocusWindowState,
  carLabel: (carId: string) => string,
): FocusWindowDisplayModel {
  const labels = focus.displayedCarIds.map(carLabel);
  return {
    selectedCarId: focus.selectedCarId,
    selectedLabel: carLabel(focus.selectedCarId),
    activeMomentId: focus.activeMomentId,
    displayedCarIds: focus.displayedCarIds,
    displayedLabels: labels,
    hasActiveMoment: focus.activeMomentId !== null,
  };
}

