// Shared simulation types (data-model.md). Deliberately minimal/illustrative —
// the real item/component taxonomy is a later feature's responsibility
// (spec.md Assumptions).

/** The one shared starting point every build derives from (spec.md FR-001). */
export interface SpecCar {
  id: string;
  /** Seconds this car takes per lap with no active item effects. */
  baseLapTime: number;
}

export type IdentityTag = "performance";

/** An item that can be offered during the prepare phase. */
export interface OfferedItem {
  id: string;
  /** Display label only — theme is undecided (constitution TODO(THEME)). */
  name: string;
  /** Per-lap magnitude. May be negative (faster) or positive (worse). */
  timeModifier: number;
  /** Absent means the item is neutral. */
  identityTag?: IdentityTag;
  /** Buff items amplify matching-tag direct items instead of modifying time directly. */
  buff?: {
    boostPercent: number;
  };
  /** Laps between firings. Buffs without one are flat, always-on buffs. */
  cooldown?: number;
  /** If true, this item contributes even while located in storage. */
  activeWhileStored?: boolean;
}

/** Flat item capacity shared by every build (002-item-slots FR-001). */
export const SLOT_CAPACITY = 3;
export const STORAGE_CAPACITY = SLOT_CAPACITY;
export const LAP_COUNT = 10;
export const MIN_LAP_TIME = 0.1;

export const ACTIVE_IDENTITY_TAG: IdentityTag = "performance";
export const TAG_WEIGHT = 0.75;

/** The baseline car plus the items held at the end of preparation. */
export interface Build {
  car: SpecCar;
  board: (OfferedItem | null)[];
  storage: (OfferedItem | null)[];
}

/** A fixed, non-live recorded opponent (Clarification: hand-authored, not real player data). */
export interface SampleGhost {
  id: string;
  /** Fixed seconds per lap, identical on every lap. */
  lapTime: number;
}

export type ContestOutcome = "win" | "loss" | "tie";

/**
 * Internal time-series representation of the race. Not rendered by this
 * feature — exists so a future live-playback feature (Constitution
 * Principle IV, Spectation-First) can consume it without recomputation
 * (plan.md Constraints; research.md).
 */
export interface FiredItem {
  id: string;
  contribution: number;
}

export interface LapBreakdown {
  /** 1-indexed lap number. */
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItems: FiredItem[];
}

/** The output of resolving a contest (contracts/simulation-contract.md). */
export interface ContestResult {
  playerTime: number;
  ghostTime: number;
  /** playerTime - ghostTime, signed. */
  gap: number;
  outcome: ContestOutcome;
  /** Compacted final board and storage items for result-screen legibility. */
  board: OfferedItem[];
  storage: OfferedItem[];
  laps: LapBreakdown[];
}
