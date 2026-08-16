# Upcoming Feature Planning Queue

**Updated**: 2026-08-15

## Recommended delivery order

1. **033 Race Enrichment** — currently implementing; establishes retained
   phases, event IDs, signatures, passes, incidents, and circuit evidence.
2. **036 Race Visual Spectacle** — implementation-ready, 45 tasks; it is the
   first visual payoff for Feature 033, supersedes unimplemented Feature 013
   spectacle work, and renders retained events without authority changes.
3. **034 Roguelike Encounter Variety** — remains the next mechanical feature;
   stable item instances/modifications are required before final item-art and
   multiplayer payloads are locked.
4. **035 Interface Clarity** — planned, analyzed, and ready to implement; it
   supplies rarity/card-state semantics that artwork must consume.
5. **037 Item Artwork and Presentation** — planned and gated on Features 034
   and 035; produce/lock the full catalog after their item and card-state
   contracts land.
6. **038 Async Multiplayer V1** — begin architecture planning now; implement
   only after 033 and 034 stabilize canonical versioned race/build evidence.
7. **039 Recorded Race Audio** — a separate follow-on to Feature 033's completed
   synthetic audio lifecycle: source and package licensed recorded engine assets
   with the existing synthetic fallback intact.

## Why this order

Race spectacle has a clear, bounded dependency on the event evidence Feature
033 is building. Item artwork is most efficient after the item/modification
catalog and card state model stop moving. Async multiplayer needs the same
stable canonical result/build contracts, but its product and infrastructure
choices deserve early planning because they affect privacy, cost, operations,
and release workflow.

Recorded race audio should follow 036's presentation direction, but it has no
authority dependency beyond Feature 033's already-completed lifecycle. It is
kept separate so asset licensing, download provenance, and package-size choices
receive their own review rather than reopening Feature 033's resolver work.
