/**
 * Feature 033 (T012): the single immutable, validated enrichment tuning surface.
 *
 * Research Decision 5: every balance lever, toggle, threshold, cost, risk cap and
 * corpus band is centralized here. Production uses the frozen `DEFAULT_RACE_
 * ENRICHMENT_CONFIG`; tests inject a validated config. Nothing ever mutates a
 * validated config in place (data-model.md RaceEnrichmentConfig).
 */

export const RACE_ENRICHMENT_CONFIG_VERSION = "race-enrichment-v1";

export { RACE_ENRICHMENT_THRESHOLD_KEYS } from "./types";

export interface RacePhaseFractions {
  /** Opening = 0.25 by default. */
  opening: number;
  /** Contest = 0.50 by default. */
  contest: number;
  /** Final Push = 0.25 by default; an indivisible remainder belongs to it. */
  finalPush: number;
}

export interface IncidentRiskCaps {
  /** Aggregated risk on the [0,1] scale; above this an incident is barred. */
  maxRisk: number;
  /** Bounded race-time loss in simulated seconds. */
  maxTimeLossSeconds: number;
}

export interface EnrichmentCorpusBands {
  /** Fraction of corpus races that must contain a consequential post-Opening event. */
  postOpeningEventRateMin: number;
  /** Fraction of corpus races that may use full emphasis presentation. */
  emphasisRateMax: number;
  /** Winner-change rate lower bound (watchability gate). */
  winnerChangeRateMin: number;
  /** Winner-change rate upper bound (must not routinely upset clear builds). */
  winnerChangeRateMax: number;
}

export interface RaceEnrichmentConfig {
  version: string;
  /** Master switch; false is baseline comparison only. */
  enabled: boolean;
  /** Isolated incident rule switch. */
  incidentsEnabled: boolean;
  phaseFractions: RacePhaseFractions;
  initialComposure: number;
  attackCost: number;
  defenseCost: number;
  signatureActivationCost: number;
  minimumPaceAdvantage: number;
  /** Fleet-motion range required for a legal pass action window. */
  passingRange: number;
  /** Resolved-stat thresholds keyed by signature `thresholdKey`. */
  signatureThresholds: Readonly<Record<string, number>>;
  /** Numeric caps keyed by temporary-effect kind. */
  signatureTemporaryEffectCaps: Readonly<Record<string, number>>;
  incidentRiskCaps: IncidentRiskCaps;
  corpusBands: EnrichmentCorpusBands;
}

/** Production default: validated, frozen, tuned to the corpus gates. */
export const DEFAULT_RACE_ENRICHMENT_CONFIG: RaceEnrichmentConfig = Object.freeze({
  version: RACE_ENRICHMENT_CONFIG_VERSION,
  enabled: true,
  incidentsEnabled: true,
  phaseFractions: Object.freeze({ opening: 0.25, contest: 0.5, finalPush: 0.25 }),
  initialComposure: 6,
  attackCost: 2,
  defenseCost: 2,
  signatureActivationCost: 3,
  minimumPaceAdvantage: 0.15,
  passingRange: 30,
  signatureThresholds: Object.freeze({
    "sig-mercer-cornering": 40,
    "sig-soto-acceleration": 40,
    "sig-rook-top-speed": 40,
    "sig-voss-braking": 40,
  }),
  signatureTemporaryEffectCaps: Object.freeze({ "target-pace": 0.15, "stat-window": 12 }),
  incidentRiskCaps: Object.freeze({ maxRisk: 1, maxTimeLossSeconds: 3 }),
  corpusBands: Object.freeze({
    postOpeningEventRateMin: 0.5,
    emphasisRateMax: 1 / 3,
    winnerChangeRateMin: 0.1,
    winnerChangeRateMax: 0.25,
  }),
});

export interface EnrichmentConfigViolation {
  /** Dot path to the offending field. */
  path: string;
  code: string;
  message: string;
}

export type EnrichmentConfigValidation =
  | { ok: true; config: RaceEnrichmentConfig }
  | { ok: false; violations: readonly EnrichmentConfigViolation[] };

function pushViolation(
  violations: EnrichmentConfigViolation[],
  path: string,
  code: string,
  message: string,
): void {
  violations.push({ path, code, message });
}

function checkBoolean(violations: EnrichmentConfigViolation[], path: string, value: unknown): void {
  if (typeof value !== "boolean") {
    pushViolation(violations, path, "not-boolean", `${path} must be a boolean`);
  }
}

function checkPositive(violations: EnrichmentConfigViolation[], path: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    pushViolation(violations, path, "not-positive-finite", `${path} must be a finite number > 0`);
  }
}

function checkNonNegative(violations: EnrichmentConfigViolation[], path: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    pushViolation(violations, path, "not-non-negative-finite", `${path} must be a finite number >= 0`);
  }
}

function checkFraction(violations: EnrichmentConfigViolation[], path: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value >= 1) {
    pushViolation(violations, path, "out-of-range", `${path} must be a finite number in (0,1)`);
  }
}

function checkRecordPositive(
  violations: EnrichmentConfigViolation[],
  path: string,
  value: unknown,
  min: number,
  exclusive = false,
): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    pushViolation(violations, path, "not-record", `${path} must be a keyed record`);
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const invalid = typeof entry !== "number" || !Number.isFinite(entry)
      || (exclusive ? entry <= min : entry < min);
    if (invalid) {
      pushViolation(violations, `${path}.${key}`, "out-of-range", `${path}.${key} must be finite ${exclusive ? ">" : ">="} ${min}`);
    }
  }
}

export function validateRaceEnrichmentConfig(input: unknown): EnrichmentConfigValidation {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      violations: [{ path: "", code: "not-object", message: "RaceEnrichmentConfig must be an object" }],
    };
  }
  const c = input as Partial<RaceEnrichmentConfig>;
  const violations: EnrichmentConfigViolation[] = [];

  if (typeof c.version !== "string" || c.version.trim() === "") {
    pushViolation(violations, "version", "invalid-version", "version must be a non-empty string");
  }
  checkBoolean(violations, "enabled", c.enabled);
  checkBoolean(violations, "incidentsEnabled", c.incidentsEnabled);

  const pf = c.phaseFractions;
  if (pf === null || typeof pf !== "object" || Array.isArray(pf)) {
    pushViolation(violations, "phaseFractions", "not-object", "phaseFractions must be an object");
  } else {
    checkFraction(violations, "phaseFractions.opening", pf.opening);
    checkFraction(violations, "phaseFractions.contest", pf.contest);
    checkFraction(violations, "phaseFractions.finalPush", pf.finalPush);
    const sum = (pf.opening ?? 0) + (pf.contest ?? 0) + (pf.finalPush ?? 0);
    if (Math.abs(sum - 1) > 1e-6) {
      pushViolation(violations, "phaseFractions", "does-not-sum-to-one", "phase fractions must sum to 1");
    }
  }

  checkPositive(violations, "initialComposure", c.initialComposure);
  checkNonNegative(violations, "attackCost", c.attackCost);
  checkNonNegative(violations, "defenseCost", c.defenseCost);
  checkNonNegative(violations, "signatureActivationCost", c.signatureActivationCost);
  checkNonNegative(violations, "minimumPaceAdvantage", c.minimumPaceAdvantage);
  checkPositive(violations, "passingRange", c.passingRange);

  checkRecordPositive(violations, "signatureThresholds", c.signatureThresholds, 1);
  checkRecordPositive(violations, "signatureTemporaryEffectCaps", c.signatureTemporaryEffectCaps, 0, true);

  const ic = c.incidentRiskCaps;
  if (ic === null || typeof ic !== "object" || Array.isArray(ic)) {
    pushViolation(violations, "incidentRiskCaps", "not-object", "incidentRiskCaps must be an object");
  } else if (typeof ic.maxRisk !== "number" || !Number.isFinite(ic.maxRisk) || ic.maxRisk < 0 || ic.maxRisk > 1) {
    pushViolation(violations, "incidentRiskCaps.maxRisk", "out-of-range", "maxRisk must be within [0,1]");
  } else if (typeof ic.maxTimeLossSeconds !== "number" || !Number.isFinite(ic.maxTimeLossSeconds) || ic.maxTimeLossSeconds <= 0) {
    pushViolation(violations, "incidentRiskCaps.maxTimeLossSeconds", "not-positive-finite", "maxTimeLossSeconds must be finite > 0");
  }

  const cb = c.corpusBands;
  if (cb === null || typeof cb !== "object" || Array.isArray(cb)) {
    pushViolation(violations, "corpusBands", "not-object", "corpusBands must be an object");
  } else {
    if (typeof cb.postOpeningEventRateMin !== "number" || !Number.isFinite(cb.postOpeningEventRateMin) || cb.postOpeningEventRateMin < 0 || cb.postOpeningEventRateMin > 1) {
      pushViolation(violations, "corpusBands.postOpeningEventRateMin", "out-of-range", "postOpeningEventRateMin must be within [0,1]");
    }
    if (typeof cb.emphasisRateMax !== "number" || !Number.isFinite(cb.emphasisRateMax) || cb.emphasisRateMax < 0 || cb.emphasisRateMax > 1) {
      pushViolation(violations, "corpusBands.emphasisRateMax", "out-of-range", "emphasisRateMax must be within [0,1]");
    }
    const rMin = cb.winnerChangeRateMin;
    const rMax = cb.winnerChangeRateMax;
    const bad =
      typeof rMin !== "number" || !Number.isFinite(rMin) || rMin < 0 || rMin > 1
      || typeof rMax !== "number" || !Number.isFinite(rMax) || rMax < 0 || rMax > 1
      || rMin > rMax;
    if (bad) {
      pushViolation(violations, "corpusBands.winnerChangeRate", "invalid-band", "winnerChangeRate must be 0 <= min <= max <= 1");
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations };
  }
  return { ok: true, config: deepFreeze(c as RaceEnrichmentConfig) };
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}