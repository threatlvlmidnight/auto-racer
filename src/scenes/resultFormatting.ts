import { isCountSynergyBuff } from "../simulation/buffs";
import type { ContestResult, OfferedItem } from "../simulation/types";

// Pure formatting helpers for ResultScene (User Story 1's outcome banner,
// User Story 2's legibility data — FR-006/FR-007). Extracted from the scene
// class itself so this content is testable without instantiating Phaser,
// which needs a canvas/WebGL context. Presentation-layer code, so this is
// tested lightly (tests/integration/result-scene.test.ts) rather than under
// strict TDD — only src/simulation is held to that standard.

export function outcomeLabel(result: ContestResult): string {
  switch (result.outcome) {
    case "win":
      return "You Win!";
    case "loss":
      return "You Lose";
    case "tie":
      return "Tie — Win for Both!"; // FR-011
  }
}

export function outcomeColor(result: ContestResult): string {
  switch (result.outcome) {
    case "win":
      return "#7CFC00";
    case "loss":
      return "#FF6B6B";
    case "tie":
      return "#FFD700";
  }
}

export function timesLabel(result: ContestResult): string {
  return `You: ${result.playerTime.toFixed(1)}s   Ghost: ${result.ghostTime.toFixed(1)}s`;
}

export function gapLabel(result: ContestResult): string {
  const magnitude = Math.abs(result.gap).toFixed(1);
  if (result.gap === 0) return "Exact tie";
  return result.gap < 0 ? `${magnitude}s ahead of the ghost` : `${magnitude}s behind the ghost`;
}

export function itemIdentityLabel(item: OfferedItem): string {
  return item.identityTag === "performance" ? "Performance" : "Neutral";
}

export function itemEffectLabel(item: OfferedItem): string {
  if (item.buff) {
    if (isCountSynergyBuff(item)) {
      return `Boosts ${itemIdentityLabel(item)} items by ${item.buff.boostPercent}% per ${itemIdentityLabel(item)} item held`;
    }
    return `Boosts ${itemIdentityLabel(item)} items by ${item.buff.boostPercent}%`;
  }

  const modifier = item.timeModifier > 0 ? `+${item.timeModifier}` : `${item.timeModifier}`;
  return `${modifier}s`;
}

/** "1 lap" for always-firing items; "N laps" otherwise. */
export function itemCooldownLabel(item: OfferedItem): string {
  const n = item.cooldown ?? 1;
  return n === 1 ? "1 lap" : `${n} laps`;
}

/** Dependency note for buff items; null for direct items. */
export function itemDependencyNote(item: OfferedItem): string | null {
  if (!item.buff) return null;
  return `Requires an active ${itemIdentityLabel(item)} item to have any effect`;
}

export function itemDetailsLabel(item: OfferedItem): string {
  const storageStatus = item.activeWhileStored ? " [Active in storage]" : "";
  const cooldown = `${itemCooldownLabel(item)} cooldown`;
  const dependency = itemDependencyNote(item);
  const base = `${item.name} [${itemIdentityLabel(item)}]${storageStatus} — ${itemEffectLabel(item)} · ${cooldown}`;
  return dependency ? `${base}\n${dependency}` : base;
}

function itemSectionLabel(title: string, items: OfferedItem[]): string {
  if (items.length === 0) return `${title}: None`;

  const details = items.map((item) => `• ${itemDetailsLabel(item)}`).join("\n");
  return `${title} (${items.length}):\n${details}`;
}

export function boardItemsLabel(result: ContestResult): string {
  return itemSectionLabel("Board", result.board);
}

export function storageItemsLabel(result: ContestResult): string {
  return itemSectionLabel("Storage", result.storage);
}
