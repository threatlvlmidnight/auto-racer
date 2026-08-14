import { installedItems } from "./slots";
import { generateTrack } from "./tracks";
import type { Track } from "./tracks";
import type { Run } from "./run";
import {
  RACE_SETUP_RULES_VERSION,
  type EligibleSetupControl,
  type ItemPhysicsContribution,
  type LockedRaceSetup,
  type LockedSetupControl,
  type SetupControlDefinition,
  type SetupControlFamily,
  type SetupPositionId,
  type SetupSelections,
  type VehicleBuild,
} from "./types";

// 028-pre-race-setup: replaces the proof singular brake-balance domain
// (`BrakeBalanceSetting`/`brakeBalanceDeltas`/`lockRaceSetup(input, setting)`)
// with the versioned multi-control catalog described in data-model.md and
// contracts/race-setup-contract.md.

export interface RaceSetupInput {
  run: Run;
  encounterId: string;
  build: VehicleBuild;
  track: Track;
  eligibleControls: readonly EligibleSetupControl[];
  initialSelections: SetupSelections;
}

// --- Catalog -----------------------------------------------------------

type FullDelta = Required<ItemPhysicsContribution>;

const ZERO_DELTA: FullDelta = {
  accelerationDelta: 0,
  topSpeedDelta: 0,
  brakingPowerDelta: 0,
  corneringSpeedDelta: 0,
};

function scaleDelta(delta: ItemPhysicsContribution, magnitude: number): FullDelta {
  return {
    accelerationDelta: (delta.accelerationDelta ?? 0) * magnitude,
    topSpeedDelta: (delta.topSpeedDelta ?? 0) * magnitude,
    brakingPowerDelta: (delta.brakingPowerDelta ?? 0) * magnitude,
    corneringSpeedDelta: (delta.corneringSpeedDelta ?? 0) * magnitude,
  };
}

function addDelta(a: ItemPhysicsContribution, b: ItemPhysicsContribution): FullDelta {
  return {
    accelerationDelta: (a.accelerationDelta ?? 0) + (b.accelerationDelta ?? 0),
    topSpeedDelta: (a.topSpeedDelta ?? 0) + (b.topSpeedDelta ?? 0),
    brakingPowerDelta: (a.brakingPowerDelta ?? 0) + (b.brakingPowerDelta ?? 0),
    corneringSpeedDelta: (a.corneringSpeedDelta ?? 0) + (b.corneringSpeedDelta ?? 0),
  };
}

function deltaEquals(a: ItemPhysicsContribution, b: ItemPhysicsContribution): boolean {
  return (a.accelerationDelta ?? 0) === (b.accelerationDelta ?? 0)
    && (a.topSpeedDelta ?? 0) === (b.topSpeedDelta ?? 0)
    && (a.brakingPowerDelta ?? 0) === (b.brakingPowerDelta ?? 0)
    && (a.corneringSpeedDelta ?? 0) === (b.corneringSpeedDelta ?? 0);
}

function inverse(delta: ItemPhysicsContribution): ItemPhysicsContribution {
  const full = scaleDelta(delta, -1);
  const result: ItemPhysicsContribution = {};
  if (delta.accelerationDelta !== undefined) result.accelerationDelta = full.accelerationDelta;
  if (delta.topSpeedDelta !== undefined) result.topSpeedDelta = full.topSpeedDelta;
  if (delta.brakingPowerDelta !== undefined) result.brakingPowerDelta = full.brakingPowerDelta;
  if (delta.corneringSpeedDelta !== undefined) result.corneringSpeedDelta = full.corneringSpeedDelta;
  return result;
}

/** Every authored control is a symmetric, zero-sum exchange (spec.md FR-004D/FR-006/FR-008C.1-G). */
function symmetricControl(
  family: SetupControlFamily,
  label: string,
  lowLabel: string,
  lowDelta: ItemPhysicsContribution,
  highLabel: string,
): SetupControlDefinition {
  return {
    family,
    label,
    positions: [
      { id: "low", label: lowLabel, deltaPerMagnitude: lowDelta },
      { id: "balanced", label: "Balanced", deltaPerMagnitude: {} },
      { id: "high", label: highLabel, deltaPerMagnitude: inverse(lowDelta) },
    ],
  };
}

/** Immutable launch content (spec.md FR-004D, FR-006, FR-008C.1/D/E/F/G). Owned exclusively by this module. */
const SETUP_CONTROL_CATALOG: Readonly<Record<SetupControlFamily, SetupControlDefinition>> = {
  "driver-aggression": symmetricControl(
    "driver-aggression",
    "Driver Aggression",
    "Conservative",
    { accelerationDelta: -6, topSpeedDelta: -1, brakingPowerDelta: 13, corneringSpeedDelta: 1 },
    "Aggressive",
  ),
  "brake-balance": symmetricControl(
    "brake-balance",
    "Brake Balance",
    "Corner Entry",
    { brakingPowerDelta: -13, corneringSpeedDelta: 1 },
    "Stability",
  ),
  "steering-response": symmetricControl(
    "steering-response",
    "Steering Response",
    "Stable",
    { brakingPowerDelta: 13, corneringSpeedDelta: -1 },
    "Responsive",
  ),
  "gearing": symmetricControl(
    "gearing",
    "Gearing",
    "Short",
    { accelerationDelta: 6, topSpeedDelta: -1 },
    "Tall",
  ),
  "propeller-pitch": symmetricControl(
    "propeller-pitch",
    "Propeller Pitch",
    "Fine Pitch",
    { accelerationDelta: 6, topSpeedDelta: -1 },
    "Coarse Pitch",
  ),
  "racing-line": symmetricControl(
    "racing-line",
    "Racing Line",
    "Attack Apex",
    { accelerationDelta: 6, corneringSpeedDelta: -1 },
    "Hold Line",
  ),
  "bodywork-trim": symmetricControl(
    "bodywork-trim",
    "Bodywork Trim",
    "Corner Trim",
    { topSpeedDelta: -1, corneringSpeedDelta: 1 },
    "Streamlined",
  ),
};

/** Canonical family order — used for locked control ordering and generated-rival tie-breaking (contract §3/§6). */
export const CANONICAL_FAMILY_ORDER: readonly SetupControlFamily[] = [
  "driver-aggression",
  "brake-balance",
  "steering-response",
  "gearing",
  "propeller-pitch",
  "racing-line",
  "bodywork-trim",
];

/** Canonical position order — used for generated-rival exhaustive search and tie-breaking (contract §6). */
export const CANONICAL_POSITION_ORDER: readonly SetupPositionId[] = ["low", "balanced", "high"];

export function setupControlDefinition(family: SetupControlFamily): SetupControlDefinition | undefined {
  return SETUP_CONTROL_CATALOG[family];
}

// --- Contract §2: position resolution -----------------------------------

export type SetupResolutionFailure =
  | { kind: "unknown-family"; family: string }
  | { kind: "unknown-position"; family: SetupControlFamily; position: string };

function isSetupResolutionFailure(value: unknown): value is SetupResolutionFailure {
  return typeof value === "object" && value !== null && "kind" in value;
}

/** contract §2: pure, no fallback — unknown family/position returns a typed failure. */
export function resolveSetupDelta(
  family: SetupControlFamily,
  position: SetupPositionId,
  magnitude: number,
): FullDelta | SetupResolutionFailure {
  const definition = SETUP_CONTROL_CATALOG[family];
  if (!definition) return { kind: "unknown-family", family };
  const positionDefinition = definition.positions.find((candidate) => candidate.id === position);
  if (!positionDefinition) return { kind: "unknown-position", family, position };
  return scaleDelta(positionDefinition.deltaPerMagnitude, magnitude);
}

// --- Contract §1: eligibility --------------------------------------------

/**
 * contract §1: Driver Aggression plus one entry per unique
 * `configurableSetup.family` found in installed vehicle slots. Storage is
 * ignored. Pure — reads only the build.
 */
export function deriveEligibleSetupControls(build: VehicleBuild): readonly EligibleSetupControl[] {
  const byFamily = new Map<SetupControlFamily, string[]>();
  installedItems(build).forEach((item) => {
    const effect = item?.configurableSetup;
    if (!item || !effect) return;
    const existing = byFamily.get(effect.family) ?? [];
    byFamily.set(effect.family, [...existing, item.id]);
  });

  const families: SetupControlFamily[] = [
    "driver-aggression",
    ...CANONICAL_FAMILY_ORDER.filter((family) => family !== "driver-aggression" && byFamily.has(family)),
  ];

  return families.map((family) => toEligibleControl(family, [...(byFamily.get(family) ?? [])].sort()));
}

function toEligibleControl(family: SetupControlFamily, sourceItemIds: readonly string[]): EligibleSetupControl {
  const definition = SETUP_CONTROL_CATALOG[family];
  const magnitude = family === "driver-aggression" ? 1 : sourceItemIds.length;
  return {
    family,
    label: definition.label,
    sourceItemIds,
    magnitude,
    positions: definition.positions.map((position) => ({
      id: position.id,
      label: position.label,
      delta: scaleDelta(position.deltaPerMagnitude, magnitude),
    })),
  };
}

// --- Setup input assembly -------------------------------------------------

/**
 * Assembles the immutable facts setup/contest consume (data-model.md
 * "Setup input and practice snapshot"). Contains no rival, purse, sponsor,
 * or prediction presentation data (contract §9). Initial selections default
 * every eligible control to Balanced; 028 Phase 8 layers remembered values
 * on top via `initialSetupSelections` without changing this contract.
 */
export function raceSetupInput(run: Run, encounterId: string): RaceSetupInput {
  const encounter = run.activeEncounter;
  if (run.status !== "active" || !encounter || encounter.id !== encounterId
    || encounter.type !== "pvp" || encounter.payload.kind !== "pvp") {
    throw new Error("Active PvP encounter required for pre-race setup");
  }
  const stage = run.stages.find((candidate) => candidate.id === encounter.stageId);
  const level = stage?.pvpOrdinal ?? 1;
  const build = encounter.payload.buildSnapshot;
  const eligibleControls = deriveEligibleSetupControls(build);
  return {
    run,
    encounterId,
    build,
    track: generateTrack(run.seed, level),
    eligibleControls,
    initialSelections: initialSetupSelections(eligibleControls, run.setupMemory),
  };
}

/**
 * data-model.md "Draft and remembered state" / contract §7: initial
 * selection uses remembered positions only for currently eligible controls;
 * everything else (including a disabled or absent memory) defaults to
 * Balanced. A dormant remembered value for an ineligible family is simply
 * not read here — it stays untouched in `run.setupMemory` for later races.
 */
/**
 * contract §7: Start Race updates run memory only when `enabled === true`,
 * keyed by family, merging into (never replacing) any prior championship-
 * local memory so dormant entries for currently ineligible families survive
 * untouched (FR-012B/C). Disabling the checkbox stops future writes but
 * does not erase what was already remembered.
 */
export function commitSetupMemory(run: Run, selections: SetupSelections, enabled: boolean): Run {
  const existingSelections = run.setupMemory?.selections ?? {};
  return {
    ...run,
    setupMemory: {
      enabled,
      selections: enabled ? { ...existingSelections, ...selections } : existingSelections,
    },
  };
}

export function initialSetupSelections(
  eligibleControls: readonly EligibleSetupControl[],
  memory: Run["setupMemory"],
): SetupSelections {
  if (!memory?.enabled) return {};
  const selections: SetupSelections = {};
  eligibleControls.forEach((control) => {
    const remembered = memory.selections[control.family];
    if (remembered) selections[control.family] = remembered;
  });
  return selections;
}

// --- Contract §3: lock and validation --------------------------------------

export type LockRaceSetupFailure =
  | { kind: "missing-universal-control" }
  | SetupResolutionFailure;

/**
 * contract §3: validates eligible families and selections, then returns a
 * canonical family-sorted selection set and summed delta. Unknown selection
 * values (a defensive check — SetupSelections is typed, but this also
 * guards tampered/deserialized input the type system cannot see) return a
 * typed failure rather than a silent fallback.
 */
export function lockRaceSetup(
  input: RaceSetupInput,
  selections: SetupSelections,
): LockedRaceSetup | LockRaceSetupFailure {
  const eligibleByFamily = new Map(input.eligibleControls.map((control) => [control.family, control] as const));
  if (!eligibleByFamily.has("driver-aggression")) return { kind: "missing-universal-control" };

  const families = CANONICAL_FAMILY_ORDER.filter((family) => eligibleByFamily.has(family));
  const controls: LockedSetupControl[] = [];
  for (const family of families) {
    const eligible = eligibleByFamily.get(family)!;
    const position = selections[family] ?? "balanced";
    const resolved = resolveSetupDelta(family, position, eligible.magnitude);
    if (isSetupResolutionFailure(resolved)) return resolved;
    controls.push({
      family,
      position,
      sourceItemIds: eligible.sourceItemIds,
      magnitude: eligible.magnitude,
      appliedDelta: resolved,
    });
  }

  return {
    rulesVersion: RACE_SETUP_RULES_VERSION,
    encounterId: input.encounterId,
    trackId: input.track.id,
    controls,
    totalDelta: controls.reduce<FullDelta>((sum, control) => addDelta(sum, control.appliedDelta), ZERO_DELTA),
  };
}

export type RaceSetupValidationFailure =
  | { kind: "unknown-rules-version" }
  | { kind: "track-mismatch" }
  | { kind: "encounter-mismatch" }
  | { kind: "missing-universal-control" }
  | { kind: "unknown-family"; family: string }
  | { kind: "unknown-position"; family: SetupControlFamily; position: string }
  | { kind: "ineligible-family"; family: SetupControlFamily }
  | { kind: "duplicate-family"; family: SetupControlFamily }
  | { kind: "family-order-mismatch" }
  | { kind: "source-id-mismatch"; family: SetupControlFamily }
  | { kind: "magnitude-mismatch"; family: SetupControlFamily }
  | { kind: "delta-mismatch"; family: SetupControlFamily }
  | { kind: "aggregate-mismatch" };

/**
 * contract §3: re-derives eligibility from `input` and independently
 * recomputes every value a candidate `LockedRaceSetup` claims, rather than
 * trusting its own serialized fields. Used for ghost/replay input and any
 * setup that did not just come out of `lockRaceSetup` in this process
 * (contract §4's per-car contest parity, generated-rival adapter output).
 */
export function validateLockedRaceSetup(
  input: RaceSetupInput,
  candidate: LockedRaceSetup,
): { kind: "valid"; setup: LockedRaceSetup } | RaceSetupValidationFailure {
  if (candidate.rulesVersion !== RACE_SETUP_RULES_VERSION) return { kind: "unknown-rules-version" };
  if (candidate.trackId !== input.track.id) return { kind: "track-mismatch" };
  if (candidate.encounterId !== input.encounterId) return { kind: "encounter-mismatch" };

  const eligibleByFamily = new Map(input.eligibleControls.map((control) => [control.family, control] as const));
  if (!eligibleByFamily.has("driver-aggression")) return { kind: "missing-universal-control" };

  const expectedFamilies = CANONICAL_FAMILY_ORDER.filter((family) => eligibleByFamily.has(family));

  const seen = new Set<SetupControlFamily>();
  for (const control of candidate.controls) {
    if (seen.has(control.family)) return { kind: "duplicate-family", family: control.family };
    seen.add(control.family);
    if (!eligibleByFamily.has(control.family)) return { kind: "ineligible-family", family: control.family };
  }
  const missing = expectedFamilies.find((family) => !seen.has(family));
  if (missing) return { kind: "ineligible-family", family: missing };
  if (candidate.controls.map((control) => control.family).join(",") !== expectedFamilies.join(",")) {
    return { kind: "family-order-mismatch" };
  }

  let recomputedTotal: FullDelta = ZERO_DELTA;
  for (const control of candidate.controls) {
    const eligible = eligibleByFamily.get(control.family)!;
    if (
      control.sourceItemIds.length !== eligible.sourceItemIds.length
      || control.sourceItemIds.some((id, index) => id !== eligible.sourceItemIds[index])
    ) {
      return { kind: "source-id-mismatch", family: control.family };
    }
    if (control.magnitude !== eligible.magnitude) return { kind: "magnitude-mismatch", family: control.family };
    const resolved = resolveSetupDelta(control.family, control.position, control.magnitude);
    if (isSetupResolutionFailure(resolved)) {
      return resolved.kind === "unknown-family"
        ? { kind: "unknown-family", family: control.family }
        : { kind: "unknown-position", family: control.family, position: control.position };
    }
    if (!deltaEquals(resolved, control.appliedDelta)) return { kind: "delta-mismatch", family: control.family };
    recomputedTotal = addDelta(recomputedTotal, resolved);
  }
  if (!deltaEquals(recomputedTotal, candidate.totalDelta)) return { kind: "aggregate-mismatch" };

  return { kind: "valid", setup: candidate };
}
