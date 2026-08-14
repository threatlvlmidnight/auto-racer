# Research: Demo Deployment

## Decision 1: Use a custom GitHub Actions Pages workflow

**Decision**: Build with the project's normal toolchain, upload only `dist/` as the Pages artifact, and deploy it with GitHub's official Pages actions and `github-pages` environment.

**Rationale**: GitHub documents custom workflows as the supported path for static generators with a build step. Separating build and deploy lets the build job run with read-only repository permission while only the deploy job receives `pages: write` and `id-token: write`.

**Alternatives considered**: Commit `dist/` to a `gh-pages` branch; rejected because generated output would pollute version history and bypass the exact verified artifact boundary. Publish repository root; rejected because it would expose source-only files.

## Decision 2: Separate verification from deployment

**Decision**: `verify.yml` runs on pushes and pull requests but has no Pages permission or deploy step. `deploy-demo.yml` runs only through manual dispatch and repeats every required gate against the selected tag.

**Rationale**: Ordinary development receives fast regression feedback without changing the public demo. Repeating gates at release prevents a stale earlier check from authorizing a different artifact.

**Alternatives considered**: Deploy on every main push; explicitly rejected. Reuse a prior workflow artifact; rejected because source/tag identity and artifact provenance become harder to verify.

## Decision 3: Validate and resolve the tag before executing repository scripts

**Decision**: The manual input must match `^demo-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`. Workflow-owned logic validates the grammar and verifies the exact remote tag ref before checking out or executing any selected-tag repository code. After checkout, the repository validator cross-checks the resolved tag/revision before dependency installation or build execution.

**Rationale**: This rejects branches, arbitrary revisions, omitted components, leading-zero ambiguity, and similarly named tags. The resolved commit becomes the sole build identity.

**Alternatives considered**: Free-form ref; rejected during clarification. Trigger directly on tag push; rejected because eligibility and publication are separate owner actions.

## Decision 4: Pin third-party workflow actions immutably

**Decision**: Use official actions—checkout, setup-node, configure-pages, upload-pages-artifact, and deploy-pages—pinned to reviewed full commit SHAs, with comments recording their major release lines. Use Dependabot or deliberate maintenance to update pins.

**Rationale**: Release workflows execute with deployment privileges. Immutable pins reduce supply-chain drift while retaining readable version context.

**Alternatives considered**: Floating major tags only; simpler but mutable. Community deployment action; unnecessary because GitHub provides the complete official workflow.

## Decision 5: Make Vite base and Phaser public assets share one boundary

**Decision**: The build receives a normalized base path ending in `/`. Vite uses it for generated entry assets; a typed `runtimeAssetUrl(relativePath)` uses `import.meta.env.BASE_URL` for every Phaser-loaded public asset.

**Rationale**: Vite rewrites its generated module references, but string literals such as `/assets/title-race.svg` bypass that mechanism. One helper eliminates inconsistent root/subpath behavior and remains correct for local `/` and Pages `/auto-racer/`.

**Alternatives considered**: Hardcode `/auto-racer/`; rejected because local preview and repository rename/custom-domain evolution would be brittle. Keep `base: "./"`; insufficient for root-absolute Phaser strings and harder to smoke-test canonically.

## Decision 6: Revision-stamp stable public asset URLs

**Decision**: Production runtime asset URLs append the encoded short revision as a query parameter. Local development omits the stamp.

**Rationale**: Vite hashes bundled scripts, but files copied from `public/assets` keep stable names. A revision stamp prevents a newly deployed entry bundle from mixing with cached images from an older demo.

**Alternatives considered**: Rename all source assets with content hashes; high-churn and hostile to authored catalogs. Rely solely on Pages cache expiration; permits transient mixed-version visuals.

## Decision 7: Inject public build identity at compile time

**Decision**: Provide validated demo tag, full revision, short revision, and UTC build time as public build variables. A pure module validates/falls back for local builds. TitleScene renders `TAG · SHORT_SHA`; full metadata remains programmatically inspectable.

**Rationale**: Static hosting has no server endpoint from which to recover release identity. Compile-time public metadata is simple, contains no secret, and travels with the exact artifact.

**Alternatives considered**: Fetch a mutable metadata file at runtime; could disagree with cached scripts. Display workflow run number only; does not identify source sufficiently.

## Decision 8: Audit the artifact before granting deploy authority

**Decision**: A local Node audit owns a complete, version-controlled rule set covering allowed production roots/file classes, forbidden environment/repository/test/source paths, source-map policy, and explicitly enumerated high-confidence credential patterns. It also verifies the expected build identity appears in output. Release claims are bounded to this inspectable rule set rather than asserting detection of every theoretically possible secret representation.

**Rationale**: Uploading only `dist/` is necessary but not sufficient evidence that the build did not accidentally copy sensitive or source-only material.

**Alternatives considered**: Manual inspection; inconsistent and not release-gating. An absolute “detect every secret” claim; unverifiable. Broad entropy scanning; likely to flag image/bundle data and create noisy false positives.

## Decision 9: Smoke-check the returned deployment URL with bounded retries

**Decision**: After `deploy-pages` returns `page_url`, retry the entry document for up to two minutes, then verify its referenced script plus a small representative set of known assets under the base path. Failures name the exact URL and mark the workflow unhealthy.

**Rationale**: Deployment completion and CDN availability can be briefly separated. Bounded retries avoid false negatives while still producing timely, actionable failure.

**Alternatives considered**: Check once; vulnerable to propagation delay. Browser-driven full playthrough in the privileged release workflow; slower and more brittle than HTTP smoke checks, and gameplay already has automated/browser acceptance elsewhere.

## Decision 10: Manual rollback is the same release operation

**Decision**: To restore, manually dispatch the workflow with a previous valid demo tag. It rebuilds, verifies, deploys, and smoke-checks that source exactly. No “current release” state file or automatic rollback controller is added.

**Rationale**: This matches clarification and keeps recovery understandable. Rebuild time may differ, but tag and source revision remain identical and visible.

**Alternatives considered**: Automatically deploy a previous artifact after smoke failure; requires trusted prior-state discovery, artifact retention coupling, and failure recursion that are disproportionate for the first demo.
