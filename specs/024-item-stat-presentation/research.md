# Research: Item Stat Presentation

## Decision 1: One pure item-presentation model feeds every scene

**Decision**: Add a framework-free `itemPresentation.ts` in the presentation
layer. It accepts an `ItemDefinition` plus an explicit context and produces
typed compact-card, inspector, placement-comparison, and resolved-evidence
models. Phaser code draws those models but does not author or reinterpret rule
text.

**Rationale**: Today `resultFormatting.ts`, `garagePresentation.ts`, and
`PrepareScene.ts` independently describe the same item. That already produces
legacy labels such as Performance/Neutral that do not express the 70-item
catalog. A single pure source is testable across every catalog item and prevents
screen-specific drift.

**Alternatives considered**:
- Format directly inside each scene: rejected because terminology, signs, and
  omissions would diverge again.
- Store final card strings on every item: rejected because tier, installation,
  build relationships, affordability, and lap state are contextual, and
  authored prose must never become simulation input.

## Decision 2: Cards are typographic summaries; icons become supporting marks

**Decision**: Compact cards use a header (name/tier), metadata row
(category/origin), and ordered consequential effect lines. Each line includes a
non-color direction marker, concise stat/rule label, formatted magnitude, and
condition token where applicable. The existing large abstract icon is reduced
to a small category/effect-family mark.

**Rationale**: The current icon consumes most of a 190×48 card while the item
name is 11px and effects are hidden. The choice being made is numerical and
conditional, so readable text must own the space.

**Alternatives considered**:
- Preserve icon-first cards and improve tooltips: rejected because required
  information would remain interaction-dependent and unusable on touch.
- Put complete rules on every card: rejected because the most complex items
  would destroy comparison density. Compact cards expose every consequential
  fact but may phrase complex mechanics as linked rule tokens; the inspector
  expands them.

## Decision 3: Persistent selection and optional hover are separate states

**Decision**: Each scene tracks a persistent selected item. Pointer hover may
temporarily preview another item in the inspector, but pointer exit restores the
persistent selection. Click/tap/keyboard activation selects without committing.
Placement alone commits. A drag begins only after the input crosses Phaser's
drag threshold; a tap that never crosses it remains selection.

**Rationale**: This implements the clarified contract equally for mouse and
touch, avoids hover dependency, and prevents drag gestures from accidentally
accepting an offer.

**Alternatives considered**:
- First tap selects, second tap accepts: rejected because selection must never
  commit and would be ambiguous on mobile.
- Long-press for details: rejected as hidden, slow, and inaccessible to keyboard.

## Decision 4: Drag/drop and select-then-destination share one command path

**Decision**: Both gestures produce the same `GarageSource` and
`GarageDestination`, request the same `previewGarageCommand` result, and commit
with the existing authoritative acquisition/garage functions. Destination focus
or hover produces the placement inspector before release/activation.

**Rationale**: Input parity is safest when gesture handling is replaceable but
the preview and commitment semantics are identical.

**Alternatives considered**:
- Maintain separate touch placement logic: rejected because legality, swap, and
  replacement behavior would drift.

## Decision 5: Formatting uses stat-native units and stable precision

**Decision**: Player-facing physical deltas use the simulation's abstract units
without pretending they are researched SI measurements:

| Stat | Compact label | Unit | Precision |
|------|---------------|------|-----------|
| Acceleration | Acceleration | `speed/s` | whole number unless authored fraction exists |
| Top Speed | Top Speed | `speed` | one decimal maximum |
| Braking Power | Braking Power | `speed/s` | whole number unless authored fraction exists |
| Cornering Speed | Cornering Speed | `speed` | one decimal maximum |
| Direct time | Lap Time | `s` | two decimals |
| Amplification | named target | `%` | authored precision |

Trailing zeroes are removed from compact cards. Inspector values retain enough
precision to reconcile the authored value. Physical positive deltas are gains
and negative deltas are losses; time deltas invert that semantic direction
(negative time is beneficial). Every line carries `▲ Gain`, `▼ Loss`, or an
equivalent word/icon in addition to color.

**Rationale**: Feature 021 explicitly treats units as an internally consistent
abstract scale. Showing `m/s` would claim real-world calibration the simulation
does not have. Omitting units would violate FR-005 and make time, percent, and
physical deltas ambiguous.

**Alternatives considered**:
- SI units (`m/s`, `m/s²`): rejected as falsely precise.
- Unitless numbers: rejected because different effect types would be difficult
  to distinguish and compare.

## Decision 6: Rules become structured effect lines, never parsed prose

**Decision**: The presentation model reads typed fields (`physics`,
`conditionalPhysics`, `buff`, `synergyEffects`, installation behaviors) and
creates structured lines. Existing authored `description` remains visible as
supporting rule text, but the formatter never parses it to discover magnitude,
target, eligibility, or condition.

Rule prefixes are stable: `WHEN` for a condition, `PER` for count/value scaling,
`EVERY` for cooldown cadence, and `WHILE` for storage or installation state.

**Rationale**: Typed data is authoritative and localizable; parsing prose would
be fragile and would violate the project's established separation between
simulation operations and inspector text.

## Decision 7: Authored, contextual, and resolved information are distinct

**Decision**: Inspector sections are ordered as:

1. Identity — name, tier, origin, category, price/affordability.
2. Effects — current tier-adjusted base/physical effects and equal-weight
   tradeoffs.
3. Rules — conditions, Buff/Synergy target and cadence, tags.
4. Placement — Fitted/Flexible/Improvised/Stored active and lost behavior.
5. Current evidence — satisfied relationships or lap-specific activation,
   accumulation, and contribution.

Authored tier-one values remain accessible when effective tier values are shown.
Resolved evidence always identifies its build/placement/lap context.

**Rationale**: Mixing authored potential with what happened is the primary way
an otherwise accurate inspector becomes misleading.

## Decision 8: Selection state is scene-local; item identity is stable

**Decision**: Scenes store only the selected authoritative item identity and
current context key (destination or lap). They regenerate presentation models
after encounter/build/lap changes. If the item disappears, combines, or is sold,
selection moves to the authoritative resulting item when unambiguous; otherwise
it closes.

**Rationale**: Persisting a formatted model would create stale price, tier,
synergy, or lap data. The item ID is the stable reference; the model is derived.

## Decision 9: Responsive layout changes composition, not content

**Decision**: Wide layouts use offers/build and inspector side-by-side where
space permits. The 800×450 logical canvas uses a bottom inspector region with
compact scrolling/paging for long rules. Portrait layouts stack cards above a
scrollable inspector. Compact cards may change from row to a two-column stat
grid, but cannot drop a penalty, condition, target, or unimplemented-state label.

**Rationale**: Hiding content at narrow widths contradicts the feature. Reflow
and scrolling preserve hierarchy without shrinking text into illegibility.

## Decision 10: Feature 025 consumes shared vocabulary, not item UI internals

**Decision**: Export the stat metadata/formatting primitives needed for
consistent names, order, signs, units, and precision. Feature 025 may reuse
those primitives for aggregate vehicle stats but does not reuse item-card or
item-inspector models.

**Rationale**: The two features need a common language but have different
entities and information hierarchy. This prevents circular ownership.

## Decision 11: Resolution emits per-item physical evidence

**Decision**: Extend `PlayerLap.physics` with one evidence entry per held item
that contributed or could have contributed physical stats that lap. Each entry
records the source item/location, effective tier and installation state, flat
resolved deltas, conditional resolved deltas and match state, Buff/Synergy
applications, activity state, and an explicit reason when nothing applied.

The resolver constructs this evidence from the same effective items and
condition matches already used to calculate `physics.stats` and phases. It does
not call physics a second time and presentation never recomputes these values.

**Rationale**: Existing `ContributionEvidence` is primarily a legacy time-effect
ledger. A physics-only direct item can appear neutral there even though it
changes the lap, while `PlayerLap.physics.stats` is only an aggregate. Neither
can reconcile multiple item sources after tier, installation, Synergy, Buff,
and condition handling. Constitution Principle III requires authoritative
attribution, not a presentation-layer estimate.

**Alternatives considered**:
- Reconstruct effective deltas in `itemPresentation.ts`: rejected because it
  duplicates resolution and can drift.
- Show only aggregate stats: rejected because FR-017 requires individual
  attribution.
- Change physics results themselves: rejected; this is evidence-only and all
  existing times/stats/outcomes remain identical.

## Decision 12: Test Day states its current evidence ceiling

**Decision**: Test Day uses the shared inspector for authored rules and every
legacy contribution fact it actually records. Because its current legacy
two-car path does not evaluate track-aware physics, physical-stat resolution is
labeled `Not evaluated in this Test Day`, never `0`, inactive, or estimated.

**Rationale**: Honest unavailability is more transparent than fabricated
parity. Making Test Day track-aware would change practice resolution and belongs
in a dedicated feature with its own regression contract.

## Decision 13: Feature 024 models future layouts; feature 026 binds them

**Decision**: Runtime integration in feature 024 targets the current 800×450
logical canvas. A pure layout function is tested with 1920×1080, 1366×768,
1024×768, 800×450, and 390×844 inputs so the item system has a defined reflow
contract. Feature 026 owns changing Phaser's game-wide scale/canvas behavior and
binding the non-current modes to real scenes.

Minimums on the current logical canvas are 10px compact text, 11px inspector
text, 14px primary action labels, and 40×32 logical-pixel pointer/touch targets.
Long inspectors page or scroll instead of shrinking below those floors.

**Rationale**: Changing the fixed canvas affects every scene and is part of the
larger visual upgrade. Pretending a 390×844 browser creates a 390×844 Phaser
scene today would make feature 024's tests dishonest.

## Decision 14: Every conceptual presentation type has an explicit owner

**Decision**: `ItemVisualKind` and `ItemStateBadge` are defined in the pure
presentation module. `PlacementPresentationContext` is a derived adapter input
owned by `garagePresentation.ts`. The contract uses the existing
`PlacementPreview` returned by `previewGarageCommand`.
`RecordedItemEvidence` is the union adapter over existing
`ContributionEvidence` and new `ItemPhysicalContributionEvidence`.

**Rationale**: Conceptual names without an owner encourage duplicate lookalike
types and hide evidence gaps until implementation.
