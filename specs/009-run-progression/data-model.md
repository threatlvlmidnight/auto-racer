# Data Model: Run Progression - Encounter Structure

## Run

One bounded attempt through the six-stage schedule.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable for the attempt |
| `seed` | integer | Stable input for seeded contract targets |
| `identityTag` | `IdentityTag` | Chosen entrant identity used by encounter generation and sponsor objectives |
| `status` | `active \| completed \| unavailable` | Completed is terminal |
| `stageIndex` | integer | 0-6; 6 only when completed |
| `stages` | `RunStage[6]` | Fixed choice, choice, PvP-10, choice, choice, PvP-12 |
| `availableChoices` | `EncounterChoice[]` | Exactly two only at an unresolved choice stage |
| `activeEncounter` | `ActiveEncounter \| null` | At most one |
| `build` | `Build` | Existing 3-slot board and 3-slot storage |
| `credits` | integer | Starts at 5; never negative |
| `creditTransactions` | `CreditTransaction[]` | Ordered audit trail |
| `activeSponsorContract` | `SponsorContract \| null` | At most one pending |
| `history` | `RunHistoryEntry[]` | Immutable, ordered, one per completed stage |

### State transitions

```text
new -> active(choice 1)
active(choice) -> active(encounter) -> active(next stage)
active(PvP) -> [scene-local racing presentation] -> result recorded -> active(next stage)
active(final PvP) -> [scene-local racing presentation] -> result recorded -> completed
completed -> terminal (new run creates a different Run)
missing/corrupt context -> unavailable
```

`racing` is not a persisted `Run.status` or `RunStage.state`; it is the existing
ContestScene/ResultScene presentation between guarded domain transitions.

## Run Stage

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable exactly-once key |
| `position` | 1-6 | Display order |
| `kind` | `choice \| pvp` | Fixed by schedule |
| `choiceOrdinal` | 1-4, optional | Present for choice stages |
| `pvpOrdinal` | 1-2, optional | Present for PvP stages |
| `lapCount` | `10 \| 12`, optional | PvP 1 = 10; PvP 2 = 12 |
| `state` | `unavailable \| available \| active \| completed` | Only current stage may be available/active |

## Encounter Choice

A stored first-layer choice, separate from any internal reward decision.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique offer instance |
| `stageId` | string | Current choice stage |
| `type` | non-PvP encounter type | Distinct within the pair |
| `summary` | display data | Describes outcome/rules without selecting it |

Eligible types are `parts-supplier`, `reward-draft`, and `sponsor-meeting`.
Sponsor Meeting is excluded while a contract is pending. The remaining pool
always contains at least Parts Supplier and Reward Draft, so two choices remain
possible.

## Active Encounter

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable selected encounter instance |
| `stageId` | string | Must match current stage |
| `type` | encounter type | One of the four phase-one types |
| `status` | `active \| completed` | Completion is one-way |
| `payload` | type-specific state | Generated once and stored |

### Reward Draft payload

- Three `ItemOffer` entries generated with existing identity weighting.
- `selection`: null until one offer is placed or all are declined.
- At most one offer may be accepted.
- Encounter completes after a successful placement/eviction or explicit decline.

### Parts Supplier payload

- Three `StockEntry` slots, each containing an item with the chosen identity tag and
  its authored 2-5 credit price.
- If one or two eligible definitions exist, stock generation draws with
  replacement; if none exist, the payload stores an empty unavailable-stock
  state and permits leaving without a purchase or restock.
- Each stock entry has its own `offerId` and `available \| purchased` state.
- `restockUsed`: initially false; one 1-credit restock is allowed if affordable.
- Restock replaces every available entry in place and leaves purchased slots
  empty. Purchases may continue until the player leaves.
- A purchase commits atomically with board/storage placement or eviction.

### Sponsor Meeting payload

- One immediate 2-credit option.
- Two distinct conditional objective options generated from three objective
  kinds.
- Exactly one option must be selected to complete the meeting.

### PvP payload

- `lapCount`: 10 or 12 from its scheduled stage.
- Existing fixed `SampleGhost` and current build snapshot.
- Immutable `ContestResult` after resolution.

## Offered Item extension

| Field | Type | Rules |
|---|---|---|
| `price` | integer | Required authored value from 2 through 5 |

All existing fields and semantics remain unchanged. Price does not modify item
effects, weighting, cooldowns, active-while-stored behavior, or duplicate-copy
rules.

## Credit Transaction

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable transaction ID |
| `encounterId` | string | Source encounter |
| `kind` | transaction kind | purchase, restock, participation, win bonus, sponsor immediate, sponsor conditional |
| `amount` | integer | Negative cost or positive payout |
| `balanceAfter` | integer | Must equal prior balance plus amount and be >= 0 |

Payout rules: every PvP gives +2 participation; `win` gives an additional +2;
ties do not receive the win bonus. Conditional sponsor success gives +7, failure
gives 0. A transaction is appended at most once per source event.

## Sponsor Contract

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable |
| `sourceEncounterId` | string | Sponsor Meeting that created it |
| `objective` | objective union | Exactly one kind |
| `payout` | `7` | Fixed |
| `status` | `pending \| succeeded \| failed` | Resolves once at next PvP |
| `resolvedEncounterId` | string, optional | Next PvP only |
| `actual` | objective result, optional | Visible result detail |

Objective union:

- `win-next-race`: succeeds only when `ContestResult.outcome === "win"`.
- `target-race-time`: stores an exact whole-second `targetSeconds`. For the next
  PvP lap count, choose a seeded integer offset 3-6 and subtract it from the
  unmodified spec car's total time. Succeeds when `playerTime <= targetSeconds`.
- `trigger-tagged-items`: stores the chosen identity tag and `requiredEvents: 10`.
  Counts each matching-tag item occurrence in `laps[].firedItems`; succeeds at
  10 or more. Result stores both actual and required counts.

## Run History Entry

| Field | Type | Rules |
|---|---|---|
| `encounterId` | string | Unique; exactly one entry per completed stage |
| `stagePosition` | 1-6 | Strict chronological order |
| `type` | encounter type | Selected type or scheduled PvP |
| `acquisitionOutcome` | optional summary | accepted/declined items, purchases, restock |
| `creditTransactions` | transaction IDs | Transactions caused by encounter |
| `pvpOutcome` | optional summary | outcome, lap count, times, gap |
| `sponsorOutcome` | optional summary | objective, actual, success/failure, payout |

History is append-only. Board/storage snapshots are not reconstructed from
history; the current `build` remains the authoritative state carried forward.

## Validation invariants

1. Exactly six stages exist in the fixed schedule.
2. Available choice pairs contain two distinct eligible types.
3. Only the current stage can activate or complete.
4. An encounter ID occurs at most once in history.
5. `history.length === stageIndex` while active and equals 6 when completed.
6. Completed runs reject all encounter actions.
7. Credits and all authored prices are integers in their allowed ranges.
8. At most one sponsor contract is pending; it resolves against the next PvP.
9. Contest resolution cannot mutate run build state.
10. The build after every encounter obeys existing slot/storage invariants.
11. Encounter generation reads the run's stored identity tag; identity never changes slot capacity.
12. PvP completion accepts only a result whose lap count and compacted board/storage item IDs match the active encounter's stored build snapshot.
