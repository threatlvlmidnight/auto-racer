# Spec Kit Analysis: Interface Clarity and Reward Feedback

**Date**: 2026-08-15; re-analyzed 2026-08-17 after failed owner QA
**Artifacts analyzed**: spec.md, clarification-questionnaire.md, plan.md,
research.md, data-model.md, contract, quickstart.md, tasks.md, Constitution 1.3.0

## 2026-08-17 remediation analysis

**READY FOR CODE REMEDIATION; MANUAL ACCEPTANCE EXCLUDED.** The owner screenshots
invalidate the earlier landscape PASS but do not introduce an unresolved
product or authority decision. T045–T050 cover the three reproduced failure
clusters, while T043 remains a separately labeled
`[MANUAL-FRONTIER-OR-OWNER]` gate.

| Finding | Code tasks | Verification ownership |
|---|---|---|
| UI-035-01 Pre-Race duplicate identity, collision, raw precision | T045–T046, T049–T050 | T043 frontier/owner |
| UI-035-02 Supplier card/receipt/garage collision | T045, T047, T049–T050 | T043 frontier/owner |
| UI-035-03 Contest HUD collision | T045, T048–T050 plus Feature 036 T061–T062 | T043/T044 frontier/owner |

Consistency conclusions:

- The remediation changes presentation/layout only and cannot alter circuit,
  purchase, tier, setup, playback, or race-result authority.
- Feature 035 T048 and Feature 036 T061 intentionally share `ContestScene` and
  must be implemented in one serialized code batch rather than parallel edits.
- Feature 043 track art is not a dependency for these fixes.
- Automated layout bounds and production-path tests are allowed; screenshots
  and qualitative visual judgments are not DeepSeek work.
- Regional shop demand remains a separate future onboarding/context feature.
- No critical/high specification inconsistency remains. The package is ready
  for its `[CODE-DEEPSEEK]` tasks.

## Original 2026-08-15 result

**PASS after remediation at that time.** No critical or high-severity finding
remained before owner QA. The original 44 tasks were dependency-ordered, every
requirement and user story had
implementation and verification coverage, and presentation-only boundaries are
explicit.

## Findings remediated

### A1 — Completed-race history lacked retained circuit identity (High)

The original task wording named history as a circuit-identity surface, but the
current RunHistoryEntry only retains outcome/timing summary fields. A later
scene could not truthfully reconstruct the exact completed track from that
summary alone.

Remediation: CircuitPresentationIdentity now includes display-only history
evidence. T021 explicitly retains the already-resolved track/region display
facts at scored settlement and projects them through runPresentation and history
rendering. This does not change scoring, simulation, or track selection.

### A2 — Rarity success criterion used an undefined participant population (Medium)

SC-002 said “all participants” without defining an owner study or sample size,
despite this feature using automated presentation contracts plus owner visual
review.

Remediation: SC-002 now requires controlled fixture tests to expose Standard,
Notable/Rare and upgrade-eligibility semantics with color disabled. The owner
audit remains the separate browser-acceptance gate.

### A3 — Destination surface was omitted from the identity wiring task (Medium)

The specification names selection as a race-identity surface, but the original
implementation task omitted DestinationScene.

Remediation: T021 explicitly includes DestinationScene and its pure
worldTourPresentation model.

## Traceability summary

| Area | Specification | Tasks |
| --- | --- | --- |
| Retained circuit/location identity and Test Day distinction | US1, FR-001–FR-003, SC-001 | T001, T008, T014, T019, T021–T025 |
| Adjustable vocabulary and live control discovery | US1, FR-004–FR-005 | T004–T005, T009, T013, T015, T017, T020, T024 |
| Display-only rarity and upgrade feedback | US2, FR-006–FR-008, SC-002/SC-004 | T004, T007, T010, T012, T016–T017, T026–T032 |
| Primary-scene readability and input parity | US3, FR-009–FR-012, SC-003 | T003, T011, T016, T033–T040, T043 |
| Authority boundaries and release gate | FR-013–FR-014, SC-005 | T001, T005–T006, T018, T040–T044 |

## Analysis checks

- No unresolved clarification marker or template placeholder remains.
- No task implements a second tiering, purchase, setup, track-generation, or
  settlement authority.
- Feature 033 reconciliation is the first task, protecting shared race files.
- Feature 026 owns any failure that requires responsive-host/portrait reflow.
- Owner browser acceptance is explicit and not represented as automated visual
  proof.

The package is ready for implementation; no implementation was started by this
analysis.
