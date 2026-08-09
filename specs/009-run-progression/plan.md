# Implementation Plan: Run Progression - Encounter Structure

**Branch**: `009-run-progression` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-run-progression/spec.md`

## Summary

Replace the five-offer prepare placeholder with a six-stage run: four stored,
random one-of-two choices among Parts Supplier, Reward Draft, and Sponsor
Meeting, with deterministic 10- and 12-lap PvP stages after choices two and
four. A new framework-free run state machine owns stage generation, encounter
completion, credits, sponsor contracts, and immutable history. Existing draft,
slot/storage, contest, playback, and result behavior is reused through explicit
inputs; Phaser scenes only render state and dispatch pure transitions.

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: In-memory Phaser scene data only. Cross-session persistence is out
of scope; generated choices, stock, contracts, and target thresholds are stored
in the active `Run` so scene re-rendering never regenerates them.

**Testing**: Vitest. Strict test-first coverage for new and changed
`src/simulation/` behavior; focused integration tests for scene-flow formatters
and manual browser validation for Phaser interaction/presentation.

**Target Platform**: Desktop web browser (existing pointer-driven prototype)

**Project Type**: Single-project 2D web game client

**Performance Expectations**: Run transitions remain synchronous and outside
the animation loop; no additional work is performed per animation frame beyond
the shipped playback path. Browser validation checks for visible playback
regressions without introducing a timing benchmark into this prototype slice.

**Constraints**:
- Preserve pure deterministic contest resolution and playback for identical
    build, ghost, and lap count; randomness is injected only into run/offer generation.
- Preserve 3 board slots, 3 storage slots, eviction/movement behavior,
  active-while-stored semantics, duplicate copies, and 75/25 weighted drafts.
- Contest remains input-free after start and uses the existing fixed ghost,
  playback, item callouts/tooltips, and result review.
- Every encounter instance has a stable ID and can complete at most once.
- Credits are integer, run-scoped, auditable, and never negative.
- The alternate-1901 inaugural championship theme is established, but this
    feature does not include a theme-wide content or art conversion.
- Build Testing Access is not approximated in 009. It is the explicit,
  mandatory immediate follow-up feature and release-sequencing gate.

**Scale/Scope**: One local player, one active run, six stages, four encounter
types, 15 existing item definitions with authored prices, one active sponsor
contract maximum, and two PvP results per run.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | All encounter, build, and contract choices happen before PvP. `resolveContest` still fixes the complete result before read-only playback; no race input is added. |
| II. Fairness | PASS | Credits are earned and spent only inside a run. No monetization or paid competitive advantage is introduced. |
| III. Transparency & Legibility | PASS | Run stage, choices, prices, balance, exact sponsor target, contract progress/outcome, purses, and ordered history are visible. Existing race/result attribution remains intact. |
| IV. Spectation-First | PASS | The shipped race visualizer and result review are reused. Variable lap count changes duration data, not the presentation contract. |
| V. Build Testing Access | PASS WITH MANDATORY FOLLOW-UP | The constitution intentionally leaves the mechanism open. Per the finalized spec, 009 does not ship a misleading partial interaction; Build Testing Access is the immediate next feature and must be completed before this progression slice is treated as a broader release boundary. |
| VI. Async-First Architecture | PASS | PvP continues to use the fixed recorded ghost. No live opponent, matchmaking, or synchronous service is introduced. |
| Product - 2D medium | PASS | All UI remains Phaser 2D. |
| Product - mechanical parity and vehicle topology | PASS | This feature preserves equal total capacities and the current generic-slot placeholder. It neither implements nor blocks the separately specified Power/Chassis/Flex topology. |
| Product - theme | PASS | Supplier, Sponsor Meeting, Reward Draft, and PvP fit the inaugural championship; a full content/art conversion remains outside this feature. |
| Development Workflow | PASS | This is a bounded vertical slice; phase-two encounters and Build Testing Access have explicit follow-up addresses rather than partial implementations. |

No constitutional violations require Complexity Tracking entries.

**Post-Phase-1 re-check**: The data model and run contract keep all player
decisions outside contests, make contest outputs immutable inputs to economy and
sponsor resolution, and preserve a framework-free deterministic core. The gate
statuses above remain unchanged. The mandatory Build Testing Access follow-up
remains the only release-sequencing risk.

## Project Structure

### Documentation (this feature)

```text
specs/009-run-progression/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── run-contract.md
└── tasks.md             # Phase 2 output only; not created by this command
```

### Source Code (repository root)
```text
src/
├── main.ts                         (MODIFIED) - boot/register run flow
├── content/
│   └── sample-data.ts              (MODIFIED) - authored item prices
├── simulation/
│   ├── types.ts                    (MODIFIED) - price, variable-lap result types
│   ├── run.ts                      (NEW) - stage schedule and guarded transitions
│   ├── encounters.ts               (NEW) - choices, offers, economy, sponsors
│   ├── contest.ts                  (MODIFIED) - explicit lap-count input
│   ├── laps.ts                     (MODIFIED) - explicit lap-count input
│   ├── playback.ts                 (MODIFIED) - explicit schedule lap count
│   └── draft.ts, slots.ts,
│       storage.ts, buffs.ts         (REUSED; behavior unchanged)
└── scenes/
    ├── RunScene.ts                 (NEW) - progress, choices, sponsor, summary
    ├── PrepareScene.ts             (MODIFIED) - reward/supplier acquisition UI
    ├── ContestScene.ts             (MODIFIED) - run context and stage lap count
    ├── ResultScene.ts              (MODIFIED) - inspect result, continue run
    └── item/result/contest
        formatting and visuals      (REUSED)

tests/
├── unit/
│   ├── run.test.ts                 (NEW)
│   ├── encounters.test.ts          (NEW)
│   ├── contest.test.ts             (MODIFIED)
│   ├── laps.test.ts                (MODIFIED)
│   ├── playback.test.ts            (MODIFIED)
│   └── existing simulation tests   (REGRESSION)
└── integration/
    ├── run-flow.test.ts            (NEW, pure scene-boundary flow)
    └── result-scene.test.ts         (MODIFIED only if labels change)
```

**Structure Decision**: Continue the architecture established by specs 001-008:
framework-free, strictly tested domain rules in `src/simulation/`, with Phaser
scenes limited to rendering and dispatch. `run.ts` owns progression and
exactly-once guards; `encounters.ts` owns generated offers, credit transactions,
and sponsor evaluation. `RunScene` is the top-level route/status surface,
`PrepareScene` retains the shipped board/storage interaction for item-bearing
encounters, and the existing Contest -> Result presentation remains intact.

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
