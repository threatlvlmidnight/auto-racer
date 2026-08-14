import { setupControlDefinition } from "../simulation/raceSetup";
import type { CarResult, LockedSetupControl, NCarContestResult, OfferedItem } from "../simulation/types";
import { compactItemModel, itemInspectorModel } from "./itemPresentation";

// Pure formatting helpers for ResultScene (User Story 1's outcome banner,
// User Story 2's legibility data — FR-006/FR-007; extended by
// 012-multi-ghost-contest to full N-car standings). Extracted from the scene
// class itself so this content is testable without instantiating Phaser,
// which needs a canvas/WebGL context. Presentation-layer code, so this is
// tested lightly (tests/integration/result-scene.test.ts) rather than under
// strict TDD — only src/simulation is held to that standard.

export function ordinal(n: number): string {
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
  const model = compactItemModel(item, { surface: "result", tier: 1 });
  return `${model.categoryLabel} · ${model.originLabel}`;
}

export function itemEffectLabel(item: OfferedItem): string {
  return compactItemModel(item, { surface: "result", tier: 1 }).effectLines
    .map((line) => `${line.directionLabel}: ${line.statLabel} ${line.valueLabel}${line.conditionLabel ? ` · ${line.conditionLabel}` : ""}`)
    .join("; ");
}

/** "1 lap" for always-firing items; "N laps" otherwise. */
export function itemCooldownLabel(item: OfferedItem): string {
  const n = item.cooldown ?? 1;
  return n === 1 ? "1 lap" : `${n} laps`;
}

/** Dependency note for buff items; null for direct items. */
export function itemDependencyNote(item: OfferedItem): string | null {
  const inspector = itemInspectorModel(item, { surface: "result", tier: 1 });
  return inspector.rules.length > 0 ? inspector.rules.map((rule) => `${rule.prefix}: ${rule.text}`).join(" · ") : null;
}

export function itemDetailsLabel(item: OfferedItem): string {
  return itemInspectorModel(item, { surface: "result", tier: 1 }).accessibilityLabel;
}

function itemSectionLabel(title: string, items: OfferedItem[]): string {
  if (items.length === 0) return `${title}: None`;

  const details = items.map((item) => `• ${itemDetailsLabel(item)}`).join("\n");
  return `${title} (${items.length}):\n${details}`;
}

function signedNumber(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
}

function signedDeltaLabel(control: LockedSetupControl): string {
  const { appliedDelta } = control;
  const parts: string[] = [];
  if (appliedDelta.accelerationDelta) parts.push(`Accel ${signedNumber(appliedDelta.accelerationDelta)}`);
  if (appliedDelta.topSpeedDelta) parts.push(`Top Speed ${signedNumber(appliedDelta.topSpeedDelta)}`);
  if (appliedDelta.brakingPowerDelta) parts.push(`Braking ${signedNumber(appliedDelta.brakingPowerDelta)}`);
  if (appliedDelta.corneringSpeedDelta) parts.push(`Cornering ${signedNumber(appliedDelta.corneringSpeedDelta)}`);
  return parts.length > 0 ? parts.join(" · ") : "No change";
}

function setupControlLine(control: LockedSetupControl): string {
  const definition = setupControlDefinition(control.family);
  const familyLabel = definition?.label ?? control.family;
  const positionLabel = definition?.positions.find((position) => position.id === control.position)?.label ?? control.position;
  const sources = control.sourceItemIds.length > 0 ? ` (${control.sourceItemIds.join(", ")})` : "";
  return `${familyLabel}: ${positionLabel}${sources} — ${signedDeltaLabel(control)}`;
}

/**
 * contract §10: Results read `CarResult.setup` only — never infer a setting
 * from item names or regenerate it from current catalog content. Missing
 * evidence (a pre-028 legacy record) is labeled unavailable, never guessed.
 */
export function carSetupLines(car: CarResult): readonly string[] {
  if (!car.setup) return ["Setup: unavailable (legacy result)"];
  return car.setup.controls.map(setupControlLine);
}

export function boardItemsLabel(result: NCarContestResult): string {
  return itemSectionLabel("Board", result.board);
}

export function storageItemsLabel(result: NCarContestResult): string {
  return itemSectionLabel("Storage", result.storage);
}
