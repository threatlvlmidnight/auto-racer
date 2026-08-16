# Race Visual Spectacle Contract

## 1. Authority boundary

- `resolveContest`, retained `NCarContestResult`, Feature 033 enrichment
  evidence, `buildNCarPlaybackSchedule`, and the playback controller are
  authoritative.
- The spectacle layer is a pure projection plus Phaser rendering. It MUST NOT
  call `generateTrack`, mutate result/schedule/event records, change schedule
  time, or initiate results navigation.
- The existing crossed-boundary sequence is the only trigger source for a PiP.

## 2. Circuit and markers

- Circuit layers take the retained `Track` from `schedule.track`.
- Marker position/rotation takes `pointAtProgress` output; decoration may not
  feed a coordinate back into marker placement.
- Every car has a stable profile and text label. If its texture is unavailable,
  draw the documented fallback with number/pattern/label.
- Four distinct player art files reside in `public/assets/race/vehicles/`, have
  stable preload keys, and have source/license or generation provenance recorded
  in `specs/036-race-visual-spectacle/vehicle-asset-manifest.md`.

## 3. Moment selection

- Candidate source: retained Feature 033 events only.
- PiP is a separate bounded presentation tier, not a rewrite of Feature 033's
  `EmphasisClass`; it never changes a retained event's authority or order.
- Eligibility: event has the player as participant and kind is signature,
  player overtake/pass, defense, or incident. Rival-only events never become
  PiP candidates.
- Budget: 8→2, 10→2, 12→3, 14→4, 16→4.
- Ordering: display priority, then Feature 033 retained boundary/kind/order
  sequence. Ties are never broken by wall-clock or random values.
- Each selected event ID is consumed once at most. Unselected events produce no
  PiP. Unused capacity produces no placeholder.

## 4. PiP and focus behavior

- A PiP shows derived driver label, retained event/signature name, and recorded
  consequence; it cannot claim an unrecorded pass or effect.
- An active PiP temporarily replaces the persistent focus window. On complete,
  conflict suppression, skip, or scene cleanup, focus returns to the selected
  car if the scene continues.
- A collision with an active PiP uses precomputed selection priority/order;
  the losing selected moment becomes `suppressed`, not queued or duplicated.
- PiP cannot pause, slow, rewind, or otherwise modify playback controller state.

## 5. Accessibility and resilience

- Non-color identity is mandatory: label, number, and/or pattern accompany all
  vehicle models and focus options.
- Reduced motion presents an immediate static/text equivalent of the same
  retained moment; it does not remove its semantic content.
- Missing optional art falls back to existing legible marker/panel behavior.
- At every state, existing playback controls, race labels, result transition,
  and 1×/2× selection remain reachable.

## 6. Testable guarantees

1. Replaying identical evidence produces the same selected IDs and terminal
   statuses at both playback speeds.
2. Selected count never exceeds the lap budget.
3. Every rendered PiP maps one-to-one to a retained selected event ID.
4. Rival-only events cannot render as PiP.
5. Focus returns to the selected car after every active PiP path.
6. Track/marker snapshots and final result match the same run without the
   spectacle layer.
