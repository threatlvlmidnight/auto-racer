import { describe, expect, it } from "vitest";
import {
  circuitPresentationIdentity,
  circuitIdentityLine,
  circuitIdentityTokens,
  testDayCircuitIdentity,
  CIRCUIT_LOCATION_UNAVAILABLE,
} from "../../src/scenes/circuitPresentation";
import {
  identityTrack,
  britishIslesStage,
  missingRegionStage,
} from "../fixtures/interface-clarity-fixtures";

describe("Feature 035 circuit identity (T008)", () => {
  it("returns a scored identity for a tracked race with a region", () => {
    const identity = circuitPresentationIdentity(identityTrack, britishIslesStage);
    expect(identity.mode).toBe("scored");
    expect(identity.trackId).toBe("fixture-track-01");
    expect(identity.trackName).toBe("Fixture Test Circuit");
    expect(identity.locationLabel).toBe("British Isles");
    expect(identity.regionId).toBe("british-isles");
    expect(identity.fixedConfiguration).toBeUndefined();
  });

  it("uses the explicit neutral fallback for a scored race with a missing region", () => {
    const identity = circuitPresentationIdentity(identityTrack, missingRegionStage);
    expect(identity.mode).toBe("scored");
    expect(identity.locationLabel).toBe(CIRCUIT_LOCATION_UNAVAILABLE);
    expect(identity.regionId).toBeUndefined();
    expect(circuitIdentityLine(identity)).toContain(CIRCUIT_LOCATION_UNAVAILABLE);
  });

  it("handles a null track with the retained-name fallback", () => {
    const identity = circuitPresentationIdentity(null, britishIslesStage);
    expect(identity.trackName).toBe("Trackside");
    expect(identity.locationLabel).toBe("British Isles");
  });

  it("shows Test-Day as fixed/unscored and never geographic", () => {
    const identity = testDayCircuitIdentity(identityTrack);
    expect(identity.mode).toBe("test-day");
    expect(identity.trackName).toBe("Fixture Test Circuit");
    expect(identity.locationLabel).toBe("Fixed test configuration");
    expect(identity.fixedConfiguration).toBe(true);
    expect(identity.unscored).toBe(true);
    const line = circuitIdentityLine(identity);
    expect(line).toContain("UNSCORED");
    expect(line).toContain("FIXED");
  });

  it("emits non-color accessibility tokens including LOCATION", () => {
    const identity = circuitPresentationIdentity(identityTrack, britishIslesStage);
    const tokens = circuitIdentityTokens(identity);
    expect(tokens).toContain("Fixture Test Circuit");
    expect(tokens.some((token) => token.startsWith("LOCATION:"))).toBe(true);
  });
});
