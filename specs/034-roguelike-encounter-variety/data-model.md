# Data Model: Roguelike Encounter Variety

## ItemInstance

Fields: `instanceId`, `definitionId`, `tier`, `modification?`,
`scrutineeringBonusPercent`, `provenance`.

Rules: ID is unique within a run; tier is 1–3; at most one modification; bonus is
0–25%; catalog definition stays immutable. Moves and upgrades preserve the ID.
Sale/surrender removes the instance and its modification.

## WorkshopModification

Discriminated variants: `stat-graft` (`sourceStat`, `targetStat`), `twin-tuned`,
`guarded`, `adapted-mount`. Common fields: `modificationId`, `sourceEncounterId`,
`appliedAtStage`, authored presentation key. Compatibility must be legal/non-no-op.

## VehicleSlotState and StoredPosition

Both reference `ItemInstance | null`. Vehicle slots add `reservation?` containing
pending-effect and reserved-instance IDs. Reserved slots reject install/move-in
until the effect returns its exact item.

## EncounterDefinition

Fields: stable `type`, `family`, acquisition-primary flag, eligibility predicate,
preview builder, legal actions, transaction builder, authored variants, cadence
weight. Seven new types join the existing catalog.

## EncounterInstance

Fields: `encounterId`, `type`, `family`, run/stage IDs, seed domain, variant ID,
retained payload/offers, `status`, state fingerprint, preview, outcome reference.

States: `offered → active → confirmed|declined|unavailable`; terminal states may
advance the run once. Reopening a terminal instance is read-only.

## CadenceState

Fields: selected-type history, recent families, offered/completed guarantees,
choice ordinal (1–20), generation evidence. Upgrade guarantee windows map to
global stages 1–20 and 21–40, not to local leg indices.

## EncounterTransaction

Fields: transaction ID, encounter/state revision, debits, removals, additions,
moves, tier/modification changes, pending-effect changes, reputation changes,
history projection. Validation is pure; apply is all-or-nothing and idempotent.

## PendingEncounterEffect

Common fields: stable ID, category (`sponsor` or `scrutineering`), source,
target scored race, payload, status, expiry, settlement evidence.

Scrutineering payload: impounded `ItemInstance`, reserved slot ID, snapshotted
target instance IDs, computed percentage, and coefficients used. States:
`pending → race-committed → returned → settled`; failure routes to typed recovery
that restores the item before clearing the reservation.

## ExhibitionTrial

Fields: trial ID, retained track/setup/seed, one objective from each family,
committed thresholds, solo contest reference, status, result.

`ExhibitionResult`: objective evidence, completed count 0–3, reputation award
0–3, retained timing/activation/demand evidence. It has no standings or points.

## TagSpecialistStock

Fields: qualifying tags, selected tag, three retained stock entries, restock used,
seed. Exactly one entry has a compatible modification and `normalPrice + 2`.

## NormalizedStatContribution

Fields: stat, canonical points, source instance, layer (`base`, `placement`,
`modification`, `scrutineering`, `setup`, `synergy`), trigger/window, tier factor,
and display evidence. Simulation coefficients are derived only after this ledger.

## Run history extensions

History stores offer IDs, preview, confirmation/decline/unavailable outcome,
exact mutations, pending lifecycle, Exhibition evidence, and the coefficients or
content versions required for replay. Entries are chronological and immutable.
