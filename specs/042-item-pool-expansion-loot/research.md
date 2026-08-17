# Research: Item Pool Expansion and Loot

## Decision 1: Improve effective diversity before raw count

**Decision**: Audit all 70 current definitions, repair every truth/dead-card
failure, retrofit at least the 12 catalog-plan items, then add exactly eight
active and four Loot definitions.

**Rationale**: Each entrant currently reaches only 25 of 70 definitions, while
most reachable choices are direct physics. More names alone would not create
more decisions. The three-perspective review independently favored clearer
payoffs, bridges, installation choices, and sequencing mechanics.

**Rejected**: A large 12+ active-card expansion without retrofits. It preserves
weak/dead current choices and increases later art cost before mechanics settle.

## Decision 2: Weighted sampling without replacement

**Decision**: Map Standard/Notable/Rare to weights 4/2/1 and sample every
multi-card offer without replacement from eligible definitions.

**Rationale**: Rarity currently communicates odds that do not exist, and
independent draws can repeat the same definition in one offer. A pure weighted
helper fixes both while preserving seeded determinism.

**Rejected**: Display-only rarity and post-draw duplicate rerolls. Rerolls can
consume variable RNG and remain awkward near exhaustion.

## Decision 3: Keep Loot out of ordinary entrant shops

**Decision**: Define `LOOT_ITEMS` separately. Ordinary shops/drafts never
receive them. Only sources with an explicit `lootEligible` contract may draw a
bounded Loot lane; V1 adds one neutral-only supplier/cache source.

**Rationale**: This exactly follows the owner's amendment and prevents inert
choices from diluting ordinary active-item acquisition. A real neutral source
is required so the feature can be played and tested rather than merely modeled.

**Rejected**: Adding Loot to `NEUTRAL_ITEMS`, even with an offer cap. That array
is concatenated into every entrant pool and would leak Loot into normal shops.

## Decision 4: Loot conversion extends the sale transaction

**Decision**: Preview and settle Loot through a versioned `Sell` command that
uses normal half-price credits and normal sale-economy modifiers, while adding
the target bonus and history in the same atomic transition.

**Rationale**: The owner selected normal sale semantics. Extending the existing
receipt/Undo boundary avoids a second inventory-removal authority.

**Rejected**: Applying the bonus in presentation or making a separate consume
command. Either risks credits, removal, bonus, and Undo diverging.

## Decision 5: Permanent bonuses live on item instances

**Decision**: Add an immutable `permanentLootBonuses` ledger to `ItemInstance`.
Each contribution records source/target/transaction/stat/value/stage/version.
The canonical stat resolver adds the ledger after other normalized layers and
never permits another multiplier to scale it.

**Rationale**: The bonus must follow identity through moves, tiering, and
modifications and disappear when identity disappears. A definition-level value
or location-level side table violates that lifecycle.

**Rejected**: Mutating item definitions or storing bonuses by slot. Definitions
are shared catalog data and slots are not identity.

## Decision 6: Full-fit leftmost targeting

**Decision**: Traverse authored vehicle slot IDs, then storage indices. A target
must be non-Loot, have an authored or Workshop-modification contribution to the
requested stat, and have enough remaining +3 cap capacity for the entire Loot
magnitude. Skip non-fitting candidates; block when none fits.

**Rationale**: This preserves automatic leftmost targeting and the +3 cap while
preventing a tiered reward from silently losing points. Prior Loot bonuses alone
do not make a target eligible.

**Rejected**: Partial application. It makes duplicate tiering sometimes worth
less than advertised. Manual target selection was explicitly declined.

## Decision 7: Typed reusable mechanics, never item IDs

**Decision**: Replace hardcoded economy item IDs with typed definition data;
add reusable at-least, distinct-family, lap-window, and canonical installation
primitives for the retrofit/new roster.

**Rationale**: The current economy code contains three name-specific branches,
and two exclusive cards are dead. Data-owned mechanics make cards truthful,
auditable, and extensible without growing switch statements keyed by content ID.

**Rejected**: More name-specific conditionals. They prevent a trustworthy
catalog audit and make presentation copy drift from behavior.

## Decision 8: Buff tiers use universal multiplication

**Decision**: Buff strength at tiers 2/3 is base ×1.15/×1.30. Cooldown-stack
bases currently at 2–3% start planning at 5–6%, then must pass deterministic
8/10/12/14/16-lap outcome evidence.

**Rationale**: Current +15 percentage-point tier increments make small Buffs
explode, while simply multiplying a 2–3% base feels unrewarding. Raising the
base and keeping one universal tier rule solves both concerns.

**Rejected**: Per-card tier tables. They add copy and balance complexity before
the overall item vocabulary is stable.

## Decision 9: Automated audit gates roster approval

**Decision**: Generate deterministic JSON/text evidence for catalog truth,
coverage, offer access, duplicate suppression, tier attainment, and race-length
balance. The report fails explicit thresholds rather than relying on screenshots.

**Rationale**: This work is safe for the coding agent and freezes a mechanical
roster before art. Qualitative UI review remains a separate owner/frontier task.

**Rejected**: Treating visual inspection as the primary balance/correctness
gate or asking DeepSeek to capture screenshots.

