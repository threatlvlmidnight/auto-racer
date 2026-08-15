# Legacy Ledger Reconciliation

**Updated**: 2026-08-15

This record prevents old task ledgers from masquerading as either current
implementation work or completed releases. A task remains unchecked until its
implementation and evidence have been explicitly verified; later code that
appears related is not enough to close it by implication.

## Feature 010 — Entrant Selection & Named-Vehicle Garage

**Current status**: partially implemented. The foundational entrant, vehicle,
topology, and garage work shipped, but 26 legacy tasks remain unchecked.

| Residual task group | Tasks | Disposition |
| --- | --- | --- |
| Input and accessibility parity | T045–T051 | Reassess against the current preparation and inventory hosts during Feature 035's whole-game control audit. Retain any missing keyboard, touch, persistent-inspection, focus, or reduced-motion requirement as an explicit Feature 035 task. |
| Full run and contest identity evidence | T052–T062 | Audit before a future run/contest authority change. Do not assume later race features satisfy the original locked-build, attribution, and continuity assertions. |
| Visual, responsive, and manual acceptance | T065–T072 | Treat responsive-frame work as Feature 026 scope and whole-game clarity acceptance as Feature 035 scope. The moderated-study requirement is a separate owner decision, not silently waived. |

Feature 010 does not block Features 033 or 034. Its unchecked tasks must be
closed, superseded with a rationale, or promoted into a new feature package
before this feature can be called complete.

## Feature 029 — World Championship Expansion

**Current status**: partially implemented. The 40-stage world-tour direction
is active in later planning, but 51 tasks are unchecked, many with inline
notes describing partial delivery.

| Residual task group | Tasks | Disposition |
| --- | --- | --- |
| Legacy-run recovery, route, and settlement proof | T003–T034 | Reconcile against current run and settlement authorities before the next season/run-state feature. Preserve the original no-silent-migration contract. |
| Rival/standings/finale completion | T044, T048–T065 | Hold as a coherent follow-up slice: persistent rival evolution, immutable history, standings presentation, and elite-finale evidence belong together. |
| Itinerary, regional art, and accessibility | T066–T074 | Fold layout/readability work into Feature 035 only where it is presentation-only; retain missing map/history/art behavior in the World Tour follow-up. |
| End-to-end regression and acceptance | T076–T091 | Require a fresh, dedicated completion gate after the preceding residual behavior is either delivered or formally removed. |

No feature may rely on Feature 029 being complete merely because it references
40 stages. Before adding new season mechanics, create a dedicated World Tour
completion package from these unresolved groups.

## Closing protocol

For either legacy feature, an owner may close a task only by recording one of:

1. completed implementation plus current automated/manual evidence;
2. explicit supersession by a named feature and task; or
3. removal from product scope with a recorded decision.

Update the source task line and the feature status in the same change.
