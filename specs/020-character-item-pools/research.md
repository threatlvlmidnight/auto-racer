# Research: Character Item Pools

## Decision 1: Pool membership is structural (which file/array an item lives in), not a new field

**Decision**:

```ts
export const NEUTRAL_ITEMS: readonly ItemDefinition[] = [ /* 10 items */ ];
export const EXCLUSIVE_ITEMS: Record<EntrantId, readonly ItemDefinition[]> = {
  "evelyn-mercer": [ /* 15 items */ ],
  "lucien-soto": [ /* 15 items */ ],
  "inez-rook": [ /* 15 items */ ],
  "nell-voss": [ /* 15 items */ ],
};
```

No new field on `ItemDefinition`. "Which pool" is a fact of where the item
literal is authored, never a value that could drift from where it's
actually reachable.

**Rationale**: FR-002 requires no new required field; this goes further and
adds no field *at all* — the smallest possible surface. A `Record<EntrantId,
...>` structurally guarantees "exactly 4 exclusive pools" at the type level
(TypeScript rejects a missing or extra key), which a per-item optional
field could never guarantee on its own (nothing stops two items claiming
the same pool inconsistently, or an item claiming none). `validateItemPools`
(Decision 6) still checks the count/uniqueness/lean invariants FR-001/
FR-010 require, but the *shape* is correct by construction before any
validation runs.

**Alternatives considered**:
- *A new `pool?: EntrantId` optional field on `ItemDefinition`* (undefined
  = Neutral): rejected — technically satisfies FR-002 ("no new *required*
  field"), but adds a field every one of `021`/`022`/`023`'s existing
  physics/buff/synergy logic would need to keep ignoring correctly, for a
  fact (pool membership) that has nothing to do with simulation and is
  already knowable from file structure.

## Decision 2: `drawItem` needs a one-line guard so it degrades gracefully (revised during implementation, 2026-08-12)

**Original decision** (superseded below): `src/simulation/draft.ts` would be
untouched, on the reasoning that `drawItem`'s `taggedItems`/`neutralItems`
split (`item.identityTag === targetTag`) would simply put every new-catalog
item into `neutralItems`, since none of the 70 authored items set
`identityTag` ([[identity-tag-deferred-retirement]]).

**What implementation found**: that reasoning only covers the coin flip
(`rng() < tagWeight`) landing on the `neutralItems` branch. When it lands on
the `taggedItems` branch instead — which it does ~`tagWeight` (75%) of the
time by design — `selectedGroup` resolves to the now-always-empty
`taggedItems` array, and `selectedGroup[Math.floor(rng() *
selectedGroup.length)]` indexes into an empty array, returning `undefined`.
Reproduced directly: `tests/unit/encounters.test.ts`'s reward-draft tests
threw `Cannot read properties of undefined (reading 'id')` the moment
`createPayload` started sourcing from the real (identityTag-less)
`NEUTRAL_ITEMS` catalog instead of the old `ITEM_POOL`. This is not a test
artifact — the same `undefined` would reach real players roughly 3 in 4
draws once the new catalog ships.

**Revised decision**: `src/simulation/draft.ts` gets a one-line guard —
`selectedGroup = rng() < tagWeight && taggedItems.length > 0 ? taggedItems
: neutralItems`. Against any pool with a non-empty `taggedItems` group (the
old `ITEM_POOL`), the guard is always true and behavior is byte-identical to
before. Only against a pool where `taggedItems` is empty (the entire new
catalog) does it change anything — falling back to `neutralItems`, which is
what Decision 2 always intended to guarantee.

**Rationale**: The smallest possible fix that makes the original claim
("degrades gracefully") actually true, rather than reverting to "leave
`draft.ts` untouched" and accepting a ~75%-of-draws crash in production.

**Alternatives considered**:
- *Author `identityTag` on a subset of the new catalog to keep weighting
  meaningful*: rejected — directly contradicts the
  `identity-tag-deferred-retirement` decision; would resurrect a field this
  project already decided to stop authoring.
- *Remove the weighting parameter from `drawItem`'s signature*: rejected —
  a real simplification, but its own separate, later cleanup once
  `identityTag` itself is retired, not bundled in here.

## Decision 3: Parts Supplier eligibility drops its `identityTag` filter entirely

**Decision**: `createSupplierPayload` and `restockSupplier`
(`src/simulation/encounters.ts`) both currently do:

```ts
const eligible = itemPool.filter((item) => item.identityTag === run.identityTag);
```

This filter is removed. Once `itemPool` is already the correctly-gated
Neutral + own-entrant pool (Decision 1's resolution layer), every item in
it is legitimate Supplier stock — there's no remaining reason for a second,
narrower filter on top.

**Rationale**: Verified directly — `run.identityTag` is always
`ACTIVE_IDENTITY_TAG` (`"performance"`, the only value `IdentityTag` has).
Against the *old* catalog, only 12 of 20 items ever set `identityTag:
"performance"`; against the *new*, zero-by-design catalog, this filter
would make `eligible.length === 0` on every single call — Parts Supplier
would report `unavailable: true` permanently the moment the new catalog
replaces `ITEM_POOL`. This is not an edge case to accept; it is a complete
loss of one of three encounter types, caught here specifically because
Constitution Principle V (Build Testing Access) and general playability
depend on all three encounter types remaining real.

**Alternatives considered**:
- *Author `identityTag` on enough new items to keep Supplier stock
  non-empty*: rejected — same reasoning as Decision 2; resurrects a field
  this project is deliberately retiring from new content.
- *Replace the `identityTag` filter with a `synergyTags`-based one*:
  rejected for Supplier specifically — there's no design reason Supplier
  stock should be narrower than "anything in your reachable pool"; a tag
  filter here would just be an arbitrary new restriction with no motivating
  requirement.

## Decision 4: `"trigger-tagged-items"` sponsor objective repointed to `synergyTags`

**Decision**: `SponsorObjective`'s `"trigger-tagged-items"` variant's
`identityTag: IdentityTag` field becomes `tag: string` (a `synergyTags`
value); `resolvePendingSponsor`'s matching (`item.identityTag ===
objective.identityTag`) becomes `item.synergyTags.includes(objective.tag)`.

A new exported `SPONSOR_OBJECTIVE_TAGS: readonly string[]` constant
(`src/simulation/run.ts`, colocated with `SponsorObjective`) replaces the
"small authored list" this decision originally described only in prose.
`objectiveForKind` (`encounters.ts`) accepts the same `rng` its caller
(`createPayload`) already threads through every other encounter branch, and
picks `tag` from `SPONSOR_OBJECTIVE_TAGS` via that `rng` — deterministic per
`(run seed, stage)` like every other draft/encounter decision (FR-008),
never a hardcoded single value. `validateItemPools` (Decision 6) imports
`SPONSOR_OBJECTIVE_TAGS` and confirms every entry matches at least one
`Buff`-role item across the real catalog, closing the loop this decision's
own rationale depends on: an authored tag with zero matches would make the
objective unwinnable exactly like the bug this decision fixes.

**Rationale**: This objective counts **fired events** (`lap.firedItems`)
matching a tag over the run. Verified directly against `laps.ts`: an item
only ever appears in `firedItems` if it's a `Buff` that fires that lap, or
a legacy `timeModifier`-cooldown direct item — never a pure `Physics`-role
item, since physics deltas are constant, always-on contributions with no
per-lap "firing" event at all. Left pointed at `identityTag`, this
objective would become **permanently unwinnable** the instant the new
catalog (which authors no `identityTag`) replaces the old one — a player
who accepts it before noticing has accepted a contract they cannot
complete, which Constitution Principle III (Transparency & Legibility)
treats as a bug, not an acceptable edge case (plan.md Constitution Check).
`synergyTags` remains meaningful specifically because it's still populated
on `Buff`-role items (e.g. Trackside Tachometer's `information`/`momentum`
tags) — the one category of item that still generates `firedItems` events
in the new model, so the objective stays completable by construction.

**Alternatives considered**:
- *Retire `"trigger-tagged-items"` as an objective kind entirely*:
  rejected — a real, working objective kind is worth keeping; the fix is a
  one-line rename plus a one-line matcher swap, far cheaper than removing
  and redesigning a third of the sponsor-objective surface.
- *Count `physics`-driven contributions somehow instead of firing events*:
  rejected — physics contributions aren't discrete per-lap events the way
  `firedItems` is; inventing a new "counts as triggered" concept for
  constant contributions is new engine surface with no spec requirement
  driving it. `synergyTags` + `firedItems` already correctly answers "which
  held items are doing something interesting and countable," unchanged.

## Decision 5: Cross-pollination joins the existing weighted choice-stage selection — no new scheduling mechanism

**Decision**: `"cross-pollination"` becomes a fifth `EncounterType` (a
`NonPvpEncounterType`, alongside `"parts-supplier"`/`"reward-draft"`/
`"sponsor-meeting"`), added to `generateEncounterChoices`'s existing
`ENCOUNTER_SUMMARIES` map. The existing "pick 2 of N, present as a choice"
logic needs zero changes — it already handles N generically.

Guest entrant selection is deterministic per encounter:

```ts
function poolForCrossPollination(
  ownEntrantId: EntrantId, seed: number, encounterId: string,
): { guestEntrantId: EntrantId; pool: readonly ItemDefinition[] } {
  const others = ENTRANT_IDS.filter((id) => id !== ownEntrantId);
  const rng = mulberry32(hashSeed(seed, encounterId));
  const guestEntrantId = others[Math.floor(rng() * others.length)];
  return { guestEntrantId, pool: EXCLUSIVE_ITEMS[guestEntrantId] };
}
```

**Rationale**: Reuses `rivals.ts`'s exact existing `mulberry32`/`hashSeed`
PRNG convention — no second determinism story to maintain. Keying the seed
by `encounterId` (not just the run seed) is what makes AS2 true ("the guest
entrant chosen may differ" between two cross-pollination encounters in the
same run) — a fixed `(seed)`-only key would deterministically pick the same
guest every time within one run, contradicting AS2 outright.

**Alternatives considered**:
- *A dedicated stage slot reserved for cross-pollination, outside the
  existing choice-selection mechanism*: rejected — spec.md Assumptions
  explicitly leaves "exact trigger frequency/stage placement" to this plan,
  and reusing the existing mechanism is strictly simpler than adding a
  parallel scheduling path for one more encounter type.

## Decision 6: `validateItemPools` mirrors `019`'s `validateGhostPool` precedent

**Decision**: A new pure function checks, at minimum: `NEUTRAL_ITEMS.length
=== 10`; every `EXCLUSIVE_ITEMS[entrant].length === 15`; no duplicate `id`
across the full 70-item catalog; (FR-010) each entrant's pool's summed
`physics` contribution is non-neutral and distinct from the other three's;
and (Decision 4) every `SPONSOR_OBJECTIVE_TAGS` entry (`run.ts`) matches at
least one `Buff`-role item somewhere in the full catalog.

**Rationale**: Direct precedent — `019-async-ghost-pool`'s
`validateGhostPool` already established this project's pattern for
"authored content has structural invariants; check them with a pure
function, call it from a test, don't just trust the literal array." FR-001
and FR-010 are exactly the kind of countable, automatable invariant that
pattern exists for.

**Alternatives considered**: None seriously considered — this is a
same-shape problem to `019`'s, and inventing a different validation
convention for the same kind of catalog-integrity check would be pure
inconsistency.

## Decision 7: `resolveRivalBuild` resolves its pool via `vehicleId → entrant → pool`

**Decision**: `itemPools.ts` exports `poolForRival(vehicleId: VehicleId):
readonly ItemDefinition[]`, implemented as `[...NEUTRAL_ITEMS,
...EXCLUSIVE_ITEMS[vehicleForEntrant-inverse(vehicleId)]]` — using the
already-existing `VEHICLES` catalog (`entrants.ts`) to find which
`entrantId` owns a given `vehicleId`, then indexing `EXCLUSIVE_ITEMS`.
`rivals.ts`'s `resolveRivalBuild` calls this instead of referencing
`ITEM_POOL` directly; `priceBucket`'s own filtering logic is unchanged,
just fed a different source array.

**Rationale**: `RivalProfile.vehicleId` is the only identity `rivals.ts`
already carries — reusing the existing `VEHICLES` catalog's
`vehicleId → entrantId` mapping (already authored, `entrants.ts`) needs no
new content, just a lookup. Matches FR-005 exactly: "each rival draws from
Neutral plus the exclusive pool matching that rival's own `vehicleId`'s
origin."

**Alternatives considered**: None — the mapping already exists in
`entrants.ts`; inventing a second one would be pure duplication.

## Decision 8: a small, additive "value-scaled Buff" capability, added during Mercer's item-authoring pass (2026-08-12)

**Decision**: `Buff` gains one new optional field, `scalesWithFittedValue?:
boolean`. When set, the buff's applied percent is `boostPercent *
sumFittedValue(fitted items)` — the summed authored `price` of every
currently fitted (vehicle-slot only; storage excluded) item, including the
buff's own price — instead of a matching-tag count or flat/stacking
magnitude. `sumFittedValue`/`isValueScaledBuff` (`buffs.ts`) are the new
pure helpers; `computeBoostsForLap` and `laps.ts`'s `buffPercentFor` both
gain an optional `fittedValue = 0` parameter, computed once per build in
`simulatePlayerLaps` (composition doesn't vary lap to lap, same as
`synergyResolution`) and threaded through unchanged. Works on both the
time-targeted and stat-targeted paths, gated by the same
existing-candidate-required rule every other Buff already has.

**Rationale**: The user asked, mid-authoring, for a Bazaar-style chase card
for Evelyn Mercer ("appraiser" identity — a buff that scales with the value
of her fitted parts). That splits into two pieces of very different cost:
reading the sum of already-authored, static `price` values (cheap — the
data already exists everywhere) versus items that *mutate* other items'
value (expensive — genuinely new mutable state, and the same category of
work as the already-deferred Economy resale-appreciation mechanic). Per
explicit user decision, only the first piece ships now; items that boost
*other* items' value are deferred to the same post-70-item Economy/
Installation follow-up feature as the rest of the Economy capability
([[economy-items-capability-deferred]]).

**Scope note**: this revises FR-007/plan.md's "laps.ts/synergy.ts/
tiering.ts/buffs.ts receive zero changes" framing — that constraint was
written for the *authoring* pass using the existing engine as-is; this is a
deliberate, small, explicitly-requested engine addition, not new content
hitting an unplanned gap the way T016a's `drawItem` fix was.

**Alternatives considered**:
- *Reuse `perCount`'s multiplier slot for a "value" count instead of a
  literal item count*: rejected — `perCount`'s existing semantics
  (`matchingDirectItemCount`/`matchingStatItemCount`) are specifically about
  *how many* matching items are held, not their value; overloading the same
  boolean for two different multiplier sources would make `computeBoostsForLap`
  harder to read for no real savings over a second boolean field.
- *Compute fittedValue from `allHeldItems` (board + storage) instead of
  board only*: rejected — the user said "fitted," which already has an
  exact, established meaning in this codebase (vehicle slots, not storage);
  matching it exactly avoids inventing a second, competing definition.
