import type { RegionId, SelectableRegionId } from "../simulation/types";

export interface RegionDefinition {
  id: RegionId;
  name: string;
  visualTheme: string;
  engineeringTendency: string;
  textureKey: string;
  selectable: boolean;
}

export const SELECTABLE_REGION_IDS: readonly SelectableRegionId[] = [
  "british-isles",
  "continental-europe",
  "north-america",
  "south-america",
  "northern-europe",
  "mediterranean-north-africa",
] as const;

export const REGION_DEFINITIONS: readonly RegionDefinition[] = [
  { id: "british-isles", name: "British Isles", visualTheme: "Hedgerows, estates, and wet stone roads", engineeringTendency: "Coachbuilt balance, braking, and durable chassis", textureKey: "region-british-isles", selectable: true },
  { id: "continental-europe", name: "Continental Europe", visualTheme: "Boulevards, alpine approaches, and workshop towns", engineeringTendency: "Precision touring, gearing, and fitted components", textureKey: "region-continental-europe", selectable: true },
  { id: "north-america", name: "North America", visualTheme: "Dirt roads, timber grandstands, and broad straights", engineeringTendency: "Large power units, acceleration, and top speed", textureKey: "region-north-america", selectable: true },
  { id: "south-america", name: "South America", visualTheme: "Mountain roads, port cities, and open plains", engineeringTendency: "Motorcycles, cyclecars, and lightweight momentum", textureKey: "region-south-america", selectable: true },
  { id: "northern-europe", name: "Northern Europe", visualTheme: "Forest roads, lakes, and rough surfaces", engineeringTendency: "Rugged chassis, suspension, and cornering control", textureKey: "region-northern-europe", selectable: true },
  { id: "mediterranean-north-africa", name: "Mediterranean & North Africa", visualTheme: "Coastal roads, dust, and bright stone towns", engineeringTendency: "Cooling, airflow, and endurance", textureKey: "region-mediterranean-north-africa", selectable: true },
  { id: "paris-exhibition", name: "Paris International Exhibition", visualTheme: "Formal exhibition circuit and temporary grandstands", engineeringTendency: "An international mixed field", textureKey: "region-paris-exhibition", selectable: false },
] as const;

export function regionDefinition(regionId: RegionId): RegionDefinition {
  const definition = REGION_DEFINITIONS.find((candidate) => candidate.id === regionId);
  if (!definition) throw new Error(`Unknown region: ${regionId}`);
  return definition;
}
