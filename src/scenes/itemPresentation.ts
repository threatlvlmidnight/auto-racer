import { isCountSynergyBuff, isValueScaledBuff, type PhysicalStatTarget } from "../simulation/buffs";
import { applyTierBonus } from "../simulation/tiering";
import type { GarageDisposition, PlacementPreview } from "../simulation/garage";
import type {
  ConditionalPhysicsContribution,
  ContributionEvidence,
  InstallationState,
  ItemDefinition,
  ItemPhysicalContributionEvidence,
  ItemPhysicsContribution,
  PhysicsCondition,
  StatTarget,
} from "../simulation/types";

export type ItemStatKey = StatTarget;
export type EffectDirection = "gain" | "loss" | "neutral";
export type EffectState = "authored" | "active" | "inactive" | "conditional";
export type ItemVisualKind = "direct" | "buff" | "synergy" | "conditional" | "economy-only";

export interface StatPresentationDefinition {
  key: ItemStatKey;
  label: string;
  compactLabel: string;
  unit: "s" | "speed" | "speed/s";
  lowerIsBetter: boolean;
  order: number;
}

const STAT_DEFINITIONS: Record<ItemStatKey, StatPresentationDefinition> = {
  acceleration: { key: "acceleration", label: "Acceleration", compactLabel: "Acceleration", unit: "speed/s", lowerIsBetter: false, order: 0 },
  topSpeed: { key: "topSpeed", label: "Top Speed", compactLabel: "Top Speed", unit: "speed", lowerIsBetter: false, order: 1 },
  brakingPower: { key: "brakingPower", label: "Braking Power", compactLabel: "Braking", unit: "speed/s", lowerIsBetter: false, order: 2 },
  corneringSpeed: { key: "corneringSpeed", label: "Cornering Speed", compactLabel: "Cornering", unit: "speed", lowerIsBetter: false, order: 3 },
  time: { key: "time", label: "Lap Time", compactLabel: "Lap Time", unit: "s", lowerIsBetter: true, order: 4 },
};

export const ITEM_STAT_ORDER: readonly ItemStatKey[] = [
  "acceleration", "topSpeed", "brakingPower", "corneringSpeed", "time",
];

export function statDefinition(stat: ItemStatKey): StatPresentationDefinition {
  return STAT_DEFINITIONS[stat];
}

function formattedNumber(stat: ItemStatKey, value: number, compact: boolean): string {
  const magnitude = Math.abs(value);
  const decimals = stat === "time" ? 2 : Number.isInteger(magnitude) ? 0 : compact ? 1 : 2;
  return magnitude.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatStatDelta(
  stat: ItemStatKey,
  value: number,
  options: { compact?: boolean } = {},
): { valueLabel: string; direction: EffectDirection; directionLabel: "Gain" | "Loss" | "No change" } {
  const definition = statDefinition(stat);
  const direction: EffectDirection = value === 0
    ? "neutral"
    : definition.lowerIsBetter === (value < 0) ? "gain" : "loss";
  return {
    valueLabel: `${value > 0 ? "+" : value < 0 ? "−" : ""}${formattedNumber(stat, value, options.compact === true)} ${definition.unit}`,
    direction,
    directionLabel: direction === "gain" ? "Gain" : direction === "loss" ? "Loss" : "No change",
  };
}

export type ItemViewSurface =
  | "reward-offer" | "supplier-offer" | "garage-slot" | "storage"
  | "placement-preview" | "race-lap" | "result"
  | "test-day-briefing" | "test-day-lap" | "test-day-result";

export interface ItemStateBadge {
  id: string;
  label: string;
  state: "selected" | "focused" | "active" | "inactive" | "conditional" | "unsatisfied";
}

export interface CompactEffectLine {
  id: string;
  direction: EffectDirection;
  directionLabel: "Gain" | "Loss" | "Rule" | "No race effect" | "No change";
  statLabel: string;
  valueLabel: string;
  conditionLabel?: string;
}

export interface InspectorEffectLine extends CompactEffectLine {
  authoredValueLabel: string;
  effectiveValueLabel: string;
  sourceKind: "base" | "physics" | "conditional" | "buff" | "synergy" | "installation";
  cadenceLabel?: string;
  fullConditionLabel?: string;
}

export interface InspectorRule {
  id: string;
  prefix: "WHEN" | "PER" | "EVERY" | "WHILE" | "TARGET";
  text: string;
  state: EffectState;
}

export interface InstallationPresentation {
  state: InstallationState | "stored";
  stateLabel: "Fitted" | "Flexible" | "Improvised" | "Stored";
  activeBehavior: readonly InspectorEffectLine[];
  inactiveBehavior: readonly InspectorEffectLine[];
  gainedLabels: readonly string[];
  lostLabels: readonly string[];
  storageActivity: "active" | "inert" | "not-applicable";
}

export interface RelationshipEvidence {
  sourceItemId: string;
  kind: "tag" | "buff" | "synergy";
  targetLabel: string;
  targetStatLabel: string;
  authoredMagnitudeLabel: string;
  currentMagnitudeLabel: string;
  matchCount?: number;
  state: "satisfied" | "unsatisfied" | "ineligible";
  explanation: string;
}

export interface ResolvedContributionLine {
  statLabel: string;
  authoredValueLabel: string;
  effectiveValueLabel: string;
  conditionLabel?: string;
  conditionState?: "matched" | "unmatched";
  sourceItemId: string;
}

export interface ItemLapEvidence {
  lap: number;
  installationLabel: string;
  tier: 1 | 2 | 3;
  active: boolean;
  fired: boolean;
  cooldownLabel: string;
  stackingLabel?: string;
  contributionLines: readonly ResolvedContributionLine[];
  inactiveReason?: string;
  evidenceAvailability: "available" | "not-evaluated";
}

export interface ItemPresentationContext {
  surface: ItemViewSurface;
  tier?: 1 | 2 | 3;
  credits?: number;
  priceVisible?: boolean;
  installation?: InstallationPresentation;
  relationshipEvidence?: readonly RelationshipEvidence[];
  lapEvidence?: ItemLapEvidence;
}

export interface CompactItemModel {
  itemId: string;
  name: string;
  tierLabel: string | null;
  categoryLabel: "POWER" | "CHASSIS";
  originLabel: string;
  visualKind: ItemVisualKind;
  effectLines: readonly CompactEffectLine[];
  conditionTokens: readonly string[];
  stateBadges: readonly ItemStateBadge[];
  priceLabel: string | null;
  affordability: "affordable" | "unaffordable" | "not-applicable";
  implementationState: "implemented" | "economy-only";
  accessibilityLabel: string;
}

export interface ItemIdentitySection {
  itemId: string;
  name: string;
  originLabel: string;
  categoryLabel: string;
  tier: 1 | 2 | 3;
  tierLabel: string;
  priceLabel: string | null;
  affordabilityLabel: string | null;
  synergyTags: readonly string[];
}

export interface ItemInspectorModel {
  identity: ItemIdentitySection;
  effects: readonly InspectorEffectLine[];
  rules: readonly InspectorRule[];
  placement?: InstallationPresentation;
  relationships: readonly RelationshipEvidence[];
  resolved?: ItemLapEvidence;
  accessibilityLabel: string;
}

export interface PlacementPresentationContext {
  preview: PlacementPreview;
  incomingItem: ItemDefinition;
  outgoingItem: ItemDefinition | null;
  incomingContext: ItemPresentationContext;
  outgoingContext?: ItemPresentationContext;
}

export interface PlacementComparisonModel {
  incoming: ItemInspectorModel;
  outgoing: ItemInspectorModel | null;
  destinationLabel: string;
  disposition: GarageDisposition;
  valid: boolean;
  reasonLabel: string | null;
}

export function placementComparisonModel(
  preview: PlacementPreview,
  context: PlacementPresentationContext,
): PlacementComparisonModel {
  const destinationLabel = preview.destination.area === "vehicle"
    ? `Vehicle slot ${preview.destination.slotId}` : `Storage ${preview.destination.index + 1}`;
  return {
    incoming: itemInspectorModel(context.incomingItem, context.incomingContext),
    outgoing: context.outgoingItem
      ? itemInspectorModel(context.outgoingItem, context.outgoingContext ?? { surface: "placement-preview", tier: 1 }) : null,
    destinationLabel,
    disposition: preview.disposition,
    valid: preview.legal && preview.reason === null,
    reasonLabel: preview.reason === "requires-confirmation"
      ? "Confirmation required: this destination is occupied"
      : preview.reason ? preview.reason.replace(/-/g, " ") : null,
  };
}

const DELTA_FIELDS: readonly [PhysicalStatTarget, keyof ItemPhysicsContribution][] = [
  ["acceleration", "accelerationDelta"],
  ["topSpeed", "topSpeedDelta"],
  ["brakingPower", "brakingPowerDelta"],
  ["corneringSpeed", "corneringSpeedDelta"],
];

const ORIGIN_LABELS: Record<ItemDefinition["origin"], string> = {
  coachworks: "Coachworks", velodrome: "Velodrome", fieldworks: "Fieldworks", backroads: "Backroads",
};

function conditionLabel(condition: PhysicsCondition): string {
  const comparison = condition.direction === "at-least" ? "at least" : "at most";
  return `WHEN corner is ${comparison} ${condition.turnDegrees}°`;
}

function deltaLines(
  contribution: ItemPhysicsContribution | undefined,
  prefix: string,
  condition?: PhysicsCondition,
): CompactEffectLine[] {
  if (!contribution) return [];
  return DELTA_FIELDS.flatMap(([stat, field]) => {
    const value = contribution[field];
    if (value === undefined || value === 0) return [];
    const formatted = formatStatDelta(stat, value, { compact: true });
    return [{
      id: `${prefix}-${stat}`,
      direction: formatted.direction,
      directionLabel: formatted.directionLabel,
      statLabel: statDefinition(stat).compactLabel,
      valueLabel: formatted.valueLabel,
      conditionLabel: condition ? conditionLabel(condition) : undefined,
    }];
  });
}

function targetLabel(stat: StatTarget | undefined): string {
  return statDefinition(stat ?? "time").label;
}

function buffLine(item: ItemDefinition): CompactEffectLine[] {
  if (!item.buff) return [];
  const scaling = isValueScaledBuff(item)
    ? "per fitted credit"
    : isCountSynergyBuff(item) ? "per eligible item" : "amplification";
  return [{
    id: "buff",
    direction: "neutral",
    directionLabel: "Rule",
    statLabel: `Boost ${targetLabel(item.buff.targetStat)}`,
    valueLabel: `${item.buff.boostPercent >= 0 ? "+" : ""}${item.buff.boostPercent}% ${scaling}`,
    conditionLabel: item.cooldown === undefined ? "ALWAYS" : `EVERY ${item.cooldown} ${item.cooldown === 1 ? "lap" : "laps"}`,
  }];
}

function synergyLines(item: ItemDefinition): CompactEffectLine[] {
  return (item.synergyEffects ?? []).map((effect, index) => {
    const target = effect.target.kind === "tag" ? `${effect.target.tag} items` : `${effect.target.category} items`;
    const amount = effect.condition.kind === "linear-per-count"
      ? `${effect.condition.percentPerMatch >= 0 ? "+" : ""}${effect.condition.percentPerMatch}% per match`
      : `${effect.condition.bonusPercent >= 0 ? "+" : ""}${effect.condition.bonusPercent}% at exactly ${effect.condition.count}`;
    return {
      id: `synergy-${index}`,
      direction: "neutral",
      directionLabel: "Rule",
      statLabel: `Synergy · ${targetLabel(effect.targetStat)}`,
      valueLabel: `${amount} · ${target}`,
      conditionLabel: effect.appliesTo === "self" ? "TARGET self" : "TARGET others",
    };
  });
}

function authoredLines(item: ItemDefinition): CompactEffectLine[] {
  const lines = [
    ...deltaLines(item.physics, "physics"),
    ...(item.conditionalPhysics ?? []).flatMap((entry, index) => deltaLines(entry.delta, `conditional-${index}`, entry.condition)),
    ...buffLine(item),
    ...synergyLines(item),
  ];
  if (item.timeModifier !== 0) {
    const formatted = formatStatDelta("time", item.timeModifier, { compact: true });
    lines.push({ id: "time", direction: formatted.direction, directionLabel: formatted.directionLabel, statLabel: "Lap Time", valueLabel: formatted.valueLabel });
  }
  return lines;
}

function visualKind(item: ItemDefinition, effectLines: readonly CompactEffectLine[]): ItemVisualKind {
  if (item.synergyEffects?.length) return "synergy";
  if (item.buff) return "buff";
  if (item.conditionalPhysics?.length) return "conditional";
  return effectLines.length ? "direct" : "economy-only";
}

export function compactItemModel(item: ItemDefinition, context: ItemPresentationContext): CompactItemModel {
  const tier = context.tier ?? 1;
  const effective = applyTierBonus(item, tier);
  const effectLines = authoredLines(effective);
  const implementationState = effectLines.length === 0 ? "economy-only" : "implemented";
  const completeLines = implementationState === "economy-only"
    ? [{ id: "no-effect", direction: "neutral" as const, directionLabel: "No race effect" as const, statLabel: "Economy only", valueLabel: "No implemented contest effect" }]
    : effectLines;
  const priceVisible = context.priceVisible === true;
  const affordability = !priceVisible || context.credits === undefined
    ? "not-applicable"
    : item.price <= context.credits ? "affordable" : "unaffordable";
  const conditionTokens = completeLines.flatMap((line) => line.conditionLabel ? [line.conditionLabel] : []);
  const summary = completeLines.map((line) => `${line.directionLabel}: ${line.statLabel} ${line.valueLabel}${line.conditionLabel ? ` ${line.conditionLabel}` : ""}`);
  const priceLabel = priceVisible ? `${item.price} cr` : null;
  return {
    itemId: item.id,
    name: item.name,
    tierLabel: tier > 1 ? `★${tier}` : null,
    categoryLabel: item.installationCategory.toUpperCase() as "POWER" | "CHASSIS",
    originLabel: ORIGIN_LABELS[item.origin],
    visualKind: visualKind(item, effectLines),
    effectLines: completeLines,
    conditionTokens,
    stateBadges: context.installation ? [{ id: "installation", label: context.installation.stateLabel, state: context.installation.storageActivity === "inert" ? "inactive" : "active" }] : [],
    priceLabel,
    affordability,
    implementationState,
    accessibilityLabel: [item.name, `tier ${tier}`, ORIGIN_LABELS[item.origin], item.installationCategory, ...summary, priceLabel].filter(Boolean).join(". "),
  };
}

function inspectorLine(line: CompactEffectLine, authored: CompactEffectLine | undefined): InspectorEffectLine {
  return {
    ...line,
    authoredValueLabel: authored?.valueLabel ?? line.valueLabel,
    effectiveValueLabel: line.valueLabel,
    sourceKind: line.id.startsWith("conditional") ? "conditional"
      : line.id === "buff" ? "buff" : line.id.startsWith("synergy") ? "synergy"
        : line.id === "time" ? "base" : "physics",
    cadenceLabel: line.conditionLabel?.startsWith("EVERY") ? line.conditionLabel : undefined,
    fullConditionLabel: line.conditionLabel?.startsWith("WHEN") ? line.conditionLabel : undefined,
  };
}

export function itemInspectorModel(item: ItemDefinition, context: ItemPresentationContext): ItemInspectorModel {
  const tier = context.tier ?? 1;
  const authored = compactItemModel(item, { ...context, tier: 1 });
  const current = compactItemModel(item, { ...context, tier });
  const rules: InspectorRule[] = [];
  current.effectLines.forEach((line) => {
    if (!line.conditionLabel) return;
    const token = line.conditionLabel.split(" ")[0];
    const prefix: InspectorRule["prefix"] = token === "ALWAYS" ? "EVERY" : token as InspectorRule["prefix"];
    rules.push({ id: `rule-${line.id}`, prefix, text: line.conditionLabel, state: line.conditionLabel.startsWith("WHEN") ? "conditional" : "authored" });
  });
  if (item.activeWhileStored) rules.push({ id: "storage", prefix: "WHILE", text: "Active while stored", state: "authored" });
  const priceLabel = context.priceVisible ? `${item.price} credits` : null;
  const affordabilityLabel = context.credits === undefined || !context.priceVisible ? null : item.price <= context.credits ? "Affordable" : "Unaffordable";
  const model: ItemInspectorModel = {
    identity: {
      itemId: item.id,
      name: item.name,
      originLabel: ORIGIN_LABELS[item.origin],
      categoryLabel: item.installationCategory.toUpperCase(),
      tier,
      tierLabel: `Tier ${tier}`,
      priceLabel,
      affordabilityLabel,
      synergyTags: item.synergyTags,
    },
    effects: current.effectLines.map((line) => inspectorLine(line, authored.effectLines.find((candidate) => candidate.id === line.id))),
    rules,
    placement: context.installation,
    relationships: [...(context.relationshipEvidence ?? [])],
    resolved: context.lapEvidence,
    accessibilityLabel: [
      current.accessibilityLabel,
      item.activeWhileStored ? "Active while stored" : "Inert while stored",
      ...rules.map((rule) => `${rule.prefix}: ${rule.text}`),
      context.installation?.stateLabel,
      context.lapEvidence?.inactiveReason,
    ].filter(Boolean).join(". "),
  };
  return model;
}

export interface ItemSelectionState {
  selectedItemId: string | null;
  hoverPreviewItemId: string | null;
  focusedItemId: string | null;
  placementDestinationKey: string | null;
  inspectedLap: number | null;
}

export function inspectedItemId(state: ItemSelectionState): string | null {
  return state.hoverPreviewItemId ?? state.focusedItemId ?? state.selectedItemId;
}

export function createItemSelectionState(): ItemSelectionState {
  return { selectedItemId: null, hoverPreviewItemId: null, focusedItemId: null, placementDestinationKey: null, inspectedLap: null };
}

export function reduceItemSelection(
  state: ItemSelectionState,
  action:
    | { type: "select" | "hover" | "focus"; itemId: string | null }
    | { type: "destination"; key: string | null }
    | { type: "lap"; lap: number | null }
    | { type: "reconcile"; availableItemIds: readonly string[] }
    | { type: "dismiss" },
): ItemSelectionState {
  if (action.type === "dismiss") return createItemSelectionState();
  if (action.type === "select") return { ...state, selectedItemId: action.itemId };
  if (action.type === "hover") return { ...state, hoverPreviewItemId: action.itemId };
  if (action.type === "focus") return { ...state, focusedItemId: action.itemId };
  if (action.type === "destination") return { ...state, placementDestinationKey: action.key };
  if (action.type === "lap") return { ...state, inspectedLap: action.lap };
  if (action.type !== "reconcile") return state;
  const available = new Set(action.availableItemIds);
  return {
    ...state,
    selectedItemId: state.selectedItemId && available.has(state.selectedItemId) ? state.selectedItemId : null,
    hoverPreviewItemId: state.hoverPreviewItemId && available.has(state.hoverPreviewItemId) ? state.hoverPreviewItemId : null,
    focusedItemId: state.focusedItemId && available.has(state.focusedItemId) ? state.focusedItemId : null,
  };
}

export type RecordedItemEvidence =
  | { kind: "legacy-time"; evidence: ContributionEvidence }
  | { kind: "physical"; evidence: ItemPhysicalContributionEvidence }
  | { kind: "physical-not-evaluated"; reason: string };

export function unresolvedPhysicalEvidence(item: ItemDefinition, lap: number, tier: 1 | 2 | 3): ItemLapEvidence {
  return {
    lap,
    installationLabel: "Not evaluated",
    tier,
    active: false,
    fired: false,
    cooldownLabel: item.cooldown ? `Every ${item.cooldown} laps` : "Not evaluated",
    contributionLines: [],
    inactiveReason: "Not evaluated in this Test Day",
    evidenceAvailability: "not-evaluated",
  };
}

function contributionDeltaLines(
  itemId: string,
  delta: ItemPhysicsContribution,
  condition?: string,
  matched = true,
): ResolvedContributionLine[] {
  return DELTA_FIELDS.flatMap(([stat, field]) => {
    const value = delta[field];
    if (value === undefined || value === 0) return [];
    const formatted = formatStatDelta(stat, value);
    return [{
      statLabel: statDefinition(stat).label,
      authoredValueLabel: formatted.valueLabel,
      effectiveValueLabel: formatted.valueLabel,
      conditionLabel: condition,
      conditionState: condition ? (matched ? "matched" : "unmatched") : undefined,
      sourceItemId: itemId,
    }];
  });
}

export function resolvedItemEvidence(
  item: ItemDefinition,
  recorded: RecordedItemEvidence,
): ItemLapEvidence {
  if (recorded.kind === "physical-not-evaluated") {
    return { ...unresolvedPhysicalEvidence(item, 1, 1), inactiveReason: recorded.reason };
  }
  if (recorded.kind === "legacy-time") {
    const evidence = recorded.evidence;
    const formatted = formatStatDelta("time", evidence.resultingContribution);
    return {
      lap: evidence.lap,
      installationLabel: evidence.installation?.state ?? (evidence.sourceLocation.area === "storage" ? "Stored" : "Flexible"),
      tier: 1,
      active: evidence.triggerState === "fired",
      fired: evidence.triggerState === "fired",
      cooldownLabel: item.cooldown ? `Every ${item.cooldown} laps` : "Every lap",
      contributionLines: evidence.triggerState === "fired" ? [{
        statLabel: "Lap Time", authoredValueLabel: formatStatDelta("time", evidence.baseContribution).valueLabel,
        effectiveValueLabel: formatted.valueLabel, sourceItemId: item.id,
      }] : [],
      inactiveReason: evidence.triggerState === "fired" ? undefined : evidence.reason ?? evidence.triggerState,
      evidenceAvailability: "available",
    };
  }
  const evidence = recorded.evidence;
  const conditionalLines = evidence.conditionalResolvedDeltas.flatMap((entry) =>
    contributionDeltaLines(item.id, entry.delta, conditionLabel(entry.condition), entry.matchedSegmentIndexes.length > 0));
  const flatLines = contributionDeltaLines(item.id, evidence.flatResolvedDelta);
  const relationshipLines: ResolvedContributionLine[] = [
    ...evidence.buffApplications.map((application) => ({
      statLabel: `Buff · ${statDefinition(application.targetStat).label}`,
      authoredValueLabel: `${application.appliedPercent >= 0 ? "+" : ""}${application.appliedPercent}%`,
      effectiveValueLabel: application.targetStat === "time"
        ? formatStatDelta("time", application.appliedSeconds).valueLabel
        : formatStatDelta(application.targetStat, application.appliedStatDelta ?? 0).valueLabel,
      sourceItemId: application.sourceItemId,
    })),
    ...evidence.synergyApplications.map((application) => ({
      statLabel: `Synergy · ${statDefinition(application.targetStat).label}`,
      authoredValueLabel: `${application.appliedPercent >= 0 ? "+" : ""}${application.appliedPercent}%`,
      effectiveValueLabel: `${application.appliedPercent >= 0 ? "+" : ""}${application.appliedPercent}%`,
      sourceItemId: item.id,
    })),
  ];
  const matchedAnyConditional = evidence.conditionalResolvedDeltas.some((entry) => entry.matchedSegmentIndexes.length > 0);
  return {
    lap: evidence.lap,
    installationLabel: evidence.installationState ?? (evidence.sourceLocation.area === "storage" ? "Stored" : "Flexible"),
    tier: evidence.tier,
    active: evidence.active,
    fired: evidence.active && (flatLines.length > 0 || matchedAnyConditional || relationshipLines.length > 0),
    cooldownLabel: item.cooldown ? `Every ${item.cooldown} laps` : "Every lap",
    contributionLines: [...flatLines, ...conditionalLines, ...relationshipLines],
    inactiveReason: evidence.inactiveReason ?? (!matchedAnyConditional && conditionalLines.length > 0 && flatLines.length === 0 ? "Condition not met on this lap" : undefined),
    evidenceAvailability: "available",
  };
}

export interface ItemLayoutRegion { id: string; x: number; y: number; width: number; height: number; textPx: number }
export interface ItemLayoutModel { mode: "wide" | "logical" | "portrait"; regions: ItemLayoutRegion[]; totalHeight: number; horizontalOverflow: boolean }

export function buildItemLayout(viewport: { width: number; height: number }, effectLineCount: number): ItemLayoutModel {
  const margin = 16;
  const gap = 8;
  const portrait = viewport.width < viewport.height;
  const wide = viewport.width >= 1024;
  const mode = portrait ? "portrait" : wide ? "wide" : "logical";
  const contentWidth = Math.max(0, viewport.width - margin * 2);
  const cardHeight = Math.max(84, 42 + effectLineCount * 14);
  const inspectorHeight = Math.max(132, 58 + effectLineCount * 16);
  const regions: ItemLayoutRegion[] = mode === "wide"
    ? [
      { id: "cards", x: margin, y: margin, width: Math.floor(contentWidth * 0.58), height: cardHeight, textPx: 10 },
      { id: "inspector", x: margin + Math.floor(contentWidth * 0.58) + gap, y: margin, width: contentWidth - Math.floor(contentWidth * 0.58) - gap, height: inspectorHeight, textPx: 11 },
    ]
    : [
      { id: "cards", x: margin, y: margin, width: contentWidth, height: cardHeight, textPx: 10 },
      { id: "inspector", x: margin, y: margin + cardHeight + gap, width: contentWidth, height: inspectorHeight, textPx: 11 },
    ];
  const totalHeight = Math.max(...regions.map((region) => region.y + region.height)) + margin;
  return { mode, regions, totalHeight, horizontalOverflow: regions.some((region) => region.x < 0 || region.x + region.width > viewport.width) };
}

export function conditionMatchesForItem(
  contributions: readonly ConditionalPhysicsContribution[],
  itemId: string,
): readonly ConditionalPhysicsContribution[] {
  return contributions.filter((entry) => entry.sourceItemId === itemId);
}
