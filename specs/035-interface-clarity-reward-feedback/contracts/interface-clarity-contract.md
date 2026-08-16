# Internal Contract: Interface Clarity and Reward Feedback

## Circuit identity

circuitPresentationIdentity(track, stage?) returns a pure display model. For a
scored race it returns retained track name plus RegionDefinition.name. It never
calls track generation and never changes stage, track, or result. Missing region
returns Location unavailable.

For a completed scored race, settlement retains only trackId, trackName, and
regionId as HistoryCircuitEvidence alongside the existing history summary. The
history projection consumes those facts; it must not regenerate or infer a
track from a seed.

## Adjustable semantics

adjustablePresentation(item, heldLocation, eligibleControls, selections) returns
available only when the item is installed, declares configurableSetup, and its
control family is eligible. The model exposes exactly one ADJUSTABLE label and
the shared control's resolved state. It must not create a control or derive a
new stat delta.

## Rarity and card state

cardFeedbackState(item, context) reads ItemDefinition.rarity and existing
availability/tier-upgrade facts. Standard, Notable, and Rare are catalog labels
only. A tier-upgrade cue is derived from the existing acquisition resolution;
it never performs tiering or purchases.

## Rendering and accessibility

Phaser renderers consume these pure models. Every rarity, adjustable, upgrade,
and motion fact has text/icon/structural representation and an accessibility
label. Reduced motion removes nonessential animation without suppressing facts.

## Audit evidence

The acceptance matrix records scene, state, viewport, input mode, and result.
A case passes only when all consequential text, controls, focus indications,
prices, tiers, and disabled reasons are visible and reachable. Feature 026 owns
any failure requiring host/canvas reflow.
