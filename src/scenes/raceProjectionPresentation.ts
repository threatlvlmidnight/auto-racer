import type { CarProgress, LiveProjectionState, NCarProgress } from "../simulation/playback";
import type { CarRole } from "../simulation/types";
import { ordinal } from "./resultFormatting";

/**
 * Compact marker identity and lap context (025-vehicle-stat-display's
 * sibling feature 027, US3/T013, data-model.md "Marker Presentation").
 * Marker screen position is spatial only (Decision 5) — on a closed circuit
 * a later-lap car can visually wrap behind an earlier-lap one. This model
 * is what makes that legible: identity and lap count travel with the
 * marker, so overlapping or same-looking markers stay distinguishable
 * without treating along-track order as rank.
 */
export interface MarkerPresentation {
  carId: string;
  role: CarRole;
  /** "You" for the player; the authored name for every rival — never relies on color alone. */
  identityLabel: string;
  /** "Lap N/lapCount" while running, "Finished" once complete. */
  lapLabel: string;
  fractionalProgress: number;
  finished: boolean;
}

export function markerPresentation(
  car: { id: string; role: CarRole; name: string; progress: CarProgress },
  lapCount: number,
): MarkerPresentation {
  const lapNumber = Math.min(car.progress.lapIndex + 1, lapCount);
  return {
    carId: car.id,
    role: car.role,
    identityLabel: car.role === "player" ? "You" : car.name,
    lapLabel: car.progress.finished ? "Finished" : `Lap ${lapNumber}/${lapCount}`,
    fractionalProgress: car.progress.lapProgress,
    finished: car.progress.finished,
  };
}

/** One `MarkerPresentation` per car in `frame.cars`, in the same order. */
export function markerPresentations(
  cars: readonly NCarProgress[],
  lapCount: number,
): readonly MarkerPresentation[] {
  return cars.map((car) => markerPresentation(car, lapCount));
}

// --- 027-race-legibility-integrity US1/US2 (T029/T032): player-centered ---
// checkpoint projection presentation. Every field is textual so meaning
// never depends on color or animation (FR-011); "leads by"/"trails by"
// wording keeps the signed gapToPlayer data unambiguous without requiring
// the reader to parse a +/- sign (contract §5).

export interface ProjectionPresentation {
  /** "Awaiting Lap 1 Split" or "Projected P3". */
  headline: string;
  /** "Split at Lap 4/10", or null before the first split exists. */
  splitLabel: string | null;
  /** "Ahead: Torres — leads by 1.23s", "You lead the field", or null pre-split. */
  aheadLabel: string | null;
  /** "Behind: Colt — trails by 0.42s", "You hold last projected place", or null pre-split. */
  behindLabel: string | null;
  /** "▲ Gained 2 places" / "▼ Lost 1 place" / "● Held position" / "First split" / null pre-split. */
  changeLabel: string | null;
  accessibilityLabel: string;
}

function signedGapText(gapToPlayerSeconds: number): string {
  return `${Math.abs(gapToPlayerSeconds).toFixed(2)}s`;
}

export function projectionPresentation(state: LiveProjectionState): ProjectionPresentation {
  if (state.kind === "awaiting-first-split") {
    return {
      headline: state.label,
      splitLabel: null,
      aheadLabel: null,
      behindLabel: null,
      changeLabel: null,
      accessibilityLabel: state.label,
    };
  }

  const { current, change, placesChanged } = state;
  const headline = `Projected ${ordinal(current.playerPosition)}`;
  const splitLabel = `Split at Lap ${current.completedLap}/${current.lapCount}`;
  const aheadLabel = current.ahead
    ? `Ahead: ${current.ahead.name} — leads by ${signedGapText(current.ahead.gapToPlayer)}`
    : "You lead the field";
  const behindLabel = current.behind
    ? `Behind: ${current.behind.name} — trails by ${signedGapText(current.behind.gapToPlayer)}`
    : "You hold last projected place";
  const changeLabel = change === "first-split"
    ? "First split"
    : change === "gained"
      ? `▲ Gained ${placesChanged} place${placesChanged === 1 ? "" : "s"}`
      : change === "lost"
        ? `▼ Lost ${placesChanged} place${placesChanged === 1 ? "" : "s"}`
        : "● Held position";

  return {
    headline,
    splitLabel,
    aheadLabel,
    behindLabel,
    changeLabel,
    accessibilityLabel: [headline, splitLabel, aheadLabel, behindLabel, changeLabel].join(". "),
  };
}
