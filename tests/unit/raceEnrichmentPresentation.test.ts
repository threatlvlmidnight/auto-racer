import { describe, expect, it } from "vitest";
import { DRIVER_RACE_IDENTITIES } from "../../src/content/driverRaceIdentities";
import { DEFAULT_RACE_ENRICHMENT_CONFIG } from "../../src/simulation/enrichmentConfig";
import {
  buildIncidentRiskModel,
  driverBriefing,
  incidentRiskModel,
} from "../../src/scenes/raceEnrichmentPresentation";
import { projectIncidentRisk } from "../../src/simulation/raceEnrichment";

/**
 * Feature 033 US2/US3 presentation (T033/T038/T046/T050): pure, framework-free
 * briefing + risk-summary projections. These never compute authority and never
 * disclose a resolved incident outcome (FR-007/FR-018).
 */

const mercer = DRIVER_RACE_IDENTITIES[0];

describe("Feature 033 (T033/T038): driver briefing projection", () => {
  it("projects signature stat, current value, threshold, eligibility, and sources", () => {
    const brief = driverBriefing({
      identity: mercer,
      eligibility: {
        participantId: mercer.id,
        signatureId: mercer.signature.id,
        stat: "corneringSpeed",
        committedValue: 44,
        threshold: 40,
        contributingSources: ["native-corner-a", "native-corner-b"],
        eligible: true,
      },
      signatureThreshold: 40,
      signatureComposureCost: 3,
      initialComposure: 6,
    });
    expect(brief.passive.name).toBe(mercer.passive.name);
    expect(brief.signature.statLabel).toBe("Cornering");
    expect(brief.signature.currentValue).toBe(44);
    expect(brief.signature.threshold).toBe(40);
    expect(brief.signature.eligible).toBe(true);
    expect(brief.signature.contributingSources).toEqual(["native-corner-a", "native-corner-b"]);
    expect(brief.initialComposure).toBe(6);
  });

  it("never presents signature action details before confirmation", () => {
    const brief = driverBriefing({
      identity: mercer,
      eligibility: undefined,
      signatureThreshold: 40,
      signatureComposureCost: 3,
      initialComposure: 6,
    });
    expect(brief.signature.eligible).toBe(false);
    expect(brief.signature.currentValue).toBe(0);
    // Sources stay listed (pre-confirmation) but the decision is plainly off.
    expect(brief.signature.contributingSources).toEqual([]);
  });
});

describe("Feature 033 (T046): incident-risk summary accessibility", () => {
  it("never discloses a resolved incident outcome", () => {
    const low = incidentRiskModel(projectIncidentRisk({ brakingPower: 80, corneringSpeed: 80 }, 0.1, DEFAULT_RACE_ENRICHMENT_CONFIG));
    const high = incidentRiskModel(projectIncidentRisk({ brakingPower: 5, corneringSpeed: 5 }, 1, DEFAULT_RACE_ENRICHMENT_CONFIG));
    expect(low.revealsOutcome).toBe(false);
    expect(high.revealsOutcome).toBe(false);
  });

  it("exposes every source as a labeled row with a signed contribution", () => {
    const model = incidentRiskModel(projectIncidentRisk({ brakingPower: 5, corneringSpeed: 5 }, 1, DEFAULT_RACE_ENRICHMENT_CONFIG));
    expect(model.sources.length).toBeGreaterThan(0);
    for (const source of model.sources) {
      expect(source.label.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(source.signedContribution)).toBe(true);
    }
    expect(model.saferSetupAlternatives.length).toBeGreaterThan(0);
  });
});

describe("Feature 033 (T050): buildIncidentRiskModel convenience projection", () => {
  it("produces static source labels that match the authoritative risk source", () => {
    const model = buildIncidentRiskModel({ brakingPower: 5, corneringSpeed: 30 }, 1, DEFAULT_RACE_ENRICHMENT_CONFIG);
    expect(model.band).toBe("Elevated");
    expect(model.sources.some((source) => source.label.includes("braking"))).toBe(true);
    expect(model.sources.some((source) => source.label.includes("demand"))).toBe(true);
  });
});
