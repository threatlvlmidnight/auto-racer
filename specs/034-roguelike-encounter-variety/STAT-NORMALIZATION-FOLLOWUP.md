# Canonical Stat Normalization Completion Contract

**Review date:** 2026-08-16  
**Status:** Complete 2026-08-16  
**Goal:** Make one displayed point of Top Speed approximately as valuable as one
displayed point of Acceleration, Braking, or Cornering.

The current implementation does not meet that goal. `canonicalPoints()` copies
raw authored numbers, `canonicalToPhysical()` is an identity adapter, lap
simulation still adds raw stat deltas, and the balance gate compares hard-coded
reference constants rather than measuring the production simulation. The UI
therefore still exposes incomparable values such as `Braking +26 speed/s` and
`Cornering +1 speed`.

## Required implementation

### T012 — Tests first

- Add tests that demonstrate non-identity conversion for all four stats.
- Prove a canonical point round-trips through the physical adapter within an
  explicit tolerance.
- Prove stock car, item, setup, and modification contributions cross the same
  conversion boundary exactly once.
- Include a regression that fails against the current identity implementation.

### T013 — Real calibration and adapters

- Define canonical-point-to-physical coefficients for acceleration, top speed,
  braking, and cornering from measured production simulation behavior.
- Make canonical-to-physical and physical-to-canonical conversion explicit and
  typed. Do not relabel raw physical units as points.
- Document the reference car, tracks, race conditions, measurement method, and
  tolerance so calibration is reproducible.

### T014 — Production simulation boundary

- Route stock-car bases, item contributions, setup contributions, and item
  modifications through canonical points and convert to physical values at the
  lap-simulation boundary.
- Remove direct raw-delta summation from `resolvePhysicalStats()` in
  `src/simulation/laps.ts`.
- Search for and eliminate bypass paths that apply authored deltas directly.
- Preserve deterministic replay and existing authority boundaries.

### T015 — Player-facing display

- Present comparable canonical point values in vehicle, item, setup, and result
  inspection UI. If physical units are also useful, label them separately.
- Update `vehicleStatPresentation`, `raceSetupPresentation`,
  `resultFormatting`, and shared item-card formatting so displayed numbers all
  use the same scale.
- Confirm representative cards no longer advertise incomparable raw magnitudes
  as though they were equivalent bonuses.

### T016 — Measured acceptance gate

- For each stat, run the real production lap simulation with a baseline build
  and with exactly +1 canonical point over a deterministic balanced reference
  corpus.
- Calculate marginal lap-time benefit from those actual results.
- Fail when any stat's measured marginal differs by more than 10% from the
  corpus mean (or the exact spec-approved comparison rule).
- The expected result must not be imported from the same constants under test.
  A constant-equals-fixture assertion is not an acceptance gate.

## Required evidence and done criteria

- Record the calibration corpus and measured four-stat marginals.
- Add integration coverage proving production `laps.ts` consumes the adapter.
- Run `npm test`, `npm run lint`, and `npm run build` successfully.
- Browser-check representative garage, offer, pre-race, and result stat labels.
- Re-check T012–T016 only after the implementation, production integration,
  measured gate, and display conversion all exist.
- Report any intentional economy/content rebalance separately; normalization
  must not silently change prices, rarity, acquisition odds, or tier rules.

## Completion evidence

The production adapter now uses physical units per canonical point of **1.01
Acceleration, 0.13 Top Speed, 2.16 Braking, and 0.25 Cornering**. The values
were measured using `STOCK_PHYSICAL_STATS` (40/90/60/50), no items or setup,
one additional canonical point at a time, and the eight deterministic generated
tracks seeded `7, 19, 31, 43, 59, 71, 83, 97` at ordinal 1.

Mean seconds saved per canonical point across that corpus were Acceleration
0.035607, Top Speed 0.035314, Braking 0.033486, and Cornering 0.034835. The
largest deviation from the corpus mean is below the 10% SC-013 gate. The gate
in `tests/unit/balance.test.ts` now runs `simulateLapPhysics` directly; it does
not import expected values from the calibration adapter.

- T012: non-identity conversion, round-trip tolerance, and item/setup boundary
  integration coverage added in `tests/unit/statNormalization.test.ts`.
- T013/T014: stock, item, conditional, and setup contributions pass through the
  canonical adapter before the physics solver; values are rounded at the adapter
  boundary to preserve deterministic legacy replay values.
- T015: item cards, vehicle panels, setup previews, live race changes, and
  result setup text display comparable `pt` values rather than raw units.
- T016: measured production-simulation acceptance gate added.
- Validation: `npm test`, `npm run lint`, and `npm run build` pass. No economy,
  rarity, price, tier, or acquisition-odds rebalance was made.
