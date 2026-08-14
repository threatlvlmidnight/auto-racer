import { SELECTABLE_REGION_IDS } from "../content/regions";
import type {
  DestinationOffer,
  RegionId,
  SelectableRegionId,
  TourLeg,
  TourStage,
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
