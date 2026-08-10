# Implementation Plan: Duplicate Item Tiering

**Branch**: `016-duplicate-item-tiering` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-duplicate-item-tiering/spec.md`

## Summary

Add a `tier` (★1-★3) field to every held-item position (`VehicleSlotState`,
`StoredPosition`) instead of to the static `ItemDefinition` catalog. A new
`resolveDuplicateAcquisition` function, called from `purchaseStock` and
`acceptReward` before any placement happens, detects whether an acquired
item's `id` matches an already-held item and returns one of three
outcomes: place as a new ★1 item (today's behavior, unchanged), upgrade
the existing held item's tier in place (no new slot/storage position
used), or — if the held item is already ★3 — convert the acquisition into
a `"duplicate-conversion"` credit transaction (half the item's authored
price, reusing `015-economy-depth`'s math but its own distinct
transaction kind so it stays distinguishable from a deliberate sale).
Tier folds into an item's own effective value as a new early layer in
`laps.ts`'s existing fold chain (authored → tier bonus → installation
delta → synergy delta), for both board and storage items. Every Parts
Supplier stock entry and Reward Draft option for an already-held item
shows its real resolution before the player commits.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. Tier is in-memory `VehicleBuild`
state, the same as every existing build field.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts: duplicate detection across board and
storage, tier-upgrade in place with no new position used, max-tier
conversion's credit amount and transaction kind, tier's fold order
relative to installation and synergy, and pre-commit resolution preview
correctness for both acquisition paths.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: All new logic is synchronous, in-memory
state computation over at most 7 held positions — no new asymptotic
cost.

**Constraints**:
- Tier is state on the held position (`VehicleSlotState`/
  `StoredPosition`), never on `ItemDefinition` — the static catalog stays
  pure, shared, and tier-agnostic (spec.md Assumptions).
- Duplicate detection matches on `ItemDefinition.id` only, across both
  board and storage, for every acquisition path (Parts Supplier
  purchase, Reward Draft acceptance) — no acquisition path is exempt
  (FR-010).
- A tier upgrade or max-tier conversion MUST NOT create, move, or occupy
  a board slot or storage position (FR-002, FR-003).
- Tier's bonus applies only to the item's own authored effect and MUST
  compose with (never override or exclude) installation behavior and
  synergy effects already folded in by `010-entrant-vehicle-garage` and
  `014-item-synergy-tags` (FR-006).
- `015-economy-depth`'s sell-back formula is unchanged by this feature —
  tier never affects resale value (FR-008).
- Every offer of an already-held item MUST show its real resolution
  (tier upgrade to a specific tier, or exact credit amount) before the
  player commits — never only after (FR-011).
- Max-tier conversion MUST use its own credit-transaction kind, distinct
  from `015-economy-depth`'s player-initiated `"sell-back"` kind, even
  though the payout formula is identical (FR-007).
- No mechanic introduced here may vary by player entrant or purchasable
  content (FR-009, Constitution Principle II).

**Scale/Scope**: One new field on two existing types (`tier` on
`VehicleSlotState`/`StoredPosition`), one new pure resolution function,
one new fold step in lap simulation, one new `CreditTransactionKind`
value, and `garagePresentation.ts`/`PrepareScene.ts` presentation
updates for live tier display and pre-commit offer labeling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Tiering is entirely prepare-phase acquisition/garage state; a tier's numeric fold into simulation is deterministic and pre-computed the same way installation/synergy deltas already are — no live input during a contest. |
| II. Fairness | PASS | Duplicate detection, tier bonus, and max-tier conversion apply identically regardless of entrant or purchasable content (FR-009). |
| III. Transparency & Legibility | PASS | Tier and its effective value are always inspectable (FR-005); every offer shows its real resolution before commit (FR-011); max-tier conversion is its own attributable, distinguishable transaction (FR-007). |
| IV. Spectation-First | PASS | Not touched — no change to contest presentation; tier's effect is already baked into `ContributionEvidence` by the time a contest resolves. |
| V. Build Testing Access | PASS | Untouched — Test Day/Practice mode has no acquisition concept and this feature does not add one there. |
| VI. Async-First Architecture | PASS | No live service or synchronization introduced. |
| Product - 2D medium | PASS | Presentation-only additions (a ★ tier badge, offer resolution labels) within the existing 2D Phaser/DOM shell. |
| Product - mechanical parity and topology | PASS | Tiering applies identically to every entrant/vehicle; no capacity or topology rule is touched — tiering is explicitly the alternative to adding capacity. |
| Product - theme | PASS | Star-tier vocabulary is already the working term across this session's planning; no new theme decision introduced. |
| Development Workflow | PASS | Vertically sliced: the tier-upgrade mechanic (US1), its mechanical payoff (US2), and max-tier overflow handling (US3) are each independently testable and deliverable. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model adds one field to two existing
position types and one new transaction kind — both additive, neither
replacing nor narrowing an existing contract. All principles above
remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/016-duplicate-item-tiering/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── duplicate-tiering-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── simulation/
│   ├── types.ts                     (MODIFIED) - VehicleSlotState and
│   │                                   StoredPosition gain `tier`;
│   │                                   CreditTransactionKind gains
│   │                                   "duplicate-conversion"
│   ├── tiering.ts                   (NEW) - resolveDuplicateAcquisition,
│   │                                   applyTierBonus, tier-resolution
│   │                                   preview for offer display
│   ├── laps.ts                      (MODIFIED) - fold applyTierBonus
│   │                                   into the existing effective-item
│   │                                   chain for both board and storage
│   │                                   located items
│   ├── garage.ts                    (MODIFIED) - commitGarageCommand's
│   │                                   new-item placement paths
│   │                                   initialize `tier: 1`
│   └── encounters.ts                (MODIFIED) - purchaseStock and
│                                       acceptReward call
│                                       resolveDuplicateAcquisition first;
│                                       max-tier conversion appends a
│                                       "duplicate-conversion" transaction
└── scenes/
    ├── garagePresentation.ts        (MODIFIED) - garageItemInspector
    │                                   shows live tier and effective
    │                                   value; new offer-resolution
    │                                   preview helper
    └── PrepareScene.ts              (MODIFIED) - render tier badges on
                                        held items; render each Parts
                                        Supplier/Reward Draft offer's
                                        real resolution before commit

tests/
├── unit/
│   ├── tiering.test.ts              (NEW) - resolveDuplicateAcquisition,
│   │                                   applyTierBonus, resolution
│   │                                   preview
│   ├── laps.test.ts                 (MODIFIED) - tier fold order and
│   │                                   composition with installation/
│   │                                   synergy
│   ├── garage.test.ts               (MODIFIED) - new-item placement
│   │                                   initializes tier 1
│   └── encounters.test.ts           (MODIFIED) - purchaseStock/
│                                       acceptReward duplicate-resolution
│                                       routing, max-tier conversion
│                                       transaction
└── integration/
    └── run-flow.test.ts             (MODIFIED) - a full run acquiring
                                        the same item three times across
                                        separate encounters
```

**Structure Decision**: Preserve the existing single-project split. Tier
resolution and its bonus calculation get their own module
(`src/simulation/tiering.ts`), mirroring `014-item-synergy-tags`'s
`synergy.ts` — a self-contained engine that `laps.ts` and `encounters.ts`
each call into, rather than embedding this logic inside either.

## Delivery Order

1. Add `tier` to `VehicleSlotState`/`StoredPosition` (defaulting to `1`
   wherever a new item is placed) and `"duplicate-conversion"` to
   `CreditTransactionKind`, in `src/simulation/types.ts`. Test-first:
   type shape, default tier on placement.
2. Implement `resolveDuplicateAcquisition(build, item)` and
   `applyTierBonus(item, tier)` in `src/simulation/tiering.ts`.
   Test-first: new-item vs. tier-upgrade vs. max-tier-convert
   classification across board and storage; tier bonus percentage
   scaling; no mutation of `ItemDefinition` itself.
3. Wire `resolveDuplicateAcquisition` into `purchaseStock` and
   `acceptReward` in `src/simulation/encounters.ts`, including the
   `"duplicate-conversion"` transaction append for the max-tier case.
   Test-first: each acquisition path routes correctly; a tier-upgrade
   never calls `applyPlacement`; a max-tier conversion never touches
   `run.build`.
4. Fold `applyTierBonus` into `laps.ts`'s existing effective-item chain
   for both board and storage located items, ahead of the installation
   fold. Test-first: composition with installation and synergy deltas,
   confirming none is silently dropped.
5. Extend `garageItemInspector` with live tier/effective-value display,
   and add the offer-resolution preview helper, in
   `src/scenes/garagePresentation.ts`. Test-first: preview correctness
   for all three resolution kinds given a live build.
6. Wire tier badges and offer-resolution labels into
   `src/scenes/PrepareScene.ts`.
7. Run `npm test`, `npm run build`, `npm run lint` green; confirm zero
   regression in existing acquisition, installation, and synergy tests.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
