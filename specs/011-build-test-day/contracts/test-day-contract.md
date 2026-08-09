# Internal Contract: Test Day

## Boundary rules

1. Test Day does not add or modify `RunStage`, `EncounterType`,
   `ActiveEncounter`, `RunHistoryEntry`, or the six-stage schedule.
2. Practice modules/scenes must not import or call `completePvpEncounter`,
   `continueRunFromResult`, sponsor resolution, encounter completion, or run
   advancement.
3. The existing scored `ContestScene`/`ResultScene` remain the only route to
   scored settlement. Practice Contest/Result scenes are separate consumers of
   the same pure contest and playback functions.
4. Missing or invalid context returns a typed unavailable result. It never creates
   a run, substitutes an opponent/build, or falls through to scored routing.

## Fixed practice inputs

```ts
const TEST_DAY_CONFIG = {
  id: "test-day-v1",
  rival: { id: "ghost-001", lapTime: 5.85 },
  lapCount: 10,
  randomPolicy: "none",
} as const;
```

The practice resolver accepts no RNG, seed, opponent override, lap override, or
presentation state. Pause, speed, skip, reduced motion, resize, backgrounding,
and input method may change only how an already resolved result is shown.

## Pure API surface

```ts
testDayAvailability(run, origin, uiStability): TestDayAvailability
lockPracticeBuild(run, returnContext): LockedPracticeBuild
createPracticeSession(run, returnContext): PracticeSession
resolvePractice(session): PracticeSession // completed or unavailable
toPracticeComparisonProjection(contest, playback, contributions, reconciliation): PracticeComparisonProjection
reconcilePracticeResult(result): ReconciliationReport
captureProtectedRunState(run): ProtectedRunState
comparePracticeResults(previous, current): PracticeComparison

canonicalizeRecoveryPayload(payload): string
fingerprintRecoveryPayload(canonicalPayload): `fnv1a64-v1:${string}`
writePracticeRecovery(record): void
readPracticeRecovery(): PracticeRecoveryPayload | PracticeRecoveryFailure
clearPracticeRecovery(): void
```

`createPracticeSession` copies inputs exactly once. `resolvePractice` delegates to
`resolveContest(snapshot.build, TEST_DAY_CONFIG.rival, 10)` and stores that exact
result. Playback delegates to `buildPlaybackSchedule`/`frameStateAt` and never
changes the result.

## Deterministic comparison and direct-authority contract

`PracticeComparisonProjection` is the only determinism/equivalence comparison
surface. It contains the exact authoritative contest outcome, player/rival
totals, signed gap, and ordered player/rival lap facts; immutable playback facts
ordered by authoritative sequence; contribution facts ordered by
lap/source/location/effect kind with buff applications ordered by
source/target/type; and reconciliation facts ordered by stable check key.

It excludes practice session/result IDs, route and encounter identity,
focus/navigation metadata, timestamps, presentation clock/state, and all other
non-simulation envelope fields. For one locked snapshot and identical inputs:

```ts
const directContest = resolveContest(snapshot.build, TEST_DAY_CONFIG.rival, 10);
const directPlayback = buildPlaybackSchedule(directContest);

expect(practiceProjection).toStrictEqual(
  toPracticeComparisonProjection(
    directContest,
    directPlayback,
    directContest.contributions,
    reconcilePracticeResult(directContest),
  ),
);
```

Repeated practice uses the same exact deep comparison. No tolerance, totals-only
assertion, hash-only assertion, practice-specific mapping, or independently
recalculated playback facts satisfy this contract.

## Availability contract

Available only when all are true:

- `run.status === "active"` and run/build shape is valid;
- origin is one of three categories (run hub, acquisition, PvP briefing), exposed
  through four concrete entry contexts (run hub, Supplier, Reward Draft, and
  pre-start PvP briefing);
- origin route and active encounter/payload agree;
- no drag, purchase/restock confirmation, replacement/eviction, sponsor choice,
  or other outcome-changing UI transaction is unresolved;
- no contest playback or result settlement is active.

Every visible unavailable action returns one specific text-ready reason. Start is
single-flight: repeated activation while creating/resolving returns the existing
session and cannot produce concurrent snapshots.

## Result and evidence invariants

For every completed practice result:

1. `contest.lapCount === 10` and `contest.laps` contains 10 player/rival lap facts.
2. Player and rival totals equal the exact sums of their lap times.
3. `gap === playerTime - ghostTime`; outcome follows the existing sign rule.
4. For each player lap, baseline plus direct resulting contributions plus the
   minimum-time clamp adjustment equals the final lap time.
5. Every buff application names source, target, type, and applied amount. Buff
   summary rows are explanatory and are not double-counted as direct seconds.
6. Every held item has fired evidence or an explicit cooldown/unmet/inactive/zero
   reason on every relevant lap.
7. Storage-active behavior is explicit; ordinary stored items are explicitly
   inactive.
8. Presentation consumes immutable result facts and performs formatting only.
9. Future installation evidence is displayed only when supplied by the
   authoritative locked build/result after feature 010; absence is not inferred.

Any failed invariant makes the session unavailable/failed and blocks feature
completion. It does not attempt scored settlement.

## Protected-state invariant

Before entry, retain both `structuredClone(run)` and
`captureProtectedRunState(run)`. After cancel, completion, interruption recovery,
return, and repeated practice:

```ts
expect(returnedRun).toStrictEqual(fullRunBefore);
expect(captureProtectedRunState(returnedRun)).toStrictEqual(protectedBefore);
```

Normal in-memory return additionally requires `returnedRun === originRun`.
Reload recovery cannot preserve JavaScript object identity, so it requires exact
deep equality after validated deserialization instead.

The named projection includes every FR-027 field plus derived next opponent and
scored-result count. Whole-Run equality is the forward-compatible backstop.

## Recovery and comparison contract

- `practiceRecovery.ts` writes schema version `test-day-recovery-v1`, a canonical
  JSON payload, and `fnv1a64-v1:<16 lowercase hex>` before leaving preparation.
- The payload covers the complete origin `Run`, every named protected
  run/preparation field, locked practice snapshot, exact return route/origin and
  encounter/navigation context, and immutable `TEST_DAY_CONFIG`.
- Canonical JSON recursively sorts object keys, preserves array order, encodes
  JSON primitives consistently, and rejects `undefined`, functions, symbols,
  non-finite numbers, and cycles. FNV-1a 64-bit is computed over UTF-8 payload
  bytes using browser `BigInt` arithmetic.
- Read validation checks version, recomputes the fingerprint, parses and
  canonically reserializes to byte equality, validates the typed schema, and
  cross-checks run ID, protected origin encounter/payload, return context,
  snapshot, and fixed config before any navigation.
- Failures are typed as `unsupported-version`, `fingerprint-mismatch`, or
  `payload-mismatch`; payload mismatch includes parse, non-canonical, schema,
  run, origin, snapshot, and config disagreement.
- The checksum detects accidental corruption and stale/mixed records; it is an
  integrity aid, not authentication or a security boundary. Payload/schema
  validation is mandatory even when the checksum matches.
- On valid reload/interruption, restore the exact unchanged run and explicit
  origin route; do not resume or settle a partially shown race.
- Cancel/exit from active practice playback discards the incomplete practice
  result and returns to that same exact origin encounter, payload, selection,
  offers/stock/restock state, navigation context, and focus target unchanged.
- Any recovery failure shows an unavailable recovery state and offers no implicit
  New Run, alternate route, opponent, result, or settlement action.
- Clear recovery after successful return/cancel.
- Keep only the latest two completed practice sessions for one active run in
  memory. Clear on run ID/status mismatch, abandonment, completion, unavailable
  state, or page reload. Comparison never enters simulation inputs.

## Presentation and accessibility contract

- Briefing, playback, result, and comparison say `TEST DAY` and `UNSCORED` in
  text; they omit purse, sponsor settlement, and progression controls.
- Required evidence is reachable without hover. Mouse, touch, and keyboard have
  equivalent entry, start, inspect, pause/speed/skip, repeat, and return actions.
- Focus is visible; state uses text/icon/structure in addition to color.
- Reduced motion removes travel/flourish but preserves the same immutable facts.
- Practice layouts use actual viewport dimensions and intentional vertical flow.
  At required viewports there is no horizontal page scroll or clipped target,
  final supporting text is at least 14 CSS px, and controls are at least 16 CSS px.

## Retained completion evidence for feature 010 T001

Implementation must create `specs/011-build-test-day/acceptance-evidence.md` with:

- commit/worktree identifier, date, browser/device matrix, and exact commands;
- automated test names/results for 100x empty/direct/buff projection determinism
  and exact practice-versus-direct `resolveContest`/playback equivalence;
- reconciliation coverage for direct, recurring, flat, stacking, count, and
  storage-active effects, including zero/unmet and clamp cases;
- full protected-state before/after equality for win/loss/tie, cancel,
  interruption, repeat, and changed-build cases;
- spies/import-boundary evidence that scored settlement/progression functions are
  never invoked and scored-result count remains unchanged;
- playback input-invariance evidence for pause/speed/skip/reduced motion and
  attempted outcome-changing input;
- valid interruption plus corrupt/version/fingerprint/payload/run/origin mismatch
  recovery evidence;
- keyboard-only, touch-only, visible-focus, no-hover, reduced-motion, and all four
  viewport browser evidence;
- SC-001 action/return rows for Supplier selected/unselected and Reward Draft
  selected/unselected, plus SC-002 through SC-010 PASS/FAIL rows;
- browser Performance evidence that required flows have no reproducible
  input-blocking task of 100 ms or longer, without a hardware/FPS promise;
- explicit UI-FR-022/UI-FR-023 and Constitution I/III/V verdicts.

Feature 010 T001 may record PASS in
`specs/010-entrant-vehicle-garage/gate-evidence.md` only by indexing this retained
artifact and confirming every SC-011 row is PASS: all P1 scenarios; SC-001
through SC-006; deterministic projection equality; direct authoritative
contest/playback equivalence; reconciliation; input invariance; complete
protected-state and zero-settlement/progression equality; valid and invalid
recovery integrity; keyboard, touch, focus, no-hover, reduced motion, and four
viewports; full tests; build; lint; and every linked artifact. Any missing or
failed row is FAIL and stops feature 010 before T002.
