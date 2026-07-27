---

description: "Task list for feature implementation"
---

# Tasks: Core Loop — Baseline Build vs. Sample Ghost

**Input**: Design documents from `/specs/001-core-loop/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/simulation-contract.md, research.md, quickstart.md (all present)

**Tests**: Included for `src/simulation/` only, per the constitution's resolved testing-discipline decision (strict TDD for contest-resolution logic; lighter/manual checks elsewhere). Not a blanket TDD pass over the whole codebase.

**Organization**: Tasks are grouped by user story (spec.md, post-clarify: two stories remain — User Story 3 was removed during `/speckit.clarify` and logged in `specs/DEFERRED.md`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 or US2, per spec.md
- File paths are relative to the repository root

## Path Conventions

Single project (web game client), per plan.md's Project Structure: `src/simulation/`, `src/content/`, `src/scenes/`, `src/main.ts`; tests under `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

- [X] T001 Initialize Vite + Phaser 3 + TypeScript project scaffold at repo root (`index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`), following the official `phaserjs/template-vite-ts` layout (research.md)
- [X] T002 [P] Configure Vitest in `vitest.config.ts` so `src/simulation/` can be tested with no DOM/canvas required (plan.md Constraints)
- [X] T003 [P] Configure ESLint + Prettier for TypeScript at repo root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and data both user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create shared simulation types in `src/simulation/types.ts`: `SpecCar`, `OfferedItem`, `Build`, `SampleGhost`, `ContestResult`, `TimelineFrame` (data-model.md)
- [X] T005 [P] Create static illustrative content data in `src/content/sample-data.ts`: the one baseline `SpecCar`, the one `OfferedItem`, the one `SampleGhost` (data-model.md; depends on T004's types)
- [X] T006 Create minimal Phaser bootstrap/config in `src/main.ts` (empty scene list for now — extended in T014)
- [X] T007 [P] Add `dev`, `build`, and `test` scripts to `package.json`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Choose to take an offered item, then race (Priority: P1) 🎯 MVP

**Goal**: Player is offered the one item, accepts or declines it, races the resulting build instantly against the sample ghost, and reaches a resolved win/loss/tie result with no input possible once the contest starts.

**Independent Test**: Load the game, choose to accept or decline the offered item, start the contest, and confirm a resolved result (win, loss, or tie) appears immediately with no manual intervention required once the contest starts (spec.md User Story 1).

### Tests for User Story 1 (required — strict TDD per constitution)

> **Write these tests FIRST. Confirm they FAIL before implementing T009–T010.**

- [X] T008 [US1] Write failing unit tests for `resolveContest` in `tests/unit/contest.test.ts`, covering all four invariants in `contracts/simulation-contract.md`: determinism, outcome correctness (win/loss/tie boundaries), detectable effect of accept vs. decline, and purity (no mutation, no DOM/randomness dependency) — confirmed RED (import error, contest.ts doesn't exist yet)

### Implementation for User Story 1

- [X] T009 [P] [US1] Implement `Build` helpers in `src/simulation/build.ts` — apply an `OfferedItem`'s `timeModifier` to a `SpecCar`'s `baseTime` to produce `resultingTime` (data-model.md)
- [X] T010 [US1] Implement `resolveContest(build, ghost)` in `src/simulation/contest.ts` (depends on T008, T009) — produce a `ContestResult` including the internal `timeline` time-series (plan.md Spectation-First forward-compat constraint); make T008's tests pass — confirmed GREEN, 7/7 tests passing
- [X] T011 [P] [US1] Build `PrepareScene` in `src/scenes/PrepareScene.ts` — display the baseline car and the offered item, let the player accept or decline, then proceed to the contest
- [X] T012 [P] [US1] Build `ContestScene` in `src/scenes/ContestScene.ts` (depends on T010) — call `resolveContest` with the chosen `Build` and the sample ghost from `src/content/sample-data.ts`, and transition immediately to the result (FR-010: instant computation, no live-watch UI)
- [X] T013 [P] [US1] Build a minimal `ResultScene` in `src/scenes/ResultScene.ts` (depends on T010) — display only the win/loss/tie outcome for now (a tie displays as a win for both sides, FR-011); richer data comes in User Story 2
- [X] T014 [US1] Wire `PrepareScene` → `ContestScene` → `ResultScene` into `src/main.ts`'s Phaser game config, with `PrepareScene` as the initial scene (depends on T011, T012, T013) — `tsc --noEmit` and `npm run build` both pass
- [ ] T015 [US1] Manual validation: run quickstart.md scenarios 1–3 (decline → race → result; accept → race → different result; confirm no input possible once a contest starts) — **owner to run**, see completion note: sandbox can't reach the user's browser

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Understand the result through transparent data (Priority: P2)

**Goal**: After a contest resolves, the player sees enough data — their time, the ghost's time, the gap, and a qualitative comparison to the baseline — to understand why they won or lost.

**Independent Test**: Compare a result where the item was declined against one where it was accepted, and confirm the displayed data clearly shows how the two compare (spec.md User Story 2).

### Implementation for User Story 2

- [X] T016 [US2] Extend `ResultScene` (`src/scenes/ResultScene.ts`) to display the player's final time, the ghost's final time, and the gap between them (FR-006) — display logic extracted to `src/scenes/resultFormatting.ts` so it's testable without a Phaser canvas context
- [X] T017 [US2] Extend `ResultScene` (`src/scenes/ResultScene.ts`, depends on T016 — same file, sequential) to show a qualitative comparison: whether the item was accepted or declined, and how this run compares to the baseline (declined) outcome (FR-007)
- [X] T018 [US2] Add a lightweight check in `tests/integration/result-scene.test.ts` confirming `ResultScene` renders all required fields from a given `ContestResult` (depends on T016, T017 — not strict TDD, per constitution's presentation-layer testing decision) — 4/4 passing
- [ ] T019 [US2] Manual validation: run quickstart.md scenarios 4–5 (result legibility; same build run twice produces a consistent result) — **owner to run**, same reason as T015

**Checkpoint**: Both user stories work independently and together — the full feature is playable end to end.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning both stories

- [X] T020 [P] Add basic error/empty-state handling — `ContestScene` now guards against a missing `build` (redirects to `PrepareScene` instead of crashing); `resultingTime` in `src/simulation/build.ts` throws loudly on non-finite results instead of producing an unexplainable one
- [X] T021 [P] Add a README documenting the dev/build/test workflow, referencing quickstart.md
- [X] T022 Code cleanup and refactor pass — extracted `src/scenes/resultFormatting.ts` out of `ResultScene.ts` during US2 rather than after, so there was little left to refactor; confirmed clean via `tsc --noEmit` and `eslint .` (both exit 0)
- [ ] T023 Run the full quickstart.md validation (all 5 scenarios) end to end as the final gate for this feature — **owner to run**, same reason as T015/T019

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — no dependency on User Story 2
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on User Story 1's `ResultScene` existing (T013) — extends rather than duplicates it
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within User Story 1

- T008 (tests) MUST be written and failing before T009/T010 (implementation) — strict TDD
- T009 and T011 can start as soon as Foundational is done; T010 needs both T008 and T009
- T012 and T013 both depend on T010, but not on each other — parallel-safe
- T014 (wiring) needs T011, T012, and T013 all done
- T015 (manual validation) is last

### Within User Story 2

- T016 before T017 (same file, `ResultScene.ts` — sequential, not parallel)
- T018 needs T016 and T017 done
- T019 (manual validation) is last

---

## Parallel Example: User Story 1

```bash
# After Foundational (Phase 2) completes, these can start together:
Task: "Write failing unit tests for resolveContest in tests/unit/contest.test.ts"   # T008
Task: "Implement Build helpers in src/simulation/build.ts"                          # T009
Task: "Build PrepareScene in src/scenes/PrepareScene.ts"                            # T011

# Once T010 (resolveContest) is done, these two can run together:
Task: "Build ContestScene in src/scenes/ContestScene.ts"                            # T012
Task: "Build minimal ResultScene in src/scenes/ResultScene.ts"                       # T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md scenarios 1–3 independently
5. This is a legitimately playable prototype even before User Story 2 exists — a win/loss/tie is visible, just not yet explained in detail

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate → this is the MVP described in spec.md
3. User Story 2 → validate → the feature now satisfies Transparency & Legibility (Constitution Principle III) fully
4. Polish → final quickstart.md run as the completion gate

---

## Notes

- Only `src/simulation/` is held to strict TDD, matching the constitution's resolved testing-discipline decision — this is deliberate, not an oversight.
- `resolveContest`'s `timeline` field (T010) is not rendered anywhere in this feature. It exists purely so a future live-presentation feature (Constitution Principle IV, Spectation-First — see `specs/DEFERRED.md`) doesn't require rewriting the simulation core.
- User Story 3 (retesting/"test day") does not appear here — it was removed from spec.md during `/speckit.clarify` and belongs to a later feature.
- [P] tasks touch different files with no completion dependency on each other; sequential tasks either share a file or genuinely need a prior task's output.
- Commit after each task or logical group; stop at either checkpoint to validate a story independently before moving on.
