# Delivery Roadmap

**Updated**: 2026-08-15

This is the forward-looking execution order. It complements the historical
handoff; feature task ledgers remain the source of truth for individual tasks.

## Committed sequence

1. **033 Race Enrichment** — implementation-ready, 93 tasks. Start with
   T001–T006 baseline and Feature 032 reconciliation, then establish retained
   race phases, passes, identity, incidents, circuit grammar, and audio.
2. **034 Roguelike Encounter Variety** — implementation-ready, 78 tasks.
   Begin only after 033's retained race-evidence contract is available; its
   T001 is the explicit handoff. This delivers instance-bound items, canonical
   stat points, encounter cadence, transformations, and Workshop effects.
3. **035 Interface Clarity & Reward Feedback** — specification drafted and
   ready for clarification. It owns whole-game readability and reward feedback,
   not new encounter or race authority; complete clarification, plan, and tasks
   before implementation.

## Planned follow-ups requiring scope refresh

- **026 Visual UI Upgrade / responsive frame**: refresh its old visual-system
  spec after Feature 035 defines the current clarity requirements. It owns the
  unresolved 390×844 scaling waiver and shared responsive composition.
- **World Tour completion**: derive a new package from the retained Feature 029
  ledger groups in `LEGACY-LEDGER-RECONCILIATION.md`; do not resume 029's task
  list piecemeal.
- **Legacy feature audit**: before scheduling 012–019, 021, or 024, compare
  their contracts with Features 020, 028–034 and mark each as still-needed,
  superseded, or ready for a refreshed plan. Their original task ledgers are
  not sufficient priority signals.

## Completed or acceptance-only

Implementation-complete features have current statuses in their `spec.md`
files. Feature 001 retains owner browser-validation tasks, and Feature 030
retains its manual four-viewport playback matrix. These are acceptance debt,
not the next implementation queue.
