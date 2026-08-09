# Quickstart: Build Testing Access - Test Day

## Prerequisites

- Node.js compatible with the existing Vite/Vitest toolchain
- Dependencies installed with `npm install`
- Feature implementation completed from the later `tasks.md`

## Automated validation

Run from the repository root:

```bash
npx vitest run tests/unit/practice.test.ts tests/unit/practice-determinism.test.ts tests/unit/practice-protected-state.test.ts tests/unit/practiceRecovery.test.ts tests/unit/laps.test.ts tests/unit/playback.test.ts tests/unit/practicePresentation.test.ts
npx vitest run tests/integration/test-day-boundaries.test.ts tests/integration/test-day-flow.test.ts tests/integration/test-day-recovery.test.ts tests/integration/run-flow.test.ts
npm test
npm run build
npm run lint
```

For each implementation phase, run its listed focused tests before adding
production code and retain the expected RED result. After the smallest
implementation slice, rerun the same command to GREEN before continuing. The
focused matrix covers practice contracts, deterministic projections, protected
state, recovery, contribution reconciliation, playback invariance,
presentation, scene flow, and scored-flow boundaries. The full suite is
required because scored contest/run regressions are release blocking.

Retain exact automated and browser results, measurements, and artifact links in
`specs/011-build-test-day/acceptance-evidence.md`. That file is the sole SC-011
gate index consumed by feature 010 T001.

## Required deterministic matrix

Resolve each controlled snapshot 100 times with `test-day-v1` and compare the
defined `PracticeComparisonProjection`, not the complete practice envelope or
only totals:

1. Empty build.
2. Direct/recurring item build.
3. Buff-dependent build covering every shipped flat, stacking, count, and
   storage-active form.

The projection contains the authoritative contest result plus normalized
playback, contribution, and reconciliation facts. It excludes practice
session/result IDs, route/encounter/navigation identity, focus metadata,
timestamps, and all other non-simulation envelope fields.

Expected: all 100 projections per snapshot are exactly deeply equal; rival is
always `ghost-001` at 5.85 seconds per lap for 10 laps; no RNG is called. For
each snapshot, also invoke `resolveContest(snapshot.build, ghost-001, 10)` and
the authoritative playback helpers directly, project those outputs, and require
exact deep equality with the practice projection. Totals-only, hash-only, or
tolerance comparisons do not pass.

## Required reconciliation matrix

For empty, direct, recurring, flat-buff, stacking-buff, count-buff,
storage-active, storage-inactive, zero-value, cooldown-unmet, tie, positive
modifier, multiple-effects, and minimum-time-clamp fixtures, verify:

- each lap explains baseline, direct contribution, buff adjustment, clamp, and
  resulting time;
- lap sums equal totals, totals produce the displayed gap, and gap produces the
  displayed outcome;
- every held item appears with a contribution or explicit non-contribution reason;
- presentation selectors return the exact immutable result values.

## Required zero-mutation matrix

Across three origin categories and four concrete entry contexts (run hub,
Supplier, Reward Draft, and pre-start PvP briefing), capture the whole `Run` plus
`ProtectedRunState`, then exercise:

1. Briefing cancel before playback.
2. Cancel/exit during active playback before a completed practice result exists.
3. Completed win, loss, and tie practice fixtures.
4. Repeat with identical snapshot.
5. Return, change one build position through normal preparation, and repeat.
6. Pause, speed change, skip, reduced motion, resize/background, and attempted
   steering/item/build/sponsor/encounter inputs during playback.
7. Reload/interruption with valid recovery and corrupt, unsupported-version,
  fingerprint, non-canonical/schema/payload, run, config, and origin mismatch.

Expected after normal return: the same run object and a strict deep-equal
run/projection. Expected after reload recovery: an exactly deep-equal deserialized
run/projection. Both paths produce zero new transactions, sponsor resolutions,
encounter completions, stage changes, offer changes, build/storage changes,
history entries, scored outcomes, next opponent changes, or RNG-relevant changes.
Settlement/progression spies have zero calls.

For valid recovery, verify the stored record uses version
`test-day-recovery-v1`, canonical JSON, and
`fnv1a64-v1:<16 lowercase hex>`. Recompute the FNV-1a 64-bit checksum over UTF-8
payload bytes, require canonical byte equality after parse/reserialization, and
verify the payload covers the complete protected origin run/preparation state,
locked snapshot, exact route origin, and fixed config. Expect typed
`unsupported-version`, `fingerprint-mismatch`, or `payload-mismatch` failures as
appropriate. This checksum proves accidental-corruption integrity only, not
authentication or security.

## Browser validation

Start the app:

```bash
npm run dev
```

At 1920x1080, 1366x768, 1024x768, and 390x844, validate the complete flow using
mouse, keyboard only, and touch emulation:

- locate Test Day from each eligible origin and read an explicit unavailable
  reason at each ineligible state;
- confirm `UNSCORED`, rival, 10 laps, and no rewards/progression before Start;
- inspect live/completed lap, gap, item, buff, storage, zero, and clamp evidence
  without hover;
- pause/change speed/skip and repeat without changing facts;
- compare identical snapshots (all zero deltas) and one normal build change;
- return to the exact origin with visible focus;
- enable reduced motion and repeat;
- use browser Performance tooling during start, playback controls, inspection,
  and return; confirm no reproducible input-blocking task of 100 ms or longer;
- confirm zero horizontal page scrolling, no clipped targets, supporting text at
  least 14 CSS px, controls at least 16 CSS px, and coherent vertical reading.

## Retained gate evidence

Record exact command output, test identifiers, browser captures/measurements, and
PASS/FAIL results in `specs/011-build-test-day/acceptance-evidence.md` using the
evidence list in [contracts/test-day-contract.md](contracts/test-day-contract.md).
The retained index must contain an explicit PASS/FAIL row, procedure or test,
and artifact link for every corrected SC-011 gate item:

- every P1 acceptance scenario and SC-001 through SC-006;
- the four SC-001 contexts with starting selected/unselected state, ordered
  action count (maximum four), and exact returned encounter/selection;
- deterministic projection equality, direct authoritative
  `resolveContest`/playback equivalence, contribution reconciliation, and
  outcome-input invariance;
- complete protected-state equality, zero settlement/progression, valid
  interruption recovery, and corrupt/version/fingerprint/payload/run/origin
  recovery integrity;
- keyboard-only, touch-only, visible-focus, no-hover, and reduced-motion
  acceptance;
- each viewport: 1920x1080, 1366x768, 1024x768, and 390x844;
- SC-007 comparison, SC-008 moderated explanation, SC-009 input access, and
  SC-010 viewport outcomes;
- focused and full automated tests, build, lint, browser Performance check, and
  every required retained artifact.

Feature 010 T001 is satisfied only after
`specs/010-entrant-vehicle-garage/gate-evidence.md` indexes that evidence and
records PASS for UI-FR-022/UI-FR-023, Constitution I/III/V, determinism,
direct authority equivalence, reconciliation, zero outcome-changing input,
complete protected-state equality, recovery integrity, and full
accessibility/viewport acceptance. Any failed or missing row makes the overall
gate FAIL and keeps T001 and all later feature 010 tasks blocked.
