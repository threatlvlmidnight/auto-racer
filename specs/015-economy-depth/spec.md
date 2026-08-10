# Feature Specification: Economy Depth

**Feature Branch**: `015-economy-depth`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Adopt the economy layer in full: reputation as a real lose-condition (a run can now end early on repeated bad performance, not just complete all six stages), interest on banked credits, win/loss streak bonuses, half-price item sell-back, and shop-card locking (persisting a Parts Supplier offer across a reroll). Decided direction recorded in specs/skribidi-gap-decisions.md §6 following the Skribidi Skids POC gap analysis. Reputation thresholds need their own balance pass against our credits/contest-outcome shape, not a direct port of Alex's numbers; interest/streaks layer onto the existing creditTransactions system; shop-card locking needs its own UI/interaction spec since no lock-across-reroll interaction exists today."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A run can actually be lost (Priority: P1)

A player who performs badly enough, repeatedly, sees their run end early
— not just a weaker finish at Stage 6, but the season itself cut short —
because for the first time, poor performance has a real, structural
consequence beyond a smaller credit total.

**Why this priority**: This is the headline mechanic. Every other piece
of this feature (interest, sell-back, locking) is economic texture; this
one changes what "playing badly" actually costs, which is the core of
what "economy depth" means.

**Independent Test**: Play a run performing badly enough, repeatedly, to
trigger reputation loss; confirm the run ends before Stage 6 with a
distinct, legible outcome — not silently treated the same as a normal
completion.

**Acceptance Scenarios**:

1. **Given** a run in progress, **When** the player's reputation reaches
   zero, **Then** the run ends immediately, before any further stage
   begins, with an outcome the player can tell apart from a normal
   6-stage completion.
2. **Given** a run that ends this way, **When** the player reviews it,
   **Then** their history up to that point (credits earned/spent, stages
   completed, encounters resolved) remains visible — an early end is not
   the same as the run never having happened.
3. **Given** a run performing well, **When** the player completes all six
   stages, **Then** reputation never causes an end-of-run outcome that
   wasn't already going to happen — reputation only ever cuts a run
   short, it never blocks a run that would otherwise finish.

---

### User Story 2 - Banked credits are worth something (Priority: P1)

A player who holds credits in reserve rather than spending everything
immediately earns a little extra for doing so — a real reason to
sometimes not spend down to zero at every opportunity.

**Why this priority**: Without this, "save credits for later" has no
mechanical payoff, only an opportunity cost. Interest is what makes
banking a real strategic choice instead of a pure downside.

**Independent Test**: Compare two otherwise-identical runs that differ
only in how much credit each banks between encounters; confirm the
run that banked more receives a larger interest credit, attributable as
its own transaction.

**Acceptance Scenarios**:

1. **Given** a player holding banked credits, **When** interest is
   applied, **Then** the player's credit total increases by an amount
   derived from how much was banked, recorded as its own transaction
   distinguishable from purchases, restocks, or prizes.
2. **Given** a player holding zero banked credits, **When** interest
   would be applied, **Then** no interest transaction occurs — interest
   never manufactures credits from nothing.

---

### User Story 3 - An unwanted item is worth something (Priority: P2)

A player holding an item they no longer want can sell it back for
credits, instead of it just sitting there as dead weight or requiring an
outright discard with nothing in return.

**Why this priority**: Real but smaller economic texture — useful once
the player has a real build to manage, less critical than the stakes/
banking mechanics above.

**Independent Test**: Sell a held item; confirm the player receives half
its authored price in credits (rounded per existing rounding conventions)
and the item is removed from the build.

**Acceptance Scenarios**:

1. **Given** a held item, **When** the player sells it, **Then** they
   receive credits equal to half its authored price, recorded as its own
   transaction, and the item is removed from wherever it was held.
2. **Given** a sold item, **When** the player looks for it afterward,
   **Then** it is gone from the build entirely — selling is not
   reversible within the same encounter.

---

### User Story 4 - Reroll around a card worth keeping (Priority: P2)

A player who sees one good offer among several unwanted ones in the Parts
Supplier can lock that one card before rerolling, so the reroll only
replaces the cards they don't want.

**Why this priority**: Quality-of-life on top of the existing reroll
mechanic — real, but the smallest-impact piece of this feature.

**Independent Test**: Lock one Parts Supplier offer, then reroll; confirm
the locked offer is unchanged while every other offer is replaced.

**Acceptance Scenarios**:

1. **Given** a Parts Supplier offer the player locks, **When** they
   reroll, **Then** that specific offer is unchanged and every unlocked
   offer is replaced, exactly as reroll already behaves for unlocked
   offers today.
2. **Given** a locked offer, **When** the player unlocks it, **Then** it
   becomes eligible to be replaced on the next reroll like any other
   offer.

---

### Edge Cases

- What happens if reputation would drop below zero in a single step (a
  large penalty applied at once)? The run ends the same way it would at
  exactly zero — reputation is not allowed to go negative and produce a
  different or worse outcome than hitting zero exactly.
- What happens to a pending Parts Supplier restock/lock state if the run
  ends mid-encounter due to reputation loss? The run-ending check applies
  at the same point normal stage-completion checks already apply — it
  does not interrupt an encounter already in progress.
- What happens if a player tries to sell the last item keeping a
  storage-active effect running, or an item that's core to their current
  build? Selling is always allowed — this feature does not add any
  "can't sell your last X" restriction; the consequence of selling
  something valuable is the player's own decision to weigh, not a rule
  the system enforces.
- What happens to sell-back value for an item whose authored price is an
  odd number? Follows the same half-price rounding convention already
  established elsewhere in this codebase (see `sellSlot`-equivalent
  rounding in existing prototype code) — round down, matching how
  eviction/discard credit already works in the shipped garage code today
  where a comparable calculation exists.
- What happens to a locked Parts Supplier offer if the player leaves and
  later returns to a different Parts Supplier encounter? Locks are
  local to one encounter instance — a new encounter starts with nothing
  locked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST track a reputation value on every active
  run, starting at a fixed authored value.
- **FR-002**: Reputation MUST decrease on either of the two existing
  outcome shapes that already represent "this went badly": a lost
  scheduled PvP contest, or a failed/unmet sponsor objective. Both
  trigger reputation loss — reputation is not tied to PvP alone. A tied
  PvP contest does NOT count as a loss for this purpose — reputation only
  decreases on an outright loss, treating a tie as neutral, matching how
  a tie already doesn't count as a win for champ points elsewhere in the
  game.
- **FR-003**: When reputation reaches zero, the run MUST end immediately
  via a new, distinct `RunStatus` value (not a reuse of today's
  `"completed"` status) — the same way `"unavailable"` already drives its
  own distinct outcome screen today. The player's full history, credits,
  and stage progress up to that point MUST remain inspectable, exactly as
  a normally-completed run's history already is.
- **FR-004**: Reputation MUST NOT go negative — a penalty that would take
  it below zero MUST produce the same run-ending outcome as reaching
  exactly zero, never a worse or different one.
- **FR-005**: Reputation loss and its exact thresholds are a balance/
  tuning decision, not fixed by this specification — see Assumptions.
- **FR-006**: The player's current reputation MUST be visible during an
  active run, the same way credits are already always visible — a value
  that can end the run early is not something the player discovers only
  after the fact (Constitution Principle III).
- **FR-007**: The system MUST apply an interest credit, derived from the
  player's currently banked (unspent) credits, at a regular point in run
  progression — recorded as its own credit-transaction kind, distinct
  from purchase, restock, or prize transactions.
- **FR-008**: Interest MUST NOT apply (produce a zero-amount or absent
  transaction) when the player holds zero banked credits.
- **FR-009**: The system MUST allow the player to sell any held item
  (active or stored) for credits equal to half its authored price
  (rounded down), recorded as its own credit-transaction kind, removing
  the item from the build immediately and irreversibly within that
  encounter.
- **FR-010**: The system MUST allow the player to lock a specific Parts
  Supplier offer so that a subsequent reroll leaves it unchanged while
  replacing every unlocked offer, exactly as reroll already replaces
  every offer today.
- **FR-011**: A lock MUST be reversible (the player can unlock a
  previously locked offer) and MUST NOT persist beyond the single Parts
  Supplier encounter instance it was set in.
- **FR-012**: None of reputation triggers, interest, sell-back value, or
  card-locking availability MAY vary by player entrant or by any
  purchasable content or currency (Constitution Principle II, Fairness).
- **FR-013**: Every credit-transaction kind introduced by this feature
  (interest, sell-back) MUST be inspectable in run history the same way
  existing transaction kinds already are — no new value MAY be added to a
  player's credit total without a corresponding, attributable transaction
  record (Constitution Principle III).

### Key Entities

- **Reputation**: A new numeric field on the active `Run`, starting at a
  fixed authored value, decreasing on authored trigger conditions
  (FR-002), and driving a new run-ending outcome at zero. Never increases
  above its starting value within this feature's scope (no "regain
  reputation" mechanic is introduced here).
- **Interest Transaction**: A new credit-transaction kind, computed from
  the player's currently banked credits at the moment it's applied.
- **Sell Transaction**: A new credit-transaction kind, applied when the
  player sells a held item, alongside the item's removal from the build.
- **Locked Stock Entry**: A new boolean flag on a Parts Supplier
  `StockEntry`, defaulting to unlocked, toggleable by the player, and
  respected by the existing reroll mechanic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The player's current reputation is visible at every point
  during an active run, with zero states where it must be inferred rather
  than read directly.
- **SC-002**: A run can end before Stage 6 due to reputation loss, with
  an outcome distinguishable from normal completion in 100% of cases
  where reputation reaches zero.
- **SC-003**: A run's full history up to an early reputation-driven end
  remains inspectable — zero data loss compared to a normally-completed
  run's history.
- **SC-004**: Interest is applied only when banked credits are greater
  than zero, and the applied amount is deterministically derived from the
  banked amount, with zero exceptions across a sample of resolved runs.
- **SC-005**: Selling any held item always returns exactly half its
  authored price (rounded down) and always removes it from the build,
  with zero exceptions.
- **SC-006**: A locked Parts Supplier offer survives 100% of subsequent
  rerolls within its encounter unchanged; every unlocked offer is
  replaced exactly as it already is today.
- **SC-007**: Every credit change introduced by this feature (interest,
  sell-back) is attributable to a specific, inspectable transaction
  record — zero silent credit changes.

## Assumptions

- Exact reputation starting value, per-trigger loss amount, and the
  interest rate/formula are explicitly a balance/tuning pass for planning
  and content authoring, not fixed by this specification — per
  `specs/skribidi-gap-decisions.md` §6's own adjustment note ("reputation
  thresholds need their own balance pass... not a direct port of Alex's
  numbers").
- Interest is implemented as a new `CreditTransactionKind` value layered
  onto the existing `creditTransactions` system (`src/simulation/run.ts`,
  `src/simulation/encounters.ts`), not a parallel economy system.
- **Win/loss streak bonuses are explicitly out of scope for this
  feature**, resolved during `/speckit.clarify`: this run currently has
  only 2 scheduled PvP stages per 6-stage run (versus Alex's 10-event
  season), too few for a streak to reliably read as meaningful. Streaks
  are deferred as a follow-up to be revisited once
  `009-run-progression`'s season-length growth
  (`specs/skribidi-gap-decisions.md` §7) actually lands — not dropped,
  just sequenced after there's enough per-run volume for them to matter.
- This feature does not change the existing six-stage run schedule,
  scheduled-PvP-stage count, or `009-run-progression`'s planned Phase-two
  encounter catalog — reputation mechanics apply within whatever run
  length exists today, without depending on `009`'s future growth landing
  first.
- Sell-back and card-locking are UI/interaction additions to the existing
  Parts Supplier encounter and garage (`PrepareScene.ts`,
  `src/simulation/encounters.ts`, `src/simulation/garage.ts`) — no new
  encounter type is introduced.
- This feature does not touch `012-multi-ghost-contest`'s or
  `013-race-spectacle`'s scope — reputation loss can be triggered by a
  PvP outcome regardless of whether that contest was resolved against one
  ghost or the eventual multi-ghost field.
