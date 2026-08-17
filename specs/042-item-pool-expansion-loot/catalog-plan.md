# Feature 042 Catalog Plan

**Status**: Locked for implementation planning  
**Baseline**: 70 definitions (10 shared neutral + 15 per entrant)  
**Expansion**: 8 active definitions + 4 Loot definitions  
**Retrofit floor**: 12 existing definitions; additional copy/tag-only repairs remain
permitted when the catalog audit proves a concrete mismatch.

This ledger freezes the intended mechanical roster before Feature 037 creates
production item art. Names and stable IDs below are implementation inputs, not
requests for image generation.

## Tag taxonomy

Existing tag IDs remain stable. The catalog audit classifies them as follows:

| Role | Tags | Promise |
|---|---|---|
| Build family | `provenance`, `gearing`, `momentum`, `airflow`, `experimental`, `loophole`, `exposure`, `evasion` | At least one readable payoff and enough reachable support to pursue a build |
| Bridge / utility | `material`, `wheel`, `suspension`, `lightweight`, `pressure`, `heat`, `information`, `control`, `fuel`, `wager` | Connects families or supports a mechanic; no promise of a dedicated payoff for every tag |
| Flavor / acquisition | `patronage` | May drive authored event access or theme, but is not presented as a standalone build |

The three intended directions per origin are:

- Mercer: provenance/restoration; matched running gear; durable material.
- Soto: momentum/cadence; gearing tradeoffs; lightweight sprinting.
- Rook: experimental disciplines; airflow; pressure/heat/control.
- Voss: loophole exact rules; exposure risk; evasion/fuel/wager support.

## Existing-item retrofit ledger

The implementation audit may add truthful-copy or tag-role repairs beyond this
list. It may not silently rebalance unrelated definitions.

| Existing item | Required change | Gap filled |
|---|---|---|
| Mercer Trade Ledger Chit | Replace its dead offer with typed `item-sale` economy behavior: a tier-scaled bonus when the sold item has `provenance`; show the exact condition and value. | Real restoration economy payoff; removes dead card |
| Mercer Journeyman's Logbook | Raise the tier-1 cooldown-stack base from 3% to 6%; use multiplicative tier scaling. | Perceptible long-race chase reward |
| Mercer Brass-Fitted Wrench Set | Raise the tier-1 cooldown-stack base from 2% to 5%; use multiplicative tier scaling. | Perceptible sequencing reward |
| Mercer Ironbound Axle | Fitted: +2 Braking points. Improvised: -2 Acceleration points. | Mercer installation decision |
| Soto Racing Crankset | Raise cooldown-stack base from 3% to 6%, use multiplicative tier scaling. Fitted: +2 Acceleration points. Improvised: -2 Cornering points. | Cadence chase and installation decision |
| Soto Oversized Sprocket | Raise cooldown-stack base from 2% to 5%; use multiplicative tier scaling. | Gearing sequence payoff |
| Soto Double-Butted Tube Frame | Convert exact two to at least two other `lightweight` items; retain +35% self Cornering effect and show live count. | Removes punitive non-Voss shutoff |
| Rook Interchangeable Test Mounts | Convert exact two to at least two other Power items; retain +50% self Cornering effect and show live count. | Removes punitive non-Voss shutoff |
| Rook Rotary Aero Engine | Fitted: +2 Top Speed points. Improvised: -2 Braking points, additional to its authored tradeoff. | Rook installation decision |
| Voss Bookmaker's Declared Margin | Reclassify Notable/3 credits. Base +6 Acceleration points; exactly one other installed `wager` item grants +100% to this Acceleration effect, with live count/shutoff copy. | Removes dead card; reinforces Voss signature |
| Voss Auxiliary Starting Tank | Raise cooldown-stack base from 3% to 6%; use multiplicative tier scaling. | Perceptible fuel sequencing reward |
| Voss Removable Inspection Ballast | Fitted: +2 Cornering points. Improvised: +2 Acceleration and -2 Cornering points, clearly presented as a role-changing tradeoff. | Voss installation decision |

All final numeric values must pass the deterministic 8/10/12/14/16-lap balance
matrix. Values above are the authored tier-1 starting point, not permission to
restore additive percentage-point tier jumps.

## Eight new active items

Two active items are added to each entrant-exclusive pool. Exact normalized
points and percentages are balance-ledger data and must remain within the
existing stat-normalization bands.

| Stable ID | Name | Origin pool | Category | Rarity | Price | Tags | Exact tier-1 mechanic |
|---|---|---|---|---|---:|---|---|
| `mercer-masters-service-record` | Master's Service Record | Mercer | Chassis | Rare | 5 | provenance, material | +10 Braking points. At least two other installed `provenance` items grant +30% to its Braking effect. Fitted +2 Braking; Improvised -2 Top Speed. |
| `mercer-refurbishers-tool-roll` | Refurbisher's Tool Roll | Mercer | Power | Notable | 4 | provenance, wheel | +6 Acceleration points. While held, selling a tier-2/3 or modified non-Loot item grants +1 credit at tier 1 (+2/+3 by tier), once per sale. Fitted +2 Acceleration; Improvised -2 Braking. |
| `soto-pacers-lap-bell` | Pacer's Lap Bell | Soto | Chassis | Notable | 4 | momentum, information | +8 Cornering points. With at least two other installed `momentum` items, grant those matching others +15% to their Acceleration effects. Fitted +2 Cornering; Improvised -2 Acceleration. |
| `soto-final-sprint-tonic` | Final Sprint Tonic | Soto | Power | Rare | 5 | momentum, lightweight | During the final quarter of laps, +18 Acceleration and +18 Top Speed points. Fitted +2 Acceleration; Improvised -2 Braking. |
| `rook-thermal-relief-valve` | Thermal Relief Valve | Rook | Power | Notable | 4 | pressure, heat, control | Always +12 Acceleration, +6 Top Speed, -6 Braking points. Fitted recovers +3 Braking; Improvised adds -3 Braking. |
| `rook-wind-tunnel-notebook` | Wind-Tunnel Notebook | Rook | Chassis | Rare | 5 | experimental, airflow, information | +10 Top Speed points. If installed items collectively represent at least three distinct build-family tags among `airflow`, `experimental`, `pressure`, `heat`, and `control`, grant +40% to its Top Speed effect. Fitted +2 Top Speed; Improvised -2 Cornering. |
| `voss-forged-inspection-seal` | Forged Inspection Seal | Voss | Chassis | Rare | 5 | loophole, exposure | +10 Top Speed points. Exactly one other installed `exposure` item grants +50% to its Top Speed effect; zero or two-plus switches it off. Fitted +2 Top Speed; Improvised -2 Braking. |
| `voss-concealed-reserve-tank` | Concealed Reserve Tank | Voss | Power | Notable | 4 | fuel, evasion | During the first quarter of laps, +18 Acceleration and +12 Top Speed points; always -6 Braking points. Fitted recovers +3 Braking; Improvised adds -3 Braking. |

The new capability surface is limited to reusable authored primitives:

1. at-least-other-count synergy;
2. distinct-authored-tag-count synergy over an explicit allowed tag set;
3. early/late lap-window canonical effects;
4. typed economy effects and conditions; and
5. normalized canonical Fitted/Improvised behavior.

No item may introduce a one-off name-based branch. Values above are locked
authoring inputs. The coding agent may change one only when a named automated
balance threshold fails, and must record the before/after value plus report
evidence in this ledger rather than silently tuning it.

## Stable art-handoff descriptors

These labels are metadata for later Feature 037 production and do not authorize
the coding agent to make art.

| Stable ID | Later visual descriptor |
|---|---|
| `mercer-masters-service-record` | leather-bound, oil-marked service ledger with brass corners and stamped maintenance seals |
| `mercer-refurbishers-tool-roll` | rolled canvas coachbuilder tool kit, worn handles, carefully repaired straps |
| `soto-pacers-lap-bell` | compact brass velodrome bell with numbered lap placard and bicycle clamp |
| `soto-final-sprint-tonic` | corked amber stimulant bottle in a lightweight wire carrier, racing ribbon tied at neck |
| `rook-thermal-relief-valve` | experimental finned pressure valve, copper coils, red heat-scale markings |
| `rook-wind-tunnel-notebook` | clipped field notebook filled with airflow sketches, wool tufts, and instrument graphs |
| `voss-forged-inspection-seal` | counterfeit embossed inspection seal, wire tag, scraped serial marks |
| `voss-concealed-reserve-tank` | slim hidden fuel cylinder wrapped in dark leather with disguised fittings |
| `loot-starting-ether` | small labeled ether flask in a padded starting kit |
| `loot-racing-engine-oil` | squat period oil tin with long pour spout and racing workshop label |
| `loot-copper-woven-brake-lining` | coiled copper-woven brake lining tied with inventory twine |
| `loot-castor-steering-grease` | sealed grease pot with castor-leaf mark and wooden applicator |

## Four Loot items

Loot is shared neutral content but is stored separately from `NEUTRAL_ITEMS` so
it cannot leak into entrant-origin shops or drafts.

| Stable ID | Name | Category | Rarity | Price | Sold bonus |
|---|---|---|---|---:|---|
| `loot-starting-ether` | Starting Ether | Power | Standard | 3 | Acceleration +1/+2/+3 by tier |
| `loot-racing-engine-oil` | Racing Engine Oil | Power | Standard | 3 | Top Speed +1/+2/+3 by tier |
| `loot-copper-woven-brake-lining` | Copper-Woven Brake Lining | Chassis | Standard | 3 | Braking +1/+2/+3 by tier |
| `loot-castor-steering-grease` | Castor Steering Grease | Chassis | Standard | 3 | Cornering +1/+2/+3 by tier |

Loot has no synergy tags, active physics, Buff, Synergy, economy trigger,
installation behavior, adjacency clause, modification eligibility, or sponsor /
Tag Specialist eligibility. Its category still determines legal normal-capacity
placement; any displayed installation state has no authored Loot behavior.

## Offer and rarity rules

- Definition-level rarity weights are Standard `4`, Notable `2`, Rare `1`.
- Each multi-card offer samples without replacement from the eligible pool.
- Entrant-origin shops and drafts use the existing shared-neutral plus entrant
  exclusive pool and explicitly exclude `LOOT_ITEMS`.
- An explicitly neutral acquisition source offers three distinct neutral
  definitions. It has a 35% seeded chance to replace one ordinary slot with one
  uniformly selected Loot definition, so every offer has zero or one Loot. It
  must declare Loot eligibility in data, not infer it from event name.
- Feature 042 adds one neutral supplier/cache encounter so the Loot route is
  playable and testable. Its ordinary stock comes only from the shared neutral
  pool; Loot occupies zero or one separately weighted lane.
- Rarity does not guarantee higher raw power. Standard means accessible/simple,
  Notable means conditional/bridge, and Rare means build-around/complex.

## Loot target cap interpretation

An applicable target must be able to accept the entire tier magnitude without
exceeding +3 for that target instance/stat. The resolver skips a partially full
candidate that cannot fit the complete bonus and continues left-to-right. If no
full-fit target exists, sale is blocked with a typed cap reason. This avoids
silently wasting part of a tiered Loot reward.
