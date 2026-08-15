# Quickstart: Race Enrichment Validation

## Prerequisites

- Node.js 20
- Dependencies installed
- Feature 032 complete; begin by reconciling its final touched surfaces (T006)

## Automated gates

```bash
npm test
npm run lint
npm run build
```

Run focused suites during implementation:

```bash
npx vitest run tests/unit/raceEnrichment.test.ts
npx vitest run tests/integration/enriched-contest.test.ts
npx vitest run tests/integration/enriched-playback.test.ts
npx vitest run tests/unit/audioPresentation.test.ts
npx vitest run tests/integration/audio-lifecycle.test.ts
npx vitest run tests/regression/race-enrichment-corpus.test.ts
npx vitest run tests/unit/tracks.test.ts
npx vitest run tests/regression/track-generation-corpus.test.ts
```

## Required deterministic scenarios

1. Verify exact phase coverage for 8, 10, 12, 14, and 16 laps.
2. Resolve identical inputs twice and compare complete enriched results/events.
3. Reach each signature threshold with native, foreign, and mixed items; confirm
   equal eligibility and different below-threshold behavior.
4. Produce eligible/no-context, context/no-Composure, and successful activation
   cases for all four entrants.
5. Produce attack won, defense won, attempted-no-pass, and completed-pass cases.
6. Resolve the same fixtures with incidents enabled and disabled; confirm only
   incident evidence/loss differs and no persistent state mutates.
7. Advance one retained race at both speeds, across delayed frames, with Skip,
   and under reduced motion; confirm identical events and settlement.
8. Run the representative corpus and record post-Opening event frequency,
   emphasis frequency, winner-change band, and stronger-build prediction.
9. Exercise engine start/pause/rate/Skip/finish/shutdown and shared UI cues with
   a mocked adapter; compare authoritative results with audio enabled/disabled.
10. Generate the track seed/ordinal/region corpus; verify closure, bounds,
    separation, non-intersection, deterministic feature classification, layout
    diversity, positive braking demand, and braking-zone/physics reconciliation.

## Browser acceptance

At 800×450 and representative larger landscape viewports:

- Pre-race shows phases, passive/signature, stat progress, Composure, and risk.
- A race at new `1x` targets the former default duration; new `2x` is half.
- Consequential player events use bounded text/animation; routine events remain
  compact and readable.
- Skip reaches Results once and preserves decisive summaries.
- Reduced motion replaces movement/flashes with equivalent static feedback.
- Results can inspect event inputs, costs, effects/loss, and before/after state.
- Test Day exposes the same rules without scored-run mutation.
- Scored and Test Day races play one engine loop after browser unlock; pause,
  Skip, finish, and scene exit leave no residual/stacked loop.
- Shared controls produce one restrained activation/selection cue, and the mute
  control silences both UI and engine audio without changing navigation.
- Missing or browser-blocked audio degrades silently; background music is absent.
- Track samples visibly include hairpins, chicanes, sweepers, and switchbacks;
  they are not regular polygon variants and every displayed braking demand is
  legible, positive, and supported by the shown circuit geometry.

## Acceptance evidence

Record commands, corpus configuration/version, metrics, screenshots, failures,
and any tuned-default changes in this file or a dedicated acceptance-evidence
artifact during implementation. Do not mark completion from unit tests alone.
