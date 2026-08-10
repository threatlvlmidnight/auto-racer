# Data Model: Economy Depth

## `RunStatus` Extension

```ts
export type RunStatus = "active" | "completed" | "unavailable" | "failed";
```

| Value | Meaning |
|---|---|
| `"failed"` | New (FR-003). Set by `advanceRun` when reputation reaches zero, in place of whatever status that call would otherwise have produced (`"active"` mid-run or `"completed"` at Stage 6 — reputation loss always wins when both conditions land on the same transition, per Research Decision 1). |

Every existing `switch`/conditional over `RunStatus` (`RunScene.ts`'s
outcome rendering, `runPresentation.ts`'s status label, any run-listing
UI) MUST add an explicit `"failed"` branch — none may fall through a
`default` case (Technical Context constraint, FR-003).

## `Run` Extension

| Field | Type | Rules |
|---|---|---|
| `reputation` | `number` | New. Starts at a fixed authored value (FR-001; exact value is a balance-pass constant, not fixed by this spec — Assumptions). Never increases within this feature's scope (Key Entities). Floored at `0` — a decrement that would go negative clamps to `0` instead (FR-004). |

## Reputation Decrement

```ts
function applyReputationLoss(run: Run, trigger: "pvp-loss" | "sponsor-failure"): Run;
```

Called only from `completePvpEncounter`, immediately before its existing
`advanceRun(...)` call (Research Decision 2) — the one place both
trigger conditions are already known:

- `trigger: "pvp-loss"` — `result.outcome === "loss"` (a tie does
  **not** trigger this — FR-002).
- `trigger: "sponsor-failure"` — `resolvePendingSponsor(...)` returned
  `succeeded: false` for a pending contract.

Both conditions are independent; if a stage somehow satisfies both (a
lost PvP contest that was also the pending sponsor contract's failed
objective), reputation decrements once per trigger, not once per stage —
matches how `appendTransaction` already independently records
`participation`/`win-bonus`/`sponsor-conditional` as separate entries
for the same stage.

`run.reputation` is floored at `0` inline in `applyReputationLoss`, not
left to `advanceRun` to clamp — `advanceRun` only ever reads the
already-clamped value.

## `advanceRun` Extension

Before its existing `nextIndex >= run.stages.length` completion check,
`advanceRun` gains one new leading check:

```ts
if (run.reputation <= 0) {
  return {
    ...run,
    status: "failed",
    stageIndex: run.stageIndex + 1 >= run.stages.length ? run.stages.length : run.stageIndex + 1,
    stages: run.stages.map((stage, index) =>
      index === run.stageIndex ? { ...stage, state: "completed" } : stage,
    ),
    availableChoices: [],
    activeEncounter: null,
  };
}
```

This mirrors the existing `"completed"` branch's shape exactly (FR-003:
"the same way `\"unavailable\"` already drives its own distinct outcome
screen today") — `history`, `credits`, `creditTransactions`, and every
completed stage up to this point are untouched, so a `"failed"` run's
full history remains inspectable (FR-003, SC-003) via the same
`RunHistorySummary` projection a `"completed"` run already uses.

## `CreditTransactionKind` Extension

```ts
export type CreditTransactionKind =
  | "purchase"
  | "restock"
  | "participation"
  | "win-bonus"
  | "sponsor-immediate"
  | "sponsor-conditional"
  | "interest"
  | "sell-back";
```

Both new kinds flow through the existing `transactionFor`/
`appendTransaction` machinery unchanged (Research Decision 3) — no new
transaction shape, no new balance-tracking path.

## Interest Application

```ts
function interestFor(bankedCredits: number): number; // pure, e.g. Math.floor(bankedCredits * INTEREST_RATE)
```

Applied at the same point `advanceRun` transitions between stages (once
per stage advance, mirroring FR-007's "at a regular point in run
progression"), via `transactionFor(run, encounterId, "interest", interestFor(run.credits))`:

- `bankedCredits` reads `run.credits` at the moment interest is applied
  — no separate "banked vs. spendable" split exists in this codebase, so
  "banked" means the player's full current balance (Assumptions: no new
  economy model).
- When `interestFor(run.credits) === 0` (i.e., `run.credits === 0`), no
  transaction is appended at all (FR-008) — `appendTransaction` is
  simply not called for a zero amount, matching how `win-bonus` is
  already conditionally appended only `if (result.outcome === "win")`.
- `INTEREST_RATE` and its exact application cadence are a balance-pass
  constant, not fixed by this spec (Assumptions).

## `sellItem`

```ts
function sellItem(
  build: VehicleBuild,
  source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
): { build: VehicleBuild; item: ItemDefinition; creditsGained: number } | { kind: "failure"; code: "missing-source" };
```

| Rule | Source |
|---|---|
| Only `"vehicle"` and `"storage"` sources are valid — there is no `"offer"` to sell, an offer isn't held yet | FR-009 ("any held item (active or stored)") |
| `creditsGained = Math.floor(item.price / 2)` | FR-009, Edge Cases (round-down convention) |
| The source slot/storage index is cleared the same way `commitGarageCommand`'s eviction path already clears a position | Research Decision 4 |
| No confirmation/reversal step — irreversible within the encounter (FR-009, US3 Acceptance Scenario 2) | |

`encounters.ts` wraps this as `sellStock`/`sellHeldItem(run, source):
Run`, appending a `"sell-back"` transaction via `transactionFor` and
replacing `run.build` with the result — the same two-step
(pure-simulation-function + transaction-append) shape every other
encounters.ts mutation already follows (e.g. `purchaseStock`).

## `StockEntry` Extension

```ts
export interface StockEntry {
  id: string;
  item: OfferedItem;
  state: "available" | "purchased";
  locked: boolean; // new, defaults to false
}
```

## `restockSupplier` Extension

The existing per-entry replacement inside `restockSupplier`'s `.map()`:

```ts
stock: payload.stock.map((entry) =>
  entry.state === "purchased" ? entry : { ...entry, item: /* reroll */ },
),
```

gains one more exempted condition (Research Decision 5):

```ts
stock: payload.stock.map((entry) =>
  entry.state === "purchased" || entry.locked ? entry : { ...entry, item: /* reroll */ },
),
```

A locked entry's `item` is untouched by reroll; its `locked` flag itself
is untouched by reroll too (only `toggleLock` changes it — FR-010).

## `toggleLock`

```ts
function toggleLock(run: Run, encounterId: string, stockId: string): Run;
```

Flips `locked` on the named `StockEntry` within the current Parts
Supplier payload; no credit cost, no transaction (FR-011: purely a
reroll-scoping toggle). Throws the same `encounter-id-mismatch`/
`invalid-encounter-type` errors `requirePayload` already throws for
every other Parts Supplier action if the encounter isn't the current
active one. `locked` is never carried into a new `PartsSupplierPayload`
— a freshly-generated encounter's stock entries all start `locked:
false` (FR-011, Edge Cases: locks don't persist across encounters).

## Validation Invariants

1. `run.reputation` is never negative at any point a `Run` is returned
   from any exported `run.ts`/`encounters.ts` function (FR-004).
2. A `"failed"` `Run` has the same `history`/`creditTransactions` shape
   and content as a `"completed"` `Run` would have had up to the same
   point — no field is cleared, truncated, or replaced on the
   reputation-triggered transition (FR-003, SC-003).
3. `interestFor(0) === 0`, and no `"interest"` transaction is ever
   appended when it is (FR-008).
4. `sellItem`/`sellHeldItem` never returns a `creditsGained` that isn't
   `Math.floor(item.price / 2)` for the exact item removed (FR-009,
   SC-005).
5. `restockSupplier` never replaces a `StockEntry` with `locked: true`
   and `state: "available"` (FR-010) — every other eligible entry is
   still always replaced, matching today's behavior exactly (SC-006).
6. None of `applyReputationLoss`'s trigger conditions, `interestFor`,
   `sellItem`'s payout, or `toggleLock`'s availability read
   `identityTag`, entrant identity, or any purchasable-content flag
   (FR-012, Constitution Principle II).
7. Every credit total change introduced by this feature has a
   corresponding `CreditTransaction` in `run.creditTransactions` with a
   matching `balanceAfter` — verified the same way existing transaction
   kinds already are (FR-013, SC-007).
