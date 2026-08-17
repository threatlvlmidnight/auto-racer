# Data Model: Item Pool Expansion and Loot

## Catalog additions

```ts
type ItemKind = "active" | "loot";

type Rarity = "standard" | "notable" | "rare";

interface LootCapability {
  readonly rulesVersion: 1;
  readonly stat: CanonicalPhysicalStat;
  readonly pointsByTier: readonly [1, 2, 3];
}

interface EconomyEffect {
  readonly trigger: "scored-win" | "item-sale" | "sponsor-success";
  readonly amountsByTier: readonly [number, number, number];
  readonly condition:
    | { readonly kind: "always" }
    | { readonly kind: "sold-item-tag"; readonly tag: string }
    | { readonly kind: "sold-item-developed" };
  readonly description: string;
}

interface LapWindowEffect {
  readonly window: "first-quarter" | "final-quarter";
  readonly points: Partial<CanonicalPhysicalStats>;
  readonly description: string;
}
```

`ItemDefinition` gains explicit `itemKind`, optional `loot`, optional typed
economy effects, optional lap-window effects, and the normalized installation
behavior needed by the frozen roster. Validators enforce that Loot has no
active capability fields or tags.

## Tag-role catalog

```ts
type TagRole = "build-family" | "bridge-utility" | "flavor-acquisition";

interface TagRoleDefinition {
  readonly tag: string;
  readonly role: TagRole;
  readonly label: string;
  readonly description: string;
}
```

Tag IDs remain unchanged. Presentation and audits read this catalog rather than
assuming every tag promises an archetype.

## Permanent Loot ledger

```ts
interface PermanentLootBonus {
  readonly rulesVersion: 1;
  readonly transactionId: string;
  readonly sourceDefinitionId: string;
  readonly sourceInstanceId: string;
  readonly targetInstanceId: string;
  readonly stat: CanonicalPhysicalStat;
  readonly points: 1 | 2 | 3;
  readonly appliedAtStage: number;
}

interface ItemInstance {
  // existing fields...
  readonly permanentLootBonuses: readonly PermanentLootBonus[];
}
```

Invariants:

- every entry target matches the containing instance;
- source instance and transaction IDs are unique within a run;
- all values are finite normalized points and rules version is known;
- sum per target/stat is at most 3;
- ledger entries are not tier-scaled or multiplied by any other layer;
- moving, storing, tiering, or modifying retains the ledger;
- removing/replacing an identity removes its ledger with it.

## Preview and command

```ts
type LootTargetFailure =
  | "source-not-loot"
  | "source-not-held"
  | "no-authored-contributor"
  | "all-targets-at-cap"
  | "invalid-tier"
  | "invalid-state";

interface LootConversionPreview {
  readonly rulesVersion: 1;
  readonly commandId: string;
  readonly stateFingerprint: string;
  readonly sourceInstanceId: string;
  readonly sourceDefinitionId: string;
  readonly sourceLocation: ItemLocation;
  readonly target?: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly location: ItemLocation;
    readonly stat: CanonicalPhysicalStat;
    readonly points: 1 | 2 | 3;
    readonly priorLootPoints: number;
    readonly resultingLootPoints: number;
  };
  readonly creditDelta: number;
  readonly economyContributions: readonly EconomyContribution[];
  readonly failure?: LootTargetFailure;
}

interface SellLootCommand {
  readonly rulesVersion: 1;
  readonly commandId: string;
  readonly stateFingerprint: string;
  readonly sourceInstanceId: string;
  readonly expectedTargetInstanceId: string;
}
```

The preview fingerprint includes held instance identities/locations/tiers,
target contribution eligibility and caps, credits, relevant economy effects,
stage, and current sale-Undo version.

## Receipt and Undo

```ts
interface LootSaleReceipt extends SaleReceipt {
  readonly kind: "loot-sale";
  readonly commandId: string;
  readonly bonus: PermanentLootBonus;
  readonly targetPriorLedger: readonly PermanentLootBonus[];
  readonly targetResultLedger: readonly PermanentLootBonus[];
}
```

`SaleUndoSnapshot` stores the discriminated normal or Loot receipt. Undo restores
the exact source location, target ledger, credits, transaction/history state,
and prior valid/invalid Undo boundary or performs no mutation.

## Offer models

```ts
interface WeightedCatalogEntry {
  readonly definition: ItemDefinition;
  readonly weight: 4 | 2 | 1;
}

interface NeutralOfferPolicy {
  readonly lootEligible: boolean;
  readonly visibleCount: 3;
  readonly maxLoot: 0 | 1;
  readonly lootLaneChance: 0 | 0.35;
}
```

Weighted selection is deterministic and without replacement. Exhaustion returns
a typed smaller offer rather than duplicating a definition.

## Catalog audit

```ts
interface CatalogAuditReport {
  readonly rulesVersion: 1;
  readonly baselineCount: 70;
  readonly activeExpansionCount: 8;
  readonly lootCount: 4;
  readonly definitions: readonly CatalogAuditEntry[];
  readonly tagRoles: readonly TagRoleDefinition[];
  readonly entrantCoverage: readonly EntrantCoverage[];
  readonly offerCorpus: OfferCorpusSummary;
  readonly balanceMatrix: BalanceMatrixSummary;
  readonly failures: readonly AuditFailure[];
}
```

The checked-in human ledger is `catalog-plan.md`; generated audit output is a
test/build artifact and must not include screenshots or generated images.
