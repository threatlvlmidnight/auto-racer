# Data Model: Season Structure Growth

## `RunStage` Type Widening

```ts
export interface RunStage {
  id: string;
  position: number;
  kind: "choice" | "pvp";
  choiceOrdinal?: number;              // unchanged type; range grows 1-4 -> 1-8
  pvpOrdinal?: 1 | 2 | 3 | 4;           // widened from 1 | 2
  lapCount?: 10 | 12 | 14 | 16;         // widened from 10 | 12
  state: StageState;
}
```

| Field | Change | Rules |
|---|---|---|
| `choiceOrdinal` | No type change | Already `number`; authored range in `createStages` grows from 1-4 to 1-8 (FR-002). |
| `pvpOrdinal` | Widened union | `1 \| 2` → `1 \| 2 \| 3 \| 4` (FR-002). Every consumer that switches over this type (`012-multi-ghost-contest`'s rival-level lookup, `013-race-spectacle`'s track-selection formula) MUST continue to compile and resolve correctly for the two new values without their own code changing (FR-005, Research Decision 5). |
| `lapCount` | Widened union | `10 \| 12` → `10 \| 12 \| 14 \| 16` (FR-003, Research Decision 3 — planning default, tunable). |

## `createStages` Definitions Array

The 6-entry array becomes 12 entries, following the same [choice,
choice, pvp] shape repeated four times (FR-001):

```ts
const definitions: Pick<RunStage, "kind" | "choiceOrdinal" | "pvpOrdinal" | "lapCount">[] = [
  { kind: "choice", choiceOrdinal: 1 },
  { kind: "choice", choiceOrdinal: 2 },
  { kind: "pvp", pvpOrdinal: 1, lapCount: 10 },
  { kind: "choice", choiceOrdinal: 3 },
  { kind: "choice", choiceOrdinal: 4 },
  { kind: "pvp", pvpOrdinal: 2, lapCount: 12 },
  { kind: "choice", choiceOrdinal: 5 },
  { kind: "choice", choiceOrdinal: 6 },
  { kind: "pvp", pvpOrdinal: 3, lapCount: 14 },
  { kind: "choice", choiceOrdinal: 7 },
  { kind: "choice", choiceOrdinal: 8 },
  { kind: "pvp", pvpOrdinal: 4, lapCount: 16 },
];
```

Everything downstream of this array (`id`, `position`, `state`
assignment via `.map`) is unchanged — it already derives from the
array's length and index generically, with no hardcoded bound.

## `advanceRun` / `RunStatus`

No change. `advanceRun`'s existing `nextIndex >= run.stages.length`
completion check already derives its boundary from `run.stages.length`
generically — it already sets `"completed"` only after the last stage,
whatever that length is (SC-004 is satisfied by this existing logic
alone, once the array itself grows to 12 entries).

## Non-`run.ts` Call Sites Requiring Update

| Location | Current | Required Change |
|---|---|---|
| `src/scenes/RunScene.ts:76` | `run.stages.length === 6` (shape guard) | `run.stages.length === 12` (Research Decision 4) |
| `tests/fixtures/practice-run-fixtures.ts:28-33` | A duplicated 6-entry stage-definitions array, structurally identical to `createStages`'s pre-feature array | Updated to the same 12-entry shape as the new `createStages` array, so fixture-driven tests exercise the real schedule length |

## Non-Interference Requirements

- `012-multi-ghost-contest`'s rival-profile-by-level resolution: no code
  change; must resolve a valid rival build for `pvpOrdinal` 3 and 4
  exactly as it already does for 1 and 2 (FR-005, SC-003).
- The sponsor `"win-next-race"`/`"target-race-time"` next-PvP-stage
  lookup (`run.ts`): no code change; its existing `.find(stage =>
  stage.kind === "pvp")` scan already has no hardcoded bound.
- `013-race-spectacle`'s deterministic track-selection formula
  (`(runSeed + pvpStageOrdinal) mod 3`, per that feature's own
  `data-model.md`): no code change; its domain was never limited to
  ordinals 1-2.
- `runPresentation.ts`'s `"Stage ${run.stageIndex + 1} of
  ${run.stages.length}"` label: no code change; already reads
  `run.stages.length` dynamically.
- `011-build-test-day` (Test Day / Practice Mode): entirely unaffected
  — it has its own independent stage/lap model with no dependency on
  `Run.stages`.

## Validation Invariants

1. `createStages(runId)` always returns exactly 12 entries, in the
   fixed [choice, choice, pvp] × 4 order, for every `runId` (SC-001).
2. The 4th and final `pvp`-kind entry is always the 12th (last) entry —
   a run can never reach `"completed"` before it (SC-004).
3. Every `pvp`-kind entry has both `pvpOrdinal` and `lapCount` defined
   — never `undefined` for a PvP stage (SC-002).
4. `RunScene.ts`'s shape guard accepts every run produced by
   `createRun`/`createStages` and rejects any `run.stages` array not of
   length 12 — kept in lockstep with `createStages`'s own output length
   by construction, verified by test rather than by convention alone.
