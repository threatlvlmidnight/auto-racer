# Phase 0 Research: Count-Synergy Buff — A Third Buff Kind

All unknowns from Technical Context are either inherited unchanged from `006-race-visualizer` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: `computeBoostsForLap` gains an `allHeldItems` parameter, separate from `activeItems`

**Decision**: `buffs.ts`'s `computeBoostsForLap(activeItems, lap, incomingState)` becomes `computeBoostsForLap(activeItems, allHeldItems, lap, incomingState)`. `allHeldItems` is every non-null board and storage item, unconditionally — unlike `activeItems`, which only includes storage items flagged `activeWhileStored`.

**Rationale**: FR-004 requires a count-synergy buff's count to include inert storage items — items `activeItems` deliberately excludes (that exclusion is the entire point of `activeItems` existing as a separate concept since `004-board-storage-ui`). The counting logic genuinely needs visibility into build state that the existing parameter doesn't carry. Adding a second parameter, rather than overloading `activeItems`'s meaning or having `buffs.ts` reach into `Build` directly, keeps the function's inputs explicit and keeps `buffs.ts` decoupled from `Build`'s own shape (it already only depends on flat `OfferedItem[]` arrays, not the board/storage structure itself — worth preserving).

**Alternatives considered**:
- Pass `Build` itself into `computeBoostsForLap` instead of two flat arrays. Rejected: couples `buffs.ts` to `Build`'s shape for the first time; every other function in this module (and `laps.ts`'s existing pattern) operates on plain `OfferedItem[]` arrays, which is easier to test with small fixtures (established precedent, `005-lap-tick-simulation`/`006-race-visualizer` research.md) and doesn't require constructing a full `Build` object in every test case.
- Compute the count entirely inside `laps.ts` and pass a pre-computed number into `computeBoostsForLap`. Rejected: would require `laps.ts` to know *which* items are buffs and which tag each targets — logic that belongs with the rest of the buff-kind branching already centralized in `buffs.ts`.

## Decision: A shared, exported `matchingDirectItemCount` avoids duplicating the count logic

**Decision**: `buffs.ts` exports `matchingDirectItemCount(allHeldItems: OfferedItem[], item: OfferedItem): number` — the count of items in `allHeldItems` that are not `item` itself, are not buffs, and share `item.identityTag`. Both `computeBoostsForLap` (to size `boostsByTag`'s contribution) and `laps.ts` (to compute the buff's own displayed `contribution` in `firedItems`) call this same function.

**Rationale**: Without a shared function, the exact same filter condition would need to live in two places — once to compute the boost actually applied to matching items, once to compute the number shown for the buff's own `contribution`. Two copies of a filter expression are exactly the kind of thing that silently drifts (e.g., one gets updated to exclude something the other doesn't) without a test catching it, since both would independently "work" in isolation. A single shared function makes that impossible by construction.

**Alternatives considered**:
- Have `computeBoostsForLap` return a per-item breakdown (e.g., `perItemContributions: Record<number, number>`) covering all three buff kinds uniformly, and have `laps.ts` read from that instead of separately deriving flat/count-synergy values itself. Rejected as a bigger refactor than this feature needs: it would also touch the existing flat/stacking code paths (`laps.ts` currently reads flat buffs' `boostPercent` directly and stacking buffs' state from `stackingState`, both working fine today) for a consistency benefit not required to ship this feature. `matchingDirectItemCount` solves the actual duplication risk (the counting filter) without restructuring what already works.

## Decision: The buff's own eligibility gate (`activeItems`-based) is unchanged; only the count's *source* set changes

**Decision**: `computeBoostsForLap`'s existing rule — a buff's contribution only lands in `boostsByTag` if at least one *active* direct item shares its tag — stays evaluated against `activeItems`, exactly as today. Only the *size* of a count-synergy buff's boost (via `matchingDirectItemCount`) draws from the broader `allHeldItems`.

**Rationale**: These are two genuinely separate questions — "how big is this buff's boost" (FR-003/FR-004: driven by everything held, active or not) and "does that boost land on anything" (unchanged existing rule: only active items receive boosts, since inactive items don't compute a per-lap magnitude to boost in the first place). Keeping the existing gate exactly as-is means flat and stacking buffs are completely untouched by this change — their behavior, tests, and invariants from `005-lap-tick-simulation`/`006-race-visualizer` don't need re-verification, only the new count-synergy branch does.

**Alternatives considered**:
- Widen the eligibility gate to `allHeldItems` too, so a count-synergy buff could "apply" even with no active receiver. Rejected: would make the buff *report* a non-zero contribution number that never actually affects `playerTime` (since `boostsByTag` is only ever read by an active firing direct item) — a confusing, borderline-misleading state given this whole feature exists to avoid exactly that kind of gap between what's shown and what's real (spec.md User Story 2's whole premise). Keeping the gate narrow (active-only) means a reported non-zero contribution always corresponds to a real effect.

## Decision: Display change is contained entirely to `resultFormatting.ts`'s `itemEffectLabel`

**Decision**: `itemEffectLabel` gains a branch: `isCountSynergyBuff(item)` → `Boosts {tag} items by {boostPercent}% per {tag} item held`, instead of the existing flat-buff phrasing (`Boosts {tag} items by {boostPercent}%`).

**Rationale**: Confirmed by inspection that `PrepareScene.ts` and `ResultScene.ts` both already render item effects exclusively through this one function (via `itemDetailsLabel`/`boardItemsLabel`/`storageItemsLabel`, all downstream of `itemEffectLabel`) — there is no second place item-effect text is generated. `contestFormatting.ts`'s `leaderLabel` is unrelated (leader/gap indicator, not item descriptions) and untouched. This means User Story 2 is fully satisfiable with a one-function change, matching the spec's own Assumption that no new display surface is required.

**Alternatives considered**:
- Also show the *currently computed* total (e.g., "per item held (currently +6% with 3 held)") in the static description. Rejected for this feature: the static prepare/result screens describe an item generically (its formula), while the *actual* per-race computed value already flows through the existing `contribution` field in `laps[].firedItems` (unused for count-synergy display today only because it's classified as a flat buff and excluded from per-lap callouts, per `isFlatBuff`) — adding a live computed number to the static description would require passing build-specific context into a currently build-agnostic formatter, a larger change than FR-009's actual requirement (describe the mechanism, not necessarily its live value) calls for.

## Everything else

All other Technical Context values (language, dependencies, testing framework, target platform, project type, performance goals) are unchanged from `006-race-visualizer`'s own `research.md`/`plan.md` — no new research was needed for them.
