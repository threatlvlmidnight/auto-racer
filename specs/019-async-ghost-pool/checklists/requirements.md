# Specification Quality Checklist: Async Ghost Pool

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Scope was resolved through direct chat clarification with the owner
  (2026-08-11), not open [NEEDS CLARIFICATION] markers: this feature is
  explicitly "mechanism first" (a wider authored pool + deterministic
  per-contest selection), with real backend/player-recorded ghosts/a
  shared-lobby ID scheme deferred to a separate, later feature. The
  numeric selection identifier is confirmed to derive from existing run
  data for this pass (`raceId = f(seed, pvpOrdinal)`), with no new
  infrastructure required.
- FR-003's non-coupling requirement (selection MUST accept only a plain
  numeric id/ordinal, never a `Run` or player object) directly answers
  the owner's own stated concern about a future lobby builder needing
  to generate one track and select one ghost pool for a *group* of
  players, not per individual participant. It mirrors
  `018-track-generation`'s identical, already-shipped requirement for
  `generateTrack`, extended to this feature's own selection function.
- Exact pool size and the identifier's source formula are intentionally
  left open for the planning phase (`research.md`), matching how prior
  features (`016`'s `TIER_BONUS_PERCENT`, `018`'s generation constants)
  leave balance-pass/implementation numbers unfixed at the spec stage.
- **Pre-plan review finding (2026-08-11)**: verified directly against
  the codebase (not just re-reading the spec's own prose) that 11+
  existing tests across `tests/unit/contest.test.ts` and
  `tests/unit/playback.test.ts` pass today's 7-entry
  `RIVAL_PROFILES` catalog directly into `resolveContest`, which itself
  throws a typed `ContestResolutionError` (`invalid-roster-size`) for
  any roster that isn't exactly 7. The spec's initial FR-001/FR-006
  wording ("widen the roster") would have broken every one of those
  tests the moment the pool grew past 7. Fixed by making the wider pool
  an explicitly new, separate, additive catalog that *contains* the
  existing 7 rather than replacing/widening them — the existing
  catalog, its validation, and every test built on it are untouched.
  This is the same category of finding `/speckit.analyze` caught for
  `018` (a wrong-file claim) — verify claims against the actual
  codebase, not just internal document consistency.
