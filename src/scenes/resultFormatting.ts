import { isCountSynergyBuff } from "../simulation/buffs";
import type { CarResult, NCarContestResult, OfferedItem } from "../simulation/types";

// Pure formatting helpers for ResultScene (User Story 1's outcome banner,
// User Story 2's legibility data — FR-006/FR-007; extended by
// 012-multi-ghost-contest to full N-car standings). Extracted from the scene
// class itself so this content is testable without instantiating Phaser,
// which needs a canvas/WebGL context. Presentation-layer code, so this is
// tested lightly (tests/integration/result-scene.test.ts) rather than under
// strict TDD — only src/simulation is held to that standard.

function ordinal(n: number): string {
  const remainder100 = n % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function playerCar(result: NCarContestResult): CarResult {
  return result.cars.find((car) => car.role === "player")!;
}

export function outcomeLabel(result: NCarContestResult): string {
  switch (result.outcome) {
    case "win":
      return "You Win!";
    case "loss":
      return "You Lose";
    case "tie":
      return "Tie — Win for Both!"; // FR-011 heritage
  }
}

export function outcomeColor(result: NCarContestResult): string {
  switch (result.outcome) {
    case "win":
      return "#7CFC00";
    case "loss":
      return "#FF6B6B";
    case "tie":
      return "#FFD700";
  }
}

export function positionLabel(result: NCarContestResult): string {
  const player = playerCar(result);
  return `${ordinal(player.position)} of ${result.cars.length}`;
}

export function timesLabel(result: NCarContestResult): string {
  const player = playerCar(result);
  return `You: ${player.time.toFixed(1)}s (${positionLabel(result)})`;
}

export function gapLabel(result: NCarContestResult): string {
  const player = playerCar(result);
  const magnitude = Math.abs(player.gapToLeader).toFixed(1);
  if (player.gapToLeader === 0) return "Leading the field";
  return `${magnitude}s behind the leader`;
}

/** One line of the ranked standings list (SC-003). */
export function standingsRow(car: CarResult): string {
  const magnitude = Math.abs(car.gapToLeader).toFixed(1);
  const gap = car.gapToLeader === 0 ? "Leader" : `+${magnitude}s`;
  return `${car.position}. ${car.name} — ${car.time.toFixed(1)}s (${gap})`;
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

export function boardItemsLabel(result: NCarContestResult): string {
  return itemSectionLabel("Board", result.board);
}

export function storageItemsLabel(result: NCarContestResult): string {
  return itemSectionLabel("Storage", result.storage);
}
