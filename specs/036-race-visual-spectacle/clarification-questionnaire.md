# Feature 036 Clarification Questionnaire: Race Visual Spectacle

**Created**: 2026-08-15

**Status**: Complete — all owner decisions integrated.

## Accepted decisions

| Question | Decision |
| --- | --- |
| Q1 | Only player-involved events may receive dramatic PiP. The budget begins at two and grows with race length to a maximum of six in the final championship. Rival-only interactions remain in normal broadcast presentation. |
| Q2 | Four bespoke player-vehicle models plus reusable rival silhouette classes with stable non-color number/pattern/label identity. |
| Q3 | The main circuit view remains a stable broadcast-wide camera with local emphasis, rather than full circuit reframing cuts. |
| Q4 | The budget is 2 moments at 8–10 laps, 3 at 12 laps, and 4 at 14–16 laps. |
| Q5 | Enhanced top-down main track; three-quarter/isometric art only in cut-ins. |
| Q6 | One selectable persistent focus window; selected event PiP temporarily replaces it, then it returns to the chosen car. |

## Follow-up questions

### Q4 — How should the player-involved PiP budget scale by race length?

**Recommended: Option A** — Use the existing 8/10/12/14/16-lap schedule:
2 / 3 / 4 / 5 / 6 eligible moments respectively. Shorter/legacy races use two;
unused slots remain empty and never cause a fabricated event. This makes the
requested final-championship cap exact and easy to test.

| Option | Description |
| --- | --- |
| A | 8/10/12/14/16 laps map to 2/3/4/5/6 moments; shorter legacy races allow 2. |
| B | Begin at 2 and add 1 for every 3 laps, capped at 6. |
| C | Use a fixed 6-event budget for every scored race, selecting only player events. |
| Other | Give a testable lap-count-to-budget rule. |

### Q5 — What main-track perspective should the first release use?

**Recommended: Option A** — Retain top-down marker geometry for the main track,
but add illustrated depth, shadows, banking/landmark cues, and richer track
materials. Reserve three-quarter/isometric art for cut-ins. This preserves exact
track-path legibility and avoids a camera projection becoming a second movement
model.

| Option | Description |
| --- | --- |
| A | Enhanced top-down main track; three-quarter/isometric art only in PiP/cut-ins. |
| B | Move the main track to a fully isometric/three-quarter camera. |
| C | Use a shallow 2.5D tilt on the main top-down track while retaining its current plan-view path. |
| Other | Define a perspective and non-negotiable marker/path constraints. |

### Q6 — How should the continuous focus view coexist with event PiP?

**Recommended: Option A** — Add one persistent focus window: it defaults to
following the player, can switch to any named car as a presentation-only control,
and temporarily yields that same window to a selected event cut-in before
returning to the chosen car. The main view remains the complete circuit. This
keeps a full-track overview and focused action without stacking competing PiPs.

| Option | Description |
| --- | --- |
| A | One focus window; player default, optional car selection; selected event cut-in temporarily replaces it. |
| B | Keep focus view and event cut-in visible simultaneously as two separate PiPs. |
| C | Focus window follows only the player; no spectator car selection. |
| Other | Define number of windows, selection behavior, and event replacement/queue rule. |

## Response template

Accept all recommendations

Exceptions:
Q4: option or replacement
Q5: option or replacement
Q6: option or replacement
