# Phase 0 Research: Item Slots — Flat Cap with Evict-to-Add

All unknowns from Technical Context are either inherited unchanged from `001-core-loop` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: Build shape becomes a list, not a single optional item

**Decision**: `Build` changes from `{ car, item, itemAccepted }` to `{ car, heldItems: OfferedItem[] }`, where `heldItems.length` is always between 0 and `SLOT_CAPACITY` inclusive.

**Rationale**: FR-008 requires the simulation to resolve builds holding 0 to N items. A boolean-gated single item cannot express "2 of 3 slots filled." A list is the direct, minimal representation of "which items are currently held," and its length is exactly the "open slots remaining" the spec's User Story 3 requires to be displayed.

**Alternatives considered**:
- Keep a fixed-size array of `N` optional slots (`(OfferedItem | null)[]`) to mirror physical slot identity. Rejected: the spec explicitly treats slots as generic and interchangeable ("no per-slot typing," FR-001) — a fixed-size array with nulls implies slot *identity* (which specific slot is empty) that nothing in the spec cares about. A plain list is simpler and just as capable of reporting a count.

## Decision: Offer sequence is a fixed, deterministic cycle through the item pool, not random

**Decision**: The 5 placeholder offers are drawn from the illustrative item pool in a fixed, repeating order (e.g., pool items 1-4 then 1 again for a 5-item pool), not randomized.

**Rationale**: The spec's Clarification Q2 and Assumptions are explicit that the 5-offer sequence is a placeholder, not a design decision about how offers are really generated (that belongs to the future run/encounter feature). Introducing randomness now would silently smuggle in a real design decision ("offers are randomized") that hasn't been made yet, and would also make manual/owner testing (the three "owner to run" browser-validation tasks established in 001) harder to reproduce. A fixed order keeps this feature's actual subject — the slot/eviction mechanic — fully deterministic and easy to validate by hand.

**Alternatives considered**:
- Random draw per round. Rejected for this feature per the reasoning above; nothing prevents a later feature from swapping in randomized or weighted offers, since the offer-generation step is intentionally decoupled from the slot/eviction rules being tested here.

## Decision: Slot-capacity and eviction rules live in their own simulation module (`src/simulation/slots.ts`)

**Decision**: Introduce `src/simulation/slots.ts` with pure functions operating on `Build`: `hasOpenSlot(build)`, `addItem(build, item)`, `evictAndAdd(build, evictIndex, item)`. `PrepareScene` calls these; it does not implement slot-fill/eviction logic itself.

**Rationale**: `001-core-loop` already established the precedent that anything with real game rules and correctness properties (`resolveContest`) is framework-free and strictly TDD'd, while `src/scenes/` stays thin and presentation-only. Slot capacity and eviction are exactly this kind of rule (SC-001, SC-002 are direct correctness properties), so they get the same treatment rather than being absorbed into Phaser scene code where they'd be harder to unit test.

**Alternatives considered**:
- Implement slot/eviction logic inline in `PrepareScene`. Rejected: would require testing game rules through Phaser scene mounting, which 001 deliberately avoided for `resolveContest` and has no reason to accept now.

## Decision: Eviction is expressed as a single "swap" action, not two separate steps

**Decision**: When full, the player does not click a generic "Accept" and then separately pick an eviction target as two distinct confirmations. Instead, being offered a new item while full presents the currently-held items as the accept surface: clicking a held item means "evict this one and accept the new item instead." A separate, always-available "Decline" skips the new item and leaves the build untouched.

**Rationale**: FR-003 requires the choice of what to evict to happen *as part of* accepting, not after a separate "yes I want it" confirmation with no undo. Collapsing accept+evict into one action (click the item you're giving up) directly matches Acceptance Scenario 1 of User Story 2 and avoids an extra, purely-mechanical confirmation click that the spec doesn't ask for.

**Alternatives considered**:
- Accept button first, then a separate eviction-picker screen. Rejected: adds an interaction step the spec doesn't require and risks a confusing intermediate state (new item "half-accepted" before an eviction target is chosen).

## Decision: Result screen also displays the final held-items list

**Decision**: `ResultScene` (and `resultFormatting.ts`) show the final build's held items alongside the existing outcome/times/gap display, replacing the single-item `choiceLabel`/`comparisonLabel` functions from 001.

**Rationale**: Spec's User Story 3 scopes legibility to the prepare phase, but Constitution Principle III (Transparency & Legibility) is a project-wide principle, not feature-scoped — carrying the same plain, glanceable display into the result screen is a natural, low-cost extension rather than a new feature. The old single-item "declined vs. accepted" comparison framing from 001 doesn't generalize to a list of 0-N items, so it is replaced rather than kept alongside the new list.

**Alternatives considered**:
- Keep 001's comparison framing (e.g., "won because you accepted the item") verbatim. Rejected: doesn't generalize past exactly one item; would need ad hoc special-casing for 0, 1, 2, 3 items that adds complexity for no spec-required benefit.

## Everything else

All other Technical Context values (language, dependencies, testing approach, target platform, project type, performance goals, scale) are unchanged from `001-core-loop`'s own `research.md` and `plan.md` — no new research was needed for them.
