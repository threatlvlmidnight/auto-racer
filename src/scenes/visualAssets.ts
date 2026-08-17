import type { EntrantId, Origin, RegionId } from "../simulation/types";
import { UI_CHROME_MASTER_TEXTURE_KEY } from "./uiChrome";
import { PLAYER_VISUAL_PROFILES, racePlayerTextureKey } from "../content/raceVisualProfiles";

/** Stable runtime key for the optional transparent control master. */
export const UI_CHROME_ASSET_KEY = UI_CHROME_MASTER_TEXTURE_KEY;

export type ProductionBackdropKey =
  | "scene-race-start"
  | "scene-route-headquarters"
  | "scene-sponsor-negotiation"
  | "scene-road-circuit"
  | "scene-finish-line"
  | "scene-pre-race-setup"
  | "region-british-isles"
  | "region-continental-europe"
  | "region-north-america"
  | "region-south-america"
  | "region-northern-europe"
  | "region-mediterranean-north-africa"
  | "region-paris-exhibition"
  | "garage-evelyn-mercer"
  | "garage-lucien-soto"
  | "garage-inez-rook"
  | "garage-nell-voss";

export const GARAGE_BACKDROP_BY_ENTRANT: Record<EntrantId, ProductionBackdropKey> = {
  "evelyn-mercer": "garage-evelyn-mercer",
  "lucien-soto": "garage-lucien-soto",
  "inez-rook": "garage-inez-rook",
  "nell-voss": "garage-nell-voss",
};

export const REGION_BACKDROP_BY_ID: Record<RegionId, ProductionBackdropKey> = {
  "british-isles": "region-british-isles",
  "continental-europe": "region-continental-europe",
  "north-america": "region-north-america",
  "south-america": "region-south-america",
  "northern-europe": "region-northern-europe",
  "mediterranean-north-africa": "region-mediterranean-north-africa",
  "paris-exhibition": "region-paris-exhibition",
};

export const NEUTRAL_RACE_BACKDROP: ProductionBackdropKey = "scene-road-circuit";

export function regionalRaceBackdrop(regionId: RegionId | null | undefined): ProductionBackdropKey {
  return regionId ? REGION_BACKDROP_BY_ID[regionId] ?? NEUTRAL_RACE_BACKDROP : NEUTRAL_RACE_BACKDROP;
}

export function itemFamilyAssetKey(origin: Origin, category: "power" | "chassis"): string {
  return `item-family-${origin}-${category}`;
}

// ---------------------------------------------------------------------------
// Feature 036 race player vehicle assets (T010/T040)
// ---------------------------------------------------------------------------

/** The four manifested bespoke player texture keys (preloaded in BootScene). */
export const RACE_PLAYER_VEHICLE_KEYS: readonly string[] = Object.freeze(
  PLAYER_VISUAL_PROFILES.map((profile) => profile.vehicleKey!).filter(Boolean),
);

/** Stable texture key for a given player entrant. */
export function racePlayerTextureKeyById(entrantId: EntrantId): string {
  return racePlayerTextureKey(entrantId);
}

/** Safe no-art lookup: returns a texture key only when it is actually loaded. */
export function availableRaceVehicleTextureKey(
  scene: { textures: { exists(key: string): boolean } },
  key: string | undefined,
): string | undefined {
  if (!key) return undefined;
  return scene.textures.exists(key) ? key : undefined;
}
