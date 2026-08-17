# Implementation Plan: Async Multiplayer V1

**Branch**: `038-async-multiplayer-v1` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

## Summary

Add an optional Supabase-backed asynchronous exhibition loop without making the
static game or championship depend on it. After explicit consent, a player can
publish an immutable versioned build/setup/circuit ghost, discover a compatible
seven-day record, commit their own setup for that retained circuit, and receive
a server-resolved eight-car enriched result before normal watched playback. One
remote ghost plus six generated rivals form the field. All remote races are
unscored and non-mutating. Disabled, unconfigured, offline, paused, limited, and
quota-stopped service states always retain local play.

## Technical Context

**Language/Version**: TypeScript 5.5 ES modules in browser and Supabase Deno
Edge Functions; SQL/PostgreSQL migrations  
**Primary Dependencies**: Phaser 3.80, Vite 5.4, Vitest 2, existing pure
simulation; add `@supabase/supabase-js` as a lazy optional client and Supabase
CLI as a development dependency  
**Storage**: Injected browser storage for consent/session; optional Supabase
Auth/Postgres for seven-day ghosts, short-lived discovery offers, receipts,
blocks, fixed-reason reports, rate buckets, and service control  
**Testing**: Vitest unit/contract/integration tests; Supabase local stack schema,
RLS, Edge Function, Cron, replay-parity, idempotency, and abuse fixtures; existing
full repository gates  
**Target Platform**: Static browser game/GitHub Pages plus optional Supabase Free
development pilot  
**Project Type**: Static web game with a separately deployable optional API and
database  
**Performance Goals**: No remote work during local boot; no per-frame service
calls; canonicalization/digest under 25 ms for accepted payloads in browser;
Edge resolve p95 under 1.5 seconds and hard maximum under the current 2-second
hosted CPU/request limit; watched playback remains schedule-driven  
**Constraints**: $0 closed pilot; no paid tier/overage; no secret in browser;
512 KiB request and 2 MiB stored/result caps; exact version matching; seven-day
payload TTL; no free text; no remote settlement; no client-authoritative
fallback; no screenshots/manual QA assigned to DeepSeek  
**Scale/Scope**: Closed development pilot, at most three active ghosts per
participant; six Edge operations, seven small tables plus service control/rate
buckets, one lobby and one reused setup flow, one pre-resolved Contest/Results
adapter, versioned runbook and local service fixtures

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **I. Prepare → Contest Integrity**: PASS. Both participants commit build and
  setup before a pure server resolution. The returned result is immutable before
  watched playback; no race input or live opponent exists.
- **II. Fairness**: PASS. The feature is free, optional, and unscored. It awards
  no currency, reputation, standings, or run advantage.
- **III. Transparency & Legibility**: PASS. Provenance, exact version manifest,
  verification, circuit, result, event, and digest evidence are retained and
  inspectable. Invalid evidence is rejected, not guessed.
- **IV. Spectation-First**: PASS. Remote results reuse the normal eight-car
  playback and Results evidence rather than a test screen.
- **V. Build Testing Access**: PASS with no claim of replacement. The async
  exhibition is additional low-stakes play but depends on an optional service,
  so it cannot be the constitution's sole build-testing access. Feature 038 does
  not resolve Feature 045's separately documented temporary Test Day deviation.
- **VI. Async-First Architecture**: PASS and primary purpose. All opponents are
  recorded state; discovery is rotating/asynchronous and local play never
  depends on matchmaking.
- **Mechanical parity/topology**: PASS. Server rehydrates the same versioned
  catalog/topology and runs the same resolver for every participant. No profile
  grants mechanical advantage.
- **2D constraint**: PASS. No art or 3D system is added.

**Post-design result**: No new constitutional violation. Planning may proceed.

## Project Structure

```text
specs/038-async-multiplayer-v1/
├── analysis.md
├── data-model.md
├── intake.md
├── operational-runbook.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
├── tasks.md
├── checklists/requirements.md
└── contracts/
    ├── async-multiplayer-contract.md
    └── openapi.yaml

src/
├── multiplayer/
│   ├── canonicalPayload.ts          # canonical JSON/SHA-256
│   ├── compatibility.ts             # exact version manifest/key
│   ├── contracts.ts                 # transport DTO/result unions
│   ├── service.ts                   # framework-free interface
│   ├── disabledService.ts           # zero-network default
│   ├── supabaseService.ts           # lazy authenticated adapter
│   ├── capability.ts                # config/consent/availability state
│   └── participantPreference.ts     # injected browser storage
├── simulation/
│   ├── asyncGhost.ts                # validate/rehydrate published input
│   ├── asyncContest.ts              # pure 1 remote + 6 local field resolver
│   ├── contest.ts                   # additive rival identity/retained-track seam
│   ├── tracks.ts                    # explicit generator version/fingerprint
│   └── types.ts                     # versioned evidence types
└── scenes/
    ├── asyncMultiplayerPresentation.ts
    ├── AsyncMultiplayerScene.ts     # lobby/disclosure/publish/discover
    ├── AsyncRaceSetupScene.ts       # shared setup model, no run mutation
    ├── ContestScene.ts              # pre-resolved receipt input
    ├── ResultScene.ts               # async exhibition return/provenance
    └── existing host/registration files

supabase/
├── config.toml
├── seed.sql
├── migrations/
│   ├── *_async_multiplayer_schema.sql
│   ├── *_async_multiplayer_rls.sql
│   └── *_async_multiplayer_cron.sql
└── functions/
    ├── _shared/                     # auth, CORS, validation, rate, resolver
    ├── participant-enable/
    ├── ghost-publish/
    ├── ghost-discover/
    ├── contest-resolve/
    ├── ghost-withdraw/
    └── safety-control/              # report/block/disable actions

tests/
├── fixtures/async-multiplayer-fixtures.ts
├── unit/
│   ├── asyncCanonicalPayload.test.ts
│   ├── asyncCompatibility.test.ts
│   ├── asyncGhost.test.ts
│   ├── asyncContest.test.ts
│   ├── asyncCapability.test.ts
│   └── asyncMultiplayerPresentation.test.ts
├── contract/async-multiplayer-contract.test.ts
└── integration/
    ├── async-static-fallback.test.ts
    ├── async-publish-flow.test.ts
    ├── async-discovery-race-flow.test.ts
    ├── async-safety-retention.test.ts
    └── async-supabase-local.test.ts

scripts/
├── audit-async-static-build.mjs
├── benchmark-async-resolver.mjs
└── verify-async-contract.mjs
```

## Implementation Sequence

1. Rebase onto Features 041/042, freeze all outcome-affecting version constants,
   and add canonical fixtures before writing service code.
2. Establish the zero-network disabled adapter, consent/config capability
   state, exact compatibility manifest, canonical JSON, SHA-256, and typed error
   unions.
3. Add pure publication validation and a retained-track eight-car resolver that
   inserts one remote ghost without settlement or scene authority.
4. Version-control the Supabase local project, schema, no-direct-access RLS,
   atomic idempotency/rate/retention functions, and Edge endpoints.
5. Prove local publish/discover/resolve/withdraw/report/block, cross-runtime
   digest equality, TTL, moderation, and replay parity; benchmark before pilot
   enablement.
6. Add the lazy Supabase browser adapter and lobby/setup projections while
   proving failed actions cannot mutate run/RNG/encounters.
7. Feed only a stored `AsyncContestReceipt` into the existing Contest/Result
   presentation and prohibit scene-time resolution or championship settlement.
8. Complete static artifact, privacy, secret, deployment, rollback, full-suite,
   and Pages gates. Stop before hosted activation or manual browser judgment.

## Complexity Tracking

| Added surface | Why justified | Simpler alternative rejected |
|---|---|---|
| Optional Supabase project | Cross-device durable discovery and authoritative resolution require a shared trust boundary | Client-only records cannot satisfy FR-006 |
| Edge-only table access | Verification, rate limiting, moderation, and rotating discovery must not be client-forgeable | Browser table writes expose authority even with basic owner RLS |
| Discovery-offer table | Challenger setup must bind to the exact selected ghost/circuit before resolution | Trusting a client-provided ghost ID allows selection substitution |
| Full shared resolver in Edge | Result/event evidence must equal local simulation and exist before playback | A second simplified server formula would drift; client results are untrusted |
| Explicit version manifest | Many independent systems now affect outcomes | A single app version hides incompatibility and permits false replay parity |
| Unscored exhibition route | Optional pool strength/service availability cannot alter progression | Remote replacement in championship makes fairness depend on network state |
| Local Supabase stack | Schema/RLS/functions need reproducible automated evidence | Dashboard-only configuration is unreviewable and unrecoverable |

## Delivery Boundary

- `[CODE-DEEPSEEK]` implements framework-free/browser/service code, migrations,
  local fixtures, automated tests, runbook source, and reproducible commands.
- `[OWNER-OPTIONAL-PILOT]` creates/configures the hosted Free project, enters
  public config/secrets, confirms no billing upgrade/payment method, and may
  enable the pilot only after benchmark/security gates.
- `[MANUAL-FRONTIER-OR-OWNER]` performs qualitative browser/cross-device review.
  DeepSeek does not take screenshots or close either external lane.
