import type { ChampionshipClassification, StandingEntry } from "./types";

export const CHAMPIONSHIP_POINTS_BY_POSITION = [10, 8, 6, 5, 4, 3, 2, 1] as const;

export function createStandings(entrantIds: readonly string[]): readonly StandingEntry[] {
  if (entrantIds.length !== 8 || new Set(entrantIds).size !== 8) {
    throw new Error("Championship standings require eight unique entrants");
  }
  return entrantIds.map((entrantId, stableOrder) => ({
    entrantId,
    points: 0,
    wins: 0,
    podiums: 0,
    championshipFinishes: [],
    stableOrder,
  }));
}

export function applyChampionshipResult(
  standings: readonly StandingEntry[],
  finishingOrder: readonly string[],
): readonly StandingEntry[] {
  if (finishingOrder.length !== 8 || new Set(finishingOrder).size !== 8) {
    throw new Error("A Championship Race result requires eight unique finishers");
  }
  const known = new Set(standings.map((entry) => entry.entrantId));
  if (finishingOrder.some((entrantId) => !known.has(entrantId))) {
    throw new Error("Championship Race result contains an unknown entrant");
  }
  const positionByEntrant = new Map(finishingOrder.map((entrantId, index) => [entrantId, index + 1]));
  return standings.map((entry) => {
    const position = positionByEntrant.get(entry.entrantId)!;
    return {
      ...entry,
      points: entry.points + CHAMPIONSHIP_POINTS_BY_POSITION[position - 1],
      wins: entry.wins + (position === 1 ? 1 : 0),
      podiums: entry.podiums + (position <= 3 ? 1 : 0),
      championshipFinishes: [...entry.championshipFinishes, position],
    };
  });
}

export function rankStandings(standings: readonly StandingEntry[]): readonly StandingEntry[] {
  return [...standings].sort((left, right) =>
    right.points - left.points
    || right.wins - left.wins
    || right.podiums - left.podiums
    || recentFinish(left) - recentFinish(right)
    || left.stableOrder - right.stableOrder);
}

function recentFinish(entry: StandingEntry): number {
  return entry.championshipFinishes[entry.championshipFinishes.length - 1] ?? Number.POSITIVE_INFINITY;
}

export function qualifiesForEliteFinale(
  standings: readonly StandingEntry[],
  playerEntrantId: string,
): boolean {
  const player = standings.find((entry) => entry.entrantId === playerEntrantId);
  if (!player || player.championshipFinishes.length !== 9) return false;
  return player.points === Math.max(...standings.map((entry) => entry.points));
}

export function classificationForPosition(position: number): ChampionshipClassification {
  if (!Number.isInteger(position) || position < 1 || position > 8) {
    throw new Error("Classification position must be from 1 through 8");
  }
  return position === 1 ? "world-champion" : position <= 3 ? "podium" : "classified";
}

export function normalFinaleClassification(
  standings: readonly StandingEntry[],
  playerEntrantId: string,
): ChampionshipClassification {
  const position = rankStandings(standings).findIndex((entry) => entry.entrantId === playerEntrantId) + 1;
  if (position === 0) throw new Error("Player is missing from championship standings");
  return classificationForPosition(position);
}
