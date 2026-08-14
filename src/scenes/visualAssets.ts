import type { EntrantId, Origin } from "../simulation/types";

export type ProductionBackdropKey =
  | "scene-race-start"
  | "scene-route-headquarters"
  | "scene-sponsor-negotiation"
  | "scene-road-circuit"
  | "scene-finish-line"
  | "scene-pre-race-setup"
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

export function itemFamilyAssetKey(origin: Origin, category: "power" | "chassis"): string {
  return `item-family-${origin}-${category}`;
}
