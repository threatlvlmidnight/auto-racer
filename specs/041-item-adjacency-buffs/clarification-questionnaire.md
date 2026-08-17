# Feature 041 Clarification Questionnaire: Item Adjacency Buffs

**Created**: 2026-08-17  
**Status**: Complete — owner selected Q1A, Q2A, Q3A, Q4A, and Q5A on
2026-08-17

Reply with one choice per question, for example: `Q1 A, Q2 A, Q3 A, Q4 A,
Q5 A`. Free-form amendments are welcome.

## Q1 — What is adjacent in V1?

**A — Previous/next canonical slot (recommended).** Each installed slot is
adjacent to the immediately previous and next slot in the vehicle's stable
authored slot order. End slots have one neighbor; inner slots have two. This
uses today's four-slot topology, is easy to preview, and naturally caps inbound
sources at two.

**B — Authored per-vehicle graph.** Each named vehicle declares its own edges.
This creates more vehicle identity but adds topology authoring, balance, and
tutorial complexity before adjacency itself is proven.

**C — Shared 2×2 orthogonal grid.** All four-slot vehicles use the same square
graph. This creates two neighbors per slot but makes the current ordered vehicle
topology and visual layout less obviously authoritative.

## Q2 — What may an adjacency clause target in V1?

**A — Installation category and synergy tag (recommended).** Clauses may match
Power/Chassis and one or more existing synergy tags. This is expressive,
player-readable, and reuses established catalog vocabulary.

**B — Broad closed vocabulary.** Also allow rarity, active/passive status,
origin/family, exact item identity, and current installation state. This supports
more designs but substantially expands validation, copy, and balance cases.

**C — Installation category only.** Only Power/Chassis may be targeted. This is
the smallest rule set but contributes little to the requested synergy pass.

## Q3 — How do multiple adjacency sources stack?

**A — Additive snapshot, naturally capped by graph degree (recommended).** All
qualifying immediate-neighbor contributions add. With Q1-A, a target can receive
at most two adjacency sources. Every clause reads the same pre-adjacency
snapshot, and adjacency-derived values never propagate again.

**B — Strongest source only.** A target receives only its largest qualifying
adjacency contribution. This is safer for balance but makes a second neighboring
source unexpectedly inert and weakens arrangement payoff.

**C — Explicit global cap.** Sources add until a separately chosen point or
percentage cap. This supports future higher-degree graphs but introduces a new
global balance constant and partial-contribution receipts.

## Q4 — How does adjacency compose with tiers and amplifiers?

**A — Source tier scales it; other amplifiers do not (recommended).** The
adjacency clause is part of its source item's authored tiered value. Its resolved
canonical-point contribution is then a separately evidenced layer that existing
Buff/Synergy percentage amplifiers cannot multiply. This rewards duplicate
upgrades without opening multiplier chains.

**B — Fixed authored value.** Tier never changes adjacency magnitude, and
existing amplifiers cannot multiply it. This is simplest but may make adjacency
items scale worse than the rest of the catalog.

**C — Normal contribution pipeline.** Tier and matching existing amplifiers may
both scale adjacency. This is expressive but creates the highest multiplication
and reconciliation risk.

## Q5 — How much playable adjacency content belongs in Feature 041?

**A — Four representative items, broader pass in Feature 042 (recommended).**
Ship one readable adjacency item per entrant/origin ecosystem to prove the
mechanic. Feature 042 then audits and expands the full roster and synergies
before item artwork begins.

**B — Eight-item mini-expansion.** Ship roughly two per ecosystem in Feature
041. This improves immediate draft density but overlaps Feature 042's catalog
scope.

**C — Resolver and fixtures only.** Build no playable content until Feature
042. This cleanly separates authority from content but leaves Feature 041
impossible to assess in a normal run on its own.

## Locked regardless of answers

- One deterministic authority shared by preview, commit, Test Day, scored race,
  Results, and future async payloads.
- No dependence on Phaser/DOM coordinates, card order, drag history, iteration
  order, animation, or randomness.
- Storage is not an installed adjacency node.
- No recursive same-pass propagation.
- Exact source/target/contribution evidence and aggregate reconciliation.
- Existing non-adjacency items retain identical behavior.
- Text/non-color/no-hover input parity.
- Coding-agent tasks exclude screenshots and manual visual acceptance.
