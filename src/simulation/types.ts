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

// --- Feature 010: entrant identity and vehicle topology -------------------

export type EntrantId = "evelyn-mercer" | "lucien-soto" | "inez-rook" | "nell-voss";
export type VehicleId = "the-highwheel" | "the-needle" | "the-lark" | "the-hush";
export type Origin = "coachworks" | "velodrome" | "fieldworks" | "backroads";

/** Authored vehicle slot topology. Flex accepts either category without mismatch. */
export type SlotType = "power" | "chassis" | "flex";
/** Every item is exactly one of these; independent of its origin. */
export type InstallationCategory = "power" | "chassis";
export type InstallationState = "fitted" | "flexible" | "improvised";

export const ORIGINS: readonly Origin[] = ["coachworks", "velodrome", "fieldworks", "backroads"];

/** Equal for every vehicle — topology differs, capacity never does. */
export const VEHICLE_SLOT_COUNT = 4;
export const VEHICLE_STORAGE_CAPACITY = 3;

/**
 * A typed simulation operation plus its exact inspector text. Presentation
 * renders `description`; simulation reads the typed fields. Text is never
 * parsed to produce math (data-model.md, Item Definition).
 */
export interface ItemBehavior {
  kind: "time-modifier" | "buff-boost" | "none";
  /** Exact inspector text shown to the player. */
  description: string;
  /** Seconds delta per firing; negative is faster. Present for "time-modifier". */
  timeModifier?: number;
  /** Additional buff amplification points. Present for "buff-boost". */
  buffBoostPercent?: number;
}

/** An item that can be offered during the prepare phase. */
export interface ItemDefinition {
  id: string;
  /** Display label only — theme is undecided (constitution TODO(THEME)). */
  name: string;
  /** Authored run-economy cost in credits. */
  price: number;
  /** Per-lap magnitude. May be negative (faster) or positive (worse). */
  timeModifier: number;
  /** Absent means the item is neutral. */
  identityTag?: IdentityTag;
  /** Buff items amplify matching-tag direct items instead of modifying time directly. */
  buff?: {
    boostPercent: number;
    /**
     * If true, this buff's applied boost is boostPercent multiplied by the
     * count of other held direct items sharing its tag (board or storage,
     * active or inert) — a count-synergy buff (007-count-synergy-buff).
     * Absent/false = existing flat/stacking behavior, governed by cooldown.
     */
    perCount?: boolean;
  };
  /** Laps between firings. Buffs without one are flat, always-on buffs. */
  cooldown?: number;
  /** If true, this item contributes even while located in storage. */
  activeWhileStored?: boolean;

  // --- Feature 010 authored additions ---
  /** Ecosystem this item normally comes from. Controls draft weighting only. */
  origin: Origin;
  /** Power or Chassis. Never restricts where the item may be installed. */
  installationCategory: InstallationCategory;
  /** Shared cross-origin interaction tags; may be empty. */
  synergyTags: readonly string[];
  /** Applied additionally when installed in a matching typed slot. */
  fittedBehavior: ItemBehavior;
  /** Applied additionally in a conflicting typed slot, or an explicit `none`. */
  improvisedBehavior: ItemBehavior;
}

/**
 * Pre-feature-010 name retained so the large existing simulation/presentation
 * surface keeps compiling during the migration. Same type.
 */
export type OfferedItem = ItemDefinition;

export interface VehicleSlotDefinition {
  id: string;
  type: SlotType;
  /** Consumed only by presentation; never by simulation. */
  presentationAnchor?: string;
}

export interface EntrantDefinition {
  id: EntrantId;
  name: string;
  origin: Origin;
  role: string;
  approach: string;
  strategyDirections: readonly string[];
  vehicleId: VehicleId;
  portraitAssetKey: string;
}

export interface VehicleDefinition {
  id: VehicleId;
  name: string;
  entrantId: EntrantId;
  baseCarId: string;
  silhouetteAssetKey: string;
  slots: readonly VehicleSlotDefinition[];
  storageCapacity: number;
}

/** Immutable run-scoped association, created only after entrant confirmation. */
export interface RunIdentity {
  entrantId: EntrantId;
  origin: Origin;
  vehicleId: VehicleId;
  topologyId: string;
}

export interface VehicleSlotState {
  slotId: string;
  slotType: SlotType;
  item: ItemDefinition | null;
}

export interface StoredPosition {
  index: number;
  item: ItemDefinition | null;
}

/** The run's authoritative current build; replaces the generic board. */
export interface VehicleBuild {
  vehicleId: VehicleId;
  car: SpecCar;
  slots: VehicleSlotState[];
  storage: StoredPosition[];
}

export interface InstallationResolution {
  state: InstallationState;
  baseBehavior: ItemBehavior;
  appliedInstallationBehavior: ItemBehavior | null;
  lostFittedBehavior: ItemBehavior | null;
  noAdditionalImprovisedConsequence: boolean;
}

/**
 * Legacy flat capacity from 002-item-slots. Superseded by
 * VEHICLE_SLOT_COUNT/VEHICLE_STORAGE_CAPACITY; retained only where existing
 * offer/draft code still counts generic capacity.
 */
export const SLOT_CAPACITY = 3;
export const STORAGE_CAPACITY = VEHICLE_STORAGE_CAPACITY;
export const LAP_COUNT = 10;
export const MIN_LAP_TIME = 0.1;

export const ACTIVE_IDENTITY_TAG: IdentityTag = "performance";
export const TAG_WEIGHT = 0.75;

/**
 * The authoritative build shape. Feature 010 replaced the generic
 * `board: (OfferedItem | null)[]` with the named vehicle's typed topology;
 * `Build` is now an alias so existing simulation/presentation code reads the
 * same object under its historical name during the migration.
 */
export type Build = VehicleBuild;

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

export type ContributionSourceArea = "board" | "storage";
export type ContributionEffectKind =
  | "direct"
  | "flat-buff"
  | "stacking-buff"
  | "count-buff"
  | "neutral";
export type ContributionTriggerState =
  | "fired"
  | "cooldown"
  | "unmet"
  | "inactive-storage"
  | "zero";

export interface BuffApplication {
  sourceItemId: string;
  targetItemId: string;
  type: "flat" | "stacking" | "count";
  appliedPercent: number;
  appliedSeconds: number;
}

export interface ContributionEvidence {
  lap: number;
  sourceItemId: string;
  sourceLocation: { area: ContributionSourceArea; index: number };
  effectKind: ContributionEffectKind;
  triggerState: ContributionTriggerState;
  baseContribution: number;
  buffApplications: BuffApplication[];
  resultingContribution: number;
  preClampLapTime: number;
  clampAdjustment: number;
  resultingLapTime: number;
  storageActive: boolean;
  reason: string | null;
  installation?: {
    state: "fitted" | "flexible" | "improvised";
    behavior: string;
  };
}

export interface LapBreakdown {
  /** 1-indexed lap number. */
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItems: FiredItem[];
  /** Complete computation evidence. Optional for legacy constructed fixtures. */
  contributions?: ContributionEvidence[];
}

/** The output of resolving a contest (contracts/simulation-contract.md). */
export interface ContestResult {
  /** Explicit terminal lap count used by simulation and presentation. */
  lapCount: number;
  playerTime: number;
  ghostTime: number;
  /** playerTime - ghostTime, signed. */
  gap: number;
  outcome: ContestOutcome;
  /** Compacted final board and storage items for result-screen legibility. */
  board: OfferedItem[];
  storage: OfferedItem[];
  laps: LapBreakdown[];
  /** Resolver-emitted facts used by scored and practice presentation alike. */
  contributions?: ContributionEvidence[];
}
