# Implementation Plan: Build Testing Access - Test Day

**Branch**: `011-build-test-day` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-build-test-day/spec.md`

## Summary

Add an unscored Test Day route to eligible preparation surfaces without adding a
stage or encounter to the fixed six-stage run. Starting practice creates an
immutable, presentation-owned `PracticeSession` from the current build and the
fixed `ghost-001`/5.85-second/10-lap configuration, resolves it through the
existing pure `resolveContest` and playback modules, and presents it through
dedicated responsive practice Contest and Result scenes. Those scenes do not
import scored settlement, so practice cannot call `completePvpEncounter`; return
routing, including cancel/exit during active playback, restores the exact origin
preparation scene and navigation state with the same `Run` value. Pure practice
selectors expose complete lap,
item, buff, storage, clamp, and zero-contribution evidence from the locked
result. A single normalized contest/evidence projection proves repeated-practice
and direct authoritative resolver/playback equality, while canonical recovery,
protected-state, and reconciliation suites provide the retained evidence required
to unblock feature 010 T001.

## Technical Context

**Language/Version**: TypeScript 5.5 (ES2022 modules)

**Primary Dependencies**: Phaser 3.80.1, Vite 5.4; existing framework-free simulation modules

**Storage**: In-memory `Run` scene data; latest-two comparison is memory-only; a versioned, temporary `sessionStorage` recovery capsule preserves the unchanged origin run/route only while practice is active and is never scored history

**Testing**: Vitest 2.0.5 with strict red-green-refactor for new/changed simulation and practice contracts; focused scene-boundary integration tests; browser/manual viewport and input validation

**Target Platform**: Modern desktop and mobile browsers at 1920x1080, 1366x768, 1024x768, and 390x844

**Project Type**: Single-project 2D browser game

**Performance Goals**: Synchronous deterministic resolution for a 10-lap practice contest; during browser acceptance, practice resolution and presentation controls must not create a reproducible input-blocking task of 100 ms or longer, measured with browser Performance tooling under the required acceptance flows; 100 identical resolutions per controlled snapshot with exact structural equality of the defined deterministic projection

**Constraints**: No outcome-changing contest input; no live/network dependency; no `Run` mutation; no scored settlement or analytics; no horizontal page scroll; 14px supporting text and 16px interactive labels minimum; reduced motion may alter presentation only

**Scale/Scope**: One fixed sample rival, one fixed 10-lap practice configuration, latest two completed sessions per active run, three origin categories (run hub, acquisition, and PvP briefing) represented by four concrete entry contexts (run hub, Supplier, Reward Draft, and pre-start PvP briefing), dedicated practice scenes over shared pure contest/playback modules, and focused pure/integration/browser evidence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*GATE: PASS before Phase 0. Re-checked after Phase 1: PASS.*

| Principle / constraint | Gate result | Plan evidence |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Test Day starts only from stable preparation, locks all inputs before resolution, and accepts presentation-only controls during playback. |
| II. Fairness | PASS | Practice has no purchases, rewards, penalties, monetization, or scored effect. |
| III. Transparency & Legibility | PASS | Immutable contribution evidence reconciles every lap and final total, including buffs, storage-active effects, zero effects, and minimum-time clamps. |
| IV. Spectation-First | PASS | Practice reuses the authoritative playback schedule and augments it with non-hover inspectable evidence rather than creating a simplified estimate. |
| V. Build Testing Access | PASS | This feature is the required pre-commit, low-stakes deterministic Test Day and retains automated/browser acceptance evidence. |
| VI. Async-First Architecture | PASS | The only rival is the local disclosed `ghost-001`; there is no matchmaking or network dependency. |
| 2D medium and mechanical parity | PASS | Phaser 2D presentation and existing shared baseline/build rules are unchanged; feature 010 topology behavior is not invented. |
| Development workflow | PASS | Feature follows Spec Kit planning and resolves testing discipline as strict TDD for all simulation/practice contracts, with focused integration and browser validation for scenes. |

No constitutional violations or justified exceptions are present. This PASS is a
design-time result, not implementation acceptance: any failed projection or
direct-authority equality, reconciliation, recovery integrity, protected-state
equality, accessibility/viewport, or phase-integrity row makes the retained gate
FAIL and leaves feature 010 T001 blocked.

## Project Structure

### Documentation (this feature)

```text
specs/011-build-test-day/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── test-day-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
├── content/
│   └── sample-data.ts             # existing ghost-001 definition
├── simulation/
│   ├── contest.ts                 # existing authoritative pure resolver; reused
│   ├── laps.ts                    # extend immutable effect evidence at computation source
│   ├── playback.ts                # existing pure playback schedule/frame facts; reused
│   ├── practice.ts                # new availability/session/snapshot/evidence/comparison contracts
│   ├── practiceRecovery.ts        # canonical recovery codec, checksum, typed failures
│   ├── run.ts                     # six-stage model and scored settlement remain unchanged
│   └── types.ts                   # additive contest evidence types where computation requires them
└── scenes/
    ├── RunScene.ts                # Test Day access at run hub/PvP briefing
    ├── PrepareScene.ts            # stable acquisition access and origin restoration
    ├── TestDayScene.ts            # unscored briefing, unavailable, and recovery entry
    ├── PracticeContestScene.ts    # responsive playback over shared pure schedule/facts
    ├── PracticeResultScene.ts     # evidence, comparison, repeat, and return only
    ├── ContestScene.ts            # existing scored presentation; unchanged except shared helpers if useful
    ├── ResultScene.ts             # existing scored settlement route; unchanged
    ├── practicePresentation.ts    # pure labels, evidence rows, comparison, responsive model
    ├── runPresentation.ts         # scored boundary retained; practice routing kept separate
    └── demoTheme.ts               # accessible button/focus/touch behavior as needed

tests/
├── fixtures/
│   ├── practice-fixtures.ts       # empty/direct/buff/tie/clamp inputs
│   └── practice-run-fixtures.ts   # four entry contexts and protected origins
├── integration/
│   ├── test-day-boundaries.test.ts # direct authority and zero-settlement boundary
│   ├── test-day-flow.test.ts      # routing, active-playback exit, mode separation
│   ├── test-day-recovery.test.ts  # canonical capsule and typed failures
│   └── run-flow.test.ts           # scored flow regression
└── unit/
    ├── practice.test.ts           # snapshots, reconciliation, comparison
    ├── practice-determinism.test.ts # projection repeats/direct equivalence
    ├── practice-protected-state.test.ts # protected mutation detection
    ├── practiceRecovery.test.ts   # canonical serialization/checksum validation
    ├── laps.test.ts               # complete contribution evidence
    ├── playback.test.ts           # presentation controls cannot alter facts
    └── practicePresentation.test.ts
```

**Structure Decision**: Preserve the repository's framework-free simulation and
thin Phaser scene pattern. `practice.ts` owns immutable practice-only domain
state and pure validation; it does not extend `Run`, `RunStage`, `EncounterType`,
or `RunHistoryEntry`. Dedicated practice scenes reuse `resolveContest`,
`buildPlaybackSchedule`, and shared render helpers but never import
`completePvpEncounter` or `continueRunFromResult`; the existing scored scenes
retain sole settlement authority. New effect evidence is emitted by `laps.ts`,
where values are computed, and is only formatted by presentation selectors.
Practice scenes use actual scale dimensions and intentional vertical flow rather
than the fixed 800x450 layout, preserving final CSS-pixel text and touch targets
at 390x844 without broad visual-overhaul work. The latest-two comparison cache is
keyed by run ID outside `Run` and is cleared on run mismatch/end/unavailable. A
temporary versioned recovery capsule is written before practice navigation and
cleared after return. `practiceRecovery.ts` canonically serializes all protected
origin/preparation fields, the snapshot, route origin, and fixed config, then
uses a versioned FNV-1a 64-bit integrity checksum. Typed version, fingerprint,
and payload mismatches route to an explicit unavailable state and never create a
replacement run. The checksum detects accidental corruption and stale/mixed
payloads but is not an authentication or security boundary.

## Complexity Tracking

No entries: all constitution gates pass without exception.
