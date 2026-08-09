# Entrant, Garage, and Contest Boundary Contract

This contract defines the framework-free interfaces used by authored content,
run progression, Phaser scenes, and deterministic contest resolution. Exact
TypeScript names may follow repository conventions, but these inputs, outputs,
and invariants are binding.

## 1. Authored Roster Contract

```ts
type EntrantId = "evelyn-mercer" | "lucien-soto" | "inez-rook" | "nell-voss";
type VehicleId = "the-highwheel" | "the-needle" | "the-lark" | "the-hush";
type Origin = "coachworks" | "velodrome" | "fieldworks" | "backroads";
type SlotType = "power" | "chassis" | "flex";
type InstallationCategory = "power" | "chassis";
type InstallationState = "fitted" | "flexible" | "improvised";

interface EntrantDefinition {
  id: EntrantId;
  name: string;
  origin: Origin;
  role: string;
  approach: string;
  strategyDirections: readonly string[];
  vehicleId: VehicleId;
  portraitAssetKey: string;
}

interface VehicleDefinition {
  id: VehicleId;
  name: string;
  entrantId: EntrantId;
  baseCarId: string;
  silhouetteAssetKey: string;
  slots: readonly [VehicleSlotDefinition, VehicleSlotDefinition,
    VehicleSlotDefinition, VehicleSlotDefinition];
  storageCapacity: 3;
}
```

Catalog validation MUST fail for incomplete pairings, duplicate slot IDs,
incorrect topology counts, unequal baseline configuration, or missing local
asset keys. It MUST NOT infer or substitute an entrant.

## 2. Confirmed Run Creation Contract

```ts
type EntrantSelectionGuardResult =
  | { kind: "allowed" }
  | { kind: "blocked"; code: "active-run-exists" };

function canEnterEntrantSelection(activeRun: Run | null): EntrantSelectionGuardResult;

interface ConfirmEntrantInput {
  entrantId: EntrantId;
  runId: string;
  seed: number;
  rng: RandomSource;
}

type RunCreationValidationCode =
  | "entrant-unavailable"
  | "invalid-roster-pairing"
  | "invalid-vehicle-topology";

type CreateRunForEntrantResult =
  | { kind: "created"; run: Run }
  | { kind: "validation-failure"; code: RunCreationValidationCode };

function createRunForEntrant(input: ConfirmEntrantInput): CreateRunForEntrantResult;
```

Preconditions:

- `entrantId` resolves to a valid reciprocal entrant/vehicle definition.
- The command occurs only after explicit user confirmation.
- Route/controller code owns active-run protection. It MUST call
  `canEnterEntrantSelection` with current active-run context and narrow its
  result to `allowed` before calling `createRunForEntrant`.
- `createRunForEntrant` receives no active-run context and MUST NOT discover or
  inspect global scene, route, registry, or persistence state.

Postconditions:

- The run contains immutable `RunIdentity` and an empty matching topology.
- Credits start at 5 and the existing six stages/choice generation are created once.
- No run, offer, transaction, or history entry exists before this call.
- `createRunForEntrant` validates only entrant/content pairing, topology, and
  deterministic initialization inputs; invalid input produces a typed
  validation result, never a default.
- Callers narrow on `kind`; expected validation failures are returned and are not
  thrown as ordinary control flow.

## 3. Draft Contract

```ts
function drawItem(
  pool: readonly ItemDefinition[],
  targetOrigin: Origin,
  originWeight: number,
  rng: RandomSource,
): DrawItemResult;

type DrawItemResult =
  | { kind: "drawn"; item: ItemDefinition }
  | {
      kind: "generation-failure";
      code: "empty-selected-group";
      selectedGroup: "home-origin" | "off-origin";
    };
```

- With the shipped weight, the home-origin branch is selected at `0.75` and the
  off-origin branch at `0.25`.
- Off-origin means every definition whose origin differs from `targetOrigin`.
- Origin never filters placement legality.
- Empty selected groups return a typed generation failure; they do not produce
  `undefined` or silently switch rules.
- Callers narrow on `kind`; expected generation failures are returned and are
  not thrown as ordinary control flow.

## 4. Installation Resolution Contract

```ts
interface InstallationResolution {
  state: InstallationState;
  baseBehavior: ItemBehavior;
  appliedInstallationBehavior: ItemBehavior | null;
  lostFittedBehavior: ItemBehavior | null;
  noAdditionalImprovisedConsequence: boolean;
}

function resolveInstallation(
  item: ItemDefinition,
  slotType: SlotType,
): InstallationResolution;
```

Truth table:

| Slot | Item category | State | Behavior |
|---|---|---|---|
| Power | Power | Fitted | base + item's Fitted |
| Chassis | Chassis | Fitted | base + item's Fitted |
| Flex | either | Flexible | base only |
| Power | Chassis | Improvised | base + item's Improvised, if any |
| Chassis | Power | Improvised | base + item's Improvised, if any |

The function is pure. It never reads coordinates, entrant, origin, item order,
input method, or Phaser state, and never applies universal fit math.

## 5. Garage Preview and Command Contract

```ts
type GarageSource =
  | { area: "offer"; offerId: string }
  | { area: "vehicle"; slotId: string }
  | { area: "storage"; index: 0 | 1 | 2 };

type GarageDestination =
  | { area: "vehicle"; slotId: string }
  | { area: "storage"; index: 0 | 1 | 2 };

interface GarageCommand {
  source: GarageSource;
  destination: GarageDestination;
  replacement: "none" | "swap" | "evict";
}

function previewGarageCommand(context: GarageContext, command: GarageCommand): PlacementPreview;
function commitGarageCommand(context: GarageContext, command: GarageCommand): GarageCommitResult;
```

Binding behavior:

- Preview and commit use the same validation path.
- Every category/slot pairing is legal.
- Empty destination places or moves; compatible occupied source/destination
  movement may swap; irreversible eviction requires explicit confirmation.
- Offer purchase commits credits and build placement atomically. A failed
  placement cannot spend credits or mark stock purchased.
- Reward acceptance commits encounter completion and placement atomically.
- Cancel never calls commit and leaves run, encounter, credits, and build unchanged.
- No item instance may exist in two locations or disappear without an explicit eviction.
- Drag/drop, pointer/touch selection, and keyboard activation MUST produce the
  same `GarageCommand` for the same source/destination intent.

Typed failures include missing source, stale offer, unknown slot, invalid index,
occupied destination requiring confirmation, insufficient credits, completed
encounter, and invalid run context. Category mismatch is not a failure.

## 6. Scene Presentation Contract

Pure scene-formatting functions expose:

- entrant list and selected entrant details without creating a run;
- named vehicle, topology strip, equality statement, and confirmation availability;
- garage source/destination focus order;
- persistent selected-item inspector including origin, category, synergy tags,
  base/Fitted/Improvised/storage behavior, cooldown/trigger, price, affordability;
- placement preview and occupant comparison;
- run/contest/result identity labels and topology-ordered items;
- unavailable state and recovery actions.

Phaser scenes may animate and position these facts but MUST NOT recompute
installation state, simulation contributions, credits, or run validity.

Input equivalence:

| Intent | Mouse | Touch/non-drag | Keyboard |
|---|---|---|---|
| Inspect | click or hover shortcut | tap | focus + Enter/Space |
| Select source | click or drag start | tap | Enter/Space |
| Choose destination | drop or click | tap | arrows/Tab + Enter/Space |
| Cancel | release outside or cancel control | cancel control | Escape |
| Confirm eviction | explicit button | explicit button | focused button + Enter/Space |

Hover and motion carry no exclusive information. Focus, selection, slot type,
installation state, disabled state, and storage-active state use labels/icons or
structural treatment in addition to color.

Acceptance MUST complete entrant selection and one full preparation encounter
independently through a keyboard-only path and through a touch-only path. Each
path MUST expose all required entrant, topology, item, preview, comparison, and
action information without hover, and the touch-only path MUST require no drag.

## 7. Locked Contest Contract

```ts
type LockContestBuildValidationCode =
  | "invalid-run-context"
  | "invalid-entrant-context"
  | "invalid-build-context"
  | "invalid-vehicle-topology";

type LockContestBuildResult =
  | { kind: "locked"; build: LockedContestBuild }
  | { kind: "validation-failure"; code: LockContestBuildValidationCode };

function lockContestBuild(run: Run): LockContestBuildResult;
function resolveContest(
  build: LockedContestBuild,
  ghost: SampleGhost,
  lapCount: 10 | 12,
): ContestResult;
```

`lockContestBuild` validates run, entrant, build, and topology context and
materializes installation resolutions in canonical slot order only for a
`locked` result. Invalid context returns the corresponding typed
`validation-failure`; expected failures are deterministic and MUST NOT throw as
ordinary control flow. Callers narrow on `kind` before passing `build` to
`resolveContest`. `resolveContest` is pure and consumes only locked domain data.
It never reads scene objects, animation time, input, viewport, or current mutable
run build.

Result requirements:

- retain entrant, vehicle, topology order, installed item/state, and storage;
- retain current times, outcome, gap, lap count, and fired-item records;
- attribute installation-derived events to item ID, slot ID, installation state,
  authored behavior source, and numeric contribution;
- preserve enough detail for result inspection even when an Improvised item has
  no additional consequence and only loses its Fitted behavior.

Determinism invariant:

```text
same locked build + same ghost + same lap count
  => deeply equal ContestResult
```

Presentation speed, reduced motion, viewport, and interaction method are absent
from the function signature and cannot affect the result.

## 8. Migration Compatibility Contract

- Existing item IDs, prices, cooldowns, buff links, storage flags, and base
  contest behavior remain stable unless an authored migration entry explicitly changes them.
- Existing run schedule, credits, sponsor objectives, transaction audit,
  completion guards, and 10/12-lap behavior remain unchanged.
- Existing contest/result consumers migrate from compact generic `board` arrays
  to topology-ordered installed snapshots in one coordinated change.
- Missing legacy identity/topology cannot be guessed. Since durable resume is
  out of scope, stale in-memory shape routes to unavailable recovery.
- User-facing active-build language contains no `BOARD`/`Board` label after migration.

## 9. Local Asset Contract

Required development assets:

```text
public/assets/entrants/evelyn-mercer.svg
public/assets/entrants/lucien-soto.svg
public/assets/entrants/inez-rook.svg
public/assets/entrants/nell-voss.svg
public/assets/vehicles/the-highwheel.svg
public/assets/vehicles/the-needle.svg
public/assets/vehicles/the-lark.svg
public/assets/vehicles/the-hush.svg
```

These may be simple local placeholders. They must load without network access,
remain nonblank at selection/garage/race sizes, distinguish the four silhouettes,
and include no simulation metadata beyond a content asset key.

## 10. Constitutional Prerequisite Contract

Feature 010 implementation and release MUST remain blocked until Build Testing
Access/Test Day under `specs/visual-overhaul.md` UI-FR-022 is completed and
validated. This contract does not expose a substitute practice flow, partially
implement Test Day, or permit the gate to be deferred until after feature 010
implementation.