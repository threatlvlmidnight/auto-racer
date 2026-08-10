# Quickstart: Economy Depth

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/economy-depth-contract.md](./contracts/economy-depth-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. Reputation tests confirm: decrement on outright PvP loss; no
   decrement on tie; decrement on failed sponsor objective; both
   triggers firing independently on the same stage; floor at zero
   (never negative); `"failed"` `RunStatus` set instead of `"active"`/
   `"completed"` once reputation hits zero, including the simultaneous
   Stage-6-completion case.
2. `"failed"` run history tests confirm `history`, `credits`, and
   `creditTransactions` are complete and unchanged in shape compared to
   a `"completed"` run at the same point (SC-003).
3. Interest tests confirm `interestFor(0) === 0`, no `"interest"`
   transaction is appended when banked credits are zero, and the applied
   amount is deterministic for a given balance (SC-004).
4. `sellItem`/`sellHeldItem` tests confirm exactly
   `Math.floor(item.price / 2)` credits for both a vehicle-slot source
   and a storage source, the item is removed from the build, and exactly
   one `"sell-back"` transaction is recorded (SC-005, SC-007).
5. Card-locking tests confirm a locked `StockEntry` survives
   `restockSupplier` unchanged while every other eligible entry is still
   replaced exactly as today (SC-006), and that a freshly-generated
   Parts Supplier encounter never inherits a lock from a prior instance.
6. Regression tests confirm every existing `RunStatus`-driven code path
   (`"active"`, `"completed"`, `"unavailable"`) and every existing
   `CreditTransactionKind` behaves unchanged after this feature ships.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: A Run Fails

1. Start a run and deliberately lose PvP stages / fail sponsor
   objectives until reputation reaches zero.
2. Confirm the run ends immediately — no further stage becomes
   available — with an outcome screen visibly distinct from a normal
   6-stage completion.
3. Confirm the run's history (credits earned/spent, stages completed,
   encounters resolved) is still fully inspectable afterward.
4. Start a second run and complete all six stages while keeping
   reputation above zero throughout; confirm it reaches `"completed"`
   exactly as it does today, with reputation never having caused an
   early end.

## Scenario B: Interest

1. Play a run banking a meaningful credit balance between encounters
   rather than spending it all.
2. Confirm an `"interest"` transaction appears in run history at each
   stage transition where credits were greater than zero, and confirm
   the credit total increases accordingly.
3. Play a run spending down to exactly zero credits before a stage
   transition; confirm no `"interest"` transaction appears for that
   transition.

## Scenario C: Sell-Back

1. Hold an item on the active build; sell it from the garage.
2. Confirm the player's credits increase by exactly half the item's
   authored price (rounded down) and the item is gone from the build.
3. Repeat for an item held in storage; confirm the same payout and
   removal behavior.

## Scenario D: Card Locking

1. At a Parts Supplier encounter, lock one offered card, then reroll.
2. Confirm the locked card is unchanged and every other card is
   replaced.
3. Unlock the card and reroll again; confirm it is now eligible to be
   replaced like any other offer.
4. Leave and enter a new Parts Supplier encounter; confirm nothing
   starts locked.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS). Acceptance requires all automated checks and scenarios above,
plus zero regression in any existing `RunStatus`/`CreditTransactionKind`
test.
