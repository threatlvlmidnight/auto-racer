# Phase 1 Data Model: Core Loop — Baseline Build vs. Sample Ghost

Entities are deliberately minimal and illustrative, per spec Assumptions: the
real item/component catalog and car property taxonomy are a later feature's
responsibility. These shapes exist to make this feature buildable and testable,
not to define the game's real content model.

## SpecCar (Baseline Car)

The one shared starting point every build derives from in this feature.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Constant for this feature — only one baseline car exists. |
| `baseTime` | `number` (seconds) | The finishing time this car produces with no item applied. Illustrative value, not tuned game balance. |

## OfferedItem

The single item presented during the prepare phase (Clarification Q3).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Identifies the one illustrative item this feature ships. |
| `name` | `string` | Display label only — theme is undecided (constitution TODO(THEME)), so this is a placeholder name. |
| `timeModifier` | `number` (seconds, may be negative or positive) | Applied to `SpecCar.baseTime` if accepted. Negative = faster/better; positive = worse — both must be supported (Edge Case: accepting can make the build worse). |

## Build

The baseline car plus the player's accept/decline decision.

| Field | Type | Notes |
|---|---|---|
| `car` | `SpecCar` | Always the one shared baseline in this feature. |
| `itemAccepted` | `boolean` | The prepare-phase decision (FR-002). |
| `resultingTime` | `number` (seconds) | Derived: `car.baseTime + (itemAccepted ? item.timeModifier : 0)`. Computed by the simulation module, not stored/authored directly. |

## SampleGhost

A fixed, non-live recorded opponent (Clarification: hand-authored, not another
player's data).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Identifies this feature's one sample ghost. |
| `finishingTime` | `number` (seconds) | Fixed value this feature's ghost produces every time — deterministic (Success Criteria SC-003). |

## ContestResult

The output of resolving a contest — the simulation module's public return shape,
and the object the presentation layer renders.

| Field | Type | Notes |
|---|---|---|
| `playerTime` | `number` | `Build.resultingTime`. |
| `ghostTime` | `number` | `SampleGhost.finishingTime`. |
| `gap` | `number` | `playerTime - ghostTime`, signed. |
| `outcome` | `"win" \| "loss" \| "tie"` | `"tie"` when `gap === 0`; per FR-011, a tie is recorded as a win for **both** sides at the presentation layer, not resolved to a single winner here. |
| `itemAccepted` | `boolean` | Carried through from `Build`, so the result view can show the qualitative baseline-vs-modified comparison (FR-007) without recomputing a second contest. |
| `timeline` | `TimelineFrame[]` | Internal time-series representation of the race (plan.md Constraints — Spectation-First forward-compatibility). Not rendered by this feature; exists so a future live-playback feature can consume it without changing the simulation core. |

### TimelineFrame (internal, not surfaced in this feature's UI)

| Field | Type | Notes |
|---|---|---|
| `t` | `number` (seconds elapsed) | |
| `playerPosition` | `number` | Abstract progress value (e.g., 0–1 or distance) — exact representation is an implementation detail of the simulation module. |
| `ghostPosition` | `number` | Same shape as `playerPosition`, for the ghost. |

## State / Lifecycle

A contest has exactly two states in this feature, matching FR-003 and FR-010:

1. **Not started** — prepare phase; `itemAccepted` can still change.
2. **Resolved** — `resolveContest(build, ghost)` has been called; a `ContestResult`
   exists; nothing about it can change. There is no "running" state with a live
   input surface in this feature (instant computation, per Clarification Q1).

## Validation Rules

- `SpecCar.baseTime` and `SampleGhost.finishingTime` MUST be fixed, non-random
  values for this feature (Success Criteria SC-003 — determinism).
- `resolveContest` MUST be a pure function: identical `Build`/`SampleGhost` inputs
  MUST always produce an identical `ContestResult`, including `timeline`.
- `outcome` MUST be derived only from `gap`; no other field may influence it.
