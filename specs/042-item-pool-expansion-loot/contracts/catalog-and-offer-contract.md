# Catalog and Offer Contract

## Catalog truth

1. Mechanics are declared in typed definition data, never inferred from prose.
2. Compact and full presentation are projections of the same typed data.
3. Every definition is either active or Loot. Active definitions must have a
   real authored role; Loot must pass the inert-capability validator.
4. The two known dead definitions fail validation until repaired.
5. All 19 tag IDs have one stable classification from `catalog-plan.md`.

## Tiering

- Direct canonical points, Buff percentages, typed economy amounts, and authored
  adjacency values use the shared 100%/115%/130% factors unless a contract
  explicitly says otherwise.
- Loot alone uses the authored discrete tier table +1/+2/+3.
- Buff percentages must never receive +15/+30 percentage points.

## Offers

For a given seed, eligible pool, identity weighting, rarity weights, and count,
the weighted-without-replacement helper returns the same ordered definition IDs.
It cannot return the same definition twice. If fewer than the requested count
remain, it returns the unique remainder with a typed exhaustion fact.

Rarity weights are Standard 4, Notable 2, Rare 1. Identity weighting and rarity
weighting are combined once in the authoritative sampler and recorded in audit
evidence.

Normal entrant-origin sources use only shared active neutral definitions plus
that entrant's exclusive definitions. They always set `lootEligible: false`.
Only explicit neutral sources may set `lootEligible: true`, and their visible
offer contains at most one Loot definition. V1's neutral supplier uses a seeded
35% Loot-lane chance; when active, the four Loot definitions are selected with
equal weight and replace exactly one of the three ordinary neutral slots.

## Audit thresholds

- exactly 70 baseline, 8 new active, and 4 Loot definitions;
- zero unintended effectless active items;
- zero compact/full/behavior mismatches;
- three unique IDs in every reference three-card offer when three are eligible;
- each origin has all three catalog-plan directions represented;
- every build-family tag has a documented reachable payoff/support path;
- every new active definition appears in each authorized entrant corpus but is
  neither guaranteed nor absent;
- no Loot appears in a normal entrant-origin source corpus;
- no neutral eligible offer contains more than one Loot;
- all tier and lap-length balance fixtures stay inside approved normalized-stat
  bands recorded by the generated report.

Exact statistical confidence bounds are fixed in deterministic tests using a
checked-in corpus of 20,000 sequential seeds per entrant normal source and
20,000 for the neutral source:

- mean per-definition appearance for Standard exceeds Notable, and Notable
  exceeds Rare; adjacent rarity means must have a ratio from 1.5 through 2.5;
- every definition authorized for a corpus appears in at least 0.25% and no
  more than 25% of its offers;
- normal entrant corpora contain exactly zero Loot;
- 33–37% of neutral offers contain exactly one Loot, each individual Loot
  appears in 7–10% of neutral offers, and none contains two;
- in 10,000 deterministic eight-acquisition runs using the checked-in first-
  available policy, each new active item's tier-2 attainment is between 50%
  and 200% of its same-rarity home-pool median; tier-3 attainment is reported
  and no new item may exceed three times a non-zero same-rarity median.

Changing corpus size or bounds requires updating this contract and the report
rationale, not weakening a failing assertion ad hoc.
