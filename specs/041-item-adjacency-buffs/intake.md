# Feature 041 Intake: Item Adjacency Buffs

**Created**: 2026-08-16

**Status**: Planning cycle complete — implementation-ready on 2026-08-17;
coding not started.

## Problem

Installed-item placement currently matters primarily through slot eligibility
and the item's own effects. Add adjacency-based effects so some items reward
intentional spatial arrangements—for example, an item that grants `+1 Power`
to adjacent Power units—creating another readable layer of build construction
without making resolution order-dependent or opaque.

## Intended scope

- Introduce item effects that inspect neighboring installed slots and grant a
  deterministic buff to qualifying adjacent items, the hosting vehicle, or the
  source item according to authored rules.
- Support tag- or family-targeted examples such as “Adjacent Power units gain
  +1 Power,” while keeping the data model extensible for other attributes and
  carefully bounded adjacency patterns.
- Define one canonical adjacency graph from the vehicle's retained slot
  topology; presentation and simulation must use the same neighbor data.
- Resolve all adjacency effects from a stable build snapshot so item iteration
  order, drag order, scene history, or object identity cannot change the result.
- Present valid neighbors, active links, affected items, individual
  contributions, totals, and broken links during placement and inspection.
- Recompute previews immediately when an item is installed, moved, upgraded,
  replaced, or removed, without committing invalid inventory mutations.
- Include deterministic fixtures for empty slots, incompatible neighbors,
  multiple qualifying neighbors, competing adjacency sources, chains, and
  maximum-density builds.

## Dependencies and boundaries

- Extends the canonical vehicle-slot topology and existing item modification
  pipeline; it must not create a scene-only or presentation-only buff resolver.
- Complements Feature 023's stat-targeted amplifiers but requires an explicit
  rule for whether adjacency is a new modifier family, may amplify those
  effects, or remains isolated to prevent accidental multiplicative scaling.
- Must preserve Feature 024/025 transparency: every displayed aggregate stat
  must reconcile to base, installed item, modification, and adjacency evidence.
- Item movement remains a preparation decision. Adjacency effects cannot change
  during race playback unless a later feature explicitly introduces and records
  an authoritative topology-changing mechanic.
- No effect may depend on DOM position, Phaser coordinates, array traversal
  order, animation timing, or unseeded randomness.
- V1 should avoid unrestricted recursive propagation, infinite loops, or
  unbounded multiplicative chains.

## Initial decisions needed

- What counts as adjacent: immediately previous/next slot, orthogonal neighbors
  in a defined slot graph, all touching slots, or authored per-vehicle links?
- Does the source affect qualifying neighbors only, itself plus neighbors, or
  the vehicle aggregate once per qualifying neighbor?
- Do two sources stack additively, use the strongest source, or obey a capped
  stack rule?
- Can an item receive a buff and then propagate that increased value through its
  own adjacency effect, or are all effects calculated from pre-adjacency values?
- Which item attributes may be targeted: tags such as `Power`, item family,
  rarity, active/passive status, specific stats, or a deliberately smaller V1
  subset?
- How should adjacency interact with upgrades, modifications, duplicate-item
  tiering, configurable items, and existing targeted amplifiers?
- What visual language best communicates active links without overcrowding the
  garage: connector lines, slot-edge glow, neighbor badges, inspector evidence,
  or a combination?
- Should invalid or currently inactive adjacency clauses remain visible on item
  cards as unmet conditions, and how much preview detail is appropriate before
  purchase?

## Early acceptance targets

- Reordering resolver iteration without changing slot contents produces an
  identical build and race result.
- Moving one item updates only the adjacency relationships implied by the
  canonical slot graph and produces fully reconcilable before/after evidence.
- Every active adjacency contribution names its source item, target item or
  vehicle, qualifying condition, and exact value.
- Multiple sources and chains obey a documented bounded stacking rule with no
  recursive or order-dependent amplification.
- Keyboard, pointer, and touch users can discover valid adjacency targets and
  understand why an effect is active or inactive without relying on color.
- Existing items without adjacency clauses retain exactly their current
  behavior and resolved values.
