# Data Model: Item Adjacency Buffs

## Authored adjacency clause

```ts
export interface AdjacencyClause {
  id: string;
  target: SynergyTarget;
  stat: PhysicalStatTarget;
  canonicalPoints: number;
  description: string;
}

export interface ItemDefinition {
  // existing fields unchanged
  adjacencyEffects?: readonly AdjacencyClause[];
}
```

Invariants:

- `id` is non-empty and unique within the source item.
- `target.kind` is only `"category"` or `"tag"`; matching uses the same
  semantics as `matchesTarget`.
- `stat` is one of acceleration, top speed, braking, or cornering; `time` is
  invalid.
- `canonicalPoints` is finite and non-zero. Positive and negative authored
  effects are supported even though the initial four clauses are positive.
- `description` is authored player-facing copy and is never parsed for math.
- Absence and an empty list both mean no adjacency behavior.

## Adjacency graph

```ts
export type AdjacencyRulesVersion = "adjacency-linear-v1";

export interface AdjacencyEdge {
  leftSlotId: string;
  rightSlotId: string;
}

export interface AdjacencyGraph {
  rulesVersion: AdjacencyRulesVersion;
  vehicleId: VehicleId;
  orderedSlotIds: readonly string[];
  edges: readonly AdjacencyEdge[];
}
```

`orderedSlotIds` comes from `VehicleDefinition.slots`, never from rendered
coordinates or runtime build array order. For four launch slots the graph has
three edges. Neighbor lookup is symmetric.

Validation fails when the vehicle is unknown, authored slot IDs are duplicated,
the build is missing/duplicating an authored slot, a build slot type disagrees
with the vehicle definition, or an extra installed slot is supplied.

## Directed link evaluation

```ts
export type AdjacencyLinkState =
  | "active"
  | "empty-target"
  | "predicate-mismatch";

export interface AdjacencyLinkEvaluation {
  sourceSlotId: string;
  sourceInstanceId?: string;
  sourceItemId: string;
  targetSlotId: string;
  targetInstanceId?: string;
  targetItemId?: string;
  clauseId: string;
  targetPredicate: SynergyTarget;
  stat: PhysicalStatTarget;
  authoredCanonicalPoints: number;
  sourceTier: 1 | 2 | 3;
  resolvedCanonicalPoints: number;
  state: AdjacencyLinkState;
  explanation: string;
}
```

There is one directed evaluation per source clause per immediate neighbor,
including empty or mismatched neighbors. This supplies truthful inactive-state
presentation without reconstructing reasons in a scene.

## Active contribution

```ts
export interface AdjacencyContribution {
  sourceSlotId: string;
  sourceInstanceId?: string;
  sourceItemId: string;
  targetSlotId: string;
  targetInstanceId?: string;
  targetItemId: string;
  clauseId: string;
  stat: PhysicalStatTarget;
  sourceTier: 1 | 2 | 3;
  authoredCanonicalPoints: number;
  appliedCanonicalPoints: number;
}

export type AdjacencyTotalsBySlot = ReadonlyMap<
  string,
  Partial<Record<PhysicalStatTarget, number>>
>;
```

An active link produces exactly one contribution. Contributions add by target
slot and stat. The target receives the points for ledger/evidence purposes, but
those points never modify its authored definition or outgoing clauses.

## Complete resolution and validation

```ts
export interface AdjacencyResolution {
  rulesVersion: AdjacencyRulesVersion;
  graph: AdjacencyGraph;
  links: readonly AdjacencyLinkEvaluation[];
  contributions: readonly AdjacencyContribution[];
  totalsByTargetSlot: AdjacencyTotalsBySlot;
}

export type AdjacencyValidationFailureCode =
  | "unknown-rules-version"
  | "unknown-vehicle"
  | "invalid-topology"
  | "unknown-clause-kind"
  | "invalid-predicate"
  | "invalid-stat"
  | "non-finite-magnitude"
  | "evidence-mismatch";
```

The resolver returns either a valid resolution or a typed failure. It never
partially resolves a malformed build or clause. Serialized validation
recomputes the graph and totals and rejects mismatches.

## Placement preview delta

```ts
export type AdjacencyPreviewChangeKind =
  | "newly-active"
  | "broken"
  | "changed"
  | "unchanged-active";

export interface AdjacencyPreviewChange {
  key: string; // source slot + clause ID + target slot
  kind: AdjacencyPreviewChangeKind;
  before?: AdjacencyLinkEvaluation;
  after?: AdjacencyLinkEvaluation;
}

export interface AdjacencyPreview {
  before: AdjacencyResolution;
  after: AdjacencyResolution;
  changes: readonly AdjacencyPreviewChange[];
}
```

Preview uses a projected result of the same garage command. It must not mutate
the live build, consume an offer, change credits, or allocate a new persistent
item identity. Preview and successful commit of the same command must produce
deep-equal `after` resolutions.

## Contest evidence integration

`ItemPhysicalContributionEvidence` gains:

```ts
adjacencyApplications?: readonly AdjacencyContribution[];
```

The applications are attached to the target item's evidence because that item
receives the flat stat points. Locked build/result evidence retains
`rulesVersion`, graph, and the complete contribution set once per build/result;
lap records may reference/copy the relevant target applications for existing
inspector consumption. Playback scenes read this evidence and never call the
resolver from live scene state.

## Composition order

1. Resolve stable item instance definitions and Workshop Modifications through
   the existing live-item projection.
2. Resolve source tier for the adjacency clause using the existing 15%-per-tier
   scale. Other source modifications do not change its points.
3. Resolve installation behavior and existing Synergy/Buff systems unchanged.
4. Add adjacency canonical points as a separate target-attributed ledger layer.
5. Convert the final canonical aggregate through the existing stat-normalizing
   boundary for physical simulation.
6. Apply pre-race setup through its existing locked authority; it cannot rewrite
   adjacency evidence.

No step feeds an adjacency-derived value back into steps 1–4.
