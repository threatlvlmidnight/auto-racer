# Item Pools Contract

This contract defines the framework-free interfaces this feature adds to
`src/content/`/`src/simulation/`. Exact TypeScript names may follow
repository conventions, but these inputs, outputs, and invariants are
binding. This contract does not modify `021`/`022`/`023`'s own contracts —
every item authored under it is a plain, unmodified `ItemDefinition`.

## 1. Catalog Contract

- The catalog MUST partition into exactly 5 pools: `NEUTRAL_ITEMS` (10
  items) and `EXCLUSIVE_ITEMS[entrant]` for each of the 4 entrants (15 items
  each) — 70 items total (FR-001).
- Every `id` MUST be unique across the full 70-item catalog.
- No `ItemDefinition` field changes shape or meaning — every authored item
  MUST satisfy the existing `ItemDefinition` contract exactly as `021`/
  `022`/`023` left it (FR-002, FR-007).
- Every item whose purpose is a direct performance effect MUST express it
  through `physics`/`conditionalPhysics`, never `timeModifier` alone
  (FR-009, unchanged from spec.md).
- Each entrant's `EXCLUSIVE_ITEMS[entrant]`'s summed `physics` contribution
  MUST be non-neutral and distinct from every other entrant's summed lean
  (FR-010).

## 2. Pool Resolution Contract

- `poolForEntrant(entrantId)` MUST return exactly `NEUTRAL_ITEMS` concatenated
  with `EXCLUSIVE_ITEMS[entrantId]` — never any other entrant's exclusive
  items (FR-003).
- `poolForCrossPollination(ownEntrantId, seed, encounterId)` MUST return
  exactly one *other* entrant's exclusive pool, chosen deterministically
  from `(seed, encounterId)` — identical inputs MUST always select the same
  guest entrant; different `encounterId`s within the same run MAY select
  different guests (FR-004, FR-008).
- `poolForRival(vehicleId)` MUST return exactly `NEUTRAL_ITEMS` concatenated
  with the exclusive pool of the entrant that `vehicleId` belongs to
  (FR-005).
- None of the three functions above may read a `Run`, `Build`, or any
  player-scoped object beyond the plain identifiers named in their own
  signatures (Constitution Principle I, matching every prior feature's
  same constraint).

## 3. Draft-Time Gating Contract

- `createPayload`'s `"reward-draft"` branch and `createSupplierPayload`
  (including `restockSupplier`) MUST draw only from the `itemPool` argument
  they're given — no additional `identityTag`-based narrowing (research.md
  Decision 3, supersedes the pre-feature filter in both functions).
- A cross-pollination encounter's offers MUST be drawn only from
  `poolForCrossPollination`'s returned pool — never `NEUTRAL_ITEMS`, never
  the player's own entrant's pool (FR-004, US3 AS1).
- `resolveRivalBuild` MUST draw only from `poolForRival(profile.vehicleId)`
  (FR-005).
- Simulation-time behavior for any held item MUST be completely unaffected
  by which pool it was drawn from — pool membership is a draft-time concern
  exclusively (spec.md Edge Cases, Constitution Principle I).

## 4. Sponsor Objective Contract

- `SponsorObjective`'s `"trigger-tagged-items"` variant MUST match held
  items by `synergyTags.includes(tag)`, never `identityTag` (research.md
  Decision 4).
- Every authored `tag` value used for this objective kind MUST appear on at
  least one `Buff`-role item in the full 70-item catalog — an objective
  that can never be satisfied by any held item MUST NOT be authored
  (Constitution Principle III).

## 5. Determinism Contract

- Identical `(run seed, stage)` inputs MUST always produce identical draft
  offers, exactly as `drawItem`/`generateEncounterChoices` already
  guarantee (FR-008, unchanged).
- `poolForCrossPollination`'s guest-entrant selection MUST use the same
  `mulberry32`/`hashSeed` PRNG convention `rivals.ts` already establishes —
  no second determinism mechanism introduced.

## 6. Non-Interference Requirements

- `src/simulation/laps.ts`, `synergy.ts`, `tiering.ts`, `buffs.ts`, and
  `draft.ts` receive zero changes (FR-007, Technical Context).
- `src/simulation/tracks.ts` and `018`/`019`'s track/ghost-pool mechanisms
  are untouched — neither reads item pool membership (spec.md Assumptions).
- Every one of the 16 existing `ITEM_POOL`/`item-0XX`-referencing test
  files MUST continue passing, either via migration to an equivalent new
  item or conversion to a local `testItem(...)` fixture — never by silent
  deletion of test coverage (FR-006).
