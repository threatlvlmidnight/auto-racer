/**
 * Feature 033 US2/US3 (T033/T038/T046/T050): pure, framework-free presentation
 * projections for the pre-race driver briefing and incident-risk summary.
 *
 * Scenes render ONLY these returned models — they never recompute eligibility or
 * risk, and they never disclose a resolved incident outcome (FR-007/FR-018).
 */
import {
  type DriverRaceIdentity,
  type EmphasisClass,
  type EnrichmentEvent,
  type IncidentRiskSummary,
  type SignatureEligibility,
  type StatTarget,
} from "../simulation/types";
import { projectIncidentRisk } from "../simulation/raceEnrichment";
import type { RaceEnrichmentConfig } from "../simulation/enrichmentConfig";

export interface EnrichmentCallout {
  eventId: string;
  emphasis: EmphasisClass;
  text: string;
}

export interface EnrichmentInspectorEntry extends EnrichmentCallout {
  phase: EnrichmentEvent["phase"];
  boundaryId: string;
  actorId: string;
  targetId?: string;
  triggerRef?: string;
  before?: EnrichmentEvent["before"];
  after?: EnrichmentEvent["after"];
  composure?: EnrichmentEvent["composure"];
  temporaryEffect?: EnrichmentEvent["temporaryEffect"];
  incident?: EnrichmentEvent["incident"];
}

export interface EventMotionTreatment {
  eventId: string;
  mode: "animated" | "static";
  text: string;
  emphasis: EmphasisClass;
}

/** A compact, deterministic projection of one immutable race event. */
export function enrichmentCallout(event: EnrichmentEvent, playerId = "player"): EnrichmentCallout {
  const actor = event.actorId === playerId ? "You" : event.actorId;
  const target = event.targetId === playerId ? "you" : event.targetId;
  const text = event.kind === "signature-activation" ? `${actor} activate${actor === "You" ? "" : "s"} a signature.`
    : event.kind === "incident" ? `${actor} lose${actor === "You" ? "" : "s"} time in an incident.`
      : event.kind === "overtake-completed" ? `${actor} complete${actor === "You" ? "" : "s"} a pass on ${target ?? "a rival"}.`
        : event.kind === "defense" ? `${actor} defend${actor === "You" ? "" : "s"} position.`
          : event.kind === "attack" ? `${actor} attack${actor === "You" ? "" : "s"} ${target ?? "the field"}.`
            : event.kind === "phase-transition" ? `${event.phase.replace("-", " ").toUpperCase()} PHASE`
              : `${actor} attempts an overtake.`;
  return { eventId: event.eventId, emphasis: event.emphasis, text };
}

export interface EnrichmentResultsSummary {
  decisive: EnrichmentCallout | null;
  events: readonly EnrichmentInspectorEntry[];
}

export function enrichmentInspectorEntry(event: EnrichmentEvent, playerId = "player"): EnrichmentInspectorEntry {
  return {
    ...enrichmentCallout(event, playerId),
    phase: event.phase,
    boundaryId: event.boundaryId,
    actorId: event.actorId,
    ...(event.targetId ? { targetId: event.targetId } : {}),
    ...(event.triggerRef ? { triggerRef: event.triggerRef } : {}),
    ...(event.before ? { before: event.before } : {}),
    ...(event.after ? { after: event.after } : {}),
    ...(event.composure ? { composure: event.composure } : {}),
    ...(event.temporaryEffect ? { temporaryEffect: event.temporaryEffect } : {}),
    ...(event.incident ? { incident: event.incident } : {}),
  };
}

/** Reduced motion changes only treatment, never text, evidence, or identity. */
export function eventMotionTreatment(event: EnrichmentEvent, reducedMotion: boolean, playerId = "player"): EventMotionTreatment {
  const callout = enrichmentCallout(event, playerId);
  return { ...callout, mode: reducedMotion ? "static" : "animated" };
}

/** Results keeps every event inspectable while selecting one truthful headline. */
export function enrichmentResultsSummary(events: readonly EnrichmentEvent[], playerId = "player"): EnrichmentResultsSummary {
  const projected = events.map((event) => enrichmentInspectorEntry(event, playerId));
  const decisive = projected.find((entry) => entry.emphasis === "full")
    ?? projected.find((entry) => entry.text.includes("complete"))
    ?? projected[0]
    ?? null;
  return { decisive, events: projected };
}

/** Human label for a physical stat target (authoritative key -> display). */
const STAT_LABEL: Readonly<Record<StatTarget, string>> = Object.freeze({
  acceleration: "Acceleration",
  topSpeed: "Top Speed",
  brakingPower: "Braking",
  corneringSpeed: "Cornering",
  time: "Time",
});

export function statLabel(stat: StatTarget): string {
  return STAT_LABEL[stat] ?? String(stat);
}

export interface PassiveBrief {
  name: string;
  description: string;
  statLabel: string;
  magnitude: number;
  condition: string;
}

export interface SignatureBrief {
  name: string;
  statLabel: string;
  currentValue: number;
  threshold: number;
  eligible: boolean;
  contributingSources: readonly string[];
  context: string;
  composureCost: number;
}

export interface DriverBriefing {
  entrantId: string;
  displayName: string;
  origin: string;
  passive: PassiveBrief;
  signature: SignatureBrief;
  initialComposure: number;
}

export interface DriverBriefingInput {
  identity: DriverRaceIdentity;
  eligibility: SignatureEligibility | undefined;
  signatureThreshold: number;
  signatureComposureCost: number;
  initialComposure: number;
}

/** Pure briefing model for the pre-race / Test Day driver panel (T033/T038). */
export function driverBriefing(input: DriverBriefingInput): DriverBriefing {
  const sig = input.identity.signature;
  const elig = input.eligibility;
  return {
    entrantId: input.identity.id,
    displayName: input.identity.displayName,
    origin: input.identity.origin,
    passive: {
      name: input.identity.passive.name,
      description: input.identity.passive.description,
      statLabel: statLabel(input.identity.passive.modifier.stat),
      magnitude: input.identity.passive.modifier.magnitude,
      condition: input.identity.passive.condition,
    },
    signature: {
      name: sig.name,
      statLabel: statLabel(sig.statTarget),
      currentValue: elig?.committedValue ?? 0,
      threshold: elig?.threshold ?? input.signatureThreshold,
      eligible: elig?.eligible ?? false,
      contributingSources: elig?.contributingSources ?? [],
      context: sig.context,
      composureCost: input.signatureComposureCost,
    },
    initialComposure: input.initialComposure,
  };
}

export type RiskBandLabel = "Low" | "Guarded" | "Elevated";

export interface RiskSourceRow {
  label: string;
  signedContribution: number;
}

export interface IncidentRiskModel {
  band: RiskBandLabel;
  sources: readonly RiskSourceRow[];
  saferSetupAlternatives: readonly string[];
  /** Always false — the briefing never discloses a resolved incident (FR-018). */
  revealsOutcome: false;
}

/** Pure incident-risk summary model (T046/T050). */
export function incidentRiskModel(risk: IncidentRiskSummary): IncidentRiskModel {
  const bandLabel: RiskBandLabel = risk.band === "low" ? "Low" : risk.band === "guarded" ? "Guarded" : "Elevated";
  return {
    band: bandLabel,
    sources: risk.sources.map((source) => ({ label: source.label, signedContribution: source.signedContribution })),
    saferSetupAlternatives: risk.saferSetupAlternatives,
    revealsOutcome: false,
  };
}

/**
 * Convenience projection combining eligibility + risk for a committed build.
 * Uses the same pure `projectIncidentRisk` source as the ship path so the
 * briefing always matches authority (T046).
 */
export function buildIncidentRiskModel(
  resolvedStats: Readonly<Partial<Record<StatTarget, number>>>,
  brakingDemand: number,
  config: RaceEnrichmentConfig,
): IncidentRiskModel {
  return incidentRiskModel(projectIncidentRisk(resolvedStats, brakingDemand, config));
}
