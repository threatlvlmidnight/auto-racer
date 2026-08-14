import { SELECTABLE_REGION_IDS } from "../content/regions";
import type {
  DestinationOffer,
  RegionId,
  SelectableRegionId,
  TourLeg,
  TourStage,
  WorldTourState,
} from "./types";

export const WORLD_TOUR_SCHEDULE_VERSION = "world-tour-v1" as const;
export const WORLD_TOUR_LEG_COUNT = 5;
export const WORLD_TOUR_STAGE_COUNT = 40;

const LAPS_BY_LEG = [
  [8, 10, 8, 10],
  [8, 10, 10, 12],
  [10, 12, 10, 12],
  [10, 14, 12, 14],
  [12, 14, 12, 16],
] as const;

function mix32(value: number): number {
  let mixed = value | 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function deterministicOrder(seed: number, transitionOrdinal: number, region: SelectableRegionId): number {
  let hash = mix32(seed ^ Math.imul(transitionOrdinal + 1, 0x9e3779b1));
  for (let index = 0; index < region.length; index += 1) {
    hash = mix32(hash ^ region.charCodeAt(index));
  }
  return hash;
}

export function createDestinationOffer(
  seed: number,
  transitionOrdinal: DestinationOffer["transitionOrdinal"],
  visited: readonly SelectableRegionId[],
): DestinationOffer {
  const visitedSet = new Set(visited);
  const eligible = SELECTABLE_REGION_IDS
    .filter((region) => !visitedSet.has(region))
    .sort((left, right) => {
      const difference = deterministicOrder(seed, transitionOrdinal, left)
        - deterministicOrder(seed, transitionOrdinal, right);
      return difference || left.localeCompare(right);
    });
  if (eligible.length < 2) throw new Error("A destination offer requires two unvisited regions");
  return { transitionOrdinal, options: [eligible[0], eligible[1]] };
}

export function confirmDestination(
  offer: DestinationOffer,
  selected: SelectableRegionId,
  visited: readonly SelectableRegionId[],
): readonly SelectableRegionId[] {
  if (!offer.options.includes(selected)) throw new Error("Destination is not part of the current offer");
  if (visited.includes(selected)) throw new Error("Destination was already visited");
  return [...visited, selected];
}

export function buildTourLeg(runId: string, ordinal: 1 | 2 | 3 | 4 | 5, regionId: RegionId): TourLeg {
  if (ordinal === 5 && regionId !== "paris-exhibition") throw new Error("The fifth leg must be Paris");
  if (ordinal < 5 && regionId === "paris-exhibition") throw new Error("Paris is reserved for the fifth leg");
  const globalStart = (ordinal - 1) * 8;
  const championshipStart = (ordinal - 1) * 2;
  const descriptors = [
    { kind: "arrival" as const },
    { kind: "race" as const, raceKind: "local" as const, localRaceTier: "qualifier" as const, raceOrdinalInLeg: 1 as const, lapCount: LAPS_BY_LEG[ordinal - 1][0] },
    { kind: "preparation" as const },
    { kind: "race" as const, raceKind: "championship" as const, raceOrdinalInLeg: 2 as const, championshipRaceOrdinal: championshipStart + 1, lapCount: LAPS_BY_LEG[ordinal - 1][1] },
    { kind: "preparation" as const },
    { kind: "race" as const, raceKind: "local" as const, localRaceTier: "challenge" as const, raceOrdinalInLeg: 3 as const, lapCount: LAPS_BY_LEG[ordinal - 1][2] },
    { kind: "preparation" as const },
    { kind: "race" as const, raceKind: "championship" as const, raceOrdinalInLeg: 4 as const, championshipRaceOrdinal: championshipStart + 2, lapCount: LAPS_BY_LEG[ordinal - 1][3] },
  ];
  const stages: TourStage[] = descriptors.map((descriptor, index) => ({
    id: `${runId}-leg-${ordinal}-stage-${index + 1}`,
    globalOrdinal: globalStart + index + 1,
    legOrdinal: ordinal,
    legStageOrdinal: (index + 1) as TourStage["legStageOrdinal"],
    regionId,
    ...descriptor,
  }));
  return { ordinal, regionId, stages };
}

export function buildCommittedWorldTour(runId: string, selectedRegions: readonly SelectableRegionId[]): readonly TourLeg[] {
  if (selectedRegions.length !== 4 || new Set(selectedRegions).size !== 4) {
    throw new Error("A committed world tour requires four unique selected regions");
  }
  return [
    ...selectedRegions.map((regionId, index) => buildTourLeg(runId, (index + 1) as 1 | 2 | 3 | 4, regionId)),
    buildTourLeg(runId, 5, "paris-exhibition"),
  ];
}

export function createWorldTourState(seed: number): WorldTourState {
  return {
    scheduleVersion: WORLD_TOUR_SCHEDULE_VERSION,
    phase: "awaiting-destination",
    selectedRegions: [],
    destinationOffer: createDestinationOffer(seed, 0, []),
    legs: [],
    currentGlobalStageIndex: 0,
    standings: [],
    championshipRivals: [],
    finaleMode: null,
    classification: null,
    lastChanceStatus: "available",
  };
}

export function confirmWorldTourDestination(
  runId: string,
  tour: WorldTourState,
  selected: SelectableRegionId,
): WorldTourState {
  if (tour.phase !== "awaiting-destination" || !tour.destinationOffer) {
    throw new Error("The world tour is not awaiting a destination");
  }
  const selectedRegions = confirmDestination(tour.destinationOffer, selected, tour.selectedRegions);
  const ordinal = selectedRegions.length as 1 | 2 | 3 | 4;
  return {
    ...tour,
    phase: "racing",
    selectedRegions,
    destinationOffer: null,
    legs: [...tour.legs, buildTourLeg(runId, ordinal, selected)],
  };
}

export function completeCurrentTourLeg(runId: string, seed: number, tour: WorldTourState): WorldTourState {
  if (tour.phase !== "racing" || tour.legs.length === 0) {
    throw new Error("No active tour leg can be completed");
  }
  const completedLegCount = tour.legs.length;
  const currentGlobalStageIndex = completedLegCount * 8;
  if (completedLegCount < 4) {
    const transitionOrdinal = completedLegCount as 1 | 2 | 3;
    return {
      ...tour,
      phase: "awaiting-destination",
      destinationOffer: createDestinationOffer(seed, transitionOrdinal, tour.selectedRegions),
      currentGlobalStageIndex,
    };
  }
  if (completedLegCount === 4) {
    return {
      ...tour,
      phase: "racing",
      destinationOffer: null,
      legs: [...tour.legs, buildTourLeg(runId, 5, "paris-exhibition")],
      currentGlobalStageIndex,
    };
  }
  return {
    ...tour,
    phase: "completed",
    destinationOffer: null,
    currentGlobalStageIndex: WORLD_TOUR_STAGE_COUNT,
  };
}

export interface WorldTourProgress {
  completedStages: number;
  totalStages: 40;
  currentLegOrdinal: 1 | 2 | 3 | 4 | 5 | null;
  currentLegStageOrdinal: number | null;
  phase: WorldTourState["phase"];
}

export function worldTourProgress(tour: WorldTourState): WorldTourProgress {
  const currentLeg = tour.phase === "racing" ? tour.legs[tour.legs.length - 1] : undefined;
  return {
    completedStages: tour.currentGlobalStageIndex,
    totalStages: WORLD_TOUR_STAGE_COUNT,
    currentLegOrdinal: currentLeg?.ordinal ?? null,
    currentLegStageOrdinal: currentLeg
      ? Math.min(8, tour.currentGlobalStageIndex - (currentLeg.ordinal - 1) * 8 + 1)
      : null,
    phase: tour.phase,
  };
}

export type WorldTourCompatibility =
  | { kind: "compatible" }
  | { kind: "unavailable"; code: "legacy-championship-schedule" | "malformed-world-tour" };

export function validateWorldTourCompatibility(value: unknown): WorldTourCompatibility {
  if (!value || typeof value !== "object" || !("scheduleVersion" in value)) {
    return { kind: "unavailable", code: "legacy-championship-schedule" };
  }
  const candidate = value as Partial<WorldTourState>;
  if (
    candidate.scheduleVersion !== WORLD_TOUR_SCHEDULE_VERSION
    || !Array.isArray(candidate.selectedRegions)
    || !Array.isArray(candidate.legs)
    || typeof candidate.currentGlobalStageIndex !== "number"
  ) {
    return { kind: "unavailable", code: "malformed-world-tour" };
  }
  return { kind: "compatible" };
}
