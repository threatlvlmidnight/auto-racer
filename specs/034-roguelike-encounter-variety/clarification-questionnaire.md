# Feature 034 Clarification Questionnaire: Roguelike Encounter Variety

**Created**: 2026-08-15

**Status**: Complete — all owner decisions integrated.

This questionnaire follows the repository-local `/speckit.clarify` process.
Accepting all recommendations produces a bounded first slice that is meaningfully
different from acquisition while reusing existing run authority.

## Remaining questions only

None. Q16 and Q21 were accepted and integrated on 2026-08-15. The table below
is intentionally retained as the final resolved-decision summary.

| Question | Resolved decision | Owner answer |
|----------|-----------------|--------------------|
| Q16 | Two matching held tags, final four stages, player-selected tag, three items plus same-tag restock | Accepted |
| Q21 | One pending effect per category; Sponsor and Scrutineering may coexist | Accepted |

## Prior questions — answered or superseded

The following original questions are retained as decision history. Q3-Q6,
Q8-Q10, Q12, and Q13 were integrated into `spec.md`; Q1, Q2, Q7, and Q11 were
superseded by the narrower follow-up questions Q14-Q24.

### Initial catalog and mechanics

#### Q1 — Which new encounter types ship in the first slice?

**Recommended: Option A** — Ship four previously reserved types: Rival Scouting,
Scrutineering, Factory Development, and Privateer Exchange. Four types cover
information, risk, transformation, and trade without making the first slice a
content-production marathon.

| Option | Description |
|--------|-------------|
| A | Four reserved types: Rival Scouting, Scrutineering, Factory Development, and Privateer Exchange. |
| B | Six types by adding Salvage Yard and Route Survey to Option A. |
| C | Three-type MVP: Rival Scouting, Factory Development, and Privateer Exchange; defer explicit risk. |
| Other | Provide a replacement initial catalog and minimum authored variants. |

#### Q2 — What does Rival Scouting do?

**Recommended: Option A** — Offer two exact rival dossiers for the next scored
race; choosing one guarantees that rival appears in the field and reveals their
complete committed build, resolved stats, identity rules, and risk. This makes
information actionable without directly buffing the player.

| Option | Description |
|--------|-------------|
| A | Choose one of two exact dossiers; selected rival is guaranteed in the next field and fully revealed. |
| B | Reveal the entire already-committed next field with no rival-selection effect. |
| C | Reveal only the strongest next-race rival, but grant a small preparation bonus. |
| Other | Provide a concise deterministic scouting interaction. |

#### Q3 — What does Scrutineering do?

**Recommended: Option B** — Present a voluntary next-race engineering challenge:
declare one visible build constraint, earn a meaningful reputation reward if the
next scored race is completed legally, and suffer no additional failure penalty.
This creates risk through constrained preparation without item confiscation.

| Option | Description |
|--------|-------------|
| A | Wager reputation on meeting a visible next-race build constraint; failure loses the stake. |
| B | Accept a visible next-race build constraint for a reputation reward; failure simply earns nothing. |
| C | Submit one item for inspection and temporarily lose access to it until after the next race. |
| Other | Provide a bounded, inspectable Scrutineering rule. |

#### Q4 — What does Factory Development do?

**Recommended: Option A** — Establish Workshop Modifications as a permanent
second item axis for the current run. Select one held item first, then preview
three compatible modifications that change its behavior; choose one for free as
the encounter reward. An item holds at most one modification, and replacing one
requires an exact before/after confirmation.

| Option | Description |
|--------|-------------|
| A | Apply one run-persistent Workshop Modification from three compatible item-specific choices. |
| B | Permanently upgrade one eligible item by one tier for a credit cost. |
| C | Apply one temporary item-specific modification through the current leg only. |
| Other | Provide a deterministic development operation and expiry. |

#### Q5 — What does Privateer Exchange do?

**Recommended: Option A** — Select one held item to trade, preview three
same-tier items from other origins, and receive exactly one; declining preserves
the source item. This promotes build pivots without increasing inventory count.

| Option | Description |
|--------|-------------|
| A | Trade one held item for one of three same-tier foreign-origin items. |
| B | Trade one held item for one deterministic higher-tier item and pay the tier difference. |
| C | Exchange credits for a randomly selected foreign item without surrendering an item. |
| Other | Provide a deterministic exchange rule. |

### Cadence and consequences

#### Q6 — How should encounter-family cadence work?

**Recommended: Option A** — Never offer two acquisition-primary encounters
together, prevent the last selected type for two choice stages, and guarantee at
least one non-acquisition option at every choice plus all four new families at
least once per complete championship when eligible.

| Option | Description |
|--------|-------------|
| A | Two-stage type cooldown, non-acquisition in every pair, and per-run family guarantees. |
| B | One-stage cooldown and non-acquisition in every pair; no full-run guarantees. |
| C | Weighted variety only, with duplicate-pair rejection but no cooldown/guarantee. |
| Other | Provide exact cooldown, pair, guarantee, and fallback rules. |

#### Q7 — How many pending future effects may coexist?

**Recommended: Option A** — One pending effect per target category (scouting,
build constraint, item development, route), with newer encounters of an occupied
category excluded until resolution. This is legible and avoids overwrite rules.

| Option | Description |
|--------|-------------|
| A | One per category; incompatible new encounters are excluded. |
| B | One pending encounter effect total across the run. |
| C | Multiple effects may stack with stable source-order resolution. |
| Other | Provide exact stacking and overwrite rules. |

#### Q8 — Which resources may an encounter put at risk?

**Recommended: Option A** — Credits and opportunity cost only in this slice;
reputation may be awarded but cannot be staked, and held items cannot be lost
except through an explicit confirmed exchange. This keeps failure bounded.

| Option | Description |
|--------|-------------|
| A | Credits/opportunity cost only; no reputation stake or involuntary item loss. |
| B | Credits and up to 2 reputation may be staked; no involuntary item loss. |
| C | Credits, reputation, or one explicitly selected item may be staked. |
| Other | Provide resource types and hard maximum downside for each. |

#### Q9 — What happens when no legal operation exists after entry?

**Recommended: Option A** — Complete the encounter as unavailable with no state
loss and immediately return to the route. Eligibility should normally prevent
this, but the fallback safely handles stale or changed state.

| Option | Description |
|--------|-------------|
| A | Record unavailable, consume no resources, and return to route. |
| B | Replace it with a neutral 1-credit consolation outcome. |
| C | Deterministically swap to another eligible encounter after entry. |
| Other | Provide a non-punitive deterministic fallback. |

### Validation scope

#### Q10 — What content-volume gate proves the first slice is complete?

**Recommended: Option A** — At least three authored variants per new encounter
type, every variant reachable in the deterministic corpus, with every entrant
and early/mid/late route position represented.

| Option | Description |
|--------|-------------|
| A | Three variants per type plus entrant and route-position corpus coverage. |
| B | Two variants per type for a smaller MVP. |
| C | One mechanically complete variant per type; content expansion later. |
| Other | Provide a minimum variant count and coverage requirement. |

### Workshop Modification layer

#### Q11 — Which modification families ship first?

**Recommended: Option A** — Ship four Motor-Age families that change different
systems: `Rapid` reduces a compatible cooldown by one lap; `Resonant` adds one
offered validated synergy tag; `Specialized` adds a stronger effect under one
visible track condition; `Re-engineered` changes how the item's Fitted versus
Improvised behavior resolves. Eligibility filters out no-op or illegal pairings.

| Option | Description |
|--------|-------------|
| A | Rapid, Resonant, Specialized, and Re-engineered behavior families. |
| B | Start with Rapid, Resonant, and Specialized; defer installation behavior. |
| C | Use only flat physical-stat additions for the first version. |
| Other | Provide named families and the behavior axis each changes. |

#### Q12 — How do modifications interact with tiers and duplicates?

**Recommended: Option A** — Tier scaling applies to the base item first, then
the modification contributes separately. A duplicate tier upgrade preserves the
held item's modification; ordinary acquired duplicates are unmodified, and a
max-tier duplicate conversion does not replace it.

| Option | Description |
|--------|-------------|
| A | Preserve the held modification through tier upgrades and keep its contribution separate. |
| B | Remove the modification whenever the item gains a tier. |
| C | Let duplicate upgrades also reroll the modification. |
| Other | Provide deterministic tier/duplicate precedence and replacement rules. |

#### Q13 — Can modified items be sold or exchanged?

**Recommended: Option A** — Yes. The modification travels with that exact item
while moved or stored, but is destroyed when the item is sold or surrendered;
replacement items enter unmodified. The sale price does not increase in the
first slice, keeping modification value strategic rather than liquid currency.

| Option | Description |
|--------|-------------|
| A | Modification is instance-bound, disappears with sale/exchange, and adds no sale value. |
| B | Modification adds a fixed sale premium but still disappears with the item. |
| C | Modification transfers to the replacement item during Privateer Exchange. |
| Other | Provide transfer and valuation rules. |

### Original response template

```text
Accept all recommendations

Exceptions:
Q#: option or replacement
```

You may also answer each question individually, for example:
`Q1 A, Q2 B, Q3 Accept, ...`.

---

## Remaining questions — details

The first response resolved Q3-Q6, Q8-Q10, Q12, and Q13. Q1/Q2/Q7/Q11
materially changed or need a concrete rule. The questions below are the remaining
planning blockers.

### Q14 — Confirm the revised initial encounter catalog

**Recommended: Option A** — The requested mechanics now form seven distinct new
encounters: Exhibition Trial, Scrutineering, Factory Development, Upgrade
Workshop, Privateer Exchange, Experimental Rebuild, and Tag Specialist. This is
larger than original Q1-C, but each has a different primary verb.

| Option | Description |
|--------|-------------|
| A | Ship all seven revised encounters in Feature 034. |
| B | Defer Exhibition Trial; ship the other six. |
| C | Defer Experimental Rebuild; ship the other six. |
| Other | Provide the exact launch list. |

### Q15 — How should Exhibition Trial score and reward the player?

**Recommended: Option A** — Run an unscored solo race with three exact
precommitted objectives selected from time, item-activation, and track-demand
families. Award +1 reputation per completed objective (maximum +3), record an
Exhibition score, and award no Championship points.

| Option | Description |
|--------|-------------|
| A | Three objectives; +1 reputation each; no Championship points. |
| B | Three objectives; +1 credit each; no Championship points. |
| C | One harder objective; success grants one free tier upgrade. |
| Other | Define objective families, scoring, reward, and whether standings are affected. |

### Q16 — When and how does Tag Specialist appear?

**Recommended: Option A** — Eligible in the final four choice stages when at
least two held items share a tag. The player chooses one qualifying tag, then
sees three normally priced cross-origin items carrying it, with one same-tag
restock. The tag and normal price range are previewed before entry.

| Option | Description |
|--------|-------------|
| A | Two-item threshold, late half, player chooses tag, three stock plus one restock. |
| B | Three-item threshold, late half, generator chooses tag, three stock and no restock. |
| C | Two-item threshold at any stage after Arrival, generator chooses tag. |
| Other | Define threshold, timing, tag selection, stock size, prices, and restock. |

### Q17 — What exact permanent bonus does Scrutineering grant?

**Recommended: Option A** — Temporarily impound the selected installed item for
the next scored race. Immediately mark every other currently installed item with
`5% × surrendered tier + authored price` bonus (7–20%) to its beneficial race
contributions, capped at 25% total Scrutineering bonus per item. The impounded
item returns after the race and does not receive the bonus.

| Option | Description |
|--------|-------------|
| A | Formula above; snapshot current installed targets; per-item cumulative cap 25%. |
| B | Flat 5% per surrendered tier; targets may stack without a cap. |
| C | One target item receives a larger `10% × tier` bonus instead of buffing all others. |
| Other | Define formula, targets, affected effects, stacking cap, and return timing. |

### Q18 — How should stat-graft modifications convert between stats?

**Owner decision** — Normalize all four engine stats onto one canonical
player-facing scale. A tier-1 source contribution of N points grafts N target
points in the same window; tier scaling then applies to both. Internal physics
may use coefficients, but content and players never use a cross-stat ratio.

| Option | Description |
|--------|-------------|
| A | **Selected, revised:** canonical equal-value stat points; N source points become N target points. |
| B | Use literal 1:1 numeric conversion regardless of stat sensitivity. |
| C | Author every item/stat-graft value separately. |
| Other | Provide a conversion rule that remains stable across tiers. |

### Q19 — Confirm the non-graft Workshop Modifications

**Recommended: Option A** — `Twin-Tuned` doubles all signed base physical-stat
contributions (benefits and penalties); `Guarded` converts the first otherwise
successful overtake against the player into a defended attempt once per race;
`Adapted Mount` lets that item retain its Fitted behavior in an Improvised slot.
Each occupies the item's one modification slot.

| Option | Description |
|--------|-------------|
| A | Use Twin-Tuned, Guarded, and Adapted Mount exactly as described. |
| B | Make Guarded a defense bonus rather than a guaranteed first defense. |
| C | Defer Guarded until Feature 033 balance is observed; ship Twin-Tuned and Adapted Mount. |
| Other | Provide exact behavior and limits for each non-graft modification. |

### Q20 — How broad is the Fitted/Improvised overhaul?

**Recommended: Option A** — Audit all playable items. Every item gets a
meaningful item-authored Fitted behavior; Improvised always visibly forfeits it
and uses an authored consequence when appropriate. Target Fitted value at roughly
20–30% of the item's base race contribution and Improvised drawbacks at roughly
10–20%, then balance by corpus rather than a hidden universal scalar.

| Option | Description |
|--------|-------------|
| A | Catalog-wide authored pass with the recommended balance bands and exact UI previews. |
| B | Only modify items whose current Fitted and Improvised behaviors are both `none`. |
| C | Use one standardized category bonus/penalty for every item. |
| Other | Define coverage and target impact. |

### Q21 — What did “one pending effect per category” mean?

The question concerns unresolved future commitments, not permanent modifications.
For example: while an item is impounded for the next scored race, may another
encounter also attach a second unresolved objective or wager to that same race?

**Recommended: Option B** — Allow one pending effect per category. The existing
Sponsor contract and one Scrutineering impound may coexist because they mutate
different state and resolve independently, but a second Sponsor or second
Scrutineering encounter is excluded until its same-category predecessor resolves.
Permanent modifications, completed calibration bonuses, Exhibition Trials, and
immediate shops/exchanges do not count as pending effects.

| Option | Description |
|--------|-------------|
| A | One unresolved next-race commitment total. |
| B | One unresolved effect per category; different categories may coexist. |
| C | Any number may coexist and resolve in stable source order. |
| Other | Define coexistence, ordering, and overwrite behavior. |

### Q22 — How many free tier-upgrade offers are guaranteed?

**Recommended: Option A** — Guarantee at least two Upgrade Workshop appearances
per 40-stage championship, once during global stages 1–20 and once during global
stages 21–40 when an eligible sub-tier-3 item exists. Selection is optional;
additional random appearances are allowed.

| Option | Description |
|--------|-------------|
| A | Minimum two offers, one per half, with optional additional appearances. |
| B | Exactly two offers, one per half. |
| C | Minimum three offers distributed across early/mid/late stages. |
| Other | Define minimum offers and distribution. |

### Q23 — What does Experimental Rebuild cost and offer?

**Recommended: Option A** — Surrender one tier-1 or tier-2 held item and pay 2
credits; choose one of three items from any origin in the same installation
category, received one tier higher than the source. The replacement is
unmodified and the source modification is destroyed.

| Option | Description |
|--------|-------------|
| A | Same category, any origin, three choices, source tier +1, flat 2-credit cost. |
| B | Same category and origin, three choices, source tier +1, cost equals tier difference. |
| C | Any category/origin, one deterministic replacement at source tier +1, no credit cost. |
| Other | Define candidate pool, choice count, resulting tier, and cost. |

### Q24 — Which vendor may sell already-modified items?

**Recommended: Option A** — Tag Specialist has exactly one modified entry among
its three late-run stock slots; the modification is shown before purchase and
raises price by 2 credits. Ordinary Parts Supplier and reward encounters remain
unmodified in Feature 034.

| Option | Description |
|--------|-------------|
| A | One modified Tag Specialist stock entry, +2 credits. |
| B | Parts Supplier and Tag Specialist each have a late-run chance for modified stock. |
| C | Add a separate rare Experimental Dealer encounter. |
| Other | Define eligible vendors, frequency, and price treatment. |

## Follow-up response template

```text
Accept all follow-up recommendations

Exceptions:
Q#: option or replacement
```
