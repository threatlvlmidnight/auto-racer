---

description: "Task list for feature implementation"
---

# Tasks: Race Visualizer — Watchable Contest Presentation

**Input**: Design documents from `/specs/006-race-visualizer/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` under strict TDD (constitution's resolved testing-discipline decision). `ContestScene.ts` is presentation-layer and validated via the owner-run quickstart, not automated tests — but it's designed to be almost entirely mechanical, so nearly all of this feature's real logic still has test coverage. `contestFormatting.ts` gets lightly-tested pure-function tests, mirroring `resultFormatting.ts`'s existing precedent.

**Organization**: Tasks are grouped by user story (spec.md: US1 and US2 are P1, US3 is P2). Foundational migrates `LapBreakdown`/`ContestResult` (extending `firedItems`, removing `timeline`) — unlike `004-board-storage-ui`/`005-lap-tick-simulation`'s own Foundational phases, this one does **not** force any scene file to stop compiling (`ContestScene.ts` never referenced the removed/changed fields directly), so there's no forced Foundational→US1 handoff gap this time.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), unchanged from `001-core-loop` through `005-lap-tick-simulation`: `src/simulation/`, `src/scenes/`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling needs before touching code

- [X] T001 Confirm no new tooling or dependencies are required — this feature uses Phaser's existing `Graphics`/shape-drawing API and per-frame `update(time, delta)` lifecycle, both already part of the `005-lap-tick-simulation` scaffold (plan.md Technical Context); no `package.json` changes needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend `LapBreakdown` with per-item contribution data and remove the now-superseded `TimelineFrame`/`ContestResult.timeline` — every user story below depends on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T003-T006.**

- [X] T002 Update `tests/unit/laps.test.ts` and `tests/unit/contest.test.ts` for `firedItems: {id, contribution}[]` replacing `firedItemIds: string[]` (contribution values for direct items, flat buffs, and stacking buffs per contracts/simulation-contract.md); remove the now-obsolete "retains the synthetic timeline" assertion; update `tests/integration/result-scene.test.ts`'s fixture to drop `timeline: []` — confirmed RED against the current code

### Implementation for Foundational

- [X] T003 Update `src/simulation/types.ts` (data-model.md): `LapBreakdown.firedItemIds` → `firedItems: { id: string; contribution: number }[]`; remove the `TimelineFrame` interface and `ContestResult.timeline` field entirely (confirmed zero remaining consumers, research.md)
- [X] T004 Update `src/simulation/laps.ts` (depends on T003): `PlayerLap.firedItemIds` → `firedItems: FiredItem[]`; compute each firing item's `contribution` from data the existing loop already has (direct items: their boosted magnitude; flat buffs: `item.buff.boostPercent`; stacking buffs: `lapBoosts.stackingState[index]`) — no new derivation needed
- [X] T005 [P] Update `src/simulation/buffs.ts` (depends on T003): add exported `isFlatBuff(item): boolean` (`!!item.buff && item.cooldown === undefined`)
- [X] T006 Update `src/simulation/contest.ts` (depends on T004, T003): remove `buildTimeline`, `TIMELINE_FRAME_COUNT`, and the `TimelineFrame` import; update the `laps` mapping to pass through `firedItems` — make T002's tests pass — confirmed GREEN

**Checkpoint**: `LapBreakdown`/`ContestResult` migration complete. `ContestScene.ts` still compiles unchanged (it never referenced `timeline`/`firedItemIds` directly) — all three user stories can now build on top of this.

---

## Phase 3: User Story 1 - The contest plays out as a watched race, not an instant result (Priority: P1) 🎯 MVP piece 1

**Goal**: Replace `ContestScene`'s instant resolve-and-transition with a 20-second animation where both cars complete 10 laps around an oval, paced by a shared time-scale derived from the slower car's total.

**Independent Test**: Resolve a contest and watch the animation play from start to finish; confirm it takes a consistent ~20 seconds, both cars complete exactly 10 visible laps, pacing visibly varies lap to lap, and the finishing order matches the computed outcome (spec.md User Story 1).

### Tests for User Story 1 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T008.**

- [X] T007 [US1] Write failing unit tests for `buildPlaybackSchedule`, `carProgressAt`, `cumulativeSimulatedTimeAt`, and a minimal `frameStateAt` (car progress only; `liveGap`/`newCallouts` as placeholder `0`/`[]` for now) in `tests/unit/playback.test.ts` (NEW; depends on T003): shared `scaleFactor`; slower side's final boundary equals `RACE_ANIMATION_SECONDS` exactly when unclamped, faster side's is strictly less (except on a tie); monotonically increasing boundaries; **no lap's visual duration ever falls below `MIN_VISUAL_LAP_SECONDS`, using a fixture lap at `MIN_LAP_TIME` under a `scaleFactor` small enough that the unclamped result would otherwise be well under it (contracts/simulation-contract.md invariant 3 — added following `/speckit.analyze` finding F1)**; `lapProgress` always in `[0,1]`; `finished` flag correctness — confirmed RED (`playback.ts` doesn't exist yet)

### Implementation for User Story 1

- [X] T008 [US1] Implement `buildPlaybackSchedule`, `carProgressAt`, `cumulativeSimulatedTimeAt`, and the minimal `frameStateAt` in `src/simulation/playback.ts` (depends on T007): `buildPlaybackSchedule` MUST clamp each lap's individual visual duration to at least `MIN_VISUAL_LAP_SECONDS` before accumulating boundaries, per data-model.md/research.md — make T007's tests pass — confirmed GREEN
- [X] T009 [US1] Rewrite `src/scenes/ContestScene.ts` (depends on T008, T006): build a `PlaybackSchedule` once in `create()`; render a simple oval (Phaser `Graphics`) and two distinguishable car markers (FR-008, FR-009); in `update(time, delta)`, advance elapsed animation seconds and call `frameStateAt` each frame to reposition both markers along the oval from their `lapProgress`; transition to `ResultScene` with the already-computed `result` once **both** cars report `finished: true` (i.e., the schedule's actual end, which may be slightly later than `RACE_ANIMATION_SECONDS` if any lap needed the visual-floor clamp) — not a hardcoded `RACE_ANIMATION_SECONDS` timer
- [X] T010 [US1] Manual validation: run quickstart.md scenarios 1-4 (watched race replaces instant transition, consistent duration, visible pacing variance, correct finish order) — **owner to run**, sandbox can't reach the user's browser

**Checkpoint**: The base watched race works end to end — no item callouts or leader indicator yet (User Stories 2-3).

---

## Phase 4: User Story 2 - Item-firing callouts explain what's happening (Priority: P1)

**Goal**: A callout appears whenever a direct item or stacking buff fires on the player's lap; flat buffs never get one.

**Independent Test**: Resolve a contest for a build holding a direct item and a stacking buff; watch the animation and confirm a callout appears on every actual firing lap, naming the item, and confirm no callout for a flat buff (spec.md User Story 2).

### Tests for User Story 2 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T012-T013.**

- [X] T011 [US2] Extend `tests/unit/playback.test.ts` (depends on T007) with failing tests: `calloutEventsForLap` filters out flat buffs and includes direct items/stacking buffs with their `contribution`; `frameStateAt` returns real `newCallouts` exactly once when the player's lap index advances (and empty otherwise) — confirmed RED

### Implementation for User Story 2

- [X] T012 [US2] Implement `calloutEventsForLap` in `src/simulation/playback.ts` (depends on T011; uses `isFlatBuff` from T005) — make the relevant tests pass
- [X] T013 [US2] Extend `frameStateAt` in `playback.ts` (depends on T012, T008) to call `calloutEventsForLap` when `lastRenderedPlayerLapIndex` changes, replacing the placeholder `newCallouts: []` — make T011's tests pass — confirmed GREEN
- [X] T014 [US2] Create `src/scenes/contestFormatting.ts` (NEW, mirrors `resultFormatting.ts`'s pattern) with a callout label formatter (item name + its effect, using `contribution`)
- [X] T015 [US2] Wire `ContestScene.ts` (depends on T013, T014, T009) to display a transient callout using `contestFormatting.ts`'s formatter whenever `frameStateAt` returns `newCallouts`, tracking `lastRenderedPlayerLapIndex` across frames
- [X] T016 [P] [US2] Add `tests/unit/contestFormatting.test.ts` (NEW, lightly tested — not strict TDD, matches `resultFormatting.test.ts`'s own precedent) for the callout label formatter (depends on T014)
- [X] T017 [US2] Manual validation: run quickstart.md scenarios 5-6 (callouts on firing laps only, multiple same-lap firings all shown) — **owner to run**, same reason as T010

**Checkpoint**: Both P1 stories complete — the race is watchable and explains itself via callouts. This is the MVP.

---

## Phase 5: User Story 3 - The current leader is obvious at a glance (Priority: P2)

**Goal**: An explicit indicator names the current leader and the numeric time gap, updating live during playback.

**Independent Test**: Watch an animation where the lead changes hands at least once; confirm the indicator updates at the correct moment with the correct car and gap (spec.md User Story 3).

### Tests for User Story 3 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T019-T020.**

- [X] T018 [US3] Extend `tests/unit/playback.test.ts` (depends on T007) with failing tests: `liveGapAt` matches `result.gap`'s sign convention and exact value at/after the finish; `frameStateAt` returns the real `liveGap` instead of the placeholder `0` — confirmed RED

### Implementation for User Story 3

- [X] T019 [US3] Implement `liveGapAt` in `src/simulation/playback.ts` (depends on T018) — make its tests pass
- [X] T020 [US3] Extend `frameStateAt` (depends on T019, T013) to use real `liveGapAt` output — make T018's tests pass — confirmed GREEN
- [X] T021 [US3] Add a leader-indicator label formatter to `contestFormatting.ts` (depends on T014) — e.g., naming the leading car and the numeric gap (FR-012) — and extend `contestFormatting.test.ts` (depends on T016)
- [X] T022 [US3] Wire `ContestScene.ts` (depends on T020, T021, T015) to display the leader indicator, updating every frame from `frameStateAt`'s `liveGap`
- [X] T023 [US3] Manual validation: run quickstart.md scenario 7 (leader indicator always accurate, updates when the lead changes) — **owner to run**, same reason as T010

**Checkpoint**: All three user stories complete — the race is watchable, explains itself, and is legible about who's winning at any moment.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all three stories

- [X] T024 [P] Regression check: confirm `ResultScene`/`resultFormatting.ts` are fully unchanged and their existing tests still pass (quickstart.md scenario 8, FR-013) — no code change expected, just confirmation
- [X] T025 [P] Regression/manual check: confirm no player input during the animation (e.g., clicking) alters the outcome, gap, or any computed value (quickstart.md scenario 9, FR-011) — **owner to run**, since this is about Phaser input handling during playback
- [X] T026 [P] Update `README.md`'s references to the contest presentation, if any exist
- [X] T027 Code cleanup and refactor pass — confirm `tsc --noEmit` and `eslint .` both exit clean
- [X] T028 Run the full quickstart.md validation (all 9 scenarios plus the `simulation:log` data check) end to end as the final gate for this feature — **owner to run**, same reason as T010
- [X] T029 Replace transient item callout text with a persistent three-slot player board at the bottom of `ContestScene`; flash each firing item's slot independently so same-lap events display simultaneously; update tests, spec, quickstart, and README

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all three user stories; does **not** break `ContestScene.ts`'s compilation (Organization note above)
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on User Story 1's `playback.ts` scaffold (T007/T008) and `ContestScene.ts` (T009)
- **User Story 3 (Phase 5)**: Depends on User Story 1's scaffold (T007/T008) and User Story 2's `contestFormatting.ts`/wiring (T014, T015) for a consistent UI pattern to extend
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within User Story 2

- T011 (tests) MUST be written and failing before T012-T013 (implementation) — strict TDD
- T012 depends on T011 and T005 (`isFlatBuff`)
- T013 depends on T012 and T008
- T014 (contestFormatting.ts) is independent of T011-T013, can start anytime after Foundational
- T015 depends on T013, T014, T009
- T016 depends on T014
- T017 (manual validation) is last

### Within User Story 3

- T018 (tests) MUST be written and failing before T019-T020 — strict TDD
- T019 depends on T018
- T020 depends on T019 and T013 (extends US2's `frameStateAt`, not US1's minimal version)
- T021 depends on T014, T016
- T022 depends on T020, T021, T015
- T023 (manual validation) is last

---

## Parallel Example: Foundational

```bash
# After T003 (types.ts) lands:
Task: "Update laps.ts for firedItems + contribution computation"   # T004
Task: "Add isFlatBuff to buffs.ts"                                  # T005 (independent file)
```

## Parallel Example: User Story 2

```bash
# contestFormatting.ts work is independent of the playback.ts test/impl cycle:
Task: "Create contestFormatting.ts with a callout label formatter"  # T014
Task: "Extend playback.test.ts for calloutEventsForLap"             # T011 (different file)
```

---

## Implementation Strategy

### MVP First (User Stories 1-2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — the `LapBreakdown`/`ContestResult` data extension
3. Complete Phase 3: User Story 1 (watched race, correct pacing and finish order)
4. Complete Phase 4: User Story 2 (item-firing callouts)
5. **STOP and VALIDATE**: run quickstart.md scenarios 1-6 independently
6. This is the feature's actual point — Constitution Principle IV is satisfied (a real race to watch) and Principle III's payoff is concrete (callouts explain why). User Story 3's leader indicator is legibility polish on top, not required for the core experience to be correct and watchable.

### Incremental Delivery

1. Setup + Foundational → data model ready, nothing user-visible changed yet (no forced breakage this time)
2. User Story 1 → validate → the race is watched, not instant; this alone satisfies Constitution Principle IV
3. User Story 2 → validate → callouts explain what's happening; this is the MVP
4. User Story 3 → validate → the leader/gap is always obvious at a glance
5. Polish → final quickstart.md run (including the regression checks on `ResultScene` and no-input-changes-outcome) as the completion gate

---

## Notes

- Only `src/simulation/` (`contest.ts`, `build.ts`, `slots.ts`, `storage.ts`, `draft.ts`, `buffs.ts`, `laps.ts`, and the new `playback.ts`) is held to strict TDD, matching the constitution's resolved testing-discipline decision — unchanged since `001-core-loop`. `ContestScene.ts` is presentation-layer, validated via quickstart; `contestFormatting.ts` gets lightly-tested pure-function coverage, same tier as `resultFormatting.ts`.
- `frameStateAt` is built incrementally across all three user stories (car progress only in US1, real callouts added in US2, real live gap added in US3) rather than fully built upfront — mirrors how `005-lap-tick-simulation`'s `simulatePlayerLaps` was built the same way (a working stub in its first story, fleshed out by later ones).
- Foundational does not force `ContestScene.ts` to stop compiling this time, unlike `004-board-storage-ui`/`005-lap-tick-simulation`'s own Foundational phases — worth noting since it's a departure from recent precedent, not an oversight.
- `TimelineFrame`/`buildTimeline`/`ContestResult.timeline` are removed, not deprecated (research.md) — confirmed zero remaining consumers by search before committing to the removal.
- `buildPlaybackSchedule` clamps each lap's visual duration to `MIN_VISUAL_LAP_SECONDS` (T008) — added following a `/speckit.analyze` finding (F1) that the spec's own anticipated "unreadable instant blip" edge case (an aggressively-stacked lap near `MIN_LAP_TIME`, scaled down to ~0.03-0.04 real seconds) had no task addressing it. `ContestScene.ts` (T009) ends the animation when both cars report `finished`, not on a fixed timer, since a clamp can push the actual end slightly past `RACE_ANIMATION_SECONDS` in rare cases.
- A skip/fast-forward control, track variety, and richer ghost data all remain out of scope per spec.md Assumptions, `specs/vision.md`, and `specs/DEFERRED.md`.
- `[P]` tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before moving on.
