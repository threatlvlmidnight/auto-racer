# Loot Sale Contract

## Preview

`previewLootSale(run, sourceInstanceId, commandId)` is pure. It validates that
the source is a held typed Loot instance and derives its stat/magnitude from
definition data and tier.

Target traversal is canonical authored vehicle slot order followed by storage
index. A candidate qualifies only when:

1. it is a non-Loot held item;
2. its authored definition or current Workshop Modification contributes a
   non-zero amount to the requested canonical stat; and
3. its existing Loot ledger can accept the complete magnitude without exceeding
   +3 for that instance/stat.

Prior Loot points alone do not establish criterion 2. A candidate that cannot
fit the whole magnitude is skipped; points are never silently discarded.

The preview discloses source, source location/tier, selected target/location,
stat, full points, previous/resulting cap value, base half-price credits, each
sale-economy contribution, final credit delta, or a typed blocking reason.

## Settlement

`settleLootSale(run, command)` recomputes and validates the state fingerprint.
On success it atomically:

1. removes the exact Loot instance;
2. appends one attributed permanent bonus to the exact target instance;
3. applies normal half-price sale credits and eligible typed economy bonuses;
4. appends the credit transaction and Loot conversion history;
5. creates one receipt and valid immediate Undo snapshot; and
6. marks the command ID consumed.

On stale, duplicate, malformed, unknown-version, no-target, cap, or credit
failure, it returns a typed failure and leaves the complete run deep-equal.

## Stat composition

Permanent Loot bonuses enter the normalized ledger as their own `loot` layer
after authored/tier/modification/installation/adjacency calculations. Buff,
Synergy, installation, modification, adjacency, setup, Scrutineering, and other
Loot do not multiply them. Current build, pre-race, Test Day, scored race, and
Results consume and attribute the same points.

## Undo and lifecycle

Normal immediate-sale Undo invalidation rules apply. A successful Loot Undo
restores the exact source instance/location/tier, credits, credit transaction,
target ledger, conversion history, receipt state, and command-consumption state
atomically. If restoration is no longer legal, no field changes.

Moving, storing, tiering, and replacing a Workshop Modification preserve target
identity and its ledger. Selling, surrendering, impounding, rebuilding, or
replacing that identity removes its ledger. A transformation preserves the
ledger only when it explicitly preserves the same `instanceId`.

## Inertness exclusions

Before sale, Loot contributes to none of: physical stats, lap time, Buff,
Synergy, adjacency, installation behavior, setup controls, economy triggers,
sponsor progress, Tag Specialist, Workshop Modification, Scrutineering,
Rebuild, event targeting, or contest events. Placement consumes normal capacity
and uses normal replacement confirmation only.

