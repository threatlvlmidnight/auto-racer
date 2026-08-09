# Implementation Plan: Count-Synergy Buff — A Third Buff Kind

**Branch**: `007-count-synergy-buff` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-count-synergy-buff/spec.md`

## Summary

Add a third buff kind — count-synergy — whose applied boost is `perItemRate × (count of other held direct items sharing its tag, anywhere in board or storage, active or inert)`. This is a small, purely additive extension of `005-lap-tick-simulation`'s existing buff machinery: `OfferedItem.buff` gains an optional `perCount` flag, `buffs.ts`'s `computeBoostsForLap` gains a new "all held items" input (needed because the count spans inert storage, which the existing `activeItems` set deliberately excludes), and one new pool item demonstrates it. `006-race-visualizer`'s existing `contribution`-based callout/breakdown pipeline and `isFlatBuff` classification already accommodate this new kind with zero changes — confirmed by inspection, not assumption. No scene file is touched; the only presentation change is one formatter function's phrasing.

## Technical Context

Unchanged from `006-race-visualizer` except where noted below.

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3, Vite (unchanged). This feature touches no Phaser code at all — confirmed by inspection: `resultFormatting.ts`'s `itemEffectLabel` is the only presentation-layer change, and it's a pure function already exercised without a Phaser canvas (`tests/integration/result-scene.test.ts`).

**Storage**: N/A — unchanged.

**Testing**: Vitest, strict TDD for `src/simulation/` (`buffs.ts`, `laps.ts` extensions), matching the constitution's resolved testing-discipline decision. `resultFormatting.ts`'s new branch is lightly tested via `tests/integration/result-scene.test.ts`, same tier as every other formatter function there.

**Target Platform**: Web (unchanged) — moot, no visual changes.

**Project Type**: Single-project web game client (unchanged) — this feature modifies `src/simulation/types.ts`/`buffs.ts`/`laps.ts`, `src/content/sample-data.ts`, and `src/scenes/resultFormatting.ts` only.

**Performance Goals**: Unchanged — one extra `Array.filter` per count-synergy buff per lap is trivial.

**Constraints**:
- All constraints from `006-race-visualizer`'s plan carry forward unchanged (framework-free simulation core, no live multiplayer, no player input during a contest).
- New: `computeBoostsForLap`'s signature grows a new `allHeldItems: OfferedItem[]` parameter (all held board+storage items, unconditionally) — a breaking change to its existing contract, since the count spans inert storage items that the existing `activeItems` parameter deliberately excludes. `laps.ts`'s one call site must be updated to build and pass this new array.
- New: the counting logic (which other held items qualify) MUST be a single shared, exported pure function (`matchingDirectItemCount`) used by both `computeBoostsForLap` (to size the boost) and `laps.ts` (to display the buff's own `contribution`) — avoiding the same filter expression existing in two places and silently drifting apart.
- New: the existing `boostsByTag`-application gate (a buff only actually applies to `boostsByTag` if at least one *active* direct item shares its tag) is unchanged and still evaluated against `activeItems`, not `allHeldItems` — only the *count that sizes the boost* uses the broader set; whether that boost is actually consumed by anything is still governed by the existing active-item rule.

**Scale/Scope**: Unchanged solo/small-team scope. One new field on `OfferedItem.buff`, one new pool item, one formatter branch. No scene, no new module, no new constant.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Board/storage composition is already locked before a contest starts (unchanged since 002/004) — this feature only changes how a *fixed* composition translates into a boost value, introducing no new decision point during the contest phase. |
| II. Fairness | PASS | No monetization; nothing to violate. |
| III. Transparency & Legibility | PASS | This is arguably this feature's central point: FR-009/User Story 2 exist specifically because a naive display ("+2%") would misrepresent a mechanism whose real value depends on board/storage composition — exactly the "modifier that changes the outcome but cannot be seen or explained" failure mode Principle III calls a bug. |
| IV. Spectation-First | PASS (already satisfied by `006-race-visualizer`) | Unaffected — no new visual surface, and the existing callout/breakdown pipeline already carries whatever `contribution` value this feature computes. |
| V. Build Testing Access as Core | DEFERRED, not violated | Unaffected — still open, tracked separately. |
| VI. Async-First Architecture | PASS | Unaffected — no ghost/opponent changes. |
| Product Constraints — Visual medium | PASS | No visual changes at all. |
| Product Constraints — Spec series | PASS | Still the same shared baseline car and flat slot capacities for every team; this is item content, not a container or identity change. |
| Development Workflow | PASS | A small, disciplined vertical slice — combining count-scaling with stacking, and the more ambitious specific item-pairing idea, are both explicitly deferred (spec.md Assumptions, `specs/DEFERRED.md`) rather than folded in. |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md and the updated simulation contract confirm the count computation is a pure function of already-fixed build state (no hidden mutation, no per-lap variance since composition can't change mid-contest) — determinism and order-independence hold by construction, same as every prior buff kind. Table above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/007-count-synergy-buff/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

This is the smallest feature since `003-item-pool-draft` — no scene file changes at all. Existing files are marked (MODIFIED); new files are marked (NEW, none this time).

```text
src/
├── simulation/
│   ├── types.ts (MODIFIED) — OfferedItem.buff gains perCount?: boolean
│   ├── buffs.ts (MODIFIED) — computeBoostsForLap gains allHeldItems param + perCount branch; new exported isCountSynergyBuff, matchingDirectItemCount
│   ├── laps.ts  (MODIFIED) — builds allHeldItems (board+storage, unconditional) alongside the existing activeItems; passes both to computeBoostsForLap; computes a count-synergy buff's firedItems contribution via matchingDirectItemCount
│   └── contest.ts, playback.ts, draft.ts, slots.ts, storage.ts (unchanged)
├── content/
│   └── sample-data.ts (MODIFIED) — one new count-synergy item added to ITEM_POOL
└── scenes/
    ├── resultFormatting.ts (MODIFIED) — itemEffectLabel branches on isCountSynergyBuff for "per item held" phrasing instead of a flat percentage; PrepareScene/ResultScene need no changes since both already call through this one formatter
    ├── PrepareScene.ts, ResultScene.ts, ContestScene.ts, contestFormatting.ts (unchanged) — confirmed by inspection: all item-effect text flows through resultFormatting.ts's itemEffectLabel, and isFlatBuff (unchanged) already classifies a no-cooldown count-synergy buff correctly for callout exclusion

tests/
├── unit/
│   ├── buffs.test.ts    (MODIFIED) — perCount boost computation, zero-count inertness, isCountSynergyBuff, matchingDirectItemCount
│   ├── laps.test.ts     (MODIFIED) — count-synergy contribution in firedItems, inert-storage items still counted
│   ├── contest.test.ts  (MODIFIED) — SC-003's end-to-end outcome comparison (active receiver + inert item present vs. absent)
│   ├── item-pool.test.ts (MODIFIED) — pool includes at least one count-synergy item
│   └── draft.test.ts, slots.test.ts, storage.test.ts, playback.test.ts, contestFormatting.test.ts (unchanged)
└── integration/
    └── result-scene.test.ts (MODIFIED) — new "per item held" label phrasing
```

**Structure Decision**: No new `src/simulation/` module — this extends `buffs.ts` (already the module owning flat-vs-stacking buff semantics) rather than introducing a fourth file, since the new logic is genuinely part of the same "what does a buff currently contribute" responsibility, just a third branch alongside the existing two. `matchingDirectItemCount` is exported from `buffs.ts` specifically so `laps.ts` can reuse the exact same counting logic for display purposes rather than re-deriving it.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
