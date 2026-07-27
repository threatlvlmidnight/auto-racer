# Quickstart: Item Pool & Performance-Identity Draft Weighting

A runnable guide to validate this feature end to end once implemented. Not a tutorial and not implementation code — see `tasks.md` (Phase 2) for that.

## Prerequisites

- Node.js (LTS) and npm installed.
- `002-item-slots` already implemented (this feature extends its `OfferedItem`/`ITEM_POOL`/`PrepareScene` rather than starting fresh).

## Setup

```bash
npm install
```

## Run the game locally

```bash
npm run dev
```

Opens the Vite dev server; the prepare phase still presents 5 sequential offers (unchanged round count), but each offer is now drawn from the grown 10-20 item pool, weighted toward performance-tagged items, and shows that item's identity tag.

## Run the simulation test suite

```bash
npm run test
```

Should run the Vitest suite against `src/simulation/` — now covering `contest.ts`, `build.ts`, `slots.ts`, and the two new modules `draft.ts` and `buffs.ts` — with no browser/canvas required (contracts/simulation-contract.md's invariants are what these tests check first, per strict TDD).

## Manual validation scenarios

Each maps to an acceptance scenario in `spec.md`.

1. **Pool is real and distinguishable** (User Story 1)
   Inspect `src/content/sample-data.ts`'s `ITEM_POOL` → confirm it has between 10 and 20 items, no two sharing a name, and no two direct items sharing a `timeModifier` magnitude (FR-001).

2. **Offers are drawn from the full pool, not a fixed cycle** (User Story 1, Scenario 2)
   Play through several runs → confirm the sequence of offered items varies between runs (not the same 5-item repeating cycle every time) and includes items beyond the original 5 from `002-item-slots`.

3. **Performance identity visibly biases the draft** (User Story 2)
   Play through many runs (or inspect `draft.test.ts`'s distribution test output) → confirm performance-tagged items appear noticeably more often than neutral ones, roughly 3-in-4, while neutral items still show up sometimes — never zero across a large sample (FR-005, SC-002). Also confirm each offer displays its own identity tag directly (or "neutral") — the weighting is something you can *see* on the offer, not something you'd have to infer statistically (User Story 2 AC3, Constitution Principle III).

4. **Identity tags are visible on the held-items list and result screen** (User Story 3)
   At any build-review point — the held-items list during prepare, and the result screen after a contest — confirm each item's identity tag (or "neutral") is displayed alongside its name/effect (FR-006, SC-003). Offer-side tag display already shipped in User Story 2 (scenario 3); this scenario covers the remaining touchpoints.

5. **Buff item rewards pairing** (User Story 4, Scenarios 1-2)
   Build a run holding the buff item together with a performance-tagged direct item → confirm the contest result is measurably better than an otherwise-identical build holding only one of the two (SC-005). Then build a run holding only the buff item (no matching-tag item held) → confirm it has no effect and nothing errors (FR-010).

6. **Buff item's effect is legible** (User Story 4, Scenario 3)
   View the buff item as an offer or held item → confirm its target tag and boost percentage are shown as plainly as any other item's name/effect.

7. **002-item-slots mechanics still hold** (Regression check, FR-007)
   Fill all 3 slots, decline/evict as in `002-item-slots`'s own quickstart scenarios 1-4 → confirm slot capacity, eviction, and decline-is-a-no-op behavior are all unchanged.

8. **Determinism/order-independence still hold** (SC-004)
   Reach the same final set of held items via two different accept/evict paths in two separate runs → confirm both produce identical contest results against the sample ghost, same as `002-item-slots`'s own SC-004 check.

## What this feature does *not* cover

Do not use this quickstart to validate: additional team identities beyond Performance, team-selection UI, richer/multi-axis item synergy beyond the one buff item, per-lap/per-tick effects or item cooldowns, a lap-based race simulation, or a real run/encounter structure (shops, rewards, PvE, restocks, or how many rounds a real run has) — all explicitly out of scope here (see `spec.md` Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`).
