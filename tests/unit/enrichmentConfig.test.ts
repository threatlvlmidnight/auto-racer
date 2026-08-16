import { describe, expect, it } from "vitest";
import {
  DEFAULT_RACE_ENRICHMENT_CONFIG,
  RACE_ENRICHMENT_CONFIG_VERSION,
  RACE_ENRICHMENT_THRESHOLD_KEYS,
  validateRaceEnrichmentConfig,
  type RaceEnrichmentConfig,
} from "../../src/simulation/enrichmentConfig";

/**
 * Feature 033 Phase 2 (T007): validation, immutable defaults, and injection for
 * every centralized tuning lever and toggle (research Decision 5). Invalid
 * negative, non-finite, unordered, or out-of-range values must fail validation
 * before contest resolution (data-model.md RaceEnrichmentConfig).
 */

function invalidPathsFor(input: unknown): string[] {
  const result = validateRaceEnrichmentConfig(input);
  return result.ok ? [] : result.violations.map((v) => v.path);
}

/** True when some reported violation path starts with the given field prefix. */
function violatesPrefix(input: unknown, prefix: string): boolean {
  return invalidPathsFor(input).some((path) => path.startsWith(prefix));
}

function withOverrides(overrides: Partial<RaceEnrichmentConfig>): RaceEnrichmentConfig {
  return { ...DEFAULT_RACE_ENRICHMENT_CONFIG, ...overrides };
}

describe("Feature 033: RaceEnrichmentConfig defaults are immutable and valid", () => {
  it("exposes the exact default config version and passes strict validation", () => {
    expect(DEFAULT_RACE_ENRICHMENT_CONFIG.version).toBe(RACE_ENRICHMENT_CONFIG_VERSION);
    const result = validateRaceEnrichmentConfig(DEFAULT_RACE_ENRICHMENT_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.config)).toBe(true);
      expect(result.config).toBe(DEFAULT_RACE_ENRICHMENT_CONFIG);
    }
  });

  it("default phase fractions are the 25/50/25 split that yields the pinned counts", () => {
    const { phaseFractions } = DEFAULT_RACE_ENRICHMENT_CONFIG;
    expect(phaseFractions.opening + phaseFractions.contest + phaseFractions.finalPush).toBeCloseTo(1);
    expect(phaseFractions.opening).toBe(0.25);
    expect(phaseFractions.contest).toBe(0.5);
    expect(phaseFractions.finalPush).toBe(0.25);
  });

  it("defaults define resolved-stat thresholds for all four signatures and positive temporary caps", () => {
    const keys = Object.keys(DEFAULT_RACE_ENRICHMENT_CONFIG.signatureThresholds);
    for (const expected of RACE_ENRICHMENT_THRESHOLD_KEYS) {
      expect(keys).toContain(expected);
      expect(DEFAULT_RACE_ENRICHMENT_CONFIG.signatureThresholds[expected]).toBeGreaterThanOrEqual(1);
    }
    for (const value of Object.values(DEFAULT_RACE_ENRICHMENT_CONFIG.signatureTemporaryEffectCaps)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe("Feature 033: a valid injected non-default config passes and is immutable", () => {
  it("accepts a strictly favorable tuning object and returns a frozen config", () => {
    const injected: RaceEnrichmentConfig = {
      ...DEFAULT_RACE_ENRICHMENT_CONFIG,
      initialComposure: 10,
      attackCost: 1,
      defenseCost: 1,
      signatureActivationCost: 2,
      passingRange: 45,
      minimumPaceAdvantage: 0.2,
      signatureThresholds: { ...DEFAULT_RACE_ENRICHMENT_CONFIG.signatureThresholds, "sig-mercer-cornering": 25 },
    };
    const result = validateRaceEnrichmentConfig(injected);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.config)).toBe(true);
      expect(result.config.initialComposure).toBe(10);
      expect(result.config.signatureThresholds["sig-mercer-cornering"]).toBe(25);
    }
  });
});

describe("Feature 033: every tuning lever and toggle rejects invalid values", () => {
  it("rejects non-boolean toggles", () => {
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, enabled: "yes" as unknown as boolean })).toContain("enabled");
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, incidentsEnabled: 1 as unknown as boolean })).toContain("incidentsEnabled");
  });

  it("rejects an empty config version", () => {
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, version: " " })).toContain("version");
  });

  it("rejects invalid phase fractions that are non-finite, out of range, or do not sum to one", () => {
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, phaseFractions: { opening: -0.1, contest: 0.5, finalPush: 0.25 } })).toContain("phaseFractions.opening");
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, phaseFractions: { opening: 1, contest: 0.5, finalPush: 0.25 } })).toContain("phaseFractions.opening");
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, phaseFractions: { opening: NaN, contest: 0.5, finalPush: 0.25 } })).toContain("phaseFractions.opening");
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, phaseFractions: { opening: 0.6, contest: 0.3, finalPush: 0.2 } })).toContain("phaseFractions");
    expect(invalidPathsFor({ ...DEFAULT_RACE_ENRICHMENT_CONFIG, phaseFractions: { opening: 0.4, contest: 0.4, finalPush: 0.1 } })).toContain("phaseFractions");
  });

  it.each([
    ["initialComposure", 0],
    ["initialComposure", -1],
    ["initialComposure", NaN],
    ["attackCost", -1],
    ["defenseCost", -1],
    ["defenseCost", NaN],
    ["signatureActivationCost", -1],
    ["passingRange", 0],
    ["passingRange", NaN],
    ["minimumPaceAdvantage", -0.1],
    ["minimumPaceAdvantage", Number.POSITIVE_INFINITY],
  ])("rejects invalid numeric lever %s = %s", (key, value) => {
    expect(invalidPathsFor(withOverrides({ [key]: value }))).toContain(key);
  });

  it("rejects non-finite, negative, or zero signature thresholds", () => {
    expect(violatesPrefix(withOverrides({ signatureThresholds: { a: -5 } }), "signatureThresholds")).toBe(true);
    expect(violatesPrefix(withOverrides({ signatureThresholds: { a: NaN } }), "signatureThresholds")).toBe(true);
    expect(violatesPrefix(withOverrides({ signatureThresholds: { a: 0 } }), "signatureThresholds")).toBe(true);
  });

  it("rejects non-positive signature temporary-effect caps", () => {
    expect(violatesPrefix(withOverrides({ signatureTemporaryEffectCaps: { t: 0 } }), "signatureTemporaryEffectCaps")).toBe(true);
    expect(violatesPrefix(withOverrides({ signatureTemporaryEffectCaps: { t: -1 } }), "signatureTemporaryEffectCaps")).toBe(true);
  });

  it("rejects out-of-range or non-positive incident risk caps", () => {
    expect(invalidPathsFor(withOverrides({ incidentRiskCaps: { maxRisk: 2, maxTimeLossSeconds: 3 } }))).toContain("incidentRiskCaps.maxRisk");
    expect(invalidPathsFor(withOverrides({ incidentRiskCaps: { maxRisk: 0.5, maxTimeLossSeconds: 0 } }))).toContain("incidentRiskCaps.maxTimeLossSeconds");
  });

  it("rejects out-of-range or unordered corpus bands", () => {
    expect(invalidPathsFor(withOverrides({ corpusBands: { postOpeningEventRateMin: 1.5, emphasisRateMax: 0.25, winnerChangeRateMin: 0.1, winnerChangeRateMax: 0.2 } }))).toContain("corpusBands.postOpeningEventRateMin");
    expect(invalidPathsFor(withOverrides({ corpusBands: { postOpeningEventRateMin: 0.5, emphasisRateMax: 2, winnerChangeRateMin: 0.1, winnerChangeRateMax: 0.2 } }))).toContain("corpusBands.emphasisRateMax");
    expect(invalidPathsFor(withOverrides({ corpusBands: { postOpeningEventRateMin: 0.5, emphasisRateMax: 0.25, winnerChangeRateMin: 0.9, winnerChangeRateMax: 0.2 } }))).toContain("corpusBands.winnerChangeRate");
  });
});

describe("Feature 033: validated configs are always immutable results", () => {
  it("returns a frozen config for a valid injected object", () => {
    const result = validateRaceEnrichmentConfig(withOverrides({ initialComposure: 8 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.config)).toBe(true);
      expect(() => {
        (result.config as { initialComposure: number }).initialComposure = 999;
      }).toThrow();
    }
  });
});