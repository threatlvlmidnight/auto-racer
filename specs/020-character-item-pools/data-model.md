# Data Model: Character Item Pools

## Item Catalog (`src/content/items/index.ts`, assembled from `items/neutral.ts` + `items/{mercer,soto,rook,voss}.ts`)

```ts
export const NEUTRAL_ITEMS: readonly ItemDefinition[] = [ /* exactly 10 */ ];

export const EXCLUSIVE_ITEMS: Record<EntrantId, readonly ItemDefinition[]> = {
  "evelyn-mercer": [ /* exactly 15 */ ],
  "lucien-soto": [ /* exactly 15 */ ],
  "inez-rook": [ /* exactly 15 */ ],
  "nell-voss": [ /* exactly 15 */ ],
};
```

No shape change to `ItemDefinition` itself (research.md Decision 1). Every
item is a complete, valid `ItemDefinition` exactly as `021`/`022`/`023`
already define it — `physics`/`conditionalPhysics` for performance,
`buff`/`synergyEffects` (with `targetStat` where relevant) for
amplification, `fittedBehavior`/`improvisedBehavior` always `{kind:
"none"}` unless the item carries its own `buff` ([[physics-blind-
installation]]).

**Validation invariants** (FR-001, FR-010; checked by `validateItemPools`,
below):
- `NEUTRAL_ITEMS.length === 10`.
- `EXCLUSIVE_ITEMS[entrant].length === 15` for all 4 entrants.
- Every `id` across all 70 items is unique.
- Summing every item's `ItemPhysicsContribution` fields within one
  entrant's `EXCLUSIVE_ITEMS[entrant]` produces a non-all-zero result, and
  no two entrants' summed leans are identical.

## `validateItemPools` (`src/simulation/itemPools.ts`)

```ts
export type ItemPoolsValidation =
  | { kind: "valid" }
  | { kind: "invalid"; issues: string[] };

export function validateItemPools(): ItemPoolsValidation;
```

Pure, deterministic, reads only the module-level `NEUTRAL_ITEMS`/
`EXCLUSIVE_ITEMS` constants — mirrors `019-async-ghost-pool`'s
`validateGhostPool` shape exactly (research.md Decision 6).

## Pool Resolution (`src/simulation/itemPools.ts`)

```ts
export function poolForEntrant(entrantId: EntrantId): readonly ItemDefinition[];

export function poolForCrossPollination(
  ownEntrantId: EntrantId,
  seed: number,
  encounterId: string,
): { guestEntrantId: EntrantId; pool: readonly ItemDefinition[] };

export function poolForRival(vehicleId: VehicleId): readonly ItemDefinition[];
```

| Function | Returns | Used by |
|---|---|---|
| `poolForEntrant` | `[...NEUTRAL_ITEMS, ...EXCLUSIVE_ITEMS[entrantId]]` | `createPayload`/`createSupplierPayload`/`restockSupplier` (FR-003) |
| `poolForCrossPollination` | one other entrant's pool, chosen deterministically per `(seed, encounterId)` (research.md Decision 5) | the new cross-pollination encounter (FR-004) |
| `poolForRival` | `[...NEUTRAL_ITEMS, ...EXCLUSIVE_ITEMS[entrantForVehicle(vehicleId)]]` | `resolveRivalBuild` (FR-005) |

**Validation invariant**: none of these three functions ever returns an
item from an entrant's pool other than the one their own contract names —
`poolForEntrant`/`poolForRival` never include a *third-party* exclusive
pool; `poolForCrossPollination` never includes `ownEntrantId`'s own pool or
duplicates `NEUTRAL_ITEMS` (already reachable through `poolForEntrant`).

**Testability note** (implementation discovery, 2026-08-12): `poolForEntrant`
and `validateItemPools` are single-argument/zero-argument by contract, which
Foundational-phase tests cannot exercise against synthetic fixture data
before the real 70-item catalog exists — closing over `NEUTRAL_ITEMS`/
`EXCLUSIVE_ITEMS` at module scope leaves no injection point, and corrupting
the real (if still-partial) catalog just to prove `validateItemPools`
catches a duplicate id would be worse. `itemPools.ts` therefore also exports
`resolveEntrantPool(neutral, exclusive, entrantId)` and
`validatePoolContent(neutral, exclusive)` — the same logic the public
`poolForEntrant`/`validateItemPools` wrap, parameterized purely for testing.
This does not change either public contract; `EXCLUSIVE_ITEMS`'s four
per-entrant pools also start as genuinely empty arrays (not placeholder
content) until each entrant's interactive authoring session (T020-T023)
fills them in.

### Signature simplification: `itemPool` parameters drop out of `encounters.ts`

`chooseEncounter`, `createPayload`, `createSupplierPayload`, and
`restockSupplier` currently take an explicit `itemPool: OfferedItem[]`
argument, supplied by the two call sites (`PrepareScene.ts`,
`RunScene.ts`) from the module-level `ITEM_POOL` constant. Once pool
membership is keyed by `entrantId` (Decision 1) and every `Run` already
carries `identity.entrantId` (`run.ts`, pre-existing), the pool is fully
derivable from `run` alone — so these four functions resolve their own
pool internally via `itemPools.poolForEntrant(run.identity.entrantId)` (or
`poolForCrossPollination` for that one encounter type), and the
`itemPool` parameter is dropped from all four signatures. `PrepareScene.ts`/
`RunScene.ts` lose their `ITEM_POOL` import and the argument at their own
call sites — a simplification, not just a swap.

## `EncounterType` extension (`src/simulation/run.ts`)

**Current**:

```ts
export type EncounterType = "parts-supplier" | "reward-draft" | "sponsor-meeting" | "pvp";
```

**Extension**:

```ts
export type EncounterType = "parts-supplier" | "reward-draft" | "sponsor-meeting" | "cross-pollination" | "pvp";
```

`NonPvpEncounterType = Exclude<EncounterType, "pvp">` needs no change — it
already picks up `"cross-pollination"` automatically.

## `CrossPollinationPayload` (`src/simulation/encounters.ts` — same module as `RewardDraftPayload`/`PartsSupplierPayload`/`SponsorMeetingPayload`)

```ts
export interface CrossPollinationPayload {
  kind: "cross-pollination";
  guestEntrantId: EntrantId;
  offers: ItemOffer[];
  selection: string | "declined" | null;
}
```

Mirrors `RewardDraftPayload`'s exact shape (3 offers, accept-one-or-decline)
plus `guestEntrantId` — required for Transparency (Constitution Principle
III, plan.md Constitution Check post-design note): a player must be able to
see *whose* pool an unfamiliar item came from, not just the item itself.

**Validation invariant**: every `offers[].item` in a `CrossPollinationPayload`
belongs to `EXCLUSIVE_ITEMS[guestEntrantId]` — never `NEUTRAL_ITEMS`, never
the player's own entrant's pool (FR-004, US3 AS1).

## `SponsorObjective` — `"trigger-tagged-items"` field rename

**Current** (`types.ts`):

```ts
export type SponsorObjective =
  | { kind: "win-next-race" }
  | { kind: "target-race-time"; targetSeconds: number }
  | { kind: "trigger-tagged-items"; identityTag: IdentityTag; requiredEvents: 10 };
```

**Extension** (research.md Decision 4):

```ts
export type SponsorObjective =
  | { kind: "win-next-race" }
  | { kind: "target-race-time"; targetSeconds: number }
  | { kind: "trigger-tagged-items"; tag: string; requiredEvents: 10 };
```

`resolvePendingSponsor`'s matcher changes from `item.identityTag ===
objective.identityTag` to `item.synergyTags.includes(objective.tag)`.

A new exported constant carries the "small authored list" this used to only
describe in prose:

```ts
// src/simulation/run.ts, colocated with SponsorObjective
export const SPONSOR_OBJECTIVE_TAGS: readonly string[] = ["information", "momentum"];
```

`objectiveForKind` (`encounters.ts`) accepts the same `rng` its caller
(`createPayload`) already threads through every other encounter branch, and
picks `tag` from `SPONSOR_OBJECTIVE_TAGS` via that `rng` — deterministic per
`(run seed, stage)` (FR-008) — rather than the single constant
`run.identityTag` it reads today.

**Validation invariant**: every entry in `SPONSOR_OBJECTIVE_TAGS` MUST
appear on at least one `Buff`-role item somewhere in the full 70-item
catalog, so the objective is never authored unwinnable by construction —
checked by `validateItemPools`, which imports `SPONSOR_OBJECTIVE_TAGS`
directly (no parameter change to its zero-arg signature) and confirms every
entry has a match.

## Appendix: `NEUTRAL_ITEMS` — locked initial content (10/10)

Locked during the item-authoring pass (2026-08-12) — this is the actual
content for `NEUTRAL_ITEMS`, not a placeholder. The 60 exclusive-pool items
remain an implementer's task per spec.md Assumptions ("exact item names...
authored during implementation, not enumerated in this spec"); the
Neutral-10 is the one part of the catalog fixed here.

Sensitivity-weighted per `021`'s measured per-stat lap-time impact
(topSpeed ≈0.14s/lap/point, corneringSpeed ≈0.10s/lap/point, acceleration
≈0.02s/lap/point, brakingPower ≈0.0096s/lap/point) — raw magnitudes differ
by design so that a `+1` top-speed item and a `+26` braking item deliver
comparable actual lap-time value. Two price tiers: Cheap = 2cr (~0.12s/lap
value), Mid = 4cr (~0.25s/lap value). `fittedBehavior`/`improvisedBehavior`
are `{kind: "none"}` for every item except Trackside Tachometer, which
carries a real Fitted `buff-boost` bonus since that path isn't
physics-blind ([[physics-blind-installation]]). No item sets `identityTag`
([[identity-tag-deferred-retirement]]).

| # | Name | Category | Price | Mechanism | Tags |
|---|---|---|---|---|---|
| 1 | Forged Pistons | Power | 4 | `physics.accelerationDelta: +6`; `synergyEffects: [{ appliesTo: "self", target: { kind: "category", category: "power" }, condition: { kind: "linear-per-count", percentPerMatch: 10 }, targetStat: "acceleration" }]` | gearing, heat |
| 2 | Copper-Core Radiator | Power | 2 | `physics.topSpeedDelta: +1` | heat, gearing |
| 3 | Reinforced Connecting Rods | Power | 4 | `physics.accelerationDelta: +13` | gearing, material |
| 4 | Bookmaker's Chit | Power | 2 | Economy — podium-only payout (placeholder, [[economy-items-capability-deferred]]) | wager |
| 5 | Engine Builder's Nameplate | Power | 4 | Economy — appreciating resale value (placeholder) | provenance |
| 6 | Reinforced Spare Wheel | Chassis | 2 | `physics.corneringSpeedDelta: +1`; `activeWhileStored: true` | wheel, material |
| 7 | Leaf-Sprung Axle Set | Chassis | 4 | `physics.corneringSpeedDelta: +3` | suspension |
| 8 | Hardened Wheel Hubs | Chassis | 4 | `physics.brakingPowerDelta: +26` | wheel, material |
| 9 | Trackside Tachometer | Chassis | 4 | `buff: { boostPercent: 20, targetStat: "topSpeed" }`; Fitted: `buff-boost +5%` | information, momentum |
| 10 | Patron's Brass Plaque | Chassis | 4 | Economy — flat per-stage income (placeholder) | patronage |

5 Power / 5 Chassis. `timeModifier: 0` on every item (FR-009 — no new item's
primary effect is legacy time-based). `origin`/pool-file placement: all 10
live in `NEUTRAL_ITEMS`, reachable by every entrant regardless of the
`origin` value eventually assigned for draft-weighting flavor (spec.md
Key Entities — `origin` "controls draft weighting only," unrelated to pool
membership per Decision 1).

Items 4, 5, and 10 (the three Economy items) MUST NOT be authored with a
real payout/income/resale mechanism until the deferred capability feature
lands — they exist in the catalog now as complete, valid `ItemDefinition`s
(price, category, tags, flavor text) whose Economy *effect* is inert until
then, exactly like any other not-yet-wired placeholder this project has
shipped before (`022`'s own precedent: ship the capability-free shape,
wire behavior in later).
