import type { LastChanceStatus } from "./types";

export const WORLD_TOUR_REPUTATION_START = 12;
export const LOW_REPUTATION_WARNING_THRESHOLD = 4;

export interface ReputationSettlementInput {
  reputation: number;
  lastChanceStatus: LastChanceStatus;
  /** Combined position and sponsor delta, applied exactly once. */
  delta: number;
  hasNextRace: boolean;
}

export interface ReputationSettlementResult {
  reputation: number;
  lastChanceStatus: LastChanceStatus;
  failed: boolean;
  warning: "none" | "low" | "last-chance" | "failed";
}

export function settleWorldTourReputation(input: ReputationSettlementInput): ReputationSettlementResult {
  if (!Number.isFinite(input.reputation) || input.reputation < 0) {
    throw new Error("Reputation must be a finite non-negative number");
  }
  if (input.lastChanceStatus === "failed") {
    return { reputation: 0, lastChanceStatus: "failed", failed: true, warning: "failed" };
  }

  const reputation = Math.max(0, input.reputation + input.delta);
  if (reputation > 0) {
    const lastChanceStatus = input.lastChanceStatus === "active"
      ? "consumed"
      : input.lastChanceStatus;
    return {
      reputation,
      lastChanceStatus,
      failed: false,
      warning: reputation <= LOW_REPUTATION_WARNING_THRESHOLD ? "low" : "none",
    };
  }

  if (input.lastChanceStatus === "available" && input.hasNextRace) {
    return {
      reputation: 0,
      lastChanceStatus: "active",
      failed: false,
      warning: "last-chance",
    };
  }

  return {
    reputation: 0,
    lastChanceStatus: "failed",
    failed: true,
    warning: "failed",
  };
}
