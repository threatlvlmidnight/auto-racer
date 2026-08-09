# Gate Evidence: Feature 010 T001 (Constitution Principle V Prerequisite)

**Feature**: `010-entrant-vehicle-garage`
**Task**: T001 — opening constitutional gate
**Date**: 2026-08-08

## What this records

T001 requires PASS evidence that Build Testing Access/Test Day (`specs/visual-overhaul.md`
UI-FR-022, implemented as feature `011-build-test-day`) is complete and validated before
any feature 010 source or test task may start. This file indexes that evidence rather than
re-deriving it — the authoritative record is
`specs/011-build-test-day/acceptance-evidence.md`.

## Result: PASS, with one explicitly waived row

Per `specs/011-build-test-day/acceptance-evidence.md` Section 13 (Overall gate status,
post-waiver): every required SC-011 row is a genuine, unconditional PASS **except** the
390x844 mobile-viewport text-size floor (FR-024/FR-025), which the project owner explicitly
waived in chat on 2026-08-08 — see Section 12 of that file for the exact scope, reasoning,
and lift condition. The waiver is scoped narrowly (text-size at one viewport only; zero
horizontal scroll and zero clipped targets at that same viewport remain genuinely true) and
is tracked as an open item in `specs/DEFERRED.md`, not silently treated as resolved.

This satisfies T001's PASS requirement: feature 011 itself is complete, is not
"implemented, approximated, or waived" by feature 010 (the waiver was recorded entirely
within feature 011's own evidence, by the project owner, before feature 010 work began),
and the one open gap is explicitly tracked rather than hidden.

| SC-011 requirement | Status | Evidence |
|---|---|---|
| All P1 acceptance scenarios | PASS | `acceptance-evidence.md` §§1-6 |
| SC-001 through SC-006 (deterministic projection, direct-authority equivalence, reconciliation, outcome-input invariance, protected-state equality, recovery) | PASS | `acceptance-evidence.md` §§2-5 |
| Keyboard-only, touch-only, visible-focus, no-hover, reduced-motion | PASS (Tab-cycling specifically: tooling-limited, not a known defect) | `acceptance-evidence.md` §§8-9 |
| Viewport 1920x1080 / 1366x768 / 1024x768 | PASS | `acceptance-evidence.md` §6.4 |
| Viewport 390x844 | **WAIVED** (text-size floor only) | `acceptance-evidence.md` §§7, 12 |
| SC-008 (5-participant moderated study) | PASS — 5/5 | `acceptance-evidence.md` §10 |
| Full automated tests, build, lint | PASS — 262 tests, 22 files | `acceptance-evidence.md` §1 |
| `package.json` — no new runtime dependency; Phaser 3, TypeScript, Vite, Vitest, ESLint retained | PASS | verified 2026-08-08: `dependencies` = `{phaser}` only; `devDependencies` unchanged |

## Consequence for feature 010

T001's remaining clause — "confirm feature 010 adds no runtime dependency and retains the
existing Phaser 3, TypeScript, Vite, Vitest, and ESLint configuration in `package.json`" —
is satisfied as of this baseline (no feature 010 work has started yet, so `package.json` is
unchanged). Feature 010 T002 and later tasks may proceed.

Feature 010 must not treat the 390x844 waiver as license to skip its own responsive/mobile
requirements (per its own spec's UI-FR set); the waiver applies only to feature 011's gate
and is scoped exactly as described in `specs/011-build-test-day/acceptance-evidence.md`
Section 12.
