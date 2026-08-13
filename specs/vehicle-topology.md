# Vehicle Topology and Item Installation

*Authoritative product direction. This supersedes the earlier generic-board
model as the intended vehicle system. The currently shipped generic slots remain
a prototype until a dedicated feature specifies and implements this model.*

## Core decision

The player's build surface is their entrant's named **vehicle**, not an abstract
board or shop display. Every vehicle has the same total number of active item
slots, but each vehicle distributes those slots differently among **Power**,
**Chassis**, and **Flex** slots.

Every item has exactly one installation category: **Power** or **Chassis**.
Items may be installed into any vehicle slot regardless of category. Slot type
changes the authored behavior the item exposes; it never makes placement illegal.

## The three slot types

- **Power slot**: Fits a Power item and activates that item's authored `Fitted`
  effect. A Chassis item installed here remains legal but is `Improvised`.
- **Chassis slot**: Fits a Chassis item and activates that item's authored
  `Fitted` effect. A Power item installed here remains legal but is `Improvised`.
- **Flex slot**: Accepts either category without mismatch. The item provides its
  base effect but activates neither its `Fitted` effect nor an `Improvised`
  consequence.

Flex slots trade specialization for freedom. They are not strictly superior to
typed slots because they cannot activate `Fitted` effects.

## Installation states

Every installed item is in exactly one visible state:

| State | Condition | Result |
|---|---|---|
| `Fitted` | Item category matches a typed slot | Base effect plus the item's authored `Fitted` effect |
| `Flexible` | Item occupies a Flex slot | Base effect only |
| `Improvised` | Item category conflicts with a typed slot | Base effect plus the item's authored `Improvised` consequence, when present |

There is no universal numerical alignment bonus or mismatch penalty. In
particular, the system must not apply a hidden global modifier such as `+10%`
for matching or `-10%` for mismatching. Installation behavior belongs to the
item and must be written on that item.

Examples of valid authored installation behavior:

- a Fitted belt drive fires one lap sooner the first time;
- Fitted leaf springs protect another Chassis item from disruption;
- an Improvised pressure tank generates Heat when it fires;
- an Improvised body panel adds Weight but counts as an extra piece of Scrap;
- an experimental Fieldworks item intentionally rewards cross-category
  installation as part of a cross-disciplinary prototype.

An item may have no special `Improvised` consequence, in which case a mismatch
simply forfeits its `Fitted` effect. Every item must still communicate all three
states clearly enough that placement does not require external rules knowledge.

## Capacity and vehicle identity

- Every launch vehicle must have the same total active item-slot count.
- Vehicles may differ only in the distribution of Power, Chassis, and Flex
  slots, never in total active capacity.
- Storage capacity and rules remain equal across entrants unless separately
  amended; storage has no installation affinity because stored items are not
  installed on the vehicle.
- Slot distribution is part of the named vehicle's identity and is selected
  with the entrant.
- Different distributions are intended to change how readily a vehicle fits a
  draft, not to prescribe which strategy that entrant must play.
- Exact launch counts are a balance decision for the implementation feature and
  must be tested with representative pure-origin and cross-origin builds.

Illustrative distributions may be used during testing, but none are final until
the total capacity and each launch vehicle's topology are balanced together.

## Item content rules

Every gameplay item must be representable as something physically installed on,
carried by, displayed on, or operated from the vehicle. Abstract concepts must
be embodied as race equipment.

Examples:

- a wager becomes a Bookmaker's Ledger mounted at the dashboard;
- a forged manifest occupies a document case or hidden compartment;
- spectator acclaim is represented by a pennant, trophy, placard, or camera;
- a tonic is carried in a bottle rack or delivered through a mechanical feed;
- a commission is represented by its specification plate, presentation kit, or
  commissioned component.

Every item definition must include:

- one origin: Coachworks, Velodrome, Fieldworks, or Backroads;
- one installation category: Power or Chassis;
- one or more optional synergy tags;
- a legible base effect;
- an authored `Fitted` effect;
- any authored `Improvised` consequence, or an explicit indication that the
  mismatch only loses the `Fitted` effect.

These are independent axes:

- **Origin** controls draft weighting and thematic source.
- **Installation category** controls relationship to the vehicle slot.
- **Synergy tags** control item-to-item and build interactions.

Every origin ecosystem must include meaningful Power and Chassis items. No
entrant may become "the Power character" or "the Chassis character" merely
because of draft weighting. Cross-origin items remain legal and useful on every
vehicle.

## Interaction and legibility requirements

- The vehicle view must show each slot's type before an item is placed.
- During drag, selection, or placement preview, the resulting `Fitted`,
  `Flexible`, or `Improvised` state must be visible before commitment.
- Item details must show base behavior and the applicable installation behavior.
- Race playback and results must identify when a `Fitted` effect or
  `Improvised` consequence changes an outcome.
- Moving an item between slots may change only its installation-derived state;
  it must not silently mutate the authored item definition.
- Position within slots of the same type has no meaning unless a later feature
  explicitly introduces adjacency or ordering. This decision adds topology,
  not spatial packing.

## Relationship to existing systems

- Prepare -> Contest remains unchanged. Installation decisions occur only
  during preparation, and the resulting states are locked for the contest.
- Acquisition, eviction, storage, duplicate-item, and active-while-stored rules
  remain in force unless a later feature explicitly revises them.
- The four entrant ecosystems and origin/synergy distinction in
  `specs/launch-roster.md` remain authoritative.
- The current generic board is an implementation placeholder. Feature 009 may
  complete against that placeholder but must not describe generic slots as the
  final product model or make vehicle topology harder to add.

## Still open

- Final total active slot count.
- Final Power/Chassis/Flex distribution for each launch vehicle.
- Whether every item requires a unique Improvised consequence or some use a
  standardized, explicitly displayed consequence vocabulary such as Heat,
  Weight, or Wear.
- How storage-active items express installation behavior while not installed;
  the conservative default is that they receive base storage behavior only.
- The feature sequence for topology implementation, item migration, vehicle UI,
  balance testing, and replacement of the current generic board.
