# Data Model: Item Stat Presentation

All types in this document are derived presentation data except the explicitly
marked `ItemPhysicalContributionEvidence`, which extends authoritative output
without changing any resolved value.

## Shared vocabulary

```ts
type ItemStatKey =
  | "time"
  | "acceleration"
  | "topSpeed"
  | "brakingPower"
  | "corneringSpeed";

type EffectDirection = "gain" | "loss" | "neutral";
type EffectState = "authored" | "active" | "inactive" | "conditional";
type ItemVisualKind = "direct" | "buff" | "synergy" | "conditional" | "economy-only";

interface ItemStateBadge {
  id: string;
  label: string;
  state: "selected" | "focused" | "active" | "inactive" | "conditional" | "unsatisfied";
}

interface StatPresentationDefinition {
  key: ItemStatKey;
  label: string;
  compactLabel: string;
  unit: "s" | "speed" | "speed/s";
  lowerIsBetter: boolean;
  order: number;
}
```

The definition table is the single source used by feature 024 and exported for
feature 025. `time.lowerIsBetter` is true; all physical stats are false.

## Presentation context

```ts
type ItemViewSurface =
  | "reward-offer"
  | "supplier-offer"
  | "garage-slot"
  | "storage"
  | "placement-preview"
  | "race-lap"
  | "result"
  | "test-day-briefing"
  | "test-day-lap"
  | "test-day-result";

interface ItemPresentationContext {
  surface: ItemViewSurface;
  tier: 1 | 2 | 3;
  credits?: number;
  priceVisible: boolean;
  installation?: InstallationPresentation;
  relationshipEvidence?: readonly RelationshipEvidence[];
  lapEvidence?: ItemLapEvidence;
}
```

Every context is explicit. Absence means the fact is not authoritative on that
surface, not that it has a default value.

## Compact item model

```ts
interface CompactItemModel {
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
}

interface CompactEffectLine {
  id: string;
  direction: EffectDirection;
  directionLabel: "Gain" | "Loss" | "Rule" | "No race effect";
  statLabel: string;
  valueLabel: string;
  conditionLabel?: string;
}
```

Every physical/time tradeoff gets its own line. Buff/Synergy items receive rule
lines that include their target and magnitude. `economy-only` cannot use a gain
direction.

## Full inspector model

```ts
interface ItemInspectorModel {
  identity: ItemIdentitySection;
  effects: readonly InspectorEffectLine[];
  rules: readonly InspectorRule[];
  placement?: InstallationPresentation;
  relationships: readonly RelationshipEvidence[];
  resolved?: ItemLapEvidence;
  accessibilityLabel: string;
}

interface ItemIdentitySection {
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

interface InspectorEffectLine extends CompactEffectLine {
  authoredValueLabel: string;
  effectiveValueLabel: string;
  sourceKind: "base" | "physics" | "conditional" | "buff" | "synergy" | "installation";
  cadenceLabel?: string;
  fullConditionLabel?: string;
}

interface InspectorRule {
  id: string;
  prefix: "WHEN" | "PER" | "EVERY" | "WHILE" | "TARGET";
  text: string;
  state: EffectState;
}
```

Empty sections are omitted. Synergy tags and performed Synergy effects are
separate fields and labels.

## Installation and comparison

```ts
interface InstallationPresentation {
  state: "fitted" | "flexible" | "improvised" | "stored";
  stateLabel: "Fitted" | "Flexible" | "Improvised" | "Stored";
  activeBehavior: readonly InspectorEffectLine[];
  inactiveBehavior: readonly InspectorEffectLine[];
  gainedLabels: readonly string[];
  lostLabels: readonly string[];
  storageActivity: "active" | "inert" | "not-applicable";
}

interface PlacementComparisonModel {
  incoming: ItemInspectorModel;
  outgoing: ItemInspectorModel | null;
  destinationLabel: string;
  disposition: "place" | "move" | "swap" | "replace" | "evict" | "no-op";
  valid: boolean;
  reasonLabel: string | null;
}

interface PlacementPresentationContext {
  preview: PlacementPreview;
  incomingItem: ItemDefinition;
  outgoingItem: ItemDefinition | null;
  incomingContext: ItemPresentationContext;
  outgoingContext?: ItemPresentationContext;
}
```

The comparison adapts an existing authoritative garage preview. It never
determines legality itself.

## Relationship evidence

```ts
interface RelationshipEvidence {
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
```

`kind: "tag"` represents a tag carried by the item; it never implies the item
performs a Synergy effect.

## Authoritative physical contribution evidence

This shape is emitted by resolution in `src/simulation/types.ts`; unlike the
other models in this document, it is authoritative evidence rather than derived
presentation state.

```ts
interface ItemPhysicalContributionEvidence {
  lap: number;
  sourceItemId: string;
  sourceLocation: { area: "board" | "storage"; index: number };
  slotId?: string;
  tier: 1 | 2 | 3;
  installationState?: InstallationState;
  active: boolean;
  flatResolvedDelta: ItemPhysicsContribution;
  conditionalResolvedDeltas: readonly {
    condition: PhysicsCondition;
    delta: ItemPhysicsContribution;
    matchedSegmentIndexes: readonly number[];
  }[];
  buffApplications: readonly BuffApplication[];
  synergyApplications: readonly SynergyApplication[];
  inactiveReason?: string;
}

type RecordedItemEvidence =
  | { kind: "legacy-time"; evidence: ContributionEvidence }
  | { kind: "physical"; evidence: ItemPhysicalContributionEvidence }
  | { kind: "physical-not-evaluated"; reason: string };
```

`flatResolvedDelta` and every conditional `delta` are the item's effective
values after tier, installation, Synergy, and lap-specific Buff scaling. Match
indexes report where a conditional value actually entered physics. Adding this
array to `PlayerLap.physics` cannot change `stats`, phases, or lap time.

## Lap-resolved presentation evidence

```ts
interface ItemLapEvidence {
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

interface ResolvedContributionLine {
  statLabel: string;
  authoredValueLabel: string;
  effectiveValueLabel: string;
  conditionLabel?: string;
  conditionState?: "matched" | "unmatched";
  sourceItemId: string;
}
```

This is adapted only from `RecordedItemEvidence`. Zero contribution is retained
with an explicit reason. Test Day's legacy path uses `not-evaluated` for
track-aware physical effects rather than manufacturing a physical entry.

## Selection state

```ts
interface ItemSelectionState {
  selectedItemId: string | null;
  hoverPreviewItemId: string | null;
  focusedItemId: string | null;
  placementDestinationKey: string | null;
  inspectedLap: number | null;
}
```

Inspector priority is hover preview, then keyboard focus preview when explicitly
requested, then persistent selection. Clearing transient state restores the
persistent selection. No field in this state commits a build change.

## Invariants

1. Every consequential typed item field maps to at least one compact or
   inspector line.
2. A penalty cannot be merged into or visually subordinate to its paired gain.
3. Tier-adjusted values are derived from the same effective item used by
   authoritative systems; tier-one values remain labeled as authored/base.
4. Placement models adapt garage preview results; lap models adapt recorded lap
   evidence. Presentation never simulates either.
5. Selected item identity is stored, formatted output is not; models are rebuilt
   after authoritative state changes.
6. `direction` is computed using stat semantics, so a negative time delta is a
   gain while a negative physical-stat delta is a loss.
7. Summing the flat resolved physical evidence onto the stock baseline
   reconciles with the recorded lap-level aggregate stats under the same minimum
   rules; conditional evidence separately reconciles with the segment/phase
   matches where it applied. Evidence generation cannot alter either result.
