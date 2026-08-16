# Research: Race Visual Spectacle

## Decision 1 — Retained track geometry is the only circuit source

**Decision**: Build the road, verge, start line, landmarks, shadows, and safe
marker path from `NCarPlaybackSchedule.track.points` and its retained
characteristics. Decorative smoothing may interpolate pixels between adjacent
points but may not create a new logical path or supply coordinates to playback.

**Rationale**: `ContestScene` already attaches the contest's retained track to
the schedule, and `pointAtProgress` is the single marker-position projection.
This preserves Feature 027's geometry boundary and handles compact paths,
hairpins, and switchbacks without an independent generator.

**Alternatives rejected**: Regenerating from seed risks divergence; hand-drawn
per-track paths would be incomplete for procedural tracks; physics-derived
camera paths would make presentation authority ambiguous.

## Decision 2 — Main camera stays wide top-down; PiP owns close drama

**Decision**: Keep the full circuit in a stable enhanced top-down main view.
Use shadows, edge layers, banking/landmark cues, and local highlights for depth.
Three-quarter or isometric art appears only inside the focus/PiP window.

**Rationale**: A static wide view keeps progress, field context, and existing
controls readable. It directly implements the clarified camera choice.

**Alternatives rejected**: Event-driven reframing can hide race state and makes
the schedule appear to change; an isometric main map complicates path fidelity
and is less suitable for following an 8-car field.

## Decision 3 — Visual profiles are display-only, stable, and fault tolerant

**Decision**: Map each entrant ID to one of four bespoke player profiles backed
by a distinct 2D art file under `public/assets/race/vehicles/`; record each
file's generated/commissioned/license provenance in a feature asset manifest.
Assign rivals a deterministic reusable silhouette class plus visible race
number, pattern, and label. A profile has a preloaded texture key and an
explicit geometric/labeled fallback marker.

**Rationale**: `CarPlaybackSchedule` already supplies stable ID, role, name,
and color. The profile layer adds recognition without touching vehicle stats,
slot topology, roster selection, or race progression.

**Alternatives rejected**: Color-only tinting is inaccessible; random visual
assignment harms replay consistency; attaching stats to a visual profile would
violate mechanical neutrality.

## Decision 4 — PiP candidates are selected once from retained evidence

**Decision**: At scene initialization, derive candidate `SpectacleMoment`s from
the immutable Feature 033 enrichment events. A candidate is eligible only when
the player is a participant and the kind is a signature activation,
overtake-completed/attempt, defense, or incident. Sort by a display priority
then Feature 033's retained boundary/order sequence; select no more than the
lap budget. At runtime, only selected IDs may activate.

**Display priority**: player signature activation; completed player pass or
being passed; player defense; player incident; uncompleted player overtake
attempt. Within a category, retain Feature 033's existing deterministic order.

**Rationale**: A precomputed selection gives a repeatable race-wide budget and
prevents frame rate, playback speed, or later scene state from changing which
moments appear. The priority makes the most meaningful outcome evidence visible
first while the clarified player-involvement rule excludes rival-only drama.

Feature 033's `EmphasisClass` remains its own banner/marker classification.
Feature 036 PiP is a separate bounded presentation tier: it reads the same
event evidence but neither reclassifies an event nor changes its authority.

**Alternatives rejected**: Selecting per frame is speed-sensitive; showing all
events exceeds the requested budget; generating a cut-in with no evidence
would fabricate race meaning.

## Decision 5 — Conflict policy is deterministic and never delays playback

**Decision**: A PiP is a bounded presentation overlay. If a selected event
arrives while another selected PiP is active, retain the event chosen by the
precomputed priority/order policy and mark the other selected event suppressed
for PiP (its normal broadcast/ticker evidence remains available). No overlay
pauses, rewinds, delays, or changes the controller.

**Rationale**: The existing playback controller is the sole schedule-time and
results-ready authority. This policy satisfies exact-once display consumption
without queuing an overlay beyond its meaningful boundary.

**Alternatives rejected**: Queuing after the event obscures timing; replacing an
active cut-in produces unstable mid-message behavior; pausing violates the
playback-controls contract.

## Decision 6 — One focus window is presentation-local state

**Decision**: The focus window defaults to the player. Selecting a named car
updates only `selectedCarId`. An active PiP temporarily overrides its displayed
car(s); completion, suppression, skip, or results transition restores the last
selected car when the scene remains active.

**Rationale**: This makes the user-requested selected-car view coexist with
event cuts while keeping the main circuit and contest controller unchanged.

**Alternatives rejected**: A second camera that follows a car replaces the
main broadcast context; allowing selection to affect race priority or timing
would turn a display preference into game authority.

## Decision 7 — Reduced motion and missing art share semantic fallbacks

**Decision**: For every PiP and vehicle profile, supply text containing the
driver, event/signature, and recorded consequence. Reduced motion uses static
appearance/no animated transition; unavailable artwork uses a labeled
geometric marker or panel with the same text.

**Rationale**: The spectacle must remain understandable if optional art cannot
load or motion is disabled.

**Alternatives rejected**: Silently omitting a selected event loses retained
meaning; a generic unlabeled marker breaks non-color identity.
