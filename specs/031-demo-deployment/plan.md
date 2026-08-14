# Implementation Plan: Demo Deployment

**Branch**: `031-demo-deployment` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-demo-deployment/spec.md`

## Summary

Publish an explicitly tagged, manually selected static demo to GitHub Pages through a two-job build/deploy workflow. Add independent push/PR verification, repository-prefix-safe and revision-stamped runtime asset URLs, public build identity on the title screen, production-artifact audits, and a post-deployment public smoke check. The deployed game remains serverless and multiplayer-free.

## Technical Context

**Language/Version**: TypeScript 5.5; Node.js 20 matching the established local/test runtime

**Primary Dependencies**: Phaser 3.80, Vite 5.4, official GitHub Pages and Node setup actions

**Storage**: GitHub Pages deployment artifact only; no application database or new browser persistence

**Testing**: Vitest 2, ESLint, TypeScript no-emit validation, production artifact inspection, local prefixed-preview smoke test, deployed HTTP smoke check

**Target Platform**: GitHub Pages project site at `https://threatlvlmidnight.github.io/auto-racer/`; modern desktop web browsers

**Project Type**: Static browser game plus CI/CD workflows

**Performance Goals**: Preserve current game runtime performance; deploy the approximately 73 MB artifact within normal GitHub Pages workflow limits; public smoke checks complete within two minutes including bounded availability retries

**Constraints**: Manual dispatch only; exact `demo-vMAJOR.MINOR.PATCH` tag; no secrets in client; least-privilege jobs; existing live artifact survives pre-deployment failures; post-deployment failure is reported but rolled back manually

**Scale/Scope**: Two workflows, one build-identity boundary, one asset URL helper, BootScene asset migration, title footer, artifact/static audits, smoke-check script, operator documentation

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Status | Plan evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Hosting and build identity do not modify prepare, simulation, contest, or Results behavior. |
| II. Fairness | PASS | One identical public artifact serves every tester; no paid or privileged gameplay path is introduced. |
| III. Transparency & Legibility | PASS | The running demo visibly identifies its exact release tag and revision. |
| IV. Spectation-First | PASS | Static hosting preserves the existing watched-race experience and makes it shareable by URL. |
| V. Build Testing Access | PASS | Test Day ships inside the same verified artifact with no service dependency. |
| VI. Async-First Architecture | PASS | The demo is entirely static; no live matchmaking or multiplayer backend is introduced. |
| Product constraints | PASS | Deployment changes no 2D, topology, parity, or theme rules. |
| Development Workflow | PASS | Specification and clarification precede planning; implementation will be task-gated and verified before release. |

**Post-design re-check**: PASS. CI/CD has no outcome authority, the static client contains no secret, and the deployment artifact is the same game build verified before upload.

## Project Structure

### Documentation (this feature)

```text
specs/031-demo-deployment/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── build-identity-contract.md
│   ├── production-artifact-audit-contract.md
│   ├── release-workflow-contract.md
│   └── smoke-check-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/workflows/
├── verify.yml                    # push/PR quality gates, never deploys
└── deploy-demo.yml               # manual tagged release build and Pages deployment
.github/dependabot.yml             # pinned GitHub Actions update monitoring

scripts/
├── validate-demo-tag.mjs         # local/post-checkout semantic tag cross-check
├── audit-production-artifact.mjs # production-only and secret-pattern checks
└── smoke-demo.mjs                # entry/script/representative asset HTTP checks

src/
├── buildIdentity.ts              # typed public build metadata and base-aware asset URL
├── vite-env.d.ts                  # compile-time public build field declarations
└── scenes/
    ├── BootScene.ts              # all Phaser assets use the shared URL boundary
    ├── TitleScene.ts             # small tag + short-revision footer
    └── titlePresentation.ts      # pure title build-label model

tests/
├── fixtures/
│   └── deployment-fixtures.ts
├── unit/
│   ├── buildIdentity.test.ts
│   └── titlePresentation.test.ts
└── integration/
    ├── deployment-boundaries.test.ts
    ├── deployment-smoke.test.ts
    ├── deployment-workflows.test.ts
    └── production-artifact.test.ts

vite.config.ts
package.json
README.md                         # one-time Pages enablement and release/rollback runbook
specs/031-demo-deployment/acceptance-evidence.md
```

**Structure Decision**: Keep the static game as one Vite project. Add CI/CD at the repository boundary, a single client-side base/build identity module, and small Node scripts that can run identically in Actions and local validation.

## Delivery Design

1. Baseline current production output and enumerate every root-absolute runtime asset reference.
2. Add test-first build identity/base URL behavior, including local root, Pages subpath, URL encoding, and revision cache stamp.
3. Migrate BootScene to the shared asset URL boundary and add static rejection tests for new root-absolute runtime paths.
4. Inject validated release tag, full/short revision, build time, and Pages base through the production build; render the title footer and keep a clear local-development fallback.
5. Add artifact auditing and local prefixed-preview smoke coverage before any deployment workflow is granted Pages permission.
6. Add the non-deploying verification workflow for pushes and pull requests.
7. Add the manual release workflow: validate input/tag, checkout exact tag, verify, build, audit, upload immutable artifact, deploy through the protected `github-pages` environment, then smoke-check the returned URL.
8. Document one-time Pages configuration, first release, ordinary release, unhealthy release diagnosis, and manual previous-tag restore.
9. Execute full gates and perform a controlled first `demo-v0.1.0` release only after the owner enables Pages and explicitly initiates it.

## Complexity Tracking

No constitutional violations or exceptional architecture require justification.
