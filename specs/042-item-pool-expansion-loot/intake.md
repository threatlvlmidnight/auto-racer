# Feature 042 Intake: Item Pool Expansion and Loot

**Created**: 2026-08-17

**Status**: Implementation-ready — post-review Specify, Clarify, Plan, Tasks,
and Analyze gates completed on 2026-08-17; coding has not started.

## Problem

The active item catalog needs another mechanical expansion and synergy audit
before bespoke item artwork is generated. Add a class of Bazaar-like `Loot`
items that provide no active race effect while held but permanently improve an
applicable item when sold, creating a deliberate hold-versus-liquidate decision
and another way to shape a build over a run.

Example direction: `Engine Oil` has no installed or stored race effect. When it
is sold, it grants `+1` normalized Top Speed point to the leftmost applicable
held item that can receive that stat.

## Intended scope

- Expand the playable catalog with new mechanically distinct items rather than
  cosmetic variants of current effects.
- Audit tag counts, thresholds, targeted amplifiers, origins, categories,
  rarity, prices, Fitted/Improvised behavior, and character-pool coverage.
- Identify unsupported or under-supported synergy archetypes and add a bounded
  set of items that makes those builds draftable without guaranteeing them.
- Add an explicit `Loot` item kind or capability with no active contest effect
  before sale.
- Resolve a Loot sale as one atomic authoritative transaction: select the
  target, apply the permanent run-scoped stat modification, consume/sell the
  Loot item, settle credits if applicable, and retain an exact receipt/history
  record.
- Resolve `leftmost` through canonical vehicle/storage topology order, never
  Phaser coordinates, DOM position, current sorting, or array accident.
- Show the prospective recipient, exact normalized stat change, sale value,
  and no-valid-target reason before confirmation.
- Preserve instance identity so the permanent bonus remains attached to the
  selected target item through moves, storage, upgrades, and later encounters.
- Cover deterministic replay, Undo policy, stale previews, duplicate commands,
  full storage, and removal/sale of a previously improved target.

## Dependencies and boundaries

- Uses Feature 034's item-instance and normalized-stat modification authority;
  it must not store a bonus only in presentation state.
- Coordinates with Feature 041's adjacency-buff rules as part of the broader
  synergy pass, but Loot sale buffs must not accidentally recurse through or
  multiply adjacency effects unless explicitly specified.
- Feature 037 may continue planning and art-direction prototypes, but final
  catalog-wide item asset generation is blocked until Features 041 and 042 lock
  the item roster and mechanical identities.
- A Loot item may be installable only if that creates a meaningful visible
  opportunity cost; installing it must never silently activate a race effect.
- `Permanent` initially means for the current run and retained item instance,
  not account-wide metaprogression, unless clarification explicitly changes it.
- All stat values use canonical normalized points.

## Questions resolved by the 2026-08-17 clarification

- How many new active items and Loot items ship in the first expansion?
- Does Loot occupy normal inventory/storage capacity, active slots, or both?
- Does selling Loot also grant credits, or is the permanent buff the entire
  sale value?
- Which locations count for `leftmost`: installed slots first, storage, or one
  explicit combined topology order?
- What makes an item applicable to a stat: a current contribution, an authored
  affinity, category, tag, or an explicit allowed-stat list?
- What happens when there is no applicable target?
- Can the player choose among eligible items, or is leftmost targeting always
  automatic and previewable?
- Can multiple Loot bonuses stack on one instance, and is there a cap?
- Does Undo reverse the complete sale and permanent buff atomically?
- How should permanent Loot modifications interact with tier upgrades,
  Workshop Modifications, transformations, sale, and removal?
- Which current synergy families are over-supported, under-supported, or
  mechanically redundant?

## Early acceptance targets

- Holding Loot changes no race result, lap event, stat aggregate, or cooldown.
- The same retained inventory/topology and command always select the same
  recipient and produce the same receipt.
- Reordering arrays or visual cards cannot change the leftmost recipient.
- The preview exactly matches the settled recipient, stat, magnitude, credit
  change, and consumed Loot instance.
- A duplicate/stale command cannot apply the permanent buff twice.
- Every permanent contribution remains reconcilable by source Loot item and
  sale receipt after the target moves or upgrades.
- The expanded catalog has measured synergy coverage and no character pool is
  unintentionally starved or dominant.
