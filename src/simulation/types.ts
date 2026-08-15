import type { PlayerLap } from "./laps";
import type { PhysicalStats, Track } from "./tracks";

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

// --- Feature 029: versioned world championship ---------------------------

export type SelectableRegionId =
  | "british-isles"
  | "continental-europe"
  | "north-america"
  | "south-america"
  | "northern-europe"
  | "mediterranean-north-africa";

export type RegionId = SelectableRegionId | "paris-exhibition";
export type RaceKind = "local" | "championship";
export type LocalRaceTier = "qualifier" | "challenge";
export type FinaleMode = "normal" | "elite";
export type ChampionshipClassification = "world-champion" | "podium" | "classified";
export type LastChanceStatus = "available" | "active" | "consumed" | "failed";

export interface DestinationOffer {
  transitionOrdinal: 0 | 1 | 2 | 3;
  options: readonly [SelectableRegionId, SelectableRegionId];
}

export interface TourStage {
  id: string;
  globalOrdinal: number;
  legOrdinal: 1 | 2 | 3 | 4 | 5;
  legStageOrdinal: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  regionId: RegionId;
  kind: "arrival" | "preparation" | "race";
  raceKind?: RaceKind;
  localRaceTier?: LocalRaceTier;
  raceOrdinalInLeg?: 1 | 2 | 3 | 4;
  raceOrdinalGlobal?: number;
  championshipRaceOrdinal?: number;
  lapCount?: 8 | 10 | 12 | 14 | 16;
}

export interface TourLeg {
  ordinal: 1 | 2 | 3 | 4 | 5;
  regionId: RegionId;
  stages: readonly TourStage[];
}

export interface StandingEntry {
  entrantId: string;
  points: number;
  wins: number;
  podiums: number;
  championshipFinishes: readonly number[];
  stableOrder: number;
}

export interface ChampionshipRivalState {
  entrantId: string;
  stableOrder: number;
  championshipFinishes: readonly number[];
}

export interface WorldTourState {
  scheduleVersion: "world-tour-v1";
  phase: "awaiting-destination" | "racing" | "completed";
  selectedRegions: readonly SelectableRegionId[];
  destinationOffer: DestinationOffer | null;
  legs: readonly TourLeg[];
  currentGlobalStageIndex: number;
  standings: readonly StandingEntry[];
  championshipRivals: readonly ChampionshipRivalState[];
  finaleMode: FinaleMode | null;
  classification: ChampionshipClassification | null;
  lastChanceStatus: LastChanceStatus;
}

export interface LocalTeamProfile {
  id: string;
  regionId: RegionId;
  name: string;
  teamName: string;
  vehicleId: VehicleId;
  engineeringTendency: string;
}

export interface LocalOpponentSnapshot {
  profileId: string;
  regionId: RegionId;
  localRaceTier: LocalRaceTier;
  legOrdinal: 1 | 2 | 3 | 4 | 5;
  build: VehicleBuild;
  setup: LockedRaceSetup;
  provenance: "authored-local" | "deterministic-legal-fallback";
}

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
    /**
     * 023-stat-targeted-amplifiers: which stat this buff amplifies.
     * Absent/"time" = legacy behavior, amplifies timeModifier unchanged.
     */
    targetStat?: StatTarget;
    /**
     * 020-character-item-pools: if true, this buff's applied boost is
     * boostPercent multiplied by the summed authored `price` of every
     * currently fitted item (vehicle slots only — storage excluded,
     * matching "fitted" terminology exactly, including this item's own
     * price). A value-scaled buff. Independent of perCount — authoring both
     * on the same item is not a supported combination.
     */
    scalesWithFittedValue?: boolean;
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

  // --- Feature 014: tag-targeted synergy behavior ---
  /** Optional, defaults to empty. Independent of `buff` — the two never interact. */
  synergyEffects?: readonly SynergyEffect[];

  // --- Feature 021: arcade physics simulation ---
  /** Optional, additive to timeModifier — deltas to a build's four physical stats. */
  physics?: ItemPhysicsContribution;

  // --- Feature 022: contextual physics effects ---
  /**
   * Optional, additional to (never replacing) `physics` — stat deltas that
   * apply only where their own PhysicsCondition matches (022 data-model.md).
   * `undefined` and `[]` are equivalent: both mean "no conditional contributions."
   */
  conditionalPhysics?: readonly ConditionalPhysicsContribution[];

  /**
   * 028-pre-race-setup: optional installed-only control exposed by the
   * scored pre-race setup surface. Absence means the item enables no setup
   * control. See ConfigurableSetupEffect below.
   */
  configurableSetup?: ConfigurableSetupEffect;
}

// --- Feature 023: stat-targeted amplifiers ---------------------------------

/**
 * Which stat a Buff or SynergyEffect amplifies (023 data-model.md).
 * "time" is the legacy default — undefined and "time" are always treated
 * identically wherever this field is read.
 */
export type StatTarget = "time" | "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";

// --- Feature 021: arcade physics simulation -------------------------------

/** A held item's contribution to a build's PhysicalStats (021 data-model.md). */
export interface ItemPhysicsContribution {
  accelerationDelta?: number;
  topSpeedDelta?: number;
  brakingPowerDelta?: number;
  corneringSpeedDelta?: number;
}

export type LapPhaseKind = "accelerating" | "cruising" | "braking" | "apex";

/** One named portion of a simulated lap's time (021 data-model.md). */
export interface LapPhaseBreakdown {
  phase: LapPhaseKind;
  /** Index into the track's own segments array this phase occurred within/around. */
  segmentIndex: number;
  seconds: number;
  /**
   * 022-contextual-physics-effects: which conditional contribution(s), if
   * any, actually applied to produce this phase (FR-006, US3, contract §4).
   * Absent/empty means no conditional contribution matched this phase.
   */
  conditionalMatches?: readonly ConditionalPhysicsMatch[];
}

// --- Feature 022: contextual physics effects ------------------------------

/** A qualifier restricting where a stat delta applies (022 data-model.md). */
export interface PhysicsCondition {
  kind: "corner-tightness";
  direction: "at-least" | "at-most";
  turnDegrees: number;
}

/** An item's stat delta, paired with the PhysicsCondition that gates it (022 data-model.md). */
export interface ConditionalPhysicsContribution {
  condition: PhysicsCondition;
  /** Reuses 021's existing four-field delta shape unchanged. */
  delta: ItemPhysicsContribution;
  /**
   * Which held item this contribution came from — populated by laps.ts's
   * resolver when collecting active items' conditionalPhysics entries, never
   * authored directly on ItemDefinition (US3 inspectability, FR-006).
   */
  sourceItemId?: string;
}

/** Attribution of one matched conditional contribution to a phase (022 US3, FR-006). */
export interface ConditionalPhysicsMatch {
  sourceItemId: string;
  stat: keyof ItemPhysicsContribution;
}

// --- Feature 014: tag-targeted synergy behavior --------------------------

/** What a synergy effect matches against (data-model.md "Synergy Target"). */
export type SynergyTarget =
  | { kind: "tag"; tag: string }
  | { kind: "category"; category: InstallationCategory };

/**
 * How many matches are required and what shape of bonus results. A
 * discriminated union, open to a third `kind` later (FR-012) without
 * touching the first two.
 */
export type SynergyCondition =
  | { kind: "linear-per-count"; percentPerMatch: number }
  | { kind: "exact-other-count"; count: number; bonusPercent: number };

/** One authored effect on an item (data-model.md "Synergy Effect"). */
export interface SynergyEffect {
  target: SynergyTarget;
  /** "others": Boost-Others. "self": Self-Conditional. */
  appliesTo: "others" | "self";
  condition: SynergyCondition;
  /** Exact inspector text, same convention as ItemBehavior.description. */
  description: string;
  /**
   * 023-stat-targeted-amplifiers: which stat this effect amplifies.
   * Absent/"time" = legacy behavior, amplifies timeModifier unchanged.
   * Always resolved once per build, never lap-varying (FR-012).
   */
  targetStat?: StatTarget;
}

/** One contributing effect, for attribution (parallel to installation's attribution shape). */
export interface SynergyApplication {
  sourceItemId: string;
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  /** 023-stat-targeted-amplifiers: always present; "time" for legacy applications. */
  targetStat: StatTarget;
  description: string;
}

/** Per-slot synergy resolution, keyed by VehicleSlotState.slotId. */
export interface SynergyResolution {
  /**
   * Net effect on this slot's item, folded into effectiveItem — keyed by
   * StatTarget since one target item can receive boosts to different stats
   * from different source items simultaneously (023 research.md Decision 3).
   * A stat key is present only when at least one application targeted it.
   */
  appliedDeltaPercent: Partial<Record<StatTarget, number>>;
  applications: SynergyApplication[];
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
  /** 016-duplicate-item-tiering: meaningful only when item is non-null. */
  tier: 1 | 2 | 3;
}

export interface StoredPosition {
  index: number;
  item: ItemDefinition | null;
  /** 016-duplicate-item-tiering: meaningful only when item is non-null. */
  tier: 1 | 2 | 3;
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
  /** 023-stat-targeted-amplifiers: always present; "time" for legacy applications. */
  targetStat: StatTarget;
  /** Meaningful only when targetStat === "time"; 0 otherwise. */
  appliedSeconds: number;
  /** 023-stat-targeted-amplifiers: meaningful only when targetStat !== "time". */
  appliedStatDelta?: number;
}

/**
 * Feature 024: authoritative, evidence-only record of one held item's physical
 * values for one resolved lap. These are the same effective deltas already used
 * by physics after tier/installation/Synergy/Buff handling; recording them MUST
 * NOT change resolution.
 */
export interface ItemPhysicalContributionEvidence {
  lap: number;
  sourceItemId: string;
  sourceLocation: { area: ContributionSourceArea; index: number };
  slotId?: string;
  tier: 1 | 2 | 3;
  installationState?: InstallationState;
  active: boolean;
  flatResolvedDelta: ItemPhysicsContribution;
  conditionalResolvedDeltas: readonly {
    condition: PhysicsCondition;
    delta: ItemPhysicsContribution;
    matchedSegmentIndexes: readonly number[];
  }[];
  buffApplications: readonly BuffApplication[];
  synergyApplications: readonly SynergyApplication[];
  inactiveReason?: string;
}

export interface LapPhysicsEvidence {
  stats: PhysicalStats;
  phases: LapPhaseBreakdown[];
  itemContributions?: ItemPhysicalContributionEvidence[];
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
  /** Present only for vehicle-slot items; storage has no installation state. */
  installation?: {
    state: "fitted" | "flexible" | "improvised";
    behavior: string;
  };
  /** The stable slot id the item occupied, present only for vehicle-slot items. */
  slotId?: string;
  /** Feature 014: present only when at least one synergy effect contributed. */
  synergy?: SynergyApplication[];
}

export interface LapBreakdown {
  /** 1-indexed lap number. */
  lap: number;
  playerLapTime: number;
  ghostLapTime: number;
  firedItems: FiredItem[];
  /** Complete computation evidence. Optional for legacy constructed fixtures. */
  contributions?: ContributionEvidence[];
  /**
   * 021-arcade-physics-simulation: present only when populated by the
   * caller — runPresentation.ts's toLegacyContestResult is the only
   * production code that constructs a LapBreakdown from a PlayerLap, and
   * it must copy this field through explicitly (021 tasks.md T029a,
   * /speckit.analyze finding I1) for run.history to carry it at all.
   */
  physics?: LapPhysicsEvidence;
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
  /**
   * 015-economy-depth: the player's live 1-8 finishing position in the full
   * field, when known. Populated only by the N-car bridge
   * (runPresentation.ts's toLegacyContestResult) — absent for the legacy
   * 2-car resolveContest(build, ghost, lapCount) path, since a 1v1 result
   * has no equivalent position on an 8-car scale.
   */
  playerPosition?: number;
  /** Stable entrant/profile IDs in final order when resolved from an N-car field. */
  finishingOrder?: readonly string[];
}

// --- Feature 012: multi-ghost contest --------------------------------------

/** Authored per-level rule: how many positions to fill, and which price tier to favor. */
export type RivalLevelScaling = (level: number) => {
  slotsToFill: number;
  priceBias: "low" | "mid" | "high";
};

/** Immutable authored content (data-model.md, Rival Profile). Exactly 7 exist. */
export interface RivalProfile {
  id: string;
  name: string;
  color: string;
  vehicleId: VehicleId;
  levelScaling: RivalLevelScaling;
}

export type CarRole = "player" | "rival";

/** One car's resolved result within an N-car contest (data-model.md, Car Result). */
export interface CarResult {
  id: string;
  role: CarRole;
  name: string;
  color: string;
  time: number;
  laps: PlayerLap[];
  /** 1-indexed finishing rank; unique across the result, no gaps. */
  position: number;
  /** time - (position 1's time); 0 for the leader. */
  gapToLeader: number;
  /**
   * 028-pre-race-setup: this car's own immutable locked setup, applied only
   * to its own build/laps. Absent only for explicitly supported legacy
   * evidence — never copied from another car (contract §4/§10).
   */
  setup?: LockedRaceSetup;
}

/** Extends ContestResult to a ranked N-car field (data-model.md, N-Car Contest Result). */
export interface NCarContestResult {
  lapCount: number;
  /** Exactly 8 entries (player + 7 rivals), ordered by position ascending. */
  cars: CarResult[];
  outcome: ContestOutcome;
  board: OfferedItem[];
  storage: OfferedItem[];
  /**
   * 027-race-legibility-integrity: the exact generated Track used to
   * resolve every car's laps — playback and Results read this value and
   * MUST NOT independently call generateTrack for an already-resolved
   * contest (contract §1).
   */
  track: Track;
  /**
   * 027-race-legibility-integrity: original roster priority before final
   * sorting — player first, then rivals in authored roster order.
   * Checkpoint projection ties use this same array final ranking already
   * used (Decision 3); `cars` above is already sorted by final position and
   * cannot safely reconstruct it.
   */
  tieBreakOrder: readonly string[];
}

// --- Feature 028: pre-race setup -------------------------------------------

/** Every launch control family. `driver-aggression` is universal; the other six require an installed item. */
export type SetupControlFamily =
  | "driver-aggression"
  | "brake-balance"
  | "steering-response"
  | "gearing"
  | "propeller-pitch"
  | "racing-line"
  | "bodywork-trim";

export type SetupPositionId = "low" | "balanced" | "high";

/** Authored on `ItemDefinition.configurableSetup` (data-model.md "Control authoring"). Launch magnitude is always 1. */
export interface ConfigurableSetupEffect {
  family: Exclude<SetupControlFamily, "driver-aggression">;
  magnitude: 1;
}

/** One of a control's three immutable launch positions, owned by raceSetup.ts's catalog. */
export interface SetupPositionDefinition {
  id: SetupPositionId;
  label: string;
  /** Per unit of magnitude. Balanced is always all-zero; low/high are exact inverses. */
  deltaPerMagnitude: ItemPhysicsContribution;
}

export interface SetupControlDefinition {
  family: SetupControlFamily;
  label: string;
  positions: readonly [SetupPositionDefinition, SetupPositionDefinition, SetupPositionDefinition];
}

/** One position's resolved (magnitude-scaled) delta, for presentation/lock consumption. */
export interface SetupPositionPresentation {
  id: SetupPositionId;
  label: string;
  delta: Required<ItemPhysicsContribution>;
}

/** A control derived from the current build (data-model.md "Derived eligible control"). */
export interface EligibleSetupControl {
  family: SetupControlFamily;
  label: string;
  /** Empty only for driver-aggression. Stable-sorted for canonical equality. */
  sourceItemIds: readonly string[];
  /** 1 for the universal control; installed source count for equipment controls. */
  magnitude: number;
  positions: readonly SetupPositionPresentation[];
}

/** The player's uncommitted discrete choice per family. Missing entries resolve to "balanced". */
export type SetupSelections = Partial<Record<SetupControlFamily, SetupPositionId>>;

/** Championship-local remembered setup (data-model.md "Draft and remembered state"). */
export interface RunSetupMemory {
  enabled: boolean;
  selections: SetupSelections;
}

export interface LockedSetupControl {
  family: SetupControlFamily;
  position: SetupPositionId;
  sourceItemIds: readonly string[];
  magnitude: number;
  appliedDelta: Required<ItemPhysicsContribution>;
}

export const RACE_SETUP_RULES_VERSION = "race-setup-v1";

export interface LockedRaceSetup {
  rulesVersion: typeof RACE_SETUP_RULES_VERSION;
  encounterId: string;
  trackId: string;
  /** Canonical family order — see raceSetup.ts's CANONICAL_FAMILY_ORDER. */
  controls: readonly LockedSetupControl[];
  totalDelta: Required<ItemPhysicsContribution>;
}

/**
 * T058: a future recorded asynchronous ghost's contract (data-model.md
 * "Per-car contest and ghost evidence", FR-016/FR-017) — not constructed or
 * persisted by any code yet (no network/backend exists in this feature).
 * Reserved so a later async-multiplayer feature can adopt this exact shape
 * rather than re-deriving it, and so `validateLockedRaceSetup` (raceSetup.ts)
 * already has the right input shape to re-validate one on replay: build the
 * `RaceSetupInput` from `ghost.build`/`ghost.trackId`, then call
 * `validateLockedRaceSetup(input, ghost.setup)`.
 */
export interface RecordedGhost {
  build: VehicleBuild;
  setup: LockedRaceSetup;
  trackId: string;
  simulationRulesVersion: string;
}

export interface ExactTrackGhostRecord extends RecordedGhost {
  id: string;
  ownerId: string;
  displayName: string;
  recordedTime: number;
}

export interface EliteFinaleOpponent extends ExactTrackGhostRecord {
  provenance: "recorded" | "exhibition-fallback";
}

// --- Feature 032: demo feedback bug pass ----------------------------------
//
// Shared evidence/receipt vocabulary for the demo feedback pass (032
// data-model.md). Every type here is an immutable projection: simulation,
// settlement, and garage authorities produce them; presentation consumes
// them; nothing ever mutates one in place.

/** The audited vocabulary for shipped scaling-like rules (research Decision 2). */
export type ScalingKind = "composition" | "fitted-value" | "lap-activation";

/**
 * One item's scaling classification for presentation (data-model.md
 * "ScalingClassification"). Derived from the authored item plus the held
 * build or retained lap evidence — never a cross-race persistence record.
 */
export interface ScalingClassification {
  kind: ScalingKind;
  sourceItemId: string;
  targetStat: StatTarget;
  /** The current magnitude input: held-match count, fitted value, or activation count. */
  currentInput: number;
  /** The resolved effect at `currentInput` (percent for composition/fitted-value). */
  currentMagnitude: number;
  /** Player-readable description of the next activation/match condition. */
  nextTriggerLabel: string;
}

/** One amplifier's attribution inside a LiveStatChange (FR-003). */
export interface AmplifierAttribution {
  sourceItemId: string;
  sourceItemName: string;
  /** The percent this amplifier added to the affected contribution. */
  magnitudePercent: number;
  /** Label of the contribution being amplified (item name or effect line). */
  affectedContributionLabel: string;
}

/**
 * One immutable live-stat change recorded at an activation boundary
 * (data-model.md "LiveStatChange"). Child evidence of a resolved contest
 * result; playback publishes each exactly once (contract §1).
 */
export interface LiveStatChange {
  boundaryId: string;
  lap: number;
  stat: StatTarget;
  previousValue: number;
  currentValue: number;
  /** `currentValue - previousValue`, signed — never inferred by presentation. */
  delta: number;
  /** Numeric direction of the change; presentation adds signed text + arrow. */
  direction: "up" | "down";
  sourceItemId: string;
  sourceItemName: string;
  amplifierSources: readonly AmplifierAttribution[];
}

/** Where a held item lives — exact location evidence for economy/sale receipts. */
export type HeldItemLocation =
  | { area: "vehicle"; slotId: string }
  | { area: "storage"; index: number };

/** The transaction that activates a held economy item (research Decision 7). */
export type EconomyTrigger = "scored-win" | "item-sale" | "sponsor-success";

/**
 * One held economy item's contribution to a transaction (data-model.md
 * "EconomyContribution"). Included in the owning authoritative transaction
 * receipt exactly once — no live randomness (contract §5).
 */
export interface EconomyContribution {
  sourceItemId: string;
  sourceItemName: string;
  tier: 1 | 2 | 3;
  heldLocation: HeldItemLocation;
  trigger: EconomyTrigger;
  amount: number;
}

export type AcquisitionStatus = "purchased" | "upgraded" | "unavailable";

/** One changed effect value in a duplicate-tier upgrade receipt. */
export interface AcquisitionEffectChange {
  label: string;
  oldValue: string;
  newValue: string;
}

/**
 * Receipt for one acquisition-surface offer slot (data-model.md
 * "AcquisitionReceipt"). Retained only for the current acquisition surface;
 * restock replaces all offer entries and clears prior receipts (contract §3).
 */
export interface AcquisitionReceipt {
  offerId: string;
  status: AcquisitionStatus;
  itemId: string;
  itemName: string;
  /** Null for a first-time purchase. */
  oldTier: 1 | 2 | 3 | null;
  /** Null for an unavailable slot. */
  newTier: 1 | 2 | 3 | null;
  changedEffects: readonly AcquisitionEffectChange[];
}

/** Every active-run non-playback surface that can host inventory (spec US3). */
export type InventoryHost =
  | "destination"
  | "reward"
  | "supplier"
  | "sponsor"
  | "pre-race"
  | "result"
  | "run-hub";

/** Chosen from measured safe bounds, never user agent (research Decision 6). */
export type InventoryPresentationMode = "overlay" | "full-window";

/**
 * The typed context token captured before opening inventory (data-model.md
 * "InventoryHostContext"). Closing restores host selection/focus/navigation
 * exactly, except mutations explicitly committed inside inventory.
 */
export interface InventoryHostContext {
  host: InventoryHost;
  sceneKey: string;
  focusKey: string | null;
  /** Host-owned selection/navigation snapshot; opaque to the inventory session. */
  hostState: Readonly<Record<string, unknown>>;
  presentation: InventoryPresentationMode;
  /** Non-null while another modal/transaction blocks inventory entry. */
  blockedReason: string | null;
}

/**
 * One immediate sale's immutable receipt (data-model.md "SaleReceipt /
 * SaleUndoSnapshot"). Totals are exact: `totalPayout === baseValue + sum of
 * contribution amounts` and `creditsAfter === creditsBefore + totalPayout`.
 */
export interface SaleReceipt {
  /** Immutable item snapshot used by the compensating Undo command. */
  item?: ItemDefinition;
  itemId: string;
  itemName: string;
  tier: 1 | 2 | 3;
  priorLocation: HeldItemLocation;
  baseValue: number;
  contributions: readonly EconomyContribution[];
  totalPayout: number;
  creditsBefore: number;
  creditsAfter: number;
}

/**
 * The single bounded compensating snapshot for a sale (research Decision 5).
 * `valid` is false after any later inventory mutation or scene transition —
 * Undo then fails without mutation. Never a general history stack.
 */
export interface SaleUndoSnapshot {
  receipt: SaleReceipt;
  valid: boolean;
}

/** Race kinds counted toward the final run record (spec Clarifications). */
export type ScoredRecordRaceKind = "local" | "championship" | "elite-finale";

/** One settled scored race retained for record projection (research Decision 8). */
export interface ScoredRaceRecordEntry {
  encounterId: string;
  raceKind: ScoredRecordRaceKind;
  /** Ordered 1-8 placement; 1-3 win, 4-8 loss. No tie bucket. */
  position: number;
}

/**
 * The final wins/losses projection derived solely from retained history
 * (data-model.md "ScoredRaceRecordProjection"). No separately mutable
 * counters; each entry counts exactly once.
 */
export interface ScoredRaceRecordProjection {
  wins: number;
  losses: number;
  entries: readonly ScoredRaceRecordEntry[];
}
