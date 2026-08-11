# Tasks: Async Ghost Pool

**Input**: Design documents from `/specs/019-async-ghost-pool/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ghost-pool-contract.md`, and `quickstart.md` (all present)

**Tests**: Required. This repository's established practice is strict test-first coverage for every changed `src/simulation/`/`src/content/` contract.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. The `GHOST_POOL` catalog and its validation are shared foundational work. US1 (the selection mechanism itself) and US2 (verifying its non-coupling signature) land together, since US2 is a property of the same function US1 implements, not separate new work. US3 (zero regression) is pure verification, run last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps to US1-US3 from `spec.md`; setup, foundational, and polish tasks have no story label
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is sufficient before implementation begins

- [ ] T001 Confirm no new runtime dependency is required — the seeded PRNG is local pure code, deliberately not shared with `018-track-generation`'s own (research.md Decision 2) — and the existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json` is sufficient (per `plan.md` Technical Context)

**Checkpoint**: No new tooling needed; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Author the wider ghost pool catalog and its validation — required by every user story

**CRITICAL**: Complete this phase before any user-story implementation. `RIVAL_PROFILES` itself MUST NOT be touched by any task in this phase or any later one.

### Tests (write first and confirm RED)

- [ ] T002 [P] Add failing tests confirming `GHOST_POOL` contains every existing `RIVAL_PROFILES` entry unchanged, plus at least one new entry, and that `RIVAL_PROFILES` itself is byte-for-byte identical to today (same length, same content, same export), in `tests/unit/rivals.test.ts`
- [ ] T003 [P] Add failing tests for `validateGhostPool`: fails on fewer than 7 entries (`wrong-count`), fails on a duplicate id, fails on an unresolvable vehicle id, otherwise valid — without touching or changing any existing `validateRivalCatalog` test, in `tests/unit/rivals.test.ts`

### Implementation

- [ ] T004 Author `GHOST_POOL` (`[...RIVAL_PROFILES, ...newEntries]`) in `src/content/rivals.ts`, with each new entry using the existing `RivalProfile` shape, an existing vehicle topology, and its own complete `levelTable(...)` (depends on T002; contract §1, research.md Decision 1)
- [ ] T005 Implement `validateGhostPool` as a new sibling function (never a modification of `validateRivalCatalog`) in `src/content/rivals.ts` (depends on T003; contract §2, research.md Decision 4)
- [ ] T006 Run `tests/unit/rivals.test.ts` foundational cases; confirm GREEN, including every pre-existing `RIVAL_PROFILES`/`validateRivalCatalog` test still passing unmodified (depends on T004-T005)

**Checkpoint**: `GHOST_POOL` exists as a validated superset of `RIVAL_PROFILES`; `RIVAL_PROFILES` and `validateRivalCatalog` are provably untouched. Nothing wired to `resolveContest` yet.

---

## Phase 3: User Story 1 - Every race draws from a wider, deterministic ghost pool (Priority: P1)

**Goal**: A player's contest draws 7 distinct entries from `GHOST_POOL`, selected deterministically for that specific contest, instead of always facing the same fixed 7.

**Independent Test**: Resolve contests for several different `(seed, level)` pairs; confirm each selects exactly 7 distinct entries from the pool, confirm the same pair always selects the same 7, and confirm different pairs select different combinations.

### Tests for User Story 1 (write first and confirm RED)

- [ ] T007 [P] [US1] Add failing tests confirming `selectGhostRoster(pool, seed, level)` called twice with identical arguments returns deeply equal results, in `tests/unit/rivals.test.ts`
- [ ] T008 [P] [US1] Add failing tests confirming `selectGhostRoster` always returns exactly 7 entries with no duplicate `id`, for a pool of 7 or more valid entries, in `tests/unit/rivals.test.ts`
- [ ] T009 [P] [US1] Add failing tests confirming different `(seed, level)` pairs select different combinations from a pool meaningfully larger than 7 — not always "the first 7" or a fixed subset, in `tests/unit/rivals.test.ts`
- [ ] T010 [P] [US1] Add failing tests confirming a selected entry still resolves through the existing, unchanged `resolveRivalBuild`/`RivalLevelScaling` mechanism, in `tests/unit/rivals.test.ts`
- [ ] T011 [P] [US1] Add failing tests confirming `runPresentation.ts`'s `contestSceneInput` populates `rivalRoster` from `selectGhostRoster(GHOST_POOL, run.seed, level)` instead of a direct `RIVAL_PROFILES` reference, in `tests/integration/run-flow.test.ts` (or the existing test file covering `contestSceneInput`)

### Implementation for User Story 1

- [ ] T012 [US1] Implement the local seeded PRNG (mulberry32-style, seeded from `seed * 1000003 + level` — the same combination formula `018-track-generation`'s research established) in `src/simulation/rivals.ts` (depends on T007; research.md Decision 2)
- [ ] T013 [US1] Implement `selectGhostRoster(pool, seed, level)` (partial Fisher-Yates shuffle, first 7 positions) in `src/simulation/rivals.ts` (depends on T008-T010, T012; contract §3, research.md Decision 5)
- [ ] T014 [US1] Update `src/scenes/runPresentation.ts`'s `contestSceneInput` (lines 169-190) — hoist `level` (today computed inline as `level: stage?.pvpOrdinal ?? 1` inside the returned object literal) into its own local `const level = stage?.pvpOrdinal ?? 1;` above the `return`, since a sibling object-literal property cannot otherwise reference it; then change `rivalRoster: RIVAL_PROFILES` to `rivalRoster: selectGhostRoster(GHOST_POOL, run.seed, level)` — the only production caller, verified directly against the codebase (depends on T011, T013)
- [ ] T015 [US1] Run `tests/unit/rivals.test.ts` and the `contestSceneInput` test file; confirm User Story 1 cases are GREEN (depends on T007-T014)

**Checkpoint**: Every PvP contest races a deterministically-selected 7-car field drawn from the wider pool instead of the same fixed 7 every time.

---

## Phase 4: User Story 2 - Selection never depends on any one player's Run (Priority: P1)

**Goal**: `selectGhostRoster`'s own signature accepts only a plain numeric `seed`/`level`, never a `Run` or player-scoped object — protecting the extension point a future shared-lobby feature will need.

**Independent Test**: Call `selectGhostRoster` directly with bare `(pool, seed, level)` arguments, with no `Run` object anywhere in scope; confirm it produces a correct, deterministic selection with no missing data or special-cased behavior.

### Tests for User Story 2 (write first and confirm RED)

- [ ] T016 [P] [US2] Add failing tests confirming `selectGhostRoster`'s signature is exactly `(pool: readonly RivalProfile[], seed: number, level: number)` — called successfully with no `Run`, `Build`, or player-identity value anywhere in the call, in `tests/unit/rivals.test.ts`

### Implementation for User Story 2

- [ ] T017 [US2] Confirm (by inspection and the test above — this story is verification, not new implementation) that `selectGhostRoster` as implemented in T013 already satisfies this requirement structurally, and that `contestSceneInput` (T014) is the only place a `Run`-derived value (`run.seed`) is supplied, as a caller-side choice documented in spec.md/data-model.md (depends on T016, US1)

**Checkpoint**: `selectGhostRoster`'s own contract is confirmed to have zero dependency on `Run`/player identity — a future shared-lobby feature can supply a different numeric seed with zero change to this function.

---

## Phase 5: User Story 3 - Every existing consumer keeps working (Priority: P2)

**Goal**: `012-multi-ghost-contest`, `013-race-spectacle`, and `018-track-generation` (once implemented) all continue to work exactly as today against a selected roster — none of them require any change.

**Independent Test**: Run every existing `012`/`013` test (and `018`'s, once it exists) against a selected roster instead of the full catalog; confirm all pass unchanged, especially the 11+ tests that construct a roster directly from `RIVAL_PROFILES`.

### Tests for User Story 3 (write first and confirm RED — expected to already be GREEN if US1/US2 were done correctly; this phase exists to prove that, not to add new behavior)

- [ ] T018 [P] [US3] Confirm every existing test in `tests/unit/contest.test.ts` and `tests/unit/playback.test.ts` that passes `RIVAL_PROFILES` directly into `resolveContest` (11+ call sites) still passes with zero modification
- [ ] T019 [P] [US3] Confirm `src/simulation/practice.ts`'s Test Day path (the legacy 2-car `resolveContest` overload, which has no roster/pool concept) is unaffected — no task here should touch `practice.ts`

### Implementation for User Story 3

- [ ] T020 [US3] Run the full existing `012-multi-ghost-contest`/`013-race-spectacle` test suites; fix any test that was incorrectly assumed to need modification (expected: none) (depends on T018-T019, US1)

**Checkpoint**: Zero regression in `012`/`013` behavior; `RIVAL_PROFILES`-dependent tests are provably untouched.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm zero regression on existing simulation/presentation behavior and run full validation

- [ ] T021 Run `npm test`, `npm run build`, and `npm run lint`; confirm every existing test remains passing, with special attention to the 11+ direct `RIVAL_PROFILES`→`resolveContest` call sites
- [ ] T022 Grep the codebase for any other reference to `RIVAL_PROFILES` that should instead use `GHOST_POOL`/`selectGhostRoster` in production code (test fixtures are expected and correct to keep using `RIVAL_PROFILES` directly)
- [ ] T023 Run the local Vite browser through `quickstart.md` Scenarios A-B; record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; confirms tooling only
- **Phase 2 - Foundational**: Depends on Setup; blocks all user stories
- **Phase 3 - US1**: Depends on Foundational; independently testable via `selectGhostRoster`'s own determinism/distinctness/variety behavior
- **Phase 4 - US2**: Depends on Foundational and US1's `selectGhostRoster` existing (T013) — verifies a property of the same function US1 implements, so it cannot run first, but requires no changes to US1's own code
- **Phase 5 - US3**: Depends on Foundational and US1 (T014, the wiring change) — verifies behavior *against* the selection US1 produces
- **Phase 6 - Polish**: Depends on all selected user-story phases

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently validates the selection mechanism's own behavior
- **US2 (P1)**: Foundational + US1's `selectGhostRoster` existing; independently validates its non-coupling signature; no dependency on US3
- **US3 (P2)**: Foundational + US1's wiring change; pure verification of US1's output against `012`/`013`

### Strict Test-First Order

- T002-T003 MUST be RED before T004-T005 add the pool/validation
- T007-T011 MUST be RED before T012-T014 add the PRNG/selection/wiring
- T016 MUST be RED before T017 confirms US2

---

## Parallel Opportunities

### Foundational

```text
T002: GHOST_POOL shape tests
T003: validateGhostPool tests
```

Both touch `tests/unit/rivals.test.ts` and should be sequenced or
coordinated if worked simultaneously by different people.

### US1 test tasks are parallel with each other

```text
T007: determinism tests
T008: exactly-7-distinct tests
T009: variety-across-pairs tests
T010: resolveRivalBuild-unchanged tests
T011: contestSceneInput wiring tests (different file — run-flow.test.ts)
```

### US3 verification tasks are parallel with each other

```text
T018: contest.test.ts/playback.test.ts direct-RIVAL_PROFILES regression check
T019: practice.ts unaffected check
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T015.
3. Stop and validate real, deterministic, varied ghost selection
   independently before verifying its signature contract or running
   full-suite regression.

US1 is the MVP: a real, working selection mechanism, wired into the one
production call site, before anything else is checked against it.

### Incremental Delivery

1. **Foundational**: `GHOST_POOL`, `validateGhostPool` — no selection
   or wiring yet; `RIVAL_PROFILES` provably untouched.
2. **US1**: `selectGhostRoster` implemented and wired into
   `contestSceneInput` — every PvP contest now draws from the wider
   pool.
3. **US2**: Confirmation that `selectGhostRoster`'s signature has zero
   `Run`/player-identity dependency.
4. **US3**: Confirmation that `012`/`013` (and `018`, once built)
   require zero changes, and that every `RIVAL_PROFILES`-dependent test
   is untouched.
5. **Polish**: Full regression pass, quickstart validation.

---

## Notes

- Every changed `src/simulation/`/`src/content/` contract has an
  earlier failing test task; implementation begins only after the
  listed RED checks fail for the expected missing behavior.
- `RIVAL_PROFILES` and `validateRivalCatalog` MUST NOT be touched by
  any task in this document — verified directly against the codebase
  that 11+ existing tests depend on both being exactly as they are
  today (research.md Decision 1).
- `resolveContest` (`src/simulation/contest.ts`) MUST NOT be touched by
  any task in this document — it already accepts an arbitrary 7-entry
  roster and already validates its length itself (research.md Decision
  6).
- This feature has no implementation-order dependency on
  `018-track-generation` — they modify entirely different files and
  each has its own independent, deliberately-duplicated small seeded
  PRNG (research.md Decision 2). Either may be implemented first.
- Exact `GHOST_POOL` size beyond "more than 7" is a balance-pass
  placeholder per research.md — implementers choose a concrete number
  and author that many new profiles with complete level tables, not a
  fixed count from this document.
