import { regionDefinition } from "../content/regions";
import type { RaceKind, RegionId } from "../simulation/types";
import type { Track } from "../simulation/tracks";

/**
 * Feature 035 — pure circuit identity projection (spec.md US1, FR-001/FR-003,
 * contracts/interface-clarity-contract.md "Circuit identity"). Derives a
 * display-only identity from retained track and tour-stage evidence. It NEVER
 * calls track generation and never changes the stage, track, or any result.
 */

export type CircuitMode = "scored" | "test-day";

/** Display-only, player-readable circuit identity (data-model.md "CircuitPresentationIdentity"). */
export interface CircuitPresentationIdentity {
  trackId: string;
  trackName: string;
  /** Region name for a scored race; explicit fixed/fallback label otherwise. */
  locationLabel: string;
  regionId?: RegionId;
  raceKind?: RaceKind;
  mode: CircuitMode;
  /** Test Day only: the fixed, unscored nature rendered as a separate structural cue. */
  fixedConfiguration?: boolean;
  unscored?: boolean;
}

/** Fixed literal for a scored race whose stage has no region evidence. */
export const CIRCUIT_LOCATION_UNAVAILABLE = "Location unavailable";

export interface CircuitStageContext {
  regionId?: RegionId;
  raceKind?: RaceKind;
}

/**
 * Scored-race identity. Missing region uses the explicit neutral fallback and
 * never guesses a geography or alters the selected track.
 */
export function circuitPresentationIdentity(
  track: Pick<Track, "id" | "name"> | undefined | null,
  stage?: CircuitStageContext | null,
): CircuitPresentationIdentity {
  const trackId = track?.id ?? "unknown-track";
  const trackName = track?.name ?? "Trackside";
  if (stage?.regionId) {
    const region = regionDefinition(stage.regionId);
    return {
      trackId,
      trackName,
      locationLabel: region.name,
      regionId: stage.regionId,
      raceKind: stage.raceKind,
      mode: "scored",
    };
  }
  return {
    trackId,
    trackName,
    locationLabel: CIRCUIT_LOCATION_UNAVAILABLE,
    raceKind: stage?.raceKind,
    mode: "scored",
  };
}

/**
 * Test Day identity. It borrows the upcoming track name but is always labelled
 * fixed and unscored — it is never presented as a scored geographic event.
 */
export function testDayCircuitIdentity(
  track: Pick<Track, "id" | "name"> | undefined | null,
): CircuitPresentationIdentity {
  return {
    trackId: track?.id ?? "unknown-track",
    trackName: track?.name ?? "Trackside",
    locationLabel: "Fixed test configuration",
    mode: "test-day",
    fixedConfiguration: true,
    unscored: true,
  };
}

/** One-line headline: `Track Name · LOCATION: <location>` (or the fixed/unscored label). */
export function circuitIdentityLine(identity: CircuitPresentationIdentity): string {
  if (identity.mode === "test-day") {
    return `${identity.trackName} · LOCATION: ${identity.locationLabel} · FIXED CONFIGURATION · UNSCORED`;
  }
  return `${identity.trackName} · LOCATION: ${identity.locationLabel}`;
}

/** Stable non-color identity facts exposed for accessibility labels. */
export function circuitIdentityTokens(identity: CircuitPresentationIdentity): readonly string[] {
  const tokens = [identity.trackName, `LOCATION: ${identity.locationLabel}`];
  if (identity.mode === "test-day") tokens.push("FIXED CONFIGURATION", "UNSCORED");
  return tokens;
}
