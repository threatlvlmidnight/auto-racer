import type { EncounterFamily, EncounterType } from "./types";

/**
 * Deterministic encounter cadence authority (034 tasks T023/T025/T026/T027,
 * spec FR pairs / SC-001). Generates type pairs for the 20 choice stages with:
 *  - no two-acquisition-primary pair (SC-001),
 *  - a two-stage selected-type cooldown,
 *  - stable sorting / deterministic consumption of `rng`,
 *  - bounded fallback to a typed neutral result when no legal pair exists.
 * This module is pure: it reads retained cadence state and never mutates a run.
 */

export const TWO_STAGE_SELECTED_COOLDOWN = 2;
export const CHOICE_STAGE_COUNT = 20;

/** Classifies every encounter type into a cadence / eligibility family. */
export const ENCOUNTER_FAMILIES: Readonly<Record<EncounterType, EncounterFamily>> = {
  "parts-supplier": "acquisition",
  "reward-draft": "acquisition",
  "cross-pollination": "acquisition",
  "sponsor-meeting": "economy",
  "tag-specialist": "acquisition",
  "exhibition-trial": "exhibition",
  "scrutineering": "sacrifice",
  "factory-development": "modification",
  "upgrade-workshop": "upgrade",
  "privateer-exchange": "exchange",
  "experimental-rebuild": "transformation",
};

/**
 * A named seed domain for cadence pair generation (034 T028): each choice
 * ordinal's RNG stream is derived from its own (runSeed, choiceOrdinal) pair so
 * choice generation never shares or contaminates other encounter seed domains.
 */
export function cadenceDomainRng(runSeed: number, choiceOrdinal: number): () => number {
  const seed = (Math.imul((runSeed ^ 0x9e3779b9) >>> 0, 31) + Math.imul(choiceOrdinal, 2654435761)) >>> 0;
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reads an encounter's family (legacy summaries included). */
export function familyFor(type: EncounterType): EncounterFamily {
  return ENCOUNTER_FAMILIES[type];
}

/** True for the acquisition family (034: never pair two acquisition encounters). */
export function isAcquisitionPrimary(type: EncounterType): boolean {
  return familyFor(type) === "acquisition";
}

export interface CadenceState {
  /** Local choice ordinal 1..20 (T028: named seed domain for pair generation). */
  choiceOrdinal: number;
  /** Most recent selected types, newest last — used for the two-stage cooldown. */
  selectedHistory: readonly EncounterType[];
  /** Upgrade Workshop guarantee windows already offered/fulfilled this run. */
  upgradeOffered: { window1to20: boolean; window21to40: boolean };
}

export function createCadenceState(): CadenceState {
  return { choiceOrdinal: 0, selectedHistory: [], upgradeOffered: { window1to20: false, window21to40: false } };
}

/**
 * The two-stage selected-type cooldown: a type cannot be offered again if it
 * was selected within the last `TWO_STAGE_SELECTED_COOLDOWN` choice stages.
 */
export function isOnSelectedCooldown(state: CadenceState, type: EncounterType): boolean {
  const recent = state.selectedHistory.slice(-TWO_STAGE_SELECTED_COOLDOWN);
  return recent.includes(type);
}

/** Records a confirmed selection, advancing the choice ordinal and cooldown history. */
export function recordSelection(state: CadenceState, type: EncounterType): CadenceState {
  return {
    ...state,
    choiceOrdinal: state.choiceOrdinal + 1,
    selectedHistory: [...state.selectedHistory, type],
  };
}

/** Which Upgrade Workshop guarantee window a global stage belongs to (FR-046). */
export function upgradeWindowFor(globalStage: number): 1 | 2 {
  return globalStage <= 20 ? 1 : 2;
}

/** True when this global stage is inside a window that still needs a guaranteed offer. */
export function upgradeGuaranteePending(state: CadenceState, globalStage: number): boolean {
  return upgradeWindowFor(globalStage) === 1 ? !state.upgradeOffered.window1to20 : !state.upgradeOffered.window21to40;
}

/** Marks the current window's Upgrade Workshop guarantee as fulfilled. */
export function markUpgradeOffered(state: CadenceState, globalStage: number): CadenceState {
  const window = upgradeWindowFor(globalStage);
  return {
    ...state,
    upgradeOffered:
      window === 1
        ? { ...state.upgradeOffered, window1to20: true }
        : { ...state.upgradeOffered, window21to40: true },
  };
}

export type EncounterPairResult =
  | { kinds: [EncounterType, EncounterType]; fallback: false }
  | { kinds: []; fallback: true };

function boundedIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  return Math.min(length - 1, Math.max(0, Math.floor(index)));
}

/**
 * Generates a legal, deterministic pair from the eligible types. Pure: consumes
 * `rng` in a bounded, stable order and returns a typed neutral fallback when no
 * acquisition/non-acquisition pair exists. No mutation of run state.
 */
export function generateEncounterPair(
  state: CadenceState,
  eligible: readonly EncounterType[],
  rng: () => number,
): EncounterPairResult {
  if (eligible.length < 2) return { kinds: [], fallback: true };

  const eligibleSet = new Set(eligible);
  const fresh = eligible.filter((type) => !isOnSelectedCooldown(state, type));
  const pool = fresh.length > 0 ? fresh : eligible;

  const first = pool[boundedIndex(rng() * pool.length, pool.length)];
  if (!first) return { kinds: [], fallback: true };

  // Second must differ from first, respect the cooldown, and can never complete
  // a two-acquisition pair (SC-001).
  const secondOptions = eligible.filter(
    (type) => type !== first && !isOnSelectedCooldown(state, type) && eligibleSet.has(type),
  );
  let legalSecond = secondOptions;
  if (isAcquisitionPrimary(first)) {
    legalSecond = secondOptions.filter((type) => !isAcquisitionPrimary(type));
  }

  if (legalSecond.length === 0) {
    // Bounded fallback: relax the cooldown once before giving up.
    const relaxed = eligible.filter((type) => type !== first && eligibleSet.has(type));
    if (relaxed.length === 0) return { kinds: [], fallback: true };
    let chosen = relaxed[boundedIndex(rng() * relaxed.length, relaxed.length)] as EncounterType;
    if (isAcquisitionPrimary(first) && isAcquisitionPrimary(chosen)) {
      chosen = relaxed.find((type) => !isAcquisitionPrimary(type)) as EncounterType;
      if (!chosen) return { kinds: [], fallback: true };
    }
    return { kinds: [first, chosen], fallback: false };
  }

  const second = legalSecond[boundedIndex(rng() * legalSecond.length, legalSecond.length)] as EncounterType;
  return { kinds: [first, second], fallback: false };
}
