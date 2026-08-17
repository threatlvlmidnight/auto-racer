import type { CarRole, EntrantId } from "../simulation/types";

/**
 * Feature 036 display-only vehicle profiles (research Decision 3, data-model
 * RaceVisualProfile). These never express stats, slots, item effects, or
 * contest authority — they are pure identity for the broadcast presentation.
 * Four bespoke player profiles back the four bespoke art files; rivals get a
 * deterministic reusable silhouette class plus visible number/pattern/label so
 * no car is identified by color alone (FR-008, SC-003).
 */

export type RaceMarkerShape =
  | "round"
  | "square"
  | "diamond"
  | "triangle"
  | "pentagon"
  | "shield";

/** Must render without any external texture (data-model fallback marker). */
export interface RaceMarkerFallback {
  shape: RaceMarkerShape;
  number: string;
  pattern: string;
  label: string;
}

export interface RaceVisualProfile {
  profileId: string;
  role: CarRole;
  /** Optional manifested texture key; absent rivals fall back to geometry. */
  vehicleKey?: string;
  /** Distinct player model or reusable rival silhouette class. */
  silhouetteClass: string;
  number: string;
  pattern: string;
  label: string;
  fallback: RaceMarkerFallback;
}

/** Stable texture key used by preload and profile lookup (T010/T040). */
export function racePlayerTextureKey(entrantId: string): string {
  return `race-player-${entrantId}`;
}

/**
 * Forward-orientation contract (T048): every bespoke player vehicle's nose
 * points toward +x so that `setRotation(headingRadians)` aligns it with the
 * retained track heading (see vehicle-asset-manifest.md).
 */
export const RACE_VEHICLE_FORWARD_IS_PLUS_X = true;

const PLAYER_CAR_IDS: readonly EntrantId[] = [
  "evelyn-mercer",
  "lucien-soto",
  "inez-rook",
  "nell-voss",
];

const playPatterns: readonly string[] = ["pinstripe", "chevron", "ring", "dash"];
const playShapes: readonly RaceMarkerShape[] = ["round", "square", "diamond", "triangle"];

const playerSilhouetteClasses: Record<EntrantId, string> = {
  "evelyn-mercer": "highwheel",
  "lucien-soto": "needle",
  "inez-rook": "lark",
  "nell-voss": "hush",
};

const playerLabels: Record<EntrantId, string> = {
  "evelyn-mercer": "Evelyn Mercer",
  "lucien-soto": "Lucien Soto",
  "inez-rook": "Inez Rook",
  "nell-voss": "Nell Voss",
};

/** The four bespoke player vehicle profiles; exactly four, keyed by entrant. */
export const PLAYER_VISUAL_PROFILES: readonly RaceVisualProfile[] =
  PLAYER_CAR_IDS.map((entrantId, index) => {
    const number = String(index + 1).padStart(2, "0");
    const pattern = playPatterns[index];
    const shape = playShapes[index];
    return {
      profileId: entrantId,
      role: "player",
      vehicleKey: racePlayerTextureKey(entrantId),
      silhouetteClass: playerSilhouetteClasses[entrantId],
      number,
      pattern,
      label: playerLabels[entrantId],
      fallback: { shape, number, pattern, label: playerLabels[entrantId] },
    };
  });

export function playerVisualProfile(entrantId: string | undefined): RaceVisualProfile {
  const match = PLAYER_VISUAL_PROFILES.find((profile) => profile.profileId === entrantId);
  return match ?? PLAYER_VISUAL_PROFILES[0];
}

/** Reusable rival silhouette classes with distinct fallback marker shapes. */
const RIVAL_CLASSES: readonly {
  silhouetteClass: string;
  shape: RaceMarkerShape;
  pattern: string;
}[] = [
  { silhouetteClass: "rival-roadster", shape: "pentagon", pattern: "stripe" },
  { silhouetteClass: "rival-coupe", shape: "shield", pattern: "split" },
  { silhouetteClass: "rival-tonneau", shape: "round", pattern: "pinion" },
  { silhouetteClass: "rival-wagon", shape: "square", pattern: "cross" },
  { silhouetteClass: "rival-racer", shape: "diamond", pattern: "hash" },
  { silhouetteClass: "rival-sprint", shape: "triangle", pattern: "grate" },
];

/** Stable, non-random hash from a retained car id (deterministic reuse). */
function stableIndex(carId: string): number {
  let hash = 0;
  for (let i = 0; i < carId.length; i++) {
    hash = (hash * 31 + carId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic reusable rival profile derived only from retained car identity. */
export function rivalVisualProfile(carId: string, name: string, color: string): RaceVisualProfile {
  const hash = stableIndex(carId);
  const cls = RIVAL_CLASSES[hash % RIVAL_CLASSES.length];
  const number = String(5 + (hash % 7)).padStart(2, "0");
  const label = name.length > 0 ? name : `Rival ${number}`;
  return {
    profileId: `${carId}::${color}`,
    role: "rival",
    silhouetteClass: cls.silhouetteClass,
    number,
    pattern: cls.pattern,
    label,
    fallback: { shape: cls.shape, number, pattern: cls.pattern, label },
  };
}

/** Resolve the display profile for a playback car (player or rival). */
export function raceVisualProfileForCar(
  car: { id: string; role: CarRole; name: string; color: string },
  playerEntrantId?: string,
): RaceVisualProfile {
  if (car.role === "player") return playerVisualProfile(playerEntrantId);
  return rivalVisualProfile(car.id, car.name, car.color);
}

/**
 * Resolve collision-free profiles for a complete race field (T047). Numbers
 * are assigned 01..N in the provided (roster) order so every car — including
 * every rival — carries a unique visible number alongside its deterministic
 * silhouette/pattern, satisfying FR-008/SC-003 without any random draw.
 */
export function fieldVisualProfiles(
  cars: readonly { id: string; role: CarRole; name: string; color: string }[],
  playerEntrantId?: string,
): ReadonlyMap<string, RaceVisualProfile> {
  const map = new Map<string, RaceVisualProfile>();
  cars.forEach((car, index) => {
    const number = String(index + 1).padStart(2, "0");
    const base = raceVisualProfileForCar(car, playerEntrantId);
    map.set(car.id, {
      ...base,
      number,
      fallback: { ...base.fallback, number },
    });
  });
  return map;
}
