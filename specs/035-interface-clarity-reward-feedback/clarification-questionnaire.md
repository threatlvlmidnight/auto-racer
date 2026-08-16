# Feature 035 Clarification Questionnaire: Interface Clarity and Reward Feedback

**Created**: 2026-08-15

**Status**: Complete — all owner decisions integrated.

This pass distinguishes choices already determined by the shipped game from the
two decisions that create new player-facing content vocabulary. Accepting the
recommendations keeps Feature 035 presentation-only and preserves the existing
simulation, economy, and upgrade authority.

## Decisions already supported by the repository

| Topic | Resolved decision | Evidence |
| --- | --- | --- |
| Race location | Use the existing World Tour region name as the geographic location. Show it with an explicit LOCATION label; do not invent a city, venue, or track-location simulation field. | src/content/regions.ts; PreRaceScene and ResultScene already consume regionDefinition(stage.regionId).name. |
| Circuit identity | Show recorded track.name alongside the region location for scored races. Test Day uses the upcoming recorded track when entered from setup and remains explicitly TEST DAY · UNSCORED. | src/simulation/tracks.ts; Feature 028 Test Day decision. |
| Scope boundary | Audit the current 1920×1080, 1366×768, 1024×768, and 800×450 landscape compositions. Do not claim a new narrow-portrait renderer or clear the 390×844 text-size waiver. | Feature 026 and Feature 011 deferred records. |
| Upgrade truth | Reuse Feature 032's receipt and before/after overlay. This feature may add hierarchy and bounded feedback, but never recalculates eligibility, changed values, or settlement. | src/simulation/encounters.ts; Feature 032 contract. |
| Accessibility | Every new cue has text/icon/structural meaning and a reduced-motion equivalent. No required fact depends on hover, color, or animation. | Constitution Principles III–V and Feature 035 intake. |

## Owner decisions required

**Accepted 2026-08-15**: Q1 Option A; Q2 Option A.

### Q1 — What should Adjustable mean in the item vocabulary?

**Recommended: Option A** — Keep established proper item names where they are
not misleading, add a consistent ADJUSTABLE badge only when an installed item
actually exposes a pre-race control, and rename the non-configurable
Variable-Ratio Test Gearbox to **Two-Speed Test Gearbox**. The
Variable-Pitch Propeller keeps its established name because it does expose
the propeller-pitch control; its badge, not its name, communicates availability.

| Option | Description |
| --- | --- |
| A | Badge denotes a live pre-race control; rename only the misleading non-configurable gearbox. |
| B | Rename every configurable item to begin with Adjustable and rename every non-configurable Variable item. |
| C | Keep all authored names and use explanatory copy only; no badge or content rename. |
| Other | Provide the exact naming and badge rule. |

### Q2 — What rarity taxonomy should cards use?

**Recommended: Option A** — Add an explicit, display-only catalog rarity to
every playable item: **Standard**, **Notable**, or **Rare**. It is authored
content, has no effect on odds, price, tier scaling, simulation, or economy, and
is always accompanied by text/icon/frame treatment. This makes “rare offer”
truthful rather than inferring rarity from price or tier.

| Option | Description |
| --- | --- |
| A | Add display-only Standard / Notable / Rare catalog rarity; visual treatment only. |
| B | Do not add rarity; emphasize only existing item tier and duplicate-upgrade eligibility. |
| C | Derive visual rarity from existing price bands; no new catalog field. |
| Other | Provide names, source of truth, and whether rarity affects any authority. |

## Response template

Accept all recommendations

Exceptions:
Q1: option or replacement
Q2: option or replacement
