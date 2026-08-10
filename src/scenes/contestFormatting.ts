import type { RankedCar } from "../simulation/playback";
import type { CarRole } from "../simulation/types";

/**
 * One row of the live standings sidebar (013-race-spectacle FR-004),
 * joining standingsAt's live ranking with each car's authored identity.
 * Extracted from ContestScene so it's testable without a canvas/WebGL
 * context — presentation-layer code, tested lightly per convention.
 */
export interface StandingsRow {
  position: number;
  name: string;
  color: string;
  isPlayer: boolean;
  label: string;
}

export function standingsRows(
  standings: readonly RankedCar[],
  cars: readonly { id: string; role: CarRole; name: string; color: string }[],
): StandingsRow[] {
  const byId = new Map(cars.map((car) => [car.id, car]));

  return standings.map((ranked) => {
    const car = byId.get(ranked.id)!;
    return {
      position: ranked.position,
      name: car.name,
      color: car.color,
      isPlayer: car.role === "player",
      label: `${ranked.position}. ${car.name}`,
    };
  });
}
