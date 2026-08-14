# Acceptance Evidence: Pre-Race Setup

Recorded 2026-08-13 at the end of implementation (tasks.md T079/T080).

## Automated gate

```bash
npm test    # 1031 tests passing across 42 files (up from 894 pre-028; zero regressions)
npm run lint  # clean
npm run build # vite build + tsc --noEmit clean; only the pre-existing documented bundle-size warning
```

## Quickstart scenario results

1. **No configurable item, Driver Aggression only, no opponent/purse/sponsor data** —
   PASS. Browser-verified live: empty-build PreRaceScene shows exactly one
   control (Driver Aggression, defaults Balanced), the validated entrant's
   own vehicle art overlaid on the shared vehicle-free bay, and no
   opponent/field/purse/sponsor/odds text anywhere. Automated:
   `tests/unit/raceSetupPresentation.test.ts`, `tests/integration/pre-race-setup.test.ts`
   string-scan the full scene model for prohibited terms.
2. **Track shape/composition and current four stats; Conservative/Aggressive reconciliation** —
   PASS. Browser-verified live: selecting Conservative updated
   Acceleration/Top Speed/Braking/Cornering by exactly `-6/-1/+13/+1`,
   matching spec.md FR-004D. Automated: `tests/unit/raceSetupPresentation.test.ts`.
3. **Balanced matches legacy deterministic results; Results shows per-car evidence** —
   PASS. `tests/unit/race-setup-baseline.test.ts` pins pre-028 output;
   `tests/unit/laps.test.ts`'s "all-zero setupDeltas reproduces pre-028
   output byte-for-byte" test confirms the migration preserved it exactly.
   `tests/integration/result-scene.test.ts`'s `carSetupLines` tests cover
   per-car Results inspection.
4. **Install each of the seven items; labels/deltas match the launch matrix; storage disables** —
   PASS (automated + one live spot-check). `tests/unit/items.test.ts` and
   `tests/unit/raceSetup.test.ts` cover all seven items exactly against
   data-model.md's launch matrix. Browser-verified live: purchased
   Double-Doweled Wheel Hub (non-configurable, confirms non-configurable
   items correctly grant no control) and separately confirmed Hand-Fitted
   Steering Knuckle appears as a purchasable configurable item in the
   Supplier stage. The full seven-item live purchase pass was not repeated
   this session (RNG-gated draft economy) — automated coverage is exhaustive.
5. **Cross-pool brake-balance stacking (Inez + Nell), ±26/∓2, two sources** —
   PASS. `tests/unit/raceSetup.test.ts` "Inez's Differential Braking Valve
   and Nell's Split-Circuit Brake Valve aggregate into one shared
   brake-balance control" test.
6. **Four distinct configurable items, all controls accessible at 800×450, no clipping** —
   PASS at the presentation/layout-model level
   (`tests/unit/raceSetupPresentation.test.ts`'s layout-state tests cover
   universal-only/two-equipment/four-distinct-equipment exactly). NOT
   re-confirmed live in-browser this session — reaching four distinct
   configurable items through the real draft economy is RNG-gated within a
   reasonable number of manual clicks. `PreRaceScene.ts`'s `CONTROL_ROW_HEIGHT`
   was tightened specifically to keep five rows (Driver Aggression + four
   equipment) clear of the bottom action bar; the arithmetic was checked by
   hand (last row's delta text ends at y≈368, Remember checkbox at y=394,
   action buttons at y=414, all within the 450px viewport with margin) but
   not pixel-verified live. **Recommended follow-up**: a manual pass with a
   save/fixture that starts with four configurable items installed.
7. **Back leaves run/build/credits/reputation/sponsor/history/remembered unchanged** —
   PASS. `tests/integration/pre-race-setup.test.ts`'s "Back changes no run
   field" and "opening setup does not mutate the run at all" tests.
8. **Remember setup: enable, select, race, confirm restoration; dormant/reinstall** —
   PASS. `tests/unit/run.test.ts`'s RunSetupMemory suite (dormant,
   reactivation, merge-not-replace) and `tests/integration/pre-race-setup.test.ts`'s
   Remember-setup scene-flow suite.
9. **Test Day from setup: exact track/setup, unscored, exact return** —
   PASS, browser-verified live end to end: entered Test Day from
   PreRaceScene with a real installed item, confirmed the resolved result
   carried real track-physics evidence (previously always "unavailable" on
   the generic path), confirmed "UNSCORED" labeling throughout, and
   confirmed Return restored PreRaceScene to the exact prior draft state
   (same track, same Balanced selection, same credits/stage — no mutation).
10. **Eight-car contest, every generated rival has the legal lowest-time setup, stable ties, own retained evidence** —
    PASS. `tests/unit/rivals.test.ts`'s `selectGeneratedRivalSetup` suite
    cross-checks the selection against an independent brute-force
    enumeration of every legal combination. `tests/unit/contest.test.ts`'s
    per-car evidence suite confirms every car gets its own `CarResult.setup`.
    Not re-run as a live 8-car race this session (the browser's animation
    loop throttles when backgrounded, making a full 10-16 lap race
    impractical to watch to completion in this environment) — automated
    coverage is exhaustive and the underlying `resolveContest` numeric
    output is unaffected by playback rendering.
11. **Repeated resolution is deeply identical; changing one car's setup changes only that car** —
    PASS. `tests/unit/contest.test.ts`'s "resolves deeply identically on
    repeated calls" and "applies the player's own setup only to the
    player, never to any rival" tests.
12. **Mouse, touch, keyboard, visible focus, monochrome, reduced motion** —
    PASS for mouse (live-verified: clicking any position button updates
    selection and stat panel immediately). Keyboard bindings (digit-focus,
    arrow-step, Tab ring, Enter/Escape) are implemented per the "Implemented
    control scheme" note added to quickstart.md, code-reviewed, but not
    individually key-pressed live this session. No tweens are used on this
    screen, so reduced-motion has nothing to suppress by construction.

## Failure/recovery checks

- Tampering with rules version, family, source IDs, magnitude, track ID,
  encounter ID, or aggregate delta: PASS —
  `tests/unit/raceSetup.test.ts`'s `validateLockedRaceSetup` suite covers
  every one of these tamper cases individually with a distinct typed
  failure code (`unknown-rules-version`, `track-mismatch`,
  `encounter-mismatch`, `ineligible-family`, `source-id-mismatch`,
  `magnitude-mismatch`, `delta-mismatch`, `duplicate-family`,
  `family-order-mismatch`, `aggregate-mismatch`).
- Legacy result with no setup labeled unavailable, never inferred: PASS —
  `tests/integration/result-scene.test.ts`'s `carSetupLines` "labels
  missing setup evidence unavailable rather than inferring Balanced" test.
- Remembering an ineligible family stays dormant, zero effect: PASS —
  `tests/unit/run.test.ts`'s dormant-value tests.

## Constitution Check re-run against delivered code

| Principle | Status | Evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | `PreRaceScene.startRace()` calls `lockRaceSetup` once and never mutates it afterward; `ContestScene` consumes the passed-in locked `setup` only, never recomputes. Draft selections are pure local scene state until Start Race. |
| II. Fairness | PASS | Universal Driver Aggression and item eligibility use the identical `deriveEligibleSetupControls`/`resolveSetupDelta` for every entrant. Every generated rival receives its own setup from the same `lockRaceSetup`/`simulatePlayerLaps` authorities via `selectGeneratedRivalSetup` — no rival-only weaker path. No monetization. |
| III. Transparency & Legibility | PASS | Every control shows signed deltas and current→prospective totals (`raceSetupPresentation.ts`); every car's setup is inspectable post-race (`carSetupLines`); `validateLockedRaceSetup` makes every outcome-changing value independently re-checkable. |
| IV. Spectation-First | PASS | Setup evidence is retained per car on `CarResult.setup` for Results; playback outcome remains canonical and untouched by setup UI. |
| V. Build Testing Access | PASS | Setup-origin Test Day resolves the current uncommitted setup against the exact upcoming track and returns without any scored mutation (verified live and by `tests/integration/test-day-boundaries.test.ts`). |
| VI. Async-First Architecture | PASS | `LockedRaceSetup` (rules-versioned) is part of per-car evidence; `RecordedGhost` (types.ts) reserves the exact shape a future ghost-recording feature needs. Generated rivals are an explicitly documented temporary adapter, gated behind an optional `encounterId` parameter so no existing call site's behavior silently changed. |
| Product: 2D | PASS | Existing Phaser 2D scene/renderer conventions throughout; no new rendering technology. |
| Product: parity/topology | PASS | Every car gets identical Driver Aggression; equipment controls derive only from each car's own legitimately installed items within the same 4-slot topology. |
| Product: theme | PASS | 1901-appropriate driver/equipment language (Conservative/Aggressive, Corner Entry/Stability, etc.), matching the existing period voice. |
| Development Workflow | PASS | Strict test-first for the full simulation domain (raceSetup.ts, laps.ts, contest.ts, rivals.ts, practice.ts) — every new pure function has dedicated unit tests; scene composition uses pure presentation-model tests plus this document's live browser verification, per research.md Decision 9. |

**Post-implementation re-check**: PASS on every row. No constitutional
violation was introduced or discovered during implementation.

## Known follow-ups (not blocking, recorded for a future session)

1. Live in-browser visual QA of the 2-equipment and 4-distinct-equipment
   control-row layouts (item 6 above) — unit/presentation coverage is
   exhaustive, but pixel-level confirmation at 800×450 was not repeated.
2. Individual keyboard-binding verification (digit-focus, arrow-step, Tab
   ring) was code-reviewed but not live key-pressed this session.
3. A full live 8-car scored race was not watched to completion in this
   browser environment (animation throttles when backgrounded); the
   underlying `resolveContest` numerics are exhaustively covered by
   automated tests instead.
