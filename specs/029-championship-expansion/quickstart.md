# Quickstart: World Championship Expansion

## Implementation sequence

1. Run the focused baseline before changes: `npm test -- --run tests/unit/run.test.ts tests/unit/contest.test.ts tests/integration/run-flow.test.ts`.
2. Add failing tests for schedule/offers, race-kind settlement, standings,
   Last Chance, and legacy guards.
3. Implement pure domain modules and content validators before scene wiring.
4. Add 49 profiles and verify every Qualifier/Challenge snapshot is legal.
5. Wire destination and shared Local/Championship race flow.
6. Add itinerary and regional visual presentation.

## Required verification

- Focused new unit/integration suites.
- Same-seed replay equality over a complete 40-stage fixture.
- Content validation for all 49 profiles and every allowed leg/tier band.
- `npm test`, `npm run lint`, and `npm run build`.
- Manual or automated browser QA at 1920×1080, 1366×768, 1024×768,
  800×450, and 390×844.
- Missing-art fallback, old-run rejection, contract skip, every standings
  tie-break level, normal finale, elite finale, and all Last Chance transitions.

## Scope guard

Do not add live networking, regional physics, bespoke portrait requirements,
new encounter mechanics, or playback-speed controls. Playback timing belongs to
feature 030 and should consume the same immutable contest evidence.
