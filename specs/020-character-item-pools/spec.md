# Feature Specification: Character Item Pools

**Feature Branch**: `020-character-item-pools`

**Created**: 2026-08-11

**Status**: Implementation complete

**Input**: User description: "Give each of the 4 entrants their own exclusive item pool, plus a small shared neutral pool, replacing today's flat generic item pool. Bazaar-style: a neutral pool shared by everyone, a per-character exclusive pool, and in-run encounters that let a player cross-pollinate into another character's pool. Target size: 10 neutral items, 15 items per character (70 total, a fresh pool, not additive to today's 20)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A player's draft only offers items their own character could plausibly have (Priority: P1)

Today every entrant draws reward-draft/parts-supplier offers from the same
flat 20-item `ITEM_POOL` — an entrant's `origin` field exists on every item
but is never actually read by any drafting code (verified directly against
`src/simulation/draft.ts`/`encounters.ts`: `drawItem` weights only by
`identityTag`, never by `origin`). The entrant-select screen's own copy
already *claims* "draft offers are weighted toward \[origin\] items" —
today that claim is false. This story makes it true, and stronger: instead
of soft weighting, a player playing Evelyn Mercer (Coachworks) sees offers
drawn only from the small shared **Neutral** pool plus **Mercer's own**
15-item exclusive pool — never Lucien Soto's, Inez Rook's, or Nell Voss's
items — for every reward draft and Parts Supplier restock in the run.

**Why this priority**: This is the mechanical core the rest of the feature
depends on. Without a real pool-membership gate, authoring character-
flavored items (US2) has no effect — a "Coachworks-flavored" item offered
with equal probability to every entrant isn't actually character content,
it's reskinned generic content.

**Independent Test**: Start a run as each of the 4 entrants in turn; open
enough reward drafts/Supplier restocks to sample broadly; confirm every
offered item is either in the Neutral pool or that entrant's own exclusive
pool, and that no other entrant's exclusive item ever appears through the
standard draft/restock path.

**Acceptance Scenarios**:

1. **Given** a run started as Evelyn Mercer, **When** a Reward Draft or
   Parts Supplier offer is generated, **Then** every offered item belongs
   to the Neutral pool or Mercer's own exclusive pool.
2. **Given** the same run, **When** many offers are sampled, **Then** no
   item from Soto's, Rook's, or Voss's exclusive pool ever appears.
3. **Given** two runs for two different entrants with the same seed,
   **When** their respective draft offers are compared, **Then** the sets
   of *eligible* items differ (Neutral + own pool only), even though the
   underlying draw mechanism is the same deterministic process.

---

### User Story 2 - Each character's pool has its own real identity (Priority: P1)

Author a fresh, from-scratch catalog: 10 Neutral items usable by anyone
(broad, foundational effects — the "you can always find one of these"
tier), and 15 exclusive items per entrant (60 total), each set grounded in
that entrant's own origin/approach/strategy directions (already authored
in `src/content/entrants.ts` — e.g. Coachworks/Mercer's own
`strategyDirections` text) so a player can tell which character's build
they're looking at from the items alone, not just the vehicle silhouette.
Today's 20-item `ITEM_POOL` is retired, not extended — this is a fresh
pool per the feature's own scope, not additive.

`021-arcade-physics-simulation` landed after this spec's original draft
and is the mechanism that makes character identity legible: every item's
core performance effect (the part that makes a car meaningfully faster or
slower, not a buff-amplifier) MUST be authored through `ItemDefinition`'s
existing optional `physics` field (`ItemPhysicsContribution` — deltas to
`acceleration`/`topSpeed`/`brakingPower`/`corneringSpeed`), not through
the legacy flat `timeModifier` alone. This is the concrete, testable form
of this session's own governing principle — "all stats that affect
performance flow from the build" — and it is what lets a character's pool
read as thematically distinct in a way a player can *feel* on track, not
just read in a tooltip: a pool that leans on `brakingPower`/
`corneringSpeed` drives differently, and finishes differently on
different track shapes, than one that leans on `acceleration`/`topSpeed`.

**Why this priority**: This is the actual payoff the whole feature exists
for — real character identity through items — and is inseparable from US1
(a gated pool with generic-feeling content defeats the purpose).

**Independent Test**: Inspect each entrant's 15-item pool in isolation;
confirm every item is a valid `ItemDefinition` (installs cleanly, has a
real `fittedBehavior`/`improvisedBehavior` or buff, participates in
existing synergy/tiering/buff systems with zero engine changes), and that
each entrant's set reads as thematically distinct from the others when
read side by side.

**Acceptance Scenarios**:

1. **Given** the full 70-item catalog, **When** every item is validated
   against the existing `ItemDefinition` contract, **Then** every item
   installs, tiers, and simulates correctly with zero changes to
   `src/simulation/laps.ts`/`synergy.ts`/`tiering.ts`/`buffs.ts`.
2. **Given** any two different entrants' exclusive pools, **When** their
   items are compared, **Then** they differ meaningfully in theme (not
   just `id`/`name` strings) — distinct `synergyTags`, distinct balance of
   direct vs. buff items, distinct flavor consistent with that entrant's
   authored `approach`/`strategyDirections`.
3. **Given** any entrant's exclusive pool, **When** every item's `physics`
   contribution is summed, **Then** the pool's net lean across the four
   `PhysicalStats` is distinct from every other entrant's pool, and that
   lean is consistent with the entrant's authored `approach`/
   `strategyDirections` (e.g. a defensively-flavored entrant's pool nets
   toward `brakingPower`/`corneringSpeed` rather than raw `topSpeed`).

---

### User Story 3 - Occasionally, a run offers a glimpse of another character's item (Priority: P2)

A new in-run encounter (or an extension of an existing one) lets a player
draft from *one* other entrant's exclusive pool for that single offer —
"cross-pollination" — without permanently widening their own standard
draft pool. This keeps US1's identity-defining restriction intact for the
common case while giving runs occasional variety and a taste of the other
three characters' design space.

**Why this priority**: Real value-add once US1/US2 exist, but the feature
is complete and shippable without it — US1+US2 alone already deliver "each
character feels different," matching this session's `018`/`019` precedent
of shipping a foundational mechanism before its enrichment.

**Independent Test**: Trigger the cross-pollination encounter directly;
confirm its offer(s) are drawn from exactly one other entrant's pool
(deterministically, from the run's own seed); confirm accepting it adds a
normal, fully-functional item to the build with no special-cased behavior
elsewhere in simulation.

**Acceptance Scenarios**:

1. **Given** a run as Mercer reaches a cross-pollination encounter,
   **When** its offers are generated, **Then** every offered item belongs
   to exactly one of Soto's, Rook's, or Voss's exclusive pools — never
   Mercer's own pool, never Neutral (those are already reachable normally).
2. **Given** the same run reaches a second cross-pollination encounter,
   **When** its offers are generated, **Then** the guest entrant chosen
   may differ from the first encounter's (not always the same other
   character every time).
3. **Given** a cross-pollinated item is drafted and installed, **When**
   its build resolves a contest, **Then** it fires/contributes exactly as
   any other held item would — no origin-based restriction at simulation
   time, only at draft time.

---

### User Story 4 - Rivals keep drafting sensibly under the new pool structure (Priority: P3)

`resolveRivalBuild` currently draws every rival's items from the same flat
`ITEM_POOL`, regardless of which of the 4 vehicle topologies (and
therefore which origin) the rival profile uses. Once `ITEM_POOL` is
retired, rivals must draw from a defined pool too — this story pins down
that each rival draws from Neutral plus the exclusive pool matching its
own `vehicleId`'s origin (via the existing `vehicleById` lookup), mirroring
the same restriction the player faces, so a rival never fields an item
that shouldn't exist on its own vehicle's character.

**Why this priority**: Correctness/consistency cleanup, not new player-
facing value — lowest priority, but required so `resolveRivalBuild` (a
function every PvP contest calls) doesn't silently reference a removed
export.

**Independent Test**: Resolve several rival builds across all 7 (or 12,
post-`019`) `GHOST_POOL` profiles; confirm every installed/stored item on
every resolved rival build belongs to Neutral or that rival's own
vehicle-origin pool.

**Acceptance Scenarios**:

1. **Given** a rival profile whose `vehicleId` is `the-highwheel` (Mercer's
   vehicle, Coachworks origin), **When** its build is resolved at any
   level, **Then** every installed/stored item belongs to Neutral or
   Mercer's exclusive pool.

---

### Edge Cases

- What happens to the 16 existing test files that reference `ITEM_POOL`
  directly or specific `item-0XX` ids for behavior assertions (buff
  stacking, synergy examples, tier bonuses, etc. — verified via
  `grep -rl "ITEM_POOL\|item-00"` across `tests/`)? These are real,
  load-bearing regression tests, not incidental references. This feature
  MUST NOT silently break them — each one either migrates to an equivalent
  item in the new pool structure, or converts to a local test-only fixture
  item (`testItem(...)`, the existing convention in
  `tests/fixtures/vehicle-build-fixtures.ts`) where the specific catalog
  identity doesn't matter to what the test verifies.
- What happens if a player somehow holds an item whose origin pool doesn't
  match their own entrant (e.g. a cross-pollinated item, or a save/build
  state that predates this feature)? Simulation MUST treat it identically
  to any other held item — origin-based restriction is a *draft-time*
  concern only, never a simulation-time one (mirrors `018`'s "installed
  items are installed items" precedent).
- What happens to Parts Supplier restock specifically — does a restock
  draw from the same gated pool as an initial offer? Yes — no separate
  rule; `createSupplierPayload` uses the same `itemPool` parameter
  `createPayload`'s reward-draft branch does today.
- What is "Neutral" for an item whose `origin` field today is one of the 4
  origin values — does Neutral get a 5th origin-like value, or a different
  discriminator entirely? Left to `plan.md`/`data-model.md` — this spec
  fixes the *behavior* (a pool of items usable by any entrant), not the
  TypeScript representation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST partition the item catalog into exactly 5
  pools: one Neutral pool (10 items) and one exclusive pool per entrant
  (15 items each, 4 entrants) — 70 items total, replacing today's 20-item
  `ITEM_POOL` entirely.
- **FR-002**: Every `ItemDefinition` MUST remain structurally unchanged —
  no new required field is introduced; pool membership MUST be expressible
  without breaking any existing consumer of `ItemDefinition` (FR-008 of
  `018`/`019` established this "no new required field" convention; this
  feature follows it for the same reason — minimize blast radius on
  existing simulation code). This includes reusing `021`'s already-optional
  `physics` field for FR-009 below — that field exists and is optional
  today, so authoring it on 60 new items introduces no new required field.
- **FR-003**: A player's standard reward-draft and Parts Supplier offers
  (including restocks) MUST be drawn only from the Neutral pool plus their
  own entrant's exclusive pool — never another entrant's exclusive pool —
  for the entire duration of a run.
- **FR-004**: The system MUST author a new cross-pollination mechanism (an
  encounter type, existing or new) whose offers are drawn from exactly one
  other entrant's exclusive pool, chosen deterministically from the run's
  own seed — never the player's own entrant's pool, never Neutral (already
  reachable through FR-003).
- **FR-005**: `resolveRivalBuild` MUST draw each rival's items from Neutral
  plus the exclusive pool matching that rival's own `vehicleId`'s origin —
  never any other entrant's exclusive pool.
- **FR-006**: Every one of the 16 existing test files identified in Edge
  Cases MUST continue passing — each via either migration to an equivalent
  new-pool item or conversion to a local test-only fixture, never by
  silent deletion of test coverage.
- **FR-007**: Every authored item (Neutral or exclusive) MUST fully satisfy
  the existing `ItemDefinition` contract and interoperate with zero changes
  to `src/simulation/laps.ts`, `synergy.ts`, `tiering.ts`, or `buffs.ts`.
- **FR-008**: Draft/selection determinism MUST be preserved — identical
  `(run seed, stage)` inputs MUST always produce identical offers, exactly
  as today's `drawItem`/`generateEncounterChoices` already guarantee.
- **FR-009**: Every authored item whose purpose is a direct performance
  effect (not a buff-amplifier, per the existing `buff`/`synergyEffects`
  mechanisms) MUST express that effect through `ItemDefinition.physics`
  (`ItemPhysicsContribution` deltas to `acceleration`/`topSpeed`/
  `brakingPower`/`corneringSpeed`) rather than through `timeModifier`
  alone. `timeModifier` on such items MAY remain `0`; it is not removed
  (FR-002), only no longer the primary mechanism for new content.
- **FR-010**: Each entrant's 15-item exclusive pool MUST have a net
  `physics` lean — summing every item's `ItemPhysicsContribution` in the
  pool MUST NOT be stat-neutral, and that net lean MUST be distinct across
  all 4 entrants (no two entrants' pools MUST net-favor the exact same
  stat or stat pair) — the mechanism that makes US2's "reads as
  thematically distinct" claim concretely testable rather than
  subjective.

### Key Entities

- **Neutral Pool**: 10 items any entrant can draft. The foundational,
  always-available tier.
- **Exclusive Pool**: 15 items belonging to exactly one entrant, reachable
  through that entrant's own standard draft/restock, or through another
  entrant's cross-pollination encounter.
- **Pool Membership**: a per-item classification (Neutral, or exactly one
  of the 4 entrants) — the mechanism (new field, new content-file split,
  etc.) is a `plan.md`/`data-model.md` decision, not fixed here.
- **Cross-Pollination Encounter**: a new in-run encounter whose offer set
  is drawn from one other entrant's exclusive pool for that single
  encounter only — does not persist or widen the player's standard pool.
- **Physical Stat Contribution**: an item's `physics` field
  (`ItemPhysicsContribution`, authored by `021`) — deltas to
  `acceleration`/`topSpeed`/`brakingPower`/`corneringSpeed`. The primary
  mechanism through which a new item's performance identity is expressed
  (FR-009); a pool's summed contributions define that entrant's stat lean
  (FR-010).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sampling any run's reward-draft/Supplier offers broadly
  (outside a cross-pollination encounter) never surfaces an item from any
  entrant's pool except the player's own or Neutral.
- **SC-002**: All 70 authored items pass full simulation validation (fire
  correctly, tier correctly, participate in synergy/buff resolution
  correctly) with zero production code changes outside content files and
  the pool-gating mechanism itself.
- **SC-003**: Every pre-existing test in the repository continues to pass
  (`npm test`), with the 16 identified `ITEM_POOL`/`item-0XX`-referencing
  files either migrated or explicitly converted to local fixtures.
- **SC-004**: A cross-pollination encounter, when triggered, offers items
  from exactly one other entrant's pool, verified deterministic across
  repeated resolution with the same seed.
- **SC-005**: Summing each entrant's 15-item exclusive pool's `physics`
  contributions produces 4 distinct, non-neutral net stat leans (per
  FR-010) — computable directly from the authored catalog, no simulation
  required.

## Assumptions

- Exact item names, numeric balance, and per-entrant thematic direction
  (what "feels like Coachworks" vs. "feels like Velodrome" beyond the
  origin labels already authored in `entrants.ts`) are authored during
  implementation, not enumerated in this spec — mirrors how `018` left
  exact scoring constants as an implementer's choice, tasked out in
  `tasks.md` rather than fixed here. This now extends to which specific
  stat(s) each entrant's pool leans toward (FR-010) — the spec requires a
  distinct, non-neutral lean per entrant, not which stat it is.
- The 4 entrant-to-origin mapping is already fixed and 1:1 (Mercer/
  Coachworks/Highwheel, Soto/Velodrome/Needle, Rook/Fieldworks/Lark, Voss/
  Backroads/Hush) — this feature reuses that existing mapping, it does not
  introduce a new identity concept.
- The cross-pollination encounter's exact trigger frequency/stage
  placement within the 12-stage schedule is a balance-pass decision for
  `plan.md`, not fixed here — this spec only requires that it exists and
  behaves per FR-004.
- `018-track-generation`'s track generation and `019-async-ghost-pool`'s
  `GHOST_POOL` require no changes — neither reads item pool membership.
  (`018`'s original `trackFit` mechanic no longer exists — `021` replaced
  it outright with the real physics simulation this spec now builds on.)
