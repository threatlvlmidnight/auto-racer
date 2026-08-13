import type { EntrantId, ItemDefinition } from "../../simulation/types";
import { NEUTRAL_ITEMS } from "./neutral";
import { MERCER_ITEMS } from "./mercer";
import { SOTO_ITEMS } from "./soto";
import { ROOK_ITEMS } from "./rook";
import { VOSS_ITEMS } from "./voss";

export { NEUTRAL_ITEMS };

export const EXCLUSIVE_ITEMS: Record<EntrantId, readonly ItemDefinition[]> = {
  "evelyn-mercer": MERCER_ITEMS,
  "lucien-soto": SOTO_ITEMS,
  "inez-rook": ROOK_ITEMS,
  "nell-voss": VOSS_ITEMS,
};
