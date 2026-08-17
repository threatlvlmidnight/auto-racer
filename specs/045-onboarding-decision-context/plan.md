# Implementation Plan: Onboarding and Decision Context

**Branch**: `045-onboarding-decision-context` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

## Summary

Add a versioned ten-page static How to Play deck with first-run Skip and replay
through Title/Settings; add large authoritative Improvised badges without a new
confirmation; produce measured four-stat regional demand profiles and a code-
drawn radar-style chart on every item-acquisition surface; add non-mutating
contextual Help; and hide all ordinary Test Day entry points behind one
presentation visibility policy while retaining the complete implementation.
The desired authored tutorial run is deferred intact. No generated art is
required; an optional frontier-owned decorative demand plate has a complete
code-native fallback.

## Technical Context

**Language/Version**: TypeScript 5.5, ES modules  
**Primary Dependencies**: Phaser 3.80, Vite 5.4, existing framework-free
simulation and pure presentation modules; no new runtime dependency  
**Storage**: One injected browser-local tutorial preference adapter; no run or
database persistence changes  
**Testing**: Vitest, deterministic regional circuit corpus, source/control
enumeration, pure geometry/layout tests, and existing Test Day suites  
**Target Platform**: Browser game and GitHub Pages production build  
**Performance Goals**: No runtime track/corpus simulation in shops; chart/model
projection `O(4)`; no per-frame resolver; deck page transition remains input-
responsive and contextual overlay does not restart its host  
**Constraints**: No run mutation from deck/help; no offer RNG consumption; no
track generation for presentation; no mechanics inferred from tutorial prose;
Test Day code/tests retained; Features 041/042 land first; optional asset cannot
block correctness; no screenshots/manual visual judgment assigned to DeepSeek  
**Scale/Scope**: Ten slides, one preference adapter, one minimal Settings/Help
entry, one compact Improvised badge extension, seven checked-in region profiles,
one reusable chart model/renderer, all typed acquisition hosts, centralized Test
Day visibility, automated gates, optional decorative asset hook

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **I. Prepare → Contest Integrity**: PASS. Tutorial/help are non-scoring and
  acquisition context is read-only. Race playback and outcomes are untouched.
- **II. Fairness**: PASS. All guidance is equally available and no purchase or
  entitlement affects mechanics.
- **III. Transparency & Legibility**: PASS and primary purpose. Placement state,
  regional evidence scope, values, and fallbacks become more inspectable without
  false outcome claims.
- **IV. Spectation-First**: PASS. The deck teaches automatic racing/Results and
  retained installation evidence remains available; contest presentation is not
  altered.
- **V. Build Testing Access**: TEMPORARY DEVIATION. The owner explicitly directed
  Feature 045 to hide every normal Test Day entry while retaining its code. A
  capability players cannot reach does not currently satisfy Principle V, even
  though the implementation is preserved. The centralized visibility seam makes
  this reversible; the product must restore/replace player-facing low-stakes
  build testing or amend the constitution before claiming full constitutional
  release compliance. The static deck is not treated as a substitute.
- **VI. Async-First Architecture**: PASS. No service/live opponent is added;
  deck/preferences/profiles are deterministic and local.
- **Mechanical parity/topology**: PASS. Tutorial and badges project the existing
  truth table; no slot, stat, item, or entrant authority changes.
- **2D constraint**: PASS. Deck and chart are code-native 2D presentation. The
  optional decorative plate is a separate frontier asset with fallback.

**Post-design result**: Implementation planning may proceed under the explicit
owner-directed temporary deviation above. All other gates pass. This plan must
not record Principle V as satisfied while Test Day remains unreachable.

## Project Structure

```text
specs/045-onboarding-decision-context/
├── analysis.md
├── clarification-questionnaire.md
├── data-model.md
├── future-scripted-tutorial.md
├── intake.md
├── optional-demand-plate.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
├── tasks.md
├── tutorial-content.md
├── checklists/requirements.md
└── contracts/onboarding-context-contract.md

src/
├── content/
│   ├── howToPlay.ts                 # locked ten-slide definitions
│   └── regionalDemandProfiles.ts    # seven measured checked-in vectors
├── simulation/
│   ├── regionalDemand.ts            # corpus/sensitivity/validation authority
│   └── types.ts                     # demand/snapshot types only
└── scenes/
    ├── playerFeatureVisibility.ts   # Test Day UI false
    ├── tutorialPreference.ts        # injected storage adapter
    ├── howToPlayPresentation.ts     # pure deck/visual models
    ├── HowToPlayScene.ts            # static deck
    ├── settingsPresentation.ts
    ├── SettingsScene.ts             # Replay How to Play entry
    ├── helpPresentation.ts           # pure contextual overlay
    ├── installationPresentation.ts  # shared badge projection
    ├── regionalDemandPresentation.ts# chart geometry/model
    ├── regionalDemandVisuals.ts     # Phaser axes/polygon/fallback renderer
    └── existing host scenes

scripts/
└── audit-regional-demand.mjs        # deterministic report/regeneration check

tests/
├── fixtures/onboarding-context-fixtures.ts
├── unit/
│   ├── tutorialPreference.test.ts
│   ├── howToPlayPresentation.test.ts
│   ├── installationPresentation.test.ts
│   ├── regionalDemand.test.ts
│   ├── regionalDemandPresentation.test.ts
│   └── playerFeatureVisibility.test.ts
└── integration/
    ├── how-to-play-flow.test.ts
    ├── contextual-help-flow.test.ts
    ├── acquisition-demand-flow.test.ts
    ├── improvised-visibility-flow.test.ts
    └── test-day-visibility.test.ts
```

## Implementation sequence

1. Establish fixtures, types, feature visibility, and failing no-Test-Day-UI
   tests while preserving all current internal practice suites.
2. Implement deterministic regional sensitivity corpus/audit, validate seven
   checked-in profiles, and prohibit runtime shop simulation.
3. Build pure demand chart geometry, code-native renderer, optional plate hook,
   and acquisition-host integration with no-side-effect proofs.
4. Add the large Improvised badge projection and integrate every required
   preview/retained surface without changing installation resolution.
5. Implement tutorial preference adapter, authoritative ten-slide projections,
   isolated deck, Title/Settings replay, and contextual overlay restoration.
6. Run compatibility against landed Feature 041/042 and all automated gates.
7. Stop before optional asset creation or qualitative browser verification.

## Complexity tracking

| Added surface | Why justified | Simpler alternative rejected |
|---|---|---|
| Minimal Settings scene/overlay | Owner requires replay in Settings and no current settings host exists | Title-only replay violates the clarified requirement |
| Offline regional corpus | Four-stat demand must be factual and reproducible | Hand-authored flavor numbers or runtime shop simulation are misleading/risky |
| Central Test Day visibility policy | Reversible UI suppression without deleting a constitutional system | Scattered button deletion creates hidden shortcuts and difficult restoration |
| Temporary Principle V deviation | Owner explicitly wants Test Day hidden while its role is reconsidered; code/tests remain and one flag restores exposure | Leaving unwanted player UI visible conflicts with the clarified product direction |
