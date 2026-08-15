# Implementation Plan: Race Enrichment

**Branch**: `033-race-enrichment` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-race-enrichment/spec.md`

## Summary

Extend authoritative N-car resolution with a pure enrichment layer that consumes
committed builds, resolved setup stats, the retained track, entrant identity, and
isolated deterministic seed streams. It assigns shared phases, evaluates passive
tendencies, stat-gated signatures, Composure-backed attack/defense windows, and
toggleable bounded incidents, then emits enriched lap timing plus immutable event
evidence. Playback and Results only project that evidence. Pre-race and Test Day
expose eligibility, resource, and risk before commitment. A presentation-only
audio adapter adds lifecycle-bound engine loops and shared UI cues without
entering simulation or playback authority. The feature also replaces the current
one-direction polygon generator with deterministic circuit grammar, retained
hairpin/switchback/braking-zone evidence, and truthful braking demand.

## Technical Context

**Language/Version**: TypeScript 5.5 on Node.js 20 for tooling

**Primary Dependencies**: Phaser 3.80, Vite 5.4

**Storage**: Existing in-memory Run/result/ghost evidence; no server or database

**Testing**: Vitest 2 unit/integration suites, deterministic corpus scripts,
ESLint, TypeScript no-emit, production build, browser viewport QA

**Target Platform**: Modern desktop web browsers; 800×450 logical Phaser canvas

**Project Type**: Static browser game

**Performance Goals**: Baseline the current eight-car, sixteen-lap synchronous
resolution time before integration, define a numeric no-material-delay tolerance,
and keep enriched resolution inside it; preserve smooth 60 fps playback; no
per-frame simulation or outcome resolution

**Constraints**: No live contest input or RNG; equal stock baselines; identical
async replay; one isolated incident toggle; tunable balance configuration; text
and bounded animation; presentation-only muteable engine/UI audio; no background
music; deterministic bounded track-generation attempts; closed,
non-self-intersecting, sufficiently separated circuit geometry; new `1x` ≈
legacy 20 seconds and new `2x` ≈ 10 seconds

**Scale/Scope**: Four player identities, generated rival identities, 8-car fields,
8/10/12/14/16 laps, three phases, five consequential event families, a seeded
track corpus with five circuit-feature families, scored and Test Day presentation

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Status | Plan evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | All enrichment resolves from committed inputs before playback; no live action exists. |
| II. Fairness | PASS | Shared phase rules and one identity schema apply to every participant; no purchased advantage exists. |
| III. Transparency & Legibility | PASS | Eligibility, risk, costs, triggers, and before/after event evidence are inspectable. |
| IV. Spectation-First | PASS | Retained passes, signatures, and incidents provide truthful post-Opening drama. |
| V. Build Testing Access | PASS | Test Day receives the same authority, explanation, event evidence, and toggle configuration. |
| VI. Async-First Architecture | PASS | Enriched results are deterministic retained evidence reusable by every asynchronous viewer. |
| Product constraints | PASS | Stock stats/capacity remain equal; identity is conditional and build-supported. |
| Track integrity | PASS | One retained validated centerline drives rendering, braking demand, physics, summaries, replay, and async viewers. |
| Development Workflow | PASS | Consequential resolution is test-first and proceeds through spec, clarify, plan, tasks, analyze, implement. |

**Post-design re-check**: PASS. `raceEnrichment.ts` owns pure resolution,
`playback.ts` consumes immutable event schedules, scenes remain presentation-only,
and isolated streams keep the incident toggle from perturbing unrelated outcomes.

## Project Structure

### Documentation (this feature)

```text
specs/033-race-enrichment/
├── spec.md
├── clarification-questionnaire.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── race-enrichment-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── content/
│   └── driverRaceIdentities.ts       # four entrant passive/signature definitions
├── simulation/
│   ├── types.ts                      # retained identity/event/result contracts
│   ├── raceEnrichment.ts             # pure phases, budgets, windows, incidents
│   ├── enrichmentConfig.ts           # validated tuning and incident toggle
│   ├── laps.ts                       # enriched temporary-stat/time integration
│   ├── contest.ts                    # one authoritative N-car orchestration path
│   ├── playback.ts                   # retained event boundaries and new rates
│   ├── tracks.ts                     # circuit grammar, validation, features, braking zones
│   └── raceSetup.ts                  # pre-race eligibility/risk projection
└── scenes/
    ├── raceEnrichmentPresentation.ts # pure briefing/playback/results models
    ├── audioPresentation.ts          # semantic cues, settings, lifecycle adapter
    ├── PreRaceScene.ts
    ├── ContestScene.ts
    ├── ResultScene.ts
    ├── PracticeContestScene.ts
    └── PracticeResultScene.ts

tests/
├── unit/
│   ├── raceEnrichment.test.ts
│   ├── enrichmentConfig.test.ts
│   ├── raceEnrichmentPresentation.test.ts
│   └── audioPresentation.test.ts
├── integration/
│   ├── enriched-contest.test.ts
│   ├── enriched-playback.test.ts
│   ├── enriched-test-day.test.ts
│   ├── ui-audio.test.ts
│   ├── audio-lifecycle.test.ts
│   └── audio-authority.test.ts
└── regression/
    └── race-enrichment-corpus.test.ts
```

**Structure Decision**: Extend the single-project Phaser/Vite layout. Put all
outcome authority in framework-free simulation modules, authored identity in
content, and all scene rendering behind pure presentation projections.

## Delivery Design

1. Baseline the current deterministic race corpus, synchronous 8-car/16-lap
   resolution time, and playback duration before adding enrichment; record a
   numeric no-material-delay tolerance and use the baseline for tuning ranges.
2. Add closed types, validated configuration, isolated seed derivation, phase
   assignment, and driver identity catalog with failing unit tests first.
3. Implement one pure boundary reducer that processes cars in stable roster order,
   debits Composure atomically, and emits immutable events.
4. Integrate temporary effects into lap time/effective-stat evidence, then rank
   cars solely from enriched retained lap times.
5. Project eligibility, Composure, phase structure, and risk into Pre-race and
   Test Day before adding playback spectacle.
6. Extend boundary playback and Results inspection; relabel rate multipliers
   without changing event authority.
7. Add local engine/UI assets and a mocked presentation-only audio adapter;
   integrate shared controls and both race scenes with cleanup/mute fallbacks.
8. Replace the same-direction closure solver with deterministic circuit grammar;
   validate closure, intersection, separation, feature diversity, and derived
   braking zones before exposing the sampled centerline to scenes.
9. Tune with centralized configuration and corpus gates, then verify incidents
   both enabled and disabled plus native/foreign/mixed builds.

## Complexity Tracking

No constitutional violations or additional architectural layers require justification.
