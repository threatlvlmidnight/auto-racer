# Economy Depth Contract

This contract defines the framework-free interfaces used by reputation,
interest, sell-back, and card-locking. Exact TypeScript names may follow
repository conventions, but these inputs, outputs, and invariants are
binding.

## 1. Reputation Contract

```ts
type RunStatus = "active" | "completed" | "unavailable" | "failed";

function applyReputationLoss(run: Run, trigger: "pvp-loss" | "sponsor-failure"): Run;
```

Binding behavior:

- `Run.reputation: number` is new, starts at a fixed authored constant,
  and is never read as negative — any decrement that would take it below
  zero clamps to exactly `0` (FR-004).
- `applyReputationLoss` is called only from `completePvpEncounter`,
  before its existing `advanceRun(...)` call — never from
  `completeNonPvpEncounter`, since a sponsor objective can only resolve
  (succeed or fail) at PvP completion (FR-002).
- `trigger: "pvp-loss"` fires only when `result.outcome === "loss"` — a
  `"tie"` outcome MUST NOT decrement reputation (FR-002).
- `trigger: "sponsor-failure"` fires only when
  `resolvePendingSponsor(...).succeeded === false` for a pending
  contract at that same stage.
- The two triggers are independent and both may fire on the same stage
  transition; each is its own decrement.
- `advanceRun` MUST check `run.reputation <= 0` before its existing
  stage-completion check, and MUST set `status: "failed"` (never
  `"completed"`) when true — reputation loss takes priority over a
  simultaneous Stage 6 completion (FR-003).
- A `"failed"` run's `history`, `credits`, `creditTransactions`, and
  completed `stages` MUST be identical in shape and completeness to what
  a `"completed"` run would have at the same point — no truncation
  (FR-003, SC-003).
- Every existing `switch`/conditional over `RunStatus` anywhere in the
  codebase MUST add an explicit `"failed"` case — none may rely on a
  `default` branch to absorb it.

## 2. Interest Contract

```ts
function interestFor(bankedCredits: number): number; // pure
```

Binding behavior:

- Pure function of the current credit balance only — no hidden state,
  no randomness.
- `interestFor(0) === 0` always (FR-008).
- Applied via the existing `transactionFor(run, encounterId, "interest",
  interestFor(run.credits))` path, at the same stage-transition point
  reputation is checked — but only when the computed amount is nonzero;
  a zero-amount interest transaction MUST NOT be appended (FR-008,
  SC-004).
- `"interest"` is a new `CreditTransactionKind` value, inspectable in
  `run.creditTransactions` and `RunHistorySummary` exactly like every
  existing kind (FR-013).

## 3. Sell-Back Contract

```ts
function sellItem(
  build: VehicleBuild,
  source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
): { kind: "sold"; build: VehicleBuild; item: ItemDefinition; creditsGained: number }
 | { kind: "failure"; code: "missing-source" };
```

Binding behavior:

- Valid `source.area` is `"vehicle"` or `"storage"` only — there is no
  `"offer"` case, since an offer is not yet a held item (FR-009: "any
  held item (active or stored)").
- `creditsGained` is always exactly `Math.floor(item.price / 2)` for the
  item at `source` — no rounding mode other than floor is valid
  (FR-009, SC-005).
- On success, the source position is cleared in the returned `build` —
  the item is gone from the build entirely, with no reversal path within
  the same encounter (FR-009, Edge Cases).
- The `encounters.ts` wrapper (`sellHeldItem(run, encounterId, source):
  Run`) appends exactly one `"sell-back"` `CreditTransaction` via the
  existing `transactionFor` path per successful sale — never a partial
  state where credits change without a transaction, or the build changes
  without credits changing (FR-013, SC-007).
- Selling MUST be allowed unconditionally — no "can't sell your last X"
  or build-validity guard is introduced (Edge Cases).

## 4. Card-Locking Contract

```ts
interface StockEntry {
  id: string;
  item: OfferedItem;
  state: "available" | "purchased";
  locked: boolean;
}

function toggleLock(run: Run, encounterId: string, stockId: string): Run;
```

Binding behavior:

- `locked` defaults to `false` on every newly-generated `StockEntry`,
  including every entry in a freshly-started Parts Supplier encounter —
  locks never carry over from a prior encounter instance (FR-011).
- `toggleLock` flips exactly one `StockEntry.locked` and produces no
  `CreditTransaction` (locking/unlocking has no credit cost).
- `restockSupplier`'s existing per-entry reroll MUST skip any entry
  where `state === "purchased"` (existing behavior, unchanged) OR
  `locked === true` (new) — every other eligible entry MUST still always
  be replaced, exactly as today (FR-010, SC-006).
- `toggleLock` on a `stockId` that does not exist in the current Parts
  Supplier payload, or when no Parts Supplier encounter is active, MUST
  throw the same `RunTransitionError` codes (`encounter-id-mismatch`/
  `invalid-encounter-type`) every other Parts Supplier action already
  throws in that situation.

## 5. Fairness Contract

None of `applyReputationLoss`'s trigger evaluation, `interestFor`,
`sellItem`'s payout calculation, or `toggleLock`'s availability MAY read
`identityTag`, `RunIdentity`, or any purchasable-content/currency flag —
identical inputs produce identical outputs regardless of which entrant
or vehicle is playing (FR-012, Constitution Principle II).

## 6. Non-Interference Requirements

- Every existing test asserting `"completed"`/`"unavailable"` `RunStatus`
  behavior, existing `CreditTransactionKind` values, and
  `restockSupplier`'s unlocked-entry replacement MUST continue passing
  unchanged — this feature adds new branches and new union members
  alongside the existing ones, never replacing or narrowing them.
- No function introduced or modified by this feature may accept or read
  more than one player's `Run`/`VehicleBuild` — single-run scope only,
  consistent with Constitution Principle I.
