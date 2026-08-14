# Tasks: Race Playback Controls

**Input**: Design documents from `/specs/030-race-playback-controls/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/playback-control-contract.md`, `quickstart.md`

**Testing approach**: Test first for clock rates, monotonic speed transitions, crossed-boundary event integrity, immutable Results parity, scene-local reset, and input equivalence. Preserve all existing playback/legibility regression assertions unless a requirement explicitly supersedes them.

## Phase 1: Setup and playback baselines

**Purpose**: Lock current 20-second schedule semantics, Test Day controls, and scored-race event behavior before adding the new presentation clock.

- [X] T001 Record current scored and Test Day whole-race durations, speed controls, keyboard controls, and Results payload behavior in `specs/030-race-playback-controls/acceptance-evidence.md`
- [X] T002 [P] Add immutable two-car/eight-car result, schedule, delta-sequence, and speed-sequence fixtures in `tests/fixtures/playback-control-fixtures.ts`
- [X] T003 [P] Add pre-feature scored-race duration and schedule-boundary baselines in `tests/unit/playback-controls-baseline.test.ts`
- [X] T004 [P] Add pre-feature Test Day Pause/Skip/Cancel/focus and `1× → 2× → 4×` behavior baselines in `tests/integration/playback-controls-baseline.test.ts`
- [X] T005 Run T003-T004 before implementation and record which assertions are preserved versus intentionally superseded in `specs/030-race-playback-controls/acceptance-evidence.md`

---

## Phase 2: Foundational presentation clock and boundary evidence

**Purpose**: Establish the pure framework-free timing boundary required by every user story.

**Critical**: Blocks all scene integration.

- [X] T006 Add failing tests for the closed `normal`/`fast` speed domain, labels, multipliers, default selection, and invalid-value rejection in `tests/unit/playback.test.ts`
- [X] T007 Add failing tests proving negative/non-finite deltas are rejected, zero is idempotent, `0.5`/`1.0` advancement is monotonic, selection is idempotent, and speed changes do not jump time in `tests/unit/playback.test.ts`
- [X] T008 Add failing interval-equivalence tests proving a time-zero initialization batch emits exactly once and one large update and equivalent small updates cross the same later player-lap and car-finish boundaries exactly once in `tests/unit/playback.test.ts`
- [X] T009 Add failing deterministic ordering tests for time-zero initialization and equal-time lap, item-callout, checkpoint, car-finish, and all-finished boundaries in `tests/unit/playback.test.ts`
- [X] T010 Implement `PlaybackSpeed`, exact multipliers, immutable `PresentationClock`, and pure select/advance transitions in `src/simulation/playback.ts`
- [X] T011 Implement a one-time time-zero initialization batch followed by deterministic `(previousScheduleTime, nextScheduleTime]` player-lap and per-car finish boundary derivation in `src/simulation/playback.ts`
- [X] T012 Integrate initialization and crossed-boundary evidence with existing callout, projection, ticker, and all-finished derivation without changing contest/schedule/result inputs in `src/simulation/playback.ts`
- [X] T013 Run T006-T012 plus all existing `tests/unit/playback.test.ts` assertions and document any superseded low-frame behavior in `specs/030-race-playback-controls/acceptance-evidence.md`

**Checkpoint**: A pure clock can change rate and enumerate every immutable playback boundary without Phaser or run-state mutation.

---

## Phase 3: User Story 1 — Follow the race at a readable pace (Priority: P1) 🎯 MVP

**Goal**: Every scored and Test Day race begins at displayed `2×`, consuming existing schedules at the legacy rate while retaining `1×` as the slower option.

**Independent Test**: Watch fixed two-car and eight-car fixtures entirely at `1×`; verify approximately double legacy duration with identical schedule/result evidence and normal Results completion.

### Tests

- [X] T014 [P] [US1] Add failing whole-race timing tests proving displayed `1×` lasts `2.00 ± 0.05` legacy duration for two-car and eight-car schedules in `tests/integration/playback-controls.test.ts`
- [X] T015 [P] [US1] Add failing scene lifecycle tests proving every scored Local/Championship race initializes a fresh fast-speed clock in `tests/integration/playback-controls.test.ts`
- [X] T016 [P] [US1] Add failing Test Day lifecycle tests proving fresh playback initializes to the same fast-speed clock while Pause/Skip/Cancel remain available in `tests/integration/playback-controls.test.ts`

### Implementation

- [X] T017 [US1] Replace scored playback's raw elapsed-seconds accumulation with a fresh fast `PresentationClock` in `src/scenes/ContestScene.ts`
- [X] T018 [US1] Replace Test Day's raw speed multiplier with the shared normal `PresentationClock` while preserving Pause, Skip, Cancel, and recovery navigation in `src/scenes/PracticeContestScene.ts`
- [X] T019 [US1] Remove Test Day's legacy `4×` speed state and make Skip target the immutable schedule's finite maximum finish boundary without assigning infinity in `src/scenes/PracticeContestScene.ts`
- [X] T020 [US1] Route scored and Test Day frame queries through the clock's schedule time and crossed-boundary evidence in `src/scenes/ContestScene.ts` and `src/scenes/PracticeContestScene.ts`
- [X] T021 [US1] Run T014-T020 and verify fixed races navigate exactly once to their existing Results scenes at either selectable speed in `specs/030-race-playback-controls/acceptance-evidence.md`

**Checkpoint**: Readable `1×` works end-to-end everywhere even before the player-facing fast control is added.

---

## Phase 4: User Story 2 — Speed up a race without changing it (Priority: P1)

**Goal**: Players may switch directly between `1×` and `2×` at any time while Results and every immutable race fact remain identical.

**Independent Test**: Replay one result under representative and rapid speed sequences; compare boundary events and the exact object passed to Results against an all-`1×` control.

### Tests

- [X] T022 [P] [US2] Add failing timing tests proving all-`2×` matches `1.00 ± 0.05` legacy duration and mixed sequences produce the calculated remaining duration in `tests/integration/playback-controls.test.ts`
- [X] T023 [P] [US2] Add failing rapid/final-moment switching tests for no restart, rewind, jump, duplicate Results navigation, or post-finish mutation in `tests/integration/playback-controls.test.ts`
- [X] T024 [P] [US2] Add failing deep-equality tests comparing result, lap, item, setup, track, finish-order, outcome, and run-settlement evidence across speed sequences in `tests/integration/playback-controls.test.ts`
- [X] T025 [P] [US2] Add failing message-lifecycle tests proving event-driven replacement, deterministic same-frame ordering, no dismissal timer, no cross-frame queue, and no delayed Results transition in `tests/unit/playbackControlPresentation.test.ts`

### Implementation

- [X] T026 [US2] Add direct idempotent normal/fast selection methods that change clock rate without changing elapsed schedule time in `src/scenes/ContestScene.ts`
- [X] T027 [US2] Replace Test Day's cyclic speed method with the same direct normal/fast selections while retaining independent paused state in `src/scenes/PracticeContestScene.ts`
- [X] T028 [US2] Consume multiple crossed boundaries in deterministic order, leaving only the final same-update ticker/projection message visible and creating no message queue in `src/scenes/ContestScene.ts`
- [X] T029 [US2] Ensure callout flashes, vehicle-stat refresh, finish tracking, and Results navigation each consume crossed evidence exactly once in `src/scenes/ContestScene.ts`
- [X] T030 [US2] Ensure Test Day evidence refresh and completion consume crossed player/ghost boundaries exactly once across Pause, finite-boundary Skip, and speed changes in `src/scenes/PracticeContestScene.ts`
- [X] T031 [US2] Run T022-T030 plus contest, result, settlement, standings, sponsor, reputation, and Test Day recovery regressions; record deep-equality evidence in `specs/030-race-playback-controls/acceptance-evidence.md`

**Checkpoint**: Any speed sequence changes watch duration only; game and Results authority remain byte-for-byte equivalent.

---

## Phase 5: User Story 3 — Understand and operate the controls (Priority: P2)

**Goal**: Persistent direct `1×`/`2×` controls expose a non-color selected state and equivalent pointer, touch, and keyboard actions without covering race evidence.

**Independent Test**: At 800×450, operate both controls using pointer/touch and keys `1`/`2`; verify exactly one selected state, reset on a new race, and no overlap with existing HUD evidence.

### Tests

- [X] T032 [P] [US3] Add failing pure control-model tests for exactly two controls, labels, shortcuts, selected marker, single-selection invariant, and local reset in `tests/unit/playbackControlPresentation.test.ts`
- [X] T033 [P] [US3] Add failing scored-scene input tests for pointer/touch and keys `1`/`2`, repeated selection, handler cleanup, and inactive/completed safety in `tests/integration/playback-controls.test.ts`
- [X] T034 [P] [US3] Add failing Test Day input/focus tests proving direct `1`/`2` parity alongside existing Space/Skip/Escape/Tab behavior in `tests/integration/playback-controls.test.ts`
- [X] T035 [P] [US3] Add failing layout-model tests for the 800×450 control bounds versus track, projection, ticker, lap label, items, and vehicle-stat regions in `tests/unit/playbackControlPresentation.test.ts`

### Implementation

- [X] T036 [P] [US3] Implement pure control labels, selected marker/state, shortcut text, and fixed logical bounds in `src/scenes/playbackControlPresentation.ts`
- [X] T037 [US3] Render repeatable scored-race `1×`/`2×` controls with persistent non-color selection treatment in `src/scenes/ContestScene.ts`
- [X] T038 [US3] Register keys `1`/`2`, direct pointer/touch actions, and shutdown cleanup for scored playback in `src/scenes/ContestScene.ts`
- [X] T039 [US3] Recompose Test Day's control row to retain Cancel/Pause/Skip/focus while adding direct selected `1×`/`2×` controls within 800×450 in `src/scenes/PracticeContestScene.ts`
- [X] T040 [US3] Register Test Day keys `1`/`2`, update status text to canonical labels, and remove the legacy `F` cycle without disturbing other shortcuts in `src/scenes/PracticeContestScene.ts`
- [X] T041 [US3] Extend shared button/focus styling only as needed for persistent selected state and cleanup in `src/scenes/demoTheme.ts`
- [X] T042 [US3] Run T032-T041 and complete pointer, touch-equivalent, keyboard, focus, and fresh-race reset verification in `specs/030-race-playback-controls/acceptance-evidence.md`

**Checkpoint**: Both watched-race surfaces provide clear, direct, equivalent speed control at the canonical viewport.

---

## Phase 6: Polish and cross-cutting gates

**Purpose**: Prove timing accuracy, immutable evidence, regressions, accessibility, and scope boundaries across the assembled feature.

- [X] T043 [P] Audit `src/simulation/` for playback-speed reads outside presentation-clock code and reject speed influence on simulation/result/settlement authority in `tests/integration/playback-controls-boundaries.test.ts`
- [X] T044 [P] Audit `src/scenes/` for scored Pause/Skip, remembered speed, automatic speed, legacy `4×`/`F` controls, and overtake-dramatization scope leaks in `tests/integration/playback-controls-boundaries.test.ts`
- [X] T045 Run focused playback-control suites and all existing playback, contest, Results, race-legibility, Test Day, recovery, run, settlement, standings, reputation, setup, track, and item regressions; record results in `specs/030-race-playback-controls/acceptance-evidence.md`
- [X] T046 Run full `npm test`, `npm run lint`, and `npm run build`, accepting no new warnings or weakened assertions; record results in `specs/030-race-playback-controls/acceptance-evidence.md`
- [ ] T047 Perform browser timing/input/layout QA at 1920×1080, 1366×768, 1024×768, and 800×450 for scored Local, scored Championship, and Test Day races at both speeds in `specs/030-race-playback-controls/acceptance-evidence.md`
- [X] T048 Exercise large-frame, rapid-switch, final-boundary, Pause/Skip, fresh-race reset, and same-frame multiple-message scenarios from `quickstart.md` and record evidence in `specs/030-race-playback-controls/acceptance-evidence.md`
- [X] T049 Re-run the Constitution Check from `plan.md` against delivered code and record final PASS evidence in `specs/030-race-playback-controls/acceptance-evidence.md`
- [X] T050 Reconcile `specs/HANDOFF.md`, `specs/DEFERRED.md`, and feature 031 deployment assumptions with the delivered playback-control boundary

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 locks legacy evidence and intentional Test Day behavior.
- Phase 2 is the blocking pure timing/event foundation.
- US1 depends on Phase 2 and delivers the readable slower option plus the `2×` default.
- US2 depends on US1's scene clocks and adds direct rate changes plus evidence parity.
- US3 depends on US2's direct selection methods and adds visible/input controls.
- Phase 6 depends on all user stories.

### User-story dependency graph

```text
Foundation → US1 dual-rate playback → US2 safe switching → US3 accessible controls → Release gates
```

### Parallel opportunities

- T002-T004 establish independent fixture/scored/Test Day baselines.
- T014-T016 cover independent duration, scored lifecycle, and Test Day lifecycle behavior.
- T022-T025 cover timing, transitions, evidence parity, and message lifecycle independently.
- T032-T035 cover control model, scored input, Test Day input, and logical layout independently.
- T036 can proceed alongside scene test work after the selection contract stabilizes.
- T043-T044 are independent authority and scope audits.

## Parallel execution examples

### User Story 1

```text
T014 whole-race timing tests
T015 scored lifecycle tests
T016 Test Day lifecycle tests
```

### User Story 2

```text
T022 duration calculations
T023 transition edge cases
T024 immutable evidence equality
T025 message lifecycle
```

### User Story 3

```text
T032 pure control model
T033 scored input parity
T034 Test Day input/focus parity
T035 logical layout bounds
```

## Implementation strategy

### MVP first

Complete Phases 1-3 to support both the slower readable rate and legacy-rate playback while preserving existing results and navigation.

### Incremental delivery

1. Lock legacy schedules and Test Day utilities.
2. Add a pure scene-local presentation clock and exact boundary enumeration.
3. Deliver default `2×` pacing with direct `1×` fallback.
4. Add safe `2×` switching and evidence parity.
5. Add accessible direct controls and complete cross-cutting gates.

### Format validation

Every executable task uses the required checkbox, sequential ID, optional `[P]`, required user-story label inside story phases, and an explicit file path.
