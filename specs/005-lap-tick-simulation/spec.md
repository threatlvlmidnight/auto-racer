# Feature Specification: Lap-Tick Race Simulation (No Visuals)

**Feature Branch**: `005-lap-tick-simulation`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "A headless, lap-by-lap contest simulation: races resolve as a fixed number of discrete laps, items carry a per-lap magnitude and a lap-based cooldown gating recurring effects, the ghost becomes a fixed-pace control car, and the result includes a lap-by-lap breakdown. No visuals in this feature."

## Clarifications

### Session 2026-07-26

- Q: How should item effects work once the race ticks lap-by-lap? → A: Recurring per-lap magnitude, gated by an integer lap-cooldown — an item's effect fires every time its cooldown allows (every lap, or every N laps), recurring across the race, not a one-time total.
- Q: Does the ghost need its own lap-by-lap simulated pace, or can it stay a flat finishing time? → A: The ghost becomes a fixed-pace **control car** — it never holds items or modifiers, and its data changes from a flat `finishingTime` to a per-lap `lapTime`, so the number of laps can change later (including scaling across a run) without re-authoring ghost data.
- Q: Should existing items (001-003) be migrated to per-lap ticking, or should ticking be a new, separate effect kind? → A: Migrate every existing item. Its current magnitude is reused directly as its new per-lap magnitude (no attempt to preserve prior total race-long impact) — a balance shift is explicitly acceptable, since the original items were proof-of-concept content, not tuned values.
- Q: How is the ghost's per-lap pace derived? → A: A simple even split — the ghost runs every lap at the same constant `lapTime`, with no lap-to-lap variance. A richer ghost with its own recorded build/items is explicitly out of scope (a future feature, not this one).
- Q: Should migrating items to per-lap ticking preserve their old total race-long impact, or is a balance shift acceptable? → A: Balance shift is fine. Exact per-item cooldown values and any rebalancing are a content decision for planning, not fixed in this spec.
- Q: Does a buff boosting a matching-tag item apply only on laps that item also fires, or does it work differently? → A: This surfaced a bigger design question the owner wanted to resolve directly: buff items now come in **two kinds**. **Flat buffs** have no cooldown — computed once, active from lap 1, applying the same constant boost to matching active items on every single lap for the whole race (structurally what 003's original buff did, just reframed as "always-on" rather than "one-time lump sum"). **Stacking buffs** have a cooldown and fire every time it allows; each firing *permanently* adds to a running cumulative boost that then applies to matching active items on every subsequent lap (a step function that only increases, never resets or decays) — not a one-lap pulse. Stacking is additive (each firing adds a fixed increment), not compounding/multiplicative. Exact stacking-buff magnitudes need to be much smaller than flat-buff magnitudes to stay balanced — an explicit content/tuning concern for planning, not structural.
- Q: Should the simulation guard against a lap time hitting zero or going negative, now that stacking effects can compound across many laps? → A: Yes — enforce a minimum lap time floor, mirroring `001-core-loop`'s existing non-finite-value defensive guard on `resultingTime`. This is a structural safety net; keeping races sensible in practice is still primarily a content-tuning concern, but the guard exists regardless.
- Q: What should `LAP_COUNT` be pinned to as this feature's illustrative default? → A: 10 laps — enough room for cooldown variety and stacking to build up meaningfully without the race dragging.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A contest resolves as a sequence of discrete laps (Priority: P1)

Instead of computing a race outcome as one instantaneous calculation, the simulation now runs a fixed number of laps in sequence, accumulating the player's and the ghost's time lap by lap, and only then determines the final outcome (win/loss/tie) from the totals.

**Why this priority**: This is the foundational architecture change every other story in this feature depends on. Without a real lap loop, there's nothing for per-lap item effects or a per-lap ghost pace to plug into.

**Independent Test**: Resolve a contest for a build with no held items and confirm the result is the sum of `LAP_COUNT` identical base laps for the player, compared against `LAP_COUNT` identical laps for the ghost — matching the existing win/loss/tie correctness rule.

**Acceptance Scenarios**:

1. **Given** a build and a ghost, **When** the contest resolves, **Then** the simulation computes exactly `LAP_COUNT` laps in sequence, each contributing to the player's and the ghost's accumulated time.
2. **Given** the final accumulated player and ghost times, **When** the outcome is determined, **Then** it follows the same rule as `001-core-loop` (win iff player total < ghost total, loss iff greater, tie iff equal) — unchanged by moving to a lap-based computation.
3. **Given** the same build, ghost, and lap count, **When** the contest is resolved twice, **Then** both resolutions produce identical lap-by-lap results and identical final outcomes (determinism, unchanged from 001-004).

---

### User Story 2 - Items recur every lap their cooldown allows (Priority: P1)

Every direct item (migrated from 001-003) now carries a per-lap magnitude and a cooldown expressed in laps, firing on lap 1 and then every `cooldown` laps thereafter, for as long as it's active (on the board, or in storage and flagged active-while-stored, per `004-board-storage-ui`). Buff items (003) come in two kinds: **flat buffs**, with no cooldown, applying a constant boost every lap from the start; and **stacking buffs**, which fire on a cooldown and permanently add to a running cumulative boost each time they fire.

**Why this priority**: This is the actual point of the feature — proving that item effects can recur over a race rather than applying once, which is the direction `specs/vision.md` ("Item effects & simulation depth") describes as the long-term goal. Tied for P1 with User Story 1 because a lap loop with nothing recurring in it doesn't yet deliver what this feature exists to prove.

**Independent Test**: Give a build a single direct item with a known cooldown and confirm it contributes its magnitude on exactly the laps its cooldown predicts (lap 1, 1+cooldown, 1+2×cooldown, …) within a `LAP_COUNT`-lap race, and on no other laps. Separately, confirm a stacking buff's cumulative boost increases by the same fixed increment each time it fires, and never decreases.

**Acceptance Scenarios**:

1. **Given** a held direct item with cooldown 1, **When** the race resolves, **Then** it contributes its per-lap magnitude on every single lap.
2. **Given** a held direct item with cooldown N (N > 1), **When** the race resolves, **Then** it contributes its per-lap magnitude only on lap 1 and every subsequent Nth lap, and has no effect on the laps in between.
3. **Given** a held flat buff item, **When** the race resolves, **Then** it boosts every *other* active item sharing its identity tag by the same constant amount on every single lap, from lap 1 onward, with no firing/cooldown logic of its own.
4. **Given** a held stacking buff item with cooldown N, **When** it fires (lap 1, 1+N, 1+2N, …), **Then** its cumulative boost permanently increases by its fixed per-firing increment, and that new cumulative level applies to matching active items on every lap from then on (including laps where the buff itself doesn't fire) until the next firing increases it again.
5. **Given** either kind of buff item and a lap where no other active item shares its tag, **When** that lap resolves, **Then** the buff has no observable effect that lap — a legitimate, inert outcome, not an error.
6. **Given** a lap where a computed lap time (player or ghost) would be zero or negative after all active effects are applied, **When** that lap resolves, **Then** the simulation clamps it to a minimum positive floor rather than producing a zero/negative value.

---

### User Story 3 - The ghost is a fixed-pace control car (Priority: P1)

The ghost's data changes from a single flat finishing time to a per-lap pace (`lapTime`). The ghost never holds items and is never affected by modifiers — every lap, it contributes exactly the same amount of time, with zero variance.

**Why this priority**: Tied for P1 because User Story 1's lap loop needs a real per-lap ghost value to accumulate against — a flat finishing time alone can't be compared lap-by-lap. This is also what makes changing the lap count later (including scaling it across a run, a still-undesigned future concern) not require re-authoring ghost data.

**Independent Test**: Resolve a contest against the ghost and confirm every one of its `LAP_COUNT` laps contributes an identical amount of time, and that the ghost's total equals its `lapTime` multiplied by `LAP_COUNT`.

**Acceptance Scenarios**:

1. **Given** the ghost's `lapTime`, **When** the race resolves, **Then** the ghost's contribution on every lap equals exactly that value, with no lap-to-lap variance.
2. **Given** a completed race, **When** the ghost's total time is inspected, **Then** it equals `lapTime × LAP_COUNT` exactly.

---

### User Story 4 - The result includes a lap-by-lap breakdown (Priority: P2)

The contest result exposes what happened on each lap — which items fired and what each side's lap time was — not just a final aggregate total, so a later feature (a result screen, or the future race visualizer) can show it without recomputing anything.

**Why this priority**: This is a direct expression of Constitution Principle III (Transparency & Legibility) and sets up Constitution Principle IV (Spectation-First) groundwork, same purpose the existing `TimelineFrame` type already serves — but it's P2 because User Stories 1-3 can be built and correctness-tested without anything consuming the breakdown yet.

**Independent Test**: Resolve a contest and confirm the result includes, for every lap, the player's and ghost's lap time and which items (if any) fired that lap — sufficient to reconstruct why the final outcome happened without re-running the simulation.

**Acceptance Scenarios**:

1. **Given** a resolved contest, **When** the lap-by-lap breakdown is inspected, **Then** it contains exactly `LAP_COUNT` entries, each with the player's lap time, the ghost's lap time, and the set of items that fired that lap.
2. **Given** the breakdown, **When** the player's or ghost's total time is recomputed by summing the breakdown's per-lap times, **Then** it matches the result's own reported total exactly.

---

### Edge Cases

- What happens if an item's cooldown is longer than `LAP_COUNT`? (It fires once, on lap 1, and never gets a second opportunity within that race — a legitimate outcome, not an error.)
- What happens to a build holding zero items? (Every lap contributes only the car's base per-lap time; fully valid, matching `002-item-slots`'s existing "empty build" edge case.)
- What happens when two buff items (any mix of flat and/or stacking) target the same tag? (Their contributions add: a target item's total boost on a given lap is the sum of every matching buff's *currently applicable* amount that lap — a flat buff's constant, plus each stacking buff's cumulative-so-far value.)
- What happens if a stacking buff's cooldown is longer than `LAP_COUNT`? (It fires once, on lap 1, gets its first cumulative increment, and never fires again within that race — same "fires once" logic as any other cooldown-gated item, just with a stacking buff's single increment instead of a direct item's single contribution.)
- What happens if `LAP_COUNT` itself needs to change (e.g., a future run/encounter feature scales it)? (Not solved here — this feature's per-lap ghost/item model is designed so that changing `LAP_COUNT` doesn't require re-authoring any content, but the actual mechanism for varying it per-run remains a future run/encounter-structure concern, per `specs/vision.md`.)
- What happens to items that are inert-while-stored (`004-board-storage-ui`)? (Unchanged — they still contribute nothing, on any lap, regardless of cooldown or stacking state; these mechanisms only apply to items that are active in the first place.)
- What happens if a lap's computed time hits the minimum floor? (The floor value is applied and the race continues normally — hitting the floor is a legitimate, non-error outcome, though a sign the content driving it may need rebalancing.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST resolve a contest as a sequence of exactly `LAP_COUNT` (10) discrete laps, rather than a single instantaneous computation.
- **FR-002**: Each lap MUST independently compute the player's lap-time contribution as the car's base per-lap time, adjusted by every currently-active item (per `003-item-pool-draft`/`004-board-storage-ui`'s active-item rules) whose cooldown permits it to fire on that lap, plus the current contribution of any active buff items (FR-005-FR-007).
- **FR-003**: Every direct item MUST carry a per-lap magnitude and a cooldown expressed in laps. A cooldown of 1 means the item fires every lap; a cooldown of N means it fires on lap 1 and every subsequent Nth lap (1, 1+N, 1+2N, …).
- **FR-004**: Existing items from `001-core-loop` through `003-item-pool-draft` MUST be migrated to this model: each direct item's existing magnitude is reused directly as its per-lap magnitude, and each is assigned a cooldown as part of this feature's content work — no requirement to preserve any item's prior total race-long impact (Clarifications).
- **FR-005**: A **flat buff** item MUST have no cooldown and MUST apply the same constant boost to every *other* currently-active item sharing its identity tag, on every lap of the race, starting from lap 1.
- **FR-006**: A **stacking buff** item MUST carry a cooldown; each lap it fires, its cumulative boost MUST permanently increase by a fixed per-firing increment (additive, not compounding), and that cumulative level MUST apply to every *other* currently-active item sharing its identity tag on every lap from that point forward — including laps where the buff itself isn't firing — until its next firing increases it again. The cumulative boost MUST NOT decay or reset during a race.
- **FR-007**: When multiple buff items (any mix of flat and stacking) share a target tag, their currently-applicable amounts MUST sum together onto that lap's matching items, per the additive-stacking rule already established in `003-item-pool-draft`.
- **FR-008**: The ghost MUST be modeled as a fixed per-lap pace (`lapTime`) rather than a flat total finishing time; it MUST NOT hold items or be affected by any modifier, and MUST contribute the identical `lapTime` on every lap of every race.
- **FR-009**: The system MUST derive the ghost's total race time as `lapTime × LAP_COUNT` — no separate authored "total" value is needed or kept.
- **FR-010**: The contest result MUST include a lap-by-lap breakdown — for every lap, the player's lap time, the ghost's lap time, and which items fired (flat buffs counted as contributing every lap; direct items and stacking buffs counted only on laps they actually fire) — sufficient to reconstruct the final totals without recomputation.
- **FR-011**: The final outcome (win/loss/tie) and gap MUST be derived from the sum of all laps' player and ghost times, using the same correctness rule as `001-core-loop` (win iff player total < ghost total, loss iff greater, tie iff equal).
- **FR-012**: The simulation MUST remain deterministic: the same build, ghost, and lap count MUST always produce an identical lap-by-lap breakdown and final outcome.
- **FR-013**: The final outcome MUST NOT depend on the order in which held items are listed or were acquired — only which items are active, and each one's own magnitude/cooldown/tag data, may affect the result (order-independence, carried forward from `002-item-slots`/`003-item-pool-draft`).
- **FR-014**: This feature MUST NOT render or present anything visually — no track, no car representation, no animation. It produces data a future feature (the race visualizer) will consume.
- **FR-015**: The flat board/storage slot capacities, eviction rules, identity-weighted draft, and active-item rules (`002-item-slots` through `004-board-storage-ui`) MUST remain unchanged — this feature only changes how a final build's items resolve into a race outcome.
- **FR-016**: The system MUST clamp any lap's computed player or ghost time to a minimum positive floor rather than allow a zero or negative lap time, regardless of how many recurring/stacking effects combine on that lap.

### Key Entities

- **Lap Count**: a fixed illustrative constant (`LAP_COUNT` = 10) for how many laps a race has. Not yet tied to any run/encounter-structure scaling (out of scope, see Assumptions).
- **Direct Item** (extends `003-item-pool-draft`'s item, unchanged fields otherwise): its existing magnitude is now interpreted as a **per-lap** magnitude, and it gains a **cooldown** (in laps) governing how often it recurs.
- **Flat Buff Item**: a buff (003) with no cooldown — a constant boost to matching active items, active every lap from the start.
- **Stacking Buff Item**: a buff (003) with a cooldown; each firing permanently increases its own cumulative boost by a fixed increment, applied to matching active items on every lap once reached.
- **Ghost / Control Car**: the fixed opponent, now defined by a per-lap `lapTime` instead of a flat finishing time; never holds items, never varies lap to lap.
- **Lap Breakdown**: the per-lap record of a resolved contest — one entry per lap, each with the player's lap time, the ghost's lap time, and which items fired.
- **Minimum Lap Time Floor**: a structural guard clamping any computed lap time so it can never reach zero or go negative (FR-016).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contest resolves as exactly `LAP_COUNT` laps, and the win/loss/tie/gap outcome is correct against the sum of those laps' times, for builds ranging from zero held items up to a full board and full storage.
- **SC-002**: An item with cooldown N fires on exactly the laps `1, 1+N, 1+2N, …` within a `LAP_COUNT`-lap race — verified by counting firings in the lap breakdown for at least one cooldown-1 item and one cooldown-N (N>1) item.
- **SC-003**: The ghost's lap time is identical across all `LAP_COUNT` laps of a race, and its total equals `lapTime × LAP_COUNT` exactly.
- **SC-004**: The lap-by-lap breakdown's per-lap times sum to exactly the result's reported player and ghost totals, for any resolved contest.
- **SC-005**: Two contests resolved with identical build, ghost, and lap count inputs produce byte-for-byte identical lap breakdowns and final outcomes.
- **SC-006**: A build's outcome is identical regardless of the order its held items are listed, for any two permutations of the same held-item set.
- **SC-007**: A stacking buff fired K times within a race has boosted matching items by exactly K × its per-firing increment by the final lap, with no lap showing a lower cumulative value than an earlier lap.
- **SC-008**: No lap in any resolved contest — however many recurring or stacking effects apply to it — ever reports a player or ghost lap time at or below zero; every such case is clamped to the minimum floor instead.

## Assumptions

- `LAP_COUNT` is fixed at 10 for this feature (Clarifications) — the same kind of placeholder `OFFER_ROUNDS`/`SLOT_CAPACITY` have been in prior features. Real scaling of lap count across a run remains a future run/encounter-structure concern (`specs/vision.md`, `specs/DEFERRED.md`), not solved here.
- Cooldown values assigned to existing (migrated) direct items are a content decision for planning, not fixed in this spec — so long as at least one item has cooldown 1 and at least one has cooldown > 1, so cooldown-gating is observably meaningful (SC-002).
- Migrating existing items to per-lap magnitudes is explicitly allowed to shift game balance (Clarifications) — no rebalancing pass is required or expected as part of this feature.
- Whether the existing buff item from 003 becomes a flat buff or a stacking buff (or whether a second illustrative buff is added to demonstrate the other kind) is a content decision for planning — this spec only requires that both kinds exist as mechanisms and are each demonstrated by at least one item, so both are observably real (SC-007 needs at least one stacking buff to verify against).
- Stacking-buff per-firing increments need to be tuned much smaller than a flat buff's constant boost to stay balanced over `LAP_COUNT` laps — an explicit content/tuning concern for planning, not a structural one.
- The minimum lap-time floor's exact value is a planning/implementation detail (a small positive constant); this spec only requires that the guard exists and is never bypassed (FR-016, SC-008).
- The ghost remains a single, hand-authored fixed opponent (unchanged in spirit from `001-core-loop`) — only its data shape changes (flat total → per-lap pace). A ghost with its own recorded build/items that could itself carry modifiers is explicitly out of scope, a much larger future feature (real async ghost recording), not this one.
- The car's own baseline (`SpecCar`) is reinterpreted the same way as the ghost — a per-lap base pace rather than a flat total — for consistency and so both sides scale the same way if `LAP_COUNT` changes later.
- This feature produces data only; presentation of any kind (result screen updates, a track/car visualizer) is explicitly a separate, later feature per the owner's own two-feature split. `specs/DEFERRED.md`'s existing "lap-based, per-tick item effects" entry is resolved/superseded by this feature once it ships.
- Item synergy beyond the existing single buff item, additional team identities, the real run/encounter structure, and a shop/currency economy remain out of scope, per `specs/DEFERRED.md` — this feature is a contest-resolution architecture change, not a content or run-structure feature.
- `SampleGhost`'s rename/reshape (`finishingTime` → `lapTime`) and `SpecCar`'s equivalent reshape are breaking changes to existing internal types, consistent with how `002-item-slots`/`004-board-storage-ui` each migrated `Build`'s shape in their own turn.
