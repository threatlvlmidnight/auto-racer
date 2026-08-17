# Cross-Artifact Analysis: Item Adjacency Buffs

**Date**: 2026-08-17

**Artifacts analyzed**: `intake.md`, `clarification-questionnaire.md`,
`spec.md`, `checklists/requirements.md`, `research.md`, `data-model.md`,
`contracts/adjacency-contract.md`, `plan.md`, `quickstart.md`, and `tasks.md`

## Result

**READY FOR IMPLEMENTATION HANDOFF** after the existing Features 035/036
remediation batch or in a separate non-overlapping branch. All five owner
clarifications are recorded, no `NEEDS CLARIFICATION` markers remain, every
functional requirement has an implementation/test path, and image/manual work
is excluded from the coding-agent scope.

## Requirement coverage

| Requirements | Primary task coverage |
|---|---|
| FR-001–FR-004 graph authority/storage exclusion | T006–T010 |
| FR-005–FR-007 clause/predicate/scope contract | T003, T005, T007, T020–T021 |
| FR-008–FR-010 snapshot/additive/no recursion | T008–T010, T015–T019 |
| FR-011–FR-014 evidence/composition/parity | T011–T19, T031–T040 |
| FR-015–FR-019 preview and accessible input parity | T022–T030 |
| FR-020–FR-023 lock/playback/Test Day/versioning | T031–T036 |
| FR-024 typed validation | T003, T007, T013–T014 |
| FR-025 four-item playable slice/fixture coverage | T001–T003, T020–T021 |
| FR-026 later catalog/art compatibility | T020–T021, T042 |
| FR-027 coding/manual ownership boundary | T004, T041–T043 |

All 27 functional requirements are covered. No orphan requirement or unowned
coding task was found.

## Success-criteria coverage

| Criterion | Evidence path |
|---|---|
| SC-001 1,000 permutations | T009 |
| SC-002 exact source/target reconciliation | T015–T019, T037–T040 |
| SC-003 preview/commit identity | T022–T025, T030 |
| SC-004 no-adjacency regression | T017–T018 |
| SC-005 bounded edge-case corpus | T001, T008–T010 |
| SC-006 no-hover/non-color access | T026–T030 automated; T043 qualitative |
| SC-007 Test Day/scored parity | T031–T034 |
| SC-008 typed incompatible rejection | T013–T014, T031 |

## Consistency findings

- **Graph**: Consistent. Specification, research, model, contract, plan, and
  tasks all use consecutive authored vehicle slot IDs and reject runtime/visual
  ordering as authority.
- **Target vocabulary**: Consistent. Category and synergy tag only, reusing
  `SynergyTarget` semantics without reusing Synergy percentage resolution.
- **Value units**: Consistent. Adjacency grants flat normalized canonical
  physical-stat points; time is excluded.
- **Stacking**: Consistent. Qualifying neighbors add from one snapshot, inbound
  degree is at most two, and there is no recursion/global cap.
- **Composition**: Consistent. Source tier is the only magnitude scaler. Other
  amplifiers and modifications stay separate.
- **Content**: Consistent. Exactly four existing items, one per origin, cover
  both predicate kinds and all four stats. Feature 042 owns broader expansion.
- **Assets**: Consistent. Feature 041 requires no image generation or cropped
  assets; code-native visual treatment is allowed.
- **Verification ownership**: Consistent. T001–T042 are DeepSeek-safe automated
  work; T043 alone owns qualitative browser verification and is explicitly
  frontier/owner-only.

## Dependency and overlap review

- Feature 041 does not block on Feature 038. It supplies a versioned validator;
  Feature 038 later owns transport/schema embedding.
- Feature 042 follows the four-item proof and should treat its clause values as
  balance inputs during the catalog audit.
- Feature 037 waits for the Feature 041/042 item catalog to settle before final
  item art production.
- Feature 035 currently touches general inspector/layout code, and Feature 036
  touches `ContestScene`. To reduce merge conflicts, land the combined 035/036
  remediation batch before Feature 041, or isolate Feature 041 and rebase before
  scene-integration tasks T029/T035/T039.

## Risk review

| Risk | Severity | Mitigation |
|---|---|---|
| Parallel `VehicleBuild`/`InstanceBuild` authorities lose instance evidence | High | T016/T019 require stable instance/slot attribution and projection tests. |
| Adjacency is accidentally amplified twice in `laps.ts` | High | Separate canonical layer plus T011/T015/T018 composition proofs. |
| Garage preview duplicates or drifts from commit semantics | High | T023 extracts shared projection; T025/T030 require deep-equal parity. |
| Scene recomputes adjacency during playback | High | Lock tasks T031–T035 plus retained-only presentation adapters. |
| Dense connectors worsen current UI overlap | Medium | Code-native/text-first model, no always-visible log, and T043 owner/frontier gate. |
| Feature 042 changes catalog balance | Low | Expected follow-up; clause IDs/version contract remain stable unless deliberately revised. |

No unresolved critical specification ambiguity remains. The implementation
agent should not reinterpret the five owner decisions or expand the four-item
content slice.
