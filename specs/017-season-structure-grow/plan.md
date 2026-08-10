# Implementation Plan: Season Structure Growth

**Branch**: `017-season-structure-grow` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-season-structure-grow/spec.md`

## Summary

Replace `run.ts`'s hardcoded 6-entry `createStages` definitions array
with a 12-entry array following the same [choice, choice, pvp] shape
repeated four times instead of two. Widen `RunStage.pvpOrdinal` from
`1 | 2` to `1 | 2 | 3 | 4` and `RunStage.lapCount` from `10 | 12` to a
4-value progression; `choiceOrdinal` needs no type change since it is
already typed `number`, only its runtime range grows to 1-8. Update the
one production call site that hardcodes the old length
(`RunScene.ts:76`'s `run.stages.length === 6` shape guard) and the one
test fixture that duplicates the stage-definitions array
(`tests/fixtures/practice-run-fixtures.ts:28-33`). No other production
code changes — every mechanism that already reads `pvpOrdinal`
(`012-multi-ghost-contest`'s rival scaling, the existing sponsor
next-PvP-stage lookup, `013-race-spectacle`'s track-selection formula)
was already written to generalize over an arbitrary ordinal and needs no
change of its own, per spec.md Assumptions.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. The season schedule is an in-memory
`Run.stages` array, the same as today.

**Testing**: Vitest. Strict test-first coverage for the changed
`src/simulation/run.ts` contract: the 12-stage schedule's exact shape,
`"completed"` status only at the 12th stage, and every existing
`RunStage`-consuming test (sponsor-objective lookup, run-flow
integration) re-verified at the new length. Focused regression coverage
for `RunScene.ts`'s shape guard and `tests/fixtures/practice-run-fixtures.ts`.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: No new asymptotic cost — the schedule
array doubles from 6 to 12 fixed entries, still trivial to construct and
traverse.

**Constraints**:
- The 12-stage schedule is a single fixed sequence — [choice, choice,
  pvp] repeated four times — not player-configurable or randomized in
  structure (FR-001).
- `pvpOrdinal` and `lapCount` are the only `RunStage` fields requiring an
  actual TypeScript type change; `choiceOrdinal` is already `number` and
  needs no type change, only a wider runtime range (FR-002).
- No new `EncounterType` value may be introduced — every choice stage in
  the 12-stage schedule still draws from exactly the three existing
  non-PvP types (FR-004).
- `012-multi-ghost-contest`'s rival-scaling formula,
  `009-run-progression`'s sponsor next-PvP-stage lookup, and
  `013-race-spectacle`'s track-selection formula MUST NOT be modified —
  this feature only widens the ordinal domain they already operate over
  (FR-005).
- Every production and test call site that hardcodes the old 6-stage
  assumption MUST be found and updated — known today:
  `src/scenes/RunScene.ts:76` (`run.stages.length === 6` shape guard) and
  `tests/fixtures/practice-run-fixtures.ts:28-33` (a duplicated 6-entry
  stage-definitions array).
- No mechanic introduced here may vary by player entrant or purchasable
  content (FR-006, Constitution Principle II).

**Scale/Scope**: One widened array literal in `run.ts`, two narrowed
union-type widenings, one production shape-guard update, one test
fixture update, and integration re-verification against
`012-multi-ghost-contest`'s already-shipped-plan formulas (no change to
those formulas themselves expected).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Purely structural — the schedule's shape and length, not contest resolution itself; every PvP stage still resolves against a recorded ghost/rival exactly as today. |
| II. Fairness | PASS | The 12-stage schedule applies identically to every entrant, vehicle, and run (FR-006). |
| III. Transparency & Legibility | PASS | The full stage schedule remains inspectable exactly as today (`RunProgress`, `RunHistorySummary`); nothing about this feature hides or fuzzes any value. |
| IV. Spectation-First | PASS | Not touched — no change to contest presentation. |
| V. Build Testing Access | PASS | Untouched — Test Day/Practice Mode has no run-stage-progression concept. |
| VI. Async-First Architecture | PASS | No live service or synchronization introduced. |
| Product - 2D medium | PASS | No visual/presentation redesign — `runPresentation.ts`'s "Stage X of Y" label already reads `run.stages.length` dynamically, needing no change. |
| Product - mechanical parity and topology | PASS | Season length applies identically to every entrant/vehicle; no topology or capacity rule is touched. |
| Product - theme | PASS | No new vocabulary or theme decision introduced. |
| Development Workflow | PASS | Vertically sliced: the schedule-length change (US1) and cross-feature ordinal-domain correctness (US2) are each independently testable. Strict test-first applies to the changed `src/simulation/run.ts` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model widens two existing union
types and one array literal's length — both additive/widening, neither
replacing nor narrowing an existing contract. All principles above
remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/017-season-structure-grow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── season-schedule-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── simulation/
│   └── run.ts                       (MODIFIED) - createStages'
│                                       definitions array grows from 6 to
│                                       12 entries; RunStage.pvpOrdinal
│                                       widens to 1|2|3|4;
│                                       RunStage.lapCount widens to a
│                                       4-value progression
└── scenes/
    └── RunScene.ts                  (MODIFIED) - shape guard's
                                        `stages.length === 6` becomes
                                        `=== 12`

tests/
├── fixtures/
│   └── practice-run-fixtures.ts     (MODIFIED) - duplicated
│                                       stage-definitions array updated
│                                       to match the new 12-entry shape
├── unit/
│   └── run.test.ts                  (MODIFIED) - 12-stage schedule
│                                       shape, "completed" only at stage
│                                       12, widened ordinal/lapCount
│                                       values
└── integration/
    └── run-flow.test.ts             (MODIFIED) - a full 12-stage run
                                        played start to finish, plus a
                                        sponsor objective accepted at the
                                        11th (last) choice stage
```

**Structure Decision**: No new module. Every change extends
`run.ts`'s existing `createStages`/`RunStage`/`RunStatus` definitions in
place, following this feature's own "widen the type domain, don't
re-derive the formulas that read it" constraint (Technical Context).

## Delivery Order

1. Widen `RunStage.pvpOrdinal` to `1 | 2 | 3 | 4` and `RunStage.lapCount`
   to its new 4-value progression in `src/simulation/run.ts`. Test-first:
   type shape only, no behavior change yet.
2. Replace `createStages`'s 6-entry definitions array with the 12-entry
   [choice, choice, pvp] × 4 pattern in `src/simulation/run.ts`.
   Test-first: exact 12-stage shape, correct ordinals/lap counts at
   every position, `"completed"` status reachable only after the 12th
   stage.
3. Update `src/scenes/RunScene.ts`'s shape guard and
   `tests/fixtures/practice-run-fixtures.ts`'s duplicated array to the
   new 12-stage shape.
4. Run the full existing test suite; confirm every pre-existing test
   that depended on the 6-stage assumption is either already
   length-agnostic (no change needed) or has been updated to the new
   12-stage schedule — zero silently-stale assertions.
5. Add integration coverage confirming `012-multi-ghost-contest`'s
   rival-scaling formula, the sponsor next-PvP-stage lookup, and (once
   `013-race-spectacle` lands) its track-selection formula each resolve
   correctly at ordinals 3 and 4, with no change to their own code.
6. Run `npm test`, `npm run build`, `npm run lint` green.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
