import { isCountSynergyBuff } from "../simulation/buffs";
import type { OfferedItem } from "../simulation/types";

export type ItemVisualKind = "direct" | "flat-buff" | "stacking-buff" | "count-synergy";

export interface ItemVisualDescriptor {
  kind: ItemVisualKind;
  category: "power" | "chassis";
  performance: boolean;
  cooldown: number;
  activeWhileStored: boolean;
  improvesTime: boolean;
}

export function itemVisualDescriptor(item: OfferedItem): ItemVisualDescriptor {
  let kind: ItemVisualKind = "direct";
  if (isCountSynergyBuff(item)) kind = "count-synergy";
  else if (item.buff && item.cooldown !== undefined) kind = "stacking-buff";
  else if (item.buff) kind = "flat-buff";

  return {
    kind,
    category: item.installationCategory,
    performance: item.identityTag === "performance",
    cooldown: item.cooldown ?? 1,
    activeWhileStored: item.activeWhileStored === true,
    improvesTime: item.timeModifier <= 0,
  };
}
