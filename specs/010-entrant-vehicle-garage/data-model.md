# Data Model: Entrant Selection & Named-Vehicle Garage

## Entrant Definition

Immutable authored content for one launch owner-builder.

| Field | Type | Rules |
|---|---|---|
| `id` | `evelyn-mercer \| lucien-soto \| inez-rook \| nell-voss` | Stable content ID |
| `name` | string | Full committed display name |
| `origin` | `Origin` | Exactly one; controls draft weighting only |
| `role` | string | Roster role/background copy |
| `approach` | string | Approach-to-racing copy, not a passive |
| `strategyDirections` | string[] | At least three broad directions; never an exclusive class |
| `vehicleId` | `VehicleId` | One-to-one committed pairing |
| `portraitAssetKey` | string | Local placeholder or production asset key |

Committed pairings:

| Entrant | Origin | Vehicle |
|---|---|---|
| Evelyn Mercer | `coachworks` | `the-highwheel` |
| Lucien Soto | `velodrome` | `the-needle` |
| Inez Rook | `fieldworks` | `the-lark` |
| Nell Voss | `backroads` | `the-hush` |

Entrant definitions contain no base-stat modifier, capacity modifier, passive,
activated ability, legality rule, or private contest rule.

## Named Vehicle Definition

Immutable authored presentation and topology.

| Field | Type | Rules |
|---|---|---|
| `id` | `VehicleId` | Stable content ID |
| `name` | string | Committed named machine |
| `entrantId` | `EntrantId` | Must be the reciprocal entrant pairing |
| `baseCarId` | string | Resolves to the shared baseline pace |
| `silhouetteAssetKey` | string | Local 2D silhouette |
| `slots` | `VehicleSlotDefinition[4]` | Exactly four stable slot definitions |
| `storageCapacity` | `3` | Equal for all vehicles |

Required slot distributions:

| Vehicle | Power | Chassis | Flex |
|---|---:|---:|---:|
| The Highwheel | 1 | 2 | 1 |
| The Needle | 2 | 1 | 1 |
| The Lark | 1 | 1 | 2 |
| The Hush | 2 | 2 | 0 |

## Vehicle Slot Definition

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable within the vehicle; used by commands and snapshots |
| `type` | `power \| chassis \| flex` | Authored topology type |
| `presentationAnchor` | string | Optional named anchor consumed only by presentation |

Array order is canonical for display, focus traversal, locking, and review. It
does not grant adjacency, priority, or same-type positional behavior.

## Origin

`coachworks | velodrome | fieldworks | backroads`

Origin controls weighted acquisition and thematic source. It does not control
item legality, installation state, slot type, or exclusive strategy access. Each
deterministic draft draw first selects the home-origin branch at weight `0.75`
or the eligible all-other-origin branch at weight `0.25`, then draws from the
selected eligible group using the existing seeded random source.

## Item Definition

The existing `OfferedItem` becomes an immutable authored definition. Separate
item instances retain stable copy IDs where duplicate copies must be distinguished.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable definition ID |
| `name` | string | Visible physical equipment name |
| `origin` | `Origin` | Exactly one |
| `installationCategory` | `power \| chassis` | Exactly one; independent of origin |
| `synergyTags` | string[] | Zero or more shared cross-origin tags |
| `price` | integer 2-5 | Existing run-economy rule |
| `baseBehavior` | `ItemBehavior` | Existing base effect represented structurally |
| `fittedBehavior` | `ItemBehavior` | Required authored addition for matching typed slots |
| `improvisedBehavior` | `ItemBehavior \| { kind: "none" }` | Explicit consequence or explicit no-additional-effect disclosure |
| `cooldown` | positive integer, optional | Existing lap trigger cadence |
| `buff` | existing typed buff definition, optional | Existing flat/stacking/count semantics preserved |
| `activeWhileStored` | boolean, optional | Stored behavior only; never grants installation state |

`ItemBehavior` initially wraps the existing timing/buff vocabulary rather than
inventing a second simulation engine. It must provide exact inspector text and a
typed simulation operation; presentation text is not parsed to produce math.

## Run Identity

Immutable run-scoped association created only after confirmation.

| Field | Type | Rules |
|---|---|---|
| `entrantId` | `EntrantId` | Required and immutable |
| `origin` | `Origin` | Must match entrant definition |
| `vehicleId` | `VehicleId` | Must match entrant definition |
| `topologyId` | string | Stable version/key for the authored vehicle topology |

Validation rejects missing definitions, mismatched pairings, non-four-slot
topologies, non-three storage capacity, or unequal base-car configuration.

## Vehicle Build

The run's authoritative current build.

| Field | Type | Rules |
|---|---|---|
| `vehicleId` | `VehicleId` | Must match `RunIdentity.vehicleId` |
| `car` | `SpecCar` | Shared baseline values |
| `slots` | `VehicleSlotState[4]` | Same IDs/types/order as vehicle definition |
| `storage` | `StoredPosition[3]` | Exactly three positions |

### Vehicle Slot State

| Field | Type | Rules |
|---|---|---|
| `slotId` | string | Matches one authored slot |
| `slotType` | `SlotType` | Must match authored topology |
| `item` | `ItemInstance \| null` | At most one copy |

### Stored Position

| Field | Type | Rules |
|---|---|---|
| `index` | `0 \| 1 \| 2` | Stable focus/display position only |
| `item` | `ItemInstance \| null` | At most one copy; no slot affinity |

An item instance appears in exactly one active slot or stored position. Moving,
swapping, replacing, or evicting returns a new valid build atomically.

## Installation Resolution

`resolveInstallation(item, slot)` returns:

| State | Condition | Applied behavior |
|---|---|---|
| `fitted` | item category equals typed slot | base plus authored Fitted behavior |
| `flexible` | slot is Flex | base only |
| `improvised` | item category conflicts with typed slot | base plus authored Improvised behavior, or base only when explicitly `none` |

The resolution includes display-ready facts: item/slot IDs, category, slot type,
state, base behavior, gained behavior, lost Fitted behavior, and explicit
no-additional-consequence disclosure. It never mutates the item or build.

## Garage Selection and Preview

Presentation-local state; never persisted into the run.

| Field | Type | Rules |
|---|---|---|
| `source` | `OfferSource \| SlotSource \| StorageSource \| null` | One selected item source |
| `candidateDestination` | `SlotDestination \| StorageDestination \| null` | Optional focused/hovered destination |
| `preview` | `PlacementPreview \| null` | Purely derived |
| `confirmation` | `ReplacementConfirmation \| null` | Required before irreversible displacement |

Cancel clears this state and leaves the authoritative build and encounter
unchanged. Drag is only another way to select source and destination.

## Placement Preview

| Field | Type | Rules |
|---|---|---|
| `source` | garage source | Exact item/copy source |
| `destination` | garage destination | Exact target |
| `legal` | boolean | Category mismatch is always legal |
| `installation` | installation resolution, optional | Present for active destination |
| `occupant` | item instance, optional | Existing target item |
| `disposition` | `place \| move \| swap \| replace \| evict \| no-op` | Exact atomic outcome |
| `requiresConfirmation` | boolean | True for irreversible replacement/eviction |
| `reason` | typed code, optional | Capacity/state error only, never category mismatch |

## Locked Contest Build

Immutable snapshot created when the scored contest starts.

| Field | Type | Rules |
|---|---|---|
| `runIdentity` | `RunIdentity` | Entrant/vehicle identity at lock time |
| `vehicleId` | `VehicleId` | Must match identity |
| `installed` | `LockedInstalledItem[]` | Canonical topology order with resolved state/behavior |
| `storage` | `LockedStoredItem[]` | Canonical storage order and storage-active disclosure |
| `baseCar` | `SpecCar` | Shared immutable baseline |

### Locked Installed Item

Contains slot ID/type, item copy/definition ID, installation category/state,
base behavior, selected authored installation behavior, and synergy/origin data
needed by simulation. This snapshot is the only build input used by lap
resolution and playback attribution.

### Lock Contest Build Result

Contest locking returns either `locked` with a complete `LockedContestBuild` or
`validation-failure` with exactly one typed code: `invalid-run-context`,
`invalid-entrant-context`, `invalid-build-context`, or
`invalid-vehicle-topology`. Expected invalid context never throws and never
produces a partial snapshot.

## Contest Result Extensions

The result retains current times, gap, outcome, lap count, and lap breakdown,
and adds:

- immutable run identity and named vehicle ID;
- topology-ordered installed snapshots rather than compacted generic board items;
- storage snapshot;
- contribution records with `itemId`, `slotId`, installation state, behavior
  source (`base | fitted | improvised | storage`), and numeric contribution;
- explicit no-contribution installation facts for post-race inspection where a
  Fitted effect was forfeited but no extra Improvised consequence existed.

## State Transitions

```text
Title
  -> canEnterEntrantSelection(active-run context)
      -> blocked: active-run-exists (remain outside selection)
      -> allowed: Entrant Selection (no run)
      -> inspect/highlight/select/cancel (no run)
      -> confirm valid entrant
          -> create active Run + RunIdentity + empty VehicleBuild
              -> existing six-stage encounter flow
                  -> garage preview (no mutation)
                  -> garage command confirmation (atomic build transition)
                    -> lock contest build
                      -> validation-failure: unavailable recovery
                      -> locked snapshot: pure deterministic resolution
                          -> read-only playback/result
                              -> existing guarded run continuation

missing/inconsistent identity or topology -> unavailable recovery
completed/abandoned run -> deliberate action -> Entrant Selection
```

## Validation Invariants

1. A run cannot exist without exactly one valid `RunIdentity`.
2. Entrant, origin, vehicle, and topology pairing never changes during a run.
3. All vehicles use the same base pace, four active slots, and three storage positions.
4. Topology distributions exactly match the feature specification.
5. Every catalog item has one origin, one category, Fitted behavior, and explicit Improvised disclosure.
6. Every item can preview and commit into every active slot.
7. A build contains no duplicate item-instance reference and loses no item during atomic movement.
8. Stored items have no Fitted/Flexible/Improvised state.
9. Same-type slot permutation does not change simulation output.
10. Locked contest input is immutable and complete before playback begins.
11. Active-run protection is evaluated by the caller-owned entrant-selection
  guard; run construction receives no global active-run context.
12. Invalid run, entrant, build, or topology lock context returns a typed
  validation failure without throwing or producing a partial snapshot.
13. Identical locked input and ghost produce identical result data.
14. Viewport, animation preference, playback speed, and input mode never enter simulation functions.
15. Existing credits, history, sponsors, stage schedule, and encounter completion guards remain valid.
16. Acceptance completes entrant selection and one full preparation encounter
  independently through keyboard-only and touch-only paths with no hover-only
  information or required precision drag.
17. Feature 010 implementation and release remain blocked until Build Testing
  Access/Test Day under `specs/visual-overhaul.md` UI-FR-022 is completed and
  validated; no entity or transition in this model substitutes for that flow.