# Feature 036 Intake: Race Visual Spectacle

**Created**: 2026-08-15

**Status**: Intake — begin clarification after Feature 033's retained event contract is stable.

## Problem

The watched race currently proves deterministic playback, but it does not yet
sell the drama of realistic circuits, differentiated vehicles, driver
signatures, decisive passes, or incidents. Feature 033 owns the authoritative
phase/event/race evidence; this feature turns that retained evidence into a more
exciting visual broadcast without inventing, delaying, or changing outcomes.

## Intended scope

- Upgrade deterministic track geometry into visually credible circuit
  compositions with readable road, runoff, corner, elevation/landmark, and
  camera framing language.
- Replace generic vehicle markers with distinct, readable player/rival vehicle
  models while preserving exact retained positions and hit-free playback.
- Present selected consequential retained events, especially signature
  activations and decisive player-involved passes, as bounded picture-in-picture
  cut-ins with character/action art.
- Add motion, camera, trail, passing, and finish treatments driven only by
  retained race boundaries.
- Preserve speed controls, reduced-motion behavior, and non-color/state text.

## Dependencies and boundaries

- Supersedes the unimplemented visual portions of Feature 013. Do not revive
  its obsolete fixed-speed/no-skip decisions; Feature 030 playback controls stay
  authoritative.
- Depends on Feature 033's final retained event IDs, timing, passes, signatures,
  and incidents. Never changes contest, ranking, timing, or settlement.
- Uses Feature 026/037 visual assets and pipeline where available, but cannot
  block on final item art.
- Feature 034's Guarded evidence may later be rendered, but encounter mechanics
  remain out of scope.

## Initial decisions needed

- Event-selection budget and interruption policy for picture-in-picture.
- Asset scope for four player entrants versus generated rivals.
- Circuit/camera visual language and reduced-motion equivalence.

