# Implementation Plan: Item Pool & Performance-Identity Draft Weighting

**Branch**: `003-item-pool-draft` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-item-pool-draft/spec.md`

## Summary

Grow `002-item-slots`'s 5-item placeholder pool into a 10-20 item catalog where each item carries an optional identity tag (`"performance"` or absent/neutral), and replace the prepare phase's fixed cyclic offer order with a weighted random draw that favors the (hardcoded, only) Performance team identity roughly 75%/25%. Introduce one new effect kind — a **buff item** that boosts other held items sharing its tag, computed once at build-resolution — as a first, minimal step into item synergy, explicitly stopping short of the fuller lap-based/cooldown simulation model the owner described (deferred to `specs/vision.md`/`specs/DEFERRED.md`). This is a migration of existing modules more than a greenfield addition, continuing 002's pattern of extending `src/simulation/` under strict TDD.

## Technical Context

Unchanged from `002-item-slots` except where noted below.

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged)

**Storage**: N/A — still no backend; the item pool and ghost remain static content bundled with the client.

**Testing**: Vitest, strict TDD for `src/simulation/` — now also covering two NEW pure modules (`draft.ts`, `buffs.ts`) alongside the existing `contest.ts`, `build.ts`, `slots.ts`. New: the weighted draw (FR-005) is inherently probabilistic, so its test strategy needs both a **determinism** test (fixed/mocked RNG input → expected output, exact) and a **distribution** test (many trials → tagged-item proportion within an explicit tolerance band around 75%, not an exact count) — see research.md.

**Target Platform**: Web (unchanged).

**Project Type**: Single-project web game client (unchanged) — this feature modifies existing simulation/content/scene files more than it adds new ones.

**Performance Goals**: Unchanged — contest resolution and the weighted draw are both synchronous and effectively instant; no new performance profile.

**Constraints**:
- All constraints from `002-item-slots`'s plan carry forward unchanged (no live multiplayer, no player input during a contest, no purchasable outcome-affecting content, framework-free simulation core, internal time-series retained, slot cap/eviction rules untouched per FR-007).
- New: the weighted draw MUST live in `src/simulation/` (framework-free, strict TDD) and MUST accept its randomness source as an injected parameter (`rng: () => number`) rather than calling `Math.random()` internally — this is what keeps FR-005/SC-002 testable deterministically instead of flaky. Production code (`PrepareScene`) supplies `Math.random`; tests supply fixed or scripted values.
- New: buff resolution (FR-009/FR-010) MUST be a pure, order-independent step ahead of/within `resultingTime` — a buff's effect depends only on which items are *held*, never on the order they were acquired or evicted, preserving `002-item-slots`'s SC-004 order-independence guarantee without extra logic to re-derive it.

**Scale/Scope**: Unchanged solo/small-team scope. Item pool grows from 5 to 10-20 items; still exactly one team identity (Performance, hardcoded) and one fixed sample ghost. The prepare phase keeps `002-item-slots`'s placeholder 5-round offer count (spec Assumptions) — only *which* item is drawn each round changes, not how many rounds there are.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Drafting, tagging, and buff pairing are all prepare-phase decisions; the contest itself still resolves once, with no input surface, unchanged from 001/002. |
| II. Fairness | PASS | No monetization; nothing to violate. |
| III. Transparency & Legibility | PASS | User Story 3 requires every item's identity tag to be visible; User Story 4 requires the buff's target tag and boost percentage to be shown as plainly as any other item's effect — the weighting itself is also visible (offers show their tag), not hidden math. |
| IV. Spectation-First | DEFERRED, not violated | No live/broadcast presentation, carried from 001/002's deferral — unchanged. |
| V. Build Testing Access as Core | DEFERRED, not violated | No retesting/"test day" mechanic — unchanged from 001/002's deferral. |
| VI. Async-First Architecture | PASS | Still one fixed sample ghost, no live opponent. |
| Product Constraints — Visual medium | PASS | Still Phaser 2D. |
| Product Constraints — Spec series | PASS | Identity continues to express itself through the draft (what's offered) and now also through one synergy item, not through the container (slot count/rules unchanged, FR-007). |
| Development Workflow | PASS | Small vertical slice; the much larger lap-based/cooldown simulation idea raised during clarify was explicitly deferred (spec.md Assumptions, `specs/vision.md`, `specs/DEFERRED.md`) rather than folded in. |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract confirm the buff-resolution step is a pure pre-pass with no dependency on acquisition order, and the weighted draw's RNG is injected rather than ambient — neither introduces hidden state or a live-input surface, so the table above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/003-item-pool-draft/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

This feature **modifies** several `002-item-slots` files and adds two new pure simulation modules. Existing files are marked (MODIFIED) or (unchanged); new files are marked (NEW).

```text
src/
├── simulation/
│   ├── types.ts           (MODIFIED) — OfferedItem gains identityTag?: IdentityTag and buff?: { boostPercent }; new IdentityTag type; new ACTIVE_IDENTITY_TAG/TAG_WEIGHT constants
│   ├── build.ts           (MODIFIED) — resultingTime applies buffs.ts's resolution pass before summing modifiers
│   ├── buffs.ts           (NEW) — pure buff-resolution step; strict TDD
│   ├── draft.ts           (NEW) — weighted item draw with injected RNG; strict TDD
│   ├── contest.ts         (unchanged) — already agnostic to which OfferedItem fields exist
│   └── slots.ts           (unchanged) — capacity/eviction rules untouched (FR-007)
├── content/
│   └── sample-data.ts     (MODIFIED) — ITEM_POOL grows from 5 to 10-20 items with tags + 1 buff item
├── scenes/
│   ├── PrepareScene.ts     (MODIFIED) — replaces `ITEM_POOL[round % length]` with `drawItem(...)`; displays identity tag + buff info per offer/held item
│   ├── ResultScene.ts      (MODIFIED) — shows each held item's identity tag alongside existing display
│   ├── resultFormatting.ts (MODIFIED) — heldItemsLabel includes identity tag
│   └── ContestScene.ts     (unchanged)
└── main.ts                 (unchanged)

tests/
├── unit/
│   ├── draft.test.ts       (NEW) — determinism under fixed rng + distribution tolerance test (FR-005/SC-002)
│   ├── buffs.test.ts       (NEW) — boost applied when tag matches, inert when it doesn't, additive stacking
│   ├── contest.test.ts     (MODIFIED) — extended for buff-affected builds (SC-005)
│   └── slots.test.ts       (unchanged)
└── integration/
    └── result-scene.test.ts (MODIFIED) — identity tag display
```

**Structure Decision**: The weighted draw (`draft.ts`) and buff resolution (`buffs.ts`) each get their own framework-free module under `src/simulation/`, held to the same strict-TDD standard as `contest.ts`/`slots.ts`, rather than being folded into `PrepareScene` or into `build.ts` directly — keeping the constitution's "simulation logic only" testing boundary meaningful as two genuinely separate concerns (what's drawn vs. what a drawn build resolves to) are added at once.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
