import type { SampleGhost, SpecCar } from "../simulation/types";

/** Shared mechanically-equivalent baseline retained after the legacy item catalog retired in feature 020. */
export const BASELINE_CAR: SpecCar = {
  id: "spec-car-baseline",
  baseLapTime: 6,
};

/** Fixed Test Day control ghost; unrelated to entrant item-pool membership. */
export const SAMPLE_GHOST: SampleGhost = {
  id: "ghost-001",
  lapTime: 5.85,
};
