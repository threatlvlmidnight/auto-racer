# Implementation Plan: Item Slots — Flat Cap with Evict-to-Add

**Branch**: `002-item-slots` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-item-slots/spec.md`

## Summary

Extend `001-core-loop`'s single accept/decline item into a flat, generic N-slot build (illustrative N=3): a fixed placeholder sequence of 5 single-item offers, each accepted into an open slot or — once full — accepted by evicting a currently-held item, or declined outright. This is a **migration**, not a greenfield addition: `Build` changes from a single optional item to a list of 0..N held items, and the contest-resolution core, sample content, and both prepare/result scenes all change to match. The new slot/eviction rules are implemented as their own framework-free, strictly-TDD'd module (`src/simulation/slots.ts`), matching `resolveContest`'s existing testing discipline.

## Technical Context

Unchanged from `001-core-loop` — same stack, same discipline. Restated briefly:

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged)

**Storage**: N/A — still no backend; the item pool and ghost remain static content bundled with the client.

**Testing**: Vitest, strict TDD for `src/simulation/` (now covering both `contest.ts` and the new `slots.ts`); presentation code (`src/scenes/`) remains lightly/manually tested, per the constitution's simulation-only testing decision.

**Target Platform**: Web (unchanged). Mobile-via-Capacitor remains a later milestone, untouched by this feature.

**Project Type**: Single-project web game client (unchanged) — this feature modifies existing files more than it adds new ones (see Project Structure).

**Performance Goals**: Unchanged — contest resolution is still instant; the prepare phase's 5-round loop is turn-paced, not real-time, so no new performance profile is introduced.

**Constraints**:
- All constraints from `001-core-loop`'s plan carry forward unchanged (no live multiplayer, no player input during a contest, no purchasable outcome-affecting content, framework-free simulation core, internal time-series retained).
- New: the slot-capacity and eviction rules MUST live in `src/simulation/` (framework-free, strictly TDD'd), not inside `PrepareScene` — matching how `resolveContest` was kept separate from presentation in `001-core-loop`.
- New: `resolveContest` MUST continue to receive only the *final* build (car + final held items), never the sequence of accept/evict decisions that produced it — this is what makes Success Criteria SC-004 (order-independence) true by construction rather than by extra logic.

**Scale/Scope**: Unchanged — solo/small-team, single feature slice, no concurrent-user concerns. The prepare phase's offer sequence is a fixed, deterministic 5-item cycle through the illustrative pool (not randomized) — a plan-level simplification, not a design decision about how offers work long-term (see research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | All accept/decline/evict decisions happen during the (now multi-round) prepare phase; the contest itself is still triggered once and resolves instantly with no input surface, unchanged from 001. |
| II. Fairness | PASS | No monetization; nothing to violate. |
| III. Transparency & Legibility | PASS | User Story 3 requires the full held-item list and remaining slot count to be plainly displayed at any point — no inferred state. |
| IV. Spectation-First | DEFERRED, not violated | Still no live/broadcast presentation (carried from 001's deferral); showing held items as a plain, glanceable list is a down payment on this principle without implementing it. |
| V. Build Testing Access as Core | DEFERRED, not violated | Still no retesting/"test day" mechanic — unchanged from 001's deferral. |
| VI. Async-First Architecture | PASS | Still one fixed sample ghost, no live opponent. |
| Product Constraints — Visual medium | PASS | Still Phaser 2D. |
| Product Constraints — Spec series | PASS | Flat slot cap identical for every team is a direct, stronger expression of "differentiation from a shared baseline," not a departure from it. |
| Development Workflow | PASS | Small vertical slice; explicitly deferred the much larger run/encounter system rather than scope-creeping this feature (see spec.md Assumptions, `specs/DEFERRED.md`). |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract introduce nothing that changes the table above. The order-independence guarantee (SC-004) is achieved structurally — `resolveContest`'s signature never accepts history, only a final `Build` — so there was no design pressure to compromise Principle I to get it.

## Project Structure

### Documentation (this feature)

```text
specs/002-item-slots/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── simulation-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

This feature **modifies** most of `001-core-loop`'s files rather than only adding new ones. Existing files are marked (MODIFIED); new files are marked (NEW).

```text
src/
├── simulation/
│   ├── types.ts           (MODIFIED) — Build becomes { car, heldItems: OfferedItem[] }
│   ├── build.ts           (MODIFIED) — resultingTime sums all heldItems' modifiers
│   ├── contest.ts         (MODIFIED) — internals unchanged in spirit, adapts to new Build shape
│   └── slots.ts           (NEW) — pure slot-capacity/eviction rules; strict TDD, same as contest.ts
├── content/
│   └── sample-data.ts     (MODIFIED) — single OFFERED_ITEM becomes an ITEM_POOL of 4-5 items
├── scenes/
│   ├── PrepareScene.ts     (MODIFIED) — 5-round offer loop; accept/decline/evict-swap interaction
│   ├── ContestScene.ts     (MODIFIED) — passes the final multi-item Build through, otherwise unchanged
│   ├── ResultScene.ts      (MODIFIED) — shows the held-items list alongside times/gap/outcome
│   └── resultFormatting.ts (MODIFIED) — held-items list formatting replaces single-item comparison labels
└── main.ts                (unchanged)

tests/
├── unit/
│   ├── contest.test.ts     (MODIFIED) — updated for multi-item Build
│   └── slots.test.ts       (NEW) — strict TDD against src/simulation/slots.ts
└── integration/
    └── result-scene.test.ts (MODIFIED) — held-items list formatting
```

**Structure Decision**: Slot-capacity and eviction rules get their own framework-free module (`src/simulation/slots.ts`), held to the same strict-TDD standard as `contest.ts`, rather than being folded into `PrepareScene` — keeping the constitution's "simulation logic only" testing boundary meaningful as the simulation layer grows past a single function.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
