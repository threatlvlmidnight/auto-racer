# Tasks: Race Spectacle

**Input**: Design documents from `/specs/013-race-spectacle/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/race-spectacle-contract.md`, and `quickstart.md` (all present). Also depends on `012-multi-ghost-contest` being implemented — this feature is a pure consumer of its `NCarContestResult`.

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/` contract; `playback.ts` and the new `tracks.ts` both live there.

**Organization**: Tasks are grouped by the two user stories in `spec.md`. Track selection and the extended N-car playback schedule are shared foundational work; full-field legibility (US1) and per-event explanation (US2) build on that boundary independently of each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US2 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish deterministic track selection and the N-car playback schedule/standings derivation required by both user stories

**CRITICAL**: Complete this phase before any user-story implementation.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests for `selectTrack` determinism (identical `(runSeed, pvpStageOrdinal)` -> identical `Track`) and for a catalog of exactly 3 fixed, non-generated tracks in `tests/unit/tracks.test.ts`
- [ ] T003 [P] Add failing tests for the extended `PlaybackSchedule`/`CarSchedule` — exactly 8 entries in `NCarContestResult.cars` order, and `scaleFactor` derived from the slowest of all 8 cars (generalizing today's two-car `max`) — in `tests/unit/playback.test.ts`
- [ ] T004 [P] Add failing tests for `standingsAt` returning a contiguous 1..8 `position` permutation with no duplicates at any sampled time, matching a direct comparison of `cumulativeSimulatedTimeAt` across all cars, in `tests/unit/playback.test.ts`

### Implementation

- [ ] T005 Author 3 fixed, hand-drawn closed-loop track shapes in `src/content/tracks.ts` (depends on T002)
- [ ] T006 Implement `selectTrack(runSeed, pvpStageOrdinal)` as `(runSeed + pvpStageOrdinal) mod 3` over the fixed catalog in `src/simulation/tracks.ts` (depends on T002, T005)
- [ ] T007 Extend `buildPlaybackSchedule` to `cars: CarSchedule[]` (8 entries) and attach the `selectTrack` result once per schedule in `src/simulation/playback.ts` (depends on T003, T006)
- [ ] T008 Implement the shared `standingsAt(schedule, visualTimeSeconds)` derivation in `src/simulation/playback.ts` (depends on T004, T007)
- [ ] T009 Run `tests/unit/tracks.test.ts` and the foundational cases in `tests/unit/playback.test.ts`; confirm GREEN (depends on T005-T008)

**Checkpoint**: A track is selected deterministically per contest, and the playback schedule/standings derivation exist for all 8 cars.

---

## Phase 3: User Story 1 - Watch a legible full-field race (Priority: P1)

**Goal**: Render `012-multi-ghost-contest`'s 8-car result as a real track with all cars visible and a continuously live standings view, at a single well-paced fixed duration with no speed/skip control.

**Independent Test**: Resolve an 8-car contest and play its presentation; confirm all 8 cars are visible and distinguishable, the track is not the old bare oval, and a standings view shows every car's live position as the race plays.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T010 [P] [US1] Add failing tests for `frameStateAt`'s extended `cars: CarProgress[]` (8 entries, correct order) and `standings` output in `tests/unit/playback.test.ts`
- [ ] T011 [P] [US1] Add failing tests for N-car standings label formatting, replacing `leaderLabel`'s two-car-only shape, in `tests/unit/contestFormatting.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement `frameStateAt`'s extended `cars`/`standings` output in `src/simulation/playback.ts` (depends on T010, Foundational)
- [ ] T013 [US1] Replace `leaderLabel` with N-car standings label formatting in `src/scenes/contestFormatting.ts` (depends on T011)
- [ ] T014 [US1] Render the selected track shape and all 8 car markers (path-tangent heading, fading position trail per `research.md` Decision 6) in `src/scenes/ContestScene.ts` (depends on T007, T012)
- [ ] T015 [US1] Render the live standings sidebar from `frameStateAt`'s `standings` in `src/scenes/ContestScene.ts` (depends on T013-T014)
- [ ] T016 [US1] Confirm no playback-speed or skip-to-end control is added anywhere in `ContestScene` — verified by its absence, not a toggle defaulted off (depends on T014-T015)
- [ ] T017 [US1] Run `tests/unit/playback.test.ts` and `tests/unit/contestFormatting.test.ts`; confirm User Story 1 cases are GREEN (depends on T012-T016)

**Checkpoint**: The full 8-car field races on a real track with a live standings view, at one fixed duration and no speed control.

---

## Phase 4: User Story 2 - Understand why a car is winning or losing (Priority: P1)

**Goal**: The player's own firings produce the existing board-flash cue and a ticker line; rivals produce no dedicated visual cue, only curated ticker lines for notable moments.

**Independent Test**: Resolve a contest with at least one player firing and one rival taking the lead; confirm the player's board flashes and both events produce ticker lines, and confirm no visual cue is ever produced for a rival's ordinary firing.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T018 [P] [US2] Add failing tests confirming `newCallouts` is populated only for the player's own car across sampled frames, never for a rival, in `tests/unit/playback.test.ts`
- [ ] T019 [P] [US2] Add failing tests for curated `newTickerLines`: the player's own firings always produce a `"player-fired"` line (reusing `calloutEventsForLap`); a rival produces a line only on taking the lead (`standingsAt` position change to 1st) or finishing — never on an ordinary firing; a rival with no notable moments and no firings produces zero lines in `tests/unit/playback.test.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Scope `newCallouts` to the player's own car only in `frameStateAt` in `src/simulation/playback.ts` (depends on T018, US1's `frameStateAt` extension)
- [ ] T021 [US2] Implement curated `newTickerLines` derivation — player firings via `calloutEventsForLap`, rival notable-moment detection via consecutive `standingsAt` comparisons — in `src/simulation/playback.ts` (depends on T019-T020)
- [ ] T022 [US2] Confirm the existing player board-flash cue is unchanged and not extended to rivals, and render the curated ticker, in `src/scenes/ContestScene.ts` (depends on T014, T021)
- [ ] T023 [US2] Run `tests/unit/playback.test.ts`; confirm User Story 2 cue-scoping and ticker-curation cases are GREEN (depends on T020-T022)

**Checkpoint**: Every visible cue and ticker line is explainable and correctly scoped — player events are never lost, rival events never flood the ticker.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Tune pacing quality, confirm zero regression, and run full validation

- [ ] T024 Tune the fixed watch-duration/pacing formula (`scaleFactor` and any minimum-visual-lap-duration constant) against SC-006's qualitative bar via playtesting — parameter tuning on the existing proportional-scaling formula, not a new algorithm
- [ ] T025 Run `npm test`, `npm run build`, and `npm run lint`; confirm `012-multi-ghost-contest`, credits, sponsor, and six-stage progression regressions remain GREEN
- [ ] T026 Search all test files for remaining assertions against the old two-car `PlaybackSchedule.player`/`.ghost` or `leaderLabel` shapes; confirm zero remain
- [ ] T027 Run the local Vite browser through `quickstart.md` Scenarios A-D; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks both user stories
- **Phase 3 - US1**: Depends on Foundational; establishes `frameStateAt`'s extended output every later phase consumes
- **Phase 4 - US2**: Depends on US1's `frameStateAt` extension (T012) existing, but is independently testable once it does — does not depend on US1's rendering tasks (T014-T016)
- **Phase 5 - Polish**: Depends on both user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates full-field track/standings legibility with no speed control
- **US2 (P1)**: Uses US1's `frameStateAt` extension as a base to scope further; independently validates cue/ticker correctness

### Strict Test-First Order

- T002-T004 MUST be RED before T005-T008 add track content/selection and the N-car schedule
- T010-T011 MUST be RED before T012-T013 extend `frameStateAt`/formatting
- T018-T019 MUST be RED before T020-T021 scope callouts and implement ticker curation

---

## Parallel Opportunities

### Foundational track and schedule boundaries

```text
T002: selectTrack determinism tests in tests/unit/tracks.test.ts
T003: N-car PlaybackSchedule tests in tests/unit/playback.test.ts
T004: standingsAt permutation tests in tests/unit/playback.test.ts
```

### US1 legibility boundaries

```text
T010: frameStateAt cars/standings tests in tests/unit/playback.test.ts
T011: N-car label formatting tests in tests/unit/contestFormatting.test.ts
```

### US2 cue/ticker boundaries

```text
T018: Player-only newCallouts tests in tests/unit/playback.test.ts
T019: Ticker curation tests in tests/unit/playback.test.ts
```

Tasks sharing `src/simulation/playback.ts` or `src/scenes/ContestScene.ts` remain sequential to avoid conflicting contract edits.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T017.
3. Stop and validate the full-field track/standings presentation independently before adding cue/ticker curation.

US1 is the MVP: an 8-car field racing on a real track with a live standings view. US2 adds the "why" layer on top of an already-legible race.

### Incremental Delivery

1. **US1**: Track selection, N-car rendering, live standings, confirmed absence of speed controls.
2. **US2**: Player-only cues, curated ticker.
3. **Polish**: Pacing tuning against SC-006, full regression, quickstart validation.

---

## Notes

- Every changed `src/simulation/` contract has an earlier failing test task; implementation begins only after the listed RED checks fail for the expected missing behavior.
- `standingsAt` is called by both the standings sidebar (US1) and ticker curation (US2) — never reimplemented independently in either story's tasks.
- This feature adds no new field to `012-multi-ghost-contest`'s `NCarContestResult`; all derivation happens from that result plus the playback schedule.
- No playback-speed or skip-to-end control exists anywhere in this task list — its explicit absence is itself a verified requirement (T016), not an omission.
