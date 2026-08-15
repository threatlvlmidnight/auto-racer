# Demo Bug and UX Fix Log

Issues reported during the hosted GitHub Pages demo. This file records the
player-visible problem, current mitigation, and intended follow-up without
silently expanding an active feature.

## DEMO-001 — Reward Draft Test Day return mismatch

**Status**: Temporarily mitigated and verified; permanent exact-return fix remains deferred.

**Reported behavior**: Opening Test Day from Reward Draft can return to an
unavailable screen stating that the Test Day return point no longer matches the
run. This interrupts the draft and leaves the player at a recovery prompt.

**Temporary rule**: Do not show the Test Day button while the active encounter
is `reward-draft`. Test Day remains available from currently valid surfaces,
including the run hub, Parts Supplier, Cross-Pollination, and pre-race setup.

**Permanent follow-up**: Diagnose the Reward Draft return-context mismatch and
restore Test Day on that surface only after the exact encounter, offer,
selection, focus, and navigation state round-trips without changing the run.

**Acceptance notes**:

- Reward Draft contains no visible or focusable Test Day action.
- Hiding the action does not resolve, decline, reroll, or otherwise mutate the draft.
- Other valid Test Day entry points retain their existing behavior.
- Feature 032 regression coverage continues to assert that Reward Draft has no
  visible/focusable Test Day action and that the draft payload is unchanged.

## DEMO-002 — Reward Draft needs player-facing skip language

**Status**: Implemented as part of Feature 032; the permanent DEMO-001 return
guard remains in place.

**Reported behavior**: Reward Draft currently presents `Decline all`. Players
expect a clear way to skip the rewards and continue the run, and the existing
label does not communicate that flow clearly enough.

**Intended behavior**: Present an explicit `SKIP REWARDS` action on Reward
Draft. Activating it accepts no offered item, preserves the current build and
storage, completes the current Reward Draft once, and returns to normal run
progression. It must not spend or grant credits, move items, or accidentally
select an offer.

The existing `declineReward` transition already represents the required domain
outcome (`acquisitionOutcome: declined`). Unless later design work gives
`Decline all` a distinct meaning, implementation should replace that label with
`SKIP REWARDS` rather than expose two controls that perform the same action.

**Acceptance notes**:

- The action is visible without first selecting an offer.
- Pointer, touch, and keyboard activation produce the same transition.
- Repeated or rapid activation completes the encounter no more than once.
- Skipping leaves build, storage, and credits unchanged and records no accepted item.
- Cross-Pollination wording should be reviewed separately before inheriting the same label.
