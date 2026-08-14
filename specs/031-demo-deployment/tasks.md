# Tasks: Demo Deployment

**Input**: Design documents from `/specs/031-demo-deployment/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Testing approach**: Test first for build-identity validation, base-path construction, tag validation, artifact boundaries, and smoke-check behavior. Workflow YAML must be statically validated and exercised locally where GitHub-hosted behavior cannot run before merge.

## Phase 1: Setup and deployment baselines

**Purpose**: Capture the current artifact and runtime-path behavior before changing build/deployment boundaries.

- [X] T001 Record the current production artifact size, top-level contents, source-map state, and representative asset inventory in `specs/031-demo-deployment/acceptance-evidence.md`
- [X] T002 [P] Add deployment fixture values for local, Pages-prefix, valid-tag, invalid-tag, and prior-release cases in `tests/fixtures/deployment-fixtures.ts`
- [X] T003 [P] Add a static baseline test enumerating every root-absolute runtime asset reference in `tests/integration/deployment-boundaries.test.ts`
- [X] T004 [P] Add a production build baseline asserting the current entry document and expected public asset families in `tests/integration/production-artifact.test.ts`
- [X] T005 Run T003-T004 against the pre-migration build and record intentional failures/legacy expectations in `specs/031-demo-deployment/acceptance-evidence.md`

---

## Phase 2: Foundational build identity and URL boundaries

**Purpose**: Create the typed, testable client boundary required by every deployment story.

**Critical**: Blocks all user-story implementation.

- [X] T006 Add failing unit tests for local/release identity parsing, missing/malformed release inputs, short revision derivation, UTC time validation, and secret-free public fields in `tests/unit/buildIdentity.test.ts`
- [X] T007 Add failing unit tests for `/`, `/auto-racer/`, normalization, leading-slash rejection, traversal rejection, URL encoding, and revision cache stamps in `tests/unit/buildIdentity.test.ts`
- [X] T008 Implement immutable `BuildIdentity`, release/local validation, and `runtimeAssetUrl()` in `src/buildIdentity.ts`
- [X] T009 Extend `vite.config.ts` to consume one normalized build base and inject only the public tag, revision, and UTC build-time fields defined by `contracts/build-identity-contract.md`
- [X] T010 Add release/local TypeScript environment declarations for injected build fields in `src/vite-env.d.ts`
- [X] T011 Add a test-only build-identity factory or reset seam without exposing mutable production authority in `tests/fixtures/deployment-fixtures.ts` and `src/buildIdentity.ts`
- [X] T012 Run T006-T011 and existing BootScene/title/build regressions, recording resolved identity/base failures in `specs/031-demo-deployment/acceptance-evidence.md`

**Checkpoint**: Local and tagged release builds have one validated public identity and one safe runtime asset URL boundary.

---

## Phase 3: User Story 1 — Play the approved demo from a link (Priority: P1) 🎯 MVP

**Goal**: Make the complete static game playable beneath the repository Pages prefix with visible build identity.

**Independent Test**: Build with `/auto-racer/`, serve beneath that prefix, open a clean browser, and reach representative title/gameplay screens with no required runtime request escaping the prefix.

### Tests

- [X] T013 [P] [US1] Replace the baseline with failing static tests rejecting root-absolute runtime asset literals and requiring every authored BootScene asset key/path in `tests/integration/deployment-boundaries.test.ts`
- [X] T014 [P] [US1] Add failing title-footer presentation tests for release and local-development identities in `tests/unit/titlePresentation.test.ts`
- [X] T015 [P] [US1] Add failing prefixed production-artifact tests for entry module URLs, representative asset paths, cache stamps, and absent source-only trees in `tests/integration/production-artifact.test.ts`

### Implementation

- [X] T016 [US1] Replace every `/assets/...` Phaser load with `runtimeAssetUrl()` while preserving all texture keys and authored paths in `src/scenes/BootScene.ts`
- [X] T017 [P] [US1] Add a pure compact title build-label model in `src/scenes/titlePresentation.ts`
- [X] T018 [US1] Render the small `<demo-tag> · <short-revision>` footer without displacing the primary title action in `src/scenes/TitleScene.ts`
- [X] T019 [US1] Update `index.html` and `vite.config.ts` so generated entry/module URLs honor root and repository-prefix builds without client-side route fallback requirements
- [X] T020 [US1] Add revision cache stamps to stable public assets only, leaving Vite-hashed modules unchanged in `src/buildIdentity.ts`
- [X] T021 [US1] Add package scripts for an explicit simulated Pages-prefix build and preview in `package.json`
- [X] T022 [US1] Run T013-T021 and complete a local clean-cache browser walkthrough of title, entrant, garage, pre-race, race, Results, and all seven regional backgrounds under `/auto-racer/`

**Checkpoint**: The game is independently playable as a correctly prefixed static site; no GitHub deployment permission is required yet.

---

## Phase 4: User Story 2 — Publish only an approved build (Priority: P1)

**Goal**: Verify normal development continuously while publishing only a manually selected semantic demo tag that passes every release gate.

**Independent Test**: Prove pushes/PRs cannot deploy, reject invalid/untagged inputs, and produce one audited Pages artifact from a manually selected valid tag.

### Tests

- [X] T023 [P] [US2] Add failing tag grammar/ref-resolution tests for valid semantic demo tags, raw SHAs, branches, missing tags, omitted components, and leading zeros in `tests/integration/deployment-boundaries.test.ts`
- [X] T024 [P] [US2] Add failing workflow static tests for trigger isolation, least-privilege permissions, exact-tag checkout, gated job dependencies, Pages environment, concurrency, and immutable action pins in `tests/integration/deployment-workflows.test.ts`
- [X] T025 [P] [US2] Add failing artifact-audit tests covering every rule and redaction requirement in `specs/031-demo-deployment/contracts/production-artifact-audit-contract.md` using positive and negative fixtures in `tests/integration/production-artifact.test.ts`

### Implementation

- [X] T026 [US2] Implement the reusable local/post-checkout semantic demo-tag and resolved-revision cross-check in `scripts/validate-demo-tag.mjs`
- [X] T027 [US2] Implement deterministic production artifact inspection with one exported complete forbidden-path/credential-pattern rule set and actionable rule-specific failures in `scripts/audit-production-artifact.mjs`
- [X] T028 [US2] Add `verify` and artifact-audit package scripts without weakening existing `test`, `lint`, or `build` commands in `package.json`
- [X] T029 [US2] Add a read-only push/pull-request verification workflow that runs locked install, tests, lint, and build but has no Pages permissions or deploy step in `.github/workflows/verify.yml`
- [X] T030 [US2] Add the manual `release_tag` trigger; perform workflow-owned grammar and exact remote-tag validation before selected-tag checkout or repository-code execution; then cross-check the checked-out revision, run locked install/full gates/build identity/artifact audit, and upload the Pages artifact in `.github/workflows/deploy-demo.yml`
- [X] T031 [US2] Add the protected `github-pages` deployment job with minimum `pages: write`/`id-token: write` permissions, explicit build dependency, environment URL, and non-overlapping deployment concurrency in `.github/workflows/deploy-demo.yml`
- [X] T032 [P] [US2] Configure GitHub Actions dependency monitoring for immutably pinned official actions in `.github/dependabot.yml`
- [X] T033 [US2] Run T023-T032, inspect the generated archive, and record proof that invalid input or a failed pre-deployment gate cannot reach deployment in `specs/031-demo-deployment/acceptance-evidence.md`

**Checkpoint**: A validated tag can produce and deploy one audited artifact; normal development events cannot publish.

---

## Phase 5: User Story 3 — Diagnose and recover a bad deployment (Priority: P2)

**Goal**: Verify public availability after deployment and provide an explicit manual previous-tag recovery path.

**Independent Test**: Exercise transient availability, permanent entry failure, missing script/asset, identity mismatch, and a previous-tag redeploy; verify actionable unhealthy output and successful restoration.

### Tests

- [X] T034 [P] [US3] Add failing smoke-check unit/integration tests for bounded retries, entry content, discovered module URL, representative assets, identity match, empty bodies, HTTP failures, and network errors in `tests/integration/deployment-smoke.test.ts`
- [X] T035 [P] [US3] Add failing workflow tests requiring smoke execution against `deploy-pages` output and forbidding automatic rollback or recursive deployment in `tests/integration/deployment-workflows.test.ts`
- [X] T036 [P] [US3] Add failing runbook checks requiring one-time enablement, first release, routine release, unhealthy diagnosis, and previous-tag restoration instructions in `tests/integration/deployment-boundaries.test.ts`

### Implementation

- [X] T037 [US3] Implement bounded-retry entry/module/asset/build-identity checks with exact failing-URL diagnostics in `scripts/smoke-demo.mjs`
- [X] T038 [US3] Add the post-deployment smoke job using the returned Pages URL and expected tag/revision, marking failures unhealthy without rollback in `.github/workflows/deploy-demo.yml`
- [X] T039 [US3] Surface deployment URL, selected tag, resolved revision, and healthy/unhealthy result in the workflow summary in `.github/workflows/deploy-demo.yml`
- [X] T040 [US3] Document Pages enablement, tag creation, manual dispatch, result inspection, and manual previous-tag redeployment in `README.md`
- [X] T041 [US3] Add failure-triage and recovery evidence templates to `specs/031-demo-deployment/acceptance-evidence.md`
- [X] T042 [US3] Run T034-T041 against a local prefixed server and record forced missing-asset, identity-mismatch, and non-public previous-tag recovery evidence in `specs/031-demo-deployment/acceptance-evidence.md`

**Checkpoint**: Every public release reports a health result and has a documented, same-pipeline manual recovery path.

---

## Phase 6: Polish and release gates

**Purpose**: Prove the assembled deployment feature is safe, repeatable, and ready for an owner-authorized first demo.

- [ ] T043 [P] Audit all source/runtime paths for root-absolute URLs, traversal, mixed base handling, and unversioned stable public assets in `src/`, `index.html`, and `vite.config.ts`
- [ ] T044 [P] Audit workflow triggers, permissions, environments, concurrency, secret exposure, tag validation order, action pins, and artifact path scope in `.github/workflows/`
- [ ] T045 Run `npm ci`, focused deployment suites, full `npm test`, `npm run lint`, `npm run build`, simulated-prefix build, artifact audit, and local smoke checks; record exact results in `specs/031-demo-deployment/acceptance-evidence.md`
- [ ] T046 Perform clean-cache browser QA at 1920×1080, 1366×768, 1024×768, and 800×450 against the simulated `/auto-racer/` deployment; record console/network evidence in `specs/031-demo-deployment/acceptance-evidence.md`
- [ ] T047 Re-run the Constitution Check from `plan.md` against delivered code and record final PASS evidence in `specs/031-demo-deployment/acceptance-evidence.md`
- [ ] T048 Reconcile `specs/HANDOFF.md` and `specs/DEFERRED.md` with the deployed-demo boundary and feature 032 multiplayer dependency
- [ ] T049 Prepare—but do not push—the proposed first `demo-v0.1.0` tag command and owner checklist in `specs/031-demo-deployment/acceptance-evidence.md`
- [ ] T050 After explicit owner authorization and one-time Pages enablement, create/push `demo-v0.1.0`, manually dispatch it, verify the public URL/build footer/smoke result, and record the live evidence in `specs/031-demo-deployment/acceptance-evidence.md`

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 establishes artifact/path baselines.
- Phase 2 is blocking foundation work for every user story.
- US1 depends on Phase 2 and produces a locally deployable prefixed artifact—the MVP.
- US2 depends on US1 because it must upload the already-correct prefixed artifact.
- US3 depends on US2's deployment URL and workflow outputs.
- Phase 6 depends on all user stories; T050 additionally requires explicit owner authorization and repository administration.

### User-story dependency graph

```text
Foundation → US1 playable prefixed artifact → US2 controlled publishing → US3 health/recovery → Release gates
```

### Parallel opportunities

- T002-T004 touch separate fixture/baseline files.
- T013-T015 can be written in parallel before US1 implementation.
- T017 can proceed alongside T016 after the foundational identity API stabilizes.
- T023-T025 cover independent tag, workflow, and artifact boundaries.
- T032 is independent of workflow implementation after selected action repositories are known.
- T034-T036 cover smoke behavior, workflow wiring, and documentation independently.
- T043-T044 are independent final source/workflow audits.

## Parallel execution examples

### User Story 1

```text
T013 static asset-boundary tests
T014 title presentation tests
T015 prefixed artifact tests
```

### User Story 2

```text
T023 semantic tag tests
T024 workflow security tests
T025 artifact audit tests
```

### User Story 3

```text
T034 HTTP smoke tests
T035 no-auto-rollback workflow tests
T036 operator runbook contract tests
```

## Implementation strategy

### MVP first

Complete Phases 1-3 to produce a fully playable repository-prefixed static artifact locally. This proves the tester experience before introducing any deployment permission.

### Incremental delivery

1. Establish typed build/base identity.
2. Make the game work beneath `/auto-racer/`.
3. Add safe verification and manual tagged deployment.
4. Add public health diagnosis and manual restoration.
5. Run final audits, then stop at T049 until the owner explicitly authorizes T050.

### Format validation

Every executable task uses the required checkbox, sequential ID, optional `[P]`, required user-story label inside story phases, and an explicit file path.
