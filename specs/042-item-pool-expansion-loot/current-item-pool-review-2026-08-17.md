# Current Item Pool Review — Three Player Perspectives

**Date**: 2026-08-17  
**Status**: Review complete; Feature 042 provisional spec/questionnaire remain
paused pending re-specification  
**Method**: Three independent read-only desk reviews from an experienced
auto-battler perspective, a player new to video games, and an experienced
card-game/deckbuilder perspective. This is not a participant playtest.

## Executive finding

The current catalog is large enough in raw count but too narrow in effective
mechanical variety.

- There are **70 global definitions**, but a normal entrant draws from only
  **25**: 10 Neutral plus 15 exclusive.
- A 25-item reachable pool is already a healthy starting size for four active
  and three storage positions.
- Most choices are variations on direct normalized stat packages. Tags,
  topology, rarity, economy, and character promises frequently lack enough
  mechanical payoff to create distinct build decisions.

The consensus is to avoid solving this with volume alone. Feature 042 should
repair correctness/presentation defects, retrofit meaningful mechanics into
selected existing items, then add a bounded payoff-focused expansion and Loot.

## Current catalog snapshot

| Measure | Current state |
|---|---:|
| Global definitions | 70 |
| Normal reachable pool per entrant | 25 |
| Power / Chassis | 36 / 34 |
| Standard / Notable / Rare | 23 / 32 / 15 |
| Price 2 / 4 / 5 | 22 / 32 / 16 |
| Direct physics items | 46 |
| Conditional-track items | 7 |
| Buff items | 13 |
| Authored Synergy sources | 8 |
| Setup-adjustable items | 7 |
| Items with explicit negative-stat tradeoffs | 5 |
| Active-while-stored items | 2 |
| Non-empty Fitted effects | 1 |
| Non-empty Improvised consequences | 0 |

No 3-credit item exists. Rarity is display-only and does not affect odds,
price, or simulation. Normal three-card offers draw independently with
replacement, so duplicate definitions may consume multiple visible choices.

### Tag density

| Tag | Count | Tag | Count |
|---|---:|---|---:|
| material | 17 | information | 11 |
| gearing | 15 | lightweight | 8 |
| momentum | 14 | suspension | 8 |
| provenance | 8 | control | 7 |
| experimental | 6 | pressure | 6 |
| wheel | 6 | heat | 5 |
| loophole | 5 | airflow | 4 |
| evasion | 4 | exposure | 4 |
| fuel | 3 | wager | 3 |
| patronage | 1 | | |

Only a subset of these tags currently has an equipment payoff. Others function
as metadata, Tag Specialist access, or narrow sponsor eligibility rather than a
recognizable build family.

## Consensus: highest-priority problems

### 1. Topology promises a game that the item pool does not yet deliver

Only Trackside Tachometer has a real Fitted benefit; no item has an Improvised
consequence. Power/Chassis/Flex and four distinct vehicle layouts therefore
look strategically important but rarely change an item's behavior.

**Recommendation**: Retrofit a bounded group of current items with clear,
authored Fitted rewards and deliberate Improvised tradeoffs. Do this before or
alongside the tutorial so the tutorial teaches a real decision system.

### 2. Many tags are enablers without payoffs

There are only eight authored Synergy source items, all of which boost
themselves. The resolver supports boosting matching other items, but the live
catalog never uses that space. Fuel, loophole, evasion, exposure, pressure,
provenance, wager, and other themes have carriers without a coherent internal
payoff.

Material and gearing have the opposite problem: they are so dense in their home
pools that matching them is often automatic rather than a commitment.

**Recommendation**: Classify every tag as one of:

- a true build-family tag with explicit enablers and payoffs;
- a utility/acquisition descriptor;
- flavor that should not be styled like a mechanical keyword.

Feature 042 should add payoffs and cross-origin bridges, not simply more tagged
bodies.

### 3. Two exclusive items are genuine dead cards

- `mercer-trade-ledger-chit`
- `voss-bookmakers-declared-margin`

They have no race, economy, Synergy, setup, storage, or other implemented
effect. The three inert-looking Neutral economy items do have external economy
rules, which makes the inconsistency even harder to understand.

**Recommendation**: Repair or explicitly retire both before expansion.

### 4. Current item presentation contains misleading information

- Compact cards can show `TAGS: none` because the rendered fallback reads state
  badges instead of `synergyTags`.
- Economy effects live outside normal item definitions, so cards can say “No
  implemented contest effect” without explaining their real economic trigger.
- Several Synergy descriptions say “held” although the resolver counts only
  installed slots.
- Buff copy does not clearly say that another eligible stat-contributing item is
  required.
- Cooldown Buff copy does not explain that value accumulates across the race.
- Exact-count cards do not sufficiently warn that adding another match turns
  the bonus off.

**Recommendation**: Treat these as Feature 042 prerequisite repairs or an
explicit companion remediation package, not as later polish.

### 5. Exact-count effects are brittle

Double-Butted Tube Frame, Interchangeable Test Mounts, and Stamped Compliance
Plate switch off when a third match is added. This can reward precision, but it
also punishes continuing along a signaled synergy line.

**Recommendation**: Preserve exact-count sparingly—most naturally as a Voss
rulebook signature. Prefer at-least thresholds, ranges, graduated tiers, or a
payoff that changes instead of disappearing for other pools.

### 6. Duplicate tiering may dominate balance

Direct physics effects gain 15% per tier. Buffs instead gain **15 percentage
points** per tier. A 3% stacking Buff therefore becomes 18% at tier 2 and 33% at
tier 3, while a direct item merely becomes 115%/130% of base.

This disproportionate scaling is likely a stronger balance issue than the
number of new items. Increasing pool size also lowers duplicate frequency and
therefore changes tier attainment.

**Recommendation**: Decide whether the percentage-point behavior is
intentional before authoring more Buffs. Seeded catalog audits must measure
duplicate visibility and tier attainment, not only tag counts.

### 7. Uniform-with-replacement offers dilute signals

Rarity does not alter appearance chance, duplicate definitions can appear in
the same three-card offer, and adding Loot directly to every pool can displace
active build pieces.

With four Loot definitions in a 25-item uniform pool, a three-card offer would
contain at least one Loot roughly 41% of the time.

**Recommendation**: Suppress duplicate definitions within one offer and give
Loot an explicit acquisition/weighting rule rather than silently adding it to
the normal uniform draw.

## What each perspective emphasized

### Experienced auto-battler player

- Positional decisions, commitment/pivot moments, and real build payoffs matter
  more than raw catalog size.
- Retrofit 8–12 existing items; then add 8 active + 4 Loot. If retrofits are
  forbidden, 12 active + 4 Loot may be needed to create enough archetypes.
- Prioritize boost-others support, thresholds, cadence coordination, stat
  conversion, deliberate downsides, occupancy, and track-demand adaptation.
- Treat Buff tier scaling and offer dilution as potential snowball/draft-health
  issues.

### Player new to video games

- A 25-item reachable pool is learnable; the overlapping terminology is not.
- Add only 4–8 active items plus 4 Loot until cards clearly communicate tags,
  targets, duration, exact-count shutoff, economy triggers, and topology.
- Prefer recognizable sets, track icons, arrows, first-event safety nets, simple
  conversion, and obvious start-strong/grow-later identities.
- If an action grants only a permanent stat bonus, call it `Use`, `Consume`,
  `Apply`, or `Trade In` rather than `Sell`, which implies credits.

### Experienced card-game/deckbuilder player

- The expansion should be payoff-heavy: current pools already contain many
  enablers.
- Recommend 8 active + 4 Loot, ideally two active payoff/bridge cards and one
  Loot per origin, raising each normal entrant pool from 25 to 28.
- Protect draft signals, tier-up rates, and the difference between parasitic and
  shared tags.
- Explicitly resolve Loot duplicate tiering, modifications, sponsor/tag access,
  Scrutineering, transformations, and other systems that could make inert Loot
  unexpectedly active.

## Promising mechanic families

Prioritized across reviews:

1. **Meaningful Fitted/Improvised behavior** — reward or trade off real slot
   decisions and make Adapted Mount useful.
2. **Boost-others support pieces** — make target selection and composition
   meaningful instead of adding more self-scaling cards.
3. **Threshold/set progress** — visible `1/3`, `2/3`, complete, or graduated
   benefits rather than widespread exact-count shutoff.
4. **Cadence sequencing** — reward alternating triggers, previous-lap events,
   trigger counts, or a late-race cashout.
5. **Stat conversion and drawback payoffs** — exchange stats deliberately or
   reward a negative authored contribution.
6. **Track-demand adaptation** — use the same stat/condition language as shops,
   regional demand, and pre-race track fit.
7. **Economy/build interaction** — upgraded, modified, valuable, sold, or
   refurbished items become build inputs with bounded returns.
8. **Capacity/occupancy rules** — empty slot, full vehicle, stored support, or
   intentionally Improvised conditions.
9. **Adjacency follow-ons** — mechanical chains and local support after Feature
   041 proves the core resolver.
10. **Deterministic safety** — prevent or soften the first incident/failed
   opportunity using retained evidence.

## Mechanical and thematic synergy lines

### Mercer — craftsmanship, provenance, and restoration

- **Matched running gear**: Wheel + Suspension pieces form visible sets or
  adjacency pairs.
- **Proven workmanship**: tiered, modified, or high-value components activate
  Provenance payoffs.
- **Heavy construction**: Material improves braking/cornering with visible
  acceleration or top-speed tradeoffs.
- **Refurbishment**: sale/history/upgrade actions improve or realize value.

Material should stop being the automatic tag on nearly everything.

### Soto — cadence chain and sprint timing

- **Drivetrain sequence**: crankset → chain → sprocket → wheel adjacency or
  ordered support.
- **Momentum**: value grows through laps/triggers, then cashes out in a final
  sprint.
- **Lightweight**: low cost, empty capacity, or explicit stability tradeoff.
- **Gearing**: a visible acceleration-versus-top-speed choice.

Avoid more generic gearing/momentum bodies.

### Rook — controlled-limit engineering

- **Pressure + Heat**: power with a controlled braking/stability drawback.
- **Information**: reveal, stabilize, or improve conditional Experimental
  systems.
- **Airflow**: top-speed/straight performance.
- **Cross-discipline prototypes**: reward distinct technical tags or Power +
  Chassis combinations rather than copies of one tag.

### Voss — loophole, exposure, and evasion

- **Loophole**: benefit from unusual slot/category arrangements or one visible
  rule exception.
- **Exposure**: strong payoff with an explicit downside.
- **Evasion/Control**: protect or stabilize the exposed build.
- **Fuel**: early burst versus late reserve.
- **Wager**: bounded, deterministic economy risk/reward.

Exact-count constraints fit Voss better than the other pools, provided previews
make the shutoff unmistakable.

### Cross-origin bridges

- Airflow + Lightweight → speed
- Pressure + Fuel → burst acceleration
- Wheel + Control → cornering/braking
- Material + Suspension → stable handling
- Information + conditional equipment → track exploitation
- Provenance + Wager → sale/economy strategy

## Loot findings that should change clarification

Loot remains promising because it creates capacity pressure, delayed scaling,
and topology rearrangement. The prior questionnaire is incomplete in these
areas:

1. **Acquisition lane/weighting**: shared Neutral, exclusive per origin,
   dedicated event/stock, or capped normal-offer appearance.
2. **Duplicate behavior**: normal duplicate tiering would merge identical Loot.
   Tier-neutral settlement could consume a duplicate for no benefit. Options
   include separate consumable instances, duplicate rejection, or tier-as-
   magnitude/charges.
3. **Action language**: `Sell` implies credits. Bonus-only conversion may need
   `Apply`, `Consume`, or `Trade In`.
4. **Inertness exclusions**: Workshop Modification, Scrutineering, Sponsor,
   Tag Specialist, adjacency, transformation, Rebuild, and economy sale triggers
   must not accidentally turn Loot into active value.
5. **Offer pressure**: four uniform Loot definitions are too intrusive without
   weighting/capping.

Areas of agreement from the experienced perspectives:

- four Loot definitions, one per normalized stat;
- permanent bonus as the primary conversion value;
- exact automatic leftmost preview;
- installed slots followed by storage as target order;
- existing stat contributors as candidates;
- a modest per-target/stat cap;
- full atomic Undo.

## Recommended Feature 042 shape for re-specification

Use this as a starting proposal, not an owner decision:

### Required remediation before expansion approval

- Repair/retire the two dead exclusive items.
- Fix tag/economy/target/cooldown/exact-count card communication.
- Correct “held” versus installed-only Synergy copy.
- Decide Buff tier percentage-point scaling.
- Suppress duplicate definitions within one visible offer.
- Classify the 19 tags by mechanical role.

### Existing-item synergy pass

- Retrofit approximately **8–12 current items**.
- Ensure meaningful Fitted/Improvised behavior exists across all origins.
- Add payoff/bridge roles rather than more universal enablers.
- Reconsider exact-two conditions outside the Voss identity.

### New content

- Default proposal: **8 active items + 4 Loot**.
- Two active payoff/bridge items per origin.
- Four Loot items, one per normalized stat, with an explicit acquisition rule.
- If the owner prefers a smaller cognitive footprint, start with 4 active + 4
  Loot and require the retrofits to carry more of the mechanical expansion.
- Do not use 12 active + 4 Loot unless existing-item retrofits are intentionally
  minimized.

## Decisions for the new clarification pass

The revised questionnaire should ask, in order:

1. Is repair/retrofit of existing items part of Feature 042, and how many?
2. How many new active items follow those retrofits?
3. Which tags are promoted to true build families, utility descriptors, or
   flavor?
4. Should exact-count be Voss-specific, generally retained, or converted?
5. Is Buff tier percentage-point scaling intentional?
6. How are duplicate definitions suppressed/weighted in normal offers?
7. Where/how is Loot acquired, and is it shared or origin-specific?
8. How do Loot duplicates/tier/magnitude work?
9. What is the player-facing conversion verb and credit settlement?
10. What capacity, target, cap, Undo, and lifecycle rules complete Loot?

The previous six-question questionnaire was superseded on 2026-08-17 by the
replacement ten-question clarification pass derived from these findings.
