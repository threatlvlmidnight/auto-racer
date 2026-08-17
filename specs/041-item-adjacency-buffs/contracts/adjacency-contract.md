# Item Adjacency Contract

This contract defines the framework-free boundary shared by authored content,
garage preview, build/stat resolution, Test Day, scored contests, Results, and
future async transport. Exact helper names may follow repository conventions;
the inputs, outputs, ordering, and invariants below are binding.

## 1. Authored content

```ts
interface AdjacencyClause {
  id: string;
  target: SynergyTarget; // category or tag only
  stat: PhysicalStatTarget;
  canonicalPoints: number;
  description: string;
}

interface ItemDefinition {
  adjacencyEffects?: readonly AdjacencyClause[];
}
```

- A source clause evaluates each immediate neighbor independently.
- A target matching both category and tag still receives a particular clause
  only once because each clause has exactly one predicate.
- Unknown predicate kinds, `time`, duplicate clause IDs, empty IDs/copy, zero,
  `NaN`, and infinities fail content validation.
- Existing definitions without this field behave identically to the current
  build.

## 2. Graph authority

```ts
function adjacencyGraphFor(build: VehicleBuild):
  | { kind: "valid"; graph: AdjacencyGraph }
  | { kind: "invalid"; code: AdjacencyValidationFailureCode };
```

- Read ordered slot IDs from `vehicleById(build.vehicleId).slots`.
- Connect indexes `(0,1)`, `(1,2)`, and `(2,3)` for the four-slot launch
  topology. General code may support another positive count, but V1 content and
  UI are accepted against four slots.
- Resolve build occupancy by stable slot ID. Reordering `build.slots` without
  changing slot IDs/content cannot change the graph or result.
- Storage, DOM/Phaser coordinates, `presentationAnchor`, card order, and drag
  history are forbidden graph inputs.
- Missing, extra, duplicate, or type-mismatched build slots produce a typed
  invalid-topology result; no partial graph is returned.

## 3. Deterministic resolution

```ts
function resolveAdjacency(build: VehicleBuild):
  | { kind: "resolved"; resolution: AdjacencyResolution }
  | { kind: "invalid"; code: AdjacencyValidationFailureCode };
```

- Read all predicates and source magnitudes from the same pre-adjacency build.
- Scale only by source tier using `TIER_BONUS_PERCENT`; do not consult or apply
  Buff/Synergy percentages, installation state, modification effects,
  Scrutineering percentage, setup selections, lap number, or track state.
- Emit an active/inactive directed link for every clause-neighbor pair.
- Emit one contribution for each active link and sum all active contributions
  additively by target slot/stat.
- A target has no more than two neighboring source slots under
  `adjacency-linear-v1`; do not apply an additional strongest-only or global
  cap.
- Never recurse, iterate to a fixed point, or use resolved target totals as an
  outgoing source magnitude or predicate input.
- Output ordering is vehicle source-slot order, source authored clause order
  (with clause ID as deterministic validation/tie evidence), then vehicle
  target-slot order. Map/object insertion order cannot change semantic output.
- The input build and shared item definitions remain unmodified.

## 4. Canonical-stat integration

```ts
function adjacencyPointsForTarget(
  resolution: AdjacencyResolution,
  slotId: string,
): Partial<Record<PhysicalStatTarget, number>>;
```

- Each total is a flat normalized canonical-point layer attributed to the
  target item.
- Add the layer exactly once before canonical-to-physical conversion.
- Do not percentage-scale the target's existing item fields and do not make the
  adjacency layer eligible for existing Buff or Synergy amplifiers.
- The same build resolution must feed current-build stats, pre-race projection,
  Test Day, and scored contest simulation.
- A build with no authored adjacency clauses must retain deep-equal resolved
  stats, lap evidence, and contest results, apart from an optional absent/empty
  versioned adjacency evidence field.

## 5. Garage preview

```ts
function previewAdjacencyForGarageCommand(
  context: GarageContext,
  command: GarageCommand,
):
  | { kind: "available"; preview: AdjacencyPreview }
  | { kind: "unavailable"; code: GarageFailureCode | AdjacencyValidationFailureCode };
```

- Reuse the existing garage command validation and displacement/swap semantics.
- A confirmation-pending legal replacement may be projected for explanation,
  but preview must not bypass confirmation during commit.
- Preview cannot mutate the build, offers, credits, identities, tiers, or
  modifications.
- Link identity is `sourceSlotId + clauseId + targetSlotId`. Diff that identity
  into newly active, broken, changed, and unchanged-active states.
- After a successful commit, resolving the committed build must deep-equal the
  preview's `after` resolution.
- Moving one item may only change directed links incident to the source and
  destination slots or their immediate neighbors; unrelated link keys remain
  unchanged.

## 6. Presentation projection

- Static item inspection always states the clause target, neighbor rule, stat,
  and tier-1 magnitude, even when the item is offered or stored.
- Installed inspection identifies the source slot, each immediate target slot,
  active/inactive state, target item when present, and tier-resolved magnitude.
- Placement comparison states every newly active, broken, changed, and retained
  active link plus before/after aggregate deltas.
- Active state cannot depend on color alone. Text and persistent selected-item
  inspection must carry the entire meaning; hover may enhance but cannot be the
  only access path.
- Pointer, keyboard, and touch paths consume the same presentation model.
- Connector lines/badges are code-native and optional presentation. No raster
  asset creation is required by this feature.

## 7. Lock, evidence, and playback

- Contest and Test Day lock from the immutable build snapshot and retain the
  rules version, graph, contributions, and totals used by simulation.
- Relevant `AdjacencyContribution` entries attach to the target item's physical
  contribution evidence so existing inspector flows can reconcile the exact
  point delta.
- Playback/Results may format retained evidence but cannot call adjacency
  resolution using mutable scene state.
- Playback speed, pause, skip, and reduced motion cannot change adjacency
  selection, totals, or results.
- Test Day and scored-race resolution for identical build/setup/track inputs
  must retain deep-equal adjacency evidence.

## 8. Version validation and future async compatibility

```ts
function validateAdjacencyResolution(
  build: VehicleBuild,
  candidate: unknown,
): { kind: "valid"; resolution: AdjacencyResolution }
 | { kind: "invalid"; code: AdjacencyValidationFailureCode };
```

- Accept only `adjacency-linear-v1`.
- Recompute graph, directed links, contributions, and totals from the supplied
  build and compare semantic values; never trust claimed totals alone.
- Reject unknown versions, malformed predicates/stats, non-finite values,
  missing evidence, duplicate link identities, and mismatches.
- Do not infer legacy adjacency from coordinates or array order. Payloads that
  claim adjacency but cannot validate fail explicitly.
- Feature 038 may embed this contract in a remote ghost schema; Feature 041 does
  not add transport.

## 9. Initial content slice

The implementation adds exactly the four clauses selected in `research.md`
Decision 9 at `+1` canonical point for tier 1. Automated catalog coverage must
assert one source per origin, both predicate kinds, all four physical stats,
unique clause IDs, finite values, and player-readable copy.

## 10. Coding and manual verification boundary

- `[CODE-DEEPSEEK]` owns TypeScript, content data, automated tests, lint,
  type-check, and production build verification.
- DeepSeek must not take screenshots, compare rendered images, judge visual
  polish, listen to audio, or close qualitative acceptance.
- `[MANUAL-FRONTIER-OR-OWNER]` owns the final browser pass for overlap,
  readability, no-hover behavior, and dense-build clarity.
