# Implementation Plan: Economy Depth

**Branch**: `015-economy-depth` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-economy-depth/spec.md`

## Summary

Add a `reputation` field to `Run`, decremented on a lost PvP contest or a
failed sponsor objective, driving a new `"failed"` `RunStatus` when it
reaches zero — hooked into the same `advanceRun()` completion check that
already sets `"completed"` today. Add `"interest"` and `"sell-back"` to
`CreditTransactionKind`, layered onto the existing `creditTransactions`
system with no new economy model. Add a `sellItem` function to the
garage/encounters layer (removes an item, grants half its price). Add a
per-`StockEntry` `locked` flag respected by the existing `restockSupplier`.
Win/loss streaks are explicitly out of scope (deferred to after
`009-run-progression`'s season-length growth).

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. Reputation, interest, and sell-back
are all in-memory `Run`/`CreditTransaction` state, the same as every
existing economy value.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts: reputation decrement triggers (PvP loss vs.
sponsor failure vs. tie), the zero-reputation `"failed"` status
transition and history preservation, interest calculation and its
zero-banked-credits no-op case, sell-back's credit/removal atomicity, and
card-locking's reroll-exclusion behavior. Focused presentation tests for
reputation visibility in `runPresentation.ts`.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: All new logic is synchronous, in-memory
state transition work — no new asymptotic cost, consistent with every
existing run/encounter transition.

**Constraints**:
- Reputation decrements only on an outright PvP loss or a failed sponsor
  objective — never on a tie (FR-002).
- Reputation never goes negative; a large penalty produces the same
  `"failed"` outcome as reaching exactly zero (FR-004).
- `"failed"` is a new `RunStatus` value, not a reuse of `"completed"` —
  every switch/conditional over `RunStatus` in the codebase MUST be
  updated to handle it explicitly, never fall through to a default
  branch (FR-003).
- Reputation MUST be visible during an active run, alongside credits
  (FR-006).
- Interest/sell-back are new `CreditTransactionKind` values, not a
  parallel transaction system (FR-007, FR-009).
- Sell-back price is always half the item's authored `price`, rounded
  down (FR-009).
- Card locking is local to one Parts Supplier encounter instance — never
  persisted across encounters (FR-011).
- Win/loss streaks are explicitly out of scope for this feature.
- No mechanic introduced here may vary by player entrant or purchasable
  content (FR-012, Constitution Principle II).

**Scale/Scope**: One new `Run` field (`reputation`), one new `RunStatus`
value, two new `CreditTransactionKind` values, one new garage/encounters
function (`sellItem`), one new `StockEntry` field (`locked`), and
`runPresentation.ts`/`RunScene.ts`/`PrepareScene.ts` presentation updates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Reputation/interest/sell-back/locking are all prepare-phase or post-contest bookkeeping; nothing changes contest resolution itself or introduces live input during a contest. |
| II. Fairness | PASS | No mechanic here varies by entrant or purchasable content (FR-012). |
| III. Transparency & Legibility | PASS | Reputation is always visible (FR-006); every credit change is an inspectable transaction (FR-013); a "failed" run's full history stays inspectable (FR-003). |
| IV. Spectation-First | PASS | Not touched — no change to contest presentation. |
| V. Build Testing Access | PASS | Untouched — Test Day/Practice mode has no reputation, interest, or economy concept and this feature does not add one there. |
| VI. Async-First Architecture | PASS | No live service or synchronization introduced. |
| Product - 2D medium | PASS | Presentation-only additions (a reputation readout, a sell button, a lock toggle) within the existing 2D Phaser/DOM shell. |
| Product - mechanical parity and topology | PASS | Reputation/economy mechanics apply identically to every entrant; no capacity or topology rule is touched. |
| Product - theme | PASS | New UI copy stays within the existing 1901 motor-age vocabulary; no new theme decision. |
| Development Workflow | PASS | Vertically sliced: reputation (US1), interest (US2), sell-back (US3), and card-locking (US4) are each independently testable and deliverable. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model adds one new run-level field,
one new status value, two new transaction kinds, and one new stock-entry
field — all additive to existing types, none replacing or narrowing an
existing contract. All principles above remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/015-economy-depth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── economy-depth-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── simulation/
│   ├── types.ts                     (MODIFIED) - RunStatus gains
│   │                                   "failed"; CreditTransactionKind
│   │                                   gains "interest"/"sell-back";
│   │                                   StockEntry gains `locked`
│   ├── run.ts                       (MODIFIED) - Run.reputation field;
│   │                                   reputation-check in advanceRun();
│   │                                   new "failed" status transition
│   └── encounters.ts                (MODIFIED) - reputation decrement on
│                                       PvP loss/sponsor failure; interest
│                                       application; sellItem(); locked-
│                                       aware restockSupplier(); toggleLock()
└── scenes/
    ├── runPresentation.ts           (MODIFIED) - reputationLabel,
    │                                   "Failed" statusLabel
    ├── RunScene.ts                  (MODIFIED) - render reputation
    │                                   alongside credits; render the
    │                                   distinct failed-run outcome screen
    └── PrepareScene.ts              (MODIFIED) - sell control per held
                                        item; lock toggle per Parts
                                        Supplier offer

tests/
├── unit/
│   ├── run.test.ts                  (MODIFIED) - reputation decrement/
│   │                                   floor, "failed" transition,
│   │                                   history preservation
│   └── encounters.test.ts           (MODIFIED) - interest, sellItem,
│                                       locked-aware restock
└── integration/
    └── run-flow.test.ts             (MODIFIED) - an early-failed run's
                                        full flow, alongside the existing
                                        normal-completion flow
```

**Structure Decision**: Preserve the existing single-project split. No
new module is introduced — every change extends an existing type or
function in `src/simulation/run.ts`/`encounters.ts`/`types.ts`, following
this feature's own "layer onto existing systems, don't replace them"
constraint (Technical Context).

## Delivery Order

1. Add `Run.reputation`, the new `"failed"` `RunStatus` value, and the
   reputation-check hook in `advanceRun()`. Test-first: decrement
   triggers (loss vs. tie vs. sponsor failure), floor-at-zero, "failed"
   transition, history preservation through an early end.
2. Add `reputationLabel` to `runPresentation.ts` and render it in
   `RunScene.ts` alongside credits, plus the distinct failed-run outcome
   screen. Test-first: presentation model reflects live reputation and a
   correct failed-state label.
3. Add `"interest"`/`"sell-back"` to `CreditTransactionKind` and
   implement interest application (hooked at the same stage-transition
   point reputation is checked) and `sellItem()`. Test-first: interest's
   zero-banked-credits no-op, sell-back's atomicity (credit + removal
   together, never one without the other).
4. Add the `locked` field to `StockEntry`, `toggleLock()`, and make
   `restockSupplier()` skip locked entries. Test-first: a locked entry
   survives reroll unchanged; an unlocked entry is always replaced,
   matching today's behavior exactly.
5. Wire sell/lock controls into `PrepareScene.ts`.
6. Run `npm test`, `npm run build`, `npm run lint` green; confirm every
   existing `RunStatus`/`CreditTransactionKind` switch/conditional in the
   codebase explicitly handles the two new values rather than falling
   through a default case.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
