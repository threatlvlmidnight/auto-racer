import type { RaceKind } from "./types";

const LOCAL_REPUTATION = [1, 1, 0, 0, 0, -1, -1, -2] as const;
const CHAMPIONSHIP_REPUTATION = [3, 2, 1, 0, -1, -2, -3, -4] as const;
const CHAMPIONSHIP_POINTS = [10, 8, 6, 5, 4, 3, 2, 1] as const;

export interface RaceSettlementPolicy {
  raceKind: RaceKind;
  position: number;
  reputationDelta: number;
  participationCredits: number;
  winBonusCredits: number;
  championshipPoints: number;
  accruesInterest: boolean;
}

export function raceSettlementPolicy(raceKind: RaceKind, position: number): RaceSettlementPolicy {
  if (!Number.isInteger(position) || position < 1 || position > 8) {
    throw new Error(`Race position must be an integer from 1 through 8: ${position}`);
  }
  const index = position - 1;
  const local = raceKind === "local";
  return {
    raceKind,
    position,
    reputationDelta: local ? LOCAL_REPUTATION[index] : CHAMPIONSHIP_REPUTATION[index],
    participationCredits: local ? 1 : 2,
    winBonusCredits: position === 1 ? (local ? 1 : 2) : 0,
    championshipPoints: local ? 0 : CHAMPIONSHIP_POINTS[index],
    accruesInterest: !local,
  };
}
