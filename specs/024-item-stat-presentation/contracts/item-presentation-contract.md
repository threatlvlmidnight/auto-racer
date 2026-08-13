# Contract: Item Stat Presentation

## Runtime consumer inventory

| Consumer | Context | Authoritative source |
|---|---|---|
| `PrepareScene` offers | reward/supplier | encounter payload, credits, duplicate-acquisition preview |
| `PrepareScene` installed/storage | garage/storage/placement | `VehicleBuild`, `resolveInstallation`, `previewGarageCommand` |
| `ContestScene` | race lap | player `PlayerLap.physics.itemContributions` |
| `ResultScene` | scored result | immutable player laps and result board/storage |
| `TestDayScene` | Test Day briefing | locked practice snapshot; physical evidence explicitly unavailable |
| `PracticeContestScene` | Test Day lap | legacy recorded time evidence; physical evidence explicitly unavailable |
| `PracticeResultScene` | Test Day result | legacy recorded result evidence; physical evidence explicitly unavailable |
| `garagePresentation.ts` | adapter | garage preview, installation, and current build relationships |
| `resultFormatting.ts` | compatibility adapter | shared compact/inspector models only |
| `itemVisuals.ts` | renderer | compact, inspector, and placement-comparison models |

## 1. Shared formatter boundary

```ts
function compactItemModel(
  item: ItemDefinition,
  context: ItemPresentationContext,
): CompactItemModel;

function itemInspectorModel(
  item: ItemDefinition,
  context: ItemPresentationContext,
): ItemInspectorModel;
```

- Both functions MUST be pure and deterministic.
- They MUST NOT mutate the item, build, run, encounter, result, or context.
- They MUST NOT import Phaser or read scene/global state.
- Every catalog item MUST format without a fallback exception.
- The full inspector MUST represent every consequential authored item field.

## 2. Stat vocabulary and formatting

```ts
function statDefinition(stat: ItemStatKey): StatPresentationDefinition;

function formatStatDelta(
  stat: ItemStatKey,
  value: number,
  options?: { compact?: boolean },
): { valueLabel: string; direction: EffectDirection; directionLabel: string };
```

- Stat order is Acceleration, Top Speed, Braking Power, Cornering Speed, then
  direct Lap Time where present.
- Physical positive values are gains; physical negative values are losses.
- Time negative values are gains; time positive values are losses.
- Zero is neutral and MUST NOT be styled as a gain.
- Names, units, signs, and precision MUST be identical on every surface.
- Direction MUST be available as text/structure in addition to color.

## 3. Compact-card completeness

The compact model MUST expose without interaction:

- name, origin, category, and tier above one;
- price and affordability where relevant;
- every direct physical/time benefit and penalty;
- the target and magnitude of every Buff/Synergy rule;
- a concise condition linked to each conditional contribution;
- stacking, count, or fitted-value scaling behavior;
- an honest `No race effect` line for economy-only items.

A compact renderer MAY reflow or abbreviate labels using the model's provided
compact labels. It MUST NOT delete a penalty, condition, target, scaling mode, or
unimplemented state to fit.

## 4. Inspector completeness

The inspector MUST disclose:

- identity, category, origin, tier, price/affordability, and synergy tags;
- authored tier-one and current tier-adjusted effect values;
- flat and conditional physical contributions;
- Buff/Synergy target, eligible set, magnitude, cadence, and scaling behavior;
- Fitted, Flexible, Improvised, and storage behavior relevant to the context;
- carried tags separately from performed Synergy effects;
- current relationship satisfaction when a build context exists;
- resolved lap evidence when a lap context exists.

Absent mechanics MUST produce no empty heading unless their absence changes the
placement decision, in which case the absence is stated directly.

## 5. Placement comparison boundary

```ts
function placementComparisonModel(
  preview: PlacementPreview,
  context: PlacementPresentationContext,
): PlacementComparisonModel;
```

- The function MUST consume an existing garage preview and MUST NOT determine
  placement legality independently.
- Incoming and outgoing items MUST use the same stat order, units, precision,
  and direction rules.
- Fitted/Flexible/Improvised/Stored state and all gained, lost, active, and
  inactive behavior MUST be visible before commitment.
- Cancelling or invalidating the preview MUST leave the authoritative build
  unchanged.

## 6. Resolved-evidence boundary

```ts
function resolvedItemEvidence(
  item: ItemDefinition,
  evidence: RecordedItemEvidence,
  lap: number,
): ItemLapEvidence;
```

- The adapter MUST read recorded contest or Test Day evidence and MUST NOT rerun
  simulation.
- Authored rules and resolved evidence MUST remain distinct.
- Conditional activation, cooldown, stacking, target stat, tier, installation,
  storage activity, and contribution MUST reflect the inspected lap.
- Every held item remains inspectable. Zero contribution requires a specific
  inactive/zero reason when the evidence can provide one.
- If required evidence is unavailable, the model MUST say so rather than invent
  or reuse a stale value.

### Resolution evidence extension

`PlayerLap.physics` MAY gain
`itemContributions: ItemPhysicalContributionEvidence[]`.

- Resolution MUST emit each entry from the same effective item values already
  used for that lap's aggregate stats and conditional physics.
- Evidence MUST retain source item/location, tier, installation, flat resolved
  deltas, conditional resolved deltas and matched segments, Buff applications,
  Synergy applications, and inactivity reason.
- Evidence generation MUST NOT call `simulateLapPhysics` again or change any
  pre-existing resolved stat, phase, time, or outcome.
- A regression test MUST compare all pre-existing result fields before/after the
  extension while separately asserting evidence correctness.
- A Test Day path that did not run track-aware physics MUST emit or adapt an
  explicit `physical-not-evaluated` state, never a synthetic zero.

## 7. Input and selection contract

- Hover MAY temporarily preview an item, but pointer exit MUST restore the
  persistent selection.
- Click, tap, or keyboard activation MUST select and persistently inspect without
  committing.
- Drag-and-drop MUST be available to mouse and touch.
- Select-then-destination MUST be available to pointer, touch, and keyboard and
  produce the same preview and commit result as drag-and-drop.
- A gesture below the drag threshold, cancelled drag, or invalid drop MUST NOT
  mutate the build.
- Every interactive item and destination MUST have a visible keyboard focus
  state and an accessible text label derived from the same model.

## 8. Rendering contract

- Phaser renderers accept presentation models; they MUST NOT inspect raw item
  mechanics to generate competing rule text.
- Compact cards and inspectors MUST fit the current 800×450 logical runtime
  canvas and expose a pure layout model for 1920×1080, 1366×768, 1024×768,
  800×450, and 390×844. Feature 026 binds non-current models to the runtime.
- Compact text MUST remain at least 10 logical pixels, inspector/supporting text
  at least 11 logical pixels, primary action labels at least 14 logical pixels,
  and pointer/touch destinations at least 40×32 logical pixels on the current
  canvas.
- Animation MAY reinforce selection or activation but cannot carry unique facts.
- Feature 025 may reuse exported stat vocabulary/formatters, but aggregate
  vehicle-stat panels remain outside this feature's renderer contract.

## 9. Regression contract

Feature 024 MUST NOT change:

- item definitions or availability;
- item prices or affordability;
- tiering or duplicate resolution;
- garage legality, placement, storage, replacement, or selling outcomes;
- physics stats, Buff/Synergy math, cooldowns, or lap times;
- contest, result, or Test Day resolution.
