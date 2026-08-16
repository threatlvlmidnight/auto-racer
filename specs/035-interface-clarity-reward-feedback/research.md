# Research: Interface Clarity and Reward Feedback

## R1 — Circuit location has an existing authoritative source

Decision: reuse RegionDefinition.name as the scored-race LOCATION and pair it
with the retained Track.name. No city/venue type is added.

Evidence: TourStage already carries regionId; PreRaceScene and ResultScene read
regionDefinition(stage.regionId).name; NCarContestResult retains track.name.
ContestScene receives the run and retained result, so it can consume both facts.
Test Day remains a fixed unscored activity and labels its borrowed upcoming track
without a geographic claim.

## R2 — Adjustable is derived from existing setup authority

Decision: an item is Adjustable exactly when its installed state contributes
ItemDefinition.configurableSetup to the current eligible setup controls.
The badge is presentation-only and absent for stored/non-configurable items.

Evidence: ConfigurableSetupEffect and EligibleSetupControl already define
installed-only pre-race control eligibility in simulation/types.ts and
raceSetup.ts. This feature adds no control family or setup calculation.

## R3 — Rarity requires explicit display-only authored data

Decision: add Standard, Notable, and Rare to ItemDefinition and author one value
for every playable item. Rarity does not alter pools, seeded draws, price, tiers,
or any simulation/economy resolver.

Rejected: price-derived rarity would communicate a false rule; tier is an owned
state gained after acquisition, not an offer's authored rarity; visual-only local
scene guesses would drift between surfaces.

## R4 — Use existing pure presentation boundaries

Decision: itemPresentation.ts owns item-card state models, itemVisualDescriptor.ts
owns stable visual semantics, and itemVisuals.ts renders reusable cards.
Create circuitPresentation.ts and cardFeedbackPresentation.ts as Phaser-free
models, with scene wiring limited to RunScene, PreRaceScene, ContestScene,
ResultScene, PrepareScene, InventoryScene, and Test Day surfaces.

## R5 — Visual acceptance remains owner-reviewed

Decision: capture one finite audit matrix in acceptance-evidence.md and add pure
layout/state-precedence tests. Browser canvas screenshots and real input paths
remain owner acceptance because the repository has no reliable automated visual
harness. The matrix is limited to 1920×1080, 1366×768, 1024×768, and 800×450;
Feature 026 owns narrow-portrait reflow.

## R6 — Completed-race identity needs retained display evidence

Decision: retain the already-resolved track name/ID and stage region ID on the
scored history summary at settlement, then project it through runPresentation.
The existing history only keeps timing/outcome values, which cannot reconstruct
the exact completed circuit. This is display evidence only and changes neither
track selection nor settlement.
