# Feature 032 balance evidence

Run date: 2026-08-15
Harness: `tests/fixtures/balance-fixtures.ts`
Seeds: `7, 19, 31, 43, 59`
Baseline vehicle control: `spec-car-baseline` (`baseLapTime: 6`)

## Baseline and post-audit result

The fixed representative policy uses the first four authored exclusive items
priced at 4 credits or less. The optimized policy deterministically sorts each
catalog by authored effect magnitude (stable item-id tiebreak) and takes four
legal slots. The same two policies were rerun after the catalog audit; no
Mercer, Soto, or Rook value/synergy change was required, and Nell plus the
baseline vehicle remained untouched.

| Entrant | Representative | Rate | Optimized ceiling | Baseline |
|---|---:|---:|---:|---|
| Evelyn Mercer | 5 / 5 | 100% | 48s | `spec-car-baseline` |
| Lucien Soto | 5 / 5 | 100% | 48s | `spec-car-baseline` |
| Inez Rook | 5 / 5 | 100% | 48s | `spec-car-baseline` |
| Nell Voss | 5 / 5 | 100% | 48s | `spec-car-baseline` |

Gate results: representative spread `0 percentage points` (≤5); optimized
ceiling spread `0%` (≤2%). The harness output is byte-identical across two
consecutive calls in `tests/unit/balance.test.ts`.

Verification command:

```text
npm test -- --run tests/unit/balance.test.ts
```

This is deterministic simulation evidence only; no manual in-game balance
judgment is claimed here.
