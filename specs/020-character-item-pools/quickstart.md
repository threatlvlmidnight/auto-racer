# Quickstart: Character Item Pools

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/item-pools-contract.md](./contracts/item-pools-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. **Catalog integrity** confirms: `validateItemPools()` reports valid —
   exactly 10 Neutral items, exactly 15 per entrant, no duplicate `id`
   across all 70, and each entrant's summed `physics` lean is non-neutral
   and distinct from the other three's (FR-001, FR-010, SC-005).
2. **Draft gating** confirms: for each of the 4 entrants, sampling many
   reward-draft/Supplier offers never surfaces an item outside Neutral +
   that entrant's own pool (FR-003, SC-001).
3. **Cross-pollination** confirms: offers are drawn from exactly one other
   entrant's pool, never Neutral, never the player's own; repeated
   resolution with the same `(seed, encounterId)` is deterministic; two
   different encounters in the same run can select different guest
   entrants (FR-004, FR-008, SC-004).
4. **Rival integration** confirms: resolving builds across all `GHOST_POOL`
   profiles, every installed/stored item belongs to Neutral or that rival's
   own vehicle-origin pool (FR-005).
5. **Parts Supplier remains available** confirms: `createSupplierPayload`/
   `restockSupplier` against the new catalog never report `unavailable:
   true` due to zero eligible stock (research.md Decision 3 — the
   pre-feature regression this fix specifically prevents).
6. **Sponsor objective stays winnable** confirms: a `"trigger-tagged-items"`
   contract's authored `tag` matches at least one `Buff`-role item
   somewhere in the catalog, and `resolvePendingSponsor` correctly counts
   `firedItems` against `synergyTags` (research.md Decision 4).
7. **Simulation-time non-interference** confirms: an item held from any
   pool (including a cross-pollinated one) fires/contributes identically to
   any other held item — no origin-based branch anywhere in
   `laps.ts`/`synergy.ts`/`tiering.ts`/`buffs.ts` (FR-007, Edge Cases).
8. **Zero regression** confirms: all 16 previously-identified `ITEM_POOL`/
   `item-0XX`-referencing test files pass, either against a migrated
   equivalent item or a local fixture (FR-006, SC-003); the full existing
   suite passes unchanged otherwise.

## Local Browser Run

1. Start the dev server: `npm run dev`.
2. Start a run as each of the 4 entrants in turn; open several reward
   drafts and a Parts Supplier encounter; confirm every offered item
   plausibly reads as either Neutral or that entrant's own flavor (spot
   check against `EXCLUSIVE_ITEMS[entrantId]`'s authored names/tags).
3. Play until a cross-pollination encounter appears; confirm the UI
   identifies which other entrant's pool the offer came from
   (`guestEntrantId`), not just the item names.
4. Confirm a PvP stage against a rival still resolves and renders normally
   — rival builds should look plausible for their vehicle's origin.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS — see plan.md). Acceptance requires all automated checks and coverage
items above, plus zero regression in any existing test.
