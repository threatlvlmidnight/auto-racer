# Acceptance Evidence: Race Playback Controls (030)

> Living record of pre-feature behavior, phase regression results, and which
> baseline assertions are preserved versus intentionally superseded. Updated
> per phase; the Constitution re-check (T049) cites the final state here.

## T001 — Pre-feature scored and Test Day behavior (captured before feature-030 scene integration)

### Scored race — `ContestScene` (Local + Championship)

| Property | Pre-feature value | Source |
|---|---|---|
| Schedule builder | `buildNCarPlaybackSchedule(result, track)` → 8 cars | `src/scenes/ContestScene.ts` |
| Frame advance | `this.elapsedSeconds += delta / 1000` — **no multiplier** | `ContestScene.update()` |
| Whole-race duration | `maxFinishScheduleTime(view)` = `RACE_ANIMATION_SECONDS` = **20 s** (slowest car) | `src/simulation/playback.ts` |
| Speed control | **None** (FR-009) | `ContestScene` doc comment |
| Pause / Skip | **None** | `ContestScene` (no keyboard handlers, no skip) |
| Results payload | Hands the immutable `NCarContestResult` to `ResultScene` once every car reports `finished: true` | `ContestScene` finish path |

### Test Day race — `PracticeContestScene`

| Property | Pre-feature value | Source |
|---|---|---|
| Schedule builder | `buildPlaybackSchedule(contest)` → 2 cars (player + sample ghost) | `PracticeContestScene.update()` via `result.playback` |
| Frame advance | `this.elapsedSeconds += delta / 1000 * this.speed` | `PracticeContestScene.update()` |
| Speed values | `1, 2, 4`; cycle **`1× → 2× → 4× → 1×`** | `changeSpeed(): speed = speed === 1 ? 2 : speed === 2 ? 4 : 1` |
| Pause | `SPACE` toggles `paused`; `update()` early-returns while paused | `togglePause()` + guard |
| Skip | `S` sets `elapsedSeconds = Number.POSITIVE_INFINITY` | `skip()` |
| Cancel | `ESC` → `clearPracticeRecovery()` + `practiceReturnData(run, cancelPracticeSession(session))` → origin route | `cancel()` |
| Control plan | `practiceContestControlPlan()` = `CANCEL/Esc`, `PAUSE/Space`, `SPEED/F`, `SKIP/S` (all enabled, `focusVisible: true`) | `src/scenes/practicePresentation.ts` |
| Status text | `` `${paused ? "PAUSED" : "PLAYING"} · ${speed}x` `` | `togglePause()` / `changeSpeed()` |
| Results payload | Practice result carries **no** `creditTransactions` or `history` (unscored); `.contest`/`.playback` are the only authorities | `tests/integration/test-day-boundaries.test.ts` |

### Keyboard controls (pre-feature)

| Scene | Key | Action |
|---|---|---|
| `PracticeContestScene` | `Space` | Pause / resume |
| `PracticeContestScene` | `F` | Cycle speed `1×→2×→4×→1×` |
| `PracticeContestScene` | `S` | Skip to end |
| `PracticeContestScene` | `Esc` | Cancel → origin route |
| `ContestScene` | — | none |

## T013 — Phase 2 regression (foundational presentation clock + boundary evidence)

- **`npm test`**: 54 test files / **1102 tests** pass (0 failures).
- **`tests/unit/playback.test.ts`**: **102 tests** pass = 82 pre-existing + 20 new (T006–T009: speed-domain, advance-monotonicity, interval-equivalence, deterministic ordering).
- **`npx tsc --noEmit`**: exit 0, no errors.
- **`npm run lint`**: exit 0, no errors.
- **Superseded low-frame behavior**: none. `crossedPlaybackBoundaries`, `PresentationClock`, and the `PlaybackSpeed` domain are net-new additive; the existing 2-car (`buildPlaybackSchedule`/`frameStateAt`) and 8-car (`buildNCarPlaybackSchedule`/`nCarFrameStateAt`) schedule derivation and `calloutEventsForLap`/`updateLiveProjection` are unchanged in input and output.

## T002 — Phase 1 fixtures

- **`tests/fixtures/playback-control-fixtures.ts`**: immutable, deterministic, no item-RNG fixtures with clean dyadic lap times so `scaleFactor = RACE_ANIMATION_SECONDS / maxTime = 20 / 40 = 0.5` and every `visualLapBoundary` is an exact dyadic rational (no IEEE-754 accumulation drift).
  - `TWO_CAR_RESULT` (2-car `ContestResult`: player 3 s/lap = 30 s win, ghost 4 s/lap = 40 s) + `TWO_CAR_SCHEDULE` + `TWO_CAR_BOUNDARY_VIEW`.
  - `EIGHT_CAR_RESULT` (8-car `NCarContestResult`: player 4 s/lap = 40 s slowest/P8 + 7 rivals 2.0…3.5 s/lap, distinct finishes 10…17.5 s) + `EIGHT_CAR_SCHEDULE` + `EIGHT_CAR_BOUNDARY_VIEW`.
  - Delta sequences (`STANDARD_FRAME_DELTA_SECONDS`, `DELTA_SEQUENCE`, `INTERVAL_EQUIVALENT_DELTAS`) and `SPEED_SEQUENCE` for Phase 2/5 clock tests.

## T003 — Pre-feature scored-race duration and schedule-boundary baselines

- **File**: `tests/unit/playback-controls-baseline.test.ts` (6 tests, passing).
- **Pinned (preserved through Phases 3–4)**:
  - `scaleFactor = 0.5` (= `RACE_ANIMATION_SECONDS / 40`).
  - Player visual lap boundaries `[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]`.
  - Rival full boundary arrays (rival-1 step 1.0 → `[1…10]`; rival-7 step 1.75 → `[1.75, 3.5, …, 17.5]`) — exact dyadic, no tolerance.
  - Each car's finish schedule time = `car.time × 0.5` (10, 11.25, 12.5, 13.75, 15, 16.25, 17.5, 20).
  - `maxFinishScheduleTime = 20` (legacy whole-race duration).
  - Schedule byte-identical across repeated builds (determinism).

## T004 — Pre-feature Test Day control and playback baselines

- **File**: `tests/integration/playback-controls-baseline.test.ts` (6 tests, passing).
- **Pinned (preserved)**:
  - 2-car `scaleFactor = 0.5`; player boundaries `[1.5, 3, …, 15]`; ghost boundaries `[2, 4, …, 20]`.
  - 2-car `maxFinishScheduleTime = 20` (ghost finishes last).
  - `practiceContestControlPlan()` exact model (ids, labels, order, keys, `focusVisible`).
  - Skip target: `frameStateAt(∞)` finishes both cars identically to the natural end (player, ghost, `liveGap`).
  - 2-car schedule determinism.
- **Characterized (intentionally superseded by Phase 5)**:
  - In-scene speed cycle `1× → 2× → 4× → 1×` (`changeSpeed` arithmetic). Phase 5 normalizes this to the two-value `1× ↔ 2×` (`PlaybackSpeed = "normal" | "fast"`) domain; the `4×` tier is removed and the `SPEED` control selects between exactly two rates.

## T005 — Preserved versus superseded baseline assertions

**Preserved (must remain byte-identical through later phases):**
- The 20-second legacy whole-race duration (`maxFinishScheduleTime = 20`) for both 2-car and 8-car schedules.
- The `0.5` scale factor for a 40 s slowest-car total, and every car's `visualLapBoundaries` / finish time as a function of `car.time × scaleFactor`.
- The `practiceContestControlPlan()` control model (Cancel/Pause/Speed/Skip ids, keyboard bindings, `focusVisible`).
- Test Day cancel/return authority (no scored settlement; exact origin return) — already covered by `tests/integration/test-day-flow.test.ts` and `test-day-boundaries.test.ts`.
- Skip semantics: `frameStateAt(∞)` == natural-end frame for player, ghost, and `liveGap`.

**Intentionally superseded (tracked here so later phases cite this baseline):**
- Test Day speed cycle `1× → 2× → 4× → 1×` → Phase 5 `1× ↔ 2×` (`PlaybackSpeed`); the `4×` tier and the `F`-key three-step cycle are replaced by direct two-value selection.
- Scored playback now defaults to displayed `2×` (legacy 20-second duration); selecting `1×` consumes the same immutable schedule at multiplier `0.5` for a 40-second watch.
- Scored races gain no pause/skip (still none); Test Day keeps pause/skip/cancel but its speed meaning is normalized to the shared two-value domain.

## Phase gate status

| Phase | Tasks | Status |
|---|---|---|
| 1 — Setup & baselines | T001–T005 | ✅ Complete |
| 2 — Foundational clock & boundary evidence | T006–T013 | ✅ Complete |
| 3 — US1 readable default | T014–T021 | ✅ Complete |
| 4 — US2 safe switching | T022–T031 | ✅ Complete |
| 5 — US3 accessible controls | T032–T042 | ✅ Complete |
| 6 — Release gates | T043–T050 | 🟨 Automated gates complete; full viewport browser matrix remains |

## Final implementation verification — 2026-08-14

- Scored Local/Championship and Test Day scenes create a fresh race-local controller at displayed `2×` (legacy `1.0` schedule multiplier); displayed `1×` remains available at multiplier `0.5`.
- Both scenes consume controller schedule time. Scored playback consumes every crossed item, checkpoint, lap, and finish boundary in deterministic order; only the final same-update message remains visible.
- Test Day retains Cancel, Pause, Skip, and focus behavior. Skip targets the finite maximum finish boundary and completes even when invoked while paused. The legacy `4×`/`F` cycle is absent.
- Keyboard handlers for `1`/`2` and retained Test Day shortcuts are explicitly removed on scene shutdown. Pointer/touch actions share the same direct selection methods.
- **Focused playback suites**: 7 files / 230 tests pass.
- **Full suite**: 57 files / **1,191 tests** pass.
- **TypeScript**: `npx tsc --noEmit` passes.
- **Lint**: `npm run lint` passes.
- **Production build**: `npm run build` passes. Vite retains the pre-existing large-chunk advisory; no build failure or new warning class was introduced.
- **Browser smoke**: the local production UI was opened at 1280×720 and navigation through championship selection into Test Day was visually checked. The complete four-viewport, both-speed Local/Championship/Test Day matrix remains an explicit manual QA item because the tool-driven canvas did not reliably activate the Test Day start control.

## Constitution re-check

- **Deterministic simulation**: PASS — speed is absent from contest, settlement, run, and practice authority.
- **Immutable evidence**: PASS — controller events consume existing schedules/results and retain the exact Results payload.
- **Transparency/legibility**: PASS — slower default, direct labels, and a non-color selected marker are present.
- **Spectation-first**: PASS — no scored pause/skip was added; speed changes only presentation rate.
- **Scope discipline**: PASS — no persistence, automatic speed, `4×`, or overtake dramatization was introduced.
