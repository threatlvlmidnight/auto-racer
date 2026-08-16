import Phaser from "phaser";
import type { OfferedItem } from "../simulation/types";
import {
  compactItemModel,
  itemInspectorModel,
  itemRarityDisplay,
  type ItemInspectorModel,
  type ItemPresentationContext,
  type PlacementComparisonModel,
} from "./itemPresentation";
import { itemVisualDescriptor } from "./itemVisualDescriptor";
import { cardFeedbackState, resolveCardLayout } from "./cardFeedbackPresentation";
import { DEMO_COLORS, UI_FONT } from "./demoTheme";

export function createItemIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: OfferedItem,
  size = 52,
): Phaser.GameObjects.Container {
  const descriptor = itemVisualDescriptor(item);
  const background = scene.add
    .rectangle(0, 0, size, size, DEMO_COLORS.ink)
    .setStrokeStyle(2, descriptor.performance ? DEMO_COLORS.brass : DEMO_COLORS.steel);
  const graphics = scene.add.graphics();
  const accent = descriptor.performance ? DEMO_COLORS.brass : DEMO_COLORS.steel;
  const directionColor = descriptor.improvesTime ? 0x74b893 : 0xc95d61;
  const radius = size * 0.2;

  graphics.lineStyle(3, accent, 1);
  graphics.strokeCircle(-5, 0, radius);
  graphics.lineBetween(-5, -radius - 5, -5, -radius);
  graphics.lineBetween(-10, -radius - 5, 0, -radius - 5);
  graphics.lineBetween(-5, 0, 1, -6);
  graphics.lineBetween(-5, 0, -5, -7);

  graphics.lineStyle(3, directionColor, 1);
  if (descriptor.kind === "direct") {
    const direction = descriptor.improvesTime ? 1 : -1;
    graphics.lineBetween(13, -7 * direction, 13, 7 * direction);
    graphics.lineBetween(13, 7 * direction, 8, 2 * direction);
    graphics.lineBetween(13, 7 * direction, 18, 2 * direction);
  } else {
    graphics.lineBetween(13, 8, 13, -8);
    graphics.lineBetween(13, -8, 8, -3);
    graphics.lineBetween(13, -8, 18, -3);
  }

  if (descriptor.kind === "stacking-buff") {
    graphics.fillStyle(accent, 1);
    graphics.fillRect(5, 11, 4, 3);
    graphics.fillRect(11, 8, 4, 6);
    graphics.fillRect(17, 5, 4, 9);
  } else if (descriptor.kind === "count-synergy") {
    graphics.fillStyle(accent, 1);
    graphics.fillCircle(7, 12, 2.5);
    graphics.fillCircle(13, 12, 2.5);
    graphics.fillCircle(19, 12, 2.5);
  }

  const cooldown = scene.add
    .text(size / 2 - 8, size / 2 - 8, String(descriptor.cooldown), {
      fontSize: "10px",
      fontFamily: UI_FONT,
      color: "#172426",
      backgroundColor: "#d7e4e7",
      padding: { x: 3, y: 1 },
    })
    .setOrigin(0.5);

  const children: Phaser.GameObjects.GameObject[] = [background, graphics, cooldown];
  // Feature 035: non-color rarity token on the icon (text, not color alone).
  const rarityMark = scene.add.text(-size / 2 + 4, size / 2 - 4, itemRarityDisplay(item).a11yToken, {
    fontSize: "9px", fontFamily: UI_FONT, fontStyle: "bold",
    color: "#e9edf0", backgroundColor: "#101817", padding: { x: 2, y: 0 },
  }).setOrigin(0, 1);
  children.push(rarityMark);
  if (descriptor.activeWhileStored) {
    const storageMark = scene.add.graphics();
    storageMark.fillStyle(0x65c7f7, 1);
    storageMark.fillRect(-size / 2 + 5, size / 2 - 11, 11, 7);
    storageMark.lineStyle(1, 0x101619, 1);
    storageMark.lineBetween(-size / 2 + 3, size / 2 - 13, -size / 2 + 18, size / 2 - 13);
    children.push(storageMark);
  }

  return scene.add.container(x, y, children).setSize(size, size);
}

export function createItemCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: OfferedItem,
  options: {
    width: number;
    height: number;
    iconSize?: number;
    layout?: "row" | "column";
    context?: ItemPresentationContext;
    selected?: boolean;
    focused?: boolean;
    emphasis?: "compact" | "offer";
    adjustable?: import("./adjustablePresentation").AdjustablePresentation;
    reducedMotion?: boolean;
    role?: import("./cardFeedbackPresentation").CardRole;
    availability?: import("./cardFeedbackPresentation").CardAvailability;
    upgradeEligible?: boolean;
    upgradeReason?: string | null;
  },
): Phaser.GameObjects.Container {
  const model = compactItemModel(item, options.context ?? { surface: "garage-slot", tier: 1 });
  const offerEmphasis = options.emphasis === "offer";
  const adjustable = options.adjustable;
  const adjustableAvailable = adjustable?.status === "available";
  const feedback = cardFeedbackState({
    item,
    role: options.role ?? "inventory",
    availability: options.availability,
    selected: options.selected,
    focused: options.focused,
    upgradeEligible: options.upgradeEligible,
    upgradeReason: options.upgradeReason,
    reducedMotion: options.reducedMotion,
  });
  const frameWidth = model.rarity === "rare" ? 2 : 1;
  const border = scene.add.rectangle(0, 0, options.width, options.height, 0x172426, 0.94)
    .setStrokeStyle(options.selected || options.focused ? 3 : frameWidth,
      options.focused ? 0xd7e4e7 : options.selected ? DEMO_COLORS.italianRedBright : DEMO_COLORS.steel);
  const nameX = -options.width / 2 + 8;
  const nameWidth = options.width - 16;
  const name = scene.add
    .text(
      nameX,
      -options.height / 2 + 4,
      `${model.name}${model.tierLabel ? `  ${model.tierLabel}` : ""}`,
      {
        fontSize: offerEmphasis ? "12px" : "10px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#f1eee5",
        align: "left",
        wordWrap: { width: nameWidth },
        maxLines: 2,
      },
    )
    .setOrigin(0, 0);

  // Long names may wrap to a second line. Flow metadata/effects from the actual
  // rendered title height rather than fixed offsets so the shared compact card
  // never prints its hierarchy on top of itself.
  const metadataY = -options.height / 2 + 4 + name.height + 2;
  const tagLine = model.conditionTokens.length > 0
    ? model.conditionTokens.slice(0, 2).map((token) => `◆ ${token}`).join(" ")
    : `TAGS: ${model.stateBadges.length > 0 ? model.stateBadges.map((badge) => badge.label).join(" · ") : "none"}`;
  const metadata = scene.add.text(-options.width / 2 + 8, metadataY,
    [`${model.categoryLabel} · ${model.originLabel}${model.priceLabel ? ` · ${model.priceLabel}` : ""} · ${model.rarityLabel.toUpperCase()}${adjustableAvailable ? ` · [${adjustable.controlLabel} ${adjustable.currentValueLabel}]` : ""}`, tagLine].join("\n"), {
      fontSize: offerEmphasis ? "10px" : "8px", fontFamily: UI_FONT, color: "#b8c0c2",
      wordWrap: { width: options.width - 16 },
      maxLines: 2,
      align: "left",
    });
  const rarityChip = scene.add.text(options.width / 2 - 4, -options.height / 2 + 4, `${model.rarityLabel.toUpperCase()}${model.rarity === "rare" ? " ★" : ""}`, {
    fontSize: "8px", fontFamily: UI_FONT, fontStyle: "bold",
    color: model.rarity === "rare" ? "#f1c27a" : "#d7e4e7",
    backgroundColor: model.rarity === "rare" ? "#3a2418" : "#22303a",
    padding: { x: 2, y: 1 },
  }).setOrigin(1, 0);
  const allEffectLines = model.effectLines.map((line) => {
    const marker = line.direction === "gain" ? "▲" : line.direction === "loss" ? "▼" : "◆";
    return `${marker} ${line.statLabel} ${line.valueLabel}${line.conditionLabel ? ` · ${line.conditionLabel}` : ""}`;
  });
  // Feature 035 US3/T035: deliberate compact/pinned layout decision instead of
  // shrinking-and-clipping dense or long-copy cards.
  const layout = resolveCardLayout({
    width: options.width,
    height: options.height,
    nameLength: model.name.length,
    effectCount: allEffectLines.length,
    metadataDensity: 1,
  });
  const visibleLineLimit = layout.effectLinesVisible;
  const hiddenLineCount = Math.max(0, allEffectLines.length - visibleLineLimit);
  const effectText = allEffectLines.slice(0, visibleLineLimit).join("\n");
  const effects = scene.add.text(-options.width / 2 + 8, metadataY + metadata.height + 3, effectText, {
    fontSize: offerEmphasis ? "11px" : "9px",
    fontFamily: UI_FONT,
    color: "#f1eee5",
    lineSpacing: 1,
    wordWrap: { width: options.width - 16 },
    maxLines: visibleLineLimit,
  });

  const children: Phaser.GameObjects.GameObject[] = [border, rarityChip, name, metadata, effects];
  // Feature 035 US2/B: structural (non-color) upgrade-eligibility and
  // unavailable cues derived from authoritative state, not decoration.
  if (feedback.upgradeEligible) {
    children.push(scene.add.text(options.width / 2 - 8, options.height / 2 - 8,
      `⬆ UPGRADE${feedback.upgradeReason ? `: ${feedback.upgradeReason}` : ""}`, {
        fontSize: "8px", fontFamily: UI_FONT, fontStyle: "bold",
        color: "#101817", backgroundColor: "#e8d48b", padding: { x: 4, y: 2 },
        wordWrap: { width: options.width * 0.7 }, maxLines: 2, align: "right",
      }).setOrigin(1, 1));
  }
  if (feedback.availability === "unavailable") {
    children.push(scene.add.text(-options.width / 2 + 8, options.height / 2 - 12, "UNAVAILABLE", {
      fontSize: "7px", fontFamily: UI_FONT, fontStyle: "bold",
      color: "#e9edf0", backgroundColor: "#5a2020", padding: { x: 3, y: 1 },
    }).setOrigin(0, 1));
  }
  if (hiddenLineCount > 0) {
    children.push(scene.add.text(options.width / 2 - 8, options.height / 2 - 24,
      `+${hiddenLineCount} MORE · PIN FOR DETAILS`, {
        fontSize: offerEmphasis ? "8px" : "7px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#b8c0c2",
        backgroundColor: "#101817",
        padding: { x: 3, y: 1 },
      }).setOrigin(1, 1));
  }
  const card = scene.add.container(x, y, children).setSize(options.width, options.height);
  const a11yParts = [model.accessibilityLabel, `Rarity ${model.rarityLabel}`];
  if (adjustableAvailable) a11yParts.push(`Adjustable: ${adjustable!.controlLabel} ${adjustable!.currentValueLabel}`);
  if (feedback.upgradeEligible) a11yParts.push(`Upgrade eligible: ${feedback.upgradeReason ?? "held duplicate can upgrade"}`);
  if (feedback.availability === "unavailable") a11yParts.push("Unavailable");
  if (feedback.motionMode === "reduced") a11yParts.push("Reduced motion");
  card.setData("accessibilityLabel", a11yParts.join(". "));
  card.setData("itemModel", model);
  return card;
}

export function createItemInspector(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: OfferedItem,
  context: ItemPresentationContext,
  options: { width: number; height: number },
): Phaser.GameObjects.Container {
  return createItemInspectorFromModel(scene, x, y, itemInspectorModel(item, context), options);
}

export function createItemInspectorFromModel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  model: ItemInspectorModel,
  options: { width: number; height: number },
): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(0, 0, options.width, options.height, DEMO_COLORS.ink, 0.97)
    .setStrokeStyle(2, DEMO_COLORS.silver, 0.85);
  const title = scene.add.text(-options.width / 2 + 10, -options.height / 2 + 8,
    `${model.identity.name} · ${model.identity.tierLabel} · [${model.identity.rarityLabel.toUpperCase()}]`, {
      fontSize: "13px", fontFamily: UI_FONT, fontStyle: "bold", color: "#f1eee5",
      wordWrap: { width: options.width - 20 },
    });
  const identity = scene.add.text(-options.width / 2 + 10, -options.height / 2 + 28,
    `${model.identity.categoryLabel} · ${model.identity.originLabel}${model.identity.priceLabel ? ` · ${model.identity.priceLabel}` : ""}${model.identity.affordabilityLabel ? ` · ${model.identity.affordabilityLabel}` : ""}\nTAGS: ${model.identity.synergyTags.join(" · ") || "none"}`, {
      fontSize: "10px", fontFamily: UI_FONT, color: "#9eb5c9", wordWrap: { width: options.width - 20 },
    });
  const effectLines = model.effects.map((effect) => {
    const marker = effect.direction === "gain" ? "▲ GAIN" : effect.direction === "loss" ? "▼ LOSS" : "◆ RULE";
    const tierNote = effect.authoredValueLabel !== effect.effectiveValueLabel ? ` (base ${effect.authoredValueLabel})` : "";
    return `${marker} · ${effect.statLabel} ${effect.effectiveValueLabel}${tierNote}${effect.conditionLabel ? ` · ${effect.conditionLabel}` : ""}`;
  });
  const ruleLines = model.rules.map((rule) => `${rule.prefix}: ${rule.text}`);
  const relationshipLines = model.relationships.map((entry) => `${entry.state.toUpperCase()} · ${entry.explanation}`);
  const placementLines = model.placement ? [
    `${model.placement.stateLabel} · ${model.placement.storageActivity === "not-applicable" ? "installed" : `${model.placement.storageActivity} storage`}`,
    ...model.placement.gainedLabels.map((label) => `Gains: ${label}`),
    ...model.placement.lostLabels.map((label) => `Loses: ${label}`),
  ] : [];
  const resolvedLines = model.resolved ? [
    `LAP ${model.resolved.lap} · ${model.resolved.evidenceAvailability === "available" ? "RECORDED" : "NOT EVALUATED"}`,
    ...model.resolved.contributionLines.map((line) => `${line.statLabel}: ${line.effectiveValueLabel}`),
    ...(model.resolved.inactiveReason ? [model.resolved.inactiveReason] : []),
  ] : [];
  const details = scene.add.text(-options.width / 2 + 10, -options.height / 2 + 46,
    [...effectLines, ...ruleLines, ...placementLines, ...relationshipLines, ...resolvedLines].join("\n"), {
      fontSize: "11px", fontFamily: UI_FONT, color: "#e6edf0", lineSpacing: 2,
      wordWrap: { width: options.width - 20 },
    });
  const container = scene.add.container(x, y, [background, title, identity, details]).setSize(options.width, options.height);
  container.setData("accessibilityLabel", model.accessibilityLabel);
  return container;
}

export function createPlacementComparisonInspector(
  scene: Phaser.Scene,
  x: number,
  y: number,
  model: PlacementComparisonModel,
  options: { width: number; height: number },
): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(0, 0, options.width, options.height, DEMO_COLORS.ink, 0.98)
    .setStrokeStyle(2, model.valid ? 0x74b893 : 0xc95d61);
  const incoming = model.incoming.effects.map((line) => `${line.directionLabel.toUpperCase()} ${line.statLabel} ${line.effectiveValueLabel}`).join(" · ");
  const outgoing = model.outgoing
    ? `OUT: ${model.outgoing.identity.name} · ${model.outgoing.effects.map((line) => `${line.statLabel} ${line.effectiveValueLabel}`).join(" · ")}`
    : "OUT: Empty destination";
  const text = scene.add.text(-options.width / 2 + 10, -options.height / 2 + 8, [
    `${model.disposition.toUpperCase()} → ${model.destinationLabel} · ${model.valid ? "VALID" : "BLOCKED"}`,
    `IN: ${model.incoming.identity.name} · ${model.incoming.placement?.stateLabel ?? "Stored"} · ${incoming}`,
    outgoing,
    model.reasonLabel,
  ].filter(Boolean).join("\n"), {
    fontSize: "11px", fontFamily: UI_FONT, color: "#e6edf0", lineSpacing: 2,
    wordWrap: { width: options.width - 20 },
  });
  const container = scene.add.container(x, y, [background, text]).setSize(options.width, options.height);
  container.setData("accessibilityLabel", text.text);
  return container;
}
