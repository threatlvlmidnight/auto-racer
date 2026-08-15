# Feature 029 acceptance evidence

Recorded 2026-08-13 on `codex/029-championship-expansion`.

## Automated gates

- `npm test`: PASS — 52 files, 1,070 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS. Vite reports only the already-known large-chunk advisory.
- Deterministic full route: PASS — the integration fixture completes all 40 stages twice and compares the resulting runs deeply.
- Regional isolation: PASS — `regionTheme` is retained as evidence and cannot change track geometry.
- Local content: PASS — 49 profiles validate; Qualifier and Challenge fields are deterministic, legal, tier capped, and use canonical builds/setups.
- Sponsor targeting: PASS — Championship-specific contracts skip intervening Local Races.
- Standings/finale: PASS at the pure-domain boundary, including tie-breaks, raw-points qualification, exact-track record validation, deduplication, and deterministic fallbacks.
- Last Chance: PASS for state transitions plus integrated first-zero, recovery, and later-zero failure.

## Browser review

The title, entrant selection, destination cards, and active-leg itinerary were inspected in the running Phaser build. The 800×450 logical viewport is legible and interactive. The fixed-landscape canvas letterboxes at 390×844; portrait does not reflow. An overlapping redundant “stages remaining” label discovered during this pass was removed.

The seven vehicle-free regional backgrounds preload behind stable keys with a neutral fallback. Player copy on the inspected flow uses “Local Race” and “Championship Race.”

## Constitution re-check

| Principle | Result | Delivered evidence |
|---|---|---|
| Prepare → Contest Integrity | PASS | Every field locks canonical build/setup evidence before the shared contest resolver. |
| Fairness | PASS | Region is presentation-only; Local difficulty comes from legal builds and setups. |
| Transparency & Legibility | PASS | Race kind, region, track, setup, standings policy, finale provenance, and Last Chance are explicit. |
| Spectation-First | PASS | Both race kinds use immutable shared playback evidence; timing controls remain feature 030. |
| Build Testing Access | PASS | Test Day remains available without mutating scored evidence. |
| Async-First Architecture | PASS | Rivals, Local fields, records, and fallbacks are deterministic snapshots. |
| Product constraints | PASS | Phaser 2D, legal eight-car topology, and the 1901 world-tour theme are preserved. |

## Scope guard

No networking, regional physics, hidden Local pace modifier, new encounter mechanic, or playback-speed control was introduced.
