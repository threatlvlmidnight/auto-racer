# Season Schedule Contract

This contract defines the framework-free schedule shape and its
downstream integration guarantees. Exact TypeScript names may follow
repository conventions, but these inputs, outputs, and invariants are
binding.

## 1. Schedule Shape Contract

```ts
function createStages(runId: string): RunStage[];
```

Binding behavior:

- MUST return exactly 12 entries, in the fixed order: choice, choice,
  pvp, choice, choice, pvp, choice, choice, pvp, choice, choice, pvp
  (FR-001).
- `choiceOrdinal` values MUST be exactly `1` through `8`, in order,
  across the 8 choice-kind entries.
- `pvpOrdinal` values MUST be exactly `1` through `4`, in order, across
  the 4 pvp-kind entries (FR-002).
- Every pvp-kind entry MUST have a defined `lapCount` (FR-003, SC-002).
- The 12th (final) entry MUST be pvp-kind — a season always ends on a
  race, never a choice stage (FR-001, US1 Acceptance Scenario 1).
- Only the first entry's `state` MUST be `"available"`; every other
  entry's `state` MUST be `"unavailable"` — unchanged from today's
  `createStages` behavior, just applied across 12 entries instead of 6.

## 2. Type Domain Contract

```ts
interface RunStage {
  choiceOrdinal?: number;             // unchanged type
  pvpOrdinal?: 1 | 2 | 3 | 4;          // widened
  lapCount?: 10 | 12 | 14 | 16;        // widened
}
```

Binding behavior:

- `pvpOrdinal` and `lapCount` MUST widen as shown — any code that
  exhaustively switches over either type (a `switch` with no `default`,
  or an exhaustiveness-checked conditional) MUST be updated to handle
  every new value explicitly, never silently fall through.
- `choiceOrdinal` requires no type change — only its authored runtime
  range grows (Research Decision 2).

## 3. Completion Contract

```ts
function advanceRun(run: Run, rng: RandomSource): Run; // unchanged signature and logic
```

Binding behavior:

- MUST continue to set `status: "completed"` only when
  `run.stageIndex + 1 >= run.stages.length` — no hardcoded reference to
  `6` or `12` may be introduced here; the existing length-derived check
  is sufficient and MUST NOT be replaced with a literal (SC-004).

## 4. Cross-Feature Non-Interference Contract

- `012-multi-ghost-contest`'s rival-profile-by-level resolution MUST
  resolve a valid rival build for `pvpOrdinal` values `3` and `4`
  without any change to its own resolution logic (FR-005, SC-003).
- The existing sponsor `"win-next-race"`/`"target-race-time"`
  next-PvP-stage lookup MUST correctly find the next pvp-kind stage
  regardless of how many pvp-kind stages already occurred earlier in
  the run, without any change to its own scan logic (FR-005, Edge
  Cases).
- `013-race-spectacle`'s deterministic track-selection formula MUST
  produce a defined result for `pvpOrdinal` values `3` and `4` without
  any change to its own formula, once that feature is implemented
  (FR-005, SC-003).
- No function introduced or modified by this feature may accept or read
  more than one player's `Run` — single-run scope only, consistent with
  Constitution Principle I.

## 5. Non-Interference Requirements

- Every existing test asserting `createStages`'s ordinal/lapCount values
  for positions 1 through 6 MUST be updated to the new 12-entry shape,
  not left asserting a now-truncated schedule — including
  `tests/fixtures/practice-run-fixtures.ts:28-33`'s duplicated array.
- `src/scenes/RunScene.ts`'s shape guard MUST accept every run produced
  by `createRun` and reject any `run.stages` array not of length 12.
- `runPresentation.ts`'s stage-progress label requires no change — it
  already derives from `run.stages.length` dynamically.
