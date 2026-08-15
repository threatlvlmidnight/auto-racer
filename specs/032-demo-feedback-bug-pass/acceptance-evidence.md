# Acceptance Evidence: Demo Feedback Bug Pass

Feature: `specs/032-demo-feedback-bug-pass/` — recorded verification evidence

## Owner acceptance and completion (2026-08-15)

The owner iteratively reviewed the hosted/local demo and accepted the final
neutral control language, text contrast, compact leg plates, encounter frames,
thin entrant-card frames, button hit areas, and removal of the unnecessary outer
run border. That review authorized and accepted the three v2 companion sheets
listed in `ui-asset-manifest.md`, closing T100 and T101.

The same review exercised the principal pointer-driven desktop flows, including
entrant selection, run encounters, item purchase/dragging, pre-race setup,
inventory access, and race presentation. Automated contracts cover keyboard
focus, supported bounds, hit targets, `1×`/`2×`, inventory context restoration,
sale/Undo invalidation, and replay invariance. The owner explicitly accepted
Feature 032 implementation as complete on 2026-08-15; an exhaustive physical
touch-device/narrow-screen walkthrough was not separately executed and is
recorded as an owner waiver rather than claimed test evidence. This closes T108
without misrepresenting the manual device matrix.

Final ledger: 110/110 implementation tasks complete. DEMO-001 remains the
documented deferred exact-return defect and is not silently represented as fixed.

## Automated US1/US2/US3 batch (2026-08-15)

The retained-feedback, tag-inspection, supplier, inventory-layout, and sale/Undo
focused suites passed together: 13 test files / 163 tests. `npm run lint` and
`npm run build` also passed. Playback boundary collection was compared at 1×
and 2× with delayed-frame coverage; no manual viewport or input walkthrough is
claimed here.

## Automated US4/US5/T102 batch (2026-08-15)

Settlement, economy receipts, retained run records, balance gates, crop/state
metadata, supported viewport bounds, pre-race focus semantics, world-tour
fallback semantics, and the full acquisition-to-final-record integration were
rerun together. The balance harness returned byte-identical output on its two
consecutive calls: all four entrants were 5/5 representative wins with 48s
optimized ceilings, and the immutable baseline vehicle remained
`spec-car-baseline`. No manual visual or in-game walkthrough is claimed.
per `tasks.md` and `quickstart.md`.

The approved sheet is used as neutral porcelain/steel chrome with restrained
red/blue state accents; runtime text remains the dominant item/build/race
content. Automated state mapping keeps normal, hover, focus, pressed, and
disabled semantics distinct, while the code fallback preserves labels when
the texture is unavailable. This records the non-manual styling decision for
T100; visual playtest confirmation remains outside this batch.

The exhaustive US4 transaction/history command passed 4 files / 8 tests:

```text
npm test -- --run tests/unit/settlement.test.ts tests/unit/economyItems.test.ts tests/unit/runRecord.test.ts tests/integration/economy-items.test.ts
```

Running the same command twice produced the same passing test count and
deterministic projections; no duplicate receipt or retained-history mutation
was observed.

## Automated release-gate rerun (2026-08-15)

The focused suites listed in `quickstart.md` passed before the full gate:

| Suite | Result |
|---|---:|
| `liveStatPresentation` | 3 tests |
| `economyItems` | 1 test |
| `inventoryPresentation` | 8 tests |
| `balance` | 3 tests |
| `demo-regressions` | 9 tests |
| **Focused total** | **24 tests** |

Contract reconciliation found no failures; the suites exercise retained live
evidence, economy receipts, inventory bounds, balance invariants, replay
invariance, and the UI-state contracts described in
`contracts/demo-feedback-contract.md`.

The full automated gate also passed: `npm test` completed with 81 test files /
1,531 tests, `npm run lint` passed, `npm run build` passed, and
`npm run build:pages` passed. The only build note is the existing Vite
post-minification chunk-size warning. Manual pointer/touch/viewport review is
not claimed.

The balance harness was run from two clean Node processes and produced byte-
identical JSON. All four entrants remained at 5/5 representative wins and
48s optimized ceilings; representative spread is 0 percentage points and
optimized-ceiling spread is 0%.

## T001 — Pre-feature baselines (2026-08-15, branch `032-demo-feedback-bug-pass` @ `167eced`)

| Command | Result | Detail |
|---|---|---|
| `npm test` | PASS | 63 test files / 1,433 tests passed; duration ~7s |
| `npm run lint` | PASS | eslint clean, no findings |
| `npm run build` | PASS | vite build + `tsc --noEmit` clean; `dist/assets/index-vMq1N9jf.js` 1,715.84 kB (gzip 410.87 kB); chunk-size warning only (pre-existing) |
| `npm run build:pages` | PASS | `VITE_DEMO_BASE_URL=/auto-racer/` build clean; `dist/assets/index-7sLeSzOD.js` 1,715.85 kB (gzip 410.88 kB) |

Environment: Node/npm local, macOS, working tree at feature intake commit
(DEMO-001 temporary Test Day guard already in place; DEMO-002 `SKIP REWARDS`
not yet implemented).

## T006 — Approved control-sheet master validation (2026-08-15)

Dependency-free PNG decode (IHDR + zlib-inflated unfiltered scanlines) in
`tests/unit/uiChrome.test.ts`, 5 tests passing:

| Master | Path | Size | Encoding |
|---|---|---|---|
| Transparent working master | `public/assets/ui/feature-032-controls-sheet.png` | 1672×941 | 8-bit RGBA (color type 6) |
| Preserved chroma source | `public/assets/ui/source/feature-032-controls-sheet-chroma.png` | 1672×941 | 8-bit RGB (color type 2) |

- All four corners of the transparent master are fully transparent
  (alpha = 0), so crop rectangles stay inside safe alpha bounds.
- Sampled opaque coverage ≈ 38% — the sheet carries real control content.
- Provenance paths match `quickstart.md` Asset source exactly.
