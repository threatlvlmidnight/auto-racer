import { regionDefinition } from "../content/regions";
import type { Run } from "../simulation/run";
import type { RegionId, TourStage } from "../simulation/types";

export interface DestinationCardModel {
  regionId: RegionId;
  name: string;
  visualTheme: string;
  engineeringTendency: string;
  cadence: "Local Race · Championship Race · Local Race · Championship Race";
}

export interface DestinationChoiceModel {
  status: "available" | "unavailable";
  transitionOrdinal: number;
  cards: readonly DestinationCardModel[];
  reason?: string;
}

export function destinationChoiceModel(run: Run): DestinationChoiceModel {
  const tour = run.worldTour;
  if (!tour || tour.phase !== "awaiting-destination" || !tour.destinationOffer) {
    return { status: "unavailable", transitionOrdinal: 0, cards: [], reason: "No destination choice is currently available." };
  }
  return {
    status: "available",
    transitionOrdinal: tour.destinationOffer.transitionOrdinal,
    cards: tour.destinationOffer.options.map((regionId) => {
      const region = regionDefinition(regionId);
      return {
        regionId,
        name: region.name,
        visualTheme: region.visualTheme,
        engineeringTendency: region.engineeringTendency,
        cadence: "Local Race · Championship Race · Local Race · Championship Race",
      };
    }),
  };
}

export interface ItineraryLegModel {
  ordinal: number;
  regionId: RegionId;
  name: string;
  state: "completed" | "current" | "upcoming" | "locked";
}

export interface WorldTourItineraryModel {
  legs: readonly ItineraryLegModel[];
  currentStages: readonly TourStage[];
  header: {
    credits: string;
    reputation: string;
    championshipPoints: string;
    progress: string;
  };
}

export type ChampionshipProgressState = "completed" | "current" | "upcoming" | "locked";

export interface ChampionshipProgressModel {
  mode: "tour" | "fallback";
  label: string;
  state: ChampionshipProgressState;
  accessibleLabel: string;
}

/** Text/state contract used by the RunScene progress renderer. */
export function championshipProgressModel(run: Run): ChampionshipProgressModel {
  const itinerary = worldTourItineraryModel(run);
  if (!itinerary) {
    return {
      mode: "fallback",
      label: `Stage ${Math.min(run.stages.length, run.stageIndex + 1)} of ${run.stages.length}`,
      state: run.status === "completed" ? "completed" : run.status === "failed" ? "locked" : "current",
      accessibleLabel: "Championship progress is shown as a stage count.",
    };
  }
  const activeLeg = itinerary.legs.find((leg) => leg.state === "current");
  return {
    mode: "tour",
    label: itinerary.header.progress,
    state: activeLeg?.state ?? "upcoming",
    accessibleLabel: `${itinerary.header.progress}; ${activeLeg?.name ?? "next leg"} is ${activeLeg?.state ?? "upcoming"}.`,
  };
}

export function worldTourItineraryModel(run: Run): WorldTourItineraryModel | null {
  const tour = run.worldTour;
  if (!tour) return null;
  const currentLeg = tour.phase === "racing" ? tour.legs[tour.legs.length - 1] : undefined;
  const completedLegs = Math.floor(tour.currentGlobalStageIndex / 8);
  const selected = tour.legs.map((leg) => ({
    ordinal: leg.ordinal,
    regionId: leg.regionId,
    name: regionDefinition(leg.regionId).name,
    state: (leg.ordinal <= completedLegs ? "completed" : leg === currentLeg ? "current" : "upcoming") as ItineraryLegModel["state"],
  }));
  if (!selected.some((leg) => leg.regionId === "paris-exhibition")) {
    selected.push({ ordinal: 5, regionId: "paris-exhibition", name: regionDefinition("paris-exhibition").name, state: "locked" });
  }
  const playerStanding = tour.standings.find((entry) => entry.entrantId === run.identity.entrantId);
  return {
    legs: selected,
    currentStages: currentLeg?.stages ?? [],
    header: {
      credits: `${run.credits} credits`,
      reputation: `${run.reputation} reputation`,
      championshipPoints: `${playerStanding?.points ?? 0} championship points`,
      progress: `Stage ${Math.min(40, tour.currentGlobalStageIndex + 1)} of 40`,
    },
  };
}
