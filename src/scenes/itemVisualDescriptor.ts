import { isCountSynergyBuff } from "../simulation/buffs";
import type { OfferedItem } from "../simulation/types";

export type ItemVisualKind = "direct" | "flat-buff" | "stacking-buff" | "count-synergy";

export interface ItemTagVisualMetadata {
  tag: string;
  label: string;
  /** Stable, non-color icon token for accessible rendering. */
  iconToken: string;
}

const TAG_LABELS: Record<string, string> = {
  airflow: "Airflow", control: "Control", evasion: "Evasion", experimental: "Experimental",
  exposure: "Exposure", fuel: "Fuel", gearing: "Gearing", heat: "Heat", information: "Information",
  lightweight: "Lightweight", loophole: "Loophole", material: "Material", momentum: "Momentum",
  patronage: "Patronage", pressure: "Pressure", provenance: "Provenance", suspension: "Suspension",
  wager: "Wager", wheel: "Wheel",
};

export function itemTagVisualMetadata(tag: string): ItemTagVisualMetadata {
  const label = TAG_LABELS[tag] ?? tag.replace(/(^|-)([a-z])/g, (_, _separator, letter: string) => ` ${letter.toUpperCase()}`).trim();
  return { tag, label, iconToken: `tag-${tag}` };
}

export interface ItemVisualDescriptor {
  kind: ItemVisualKind;
  category: "power" | "chassis";
  performance: boolean;
  cooldown: number;
  activeWhileStored: boolean;
  improvesTime: boolean;
  tags: readonly ItemTagVisualMetadata[];
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
    tags: item.synergyTags.map(itemTagVisualMetadata),
  };
}
