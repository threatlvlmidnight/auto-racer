# Specification Quality Checklist: Demo Feedback Bug Pass

**Purpose**: Track readiness before planning.

- [x] All reported demo issues are captured.
- [x] Confirmed fixes are separated from design investigations.
- [x] Player-facing scenarios and acceptance notes are present.
- [x] Deterministic authority is explicitly protected.
- [x] Crashes, driver skill/signatures, overtaking, and comeback mechanics are
  explicitly deferred to Feature 033 rather than silently approved here.
- [x] Live-stat layout and exact displayed values are clarified.
- [x] Tag display and synergy-inspection interaction are clarified.
- [x] Scaling scope is locked to an audit of shipped composition, fitted-value,
  and cooldown/lap mechanics; misleading persistence claims are removed and no
  cross-race progression item is added.
- [x] Podium win settlement is quantified: third awards +1 reputation without
  changing credits or Championship points; 1st–3rd win classification is locked.
- [x] Additive item-pool tuning may change existing values and synergies, with
  new items allowed only if testing proves existing pools insufficient; the 5-percentage-point
  representative-performance band, 2% optimized-ceiling band, stock-stat
  equality, and no-Nell-nerf constraints are locked.
- [x] Final record policy defines counted race types and tie presentation.
- [x] Remaining economy items and distinct roles are enumerated.
- [x] Economy item triggers, values, tier scaling, and installed/stored eligibility are clarified.
- [x] Inventory presentation strategy and eligible surfaces are clarified.
- [x] UI asset priority and art direction are locked: championship indicators,
  pre-race controls, then shared primary buttons; neutral build-first chrome with
  sparse World's Fair/editorial geometry uses the approved control sheet as its
  initial source.
- [x] Feature scope remains one implementation package with four independently
  testable workstreams.

**Verdict**: Clarification, `/speckit.plan`, and `/speckit.tasks` are complete.
Run `/speckit.analyze` before implementation.
