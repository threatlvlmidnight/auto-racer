# Data Model: Interface Clarity and Reward Feedback

## ItemRarity

A closed display-only catalog field with values Standard, Notable, or Rare.
Every ItemDefinition has exactly one value. It is immutable authored content and
never enters draft probability, price, tiering, race setup, lap simulation, or
settlement.

## CircuitPresentationIdentity

Fields: trackId, trackName, locationLabel, regionId?, raceKind, and mode.

Mode is scored or test-day. Scored identity requires the retained track plus the
current stage region; a legacy/missing region uses the literal fallback
Location unavailable. Test Day uses the borrowed track name plus Fixed test
configuration and Unscored labels.

## HistoryCircuitEvidence

Display-only fields retained with a scored RunHistoryEntry: trackId, trackName,
and regionId. They are copied from the already-resolved race/stage boundary and
exist solely so later history presentation can show the exact circuit identity.
They never participate in settlement, replay resolution, or next-track choice.

## AdjustablePresentation

Fields: itemId, status (available, unavailable, or absent), badgeLabel,
controlFamily?, currentValue?, and explanation. Available requires an installed
configurable item and an eligible setup control; stored items remain absent.

## CardFeedbackState

Fields: rarity, cardRole (offer, held, result, inventory), availability,
selection/focus, upgradeEligibility, motionMode, and semantic tokens.
Precedence is structural: unavailable/disabled action state; rarity identity;
upgrade eligibility; then transient selection/focus. No state suppresses a
price, tier, rule, control, or accessibility label.

## UiAuditCase

Fields: caseId, scene, fixture/state, viewport, input mode, expected controls,
expected identity/card facts, and outcome (pass, fail, or waived). The fixed
landscape viewport set is 1920×1080, 1366×768, 1024×768, and 800×450. Narrow
portrait is explicitly out of scope and must be recorded as a Feature 026
dependency rather than a pass.
