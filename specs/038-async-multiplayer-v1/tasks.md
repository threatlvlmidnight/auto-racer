# Tasks: Async Multiplayer V1

**Input**: Design documents in `/specs/038-async-multiplayer-v1/`  
**Prerequisites**: clarified `spec.md`, `research.md`, `data-model.md`, both
contracts, `operational-runbook.md`, `plan.md`, and `quickstart.md`  
**Implementation status**: Ready for coding handoff after Features 041/042 land
and their outcome-affecting versions are frozen; nothing here is implemented.  
**Ownership**: T001–T065 are `[CODE-DEEPSEEK]`. T066 is
`[OWNER-OPTIONAL-PILOT]`. T067 is `[MANUAL-FRONTIER-OR-OWNER]`. DeepSeek must
not execute or claim T066/T067 and must not create a paid service, enter hosted
credentials, take screenshots, or perform qualitative browser verification.

## Phase 1 — Static boundary, fixtures, and transport foundation

- [ ] T001 [P] [CODE-DEEPSEEK] Rebase the implementation branch onto completed
  Features 041/042, inventory every outcome-affecting constant/catalog from
  Features 033/034/041/042, and add a failing manifest completeness audit in
  `tests/unit/asyncCompatibility.test.ts`; do not invent placeholder versions.
- [ ] T002 [P] [CODE-DEEPSEEK] Create deterministic two-participant, valid,
  malformed, tampered, duplicate, incompatible-version, oversize, expired,
  withdrawn, moderated, blocked, lost-identity, paused, quota, track/setup, and
  eight-car parity fixtures in `tests/fixtures/async-multiplayer-fixtures.ts`.
- [ ] T003 [P] [CODE-DEEPSEEK] Add failing disabled/unconfigured/consent tests
  proving zero SDK construction, Auth, storage write, `fetch`, run mutation, and
  local-output drift in `tests/unit/asyncCapability.test.ts` and
  `tests/integration/async-static-fallback.test.ts`.
- [ ] T004 [CODE-DEEPSEEK] Add `@supabase/supabase-js` as the lazy browser
  dependency and the Supabase CLI as a pinned development dependency; add
  `supabase/` source directories without initializing or linking a hosted
  project and confirm the disabled production chunk does not eagerly execute it.
- [ ] T005 [P] [CODE-DEEPSEEK] Add placeholder-only `.env.example` public config,
  ignored local function env/link/temp paths, and strict `disabled|pilot`
  parsing in `src/multiplayer/capability.ts`; missing/unknown values fail closed.
- [ ] T006 [P] [CODE-DEEPSEEK] Define the complete DTO, capability, operation
  result, error-code, report-reason, provenance, and service interface types in
  `src/multiplayer/contracts.ts` and `src/multiplayer/service.ts` with no Phaser,
  Supabase, browser-global, or database imports.
- [ ] T007 [P] [CODE-DEEPSEEK] Add failing canonical JSON/SHA-256 fixtures for
  key order, Unicode, arrays, `-0`, sparse/undefined/cyclic/non-finite/unknown
  input, byte equality, and lowercase hex in
  `tests/unit/asyncCanonicalPayload.test.ts`.
- [ ] T008 [CODE-DEEPSEEK] Implement `canonical-json-v1` and `sha256-v1` in
  `src/multiplayer/canonicalPayload.ts` using browser/Node/Deno-compatible APIs;
  never use locale order, object insertion order, or a weak/non-cryptographic
  digest for remote evidence.
- [ ] T009 [CODE-DEEPSEEK] Implement the exact compatibility manifest, validation,
  and digest in `src/multiplayer/compatibility.ts`, adding explicit missing
  track-generator, simulation-result, and catalog versions at their owning
  modules and consuming—never duplicating—the Feature 033/034/041/042 constants.
- [ ] T010 [CODE-DEEPSEEK] Implement `DisabledAsyncGhostService` in
  `src/multiplayer/disabledService.ts` and capability construction that returns
  typed disabled/unconfigured/consent states without imports/network/throws or
  game-state mutation.
- [ ] T011 [CODE-DEEPSEEK] Implement the injected namespaced
  `async-sharing-v1` preference/session boundary in
  `src/multiplayer/participantPreference.ts`; malformed/unavailable storage
  fails to consent-required and identity loss is explicit, never implicit link.

**Checkpoint**: The normal static game is measurably unchanged and the complete
transport/version foundation exists without any backend or identity.

## Phase 2 — Shared publication validation and authoritative resolver

- [ ] T012 [P] [CODE-DEEPSEEK] Add failing strict publication validation tests
  for instance identity, definition lookup, topology, tier, modification,
  Scrutineering, adjacency, Loot, setup, track, manifest, digest, unknown fields,
  and non-finite values in `tests/unit/asyncGhost.test.ts`.
- [ ] T013 [CODE-DEEPSEEK] Add explicit `TRACK_GENERATOR_VERSION`, bounded
  `AsyncTrackDescriptor` regeneration, and canonical track fingerprinting to
  `src/simulation/tracks.ts`/`src/simulation/asyncGhost.ts`; deep-validate
  retained generation evidence instead of accepting a claimed track object.
- [ ] T014 [CODE-DEEPSEEK] Implement strict `InstanceBuild` rehydration and
  validation in `src/simulation/asyncGhost.ts`, resolving definitions from the
  exact versioned catalog and emitting a fresh immutable `VehicleBuild`; do not
  accept client-computed stats, item definitions, or result/time fields.
- [ ] T015 [CODE-DEEPSEEK] Reuse `deriveEligibleSetupControls` and
  `validateLockedRaceSetup` against the regenerated track/rehydrated build,
  enforcing the discovery/publish encounter binding and exact Feature 034/041/
  042 compatibility before returning a verified committed input.
- [ ] T016 [P] [CODE-DEEPSEEK] Add failing async contest tests for canonical
  challenger + six local rivals + remote ghost order, remote build/setup/driver
  identity, exact retained circuit, ties, enrichment events, result/event
  digests, repeatability, malformed remote evidence, and no settlement in
  `tests/unit/asyncContest.test.ts`.
- [ ] T017 [CODE-DEEPSEEK] Add the minimal optional retained-track and explicit
  per-rival identity seams to `src/simulation/contest.ts` and its input types;
  preserve deep-equal legacy/local results when those fields are absent and add
  regression pins for every existing resolver overload.
- [ ] T018 [CODE-DEEPSEEK] Implement the pure authoritative eight-car assembly
  and resolution in `src/simulation/asyncContest.ts`, using the first six
  canonical local profiles and the verified ghost last, then the same Feature
  033 enriched resolver/stat authority; do not fork simulation arithmetic.
- [ ] T019 [CODE-DEEPSEEK] Implement strict `AsyncContestReceipt` construction,
  canonical input/result/event digests, size bounds, provenance, and validation;
  reject non-finite/oversize/mismatched evidence before it can be replayed.
- [ ] T020 [P] [CODE-DEEPSEEK] Add run/RNG/economy/encounter/history/standings
  deep-equality tests for publish validation and async resolution, including
  success, every failure, retry, replay, report, and block paths.
- [ ] T021 [CODE-DEEPSEEK] Create `scripts/benchmark-async-resolver.mjs` with
  representative/dense/worst accepted fixtures, p50/p95/max CPU and canonical
  byte summaries, hard failure at 1.5-second p95 or any 2-second accepted max,
  and no network dependency.

**Checkpoint**: A framework-free server-capable resolver produces the same
versioned race truth and cannot settle or mutate a local run.

## Phase 3 — Reproducible Supabase schema and security foundation

- [ ] T022 [CODE-DEEPSEEK] Initialize only the local checked-in Supabase project
  in `supabase/config.toml`, pin relevant local settings, enable anonymous Auth
  for fixtures, and document that the local stack is development-only; do not
  authenticate/link/push to a hosted project.
- [ ] T023 [CODE-DEEPSEEK] Add the ordered schema migration for `participants`,
  `ghost_submissions`, `ghost_discovery_state`, `discovery_offers`,
  `async_contests`, `participant_blocks`, `ghost_reports`,
  `rate_limit_buckets`, `service_control`, and bounded aggregate operations,
  including all checks/uniqueness/FKs from `data-model.md`.
- [ ] T024 [P] [CODE-DEEPSEEK] Add failing local database security tests proving
  `anon` and anonymous `authenticated` users cannot directly read/write any
  service table/view or invoke privileged RPCs, cannot spoof owner IDs, and
  cannot cross participant boundaries in
  `tests/integration/async-supabase-local.test.ts`.
- [ ] T025 [CODE-DEEPSEEK] Add the RLS/grant migration: enable RLS everywhere,
  revoke exposed privileges, keep all mutations/discovery behind Edge Functions,
  and add defense-in-depth owner policies only where a narrow internal function
  requires them; rerun every negative test.
- [ ] T026 [CODE-DEEPSEEK] Add server-only transaction functions for atomic
  idempotency, active-ghost cap, rate-bucket increment, discovery selection/
  offer binding, receipt insertion/offer consumption, withdrawal, block, report,
  participation disable, and service mode checks with concurrent fixtures.
- [ ] T027 [CODE-DEEPSEEK] Add query-time TTL/status/moderation predicates plus
  hourly idempotent `pg_cron` cleanup for seven-day payloads, expired offers/
  rate buckets, 30-day reports, and eligible disabled anonymous users; discovery
  must remain safe when Cron is delayed or fails.
- [ ] T028 [P] [CODE-DEEPSEEK] Create deterministic local seed data for two
  anonymous participants, compatible/incompatible/expired/moderated records,
  blocks, rate states, and service modes in `supabase/seed.sql`; production
  migration paths must never include seed data.
- [ ] T029 [CODE-DEEPSEEK] Generate/check in database TypeScript types from the
  local migration head and add a drift test that fails when schema/types/OpenAPI
  or enum/status vocabularies disagree.
- [ ] T030 [P] [CODE-DEEPSEEK] Implement shared Edge helpers for JWT verification,
  `is_anonymous`, exact-origin CORS, JSON/content-length bounds, service control,
  request IDs, typed HTTP/error envelopes, server client, and idempotency in
  `supabase/functions/_shared/`; never trust participant IDs from bodies.
- [ ] T031 [P] [CODE-DEEPSEEK] Implement one bounded structured request logger
  and automated redaction tests for every forbidden value/body fragment from the
  contract; cap log events/message sizes and retain no payload debug mode.
- [ ] T032 [CODE-DEEPSEEK] Add Deno-side canonical/manifest/validator imports and
  cross-runtime fixtures so browser/Node/Deno bytes/digests deep-equal without
  copied simulation rules; resolve all bundle/module incompatibilities before
  endpoint work.

**Checkpoint**: A fresh local `db reset` recreates a deny-by-default, bounded,
versioned service foundation from source control.

## Phase 4 — User Story 1: opt in, publish, and withdraw (P1)

- [ ] T033 [P] [US1] [CODE-DEEPSEEK] Add failing participant-enable tests for no
  prior consent, valid anonymous JWT, pseudonym uniqueness/allowed vocabulary,
  exact retry, lost session, non-anonymous/invalid tokens, rate limit, and
  read-only/disabled modes in `tests/integration/async-publish-flow.test.ts`.
- [ ] T034 [US1] [CODE-DEEPSEEK] Implement `participant-enable` with server-only
  pseudonym assignment and compatible consent state; collect no user text/PII
  and return no private profile fields.
- [ ] T035 [P] [US1] [CODE-DEEPSEEK] Add failing `ghost-publish` function tests
  for the full validation/idempotency/rate/active-cap/TTL matrix and atomic
  absence on failure in `tests/integration/async-publish-flow.test.ts`.
- [ ] T036 [US1] [CODE-DEEPSEEK] Implement `ghost-publish`, delegating to the
  shared strict validator, storing only after verification, and returning the
  bounded public summary; reject client result/stat/definition claims.
- [ ] T037 [P] [US1] [CODE-DEEPSEEK] Add failing lazy Supabase adapter tests for
  consent, anonymous sign-in, session persistence/loss, abort/timeout, one
  idempotent retry, 429 `Retry-After`, pause/5xx, typed mapping, and zero mutation.
- [ ] T038 [US1] [CODE-DEEPSEEK] Implement the lazy concrete adapter in
  `src/multiplayer/supabaseService.ts`; import/construct the SDK only after
  pilot config + consent, invoke functions rather than tables, and never log
  credentials/JWTs/bodies.
- [ ] T039 [P] [US1] [CODE-DEEPSEEK] Create pure disclosure, capability, publish,
  retry, success, withdrawal, expiry, and shared-data presentation models with
  keyboard/touch/no-hover semantics and bounded regions in
  `src/scenes/asyncMultiplayerPresentation.ts` and its unit tests.
- [ ] T040 [US1] [CODE-DEEPSEEK] Create/register `AsyncMultiplayerScene` and a
  RunScene entry that remains visibly optional, retains a prominent local-race
  route, and passes only live model references/IDs; decline/close/retry must
  restore exact run focus/selection.
- [ ] T041 [US1] [CODE-DEEPSEEK] Create publish mode in
  `AsyncRaceSetupScene.ts` by reusing race-setup derivation/presentation for the
  retained upcoming circuit, then build one immutable command without starting
  or settling that run's race.
- [ ] T042 [P] [US1] [CODE-DEEPSEEK] Add withdrawal tests and implement
  `ghost-withdraw`; owner-only status changes before response, exact retry is
  successful, and immediate next discovery cannot serve the record even with
  cleanup disabled.

**Checkpoint**: A consenting local participant can publish and withdraw a
verified seven-day ghost without changing their championship.

## Phase 5 — User Story 2: discover, resolve, and watch (P1)

- [ ] T043 [P] [US2] [CODE-DEEPSEEK] Add failing rotating discovery tests for
  self/incompatible/excluded/block/TTL/status/moderation filters, least-served
  rotation, tie selection isolation, 15-minute ownership binding, empty success,
  concurrent requests, and rate limits in
  `tests/integration/async-discovery-race-flow.test.ts`.
- [ ] T044 [US2] [CODE-DEEPSEEK] Implement `ghost-discover` transactionally;
  return one bounded summary/offer or success-null, never full build/owner data,
  and keep server selection randomness out of simulation inputs.
- [ ] T045 [P] [US2] [CODE-DEEPSEEK] Add failing resolve endpoint tests for
  requester/offer binding, expiry/consumption, ghost revalidation, challenger
  validation, exact eight-car parity, transactional receipt-before-response,
  retries/conflicts, resolver/size limits, and no playable partial rows.
- [ ] T046 [US2] [CODE-DEEPSEEK] Implement `contest-resolve` using only the shared
  validator/resolver/receipt authority; atomically store receipt and consume the
  offer, and fail closed rather than accepting a browser result.
- [ ] T047 [US2] [CODE-DEEPSEEK] Add discover/resolve/receipt validation to the
  concrete browser adapter, including abortable requests, exact retry keys,
  compatibility recheck, and local invalidation of malformed/tampered responses.
- [ ] T048 [US2] [CODE-DEEPSEEK] Add discovery mode to `AsyncRaceSetupScene.ts`:
  show server-verified pseudonym/circuit/expiry/version access, lock challenger
  setup to the offer encounter/circuit, handle offer expiry, and never generate
  another track or mutate the run.
- [ ] T049 [P] [US2] [CODE-DEEPSEEK] Add failing ContestScene integration tests
  proving receipt mode performs zero resolution, track generation, rival
  selection, network, or settlement calls while pause/1x/2x/skip/events/PiP/
  audio/focus consume retained evidence.
- [ ] T050 [US2] [CODE-DEEPSEEK] Add the validated pre-resolved
  `AsyncContestReceipt` input variant to `ContestScene`/`runPresentation.ts`;
  reuse the normal eight-car renderer and clearly distinguish the remote ghost
  without changing local input behavior.
- [ ] T051 [P] [US2] [CODE-DEEPSEEK] Add failing ResultScene tests for complete
  provenance/digests/version access, `UNSCORED ASYNC EXHIBITION`, report/block/
  return controls, no Next Stage/credits/points/settlement, and run deep equality.
- [ ] T052 [US2] [CODE-DEEPSEEK] Integrate receipt mode into `ResultScene` and
  its pure formatting; retain Feature 033 event/result and Feature 034/041/042
  item evidence and route back to the exact async lobby/run without recompute.
- [ ] T053 [US2] [CODE-DEEPSEEK] Complete offline/timeout/paused/429/read-only/
  quota/empty-pool browser flows with one safe retry and a prominent local-rival
  action; prohibit background polling after leaving the lobby.

**Checkpoint**: A compatible remote record produces one server-stored result
that the normal race UI watches without recomputation or progression changes.

## Phase 6 — User Story 3: trust, safety, retention, and control (P2)

- [ ] T054 [P] [US3] [CODE-DEEPSEEK] Add failing report/block/unblock/disable
  tests for fixed reasons, no free text, self/foreign targets, uniqueness,
  ownership, rate limits, immediate discovery exclusion, all-ghost withdrawal,
  completed-receipt immutability, and no moderation-state disclosure in
  `tests/integration/async-safety-retention.test.ts`.
- [ ] T055 [US3] [CODE-DEEPSEEK] Implement `safety-control` report, block,
  unblock, and disable-participation actions with atomic ownership/rate/service
  checks; never accept user-authored copy or mutate a completed contest.
- [ ] T056 [US3] [CODE-DEEPSEEK] Add non-color provenance/version/verification,
  expiry, withdrawal, fixed-reason report, block/unblock, identity-loss, and
  disable-participation models/controls to lobby and Results with cancel/focus/
  duplicate-submit protection.
- [ ] T057 [US3] [CODE-DEEPSEEK] Complete delayed/failed-Cron, hourly cleanup,
  seven-day/30-day boundary, participation disable, and idempotent rerun tests;
  prove query predicates—not cleanup timing—control discovery.
- [ ] T058 [US3] [CODE-DEEPSEEK] Implement/read-test `service_control` enabled,
  read-only, disabled, verifier-version, and quota-stop behavior; withdrawal,
  disable, and administrative cleanup remain possible in read-only as specified.
- [ ] T059 [P] [US3] [CODE-DEEPSEEK] Add privacy/security audits for forbidden
  fields, direct grants, wildcard CORS, Auth/owner spoofing, log redaction,
  committed env/link/temp files, secret patterns, payload sizes, and generated
  database/OpenAPI drift.

**Checkpoint**: Participation is inspectable/reversible, abuse controls are
bounded, and invalid/expired/blocked data cannot silently enter play.

## Phase 7 — Cost, deployment, regression, and handoff gates

- [ ] T060 [P] [CODE-DEEPSEEK] Create `scripts/audit-async-static-build.mjs` and
  artifact tests proving the normal Pages bundle contains no secret/service-role
  key, unintended pilot URL, eager SDK execution, startup request, or remote
  dependency for a complete local run.
- [ ] T061 [P] [CODE-DEEPSEEK] Create `scripts/verify-async-contract.mjs` to
  validate OpenAPI, DTO/error/version enums, generated DB types, SQL status/
  reason checks, endpoint names, payload fixtures, and browser/Node/Deno digests.
- [ ] T062 [P] [CODE-DEEPSEEK] Add objective deterministic layout-region/focus
  tests for lobby/disclosure/setup/provenance/Results in disabled, error, dense,
  long-pseudonym, and no-hover states; do not capture screenshots or make
  qualitative visual claims.
- [ ] T063 [CODE-DEEPSEEK] Execute every focused/local-stack/benchmark command in
  `quickstart.md`, repair only Feature 038 regressions, and record exact test
  counts, migration head, verifier version, p50/p95/max CPU, request/result byte
  maxima, and zero-request static evidence in implementation notes.
- [ ] T064 [CODE-DEEPSEEK] Run `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`, `npm run build:pages`, `npm run audit:artifact`, async artifact
  audit, and fresh `npx supabase db reset`; verify Features 033/034/041/042 and
  all local championship/playback/Results pins remain green.
- [ ] T065 [CODE-DEEPSEEK] Update implementation notes and
  `operational-runbook.md` with changed files, exact routes/fixture IDs/states,
  current official quota/limit review date, dependency versions, schema/function
  deploy order, kill/read-only/rollback/recovery steps, known pilot limits, and
  owner/manual handoff. Mark T001–T064 code-complete only; do not claim Feature
  038 fully accepted or hosted.
- [ ] T066 [OWNER-OPTIONAL-PILOT] Create/configure/activate the disposable hosted
  Free pilot only after all go/no-go gates, confirm no payment/paid tier/overage,
  enter public config/secrets, apply migrations/functions, verify RLS/quota/
  retention/benchmark health, and record the pilot URL separately. DeepSeek MUST
  NOT execute or check off this task.
- [ ] T067 [MANUAL-FRONTIER-OR-OWNER] Execute the qualitative cross-device,
  viewport, input, provenance, consent, error, playback, audio, Results, and
  local-fallback matrix in `quickstart.md`; capture/judge screenshots or
  listening evidence if desired. DeepSeek MUST NOT execute, check off, or claim
  this task.

## Dependencies and execution order

- Features 041/042 must land before T001/T009/T012–T019 and manifest freeze.
- Feature 035/036 remediation should land before T039–T053 shared scene work to
  avoid reintroducing Contest/Results overlap.
- Phase 1 blocks all remote code. Phase 2 blocks publication/resolve endpoints.
- Phase 3 blocks all endpoint and concrete-adapter integration.
- US1 publish and US2 discovery fixtures may be prepared together, but US2
  requires a verified ghost from US1 and the Phase 2 resolver.
- US3 safety/retention requires schema and endpoint foundations but its tests may
  be prepared while US1/US2 UI integration proceeds.
- T066 follows T001–T065 and explicit owner approval. T067 follows an available
  local or owner-enabled pilot build. Neither blocks static/local release.

## Parallel opportunities

- T001–T003/T005–T007 may be prepared in parallel.
- T012/T016/T020 and T024/T028/T030/T031 may be prepared in parallel in separate
  files after shared contracts compile.
- T033/T035/T037/T039 and T043/T045/T049/T051/T054 can be prepared as failing
  tests in parallel after their foundations.
- T057–T062 are separable objective audits once endpoint contracts stabilize.

## Implementation strategy

1. Preserve the static disabled product first and keep it green continuously.
2. Complete pure version/validation/resolution authority before any network UI.
3. Reconstruct and prove the local Supabase security boundary before a concrete
   browser adapter can call it.
4. Deliver publish, then discover/resolve/playback, then safety/retention.
5. Fail closed on server CPU/size/security/parity problems; never weaken trust to
   make the optional pilot appear available.
6. Stop after T065 with exact owner/manual reproduction instructions.
