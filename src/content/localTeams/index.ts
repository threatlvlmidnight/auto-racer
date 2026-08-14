import type { LocalTeamProfile, RegionId, VehicleId } from "../../simulation/types";
import { BRITISH_ISLES_TEAMS } from "./britishIsles";
import { CONTINENTAL_EUROPE_TEAMS } from "./continentalEurope";
import { MEDITERRANEAN_NORTH_AFRICA_TEAMS } from "./mediterraneanNorthAfrica";
import { NORTH_AMERICA_TEAMS } from "./northAmerica";
import { NORTHERN_EUROPE_TEAMS } from "./northernEurope";
import { PARIS_EXHIBITION_TEAMS } from "./parisExhibition";
import { SOUTH_AMERICA_TEAMS } from "./southAmerica";

type TeamRow = readonly [string, string, string, VehicleId, string];

function profiles(regionId: RegionId, rows: readonly TeamRow[]): LocalTeamProfile[] {
  return rows.map(([id, name, teamName, vehicleId, engineeringTendency]) => ({
    id: `local-${regionId}-${id}`,
    regionId,
    name,
    teamName,
    vehicleId,
    engineeringTendency,
  }));
}

export const LOCAL_TEAM_PROFILES: readonly LocalTeamProfile[] = [
  ...profiles("british-isles", BRITISH_ISLES_TEAMS),
  ...profiles("continental-europe", CONTINENTAL_EUROPE_TEAMS),
  ...profiles("north-america", NORTH_AMERICA_TEAMS),
  ...profiles("south-america", SOUTH_AMERICA_TEAMS),
  ...profiles("northern-europe", NORTHERN_EUROPE_TEAMS),
  ...profiles("mediterranean-north-africa", MEDITERRANEAN_NORTH_AFRICA_TEAMS),
  ...profiles("paris-exhibition", PARIS_EXHIBITION_TEAMS),
];
