# Feature 036 Owner QA Findings — 2026-08-17

**Status:** Failed acceptance; remediation required before T044 may close.

## Finding VIS-036-01 — Track presentation regression

The current track reads as a very thick, flat gray polygon with multiple dark
outlines. It dominates the illustrated environment but does not look like a
credible racing surface. The center line is too subtle to restore depth, the
road has no material texture or useful edge vocabulary, and the field becomes
an unreadable stack of cars and labels in a small section of the loop.

Required immediate remediation:

- Restore a readable road-to-environment scale and preserve enough circuit
  space for the full field.
- Separate cars at race start and dense boundaries without changing retained
  positions or results.
- Make player/rival labels readable without drawing every full label through
  the same pile.
- Establish road, shoulder/edge, center/guide marking, start/finish, and depth
  hierarchy even before bespoke segment art exists.
- Preserve the retained generated path exactly; presentation cannot select or
  alter track physics.

## Finding VIS-036-02 — Race spectacle has no protected stage

The race surface, top HUD, focus panel, right-side stat evidence, event copy,
installed cards, and playback controls all draw into one another. The spectacle
additions increased information density without reserving exclusive layout
regions.

Required immediate remediation:

- Coordinate with Feature 035's `UI-035-03` safe-region layout.
- Keep the main circuit and full field unobstructed by persistent UI.
- Bound the focus/PiP view and ensure it cannot collide with identity, lap, or
  playback controls.
- Maintain readable fallbacks for reduced motion and missing art.

## Follow-up boundary

Feature 043 will specify reusable art assets for generated track segments and
multiple surface flavors. Feature 036 still owns making its current renderer
acceptable without those future assets; T044 cannot pass by deferring the
visible regression to Feature 043.
