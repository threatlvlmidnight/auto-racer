# Research: Item Adjacency Buffs

## Decision 1: Add a distinct adjacency clause and resolver

**Decision**: Add optional `adjacencyEffects` to `ItemDefinition` and resolve it
in a new framework-free `src/simulation/adjacency.ts` module. Do not extend or
reinterpret `buff` or `synergyEffects`.

**Rationale**: Buffs are held-item/lap-aware percentage amplifiers and Synergy
effects are build-wide percentage amplifiers. Adjacency is a stable
source-slot-to-neighbor relationship that grants flat normalized stat points.
Keeping it separate prevents existing amplifiers from multiplying it and makes
the source, target, graph edge, and exact contribution first-class evidence.

**Alternatives considered**:

- Add an `adjacent` condition to `SynergyEffect`: rejected because the existing
  resolver deliberately searches all installed items and applies percentages.
- Treat adjacency as presentation metadata: rejected because it changes contest
  outcomes and must be simulation authority.

## Decision 2: Derive a linear graph from the authored vehicle definition

**Decision**: `adjacency-linear-v1` connects consecutive stable slot IDs in
`VehicleDefinition.slots`. The resolver looks up build occupancy by slot ID; it
does not trust `VehicleBuild.slots` array order. Each undirected edge is retained
once, while directed source-to-target link evaluations are retained separately.

**Rationale**: This implements Q1A while preserving determinism if serialized
build slots arrive in a different order. Four slots produce three edges and a
maximum node degree of two, naturally bounding stacking.

**Alternatives considered**:

- Use current `build.slots` order: rejected because runtime/serialized order is
  not topology authority.
- Add coordinates or per-vehicle edge authoring: rejected for V1 because they
  add authoring and UI complexity without improving the first playable slice.

## Decision 3: Reuse the closed category/tag predicate vocabulary

**Decision**: `AdjacencyClause.target` reuses `SynergyTarget`, whose only V1
variants are installation category and synergy tag. One clause has one target
predicate and applies once to each qualifying immediate neighbor.

**Rationale**: Reuse guarantees category/tag semantics do not drift between
mechanics and gives content validation an already-known closed vocabulary.
Rarity, item ID, origin, active/passive state, and installation state are not
valid V1 predicates.

## Decision 4: Grant flat canonical physical-stat points to the target

**Decision**: A clause names one of the four physical stats and a finite signed
`canonicalPoints` magnitude. Each qualifying target receives that flat amount
as its own separately evidenced contribution to the vehicle aggregate. Time is
not a valid adjacency stat.

**Rationale**: Feature 034 normalized the four physical stats so one point of
top speed is comparable to one point of braking, acceleration, or cornering.
Using canonical points makes “+1” truthful across stats and avoids coupling
adjacency to the very different units in `ItemPhysicsContribution`.

**Alternatives considered**:

- Percentage-scale the target's existing effect: rejected because targets with
  no existing delta would receive nothing and existing amplifiers could form
  opaque multiplier chains.
- Allow time modifiers: rejected from V1 because seconds have no common point
  scale with physical stats.

## Decision 5: Resolve additively from one immutable snapshot

**Decision**: Evaluate every source clause against the original occupied graph,
then sum qualifying contributions by target slot and stat. An adjacency-derived
point never changes target eligibility or the magnitude of an outgoing clause.
Results are emitted in canonical source-slot, clause, target-slot order.

**Rationale**: Q3A requires every eligible source to matter while prohibiting
recursive propagation. The maximum two inbound neighbors supplies the bound;
no additional global cap or partial contribution is needed.

## Decision 6: Only source tier scales an adjacency magnitude

**Decision**: Use the existing `TIER_BONUS_PERCENT` formula on a source clause's
authored points: tier 1 = 100%, tier 2 = 115%, tier 3 = 130%. The resolver reads
the source slot's tier. Buffs, Synergy percentages, Fitted/Improvised behavior,
Workshop Modifications, Scrutineering, and setup controls do not alter this
number.

**Rationale**: This is Q4A and preserves the existing duplicate-upgrade reward
without exposing adjacency to multiplier chains. Extending `applyTierBonus` to
clone/scale `adjacencyEffects` keeps tier math centralized; the adjacency
resolver still owns relationship evaluation.

## Decision 7: Retain one versioned resolution through preview and contest use

**Decision**: `resolveAdjacency(build)` returns a versioned immutable-compatible
resolution containing graph edges, every active/inactive directed link,
contributions, and per-target totals. Garage preview compares before/after
resolutions on a projected build. Contest/Test Day consume the resolution from
their locked build snapshot and copy contribution evidence into result records;
playback never resolves from scene state.

**Rationale**: One pure authority can serve preparation, Test Day, scored race,
Results, and future async transport. A `validateAdjacencyResolution` boundary
rejects unknown versions or malformed/non-finite evidence instead of guessing.

**Scope note**: Feature 038 owns transporting this evidence between remote
players. Feature 041 provides the version and validator but does not create a
network or persistence system.

## Decision 8: Use code-native presentation, not generated assets

**Decision**: Extend existing item inspectors and placement comparison models
with text rows, slot-edge/link state, and gained/broken/unchanged badges. Any
connector line or icon is code-native. No raster art, image generation, asset
cropping, or new art manifest is part of Feature 041.

**Rationale**: The mechanic must be assessable before the item art pass, and the
coding handoff is intentionally restricted to code and automated tests. Final
qualitative visual acceptance remains a frontier-model/owner task.

## Decision 9: Retrofit four existing items for the playable slice

**Decision**: Add one clause to each of these existing definitions:

| Origin | Source item | Predicate | Granted stat |
|---|---|---|---|
| Coachworks | Brass-Fitted Toolbox | adjacent Chassis item | Braking |
| Velodrome | Chain Tensioner | adjacent `gearing` item | Acceleration |
| Fieldworks | Interchangeable Test Mounts | adjacent Power item | Top Speed |
| Backroads | Sealed Instrument Case | adjacent `information` item | Cornering |

Each clause starts at `+1` canonical point at tier 1. Exact copy must state the
neighbor rule and stat. Feature 042 may rebalance or expand the catalog after it
audits the full item pool.

**Rationale**: This covers both allowed predicate kinds and all four physical
stats while limiting content churn to the four-owner-approved representative
items. Synthetic fixtures cover mutual, competing, and maximum-density graphs.
