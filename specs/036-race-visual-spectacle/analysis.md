# Spec Kit Analysis: Race Visual Spectacle Remediation

**Date**: 2026-08-17  
**Artifacts analyzed**: spec.md, clarification-questionnaire.md, plan.md,
research.md, data-model.md, quickstart.md, tasks.md, vehicle-asset-manifest.md,
owner-qa-findings-2026-08-17.md, Feature 035 remediation artifacts, Constitution
1.3.0

## Result

**READY FOR CODE REMEDIATION; MANUAL ACCEPTANCE EXCLUDED.** T058–T062 cover the
failed deployed-build track and race-stage findings. T044 remains a separately
labeled `[MANUAL-FRONTIER-OR-OWNER]` gate and must not be executed or closed by
DeepSeek.

| Finding | Code tasks | Verification ownership |
|---|---|---|
| VIS-036-01 oversized/flat track and dense-field identity failure | T058–T060, T062 | T044 frontier/owner |
| VIS-036-02 unprotected race stage and HUD collisions | T058, T061–T062 plus Feature 035 T048–T050 | T044/T043 frontier/owner |

## Cross-feature conclusions

- Feature 036 T061 and Feature 035 T048 share `ContestScene`; they form one
  serialized code batch and must not be assigned to competing implementations.
- Feature 043's future segment artwork is not a prerequisite. T059 must make
  the primitive renderer credible using current presentation capabilities.
- Track scale, label priority, and UI safe regions cannot change retained track
  points, positions, ordering, timing, playback boundaries, PiP selection, or
  final results.
- T060 may use deterministic presentation-only offsets or label suppression,
  but tests must prove authoritative evidence remains unchanged.
- Automated scene-state and bounds assertions are allowed. Screenshot capture,
  visual comparison, and qualitative acceptance are frontier/owner work.

## Consistency checks

- No unresolved clarification marker or template placeholder blocks the work.
- Each owner finding has implementation and automated-regression coverage.
- The future asset feature cannot waive current supported-landscape failures.
- No critical/high inconsistency remains. T058–T062 are implementation-ready.
