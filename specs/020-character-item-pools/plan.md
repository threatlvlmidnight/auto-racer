# Implementation Plan: Character Item Pools

**Branch**: `020-character-item-pools` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-character-item-pools/spec.md`

## Summary

Replace the flat 20-item `ITEM_POOL` with a 70-item catalog split into 5
pools — one shared Neutral pool (10 items) and one exclusive pool per
entrant (15 items × 4) — gated at draft time only (never at simulation
time). Pool membership is expressed structurally, as which content-file
array an item is authored into, not as a new `ItemDefinition` field.
Discovered while designing this plan: three existing mechanisms
(`createSupplierPayload`/`restockSupplier`'s Parts Supplier eligibility, and
the `"trigger-tagged-items"` sponsor objective) are gated by `identityTag`,
which the physics-first authoring convention (`021`/`022`/`023`) has
already made vestigial for new content — both are fixed as part of this
feature, not deferred, since leaving them would make Parts Supplier
permanently unavailable and one sponsor objective permanently unwinnable
the moment the new catalog replaces the old one.

## Technical Context

**Language/Version**: TypeScript (existing project toolchain — Phaser 3,
Vite, Vitest, ESLint; no version change)

**Primary Dependencies**: None new — same deterministic `mulberry32` PRNG
pattern `rivals.ts`/`018`/`019` already use for the new cross-pollination
guest-entrant selection.

**Storage**: N/A — pure in-memory content + simulation, same as every
existing `src/content/`/`src/simulation/` module.

**Testing**: Vitest, strict test-first (RED before implementation),
matching this repository's established convention.

**Target Platform**: Existing web build (Vite + Phaser 3), no platform
change.

**Performance Goals**: Pool resolution is array lookup/concat over ≤70
items — no measurable cost.

**Constraints**: `src/simulation/laps.ts`/`synergy.ts`/`tiering.ts`/
`buffs.ts` receive zero changes (FR-007) — every one of the 70 items must
satisfy the existing `ItemDefinition` contract as-is. `src/simulation/
draft.ts` receives one one-line guard, discovered necessary during
implementation (research.md Decision 2, revised 2026-08-12): `drawItem`'s
`identityTag`-weighting logic degrades to its "neutral" branch only when the
coin flip actually lands there — without the guard, the ~`tagWeight` share
of draws that land on the (now-always-empty) tagged branch instead would
index out of bounds and return `undefined`, reproduced directly against the
real catalog. Behavior against the *old* catalog (non-empty tagged group) is
unchanged (`identity-tag-deferred-retirement` — the field stays in the
schema, still load-bearing for the *old* catalog until it's fully retired,
but no new content sets it).

**Scale/Scope**: 70 authored items across a new `src/content/items.ts`;
pool-resolution helpers in a new `src/simulation/itemPools.ts`; targeted
fixes to `src/simulation/encounters.ts` (Parts Supplier eligibility, the
`"trigger-tagged-items"` sponsor objective, a new cross-pollination
encounter) and `src/simulation/rivals.ts` (`resolveRivalBuild`'s pool
source); a `SponsorObjective` field rename in `src/simulation/run.ts`;
migration or conversion of the 16 existing `ITEM_POOL`/`item-0XX`-
referencing test files (FR-006).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Prepare → Contest Integrity**: PASS. Pool gating is a draft-time
  restriction only (spec.md Edge Cases) — simulation-time behavior for a
  held item is completely unchanged regardless of which pool it came from.
- **II. Fairness**: PASS. Every pool is reached through the same
  already-existing draft/purchase/reward mechanisms — no new
  purchasable-content path, no pay-to-win surface.
- **III. Transparency & Legibility**: PASS, and directly load-bearing for
  the `"trigger-tagged-items"` fix specifically — a sponsor objective a
  player could accept and then find permanently unwinnable (because no item
  in the new catalog could ever satisfy it) is exactly the kind of
  invisible unfairness this principle prohibits. Fixing it here, rather
  than deferring it, is a Transparency requirement, not just cleanup.
- **IV. Spectation-First**: PASS. No rendering/replay change — the
  entrant-select screen's existing "draft offers are weighted toward
  [origin] items" copy becomes *true* as a side effect (spec.md US1), with
  no copy change required.
- **V. Build Testing Access**: PASS. Test Day/Practice's legacy path uses
  local `testItem(...)` fixtures, never the real pools — unaffected.
- **VI. Async-First Architecture**: PASS. No live opponent; rival pool
  resolution (FR-005) is precomputed exactly like every other rival build
  field.

**Result**: All gates PASS. No Complexity Tracking entries required.

**Post-design re-check** (after Phase 1 — `data-model.md`/`contracts/`):
Confirmed still PASS. Principle III's requirement sharpened during design:
the cross-pollination payload (US3) explicitly surfaces which guest
entrant's pool an offer came from (`guestEntrantId`), not just the items
themselves — a player must be able to see *why* an unfamiliar item is being
offered, not just that it is. No new violation surfaced.

## Project Structure

### Documentation (this feature)

```text
specs/020-character-item-pools/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── item-pools-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/content/
├── items/
│   ├── neutral.ts   # NEW — NEUTRAL_ITEMS (10), locked content (data-model.md appendix)
│   ├── mercer.ts    # NEW — Evelyn Mercer's 15-item exclusive pool (Coachworks)
│   ├── soto.ts      # NEW — Lucien Soto's 15-item exclusive pool (Velodrome)
│   ├── rook.ts      # NEW — Inez Rook's 15-item exclusive pool (Fieldworks)
│   ├── voss.ts      # NEW — Nell Voss's 15-item exclusive pool (Backroads)
│   └── index.ts     # NEW — re-exports NEUTRAL_ITEMS + assembles
│                     # EXCLUSIVE_ITEMS: Record<EntrantId, readonly ItemDefinition[]>
│                     # from the four per-entrant files. One barrel per concern,
│                     # matching this project's existing entrants.ts/rivals.ts
│                     # convention — also lets the four exclusive pools be authored
│                     # in parallel (different files) rather than serialized on one.
├── sample-data.ts   # ITEM_POOL removed once the 16 referencing test files are
│                    # migrated (Polish phase, FR-006) — BASELINE_CAR stays.
└── entrants.ts      # UNCHANGED — already has the EntrantId/VehicleId/Origin
                      # mapping items/ and itemPools.ts key off.

src/simulation/
├── itemPools.ts     # NEW — poolForEntrant(entrantId), poolForCrossPollination
│                     # (ownEntrantId, seed, encounterId), poolForRival(vehicleId).
│                     # The one place "which items is X allowed to draw from"
│                     # is answered — every draft/restock/rival call site goes
│                     # through this instead of touching NEUTRAL_ITEMS/
│                     # EXCLUSIVE_ITEMS directly.
├── encounters.ts     # itemPool arguments now come from itemPools.ts. Parts
│                     # Supplier eligibility (createSupplierPayload,
│                     # restockSupplier) drops its identityTag filter — pool
│                     # membership already narrows appropriately, a second
│                     # identityTag-based narrowing on top would zero out the
│                     # whole new catalog. New "cross-pollination"
│                     # EncounterType/payload (FR-004), joining the existing
│                     # weighted 2-of-N choice-stage selection — no new
│                     # scheduling mechanism. "trigger-tagged-items" sponsor
│                     # objective repointed from identityTag to synergyTags.
├── rivals.ts         # resolveRivalBuild draws from itemPools.poolForRival
│                     # (profile.vehicleId) instead of the flat ITEM_POOL.
├── run.ts            # SponsorObjective's "trigger-tagged-items" variant's
│                     # identityTag field becomes a synergyTag string field.
└── draft.ts          # UNCHANGED — see Technical Context.

tests/                # The 16 existing ITEM_POOL/item-0XX-referencing files
                       # either migrate to an equivalent new-pool item or
                       # convert to local testItem(...) fixtures (FR-006).
```

**Structure Decision**: One new content file (`items.ts`), one new
simulation module (`itemPools.ts`), targeted edits to three existing
simulation modules. No change to `src/simulation/{laps,synergy,tiering,
buffs,draft}.ts` — the entire feature is content plus a draft-time
resolution layer sitting in front of the unchanged simulation core,
mirroring `018`/`019`'s own precedent of adding a resolution layer rather
than touching the simulation itself.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*

## Delivery Order

1. **Foundational** — `items.ts`'s 70-item catalog authored and validated
   (`validateItemPools`, mirroring `019`'s `validateGhostPool` precedent);
   `itemPools.ts`'s three resolution functions; the Parts Supplier and
   `"trigger-tagged-items"` `identityTag` fixes, proven against the *old*
   catalog first (zero-regression guard) before the swap.
2. **US1** — Standard reward-draft/Supplier offers gated to Neutral + own
   pool. The mechanical core; nothing else matters without it.
3. **US2** — The 70 items themselves, authored with real per-entrant
   thematic identity and a distinct, non-neutral `physics` lean per pool
   (FR-010). Ordered second, not first, because pool *gating* has to exist
   before pool *content* has anywhere real to be gated into — content
   authored against an ungated draft would be unverifiable.
4. **US3** — Cross-pollination encounter. Enrichment, not a blocker;
   correctly ordered last among the P1/P1/P2 stories.
5. **US4** — `resolveRivalBuild` pool integration. Priority P3, and
   genuinely independent of US1-US3 (rivals never go through the
   draft/encounter code path at all) — could be done in parallel, but
   ordered last here since it's the smallest, most self-contained piece.
6. **Polish** — Migrate/convert the 16 existing `ITEM_POOL`/`item-0XX`
   test files (FR-006); remove `ITEM_POOL` itself; full regression;
   quickstart validation.
