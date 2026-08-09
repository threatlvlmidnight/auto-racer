# Research: Multi-Ghost Contest

## Decision 1: A rival resolves into a real `VehicleBuild`, not an abstract pace number

**Decision**: `resolveRivalBuild(profile, level, seed)` returns a real
`VehicleBuild` — a named-vehicle topology (reusing one of the four existing
`VehicleId`s) with items installed into its slots/storage from the existing
`ITEM_POOL`. This build is passed into the exact same `simulatePlayerLaps`
the player's own build uses. There is no second, rival-only simulation
model.

**Rationale**: The owner explicitly chose this during `/speckit.clarify`
over an abstract stat-weight pace number (Alex's POC approach), because it
maximizes reuse of existing simulation code and keeps a rival's strength
always inspectable as "what it has installed" (Constitution Principle III).
It also directly feeds the already-decided `pre-race-setup` feature
(`specs/skribidi-gap-decisions.md` §8), which wants to show a rival's real
stats before racing.

**Alternatives considered**:
- Abstract stat-weight profile producing a computed lap-pace value
  (mirrors Alex's `rivalForRound`): rejected — a separate code path from the
  player's real simulation is an inconsistency this project's architecture
  doesn't otherwise have, and it can't be "inspected" the way an item-based
  build can.
- A new, rival-only vehicle topology: rejected — the four existing
  topologies already provide four distinct Power/Chassis/Flex
  distributions; inventing a fifth for rivals only would duplicate content
  authoring for no stated benefit.

## Decision 2: Rival item selection reuses the existing deterministic draw

**Decision**: `resolveRivalBuild` fills a rival's build using the existing
`drawItem(pool, targetTag, tagWeight, rng)` deterministic draw from
`src/simulation/draft.ts` — the same function Reward Draft/Parts Supplier
already call — seeded from a value derived from `(runSeed, profile.id,
level)`. It does not invent a second draw mechanism.

**Rationale**: `draft.ts` is already the single owner of "pick an item
deterministically, weighted toward a target." Calling it again for rivals
means rival item selection automatically benefits from any future
improvement to that function (e.g. `010-entrant-vehicle-garage`'s
still-unshipped Phase 7/US5 origin-based reweighting) without this feature
needing its own follow-up. As of this plan, `drawItem` is still
identity-tag-weighted (`IdentityTag`/`"performance"`), not yet the
Origin-weighted version described in `010`'s contract — this feature calls
whatever `drawItem` currently is, not a frozen copy of it.

**Alternatives considered**:
- Hand-authored fixed item lists per rival per level: rejected — directly
  contradicts FR-004's "one authored definition, resolved per level," and
  duplicates authoring effort 7 times over.
- A new rival-specific weighted-draw function: rejected — no behavioral
  need identified; reusing `drawItem` is strictly simpler and keeps one
  source of truth for "how an item gets picked deterministically."

## Decision 3: Level scaling is item count and price tier, not new stats

**Decision**: A rival profile's level-scaling rule controls how many of its
vehicle's active/storage slots get filled and biases which price tier of
`ITEM_POOL` items the draw favors, as level increases — reusing `price`
(already an authored 2-5 difficulty/power proxy on every item) rather than
inventing a new rival-only power stat.

**Rationale**: `price` already correlates with an item's effect magnitude
across the existing 20-item catalog (see `item-pool.test.ts`'s price-vs-
uniqueness pinning). Reusing it means level-scaling needs no new authored
data on `ItemDefinition` — only a per-profile, per-level slot-count/price-
bias rule, which is genuinely new but small.

**Alternatives considered**:
- A parallel "rival power level" stat authored per item: rejected — a
  second, item-authored, rival-only number is exactly the kind of hidden
  parallel system Constitution Principle III warns against; every value
  that determines a contest's outcome should already be legible through
  existing item facts.

## Decision 4: `resolveContest` becomes N-car, keyed by a ranked `cars[]` array

**Decision**: `resolveContest` is extended to accept a rival roster (7
`RivalProfile`s) and a level, and its result gains a `cars: CarResult[]`
array (ordered by finishing position) replacing the current two-sided
`playerTime`/`ghostTime`/`gap` shape. `lapCount`, `board`, and `storage`
(the player's own board/storage snapshot) are retained as-is; `outcome`
stays meaningful as "win iff the player's `CarResult` is at position 1."

**Rationale**: A hard two-sided shape (`playerTime`/`ghostTime`) cannot
represent N results without an awkward parallel-array retrofit. A single
ordered `cars[]` array is the natural generalization, and keeping
`outcome`/`board`/`storage` at the top level minimizes churn for consumers
that only care about the player's own summary.

**Alternatives considered**:
- Keep `playerTime`/`ghostTime` and add a separate `otherRivals[]` array:
  rejected — reintroduces exactly the "player is special-cased, everyone
  else is a second-class array" asymmetry the whole point of this feature
  is to remove (FR-003: every car counts toward standings equally).

## Decision 5: Ties resolve by fixed roster order

**Decision**: If two cars compute an identical total time, the one earlier
in a fixed, stable roster order (player first, then rivals in authored
profile order) ranks higher. No new tie-break data is authored.

**Rationale**: Simplest deterministic rule available; requires no new
authored content, and ties are already vanishingly unlikely given continuous
floating-point lap times — this only needs to exist so the invariant "every
resolution has a total order" holds, per FR-007.

**Alternatives considered**:
- Random tie-break: unconstitutional (Principle I/III — no
  non-deterministic behavior in resolution).
- Tie-break by a new authored "priority" field: rejected — no identified
  need for anything beyond a stable, already-available ordering.

## Decision 6: Test Day/Practice mode is untouched

**Decision**: `TestDayScene`, `PracticeContestScene`, and
`PracticeResultScene` (all shipped in `011-build-test-day`) keep calling
`resolveContest`'s existing single-`SampleGhost` code path unchanged. This
feature adds the N-car path alongside it; it does not migrate or remove the
1-ghost path.

**Rationale**: Per FR-011 and the owner's explicit `/speckit.clarify`
answer — Test Day's job is validating the player's own build numbers
against a stable, simple reference, not mirroring the scored contest's
field size. Keeping both paths available also means this feature has zero
blast radius on already-shipped, already-accessibility-audited practice
scenes.

**Alternatives considered**:
- Migrate Test Day to the 8-car field too: rejected during clarify — real
  added scope with no identified player benefit, and risks regressing
  `011`'s accessibility work for no stated reason.
