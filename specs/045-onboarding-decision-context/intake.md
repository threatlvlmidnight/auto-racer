# Feature 045 Intake: Onboarding and Decision Context

**Created**: 2026-08-17  
**Status**: Implementation-ready — clarified, planned, tasked, and analyzed;
coding has not started

## Source feedback

Feature 045 consolidates three related comprehension failures from the hosted
and deployed builds:

1. Shops do not show the current region's stat demands, so players cannot
   readily judge acquisitions against the races ahead.
2. Improvised placement is technically disclosed but not visually prominent
   enough before commitment or during later inspection.
3. The game lacks a first-run tutorial explaining Power, Chassis, and Flex slot
   types and the resulting Fitted, Flexible, and Improvised states.

These belong together because the tutorial establishes the vocabulary, the
placement UI reinforces it during real decisions, and regional demand gives the
player a reason to apply it.

## Intended scope

- Add a deterministic, isolated, non-scoring interactive topology tutorial.
- Teach item categories, slot types, legal placement, base effects, Fitted,
  Flexible, Improvised, lost Fitted benefits, and authored mismatch effects.
- Keep the tutorial skippable and replayable, with pointer/touch/keyboard parity
  and reduced-motion/non-color equivalents.
- Make Improvised state structurally prominent in preview, installed-item, and
  retained-evidence surfaces without changing placement legality or mechanics.
- Add truthful current-region demand context to the selected acquisition
  surfaces without changing stock, prices, odds, or race outcomes.
- Distinguish stable regional tendency from exact next-race information and
  never imply an unretained future circuit is known.
- Preserve an active run byte-for-byte when help/tutorial is opened and closed.
- Keep browser visual acceptance separate for a frontier model or owner.

## Boundaries

- Feature 045 does not change item effects, vehicle topology, regional track
  generation, encounter frequency, stock selection, economy, or contest math.
- It consumes Feature 042's meaningful Fitted/Improvised content and Feature
  041's adjacency vocabulary but does not redefine either authority.
- It creates no image/audio assets. Existing code-native components and approved
  backgrounds may be used; artwork generation remains outside DeepSeek scope.
- It does not replace the broader Feature 044 responsive-frame work.
- A tutorial fixture is not a real run, scored race, Test Day result, unlock,
  or economy transaction.

## Questions requiring clarification

- When is the first-run tutorial offered or required, and how is Skip handled?
- Is the tutorial a separate sandbox or embedded into the first championship?
- What completion/skip state persists, where, and how can it be reset?
- Does V1 teach only topology, or also storage, adjacency, synergy, and Test Day?
- What exact structural treatment makes Improvised sufficiently prominent?
- How should explicit no-additional-consequence mismatches be presented?
- Does shop guidance show regional tendency, exact next-race demand, or both?
- Which acquisition surfaces receive regional context?
- Which stat vocabulary and precision are shown?
- Where can a player replay contextual help without risking active-run state?
