# Internal Contract: Run Progression

The project exposes no external API. This contract defines the boundary between
framework-free `src/simulation/` rules and Phaser scenes. Function names are
directional; implementation may refine naming without weakening invariants.

## Run creation and choice generation

```ts
type RandomSource = () => number;

function createRun(input: {
  runId: string;
  seed: number;
  identityTag: IdentityTag;
  build: Build;
  rng: RandomSource;
}): Run;

function chooseEncounter(
  run: Run,
  choiceId: string,
  rng: RandomSource,
  itemPool: OfferedItem[],
): Run;
```

Invariants:

1. New runs start active at stage 1 with 5 credits and empty history.
2. The schedule is choice, choice, PvP-10, choice, choice, PvP-12.
3. A current choice stage stores exactly two distinct eligible choices.
4. Sponsor Meeting is ineligible while `activeSponsorContract` is pending.
5. Choosing an encounter creates/stores its payload but never auto-selects an
   item, sponsor option, or purchase.
6. Inputs are not mutated; all random values come from `rng` or seeded helpers.

## Reward Draft

```ts
function acceptReward(
  run: Run,
  encounterId: string,
  offerId: string,
  placement: ExistingPlacementCommand,
): Run;

function declineReward(run: Run, encounterId: string): Run;
```

Invariants:

1. Payload contains three offers generated through existing `drawItem` behavior
  using the run's stored identity tag and `TAG_WEIGHT`.
2. At most one offer is accepted; decline accepts none.
3. Acceptance uses existing board/storage/add/evict transitions atomically.
4. Completion appends one history entry and advances one stage.

## Parts Supplier

```ts
function purchaseStock(
  run: Run,
  encounterId: string,
  stockId: string,
  placement: ExistingPlacementCommand,
): Run;

function restockSupplier(
  run: Run,
  encounterId: string,
  rng: RandomSource,
  itemPool: OfferedItem[],
): Run;

function leaveSupplier(run: Run, encounterId: string): Run;
```

Invariants:

1. Initial stock has three entries carrying the run's stored identity tag, with
  authored prices 2-5. Pools with one or two eligible definitions draw with
  replacement; a pool with none produces an empty unavailable-stock payload.
2. Purchase rejects unavailable stock, insufficient credits, or invalid
   placement without partial mutation.
3. Any number of affordable stock entries may be purchased.
4. Restock costs exactly 1 credit, is allowed once, and replaces all currently
   unpurchased entries; purchased slots remain empty.
5. Leaving is valid with zero purchases and completes exactly once.

## Sponsor Meeting and contracts

```ts
function selectSponsorOption(
  run: Run,
  encounterId: string,
  optionId: string,
): Run;

function seededTargetSeconds(input: {
  seed: number;
  pvpOrdinal: 1 | 2;
  baseLapTime: number;
  lapCount: 10 | 12;
}): number;

function resolvePendingSponsor(
  contract: SponsorContract,
  result: ContestResult,
): SponsorResolution;
```

Invariants:

1. Meeting payload contains immediate +2 and two distinct conditional objective
   kinds selected from win, target-time, and tagged-trigger.
2. Immediate payout appends one +2 transaction and creates no contract.
3. Conditional selection creates one pending 7-credit contract; a second active
   contract is rejected.
4. Target is a displayed/stored whole second exactly 3-6 seconds below the
   unmodified spec car total for the next scheduled PvP.
5. Tagged-trigger counts every matching-tag occurrence in `laps[].firedItems`,
   requires 10, and reports actual plus required counts.
6. Resolution happens once against the next PvP result, then clears pending
   state and records succeeded/failed. Only success appends +7.

## PvP resolution and progression

```ts
function resolveContest(
  build: Build,
  ghost: SampleGhost,
  lapCount: number,
): ContestResult;

function completePvpEncounter(
  run: Run,
  encounterId: string,
  result: ContestResult,
): Run;
```

Invariants:

1. `lapCount` drives player laps, ghost laps, result laps, playback completion,
   and labels; playback derives its terminal lap index from schedule/result data
   rather than the legacy global `LAP_COUNT`.
2. Existing contest output is identical for the same build, ghost, and lap
   count; no random source enters contest resolution.
3. PvP never changes board or storage.
4. Completion appends +2 participation and an additional +2 only for `win`.
5. Pending sponsor contract resolves after the race from immutable result data.
6. Completion rejects a result whose `lapCount` or compacted board/storage item
  IDs differ from the active PvP payload's lap count and build snapshot, using
  the typed `race-result-mismatch` code before any payout or history mutation.
7. The encounter is appended once to history, then progression advances once.
8. Completing stage 6 marks the run completed and rejects further entry.

## Exactly-once transition rule

Every mutating operation validates all of the following before returning a new
state:

- run is active;
- supplied encounter/stage ID equals the current active instance;
- instance is not already present in history;
- action is legal for the active encounter type and state;
- resulting credits are non-negative;
- resulting build satisfies existing board/storage capacities.

Failure throws a `RunTransitionError` with a stable machine-readable code and
must never partially mutate input state. This follows the existing slot/storage
transition convention while giving scenes and tests a typed run-domain failure.

## Scene flow contract

```text
RunScene choice -> PrepareScene (Reward/Supplier) -> RunScene
RunScene choice -> RunScene sponsor interaction -> RunScene
RunScene scheduled PvP -> ContestScene -> ResultScene -> RunScene
RunScene completed -> ordered run summary -> explicit New Run
```

- Scenes receive a complete `Run`, never reconstruct choices or contracts.
- ContestScene receives the current encounter ID and scheduled lap count.
- ContestScene resolves once and passes result plus run context to ResultScene.
- ResultScene preserves shipped inspection and uses a Continue Run action; the
  guarded PvP completion transition must be applied exactly once.
- Missing run context routes to an explicit unavailable state, not a random
  replacement run.

## Preserved contracts

- `drawItem` 75/25 identity weighting and occasional off-identity results.
- Slot/storage capacity, movement, eviction, active-while-stored behavior, and
  duplicate-copy semantics.
- Buff/lap contribution ordering and minimum lap time.
- Read-only playback, item flashes/tooltips, gap display, and result breakdown.
